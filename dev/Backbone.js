//////////////////////////////////////////////////////////////////////////////
// Backbone
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {
  /**
   * <br />
   * The CGView Backbone is the ring that separates the direct and reverse slots
   * of the map. All the slot thicknesses are measures in relation to the backbone
   * radius.
   */
  class Backbone extends CGV.CGObject {

    /**
     * Create a Backbone
     *
     * @param {Viewer} viewer - The viewer that contains the backbone
     * @param {Object} options - Options and stuff
     */
    constructor(viewer, options = {}, meta = {}) {
      super(viewer, options, meta);
      // const defaultRadius = d3.min([this.viewer.width, this.viewer.height]) * 0.4;
      // this.radius = CGV.defaultFor(options.radius, defaultRadius);
      this.color = CGV.defaultFor(options.color, 'grey');
      this.thickness = CGV.defaultFor(options.thickness, 5);
      this._bpThicknessAddition = 0;
    }

    /**
     * Return the class name as a string.
     * @return {String} - 'Backbone'
     */
    toString() {
      return 'Backbone';
    }


    get visible() {
      return this._visible;
    }

    set visible(value) {
      this._visible = value;
      this.viewer._initialized && this.refreshThickness();
      // FIXME:
      this.viewer.layout && this.viewer.layout._adjustProportions();
    }

    /**
     * @member {Color} - Get or set the backbone color. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
     */
    get color() {
      return this._color;
    }

    set color(value) {
      if (value.toString() === 'Color') {
        this._color = value;
      } else {
        this._color = new CGV.Color(value);
      }
    }

    /**
     * @member {Number} - Set or get the backbone radius. This is the unzoomed radius.
     */
    // set radius(value) {
    set centerOffset(value) {
      if (CGV.isNumeric(value)) {
        this._centerOffset = value;
        // FIXME: zoommax will be based on map thickness, insteat of bacbone radius
        this.viewer._updateZoomMax();
      }
    }

    get centerOffset() {
      return this._centerOffset;
    }

    /**
     * @member {Number} - Get the zoomed backbone radius. This is the radius * zoomFacter
     */
    get adjustedCenterOffset() {
      return this.centerOffset * this.viewer._zoomFactor;
    }

    /**
     * @member {Number} - Set or get the backbone thickness. This is the unzoomed thickness.
     */
    set thickness(value) {
      if (CGV.isNumeric(value)) {
        this._thickness = Number(value);
        // FIXME:
        this.viewer.layout && this.viewer.layout._adjustProportions();
      }
    }

    get thickness() {
      return this.visible ? this._thickness : 0;
    }

    /**
     * @member {Number} - Get the zoomed backbone thickness.
     */
    // get zoomedThickness() {
      // NOTE: Can not divide by centerOffset
    //   return (Math.min(this.adjustedCenterOffset, this.viewer.maxZoomedRadius()) * (this.thickness / this.centerOffset)) + (this.bpThicknessAddition / CGV.pixel(1));
    // }

    /**
     * @member {Number} - Get the backbone thickness adjusted for visibility, zoom level and space for the sequence.
     */
    get adjustedThickness() {
      if (!this.visible) { return 0; }
      // FIXME: need to calculate the max zoom level for changing backbone thickness
      //        - should depend on the zoomFactor to at which pont the map thickness is at the maximum?
      //        - for now set to 4
      return (Math.min(this.viewer.zoomFactor, 4) * this.thickness) + this.bpThicknessAddition;
    }

    /**
     * @member {Number} - Maximum thickness the backbone should become to allow viewing of the sequence
     */
    get maxThickness() {
      // return Math.max(this.thickness, this.sequence.thickness)
      return Math.max(this.adjustedThickness, this.sequence.thickness);
    }

    /**
     * A factor used to increase backbone thickness when approaching the ability to see BP.
     * @member {number}
     */
    get bpThicknessAddition() {
      // FIXME: see about getting rid of CGV.pixel
      return this._bpThicknessAddition / CGV.pixel(1);
    }

    /**
     * The visible range
     * @member {Range}
     */
    get visibleRange() {
      return this._visibleRange;
    }

    get pixelLength() {
      return this.layout.backbonePixelLength();
    }

    /**
     * The maximum zoom factor to get the correct spacing between basepairs.
     * @return {Number}
     */
    maxZoomFactor() {
      // return (this.sequence.length * this.sequence.bpSpacing) / (2 * Math.PI * this.radius);
      // FIXME: 
      // return (this.sequence.length * (this.sequence.bpSpacing + (this.sequence.bpMargin * 2))) / (2 * Math.PI * this.centerOffset);
      return (this.sequence.length * (this.sequence.bpSpacing + (this.sequence.bpMargin * 2))) / this.pixelLength * CGV.pixelRatio;
    }

    /**
     * The number of pixels per basepair along the backbone circumference.
     * @return {Number}
     */
    pixelsPerBp() {
      return this.layout.pixelsPerBp();
      // TODO: use pixelsPerBp from canvas/layout
      // return CGV.pixel( (this.adjustedCenterOffset * 2 * Math.PI) / this.sequence.length );
    }

    draw() {
      this._visibleRange = this.canvas.visibleRangeForCenterOffset( CGV.pixel(this.adjustedCenterOffset), 100);
      if (this.visibleRange && this.visible) {
        this.refreshThickness();
        this.viewer.canvas.drawArc('map', this.visibleRange.start, this.visibleRange.stop, CGV.pixel(this.adjustedCenterOffset), this.color.rgbaString, CGV.pixel(this.adjustedThickness));
        // console.log('map', this.visibleRange.start, this.visibleRange.stop, CGV.pixel(this.adjustedCenterOffset), this.color.rgbaString, CGV.pixel(this.zoomedThickness));
        if (this.pixelsPerBp() > 1) {
          this.sequence.draw();
        }
      }
    }

    refreshThickness() {
      const pixelsPerBp = this.pixelsPerBp();
      if (pixelsPerBp > 1 && this.visible) {
        // const zoomedThicknessWithoutAddition = Math.min(this.adjustedCenterOffset, this.viewer.maxZoomedRadius()) * (this.thickness / this.centerOffset);
        // FIXME: see adjustedThickness for note. Use 4 for now.
        const zoomedThicknessWithoutAddition = Math.min(this.viewer.zoomFactor, 4) * this.thickness;
        const addition = pixelsPerBp * 2;
        if ( (zoomedThicknessWithoutAddition + addition ) >= this.maxThickness) {
          this._bpThicknessAddition = this.maxThickness - zoomedThicknessWithoutAddition;
        } else {
          this._bpThicknessAddition = addition;
        }
      } else {
        this._bpThicknessAddition = 0;
      }
    }

    toJSON() {
      return {
        color: this.color.rgbaString,
        thickness: this._thickness,
        visible: this.visible
      };
    }

  }

  CGV.Backbone = Backbone;
})(CGView);


