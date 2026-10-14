# 16 — Performance Budget and Optimization

## Goals

The 3D scene should remain responsive for a useful repository size while avoiding unbounded rendering work. All targets below are provisional engineering targets and must be benchmarked on named hardware/browser configurations.

## Initial target

- Approximately 500 visible file/directory objects on a representative laptop.
- Target 30+ FPS in the normal exploration view.
- Responsive selection and camera movement.
- File content fetched on demand.
- No unbounded creation of labels or dependency edges.

Do not advertise this as a guaranteed capacity until measured.

## Main cost centers

- Draw calls and unique materials.
- Geometry and texture memory.
- 3D text labels.
- Raycasting over many objects.
- Dependency edge count.
- Post-processing and bloom.
- Layout recomputation.
- Large source text and syntax highlighting.
- Concurrent GitHub requests and parsing work.

## Optimization strategy

1. Start with primitive geometry and shared materials.
2. Use instancing/batching only where profiling identifies benefit.
3. Use level of detail for labels and distant objects.
4. Collapse directory groups beyond a configurable threshold.
5. Render dependency edges only when enabled and within a useful view/filter.
6. Avoid per-frame React state updates for camera motion.
7. Memoize layout results by revision and layout settings.
8. Cancel stale analysis and repository requests.
9. Fetch source only when a file is selected.
10. Dispose old geometries, materials, render targets, and textures.
11. Disable post-processing in low-effects mode.
12. Use bounded concurrency for analysis and API requests.

## Suggested budget configuration

```ts
export interface PerformanceSettings {
  maxVisibleNodes: number;
  maxVisibleEdges: number;
  maxAnalyzedFiles: number;
  maxAnalyzedFileBytes: number;
  maxInlineSourceBytes: number;
  maxConcurrentRequests: number;
}

export const initialPerformanceSettings: PerformanceSettings = {
  maxVisibleNodes: 500,
  maxVisibleEdges: 1200,
  maxAnalyzedFiles: 1500,
  maxAnalyzedFileBytes: 256_000,
  maxInlineSourceBytes: 200_000,
  maxConcurrentRequests: 6,
};
```

These numbers are initial guardrails, not universal technical limits. Tune them using representative repositories, actual browser memory, and the chosen parser/rendering libraries. Make internal limits configurable and provide clear UI behavior when limits are reached.

## Benchmark protocol

Record:
- Device and GPU where available.
- Browser and version.
- Repository fixture and revision.
- Visible node and edge counts.
- Label mode and post-processing settings.
- Scene load time.
- Frame rate during orbit, zoom, selection, and focus.
- Memory/resource behavior after repeated repository switches.

Test low-end integrated graphics, not only the developer's machine.

## Graceful degradation

When the budget is exceeded:
- Collapse deeper or larger directory groups.
- Reduce label density.
- Hide or filter dependency edges.
- Turn off post-processing.
- Display a message that the scene is simplified.
- Preserve full tree/search/inspector functionality in 2D.

## Acceptance criteria

- Performance tests have reproducible conditions.
- Repeated repository switching does not cause unbounded resource growth.
- The scene remains navigable under the configured budget.
- Exceeding a budget degrades gracefully instead of crashing.
