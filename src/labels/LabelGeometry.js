/** Production label rendering. Copyright 2016-2026 Jason R. Grant. Apache-2.0. */
const EPSILON = 1e-7;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/**
 * Test closed segments, including touching and collinear overlap. No side effects.
 * @param {Object} a - First segment start {x, y}.
 * @param {Object} b - First segment end.
 * @param {Object} c - Second segment start.
 * @param {Object} d - Second segment end.
 * @returns {Boolean} Whether the segments meet.
 */
export function segmentsIntersect(a, b, c, d) {
  const cross = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const on = (p, q, r) => r.x >= Math.min(p.x, q.x) - EPSILON && r.x <= Math.max(p.x, q.x) + EPSILON &&
    r.y >= Math.min(p.y, q.y) - EPSILON && r.y <= Math.max(p.y, q.y) + EPSILON;
  const abC = cross(a, b, c), abD = cross(a, b, d), cdA = cross(c, d, a), cdB = cross(c, d, b);
  if (((abC > EPSILON && abD < -EPSILON) || (abC < -EPSILON && abD > EPSILON)) &&
    ((cdA > EPSILON && cdB < -EPSILON) || (cdA < -EPSILON && cdB > EPSILON))) { return true; }
  return (Math.abs(abC) <= EPSILON && on(a, b, c)) || (Math.abs(abD) <= EPSILON && on(a, b, d)) ||
    (Math.abs(cdA) <= EPSILON && on(c, d, a)) || (Math.abs(cdB) <= EPSILON && on(c, d, b));
}

function pointSegmentDistanceSquared(point, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared ? Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared)) : 0;
  return (point.x - a.x - t * dx) ** 2 + (point.y - a.y - t * dy) ** 2;
}

/**
 * Check whether two segments intersect or leave less than the required gap.
 * Equality is allowed, with a small tolerance for floating-point coordinates.
 * No side effects. Used for visible leader clearance, independently of text.
 * @param {Object} a - First segment start {x, y}.
 * @param {Object} b - First segment end.
 * @param {Object} c - Second segment start.
 * @param {Object} d - Second segment end.
 * @param {Number} gap - Minimum separation in canvas pixels (nonnegative).
 * @returns {Boolean} Whether the segments intersect or are too close.
 */
export function segmentsTooClose(a, b, c, d, gap) {
  const padding = gap + EPSILON;
  if (Math.max(a.x, b.x) + padding < Math.min(c.x, d.x) || Math.max(c.x, d.x) + padding < Math.min(a.x, b.x) ||
    Math.max(a.y, b.y) + padding < Math.min(c.y, d.y) || Math.max(c.y, d.y) + padding < Math.min(a.y, b.y)) { return false; }
  if (segmentsIntersect(a, b, c, d)) { return true; }
  const minimumSquared = Math.max(0, gap - EPSILON) ** 2;
  return pointSegmentDistanceSquared(a, c, d) < minimumSquared || pointSegmentDistanceSquared(b, c, d) < minimumSquared ||
    pointSegmentDistanceSquared(c, a, b) < minimumSquared || pointSegmentDistanceSquared(d, a, b) < minimumSquared;
}

/**
 * Minimum squared-displacement packing of a fixed ordered sequence on a line.
 * Pool adjacent violators after removing the mandatory spacing. No side effects.
 * @param {Array} items - {size, desired, weight?} in fixed display order.
 * @param {Number} low - Start of the available interval, pixels.
 * @param {Number} high - End of the interval, pixels.
 * @param {Number} gap - Minimum gap between boxes, pixels.
 * @returns {?Array<Number>} Packed centers, or null if the sequence cannot fit.
 */
export function packOrdered(items, low, high, gap) {
  if (!items.length) { return []; }
  const offsets = [items[0].size / 2];
  for (let i = 1; i < items.length; i++) {
    offsets[i] = offsets[i - 1] + (items[i - 1].size + items[i].size) / 2 + gap;
  }
  const upper = high - offsets[offsets.length - 1] - items[items.length - 1].size / 2;
  if (upper < low - 1e-7) { return null; }
  const blocks = [];
  items.forEach((item, i) => {
    const weight = item.weight || 1;
    blocks.push({start: i, end: i, weight, sum: (item.desired - offsets[i]) * weight});
    while (blocks.length > 1) {
      const b = blocks[blocks.length - 1], a = blocks[blocks.length - 2];
      if (a.sum / a.weight <= b.sum / b.weight) { break; }
      blocks.splice(-2, 2, {start: a.start, end: b.end, sum: a.sum + b.sum, weight: a.weight + b.weight});
    }
  });
  const result = [];
  for (const block of blocks) {
    const base = clamp(block.sum / block.weight, low, upper);
    for (let i = block.start; i <= block.end; i++) { result[i] = base + offsets[i]; }
  }
  return result;
}
