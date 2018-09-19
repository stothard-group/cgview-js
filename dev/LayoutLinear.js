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

    // Returns the non-zoomed backbone length.
    // For linear this is the width of the canvas
    backbonePixelLength() {
      return this.canvas.width;
    }

    // // SEE Circular for notes
    // updateScales(layoutChanged, bp) {
    //   if (!this.sequence) { return; }
    //   const canvas = this.canvas;
    //   const scale = this.scale;
    //   const zoomFactorCutoff = 1.25;
    //   let newDomain;
    //
    //   // X/Y Scale
    //   if (layoutChanged) {
    //     // When the zoom factor is low or no bp was specified, center the map
    //     if (this.viewer.zoomFactor <= zoomFactorCutoff || bp === undefined) {
    //       bp = Math.round(this.sequence.length / 2);
    //     }
    //     const canvasHalfWidthBp = Math.round(this.sequence.length / 2 / this.viewer.zoomFactor);
    //     newDomain = [bp - canvasHalfWidthBp, bp + canvasHalfWidthBp];
    //     // Recenter the Y scale
    //     scale.y = undefined;
    //   } else {
    //     if (scale.x) {
    //       // Keep same domain. Range will change.
    //       newDomain = scale.x.domain();
    //     } else {
    //       // Initializing. Set domain for full sequence.
    //       newDomain = [1, this.sequence.length];
    //     }
    //   }
    //
    //   scale.x = d3.scaleLinear()
    //     .range([0, canvas.width])
    //     .domain(newDomain);
    //
    //   // Y Scale
    //   this._updateScaleForAxis('y', canvas.height);
    //
    //   // BP Scale
    //   this.scale.bp = this.scale.x;
    //   this.viewer._updateZoomMax();
    // }

    updateScales(layoutChanged, bp) {
      if (!this.sequence) { return; }
      const canvas = this.canvas;
      const scale = this.scale;

      // BP Scale

      // const rangeHalfWidth = Math.round(canvas.width * this.viewer.zoomFactor / 2);
      const rangeHalfWidth = canvas.width * this.viewer.zoomFactor / 2;
      scale.bp = d3.scaleLinear()
        .domain([1, this.sequence.length])
        .range([-rangeHalfWidth, rangeHalfWidth]);
        // .range([0, 2*rangeHalfWidth]);
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
          // FIXME: I HATE PIXEL RATIO
          // const dx = scale.x.invert(point.x);
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

      // Update the BP scale
      // const rangeHalfWidth = Math.round(this.canvas.width * this.viewer.zoomFactor / 2);
      const rangeHalfWidth = this.canvas.width * this.viewer.zoomFactor / 2;
      this.scale.bp.range([-rangeHalfWidth, rangeHalfWidth]);

      // Center of zoom after zooming
      // pointFor is on the backbone by default
      const {x: centerX2, y: centerY2} = this.pointFor(bp);
      // console.log(bp, centerX1, centerX2)


      // Find differerence in x/y and translate the domains
      // FIXME: I HATE PIXEL RATIO
      const dx = centerX1 - centerX2;
      const dy = centerY2 - centerY1;
      // console.log(dx, dy)
      this.translate(dx, -dy);


      // Update the BP scale
      // const rangeHalfWidth = Math.round(this.canvas.width * this.viewer.zoomFactor / 2);
      // this.scale.bp.range([-rangeHalfWidth, rangeHalfWidth]);
      // this.scale.bp.range([0, 2*rangeHalfWidth]);
      // console.log(this.scale.bp.range(), this.scale.bp.domain())

    }
    // The center of the zoom will be the supplied bp position on the backbone.
    // The default bp will be based on the center of the canvas.
    // FIXME: constrain zoomFactor
    // zoom(zoomFactor, bp = this.canvas.bpForCanvasCenter()) {
    //   // Update the d3.zoom transform.
    //   // The zoom transform is set automatically when zooming via d3 (ie. in Viewer-Zoom.js).
    //   // However, if zoom is called from Viewer.zoomFactor the transrform won't be changed,
    //   // so we set it here to make sure it's updated.
    //   d3.zoomTransform(this.canvas.node('ui')).k = zoomFactor;
    //
    //   const oldZoomFactor = this.viewer.zoomFactor;
    //   const zoomRatio = zoomFactor  / oldZoomFactor;
    //
    //   // Update zoom factor
    //   this.viewer._zoomFactor = zoomFactor;
    //
    //   // Zoom and translate the domains
    //   const domainX = this.scale.x.domain();
    //   const d0 = bp - ((bp - domainX[0]) / zoomRatio);
    //   const d1 = bp + ((domainX[1] - bp) / zoomRatio);
    //
    //   this.scale.x.domain([d0, d1]);
    // }

    translate(dx, dy) {
      const domainX = this.scale.x.domain();
      const domainY = this.scale.y.domain();
      // dx = CGV.pixel(Math.round(d3.event.dx / this.backbone.pixelsPerBp()));
      // dx = CGV.pixel(d3.event.dx / this.backbone.pixelsPerBp());
      this.scale.x.domain([domainX[0] - dx, domainX[1] - dx]);
      this.scale.y.domain([domainY[0] + dy, domainY[1] + dy]);
    }

    pointFor(bp, mapCenterOffset = this.backbone.adjustedCenterOffset) {
      // const x = this.scale.bp(bp);
      // const y = this.scale.y(mapCenterOffset);
      // return {x: x, y: y};

      // console.log(bp)
      const x = this.scale.x(this.scale.bp(bp));
      const y = this.scale.y(mapCenterOffset);
      // console.log( {x: x, y: y});
      return {x: x, y: y};

      // const pixels = this.scale.bp(bp);
      // const pixelOffset = Math.abs((1/2 * this.sequence.length * this.scale.bp(1)) - pixels);
      //
      // const x = this.scale.x(pixelOffset);
      // const y = this.scale.y(mapCenterOffset);
      // return {x: x, y: y};
    }

    // FIXME: THE POINT IS ON THE X/Y SCALE NOT THE CANVAS. SHOULD IT BE??
    bpForPoint(point) {
      // const pixels = this.scale.x.invert(point.x) + (1/2 * this.sequence.length * this.scale.bp(1));
      // return Math.round( this.scale.bp.invert(pixels));

      // return Math.round( this.scale.bp.invert( this.scale.x.invert( point.x ) ) );
      return Math.round( this.scale.bp.invert( point.x ) );

      // return Math.round( this.scale.bp.invert(point.x) );

      // return Math.round( point.x );
    }

    pixelsPerBp() {
      const scaleBp = this.scale.bp;
      const range = scaleBp.range();
      return  (range[1] - range[0]) / (scaleBp.invert(range[1]) - scaleBp.invert(range[0]));

      // return this.scale.bp(1);
    }

    clockPositionForBp(bp, inverse = false) {
      return inverse ? 6 : 12;
    }


    maxMapThickness() {
      return this.viewer.height;
    }

    // TODO if undefined, see if radius is visible
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

    path(layer, radius, startBp, stopBp, anticlockwise = false, startType = 'moveTo') {
      // FIXME: change canvas to this where appropriate
      const canvas = this.canvas;
      const ctx = canvas.context(layer);
      // const scale = this.scale;

      // ctx.moveTo(scale.bp(startBp), scale.y(radius));
      // ctx.lineTo(scale.bp(stopBp), scale.y(radius));

      const p1 = this.pointFor(startBp, radius);
      const p2 = this.pointFor(stopBp, radius);
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);

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
      this.viewer.backbone.centerOffset = 0
    }


  }

  CGV.LayoutLinear = LayoutLinear;
})(CGView);
