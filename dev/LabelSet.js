//////////////////////////////////////////////////////////////////////////////
// LabelSet
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class LabelSet {

    constructor(viewer, options = {}) {
      this._viewer = viewer;
      this._canvas = viewer.canvas;
      this._labels = new CGV.CGArray();
      this.font = CGV.defaultFor(options.font, 'SansSerif, plain, 14');
      this.labelLineLength = CGV.defaultFor(options.labelLineLength, 20);
    }

    /**
     * @member {Font} - Get or set the font. When setting the font, a string representing the font or a {@link Font} object can be used. For details see {@link Font}.
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
      // Refresh labels widths
      // var labelFonts = this._labels.map( (i) => { return i.font.cssScaled(this.viewer.scaleFactor)});
      var labelFonts = this._labels.map( (i) => { return i.font});
      var labelTexts = this._labels.map( (i) => { return i.name});
      var labelWidths = CGV.Font.calculateWidths(this._canvas.ctx, labelFonts, labelTexts);
      for (var i = 0, len = this._labels.length; i < len; i++) {
        this._labels[i].width = labelWidths[i];
      }
    }

    /**
     * @member {Viewer} - Get the *Viewer*
     */
    get viewer() {
      return this._viewer
    }

    /**
     * @member {Number} - The number of labels in the set.
     */
    get length() {
      return this._labels.length
    }

    /**
     * Add a new label to the set.
     *
     * @param {Label} label - The Label to add to the set.
     */
    addLabel(label) {
      this._labels.push(label);
    }

    /**
     * Remove a label from the set.
     *
     * @param {Label} label - The Label to remove from the set.
     */
    removeLabel(label) {
      this._labels = this._labels.remove(label);
    }

    draw(reverseRadius, directRadius) {
      var canvas = this._canvas;
      var ctx = canvas.ctx;
      for (var i = 0, len = this._labels.length; i < len; i++) {
        var feature = this._labels[i].feature;
        var bp = feature.start + (feature.length / 2);
        canvas.radiantLine(bp, directRadius + 20, this.labelLineLength)
      }



    }


  }

  CGV.LabelSet = LabelSet;

})(CGView);


