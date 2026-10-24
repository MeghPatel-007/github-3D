// Pure repository model: deterministic fixture + tree normalization.
// No THREE/ECS/DOM imports — this module is unit-testable and realm-safe.

export type RepoEntryType = 'blob' | 'tree';

export interface RepoEntry {
  path: string;
  type: RepoEntryType;
  /** bytes, undefined for directories */
  size?: number;
}

export interface RepoFixture {
  id: string;
  name: string;
  defaultBranch: string;
  commitSha: string;
  entries: RepoEntry[];
  contents: Record<string, string>;
}

export interface DependencyEdge {
  fromPath: string;
  toPath: string | null;
  specifier: string;
  resolution: 'resolved' | 'unresolved' | 'external';
}

export interface RepoModel {
  id: string;
  name: string;
  defaultBranch: string;
  /** The revision identity: every view of this model is scoped to it. */
  commitSha: string;
  /** Entries normalized: directories first, then files, each sorted by path. */
  entries: RepoEntry[];
  pathToEntry: Map<string, RepoEntry>;
  /** Parent path ('' for root) -> child paths, in entries order. */
  childrenOf: Map<string, string[]>;
  dependencies: DependencyEdge[];
  contents: Record<string, string>;
}

/** Synthetic repo per docs/23: entry file, imported module, no-import file,
 * unresolved-import file, README, tests. No live GitHub needed. */
export const tinyTsFixture: RepoFixture = {
  id: 'tiny-ts',
  name: 'tiny-ts',
  defaultBranch: 'main',
  commitSha: 'cafef00d13f4c1e5a9b2d3000000000000000000',
  entries: [
    { path: 'README.md', type: 'blob', size: 78 },
    { path: 'src', type: 'tree' },
    { path: 'src/index.ts', type: 'blob', size: 175 },
    { path: 'src/math.ts', type: 'blob', size: 70 },
    { path: 'src/derive.ts', type: 'blob', size: 87 },
    { path: 'src/guess.ts', type: 'blob', size: 80 },
    { path: 'tests', type: 'tree' },
    { path: 'tests/math.test.ts', type: 'blob', size: 69 },
  ],
  contents: {
    'README.md': '# tiny-ts\n\nSynthetic TypeScript repository used to explore files and imports.\n',
    'src/index.ts': "import { add } from './math';\nimport { estimate } from './guess';\nimport { missing } from './missing';\n\nexport const total = add(2, 3);\nconsole.log(estimate(total), missing);\n",
    'src/math.ts': 'export function add(a: number, b: number): number {\n  return a + b;\n}\n',
    'src/derive.ts': "import { add } from './math';\n\nexport const derive = (value: number) => add(value, 1);\n",
    'src/guess.ts': 'export function estimate(value: number): number {\n  return Math.round(value);\n}\n',
    'tests/math.test.ts': "import { add } from '../src/math';\n\nconsole.assert(add(2, 3) === 5);\n",
  },
};

/** Parent dir path ('' for root) of an entry path. */
export function parentPathOf(path: string): string {
  const slash = path.lastIndexOf('/');
  return slash === -1 ? '' : path.slice(0, slash);
}

/** Build the revision-scoped model from GitHub-tree-shaped entries. */
export function buildRepoModel(fixture: RepoFixture): RepoModel {
  const dirs: RepoEntry[] = [];
  const files: RepoEntry[] = [];
  for (const entry of fixture.entries) {
    (entry.type === 'tree' ? dirs : files).push(entry);
  }
  const byPath = (a: RepoEntry, b: RepoEntry) => a.path.localeCompare(b.path);
  const entries = [...dirs.sort(byPath), ...files.sort(byPath)];

  const pathToEntry = new Map(entries.map((entry) => [entry.path, entry]));
  const childrenOf = new Map<string, string[]>();
  for (const entry of entries) {
    const parent = parentPathOf(entry.path);
    const siblings = childrenOf.get(parent);
    if (siblings) siblings.push(entry.path);
    else childrenOf.set(parent, [entry.path]);
  }
  pathToEntry.set('', { path: '', type: 'tree' });
  return { ...fixture, entries, pathToEntry, childrenOf, dependencies: analyzeDependencies(fixture) };
}

export function analyzeDependencies(fixture: RepoFixture): DependencyEdge[] {
  const paths = new Set(fixture.entries.filter((entry) => entry.type === 'blob').map((entry) => entry.path));
  const edges: DependencyEdge[] = [];
  for (const [fromPath, source] of Object.entries(fixture.contents)) {
    if (!/\.[cm]?[jt]sx?$/u.test(fromPath)) continue;
    // shortcut: handles literal import/export specifiers only; use an AST parser for aliases or syntax-aware analysis.
    for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*\()\s*['"]([^'"]+)['"]|\bimport\s*['"]([^'"]+)['"]/gu)) {
      const specifier = match[1] ?? match[2];
      if (!specifier) continue;
      if (!specifier.startsWith('.')) {
        edges.push({ fromPath, toPath: null, specifier, resolution: 'external' });
        continue;
      }
      const parts = fromPath.split('/').slice(0, -1);
      let escapesRoot = false;
      for (const part of specifier.split('/')) {
        if (part === '.' || part === '') continue;
        if (part === '..') {
          if (parts.length === 0) escapesRoot = true;
          else parts.pop();
        } else parts.push(part);
      }
      const target = parts.join('/');
      const candidates = [target, ...['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'].map((suffix) => `${target}${suffix}`)];
      const resolved = escapesRoot ? undefined : candidates.find((candidate) => paths.has(candidate));
      edges.push({ fromPath, toPath: resolved ?? null, specifier, resolution: resolved ? 'resolved' : 'unresolved' });
    }
  }
  return edges;
}
