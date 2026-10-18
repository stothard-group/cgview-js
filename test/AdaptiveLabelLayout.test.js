import AdaptiveLabelLayout from '../src/labels/AdaptiveLabelLayout';
import {measureOvalPressure} from '../src/labels/LabelCapacity';
import {packAdaptivePressureSteps, adaptiveTargetSteps} from '../src/labels/AdaptiveLabelPacking';
import {segmentsIntersect} from '../src/labels/LabelGeometry';

const drain = steps => { let next; do { next = steps.next(); } while (!next.done); return next.value; };
const maps = [
  {circular: true, x: 409, y: 325, radius: 202.5, width: 818, height: 650},
  {circular: true, x: 409, y: -40, radius: 440, width: 818, height: 650},
  {circular: false, x: 0, y: 325, radius: 1, width: 818, height: 650}
];
const candidates = (map, height, count = 300) => Array.from({length: count}, (_, i) => {
  const preferred = map.circular ? i / count * Math.PI * 2 : 10 + i / count * 798;
  const x = map.circular ? map.x + map.radius * Math.cos(preferred) : preferred;
  const y = map.circular ? map.y + map.radius * Math.sin(preferred) : map.y;
  return {id: {feature: {index: i}}, width: (4 + i % 12) * height, height, favorite: i % 23 === 0,
    preferred, ranges: [[preferred, preferred]], inFrame: x >= 0 && x <= 818 && y >= 0 && y <= 650};
}).filter(n => n.inFrame);

test('zoomed arc uses available budget on both sides of the former shortlist cliff', () => {
  const map = maps[0];
  const all = candidates(map, 3, 1000).map((n, i) => ({...n, preferred: 3 + i / 10000, ranges: [[3 + i / 10000, 3 + i / 10000]]}));
  const shortlist = n => new AdaptiveLabelLayout(all.slice(0, n), map, {}, undefined, {deferred: true}).nodes;
  expect([1000, 905, 896, 886, 850].map(n => shortlist(n).length)).toEqual([896, 896, 896, 886, 850]);
  const large = new Set(shortlist(905).map(n => n.id));
  expect(shortlist(896).filter(n => large.has(n.id)).length).toBeGreaterThan(875);
  expect(shortlist(905).map(n => n.rank)).toEqual(shortlist(905).map(n => n.rank).sort((a, b) => a - b));
});

test('sparse sectors donate slots and previous displayed identities have a deterministic preference', () => {
  const map = maps[0], all = candidates(map, 12, 1500);
  const prior = new AdaptiveLabelLayout(all, map, {}, undefined, {deferred: true});
  const ids = new Set(prior.nodes.map(n => n.id));
  const omitted = all.find(n => !ids.has(n.id));
  const work = {deferred: true, displayedFeatures: new Set([omitted.id.feature])};
  const first = new AdaptiveLabelLayout(all, map, {}, undefined, work);
  expect(first.nodes.some(n => n.id === omitted.id)).toBe(true);
  expect(first.nodes).toEqual(new AdaptiveLabelLayout(all, map, {}, undefined, work).nodes);
  expect(first.nodes.length).toBe(512);
});

test('generator work can be abandoned without changing an existing endpoint', () => {
  const clean = new AdaptiveLabelLayout(candidates(maps[2], 3, 700), maps[2], {obstacles: []});
  const before = JSON.stringify(clean), pressure = measureOvalPressure(clean);
  const work = packAdaptivePressureSteps(clean, pressure);
  for (let i = 0; i < 40; i++) { expect(work.next().done).toBe(false); }
  work.return();
  expect(JSON.stringify(clean)).toBe(before);
});

const overviewCandidates = (count, height = 12) => Array.from({length: count}, (_, i) => {
  const preferred = i / count * Math.PI * 2;
  return {id: {feature: {index: i}}, width: (4 + i % 8) * height, height,
    favorite: i % 23 === 0, preferred, ranges: [[preferred, preferred]]};
});

const relativePlacements = layout => layout.placed.map(({id, placement: {rect, points}}) => ({
  id, x: rect.x - layout.map.x, y: rect.y - layout.map.y,
  points: points.map(p => ({x: p.x - layout.map.x, y: p.y - layout.map.y}))
}));

test.each([3, 12, 24])('empty vertical space does not stretch a crowded %ipx overview', height => {
  const nodes = overviewCandidates(300, height);
  const map = {circular: true, x: 600, y: 500, radius: 150, width: 1200, height: 1000};
  const compact = new AdaptiveLabelLayout(nodes, map);
  const tall = new AdaptiveLabelLayout(nodes, {...map, y: 1000, height: 2000});
  expect(tall.placed.length).toBeGreaterThan(10);
  const expected = relativePlacements(compact), actual = relativePlacements(tall);
  expect(actual.map(p => p.id)).toEqual(expected.map(p => p.id));
  actual.forEach((p, i) => {
    expect(p.x).toBeCloseTo(expected[i].x, 8);
    expect(p.y).toBeCloseTo(expected[i].y, 8);
    p.points.forEach((point, j) => {
      expect(point.x).toBeCloseTo(expected[i].points[j].x, 8);
      expect(point.y).toBeCloseTo(expected[i].points[j].y, 8);
    });
  });
});

