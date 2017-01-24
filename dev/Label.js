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
      if (value == undefined || value == '') {
        this.width = 0;
        // Label was in LabelSet, so remove it
        if (!(this._name == '' || this._name == undefined)) {
          this.labelSet.removeLabel(this);
        }
        this._name = '';
      } else {
        // Label was not in LabelSet, so add it
        if (this._name == '' || this._name == undefined) {
          this.labelSet.addLabel(this);
        }
        this._name = value;
        this.width = this.font.width(this.viewer.canvas.ctx, this._name);
        if (value == 'rnl') {console.log(CGV.pixel(1))}
      }
    }

    /**
     * @member {Rect} - Get or set the label bounding rect.
     */
    get rect() {
      return this._rect
    }

    set rect(value) {
      this._rect = value;
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
     * @member {Point} - Get or set the label origin. The upper-left corner of the label.
     */
    get origin() {
      return this._origin
    }

    set origin(value) {
      this._origin = value;
    }

    /**
     * @member {Number} - Get or set the label attachment point. This number represents where on the label
     *                    the label lines attaches in term of a hand on a clock. (e.g. 12 would be top middle of label)
     */
    get lineAttachment() {
      return this._lineAttachment
    }

    set lineAttachment(value) {
      this._lineAttachment = value;
    }

    /**
     * @member {Font} - Get or set the font. When setting the font, a string representing the font or a {@link Font} object can be used. For details see {@link Font}.
     */
    get font() {
      return this._font || this.labelSet.font;
    }

    set font(value) {
      if (value == undefined) {
        this._font = this.labelSet.font;
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
      return this.feature.viewer
    }

    /**
     * @member {LabelSet} - Get the *LabelSet*
     */
    get labelSet() {
      return this.viewer.labelSet
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


