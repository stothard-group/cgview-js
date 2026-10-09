/** Production label rendering. Copyright 2016-2026 Jason R. Grant. Apache-2.0. */
const TAU = Math.PI * 2;
const clamp = (n, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
const median = values => values.sort((a, b) => a - b)[Math.floor(values.length / 2)] || 1;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const wrap = n => ((n % TAU) + TAU) % TAU;

// Sample only visible arcs so deep zoom does not miss a narrow on-screen segment.
function samplePath(map) {
  if (!map.circular) {
    return Array.from({length: 144}, (_, i) => ({a: map.width * (i + 0.5) / 144, span: map.width / 144}));
  }
  const cuts = [0, TAU];
  for (const x of [0, map.width]) {
    const ratio = (x - map.x) / map.radius;
    if (Math.abs(ratio) <= 1) { const a = Math.acos(ratio); cuts.push(wrap(a), wrap(-a)); }
  }
  for (const y of [0, map.height]) {
    const ratio = (y - map.y) / map.radius;
    if (Math.abs(ratio) <= 1) { const a = Math.asin(ratio); cuts.push(wrap(a), wrap(Math.PI - a)); }
  }
  cuts.sort((a, b) => a - b);
  const intervals = [];
  for (let i = 1; i < cuts.length; i++) {
    const a = (cuts[i - 1] + cuts[i]) / 2;
    const x = map.x + map.radius * Math.cos(a), y = map.y + map.radius * Math.sin(a);
    if (cuts[i] > cuts[i - 1] && x >= 0 && x <= map.width && y >= 0 && y <= map.height) {
      intervals.push([cuts[i - 1], cuts[i]]);
    }
  }
  const length = intervals.reduce((sum, [lo, hi]) => sum + hi - lo, 0);
  return intervals.flatMap(([lo, hi]) => {
    const count = Math.max(1, Math.ceil(144 * (hi - lo) / length)), span = (hi - lo) / count;
    return Array.from({length: count}, (_, i) => ({a: lo + (i + 0.5) * span, span}));
  });
}

/**
 * Estimate viewport space from outward rows and usable exterior area.
 * Counts are geometric estimates, not collision-free solver guarantees. Regions
 * use local mean text sizes; empty regions use the global mean. Leader crossings,
 * selection limits and the solver's density cap are deliberately not predicted.
 * @param {Object[]} candidates - Eligible {width, height, preferred} labels.
 * @param {Object} map - {circular, x, y, radius, width, height} in screen pixels.
 * @param {Object} [options={}] - gap, padding, obstacles ({x,y,width,height}[]).
 * @returns {Object} Demand, estimated capacities/rows and 12 local regions; no mutations.
 */
export function measureLabelCapacity(candidates, map, options = {}) {
  const gap = options.gap ?? 3, padding = options.padding ?? 6, obstacles = options.obstacles || [];
  const input = candidates.filter(n => [n.width, n.height, n.preferred].every(Number.isFinite) && n.width > 0 && n.height > 0);
  const regionFor = value => map.circular ? Math.round(wrap(value) / TAU * 12) % 12 :
    clamp(Math.floor(value / map.width * 12), 0, 11);
  const regions = Array.from({length: 12}, (_, index) => ({index,
    name: map.circular ? `${(index + 3) % 12 || 12} o'clock` : `section ${index + 1}`,
    demand: 0, width: 0, height: 0, singleRowCapacity: 0, totalCapacity: 0, maxRows: 0, areaCapacity: 0}));
  let width = 0, height = 0;
  for (const node of input) {
    const region = regions[regionFor(node.preferred)];
    region.demand++; region.width += node.width; region.height += node.height;
    width += node.width; height += node.height;
  }
  width /= input.length || 1; height /= input.length || 1;
  for (const region of regions) {
    region.width = region.demand ? region.width / region.demand : width;
    region.height = region.demand ? region.height / region.demand : height;
  }
  const fits = rect => {
    if (rect.x < padding || rect.y < padding || rect.x + rect.width > map.width - padding ||
      rect.y + rect.height > map.height - padding) { return false; }
    if (map.circular) {
      const x = clamp(map.x, rect.x, rect.x + rect.width), y = clamp(map.y, rect.y, rect.y + rect.height);
      if (Math.hypot(x - map.x, y - map.y) < map.radius + 2) { return false; }
    } else if (rect.y + rect.height >= map.y - 2) { return false; }
    return !obstacles.some(b => rect.x < b.x + b.width + gap && rect.x + rect.width + gap > b.x &&
      rect.y < b.y + b.height + gap && rect.y + rect.height + gap > b.y);
  };
  const reach = Math.hypot(map.width, map.height);
  if (input.length && map.width > 0 && map.height > 0) {
    for (const {a, span} of samplePath(map)) {
      const nx = map.circular ? Math.cos(a) : 0, ny = map.circular ? Math.sin(a) : -1;
      const root = map.circular ? {x: map.x + map.radius * nx, y: map.y + map.radius * ny} : {x: a, y: map.y};
      if (root.x < 0 || root.x > map.width || root.y < 0 || root.y > map.height) { continue; }
      const region = regions[regionFor(a)], w = region.width, h = region.height;
      const depth = Math.abs(nx) * w + Math.abs(ny) * h;
      const along = Math.abs(ny) * w + Math.abs(nx) * h + gap;
      let rows = 0;
      // A finite screen-space search, independent of map radius/zoom and label count.
      for (let row = 0, distance = 24 + depth / 2; distance < reach; row++, distance += Math.max(4, depth + gap)) {
        const x = root.x + nx * distance, y = root.y + ny * distance;
        if (x < 0 || x > map.width || y < 0 || y > map.height) { break; }
        if (!fits({x: x - w / 2, y: y - h / 2, width: w, height: h})) { continue; }
        const capacity = (map.circular ? span * (map.radius + distance) : span) / along;
        if (!row) { region.singleRowCapacity += capacity; }
        region.totalCapacity += capacity;
        rows++;
      }
      region.maxRows = Math.max(region.maxRows, rows);
    }
    // An elongated contour can use space between radial rows. Divide sampled
    // exterior area by local-mean text footprints for a loose packing estimate.
    // Count each cell once, even when multiple layout directions could reach it.
    const columns = 64, rows = 64, dx = map.width / columns, dy = map.height / rows;
    for (let ix = 0; ix < columns; ix++) {
      for (let iy = 0; iy < rows; iy++) {
        const x = (ix + 0.5) * dx, y = (iy + 0.5) * dy;
        const a = map.circular ? Math.atan2(y - map.y, x - map.x) : x;
        const root = map.circular ? {x: map.x + map.radius * Math.cos(a), y: map.y + map.radius * Math.sin(a)} : {x, y: map.y};
        if (root.x < 0 || root.x > map.width || root.y < 0 || root.y > map.height) { continue; }
        const region = regions[regionFor(a)], w = region.width, h = region.height;
        if (w <= map.width - padding * 2 && h <= map.height - padding * 2 && fits({x, y, width: 0, height: 0})) {
          region.areaCapacity += dx * dy / ((w + gap) * (h + gap));
        }
      }
    }
  }
  for (const region of regions) { region.totalCapacity = Math.max(region.totalCapacity, region.areaCapacity); }
  // Floor after summing the fractional samples, including across region boundaries.
  const singleRowCapacity = Math.floor(regions.reduce((sum, r) => sum + r.singleRowCapacity, 0));
  const totalCapacity = Math.floor(regions.reduce((sum, r) => sum + r.totalCapacity, 0));
  for (const region of regions) {
    region.singleRowCapacity = Math.floor(region.singleRowCapacity);
    region.totalCapacity = Math.floor(region.totalCapacity);
    region.areaCapacity = Math.floor(region.areaCapacity);
    region.pressure = region.singleRowCapacity ? region.demand / region.singleRowCapacity : region.demand ? null : 0;
  }
  const peak = regions.filter(r => r.demand).sort((a, b) =>
    (b.pressure ?? Infinity) - (a.pressure ?? Infinity) || b.demand - a.demand || a.index - b.index)[0];
  return {demand: input.length, singleRowCapacity, totalCapacity,
    maxRows: Math.max(...regions.map(r => r.maxRows)), regions,
    peakRegion: peak?.name, peakDemand: peak?.demand || 0, peakCapacity: peak?.singleRowCapacity || 0,
    scope: 'viewport', estimated: true};
}

function regionPosition(a, map) {
  return map.circular ? ((a % TAU + TAU) % TAU) / TAU * 12 : clamp(a / map.width * 12 - 0.5, 0, 11);
}

function distribute(nodes, map) {
  const counts = Array(12).fill(0);
  for (const node of nodes) {
    if (![node.width, node.height, node.preferred].every(Number.isFinite) || node.width <= 0 || node.height <= 0) { continue; }
    const p = regionPosition(node.preferred, map), i = Math.floor(p), fraction = p - i;
    counts[i] += 1 - fraction; counts[(i + 1) % 12] += fraction;
  }
  return counts;
}

/**
 * Measure all eligible labels against local text capacity and the solved Oval.
 * Neighboring windows overlap; global mode uses separate enter/leave thresholds.
 * @param {AdaptiveLabelLayout} clean - Current exact Oval result, including unselected candidates.
 * @param {Object} [previous] - Previous pressure report for navigation hysteresis.
 * @returns {Object} Capacity estimate, pressure ratios and crowded flag; no input changes.
 */
export function measureOvalPressure(clean, previous) {
  const capacity = measureLabelCapacity(clean.candidates, clean.map, {...clean.options, padding: clean.padding});
  const demand = distribute(clean.candidates, clean.map), occupied = distribute(clean.placed, clean.map);
  const space = capacity.regions.map((r, i) => Math.max(r.singleRowCapacity, occupied[i]));
  const neighbor = (i, offset) => clean.map.circular ? (i + offset + 12) % 12 : clamp(i + offset, 0, 11);
  const sum = (values, i) => values[neighbor(i, -1)] + 2 * values[i] + values[neighbor(i, 1)];
  const regions = demand.map((_, i) => ({demand: sum(demand, i) / 4, capacity: sum(space, i) / 4,
    ratio: sum(demand, i) / Math.max(1, sum(space, i))}));
  const ratio = capacity.demand / Math.max(1, capacity.singleRowCapacity, clean.placed.length);
  return {capacity, ratio, crowded: ratio >= (previous?.crowded ? 1.75 : 2.25), regions};
}