test.each([60, 130, 260])('overview leaders follow a circle of radius %i when zooming out', radius => {
  const map = {circular: true, x: 600, y: 700, radius, width: 1200, height: 1400};
  const layout = new AdaptiveLabelLayout(overviewCandidates(300), map);
  expect(layout.placed.length).toBeGreaterThan(10);
  for (const {placement: {points: [, end]}} of layout.placed) {
    // Permit local fans and multiple rows, but not viewport-sized pole leaders.
    expect(Math.hypot(end.x - map.x, end.y - map.y)).toBeLessThan(radius + 150);
  }
});

test('dense overview labels do not get flattened along the top and bottom arcs', () => {
  const map = {circular: true, x: 500, y: 600, radius: 260, width: 1000, height: 1200};
  const layout = new AdaptiveLabelLayout(overviewCandidates(500), map);
  const tangent = layout.placed.filter(({placement: {points: [a, b]}}) => {
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    return ((a.x - map.x) * (b.x - a.x) + (a.y - map.y) * (b.y - a.y)) / (map.radius * length) < 0.35;
  });
  expect(layout.placed.length).toBeGreaterThan(50);
  expect(tangent.length).toBeLessThan(layout.placed.length * 0.1);
});

test.each([-Math.PI / 4, -0.03])('nearby cloning-site labels at %f still fan out without overlapping', angle => {
  const map = {circular: true, x: 400, y: 400, radius: 220, width: 800, height: 800};
  const nodes = overviewCandidates(6).map((n, i) => {
    const preferred = angle + i * 0.012;
    return {...n, width: 48, preferred, ranges: [[preferred, preferred]]};
  });
  const layout = new AdaptiveLabelLayout(nodes, map);
  // Leader clearance can omit a site with an almost coincident anchor; the
  // remaining group must still fan out, rather than collapsing to one label.
  expect(layout.placed.length).toBeGreaterThanOrEqual(5);
  const ordered = layout.placed.slice().sort((a, b) => a.preferred - b.preferred);
  const spread = point => Math.hypot(ordered.at(-1).placement.points[point].x - ordered[0].placement.points[point].x,
    ordered.at(-1).placement.points[point].y - ordered[0].placement.points[point].y);
  expect(spread(1)).toBeGreaterThan(spread(0) * 3);
  for (let i = 0; i < ordered.length; i++) {
    for (let j = i + 1; j < ordered.length; j++) {
      const a = ordered[i].placement, b = ordered[j].placement;
      // Fans can use horizontal as well as vertical space.
      expect(a.rect.x + a.rect.width + layout.gap <= b.rect.x + 1e-7 ||
        b.rect.x + b.rect.width + layout.gap <= a.rect.x + 1e-7 ||
        a.rect.y + a.rect.height + layout.gap <= b.rect.y + 1e-7 ||
        b.rect.y + b.rect.height + layout.gap <= a.rect.y + 1e-7).toBe(true);
      expect(segmentsIntersect(...a.points, ...b.points)).toBe(false);
    }
  }
});

test('overview contour and local fans leave room for legends and captions', () => {
  const map = {circular: true, x: 400, y: 400, radius: 220, width: 800, height: 800};
  const obstacles = [{x: 580, y: 60, width: 200, height: 180}, {x: 130, y: 690, width: 540, height: 60}];
  const layout = new AdaptiveLabelLayout(overviewCandidates(300), map, {obstacles});
  expect(layout.placed.length).toBeGreaterThan(40);
  for (const {placement: {rect: a}} of layout.placed) {
    for (const b of obstacles) {
      expect(a.x + a.width + layout.gap <= b.x || b.x + b.width + layout.gap <= a.x ||
        a.y + a.height + layout.gap <= b.y || b.y + b.height + layout.gap <= a.y).toBe(true);
    }
  }
});

test('higher density still uses surrounding space and retains valid placements', () => {
  const map = {circular: true, x: 400, y: 400, radius: 130, width: 800, height: 800};
  const clean = new AdaptiveLabelLayout(overviewCandidates(300), map, {obstacles: []});
  const pressure = measureOvalPressure(clean), dense = drain(packAdaptivePressureSteps(clean, pressure));
  const layouts = [0, 0.5, 1].map(amount => drain(adaptiveTargetSteps(clean, dense, pressure, amount)));
  expect(layouts[1].length).toBeGreaterThan(layouts[0].length);
  expect(layouts[2].length).toBeGreaterThan(layouts[1].length);
  for (const placed of layouts) {
    for (let i = 0; i < placed.length; i++) {
      const {rect, points} = placed[i].placement;
      expect(rect.x).toBeGreaterThanOrEqual(clean.padding - 1e-7);
      expect(rect.y).toBeGreaterThanOrEqual(clean.padding - 1e-7);
      expect(rect.x + rect.width).toBeLessThanOrEqual(map.width - clean.padding + 1e-7);
      expect(rect.y + rect.height).toBeLessThanOrEqual(map.height - clean.padding + 1e-7);
      for (let j = i + 1; j < placed.length; j++) {
        const other = placed[j].placement;
        expect(rect.x + rect.width + clean.gap <= other.rect.x + 1e-7 ||
          other.rect.x + other.rect.width + clean.gap <= rect.x + 1e-7 ||
          rect.y + rect.height + clean.gap <= other.rect.y + 1e-7 ||
          other.rect.y + other.rect.height + clean.gap <= rect.y + 1e-7).toBe(true);
        expect(segmentsIntersect(...points, ...other.points)).toBe(false);
      }
    }
  }
  const extent = side => Math.max(...layouts[2].map(n => side * (n.placement.points[1].x - map.x)));
  expect(extent(-1)).toBeGreaterThan(map.radius + 48);
  expect(extent(1)).toBeGreaterThan(map.radius + 48);
});
