import AdaptiveLabelLayout from '../src/labels/AdaptiveLabelLayout';
import {measureOvalPressure} from '../src/labels/LabelCapacity';
import {packAdaptivePressureSteps, adaptiveTargetSteps} from '../src/labels/AdaptiveLabelPacking';

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
