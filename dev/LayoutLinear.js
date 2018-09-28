//////////////////////////////////////////////////////////////////////////////
// Layout for Linear Maps
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {
  /**
   * <br />
   * This Layout is in control of handling and drawing the map as a line
   */
  class LayoutLinear {

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

    pointFor(bp, mapCenterOffset = this.backbone.adjustedCenterOffset) {
      const x = this.scale.x(this.scale.bp(bp));
      const y = this.scale.y(mapCenterOffset);
      return {x: x, y: y};
    }

    // Return point on Circle Coordinates.
    // FIXME: needs better names
    pointFor2(bp, mapCenterOffset = this.backbone.adjustedCenterOffset) {
      const x = this.scale.bp(bp);
      const y = mapCenterOffset;
      return {x: x, y: y};
    }

    // FIXME: THE POINT IS ON THE X/Y SCALE NOT THE CANVAS. SHOULD IT BE??
    bpForPoint(point) {
      return Math.round( this.scale.bp.invert( point.x ) );
    }

    // MAP POINT
    centerOffsetForPoint(point) {
      return point.y;
    }

    // Return the X and Y domains for a bp and zoomFactor
    domainsFor(bp, zoomFactor = this.viewer.zoomFactor) {
      const halfRangeWidth = this.scale.x.range()[1] / 2;
      const halfRangeHeight = this.scale.y.range()[1] / 2;


      // The correct pointFor2 requies the bp scale be first altered for the zoom level
      const origScaleBp = this.scale.bp.copy();

      const rangeHalfWidth2 = this.canvas.width * zoomFactor / 2;
      this.scale.bp.range([-rangeHalfWidth2, rangeHalfWidth2]);

      const centerPt = this.pointFor2(bp);
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

    pixelsPerBp(mapCenterOffset = this.backbone.adjustedCenterOffset) {
      const scaleBp = this.scale.bp;
      const range = scaleBp.range();
      return  (range[1] - range[0]) / (scaleBp.invert(range[1]) - scaleBp.invert(range[0]));
    }

    zoomFactorForLength(bpLength) {
      return this.sequence.length / bpLength;
    }

    clockPositionForBp(bp, inverse = false) {
      return inverse ? 6 : 12;
    }


    maxMapThickness() {
      return this.viewer.height / 2;
    }

    // TODO if undefined, see if centerOffset is visible
    // FIXME: check if offset is visible 
    visibleRangeForCenterOffset(centerOffset, margin = 0) {
      // const range = this.scale.bp.range();
      // return new CGV.CGRange(this.sequence,
      //   Math.max(this.scale.bp.invert(range[0]), 1),
      //   Math.min(this.scale.bp.invert(range[1]), this.sequence.length));
      const domainX = this.scale.x.domain();
      // const start = this.scale.bp.invert(domainX[0]);
      // const end = this.scale.bp.invert(domainX[1]);
      const start = Math.floor(this.scale.bp.invert(domainX[0]));
      const end = Math.ceil(this.scale.bp.invert(domainX[1]));
      return new CGV.CGRange(this.sequence,
        Math.max(start, 1),
        Math.min(end, this.sequence.length));
      // return new CGV.CGRange(this.sequence,
      //   Math.max(this.bpForPoint({x: range[0], y: 0}), 1),
      //   Math.min(this.bpForPoint({x: range[0], y: 0}), this.sequence.length));
    }

    path(layer, centerOffset, startBp, stopBp, anticlockwise = false, startType = 'moveTo') {
      const canvas = this.canvas;
      const ctx = canvas.context(layer);

      // FIXME: have option to round points (could use for divider lines)
      const p2 = this.pointFor(stopBp, centerOffset);
      if (startType === 'lineTo') {
        const p1 = this.pointFor(startBp, centerOffset);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
      } else if (startType === 'moveTo') {
        const p1 = this.pointFor(startBp, centerOffset);
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
      } else if (startType === 'noMoveTo') {
        ctx.lineTo(p2.x, p2.y);
      }
    }

    initialWorkingSpace() {
      return 0.25 * this.viewer.minDimension;
    }

    // The backbone will be the center of the map
    updateInitialBackboneCenterOffset(insideThickness, outsideThickness) {
      this.backbone.centerOffset = 0;
    }


  }

  CGV.LayoutLinear = LayoutLinear;
})(CGView);
