/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createComponent, defineComponents, Types } from '@iwsdk/core';

export const RepoKind = { Directory: 'Directory', File: 'File' } as const;

/** Metadata for one repository tree node (docs FR-MODEL-03/04/07). */
export const RepoNode = createComponent('RepoNode', {
  path: { type: Types.String, default: '' },
  kind: { type: Types.Enum, default: RepoKind.File, enum: RepoKind },
  size: { type: Types.Float64, default: 0 },
});

export default defineComponents([RepoNode]);
