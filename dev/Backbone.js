//////////////////////////////////////////////////////////////////////////////
// Backbone
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * The CGView Backbone is the ring that separates the direct and reverse slots
   * of the map. All the slot thicknesses are measures in relation to the backbone
   * radius.
   */
  class Backbone {

    /**
     * Create a Backbone
     *
     * @param {Viewer} viewer - The viewer that contains the backbone
     * @param {Object} options - Options and stuff
     */
    constructor(viewer, options = {}) {
      this._viewer = viewer;
      var defaultRadius = d3.min([this.viewer.width, this.viewer.height]) * 0.4;
      this.radius = CGV.defaultFor(options.radius, defaultRadius);
      this.color = CGV.defaultFor(options.color, 'black');
      this.font = CGV.defaultFor(options.font, 'sans-serif, plain, 14');
      this.fontColor = CGV.defaultFor(options.fontColor, 'black');
      this.thickness = CGV.defaultFor(options.thickness, 5);
      this._bpThicknessAddition = 0;
      this.bpMargin = 4;
    }

    /**
     * @member {Viewer} - Get the viewer.
     */
    get viewer() {
      return this._viewer
    }

    /**
     * @member {Canvas} - Get the canvas.
     */
    get canvas() {
      return this.viewer.canvas
    }

    /**
     * @member {Sequence} - Get the sequence.
     */
    get canvas() {
      return this.viewer.sequence
    }

    /**
     * @member {Color} - Get or set the backbone color. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
     */
    get color() {
      return this._color
    }

    set color(value) {
      if (value.toString() == 'Color') {
        this._color = value;
      } else {
        this._color = new CGV.Color(value);
      }
    }

    /**
     * @member {Color} - Get or set the sequence color. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
     */
    get fontColor() {
      return this._fontColor
    }

    set fontColor(value) {
      if (value.toString() == 'Color') {
        this._fontColor = value;
      } else {
        this._fontColor = new CGV.Color(value);
      }
    }

    /**
     * @member {Font} - Get or set sequence font. When setting the font, a string representing the font or a {@link Font} object can be used. For details see {@link Font}.
     */
    get font() {
      return this._font
    }

    set font(value) {
      if (value.toString() == 'Font') {
        this._font = value;
      } else {
        this._font = new CGV.Font(value);
      }
      this.bpSpacing = this.font.size;
    }

    /**
     * @member {Number} - Set or get the backbone radius. This is the unzoomed radius.
     */
    set radius(value) {
      if (value) {
        this._radius = value;
        this.viewer._updateZoomMax();
      }
    }

    get radius() {
      return this._radius
    }

    /**
     * @member {Number} - Get the zoomed backbone radius. This is the radius * zoomFacter
     */
    get zoomedRadius() {
      return this.radius * this.viewer._zoomFactor
    }

    /**
     * @member {Number} - Set or get the backbone thickness. This is the unzoomed thickness.
     */
    set thickness(value) {
      if (value) {
        this._thickness = value;
      }
    }

    get thickness() {
      return this._thickness
    }

    /**
     * @member {Number} - Get the zoomed backbone thickness.
     */
    get zoomedThickness() {
      return Math.min(this.zoomedRadius, this.viewer.maxZoomedRadius()) * (this.thickness / this.radius) + (this.bpThicknessAddition / CGV.pixel(1));
    }

    /**
     * @member {Number} - Maximum thickness the backbone should become to allow viewing of the sequence
     */
    get maxThickness() {
      return this.bpSpacing * 2 + (this.bpMargin * 4);
    }

    /**
     * @member {Number} - Get or set the basepair spacing.
     */
    get bpSpacing() {
      return this._bpSpacing
    }

    set bpSpacing(value) {
      this._bpSpacing = value;
      this.viewer._updateZoomMax();
    }

    /**
     * @member {Number} - Get or set the margin around sequence letters.
     */
    get bpMargin() {
      return this._bpMargin
    }

    set bpMargin(value) {
      // this._bpMargin = CGV.pixel(value);
      this._bpMargin = value;
    }

    /**
     * A factor used to increase backbone thickness when approaching the ability to see BP.
     * @member {number}
     */
    get bpThicknessAddition() {
      return this._bpThicknessAddition
    }

    /**
     * The visible range
     * @member {Range}
     */
    get visibleRange() {
      return this._visibleRange
    }

    /**
     * The maximum zoom factor to get the correct spacing between basepairs.
     * @return {Number}
     */
    maxZoomFactor() {
      return (this.viewer.sequenceLength * this.bpSpacing) / (2 * Math.PI * this.radius);
    }

    /**
     * The number of pixels per basepair along the backbone circumference.
     * @return {Number}
     */
    pixelsPerBp() {
      return CGV.pixel( (this.zoomedRadius * 2 * Math.PI) / this.viewer.sequenceLength );
    }

    // TODO: Move to new Sequence Class and ACTUALLY get sequence
    // FAKE method to get sequence
    _sequenceForRange(range) {
      // var length = this.viewer.lengthOfRange(start, stop);
      var seq = [];
      var bp = range.start;
      for (var i = 0, len = range.length; i < len; i++) {
        switch (bp % 4) {
          case 0:
            seq[i] = 'A';
            break;
          case 1:
            seq[i] = 'T';
            break;
          case 2:
            seq[i] = 'G';
            break;
          case 3:
            seq[i] = 'C';
        }
        bp++;
      }
      return seq
    }

    _drawSequence() {
      var ctx = this.canvas.ctx;
      var scale = this.canvas.scale;
      var radius = CGV.pixel(this.zoomedRadius);
      var range = this.visibleRange
      if (range) {
        var seq = this._sequenceForRange(range);
        var bp = range.start;
        ctx.save();
        ctx.fillStyle = this.fontColor.rgbaString;
        ctx.font = this.font.css;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var radiusDiff = this.bpSpacing / 2 + this.bpMargin;
        for (var i = 0, len = range.length; i < len; i++) {
          var origin = this.canvas.pointFor(bp, radius + radiusDiff);
          ctx.fillText(seq[i], origin.x, origin.y);
          var origin = this.canvas.pointFor(bp, radius - radiusDiff);
          ctx.fillText(seq[i], origin.x, origin.y);
          bp++;
        }
        ctx.restore();
      }

    }

    // _drawSequenceDots() {
    //   var ctx = this.canvas.ctx;
    //   var scale = this.canvas.scale;
    //   var radius = CGV.pixel(this.zoomedRadius);
    //   var range = this.visibleRange
    //   if (range) {
    //     var bp = range.start;
    //     ctx.save();
    //     ctx.fillStyle = this.fontColor.rgbaString;
    //     var radiusDiff = this.bpSpacing / 2 + this.bpMargin;
    //     for (var i = 0, len = range.length; i < len; i++) {
    //       var origin = this.canvas.pointFor(bp, radius + radiusDiff);
    //       ctx.beginPath();
    //       ctx.arc(origin.x, origin.y, 3, 0, Math.PI * 2);
    //       ctx.fill();
    //       ctx.beginPath();
    //       var origin = this.canvas.pointFor(bp, radius - radiusDiff);
    //       ctx.arc(origin.x, origin.y, 3, 0, Math.PI * 2);
    //       ctx.fill();
    //       bp++;
    //     }
    //     ctx.restore();
    //   }
    // }

    draw() {
      this._visibleRange = this.canvas.visibleRangeForRadius( CGV.pixel(this.zoomedRadius), 100);
      if (this.visibleRange) {
        this.viewer.canvas.drawArc(this.visibleRange.start, this.visibleRange.stop, CGV.pixel(this.zoomedRadius), this.color.rgbaString, CGV.pixel(this.zoomedThickness));
        if (this.pixelsPerBp() > 1) {
          var zoomedThicknessWithoutAddition = Math.min(this.zoomedRadius, this.viewer.maxZoomedRadius()) * (this.thickness / this.radius);
          var zoomedThickness = this.zoomedThickness;
          var addition = this.pixelsPerBp() * 2;
          if ( (zoomedThicknessWithoutAddition + addition ) >= this.maxThickness) {
            this._bpThicknessAddition = this.maxThickness - zoomedThicknessWithoutAddition;
          } else {
            this._bpThicknessAddition = addition;
          }
          if (this.pixelsPerBp() >= (this.bpSpacing - this.bpMargin)) {
            this._drawSequence();
          // } else if (this.pixelsPerBp() > 4) {
          //   this._drawSequenceDots();
          }
        } else {
          this._bpThicknessAddtion = 0
        }
      }
    }


  }

  CGV.Backbone = Backbone;

})(CGView);


