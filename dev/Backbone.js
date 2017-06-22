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
      var defaultRadius = d3.min([this.viewer.width, this.viewer.height]) * 0.4;
      this.radius = CGV.defaultFor(options.radius, defaultRadius);
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
        this.viewer.layout && this.viewer.layout._adjustProportions();
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
      return d3.max(this.thickness, this.sequence.thickness)
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
      // return (this.sequence.length * this.sequence.bpSpacing) / (2 * Math.PI * this.radius);
      return (this.sequence.length * (this.sequence.bpSpacing + (this.sequence.bpMargin * 2))) / (2 * Math.PI * this.radius);
    }

    /**
     * The number of pixels per basepair along the backbone circumference.
     * @return {Number}
     */
    pixelsPerBp() {
      return CGV.pixel( (this.zoomedRadius * 2 * Math.PI) / this.sequence.length );
    }

    draw() {
      this._visibleRange = this.canvas.visibleRangeForRadius( CGV.pixel(this.zoomedRadius), 100);
      if (this.visibleRange) {
        this.viewer.canvas.drawArc('map', this.visibleRange.start, this.visibleRange.stop, CGV.pixel(this.zoomedRadius), this.color.rgbaString, CGV.pixel(this.zoomedThickness));
        if (this.pixelsPerBp() > 1) {
          var zoomedThicknessWithoutAddition = Math.min(this.zoomedRadius, this.viewer.maxZoomedRadius()) * (this.thickness / this.radius);
          var zoomedThickness = this.zoomedThickness;
          var addition = this.pixelsPerBp() * 2;
          if ( (zoomedThicknessWithoutAddition + addition ) >= this.maxThickness) {
            this._bpThicknessAddition = this.maxThickness - zoomedThicknessWithoutAddition;
          } else {
            this._bpThicknessAddition = addition;
          }
          this.sequence.draw();
        } else {
          this._bpThicknessAddtion = 0
        }
      }
    }

    toJSON() {
      return {
        color: this.color.rgbaString,
        thickness: this.thickness
      }
    }

  }

  CGV.Backbone = Backbone;

})(CGView);


