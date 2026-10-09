/** Production label rendering. Copyright 2016-2026 Jason R. Grant. Apache-2.0. */
import {segmentsTooClose} from './LabelGeometry';
import {PlacementIndex} from './LabelPlacementIndex';

const TAU = Math.PI * 2;

const median = values => values.sort((a, b) => a - b)[Math.floor(values.length / 2)] || 1;

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

const overlap = (a, b, gap = 0) => a.x < b.x + b.width + gap - 1e-7 && a.x + a.width + gap > b.x + 1e-7 &&
  a.y < b.y + b.height + gap - 1e-7 && a.y + a.height + gap > b.y + 1e-7;

const inside = (r, map, padding) => r.x >= padding - 1e-7 && r.y >= padding - 1e-7 &&
  r.x + r.width <= map.width - padding + 1e-7 && r.y + r.height <= map.height - padding + 1e-7;

const center = r => ({x: r.x + r.width / 2, y: r.y + r.height / 2});

const normal = (a, map) => map.circular ? {x: Math.cos(a), y: Math.sin(a)} : {x: 0, y: -1};

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// A point on the same padded perimeter used by the shared motion renderer.
function attachment(rect, direction) {
  const c = center(rect);
  const length = Math.min((rect.width / 2 + 4) / Math.max(1e-12, Math.abs(direction.x)),
    (rect.height / 2 + 4) / Math.max(1e-12, Math.abs(direction.y)));
  return {x: c.x + direction.x * length, y: c.y + direction.y * length};
}

function fits(placement, clean, viewport = clean.constrainToViewport) {
  const {rect, points: [root, end]} = placement, {map} = clean;
  if (viewport && !inside(rect, map, clean.padding)) { return false; }
  if (clean.options.obstacles.some(box => overlap(rect, box, clean.gap))) { return false; }
  if (map.circular) {
    const x = clamp(map.x, rect.x, rect.x + rect.width), y = clamp(map.y, rect.y, rect.y + rect.height);
    return Math.hypot(x - map.x, y - map.y) >= map.radius + 2 - 1e-7 &&
      (root.x - map.x) * (end.x - root.x) + (root.y - map.y) * (end.y - root.y) >= -1e-7;
  }
  return rect.y + rect.height < map.y - 2 && end.y <= root.y;
}

function radial(node, a, d, root, n, row) {
  const rect = {x: root.x + n.x * d - node.width / 2, y: root.y + n.y * d - node.height / 2,
    width: node.width, height: node.height};
  return {id: node.id, placement: {a, rect, points: [root, attachment(rect, {x: -n.x, y: -n.y})], row}};
}

// Constrained rays stop where complete text leaves the viewport. Otherwise allow
// one viewport diagonal beyond the natural starting distance. Both searches stay
// finite in screen pixels, independent of the map's radius at deep zoom.
function rayRange(node, a, clean) {
  const {map, padding} = clean, root = clean.point(a), n = normal(a, map);
  let low = 24 + (Math.abs(n.x) * node.width + Math.abs(n.y) * node.height) / 2;
  let high = Math.hypot(map.width, map.height);
  if (!clean.constrainToViewport) { return [low, low + high]; }
  for (const [axis, size, extent] of [['x', node.width, map.width], ['y', node.height, map.height]]) {
    const min = padding + size / 2, max = extent - padding - size / 2;
    if (max < min) { return; }
    if (Math.abs(n[axis]) < 1e-9) {
      if (root[axis] < min || root[axis] > max) { return; }
    } else {
      const p = (min - root[axis]) / n[axis], q = (max - root[axis]) / n[axis];
      low = Math.max(low, Math.min(p, q)); high = Math.min(high, Math.max(p, q));
    }
  }
  return high >= low ? [low, high] : undefined;
}

function straight(node, clean) {
  const {a, points: [root, end]} = node.placement, n = normal(a, clean.map);
  return Math.abs(n.x * (end.y - root.y) - n.y * (end.x - root.x)) < 1e-5;
}

