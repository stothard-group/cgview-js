//////////////////////////////////////////////////////////////////////////////
// Layout for Circular Maps
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {
  /**
   * <br />
   * This Layout is in control of handling and drawing the map as a circle
   */
  class LayoutCircular extends CGV.Layout {

    /**
     * Create a Layout
     */
    // constructor(viewer) {
    //   super(viewer)
    // }

    toString() {
      return 'LayoutCircular';
    }

    get type() {
      return 'circular';
    }

    backbonePixelLength() {
      return Math.PI * 2 * this.backbone.centerOffset;
    }

    // NOTES:
    //  - 3 scenarios
    //    - scales have not been initialized so simple center the map
    //    - scales already initialed and layout has not changed
    //      - keep the map centered as the scales change
    //    - layout changed
    //      - based on zoom will the whole map be in the canvas (determine from radius for the zoom)
    //        - if so: center the map
    //        - if not: center the map on the backbone at the bp that was the linear center
    updateScales(layoutChanged, bp) {
      if (!this.sequence) { return; }
      const canvas = this.canvas;
      const scale = this.scale;

      // BP Scale
      scale.bp = d3.scaleLinear()
        .domain([1, this.sequence.length])
        .range([-1 / 2 * Math.PI, 3 / 2 * Math.PI]);
      this.viewer._updateZoomMax();

      // X/Y Scales
      if (layoutChanged) {
        // Deleting the current scales will cause the map to be centered
        scale.x = undefined;
        scale.y = undefined;
        this._updateScaleForAxis('x', canvas.width);
        this._updateScaleForAxis('y', canvas.height);
        // At larger zoom levels and when a bp was given, center the map on that bp
        const zoomFactorCutoff = 1.25;
        if (this.viewer.zoomFactor > zoomFactorCutoff && bp) {
          // Get point for bp and backbone radius (NOTE: bp scale must be set first)
          const point = this.pointFor(bp);
          const dx = scale.x.invert(point.x);
          const dy = scale.y.invert(point.y);
          this.translate(-dx, dy);
        }
      } else {
        // The canvas is being resized or initialized
        this._updateScaleForAxis('x', canvas.width);
        this._updateScaleForAxis('y', canvas.height);
      }
    }


    // The center of the zoom will be the supplied bp position on the backbone.
    // The default bp will be based on the center of the canvas.
    // FIXME: constrain zoomFactor
    zoom(zoomFactor, bp = this.canvas.bpForCanvasCenter()) {
      // Center of zoom before zooming
      const {x: centerX1, y: centerY1} = this.pointFor(bp);

      // Update the d3.zoom transform.
      // Only need to do this if setting Viewer.zoomFactor. The zoom transform is set
      // automatically when zooming via d3 (ie. in Viewer-Zoom.js)
      d3.zoomTransform(this.canvas.node('ui')).k = zoomFactor;

      // Update zoom factor
      this.viewer._zoomFactor = zoomFactor;

      // Center of zoom after zooming
      // pointFor is on the backbone by default
      const {x: centerX2, y: centerY2} = this.pointFor(bp);

      // Find differerence in x/y and translate the domains
      const dx = centerX1 - centerX2;
      const dy = centerY2 - centerY1;
      this.translate(dx, -dy);
    }

    translate(dx, dy) {
      const domainX = this.scale.x.domain();
      const domainY = this.scale.y.domain();
      this.scale.x.domain([domainX[0] - dx, domainX[1] - dx]);
      this.scale.y.domain([domainY[0] + dy, domainY[1] + dy]);
    }

    // zoomDomains() {
    //   const pos = d3.mouse(this.canvas.node('ui'));
    //   const mx = this.scale.x.invert(CGV.pixel(pos[0]));
    //   const my = this.scale.y.invert(CGV.pixel(pos[1]));
    //
    //   const centerOffset = this.backbone.centerOffset;
    //   const angle = CGV.angleFromPosition(mx, my);
    //
    //   const oldZoomFactor = this.viewer._zoomFactor;
    //   const newZoomFactor = d3.event.transform.k;
    //
    //   const radiusDiff = centerOffset * (oldZoomFactor - newZoomFactor);
    //
    //   const dx = CGV.pixel(Math.cos(-angle) * radiusDiff);
    //   const dy = CGV.pixel(Math.sin(-angle) * radiusDiff);
    //
    //   const domainX = this.scale.x.domain();
    //   const domainY = this.scale.y.domain();
    //
    //   this.scale.x.domain([domainX[0] - dx, domainX[1] - dx]);
    //   this.scale.y.domain([domainY[0] - dy, domainY[1] - dy]);
    // }


    // Return point on Canvas.
    // mapCenterOffset is the radius for circular maps
    pointFor(bp, mapCenterOffset = this.backbone.adjustedCenterOffset) {
      const radians = this.scale.bp(bp);
      const x = this.scale.x(0) + (mapCenterOffset * Math.cos(radians));
      const y = this.scale.y(0) + (mapCenterOffset * Math.sin(radians));
      return {x: x, y: y};
    }

    // FIXME: THE POINT IS ON THE X/Y SCALE NOT THE CANVAS. SHOULD IT BE??
    bpForPoint(point) {
      return Math.round( this.scale.bp.invert( CGV.angleFromPosition(point.x, point.y) ) );
    }

    pixelsPerBp() {
      return (this.backbone.adjustedCenterOffset * 2 * Math.PI) / this.sequence.length;
    }

    clockPositionForBp(bp, inverse=false) {
      const radians = this.scale.bp(bp);
      return  CGV.clockPositionForAngle( inverse ? (radians + Math.PI) : radians );
    }

    maxMapThickness() {
      // FIXME: this will become 1/2 of minDimension
      return this.viewer.minDimension;
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

    // TODO if undefined, see if radius is visible
    visibleRangeForCenterOffset(radius, margin = 0) {
      const ranges = this._visibleRangesForRadius(radius, margin);
      if (ranges.length === 2) {
        // return ranges
        return new CGV.CGRange(this.sequence, ranges[0], ranges[1]);
      } else if (ranges.length > 2) {
        // return [ ranges[0], ranges[ranges.length -1] ]
        return new CGV.CGRange(this.sequence, ranges[0], ranges[ranges.length - 1]);
      } else if ( (radius - margin) > this._maximumVisibleRadius() ) {
        return undefined;
      } else if ( (radius + margin) < this._minimumVisibleRadius() ) {
        return undefined;
      } else {
        return new CGV.CGRange(this.sequence, 1, this.sequence.length);
      }
      // } else {
      //   return undefined
      // }
    }

    path(layer, radius, startBp, stopBp, anticlockwise = false, startType = 'moveTo') {
      // FIXME: change canvas to this where appropriate
      const canvas = this.canvas;
      const ctx = canvas.context(layer);
      const scale = this.scale;

      // Features less than 1000th the length of the sequence are drawn as straight lines
      const rangeLength = anticlockwise ? canvas.sequence.lengthOfRange(stopBp, startBp) : canvas.sequence.lengthOfRange(startBp, stopBp);
      if ( rangeLength < (canvas.sequence.length / 1000)) {
        const p2 = this.pointFor(stopBp, radius);
        if (startType === 'lineTo') {
          const p1 = this.pointFor(startBp, radius);
          ctx.lineTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
        } else if (startType === 'moveTo') {
          const p1 = this.pointFor(startBp, radius);
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
        } else if (startType === 'noMoveTo') {
          ctx.lineTo(p2.x, p2.y);
        }
      } else {
        ctx.arc(scale.x(0), scale.y(0), radius, scale.bp(startBp), scale.bp(stopBp), anticlockwise);
      }
    }

    // TEMP
    updateBackboneOffset(workingSpace, outsideThickness) {
      const minInnerProportion = 0.15
      const minInnerRadius = minInnerProportion * this.viewer.minDimension;
      this.backbone.centerOffset = minInnerRadius + workingSpace - outsideThickness - (this.backbone.thickness / 2);
    }


  }

  CGV.LayoutCircular = LayoutCircular;
})(CGView);
