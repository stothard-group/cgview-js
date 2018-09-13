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

    updateScales() {
      if (!this.sequence) { return; }
      const canvas = this.canvas;
      const scale = this.scale;

      // FIXME find center BP
      // const bp =  /

      scale.x = d3.scaleLinear()
        .domain([1, this.sequence.length])
        .range([0, canvas.width]);
        // .range([0, canvas.width * this.viewer.zoomFactor]);
        // .domain([canvas.width * x1, canvas.width * x2])
        // .range([0, canvas.width]);
      scale.y = d3.scaleLinear()
        .domain([canvas.height * 0.5, canvas.height * -0.5])
        .range([0, canvas.height]);

      this.scale.bp = this.scale.x;
      console.log(scale.x.domain())

    }

    // Called when width/height changes
    updateCartesianScales() {
      const canvas = this.canvas;
      const scale = this.scale;
      let x1, x2, y1, y2;

      // FIXME find center BP

      // const bp =  /

      scale.x = d3.scaleLinear()
        .domain([1, this.sequence.length])
        .range([0, canvas.width * this.viewer.zoomFactor]);
        // .domain([canvas.width * x1, canvas.width * x2])
        // .range([0, canvas.width]);
      scale.y = d3.scaleLinear()
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

    // The center of the zoom will be the supplied bp position on the backbone.
    // FIXME: constrain zoomFactor
    // FIXME: when not set bp should be center of map or 1.
    zoom(zoomFactor, bp = 1) {

      // Center of zoom before zooming
      // const centerX = this.pointFor(bp, this.backbone.adjustedCenterOffset).x;
      const centerX = this.scale.x(bp);

      // Update the d3.zoom transform.
      // Only need to do this if setting Viewer.zoomFactor. The zoom transform is set
      // automatically when zooming via d3 (ie. in Viewer-Zoom.js)
      d3.zoomTransform(this.canvas.node('ui')).k = zoomFactor;

      const oldZoomFactor = this.viewer.zoomFactor;
      const zoomRatio = zoomFactor  / oldZoomFactor;

      // Update zoom factor
      this.viewer._zoomFactor = zoomFactor;

      // Zoom and translate the domains
      const domainX = this.scale.x.domain();
      const d0 = bp - ((bp - domainX[0]) / zoomRatio);
      const d1 = bp + ((domainX[1] - bp) / zoomRatio);

      this.scale.x.domain([d0, d1]);
      console.log(this.scale.x.domain())
    }

    translate(dx, dy) {
      const domainX = this.scale.x.domain();
      const domainY = this.scale.y.domain();
      dy = CGV.pixel(d3.event.dy) / this.viewer.zoomFactor;
      dx = CGV.pixel(Math.round(d3.event.dx / this.backbone.pixelsPerBp())) / this.viewer.zoomFactor;
      this.scale.x.domain([domainX[0] - dx, domainX[1] - dx]);
      this.scale.y.domain([domainY[0] + dy, domainY[1] + dy]);
    }

    pointFor(bp, centerOffset) {
      const x = this.scale.x(bp);
      const y = this.scale.y(centerOffset);
      return {x: x, y: y};
    }

    bpForPoint(point) {
      // return Math.round( this.scale.bp.invert(point.x) );
      return Math.round( point.x );
    }

    pixelsPerBp() {
      // const domain = this.scale.x.domain();
      // return CGV.pixel( (domain[1] - domain[0]) / this.sequence.length );
      const range = this.scale.x.range();
      // return CGV.pixel( (range[1] - range[0]) / this.sequence.length );
      return  (range[1] - range[0]) / this.sequence.length;
    }

    maxMapThickness() {
      return this.viewer.height;
    }

    // TODO if undefined, see if radius is visible
    // FIXME: check if offset is visible 
    visibleRangeForCenterOffset(centerOffset, margin = 0) {
      const range = this.scale.bp.range();
      return new CGV.CGRange(this.sequence,
        Math.max(this.scale.bp.invert(range[0]), 1),
        Math.min(this.scale.bp.invert(range[1]), this.sequence.length));
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
