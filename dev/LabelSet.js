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
      this._labelLineMargin = CGV.pixel(10);
      this._labelLineWidth = CGV.pixel(1);
    }

    /**
     * @member {Number} - Get or set the label line length.
     */
    get labelLineLength() {
      return this._labelLineLength
    }

    set labelLineLength(value) {
      this._labelLineLength = CGV.pixel(value);
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
      var labelFonts = this._labels.map( (i) => { return i.font.css});
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


    // Should be called when
    //  - Labels are added or removed
    //  - Font changes (LabelSet or individual label)
    //  - Label name changes
    //  - Zoom level changes
    _calculateLabelRects() {
      var canvas = this._canvas;
      var scale = canvas.scale;
      var label, feature, radians, bp, x, y;
      var radius = this._outerRadius + this._labelLineMargin;
      for (var i = 0, len = this._labels.length; i < len; i++) {
        label = this._labels[i];
        feature = label.feature;
        bp = feature.start + (feature.length / 2);
        radians = scale.bp(bp);
        var innerPt = canvas.pointFor(bp, radius);
        var outerPt = canvas.pointFor(bp, radius + this.labelLineLength);
        // Calculation where lael line should attach to Label.
        // First determine clock position of Label, then find opposite position for attachment.
        var clockPostion = Math.round( (radians + Math.PI/2) * (6/Math.PI) );
        if (clockPostion <= 6) {
          label.lineAttachment = clockPostion + 6;
        } else {
          label.lineAttachment = clockPostion - 6;
        }
        switch (label.lineAttachment) {
          case 10:
          case 9:
          case 8:
            x = outerPt.x;
            break;
          case 11:
          case 7:
            x = outerPt.x - (label.width / 4);
            break;
          case 0:
          case 12:
          case 6:
            x = outerPt.x - (label.width / 2);
            break;
          case 1:
          case 5:
            x = outerPt.x - (label.width * 3 / 4);
            break;
          case 2:
          case 3:
          case 4:
            x = outerPt.x - label.width;
        }

        switch (label.lineAttachment) {
          case 0:
          case 10:
          case 11:
          case 12:
          case 1:
          case 2:
            y = outerPt.y;
            break;
          case 9:
          case 3:
            y = outerPt.y - (label.height / 2);
            break;
          case 4:
          case 5:
          case 6:
          case 7:
          case 8:
            y = outerPt.y - label.height;
        }



        label.rect = new CGV.Rect(x, y, label.width, label.height);
      }
      
    }

    draw(reverseRadius, directRadius) {
      // TODO: change origin when moving image
      // if (reverseRadius != this._innerRadius || directRadius != this._outerRadius) {
        this._innerRadius = reverseRadius;
        this._outerRadius = directRadius;
        this._calculateLabelRects();
      // }
      var canvas = this._canvas;
      var ctx = canvas.ctx;
      var label, feature, bp, origin;
      ctx.font = this.font.css; // TODO: move to loop, but only set if it changes
      ctx.textAlign = 'left';
      for (var i = 0, len = this._labels.length; i < len; i++) {
        label = this._labels[i];
        feature = label.feature;
        bp = feature.start + (feature.length / 2);
        canvas.radiantLine(bp, directRadius + this._labelLineMargin, this.labelLineLength, this._labelLineWidth, feature.color.rgbaString);
        // origin = canvas.pointFor(bp, directRadius + 5);
        ctx.fillStyle = feature.color.rgbaString;
        // ctx.fillText(label.name, origin.x, origin.y);
        ctx.fillText(label.name, label.rect.x, label.rect.y);
      }



    }


  }

  CGV.LabelSet = LabelSet;

})(CGView);


