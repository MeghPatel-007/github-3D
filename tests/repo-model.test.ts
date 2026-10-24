import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeDependencies, buildRepoModel, tinyTsFixture } from '../src/repo-model.ts';

test('buildRepoModel keeps stable paths and parent-child relationships', () => {
  const model = buildRepoModel(tinyTsFixture);
  assert.equal(model.commitSha, tinyTsFixture.commitSha);
  assert.deepEqual(model.childrenOf.get('src'), [
    'src/derive.ts',
    'src/guess.ts',
    'src/index.ts',
    'src/math.ts',
  ]);
  assert.equal(model.pathToEntry.get('tests/math.test.ts')?.type, 'blob');
  assert.deepEqual(buildRepoModel(tinyTsFixture).entries.map(({ path }) => path), model.entries.map(({ path }) => path));
});

test('analyzeDependencies resolves local imports and marks missing imports explicitly', () => {
  const edges = analyzeDependencies(tinyTsFixture);
  assert.ok(edges.some((edge) => edge.fromPath === 'src/index.ts' && edge.toPath === 'src/math.ts' && edge.resolution === 'resolved'));
  assert.ok(edges.some((edge) => edge.fromPath === 'src/index.ts' && edge.toPath === null && edge.specifier === './missing' && edge.resolution === 'unresolved'));
  assert.ok(edges.some((edge) => edge.fromPath === 'tests/math.test.ts' && edge.toPath === 'src/math.ts'));
});
