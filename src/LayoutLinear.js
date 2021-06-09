//////////////////////////////////////////////////////////////////////////////
// Layout for Linear Maps
//////////////////////////////////////////////////////////////////////////////

import CGArray from './CGRange';

/**
 * <br />
 * This Layout is in control of handling and drawing the map as a line
 */
export default class LayoutLinear {

  /**
   * Create a Layout
   */
  constructor(layout) {
    this._layout = layout;
  }

  toString() {
    return 'LayoutLinear';
  }

  // Convenience properties
  get layout() { return this._layout; }
  get viewer() { return this.layout.viewer; }
  get canvas() { return this.layout.canvas; }
  get backbone() { return this.layout.backbone; }
  get sequence() { return this.layout.sequence; }
  get scale() { return this.layout.scale; }
  get width() { return this.layout.width; }
  get height() { return this.layout.height; }

  get type() {
    return 'linear';
  }

  //////////////////////////////////////////////////////////////////////////
  // Required Delegate Methods
  //////////////////////////////////////////////////////////////////////////

  pointForBp(bp, centerOffset = this.backbone.adjustedCenterOffset) {
    const x = this.scale.x(this.scale.bp(bp));
    const y = this.scale.y(centerOffset);
    return {x: x, y: y};
  }

  // NOTE: only the X coordinate of the point is required
  bpForPoint(point) {
    const mapX = this.scale.x.invert(point.x);
    return Math.round( this.scale.bp.invert( mapX) );
  }

  centerOffsetForPoint(point) {
    // return point.y;
    return this.scale.y.invert(point.y);
  }

  // Return the X and Y domains for a bp and zoomFactor
  // Offset: Distances of map center from backbone
  //   0: backbone centered
  //   Minus: backbone moved down from canvas center
  //   Positive: backbone move up from canvas center
  domainsFor(bp, zoomFactor = this.viewer.zoomFactor, bbOffset = 0) {
    const halfRangeWidth = this.scale.x.range()[1] / 2;
    const halfRangeHeight = this.scale.y.range()[1] / 2;

    // _mapPointForBp requires the bp scale be first altered for the zoom level
    const origScaleBp = this.scale.bp.copy();

    const rangeHalfWidth2 = this.canvas.width * zoomFactor / 2;
    this.scale.bp.range([-rangeHalfWidth2, rangeHalfWidth2]);

    const centerPt = this._mapPointForBp(bp, (this.backbone.centerOffset - bbOffset));
    // Return to the original scale
    this.scale.bp = origScaleBp;
    const x = bp ? centerPt.x : 0;
    const y = bp ? centerPt.y : 0;

    return [ x - halfRangeWidth, x + halfRangeWidth, y + halfRangeHeight, y - halfRangeHeight];
  }

  // Does not need the initial argument
  adjustBpScaleRange() {
    const rangeHalfWidth = this.canvas.width * this.viewer.zoomFactor / 2;
    this.scale.bp.range([-rangeHalfWidth, rangeHalfWidth]);
  }

  // TODO if undefined, see if centerOffset is visible
  visibleRangeForCenterOffset(centerOffset, margin = 0) {
    const domainX = this.scale.x.domain();
    const start = Math.floor(this.scale.bp.invert(domainX[0] - margin));
    const end = Math.ceil(this.scale.bp.invert(domainX[1] + margin));
    return new CGRange(this.sequence.mapContig,
      Math.max(start, 1),
      Math.min(end, this.sequence.length));
  }

  maxMapThickness() {
    return this.viewer.height / 2;
  }

  // For linear maps the pixels per bp is independent of the centerOffset
  pixelsPerBp(centerOffset = this.backbone.adjustedCenterOffset) {
    const scaleBp = this.scale.bp;
    const range = scaleBp.range();
    return  (range[1] - range[0]) / (scaleBp.invert(range[1]) - scaleBp.invert(range[0]));
  }

  clockPositionForBp(bp, inverse = false) {
    return inverse ? 6 : 12;
  }

  zoomFactorForLength(bpLength) {
    return this.sequence.length / bpLength;
  }

  initialWorkingSpace() {
    return 0.25 * this.viewer.minDimension;
  }

  // The backbone will be the center of the map
  updateInitialBackboneCenterOffset(insideThickness, outsideThickness) {
    this.backbone.centerOffset = 0;
  }

  adjustedBackboneCenterOffset(centerOffset) {
    return centerOffset;
  }

  path(layer, centerOffset, startBp, stopBp, anticlockwise = false, startType = 'moveTo') {
    const canvas = this.canvas;
    const ctx = canvas.context(layer);

    // FIXME: have option to round points (could use for divider lines)
    const p2 = this.pointForBp(stopBp, centerOffset);
    if (startType === 'lineTo') {
      const p1 = this.pointForBp(startBp, centerOffset);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
    } else if (startType === 'moveTo') {
      const p1 = this.pointForBp(startBp, centerOffset);
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
    } else if (startType === 'noMoveTo') {
      ctx.lineTo(p2.x, p2.y);
    }
  }


  //////////////////////////////////////////////////////////////////////////
  // Helper Methods
  //////////////////////////////////////////////////////////////////////////

  // Return map point (map NOT canvas coordinates) for given bp and centerOffset.
  // centerOffset is the distance from the backbone.
  _mapPointForBp(bp, centerOffset = this.backbone.adjustedCenterOffset) {
    const x = this.scale.bp(bp);
    const y = centerOffset;
    return {x: x, y: y};
  }


}


