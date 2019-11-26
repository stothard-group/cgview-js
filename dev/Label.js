//////////////////////////////////////////////////////////////////////////////
// Label
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {
  class Label {

    constructor(feature, options = {}) {
      this._feature = feature;
      this.name = options.name;
      this.bp = this.feature.mapStart + (this.feature.length / 2);
      this.bpDefault = this.bp;

      // this.lineAttachmentDefault = this.viewer.layout.clockPositionForBp(this.bp);
    }

    /**
     * @member {String} - Get or set the label name.
     */
    get name() {
      return this._name;
    }

    set name(value) {
      if (value === undefined || value === '') {
        this.width = 0;
        // Label was in Annotation, so remove it
        if (!(this._name === '' || this._name === undefined)) {
          this.annotation.removeLabels(this);
        }
        this._name = '';
      } else {
        // Label was not in Annotation, so add it
        if (this._name === '' || this._name === undefined) {
          this.annotation.addLabel(this);
        }
        this._name = value;
        this.width = this.font.width(this.viewer.canvas.context('map'), this._name);
      }
    }

    /**
     * @member {Rect} - Get or set the label bounding rect.
     */
    get rect() {
      return this._rect;
    }

    set rect(value) {
      this._rect = value;
    }

    /**
     * @member {Number} - Get or set the label width.
     */
    get width() {
      return this._width;
    }

    set width(value) {
      this._width = value;
    }


    /**
     * @member {Number} - Get the label height which is based on the font size.
     */
    get height() {
      return this.font.height;
    }

    /**
     * @member {Point} - Get or set the label origin. The upper-left corner of the label rect.
     */
    // get origin() {
    //   return this._origin
    // }
    //
    // set origin(value) {
    //   this._origin = value;
    // }

    /**
     * @member {Number} - Get the default attachment point
     */
    get lineAttachmentDefault() {
      // FIXME: This may be slow. Consider calculating when ever the scales change???
      return this.viewer.layout.clockPositionForBp(this.bp, true);
    }

    /**
     * @member {Number} - Get or set the label attachment point. This number represents where on the label
     *                    the label lines attaches in term of a hand on a clock. (e.g. 12 would be top middle of label)
     */
    get lineAttachment() {
      return this._lineAttachment || this.lineAttachmentDefault;
    }

    set lineAttachment(value) {
      this._lineAttachment = value;
    }

    /**
     * @member {Font} - Get or set the font. When setting the font, a string representing the font or a {@link Font} object can be used. For details see {@link Font}.
     */
    get font() {
      return this._font || this.annotation.font;
    }

    set font(value) {
      if (value === undefined) {
        this._font = this.annotation.font;
      } else if (value.toString() === 'Font') {
        this._font = value;
      } else {
        this._font = new CGV.Font(value);
      }
    }

    /**
     * @member {Viewer} - Get the *Viewer*
     */
    get viewer() {
      return this.feature.viewer;
    }

    /**
     * @member {Annotation} - Get the *Annotation*
     */
    get annotation() {
      return this.viewer.annotation;
    }

    /**
     * @member {Feature} - Get the Feature
     */
    get feature() {
      return this._feature;
    }

    /**
     * @member {Number} - Get the start position of the feature
     */
    get start() {
      return this.feature.start;
    }

    /**
     * @member {Number} - Get the stop position of the feature
     */
    get stop() {
      return this.feature.stop;
    }


  }

  CGV.Label = Label;
})(CGView);