/**
 * Incremental indexed packing. Each yield is a safe point for the frame pump.
 * @param {AdaptiveLabelLayout} clean - Solved Clean endpoint; not mutated.
 * @param {Object} [previous] - Previous dense selection.
 * @returns {Generator} Yields work boundaries, returns {placed, additions, straight, attempts}.
 */
export function* packAdaptiveDensitySteps(clean, previous) {
  let placed = clean.placed.slice();
  let index = new PlacementIndex(clean);
  for (const node of placed) { index.add(node); }
  const original = new Set(placed.map(n => n.id));
  const retained = new Set(previous?.additions.map(n => n.id.feature) || []);
  let attempts = 0;
  const find = function* (node, a, maximum = Infinity) {
    const range = rayRange(node, a, clean);
    if (!range) { return; }
    const root = clean.point(a), n = normal(a, clean.map);
    const step = Math.max(3, node.height + clean.gap), high = Math.min(range[1], maximum);
    for (let d = range[0], row = 0; d <= high + 1e-7; d += step, row++) {
      if (++attempts % 32 === 0) { yield; }
      const target = radial(node, a, d, root, n, row);
      if (fits(target.placement, clean) && !index.conflicts(target)) { return {...node, placement: target.placement}; }
    }
  };
  // Moving one label can release a position for another. Never evict an Oval
  // label to make this pass succeed; its checked original is always a fallback.
  for (let pass = 0; pass < 3; pass++) {
    let changed = false;
    for (let i = 0; i < placed.length; i++) {
      yield;
      const node = placed[i], {a, rect, points: [root]} = node.placement;
      const maximum = straight(node, clean) ? distance(center(rect), root) - 1e-6 : Infinity;
      const target = yield* find(node, a, maximum);
      if (target) { placed[i] = target; index.add(target); changed = true; }
    }
    if (!changed) { break; }
  }
  const candidates = clean.nodes.filter(n => !original.has(n.id)).sort((a, b) =>
    Number(b.favorite) - Number(a.favorite) || Number(retained.has(b.id.feature)) - Number(retained.has(a.id.feature)) || a.rank - b.rank);
  const fill = function* () {
    const additions = [];
    for (const node of candidates) {
      yield;
      if (placed.length >= clean.maxLabels) { break; }
      const target = yield* find(node, node.preferred);
      if (target) { placed.push(target); index.add(target); additions.push(target); }
    }
    return {placed, additions, straight: placed.filter(node => straight(node, clean)).length};
  };
  let best = yield* fill();
  // Some Oval leaders block each other's individual moves. Also try a collective
  // straight packing, reserving the tightest radial corridors first. Only use a
  // complete packing of the original set, and never reduce the filled count.
  if (best.straight < best.placed.length) {
    const room = node => { const range = rayRange(node, node.placement.a, clean); return range ? range[1] - range[0] : -Infinity; };
    const ordered = clean.placed.slice().sort((a, b) => room(a) - room(b));
    for (const order of [ordered, clean.placed]) {
      placed = [];
      index = new PlacementIndex(clean);
      for (const node of order) {
        yield;
        const target = yield* find(node, node.placement.a);
        if (!target) { break; }
        placed.push(target); index.add(target);
      }
      if (placed.length !== clean.placed.length) { continue; }
      const byLabel = new Map(placed.map(node => [node.id, node]));
      placed = clean.placed.map(node => byLabel.get(node.id));
      const alternative = yield* fill();
      if (alternative.placed.length > best.placed.length ||
        (alternative.placed.length === best.placed.length && alternative.straight > best.straight)) { best = alternative; }
    }
  }
  return {...best, attempts};
}

const straightFromRoot = (node, map) => {
  const [p, q] = node.placement.points;
  const nx = map.circular ? (p.x - map.x) / map.radius : 0, ny = map.circular ? (p.y - map.y) / map.radius : -1;
  return Math.abs(nx * (q.y - p.y) - ny * (q.x - p.x)) < 1e-5;
};

