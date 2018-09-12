//////////////////////////////////////////////////////////////////////////////
// Layout for Linear Maps
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {
  /**
   * <br />
   * This Layout is in control of handling and drawing the map as a line
   */
  class LayoutLinear extends CGV.Layout {

    /**
     * Create a Layout
     */
    // constructor(viewer) {
    //   super(viewer)
    // }

    toString() {
      return 'LayoutLinear';
    }

    get type() {
      return 'linear';
    }

    // Called when width/height changes
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
        // x1 = -0.5;
        // x2 = 0.5;
        x1 = 0;
        x2 = 1;
      }
      // if (scale.y) {
      //   const origYDomain = scale.y.domain();
      //   const origHeight = origYDomain[0] - origYDomain[1];
      //   y1 = origYDomain[0] / origHeight;
      //   y2 = origYDomain[1] / origHeight;
      // } else {
      //   y1 = 0.5;
      //   y2 = -0.5;
      // }
      scale.x = d3.scaleLinear()
        .domain([canvas.width * x1, canvas.width * x2])
        .range([0, canvas.width]);
      scale.y = d3.scaleLinear()
        // .domain([canvas.height * y1, canvas.height * y2])
        .domain([canvas.height * 0.5, canvas.height * -0.5])
        .range([0, canvas.height]);
      console.log(scale.x.domain())
    }

    updateBPScale(length) {
      // FIXME
      this.scale.bp = d3.scaleLinear()
        .domain([1, length])
        .range(this.scale.x.domain());
      // this.scale.x = this.scale.bp;
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
      // this.scale.y.domain([domainY[0] - dy, domainY[1] - dy]);
    }

    pointFor(bp, centerOffset) {
      // const radians = this.scale.bp(bp);
      // const x = this.scale.x(0) + (radius * Math.cos(radians));
      // const y = this.scale.y(0) + (radius * Math.sin(radians));
      const x = this.scale.x(bp);
      const y = this.scale.y(centerOffset);
      return {x: x, y: y};
    }

    pixelsPerBp() {
      const domain = this.scale.x.domain();
      return CGV.pixel( (domain[1] - domain[0]) / this.sequence.length );
    }

    maxMapThickness() {
      return this.viewer.height;
    }

    // TODO if undefined, see if radius is visible
    // FIXME: check if offset is visible 
    visibleRangeForCenterOffset(centerOffset, margin = 0) {
      const domain = this.scale.bp.domain();
      return new CGV.CGRange(this.sequence, domain[0], domain[1]);
    }

    path(layer, radius, startBp, stopBp, anticlockwise = false, startType = 'moveTo') {
      // FIXME: change canvas to this where appropriate
      const canvas = this.canvas;
      const ctx = canvas.context(layer);
      const scale = this.scale;

      ctx.moveTo(scale.x(startBp), scale.y(radius));
      ctx.lineTo(scale.x(stopBp), scale.y(radius));

      // Features less than 1000th the length of the sequence are drawn as straight lines
      // const rangeLength = anticlockwise ? canvas.sequence.lengthOfRange(stopBp, startBp) : canvas.sequence.lengthOfRange(startBp, stopBp);
      // if ( rangeLength < (canvas.sequence.length / 1000)) {
      //   const p2 = this.pointFor(stopBp, radius);
      //   if (startType === 'lineTo') {
      //     const p1 = this.pointFor(startBp, radius);
      //     ctx.lineTo(p1.x, p1.y);
      //     ctx.lineTo(p2.x, p2.y);
      //   } else if (startType === 'moveTo') {
      //     const p1 = this.pointFor(startBp, radius);
      //     ctx.moveTo(p1.x, p1.y);
      //     ctx.lineTo(p2.x, p2.y);
      //   } else if (startType === 'noMoveTo') {
      //     ctx.lineTo(p2.x, p2.y);
      //   }
      // } else {
      //   ctx.arc(scale.x(0), scale.y(0), radius, scale.bp(startBp), scale.bp(stopBp), anticlockwise);
      // }
    }

    // TEMP
    updateBackboneOffset(workingSpace, outsideThickness) {
      // const minInnerProportion = 0.15
      // const minInnerRadius = minInnerProportion * this.viewer.minDimension;
      // this.viewer.backbone.centerOffset = minInnerRadius + workingSpace - outsideThickness - (this.viewer.backbone.thickness / 2);
      // FIXME: this will be set to center of map thickness
      this.viewer.backbone.centerOffset = 1
    }


  }

  CGV.LayoutLinear = LayoutLinear;
})(CGView);
