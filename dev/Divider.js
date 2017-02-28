//////////////////////////////////////////////////////////////////////////////
// Divider
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * The CGView Divider is a line that separates tracks or slots.
   */
  class Divider {

    /**
     * Create a divider
     *
     * @param {Viewer} viewer - The viewer that contains the divider
     * @param {Object} options - Options and stuff
     */
    constructor(viewer, options = {}) {
      this._viewer = viewer;
      this.color = CGV.defaultFor(options.color, 'grey');
      this.thickness = CGV.defaultFor(options.thickness, 1);
      this.visible = CGV.defaultFor(options.visible, true);
      this.radii = new CGV.CGArray();
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
    get sequence() {
      return this.viewer.sequence
    }

    /**
     * @member {Color} - Get or set the divider color. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
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
     * @member {Number} - Set or get the divider thickness. This is the unzoomed thickness.
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
     * @member {Number} - Set or get the array of divider radii.
     */
    set radii(value) {
      if (value && value.toString() == 'CGArray') {
        this._radii = value;
      }
    }

    get radii() {
      return this._radii
    }

    /**
     * The visible range
     * @member {Range}
     */
    get visibleRange() {
      return this._visibleRange
    }

    clearRadii() {
      this.radii = new CGV.CGArray();
    }

    addRadius(radius) {
      this._radii.push(radius)
    }

    // draw(radius) {
    //   this._visibleRange = this.canvas.visibleRangeForRadius( radius, 100);
    //   if (this.visibleRange) {
    //     this.viewer.canvas.drawArc(this.visibleRange.start, this.visibleRange.stop, radius, this.color.rgbaString, CGV.pixel(this.thickness));
    //   }
    // }

    draw() {
      for (var i = 0, len = this._radii.length; i < len; i++) {
        var radius = this._radii[i]
        this._visibleRange = this.canvas.visibleRangeForRadius(radius, 100);
        if (this.visibleRange) {
          this.viewer.canvas.drawArc('map', this.visibleRange.start, this.visibleRange.stop, radius, this.color.rgbaString, CGV.pixel(this.thickness));
        }
      }
    }


  }

  CGV.Divider = Divider;

})(CGView);


