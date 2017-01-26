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
      this.thickness = CGV.defaultFor(options.thickness, 5);
    }

    /**
     * @member {Viewer} - Get the viewer.
     */
    get viewer() {
      return this._viewer
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
     * @member {Number} - Set or get the backbone thickness.
     */
    set thickness(value) {
      if (value) {
        this._thickness = value;
      }
    }

    get thickness() {
      return this._thickness
    }

    draw() {
      this.viewer.canvas.drawArc(1, this.viewer.sequenceLength, CGV.pixel(this.zoomedRadius), this.color.rgbaString, CGV.pixel(this.thickness))
    }


  }

  CGV.Backbone = Backbone;

})(CGView);


