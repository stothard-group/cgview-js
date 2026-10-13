# Label comparison page

Open **Test Page > Labels Testing > Compare label methods**, or
[open the comparison page directly](external-labels.html).

This comparison page is part of `v1.9`. It was developed on `v1.9-adaptive` from
`v1.9` commit `789cdc9` and adapted from `v1.9-labels` commit `bafbee4`.
Both panels use the same
production CGView bundle with independent Viewer instances. No earlier trial
renderers are included, and setting up this page does not change label placement
or drawing.

## Adaptive

The current production `adaptive` method is the starting reference for new work.
Clean follows an oval around a complete circular map, or uses compact local
placement for a clipped circle or a linear map. Density adds labels and releases
the oval arrangement in crowded regions. Adaptive animates label positions and
visibility, with placement work spread across frames.

## Classic

The current production `classic` method uses straight leaders and outward label
levels. At zero density, only the first level is available. Higher density opens
additional levels. Classic places labels synchronously without animation.

## Controls and measurements

- Adaptive starts on the left and Classic on the right. Either panel can select
  either method, including Adaptive on both sides for a baseline check.
- Font size, line thickness, label position, map, and format apply to both panels.
- Each panel has independent `labelDensity` (0..1), `keepLabelsInView`, and
  `labelSpacing` controls. These flat annotation settings persist across method,
  map, and format changes. Spacing also sets the viewport inset.
- Map JSON is migrated by CGView's normal importer, then the comparison controls
  override its annotation method, density, spacing, viewport setting, font size,
  line thickness, visibility, and label position. Captions are hidden as on the
  original comparison page. The imported source is not mutated.
- Pan and zoom are synchronized by default. View presets, JSON import, and
  SVG/PNG export work for either panel.
- Outside-in-frame counts include boxes that intersect the viewport. Labels
  drawn and labels total use `annotation.labelStats`, including inline labels.
  Candidates count eligible outside labels in the current view.
- Label draw time is the synchronous outside-label call, not total frame time.
  Adaptive's diagnostics also report cumulative planning CPU time, frame slices,
  pending work, and motion. Performance comparisons should account for both.
- Text overlaps, leader crossings, and leaders through text are audited only
  after navigation, animation, and planning settle, keeping the quadratic audit
  out of the interaction path.

URL parameters support reproducible views, for example:

```text
external-labels.html?map=large&format=circular&left=adaptive&right=classic&view=bottom&zoom=1.75
```

`window.labelTesting` exposes the viewers, synthetic fixtures, method selection,
reload, and view presets for browser checks.

## Adding experiments later

Keep the production Adaptive renderer and its helpers unchanged as the baseline
while evaluating new methods. Register experimental renderers from test-only
code using `CGView.registerExternalLabelRenderer()`, then call
`labelTesting.refreshRenderers()` to update the choices. An experiment that
changes a shared layout helper needs its own copy so both panels do not change
together. Do not add experimental imports to the production renderer registry.

Use a separate renderer file, or a directory when supporting helpers are needed.
Add a numbered summary and detail link below the maps for each new experiment;
record its baseline commit and any source experiment. The old `v1.9-labels`
branch remains the archive for earlier trials. No new experiment number is
assigned to this testing-page port.

## Verification

```sh
cgview-run yarn gh-pages
cgview-run node scripts/test-label-comparison.mjs
```

The browser check covers the normal-page entry link, production method choices,
flat settings, matching Adaptive panels, camera synchronization, map import,
exports, fixtures, metrics, and resize behavior. Screenshots and results are
written to the ignored `.agents/artifacts/adaptive-labels/` directory.
