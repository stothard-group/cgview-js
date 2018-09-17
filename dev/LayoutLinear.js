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

    // SEE Circular for notes
    updateScales(layoutChanged, bp) {
      if (!this.sequence) { return; }
      const canvas = this.canvas;
      const scale = this.scale;
      const zoomFactorCutoff = 1.25;
      let newDomain;

      // X/Y Scale
      if (layoutChanged) {
        // When the zoom factor is low or no bp was specified, center the map
        if (this.viewer.zoomFactor <= zoomFactorCutoff || bp === undefined) {
          bp = Math.round(this.sequence.length / 2);
        }
        const canvasHalfWidthBp = Math.round(this.sequence.length / 2 / this.viewer.zoomFactor);
        newDomain = [bp - canvasHalfWidthBp, bp + canvasHalfWidthBp];
        // Recenter the Y scale
        scale.y = undefined;
      } else {
        if (scale.x) {
          // Keep same domain. Range will change.
          newDomain = scale.x.domain();
        } else {
          // Initializing. Set domain for full sequence.
          newDomain = [1, this.sequence.length];
        }
      }

      scale.x = d3.scaleLinear()
        .range([0, canvas.width])
        .domain(newDomain);

      // Y Scale
      this._updateScaleForAxis('y', canvas.height);

      // BP Scale
      this.scale.bp = this.scale.x;
      this.viewer._updateZoomMax();
    }

    // The center of the zoom will be the supplied bp position on the backbone.
    // The default bp will be based on the center of the canvas.
    // FIXME: constrain zoomFactor
    zoom(zoomFactor, bp = this.canvas.bpForCanvasCenter()) {
      // Update the d3.zoom transform.
      // The zoom transform is set automatically when zooming via d3 (ie. in Viewer-Zoom.js).
      // However, if zoom is called from Viewer.zoomFactor the transrform won't be changed,
      // so we set it here to make sure it's updated.
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
      // console.log(this.scale.x.domain())
    }

    translate(dx, dy) {
      const domainX = this.scale.x.domain();
      const domainY = this.scale.y.domain();
      dy = CGV.pixel(d3.event.dy)
      dx = CGV.pixel(Math.round(d3.event.dx / this.backbone.pixelsPerBp()));
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

    // FIXME: this is not correct. Do not use range!
    pixelsPerBp() {
      const scaleX = this.scale.x;
      // const domain = this.scale.x.domain();
      // return CGV.pixel( (domain[1] - domain[0]) / this.sequence.length );
      const range = scaleX.range();
      // return CGV.pixel( (range[1] - range[0]) / this.sequence.length );
      // return  (range[1] - range[0]) / this.sequence.length;
      return  (range[1] - range[0]) / (scaleX.invert(range[1]) - scaleX.invert(range[0]));
    }

    // backbonePixelLength() {
    //   return this.scale.x(this.sequence.length) - this.scale.x(1);
    // }


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
      this.viewer.backbone.centerOffset = 0
    }


  }

  CGV.LayoutLinear = LayoutLinear;
})(CGView);
