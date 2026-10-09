import {segmentsTooClose} from '../src/labels/LabelGeometry';
import {PlacementIndex} from '../src/labels/LabelPlacementIndex';

function generator(seed = 31) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
}
function bruteConflict(a, b, gap, lineWidth) {
  const r = a.rect, s = b.rect, [p, q] = a.points, [u, v] = b.points;
  return (r.x < s.x + s.width + gap - 1e-7 && r.x + r.width + gap > s.x + 1e-7 &&
    r.y < s.y + s.height + gap - 1e-7 && r.y + r.height + gap > s.y + 1e-7) ||
    segmentsTooClose(p, q, u, v, Math.min(lineWidth + 0.75, Math.hypot(p.x - u.x, p.y - u.y) * 0.75));
}

test.each([0, 1, 6])('index matches exhaustive checks with line width %s, replacements and removals', lineWidth => {
  const random = generator(), options = {gap: 3, lineWidth}, index = new PlacementIndex(options), nodes = [];
  const make = id => {
    const x = random() * 1800 - 500, y = random() * 1400 - 400;
    return {id, placement: {rect: {x, y, width: random() * 140 + 3, height: random() * 30 + 3},
      points: [{x: random() * 818, y: random() * 650}, {x, y}]}};
  };
  for (let i = 0; i < 160; i++) { const node = make(i); index.add(node); nodes.push(node); }
  for (let i = 0; i < 500; i++) {
    const target = make(i % 200);
    expect(index.conflicts(target)).toBe(nodes.some(n => n.id !== target.id && bruteConflict(target.placement, n.placement, 3, lineWidth)));
    if (i % 3 === 0) {
      index.add(target);
      const old = nodes.findIndex(n => n.id === target.id);
      if (old >= 0) { nodes[old] = target; } else { nodes.push(target); }
    }
    if (i % 7 === 0) {
      index.remove(target.id);
      const old = nodes.findIndex(n => n.id === target.id);
      if (old >= 0) { nodes.splice(old, 1); }
    }
  }
});

test('cell edges, near-parallel leaders, zero length and extreme coordinates are conservative', () => {
  const points = [
    [{x: -32, y: -32}, {x: 320, y: 320}],
    [{x: 0, y: 32}, {x: 1000, y: 32}],
    [{x: 32, y: 32}, {x: 32, y: 32}],
    [{x: -1e6, y: -1e6}, {x: 1e6, y: 1e6}],
    [{x: 64 + 1e-9, y: 0}, {x: 64, y: 1000}]
  ];
  for (const pair of points) {
    const index = new PlacementIndex({gap: 0, lineWidth: 1});
    const node = {id: 0, placement: {points: pair, rect: {x: -2000, y: -2000, width: 20, height: 3}}};
    index.add(node);
    for (const offset of [0, 1e-7, 1.74999, 1.75001, 32, 100]) {
      const target = {id: 1, placement: {points: pair.map(p => ({x: p.x + offset, y: p.y})),
        rect: {x: -3000, y: -3000, width: 20, height: 3}}};
      expect(index.conflicts(target)).toBe(bruteConflict(target.placement, node.placement, 0, 1));
    }
  }
});
