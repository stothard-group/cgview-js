//////////////////////////////////////////////////////////////////////////////
// Divider
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {
  /**
   * <br />
   * The CGView Divider is a line that separates tracks or slots.
   */
  class Divider extends CGV.CGObject {

    /**
     * Create a divider
     *
     * @param {Viewer} viewer - The viewer that contains the divider
     * @param {Object} options - Options and stuff
     */
    constructor(viewer, options = {}, meta = {}) {
      super(viewer, options, meta);
      this.color = CGV.defaultFor(options.color, 'grey');
      this._thickness = CGV.defaultFor(options.thickness, 1);
      this._spacing = CGV.defaultFor(options.spacing, 1);
      this.radii = new CGV.CGArray();
    }

    /**
     * Return the class name as a string.
     * @return {String} - 'Divider'
     */
    toString() {
      return 'Divider';
    }

    get visible() {
      return this._visible;
    }

    set visible(value) {
      this._visible = value;
      this.viewer.layout && this.viewer.layout._adjustProportions();
    }

    /**
     * @member {Color} - Get or set the divider color. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
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
     * @member {Number} - Set or get the divider thickness. This is the unzoomed thickness.
     */
    set thickness(value) {
      if (value !== undefined) {
        this._thickness = Math.round(value);
        this.viewer.layout._adjustProportions();
      }
    }

    get thickness() {
      // return this._thickness;
      return (this.viewer.zoomFactor < 1) ? (this._thickness * this.viewer.zoomFactor) : this._thickness;
    }

    /**
     * @member {Number} - Set or get the divider spacing.
     */
    set spacing(value) {
      if (value !== undefined) {
        this._spacing = Math.round(value);
        this.viewer.layout._adjustProportions();
      }
    }

    get spacing() {
      return this._spacing;
      // return (this.viewer.zoomFactor < 1) ? (this._spacing * this.viewer.zoomFactor) : this._spacing;
    }

    /**
     * @member {Number} - Set or get the array of divider radii.
     */
    set radii(value) {
      if (value && value.toString() === 'CGArray') {
        this._radii = value;
      }
    }

    get radii() {
      return this._radii;
    }

    /**
     * The visible range
     * @member {Range}
     */
    get visibleRange() {
      return this._visibleRange;
    }

    clearRadii() {
      this.radii = new CGV.CGArray();
    }

    addRadius(radius) {
      this._radii.push(radius);
    }

    draw() {
      if (!this.visible || this.thickness === 0) { return; }
      for (let i = 0, len = this._radii.length; i < len; i++) {
        const radius = this._radii[i];
        this._visibleRange = this.canvas.visibleRangeForRadius(radius, 100);
        if (this.visibleRange) {
          this.viewer.canvas.drawArc('map', this.visibleRange.start, this.visibleRange.stop, radius, this.color.rgbaString, CGV.pixel(this.thickness));
        }
      }
    }

    toJSON() {
      return {
        visible: this.visible,
        color: this.color.rgbaString,
        thickness: this.thickness,
        spacing: this.spacing
      };
    }

  }

  CGV.Divider = Divider;
})(CGView);


