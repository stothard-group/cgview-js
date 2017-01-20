//////////////////////////////////////////////////////////////////////////////
// Label
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class Label {

    constructor(feature, options = {}) {
      this._feature = feature;
      this.name = options.name;
    }

    /**
     * @member {String} - Get or set the label name.
     */
    get name() {
      return this._name
    }

    set name(value) {
      this._name = value;
      this.width = this.font.width(this.viewer.canvas.ctx, this._name);
    }

    /**
     * @member {Number} - Get or set the label width.
     */
    get width() {
      return this._width
    }

    set width(value) {
      this._width = value;
    }


    /**
     * @member {Number} - Get the label height which is based on the font size.
     */
    get height() {
      return this.font.size
    }

    /**
     * @member {Font} - Get or set the font. When setting the font, a string representing the font or a {@link Font} object can be used. For details see {@link Font}.
     */
    get font() {
      return this._font || this.viewer.labelSet.font;
    }

    set font(value) {
      if (value == undefined) {
        this._font = this.feature.viewer.labelSet.font;
      } else if (value.toString() == 'Font') {
        this._font = value;
      } else {
        this._font = new CGV.Font(value);
      }
    }

    /**
     * @member {Viewer} - Get the *Viewer*
     */
    get viewer() {
      return this._feature.viewer
    }

    /**
     * @member {Feature} - Get the Feature
     */
    get feature() {
      return this._feature
    }


  }

  CGV.Label = Label;

})(CGView);