/**
 * Cooperative pressure packing with indexed exact checks and bounded retries.
 * @param {AdaptiveLabelLayout} clean - Immutable Clean geometry.
 * @param {Object} pressure - Current crowding report.
 * @param {Object} [previous] - Previous dense endpoint for identity preference.
 * @returns {Generator} Yields work boundaries, returns the dense endpoint. No input changes.
 */
export function* packAdaptivePressureSteps(clean, pressure, previous) {
  const baseline = yield* packAdaptiveDensitySteps(clean, previous?.baseline);
  let best = baseline, attempts = baseline.attempts;
  if (pressure.crowded && baseline.straight < baseline.placed.length) {
    const seeds = baseline.placed.filter(n => straightFromRoot(n, clean.map));
    const solve = function* (placed, nodes = clean.nodes) {
      const source = Object.assign(Object.create(Object.getPrototypeOf(clean)), clean, {placed, nodes});
      const result = yield* packAdaptiveDensitySteps(source, previous);
      attempts += result.attempts;
      return result;
    };
    best = yield* solve(seeds);
    // Try a fresh selection only when removing the old angled placements costs
    // labels. The search, radial positions and collision rules remain the same.
    if (best.placed.length < baseline.placed.length) {
      const fresh = yield* solve([]);
      if (fresh.placed.length > best.placed.length) { best = fresh; }
    }
    if (best.placed.length < baseline.placed.length) {
      const compact = clean.nodes.slice().sort((a, b) => a.width * a.height - b.width * b.height || a.rank - b.rank)
        .map((node, rank) => ({...node, rank}));
      const alternative = yield* solve([], compact);
      if (alternative.placed.length > best.placed.length) { best = alternative; }
    }
  }
  const originals = new Set(clean.placed.map(n => n.id));
  return {...best, baseline, attempts, additions: best.placed.filter(n => !originals.has(n.id))};
}

const smooth = n => { const x = clamp(n, 0, 1); return x * x * (3 - 2 * x); };

function conflict(a, b, clean) {
  if (overlap(a.rect, b.rect, clean.gap)) { return true; }
  const [p, q] = a.points, [s, t] = b.points;
  return segmentsTooClose(p, q, s, t, Math.min(clean.lineWidth + 0.75, Math.hypot(p.x - s.x, p.y - s.y) * 0.75));
}

function blend(from, to, amount) {
  const rect = {...from.rect, x: from.rect.x + (to.rect.x - from.rect.x) * amount,
    y: from.rect.y + (to.rect.y - from.rect.y) * amount};
  const a = center(from.rect), b = center(to.rect), c = center(rect);
  const start = Math.atan2(from.points[1].y - a.y, from.points[1].x - a.x);
  const end = Math.atan2(to.points[1].y - b.y, to.points[1].x - b.x);
  const angle = start + Math.atan2(Math.sin(end - start), Math.cos(end - start)) * amount;
  const nx = Math.cos(angle), ny = Math.sin(angle);
  const depth = Math.min((rect.width / 2 + 4) / Math.max(1e-12, Math.abs(nx)), (rect.height / 2 + 4) / Math.max(1e-12, Math.abs(ny)));
  return {...to, rect, points: [to.points[0], {x: c.x + nx * depth, y: c.y + ny * depth}]};
}

function regionPosition(a, map) {
  return map.circular ? ((a % TAU + TAU) % TAU) / TAU * 12 : clamp(a / map.width * 12 - 0.5, 0, 11);
}

function localAmount(node, clean, pressure, amount) {
  const p = regionPosition(node.preferred, clean.map), i = Math.floor(p), fraction = p - i;
  const ratio = pressure.regions[i].ratio * (1 - fraction) + pressure.regions[(i + 1) % 12].ratio * fraction;
  const busy = smooth((ratio - 1) / 3);
  const local = smooth(amount / (1 - 0.6 * busy)) * (0.15 + 0.85 * busy);
  // Quiet regions can stay angled midway, but all Oval protection expires on
  // crowded maps before Maximum. Navigation uses the hysteretic crowded flag.
  return Math.max(local, pressure.crowded ? smooth((amount - 0.7) / 0.25) : 0);
}

