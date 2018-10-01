//////////////////////////////////////////////////////////////////////////////
// Layout for Circular Maps
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {
  /**
   * <br />
   * This Layout is in control of handling and drawing the map as a circle
   */
  class LayoutCircular {

    /**
     * Create a Layout
     */
    constructor(layout) {
      this._layout = layout;
    }

    toString() {
      return 'LayoutCircular';
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
      return 'circular';
    }

    //////////////////////////////////////////////////////////////////////////
    // Required Delegate Methods
    //////////////////////////////////////////////////////////////////////////

    // Return point on Canvas.
    // mapCenterOffset is the radius for circular maps
    pointForBp(bp, centerOffset = this.backbone.adjustedCenterOffset) {
      const radians = this.scale.bp(bp);
      const x = this.scale.x(0) + (centerOffset * Math.cos(radians));
      const y = this.scale.y(0) + (centerOffset * Math.sin(radians));
      return {x: x, y: y};
    }

    bpForPoint(point) {
      const mapX = this.scale.x.invert(point.x);
      const mapY = this.scale.y.invert(point.y);
      return Math.round( this.scale.bp.invert( CGV.angleFromPosition(mapX, mapY) ) );
    }


    centerOffsetForPoint(point) {
      // return Math.sqrt( (point.x * point.x) + (point.y * point.y) );
      const mapX = this.scale.x.invert(point.x);
      const mapY = this.scale.y.invert(point.y);
      return Math.sqrt( (mapX * mapX) + (mapY * mapY) );
    }

    // Return the X and Y domains for a bp and zoomFactor
    domainsFor(bp, zoomFactor = this.viewer.zoomFactor) {
      const halfRangeWidth = this.scale.x.range()[1] / 2;
      const halfRangeHeight = this.scale.y.range()[1] / 2;

      const centerOffset = this.backbone.centerOffset * zoomFactor;
      const centerPt = this._mapPointForBp(bp, centerOffset);

      const x = bp ? centerPt.x : 0;
      const y = bp ? centerPt.y : 0;

      return [ x - halfRangeWidth, x + halfRangeWidth, y + halfRangeHeight, y - halfRangeHeight];
    }

    // Zoom Factor does not affect circular bp scale
    adjustBpScaleRange(initialize = false) {
      if (initialize) {
        this.scale.bp.range([-1 / 2 * Math.PI, 3 / 2 * Math.PI]);
      }
    }


    // TODO if undefined, see if centerOffset is visible
    visibleRangeForCenterOffset(centerOffset, margin = 0) {
      const ranges = this._visibleRangesForRadius(centerOffset, margin);
      if (ranges.length === 2) {
        return new CGV.CGRange(this.sequence, ranges[0], ranges[1]);
      } else if (ranges.length > 2) {
        return new CGV.CGRange(this.sequence, ranges[0], ranges[ranges.length - 1]);
      } else if ( (centerOffset - margin) > this._maximumVisibleRadius() ) {
        return undefined;
      } else if ( (centerOffset + margin) < this._minimumVisibleRadius() ) {
        return undefined;
      } else {
        return new CGV.CGRange(this.sequence, 1, this.sequence.length);
      }
      // } else {
      //   return undefined
      // }
    }

    maxMapThickness() {
      return this.viewer.minDimension / 2;
    }

    pixelsPerBp(centerOffset = this.backbone.adjustedCenterOffset) {
      return (centerOffset * 2 * Math.PI) / this.sequence.length;
    }

    clockPositionForBp(bp, inverse = false) {
      const radians = this.scale.bp(bp);
      return CGV.clockPositionForAngle( inverse ? (radians + Math.PI) : radians );
    }

    zoomFactorForLength(bpLength) {
      // Use viewer width as estimation arc length
      const arcLength = this.viewer.width;
      const zoomedRadius = arcLength / (bpLength / this.sequence.length * Math.PI * 2);
      return zoomedRadius / this.backbone.centerOffset;
    }

    initialWorkingSpace() {
      return 0.25 * this.viewer.minDimension;
    }

    // Calculate the backbone centerOffset (radius) so that the map is centered between the
    // circle center and the edge of the canvas (minDimension)
    updateInitialBackboneCenterOffset(insideThickness, outsideThickness) {
      // midRadius is the point between the circle center and the edge of the canvas
      // on the minDimension.
      const midRadius = this.viewer.minDimension * 0.25;
      this.backbone.centerOffset = midRadius - ((outsideThickness - insideThickness) / 2);
    }

    path(layer, centerOffset, startBp, stopBp, anticlockwise = false, startType = 'moveTo') {
      // FIXME: change canvas to this where appropriate
      const canvas = this.canvas;
      const ctx = canvas.context(layer);
      const scale = this.scale;

      // Features less than 1000th the length of the sequence are drawn as straight lines
      const rangeLength = anticlockwise ? canvas.sequence.lengthOfRange(stopBp, startBp) : canvas.sequence.lengthOfRange(startBp, stopBp);
      if ( rangeLength < (canvas.sequence.length / 1000)) {
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
      } else {
        ctx.arc(scale.x(0), scale.y(0), centerOffset, scale.bp(startBp), scale.bp(stopBp), anticlockwise);
      }
    }

    //////////////////////////////////////////////////////////////////////////
    // Helper Methods
    //////////////////////////////////////////////////////////////////////////

    // Return map point (map NOT canvas coordinates) for given bp and centerOffset.
    // centerOffset is the radius for circular maps
    _mapPointForBp(bp, centerOffset = this.backbone.adjustedCenterOffset) {
      const radians = this.scale.bp(bp);
      const x = centerOffset * Math.cos(radians);
      const y = -centerOffset * Math.sin(radians);
      return {x: x, y: y};
    }

    _centerVisible() {
      const x = this.scale.x(0);
      const y = this.scale.y(0);
      return (x >= 0 &&
              x <= this.width &&
              y >= 0 &&
              y <= this.height);
    }

    /**
     * Return the distance between the circle center and the farthest corner of the canvas
     */
    _maximumVisibleRadius() {
      // Maximum distance on x axis between circle center and the canvas 0 or width
      const maxX = Math.max( Math.abs(this.scale.x.invert(0)), Math.abs(this.scale.x.invert(this.width)) );
      // Maximum distance on y axis between circle center and the canvas 0 or height
      const maxY = Math.max( Math.abs(this.scale.y.invert(0)), Math.abs(this.scale.y.invert(this.height)) );
      // Return the hypotenuse
      return Math.sqrt( (maxX * maxX) + (maxY * maxY) );
    }

    _minimumVisibleRadius() {
      if (this._centerVisible()) {
        // Center is visible so the minimum radius has to be 0
        return 0;
      } else if ( CGV.oppositeSigns(this.scale.x.invert(0), this.scale.x.invert(this.width)) ) {
        // The canvas straddles 0 on the x axis, so the minimum radius is the distance to the closest horizontal line
        return Math.min( Math.abs(this.scale.y.invert(0)), Math.abs(this.scale.y.invert(this.height)));
      } else if ( CGV.oppositeSigns(this.scale.y.invert(0), this.scale.y.invert(this.height)) ) {
        // The canvas straddles 0 on the y axis, so the minimum radius is the distance to the closest vertical line
        return Math.min( Math.abs(this.scale.x.invert(0)), Math.abs(this.scale.x.invert(this.width)));
      } else {
        // Closest corner of the canvas
        // Minimum distance on x axis between circle center and the canvas 0 or width
        const minX = Math.min( Math.abs(this.scale.x.invert(0)), Math.abs(this.scale.x.invert(this.width)) );
        // Minimum distance on y axis between circle center and the canvas 0 or height
        const minY = Math.min( Math.abs(this.scale.y.invert(0)), Math.abs(this.scale.y.invert(this.height)) );
        // Return the hypotenuse
        return Math.sqrt( (minX * minX) + (minY * minY) );
      }
    }

    _visibleRangesForRadius(radius, margin = 0) {
      const angles = CGV.circleAnglesFromIntersectingRect(radius,
        this.scale.x.invert(0 - margin),
        this.scale.y.invert(0 - margin),
        this.width + (margin * 2),
        this.height + (margin * 2)
      );
      return angles.map( a => Math.round(this.scale.bp.invert(a)) );
    }

  }

  CGV.LayoutCircular = LayoutCircular;
})(CGView);
