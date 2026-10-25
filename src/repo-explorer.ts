/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  BoxGeometry,
  CylinderGeometry,
  Entity,
  Mesh,
  MeshStandardMaterial,
  RayInteractable,
  UIKitMLAsset,
  createSystem,
  Hovered,
  Pressed,
} from '@iwsdk/core';
import { RepoKind, RepoNode } from './components.js';
import { buildRepoModel, tinyTsFixture, type RepoFixture, type RepoModel } from './repo-model.js';
import { fetchRepositoryFile, RepositoryApiError } from './repository-api.js';

// Directory groups sit on a ring around the hub; the player origin stays clear.
const CENTER = { x: 0, y: 0, z: -7 };
const RING_RADIUS = 6;
const FILE_COLS = 2;
const FILE_SPACING = 1.1;
const MAX_FILE_BYTES = 3072;
const MAX_SCENE_ENTRIES = 499;

type UIKitElement = NonNullable<ReturnType<UIKitMLAsset['getElementById']>>;

export class RepoExplorerSystem extends createSystem({
  nodes: { required: [RepoNode] },
  pressed: { required: [RepoNode, Pressed] },
}) {
  private model!: RepoModel;
  private entryToEntity = new Map<string, Entity>();
  private sceneEntities: Entity[] = [];
  private selectedPath: string | null = null;
  private lastMaterial = new Map<number, MeshStandardMaterial>();
  private rows: { path: string; element: UIKitElement }[] = [];
  private selectedRow: UIKitElement | null = null;
  private inspectorBody!: UIKitElement;
  private inspectorHeader!: UIKitElement;
  private inspectorKind!: UIKitElement;
  private inspectorSize!: UIKitElement;
  private inspectorHint!: UIKitElement;
  private inspectorSource!: UIKitElement;
  private inspectorDependencies!: UIKitElement;
  private inspectorEmpty!: UIKitElement;
  private geometries: (BoxGeometry | CylinderGeometry)[] = [];
  private materials: MeshStandardMaterial[] = [];
  private contentRequest = 0;
  private contentController: AbortController | null = null;

  private onRepositoryLoad = (event: Event): void => {
    this.replaceRepository((event as CustomEvent<RepoFixture>).detail);
  };

  private onRepositorySelect = (event: Event): void => {
    this.selectPath((event as CustomEvent<string>).detail);
  };

  // [0]=idle file, [1]=hover, [2]=idle dir, [3]=selected
  private materialFor(kind: string, selected: boolean, hovered: boolean): MeshStandardMaterial {
    if (selected) return this.materials[3];
    if (hovered) return this.materials[1];
    return this.materials[kind === RepoKind.Directory ? 2 : 0];
  }

  init(): void {
    this.model = buildRepoModel(tinyTsFixture);
    this.materials = [0x388bfd, 0x9bccff, 0x2ea043, 0xf78166].map(
      (color) => new MeshStandardMaterial({ color }),
    );
    this.buildWorld();
    this.wirePanel();
    window.dispatchEvent(new Event('repo:system-ready'));
    window.addEventListener('repo:load', this.onRepositoryLoad);
    window.addEventListener('repo:select', this.onRepositorySelect);
    this.cleanupFuncs.push(
      () => window.removeEventListener('repo:load', this.onRepositoryLoad),
      () => window.removeEventListener('repo:select', this.onRepositorySelect),
      () => this.disposeSceneEntities(),
      this.queries.pressed.subscribe('qualify', (entity) => {
        this.selectPath(entity.getValue(RepoNode, 'path') ?? '');
      }),
      () => {
        for (const geometry of this.geometries) geometry.dispose();
        for (const material of this.materials) material.dispose();
        this.geometries.length = 0;
        this.materials.length = 0;
      },
    );
  }

  update(): void {
    const selectedEntity = this.selectedPath == null ? undefined : this.entryToEntity.get(this.selectedPath);
    for (const entity of this.queries.nodes.entities) {
      const object = entity.object3D as Mesh | undefined;
      if (!object) continue;
      const target = this.materialFor(
        entity.getValue(RepoNode, 'kind') ?? 'File',
        entity === selectedEntity,
        entity.hasComponent(Hovered),
      );
      if (this.lastMaterial.get(entity.index) !== target) {
        object.material = target;
        this.lastMaterial.set(entity.index, target);
      }
    }
  }

  private addGeometry<T extends BoxGeometry | CylinderGeometry>(geometry: T): T {
    this.geometries.push(geometry);
    return geometry;
  }

  private buildWorld(): void {
    const [idleFile, , idleDir] = this.materials;
    const geometryCube = this.addGeometry(new BoxGeometry(0.55, 0.3, 0.55));
    const geometryHub = this.addGeometry(new CylinderGeometry(1.6, 1.6, 0.12, 32));

    // Hub: central landmark (FR-3D-01).
    const hub = new Mesh(geometryHub, idleDir);
    hub.name = 'repo-hub';
    hub.position.set(CENTER.x, 0.06, CENTER.z);
    const hubEntity = this.world.createTransformEntity(hub);
    this.sceneEntities.push(hubEntity);
    hubEntity.addComponent(RayInteractable);
    hubEntity.addComponent(RepoNode, {
      path: '',
      kind: RepoKind.Directory,
      size: 0,
    });
    this.entryToEntity.set('', hubEntity);

    // Directories as spatial groups on the ring (FR-3D-02).
    const directories = this.model.entries.filter((e) => e.type === 'tree').slice(0, 100);
    const visibleDirectories = new Set(directories.map((entry) => entry.path));
    const visibleFiles = this.model.entries.filter((entry) => entry.type === 'blob' && (() => {
      const parent = entry.path.split('/').slice(0, -1).join('/');
      return parent === '' || visibleDirectories.has(parent);
    })()).slice(0, MAX_SCENE_ENTRIES - directories.length);
    const visiblePaths = new Set([
      ...directories.map((entry) => entry.path),
      ...visibleFiles.map((entry) => entry.path),
    ]);
    const geometryPlate = this.addGeometry(new BoxGeometry(2.4, 0.08, 2.4));
    const dirPos = new Map<string, { x: number; y: number; z: number }>();
    directories.forEach((dir, index) => {
      const angle = (index / directories.length) * Math.PI * 2;
      const pos = {
        x: CENTER.x + Math.sin(angle) * RING_RADIUS,
        y: 0,
        z: CENTER.z + Math.cos(angle) * RING_RADIUS,
      };
      dirPos.set(dir.path, pos);
      const plate = new Mesh(geometryPlate, idleDir);
      plate.name = `dir-${dir.path}`;
      plate.position.set(pos.x, 0.04, pos.z);
      const plateEntity = this.world.createTransformEntity(plate);
      this.sceneEntities.push(plateEntity);
      plateEntity.addComponent(RayInteractable);
      plateEntity.addComponent(RepoNode, {
        path: dir.path,
        kind: RepoKind.Directory,
        size: 0,
      });
      this.entryToEntity.set(dir.path, plateEntity);
    });

    // Files as selectable objects in per-directory grids (FR-3D-03).
    for (const [parent, children] of this.model.childrenOf) {
      const files = children
        .map((child) => this.model.pathToEntry.get(child)!)
        .filter((entry) => entry.type === 'blob' && visiblePaths.has(entry.path));
      const base = parent === '' ? CENTER : dirPos.get(parent)!;
      const baseY = parent === '' ? 0.12 : 0.08;
      files.forEach((file, index) => {
        const col = index % FILE_COLS;
        const row = Math.floor(index / FILE_COLS);
        const size = file.size ?? 0;
        const height = 0.5 + Math.min(1, size / MAX_FILE_BYTES) * 0.6;
        const box = new Mesh(geometryCube, idleFile);
        box.scale.set(1, height / 0.3, 1);
        box.name = `file-${file.path}`;
        box.position.set(
          base.x + (col - (FILE_COLS - 1) / 2) * FILE_SPACING,
          baseY + height / 2,
          base.z + row * FILE_SPACING,
        );
        const entity = this.world.createTransformEntity(box);
        this.sceneEntities.push(entity);
        entity.addComponent(RayInteractable);
        entity.addComponent(RepoNode, {
          path: file.path,
          kind: RepoKind.File,
          size,
        });
        this.entryToEntity.set(file.path, entity);
      });
    }
  }

  private wirePanel(): void {
    const panel = this.world.getSceneObject<UIKitMLAsset>('repo-panel');
    if (!panel) return;
    const title = panel.getElementById('title');
    title?.setProperties({ text: `${this.model.name} @ ${this.model.commitSha.slice(0, 7)}` });
    this.inspectorBody = panel.getElementById('insp-body')!;
    this.inspectorHeader = panel.getElementById('insp-header')!;
    this.inspectorKind = panel.getElementById('insp-kind')!;
    this.inspectorSize = panel.getElementById('insp-size')!;
    this.inspectorHint = panel.getElementById('insp-hint')!;
    this.inspectorSource = panel.getElementById('insp-source')!;
    this.inspectorDependencies = panel.getElementById('insp-deps')!;
    this.inspectorEmpty = panel.getElementById('insp-empty')!;

    for (let index = 0; ; index += 1) {
      const element = panel.getElementById(`item-${index}`);
      if (!element) break;
      element.name = `tree-row-${index}`;
      const select = () => this.selectPath(this.rows[index]?.path ?? '');
      element.addEventListener('click', select);
      this.cleanupFuncs.push(() => element.removeEventListener('click', select));
      this.rows.push({ path: '', element });
    }
    this.refreshPanelRows();
    this.inspectorEmpty.setProperties({ display: 'flex' });
    this.inspectorBody.setProperties({ display: 'none' });
  }

  private selectPath(path: string): void {
    this.selectedPath = path;
    const entry = this.model.pathToEntry.get(path);
    if (!entry || !this.inspectorBody) return;
    if (this.selectedRow) {
      this.selectedRow.setProperties({ backgroundColor: 'transparent', color: '' });
      this.selectedRow = null;
    }
    const row = this.rows.find((r) => r.path === path);
    if (row) {
      row.element.setProperties({ backgroundColor: '#1f6feb', color: '#ffffff' });
      this.selectedRow = row.element;
    }
    this.inspectorBody.setProperties({ display: 'flex' });
    this.inspectorEmpty.setProperties({ display: 'none' });
    this.inspectorHeader.setProperties({ text: entry.path });
    this.inspectorKind.setProperties({ text: entry.type === 'tree' ? 'directory' : 'file' });
    this.inspectorSize.setProperties({
      text: entry.type === 'tree' ? `${this.model.childrenOf.get(path)?.length ?? 0} children` : `${entry.size ?? 0} bytes`,
    });
    this.inspectorHint.setProperties({ text: `revision ${this.model.commitSha.slice(0, 7)}` });
    const source = this.model.contents[path];
    this.inspectorSource.setProperties({
      text: entry.type === 'tree'
        ? 'Select a file to inspect its source.'
        : source == null
          ? 'Loading source…'
          : `${source.slice(0, 1200)}${source.length > 1200 ? '\n[Source preview truncated]' : ''}`,
    });
    this.contentController?.abort();
    this.contentController = null;
    if (entry.type === 'blob' && source == null) this.loadSource(path, this.model.commitSha);
    const related = this.model.dependencies.filter((edge) => edge.fromPath === path || edge.toPath === path);
    this.inspectorDependencies.setProperties({
      text: related.length
        ? related.map((edge) => `${edge.fromPath} -> ${edge.toPath ?? edge.specifier} [${edge.resolution}]`).join('\n')
        : this.model.id === tinyTsFixture.id
          ? 'No detected imports for this selection.'
          : 'Import analysis is not available for live repositories yet.',
    });
    window.dispatchEvent(new CustomEvent('repo:selected', { detail: path }));
  }

  private replaceRepository(fixture: RepoFixture): void {
    this.contentController?.abort();
    this.contentRequest += 1;
    this.disposeSceneEntities();
    this.selectedPath = null;
    this.model = buildRepoModel(fixture);
    this.buildWorld();
    this.refreshPanelRows();
    this.selectPath('');
  }

  private refreshPanelRows(): void {
    this.rows.forEach((row, index) => {
      const entry = this.model.entries[index];
      row.path = entry?.path ?? '';
      row.element.setProperties({
        display: entry ? 'flex' : 'none',
        text: entry
          ? `${'\u00a0\u00a0'.repeat(Math.max(0, entry.path.split('/').length - 1))}${entry.type === 'tree' ? '[dir] ' : ''}${entry.path}`
          : '',
      });
    });
    const panel = this.world.getSceneObject<UIKitMLAsset>('repo-panel');
    panel?.getElementById('title')?.setProperties({ text: `${this.model.owner}/${this.model.name} @ ${this.model.commitSha.slice(0, 7)}` });
  }

  private loadSource(path: string, commitSha: string): void {
    const owner = this.model.owner;
    const repo = this.model.name;
    if (!owner) return;
    const request = ++this.contentRequest;
    const controller = new AbortController();
    this.contentController = controller;
    fetchRepositoryFile(owner, repo, path, commitSha, controller.signal).then((file) => {
      if (request !== this.contentRequest || path !== this.selectedPath || commitSha !== this.model.commitSha) return;
      this.model.contents[path] = file.content;
      this.inspectorSource.setProperties({ text: `${file.content.slice(0, 1200)}${file.content.length > 1200 || file.truncated ? '\n[Source preview truncated]' : ''}` });
    }).catch((error: unknown) => {
      if (controller.signal.aborted || request !== this.contentRequest) return;
      if (error instanceof RepositoryApiError && error.status === 401) window.dispatchEvent(new Event('repo:auth-expired'));
      this.inspectorSource.setProperties({ text: 'Source could not be loaded. Retry by selecting this file again.' });
    });
  }

  private disposeSceneEntities(): void {
    for (const entity of this.sceneEntities) entity.dispose();
    this.sceneEntities.length = 0;
    this.entryToEntity.clear();
    this.lastMaterial.clear();
  }
}
