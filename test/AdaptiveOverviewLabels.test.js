import AdaptiveLabelLayout from '../src/labels/AdaptiveLabelLayout';
import {measureOvalPressure} from '../src/labels/LabelCapacity';
import {packAdaptivePressureSteps, adaptiveTargetSteps} from '../src/labels/AdaptiveLabelPacking';
import {segmentsIntersect} from '../src/labels/LabelGeometry';

const options = {gap: 3, viewportPadding: 3, obstacles: []};
const candidates = (height = 12, count = 500, width) => Array.from({length: count}, (_, i) => {
  const preferred = i / count * Math.PI * 2;
  return {id: {feature: {i}}, height, width: width ?? height * (4 + i % 4), favorite: i % 23 === 0,
    preferred, ranges: [[preferred, preferred]]};
});
const mapFor = radius => ({circular: true, x: 360, y: 325, radius, width: 720, height: 650});
const overlap = (a, b, gap) => a.x < b.x + b.width + gap - 1e-7 && a.x + a.width + gap > b.x + 1e-7 &&
  a.y < b.y + b.height + gap - 1e-7 && a.y + a.height + gap > b.y + 1e-7;
const drain = steps => { let next; do { next = steps.next(); } while (!next.done); return next.value; };
const extent = layout => {
  const ends = layout.placed.map(n => n.placement.points[1]);
  return {x: Math.max(...ends.map(p => p.x)) - Math.min(...ends.map(p => p.x)),
    y: Math.max(...ends.map(p => p.y)) - Math.min(...ends.map(p => p.y))};
};

// Check observable placement constraints, including the outward direction at the poles.
function expectSafe(placed, map, settings = options) {
  expect(placed.length).toBeGreaterThan(0);
  for (const [i, node] of placed.entries()) {
    const {rect, points: [a, b]} = node.placement;
    const cosine = ((a.x - map.x) * (b.x - a.x) + (a.y - map.y) * (b.y - a.y)) /
      (map.radius * Math.hypot(b.x - a.x, b.y - a.y));
    expect(cosine).toBeGreaterThanOrEqual(0.5 - 1e-7);
    if (settings.constrainToViewport !== false) {
      expect(rect.x).toBeGreaterThanOrEqual(settings.viewportPadding - 1e-7);
      expect(rect.y).toBeGreaterThanOrEqual(settings.viewportPadding - 1e-7);
      expect(rect.x + rect.width).toBeLessThanOrEqual(map.width - settings.viewportPadding + 1e-7);
      expect(rect.y + rect.height).toBeLessThanOrEqual(map.height - settings.viewportPadding + 1e-7);
    }
    for (const obstacle of settings.obstacles) { expect(overlap(rect, obstacle, settings.gap)).toBe(false); }
    for (const other of placed.slice(i + 1)) {
      expect(overlap(rect, other.placement.rect, settings.gap)).toBe(false);
      expect(segmentsIntersect(a, b, ...other.placement.points)).toBe(false);
    }
  }
}

test.each([240, 270, 290, 310])('a full circle of radius %i keeps useful outward pole fans', radius => {
  const map = mapFor(radius), layout = new AdaptiveLabelLayout(candidates(), map, options);
  expect(layout.mode).toBe('contour');
  expect(layout.placed.length).toBeGreaterThan(35);
  expectSafe(layout.placed, map);
});

test('the overview outline widens with horizontal space, stops at a circle, and restores after resize', () => {
  const nodes = candidates(12, 180, 60);
  const view = width => ({circular: true, x: width / 2, y: 300, radius: 140, width, height: 600});
  const layouts = [462, 480, 520, 600, 700, 1000].map(width => new AdaptiveLabelLayout(nodes, view(width), options));
  const bounds = layouts.map(extent);
  expect(bounds[1].x / bounds[1].y).toBeLessThan(0.7);
  for (let i = 1; i < bounds.length; i++) { expect(bounds[i].x).toBeGreaterThanOrEqual(bounds[i - 1].x); }
  expect(bounds.at(-1).x / bounds.at(-1).y).toBeGreaterThan(0.95);
  expect(bounds.at(-1).x / bounds.at(-1).y).toBeLessThan(1.05);
  expect(bounds.at(-1).x).toBeCloseTo(bounds.at(-2).x, 6);
  for (const layout of layouts) { expectSafe(layout.placed, layout.map); }
  const first = new AdaptiveLabelLayout(nodes, view(600), options);
  const resized = new AdaptiveLabelLayout(nodes, view(1000), options, first);
  const restored = new AdaptiveLabelLayout(nodes, view(600), options, resized);
  expect(extent(restored)).toEqual(extent(first));
});

test.each(['long labels', 'off-center map', 'side overlay'])('%s constrains the rounded outline safely', kind => {
  const map = {circular: true, x: 500, y: 300, radius: 140, width: 1000, height: 600};
  const nodes = candidates(12, 180, kind === 'long labels' ? 260 : 60), settings = {...options};
  if (kind === 'off-center map') { map.x = 260; }
  if (kind === 'side overlay') { settings.obstacles = [{x: 780, y: 240, width: 120, height: 120}]; }
  const layout = new AdaptiveLabelLayout(nodes, map, settings), bounds = extent(layout);
  expect(bounds.x / bounds.y).toBeLessThan(0.95);
  expectSafe(layout.placed, map, settings);
});

test.each([[80, 0], [80, 500], [140, 0], [140, 500]])(
  'a complete circle of radius %i avoids a legend at x=%i and a footer caption', (radius, x) => {
    const map = {circular: true, x: 400, y: 300, radius, width: 800, height: 600};
    const settings = {...options, obstacles: [
      {x, y: 0, width: 300, height: 230}, {x: 100, y: 530, width: 600, height: 70}
    ]};
    const layout = new AdaptiveLabelLayout(candidates(12, 180, 60), map, settings);
    expect(layout.placed.length).toBeGreaterThan(10);
    expectSafe(layout.placed, map, settings);
  }
);

test.each([6, 12, 24])('%ipx labels retain safe outward placements across density with overlays', height => {
  const map = {...mapFor(275), x: 420, width: 840};
  const settings = {...options, obstacles: [
    {x: 640, y: 0, width: 200, height: 180}, {x: 100, y: 615, width: 600, height: 35}
  ]};
  const clean = new AdaptiveLabelLayout(candidates(height), map, settings);
  const pressure = measureOvalPressure(clean), dense = drain(packAdaptivePressureSteps(clean, pressure));
  let previous = 0;
  for (const amount of [0, 0.5, 1]) {
    const placed = drain(adaptiveTargetSteps(clean, dense, pressure, amount));
    expect(placed.length).toBeGreaterThanOrEqual(previous);
    expectSafe(placed, map, settings);
    previous = placed.length;
  }
});

test('overlays remain protected at every density with viewport containment off', () => {
  const map = {circular: true, x: 400, y: 300, radius: 140, width: 800, height: 600};
  const settings = {...options, constrainToViewport: false, obstacles: [
    {x: 500, y: 0, width: 300, height: 230}, {x: 100, y: 530, width: 600, height: 70}
  ]};
  const clean = new AdaptiveLabelLayout(candidates(12, 180, 60), map, settings), pressure = measureOvalPressure(clean);
  const dense = drain(packAdaptivePressureSteps(clean, pressure));
  for (const amount of [0, 0.5, 1]) { expectSafe(drain(adaptiveTargetSteps(clean, dense, pressure, amount)), map, settings); }
});
