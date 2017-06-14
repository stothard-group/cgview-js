//////////////////////////////////////////////////////////////////////////////
// Settings
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * The CGView Settings contain general settings for the viewer.
   */
  class Settings {

    /**
     * Create a the Settings
     *
     * @param {Viewer} viewer - The viewer
     * @param {Object} options - Settings values to override the defaults
     * <br />
     *
     * Name         | Type   | Description
     * -------------|--------|------------
     * backgroundColor | Color  | Background [Color](Color.html) of viewer (Default: 'white')
     * arrowHeadLength | Number | Arrow head length as a fraction (0-1) of the slot width (Default: 0.3)
     */
    constructor(viewer, options = {}, meta = {}) {
      this.viewer = viewer;
      this._backgroundColor = new CGV.Color( CGV.defaultFor(options.backgroundColor, 'white') );
      this.arrowHeadLength = CGV.defaultFor(options.arrowHeadLength, 0.3);
    }

    /**
     * @member {Color} - Get or set the backgroundColor. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
     */
    get backgroundColor() {
      return this._backgroundColor
    }

    set backgroundColor(color) {
      if (color == undefined) {
        this._backgroundColor = new CGV.Color('white');
      } else if (color.toString() == 'Color') {
        this._backgroundColor = color;
      } else {
        this._backgroundColor = new CGV.Color(color);
      }
      this.viewer.fillBackground();
    }

    /**
     * @member {Number} - Set or get the arrow head length as a fraction of the slot width. The value must be between 0 and 1 [Default: 0.3].
     */
    set arrowHeadLength(value) {
      if (value) {
        this._arrowHeadLength = CGV.constrain(value, 0, 1);
      }
    }

    get arrowHeadLength() {
      return this._arrowHeadLength
    }

  }

  CGV.Settings = Settings;

})(CGView);