/**
 * Yield between labels while interpolating according to local density.
 * @param {AdaptiveLabelLayout} clean - Clean endpoint.
 * @param {Object} dense - Dense endpoint.
 * @param {Object} pressure - Crowding report.
 * @param {Number} amount - Density in [0,1].
 * @returns {Generator} Returns targets identical to pressureTargets; no mutations.
 */
export function* adaptiveTargetSteps(clean, dense, pressure, amount) {
  if (amount <= 0) { return clean.placed; }
  if (amount >= 1 && pressure.crowded) { return dense.placed; }
  const originals = new Map(clean.placed.map(n => [n.id, n]));
  const targets = new Map(dense.placed.map(n => [n.id, n]));
  const count = Math.min(dense.placed.length, clean.placed.length + Math.round(amount * (dense.placed.length - clean.placed.length)));
  const selected = dense.placed.slice().sort((a, b) => Number(originals.has(b.id)) - Number(originals.has(a.id))).slice(0, count);
  const selectedIds = new Set(selected.map(n => n.id));
  // Recover an omitted Clean label when one substitution suffices. Its identity
  // is a preference, never a reason to discard multiple useful labels.
  for (const original of clean.placed) {
    yield;
    if (selectedIds.has(original.id) || localAmount(original, clean, pressure, amount) >= 1 || !fits(original.placement, clean)) { continue; }
    const blocked = selected.filter(n => conflict(original.placement, n.placement, clean));
    const victim = blocked.length === 1 && !originals.has(blocked[0].id) ? blocked[0] :
      blocked.length === 0 ? selected.slice().reverse().find(n => !originals.has(n.id)) : undefined;
    if (!victim) { continue; }
    selected[selected.indexOf(victim)] = original;
    selectedIds.delete(victim.id); selectedIds.add(original.id);
  }
  // Start with collision-free boxes. Pull each retained identity toward Oval
  // only as far as the surrounding labels allow.
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < selected.length; i++) {
      yield;
      const node = selected[i], original = originals.get(node.id);
      if (!original) { continue; }
      const target = targets.get(node.id);
      if (!target) { continue; }
      const desired = blend(original.placement, target.placement, localAmount(original, clean, pressure, amount));
      for (const fraction of [1, 0.75, 0.5, 0.25]) {
        const placement = blend(node.placement, desired, fraction);
        if (fits(placement, clean) && !selected.some(other => other.id !== node.id && conflict(placement, other.placement, clean))) {
          selected[i] = {...node, placement}; break;
        }
      }
    }
  }
  return selected;
}

export function targetLayout(input, clean, dense, pressure, placed) {
  const {map, options, candidates, amount} = input;
  const originalIds = new Set(clean.placed.map(n => n.id));
  return {map, options, candidates, clean, dense, pressure, amount,
    placed: placed.map(node => ({...node, bp: input.bp(node.placement.a)})),
    padding: clean.padding, constrainToViewport: clean.constrainToViewport,
    mode: amount === 0 ? clean.mode : pressure.crowded && amount >= 0.95 && dense && dense.straight === dense.placed.length ?
      (map.circular ? 'radial' : 'perpendicular') : 'mixed', point: a => clean.point(a),
    densityStats: {value: amount, clean: clean.placed.length, maximum: dense?.placed.length ?? null,
      selected: placed.length, straight: placed.filter(n => straight(n, clean)).length,
      retainedOval: placed.filter(n => !straightFromRoot(n, map)).length, attempts: dense?.attempts ?? 0},
    pressureStats: {ratio: pressure.ratio, crowded: pressure.crowded,
      retainedClean: placed.filter(n => originalIds.has(n.id)).length,
      baselineMaximum: dense?.baseline.placed.length ?? null,
      baselineOval: dense ? dense.baseline.placed.length - dense.baseline.straight : null}};
}
