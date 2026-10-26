/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { World } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';
import { RepoExplorerSystem } from './repo-explorer.js';
import { mountRepositoryUi } from './repository-ui.js';

mountRepositoryUi();

World.create(
  document.getElementById('scene-container') as HTMLDivElement,
  projectOptions,
).then((world) => {
  world.registerSystem(RepoExplorerSystem);
  window.dispatchEvent(new Event('repo:system-ready'));
}).catch(() => {
  window.dispatchEvent(new Event('repo:system-failed'));
});
