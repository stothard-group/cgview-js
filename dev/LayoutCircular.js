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

    updateCartesianScales() {
      const canvas = this.canvas;
      const scale = this.scale;
      let x1, x2, y1, y2;
      // Save scale domains to keep tract of translation
      if (scale.x) {
        const origXDomain = scale.x.domain();
        const origWidth = origXDomain[1] - origXDomain[0];
        x1 = origXDomain[0] / origWidth;
        x2 = origXDomain[1] / origWidth;
      } else {
        x1 = -0.5;
        x2 = 0.5;
      }
      if (scale.y) {
        const origYDomain = scale.y.domain();
        const origHeight = origYDomain[0] - origYDomain[1];
        y1 = origYDomain[0] / origHeight;
        y2 = origYDomain[1] / origHeight;
      } else {
        y1 = 0.5;
        y2 = -0.5;
      }
      scale.x = d3.scaleLinear()
        .domain([canvas.width * x1, canvas.width * x2])
        .range([0, canvas.width]);
      scale.y = d3.scaleLinear()
        .domain([canvas.height * y1, canvas.height * y2])
        .range([0, canvas.height]);
    }

    updateBPScale(length) {
      this.scale.bp = d3.scaleLinear()
        .domain([1, length])
        .range([-1 / 2 * Math.PI, 3 / 2 * Math.PI]);
      this.viewer._updateZoomMax();
    }


    zoomDomains() {
      const pos = d3.mouse(this.canvas.node('ui'));
      const mx = this.scale.x.invert(CGV.pixel(pos[0]));
      const my = this.scale.y.invert(CGV.pixel(pos[1]));

      const centerOffset = this.viewer.backbone.centerOffset;
      const angle = CGV.angleFromPosition(mx, my);

      const oldZoomFactor = this.viewer._zoomFactor;
      const newZoomFactor = d3.event.transform.k;

      const radiusDiff = centerOffset * (oldZoomFactor - newZoomFactor);

      const dx = CGV.pixel(Math.cos(-angle) * radiusDiff);
      const dy = CGV.pixel(Math.sin(-angle) * radiusDiff);

      const domainX = this.scale.x.domain();
      const domainY = this.scale.y.domain();

      this.scale.x.domain([domainX[0] - dx, domainX[1] - dx]);
      this.scale.y.domain([domainY[0] - dy, domainY[1] - dy]);
    }


    pointFor(bp, radius) {
      const radians = this.scale.bp(bp);
      const x = this.scale.x(0) + (radius * Math.cos(radians));
      const y = this.scale.y(0) + (radius * Math.sin(radians));
      return {x: x, y: y};
    }

    pixelsPerBp() {
      return CGV.pixel( (this.viewer.backbone.adjustedCenterOffset * 2 * Math.PI) / this.sequence.length );
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
      this.viewer.backbone.centerOffset = minInnerRadius + workingSpace - outsideThickness - (this.viewer.backbone.thickness / 2);
    }


  }

  CGV.LayoutCircular = LayoutCircular;
})(CGView);
