//////////////////////////////////////////////////////////////////////////////
// LabelSet
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class LabelSet {

    constructor(viewer, options = {}) {
      this._viewer = viewer;
      this._canvas = viewer.canvas;
      this._labels = new CGV.CGArray();
      this.font = CGV.defaultFor(options.font, 'SansSerif, plain, 12');
      this.labelLineLength = CGV.defaultFor(options.labelLineLength, 20);
      this._labelLineMargin = CGV.pixel(10);
      this._labelLineWidth = CGV.pixel(1);
      // this._visibleLabels = new CGV.CGArray();
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
      this.refreshLabelWidths();
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
      this.sort();
    }

    /**
     * Remove a label from the set.
     *
     * @param {Label} label - The Label to remove from the set.
     */
    removeLabel(label) {
      this._labels = this._labels.remove(label);
    }

    /**
     * Sort the labels by position (middle of the feature in bp). 
     */
    sort() {
      // this._labels = this._labels.remove(label);
      this._labels.sort( (a,b) => { return a.bp > b.bp ? 1 : -1 } );
    }

    refreshLabelWidths() {
      // Refresh labels widths
      var labelFonts = this._labels.map( (i) => { return i.font.css});
      var labelTexts = this._labels.map( (i) => { return i.name});
      var labelWidths = CGV.Font.calculateWidths(this._canvas.context('map'), labelFonts, labelTexts);
      for (var i = 0, len = this._labels.length; i < len; i++) {
        this._labels[i].width = labelWidths[i];
      }
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
        // Calculate where the label line should attach to Label.
        // The attachemnt point should be the opposite clock position of the feature.
        label.lineAttachment = CGV.clockPositionForAngle(radians + Math.PI);
        var rectOrigin = CGV.rectOriginForAttachementPoint(outerPt, label.lineAttachment, label.width, label.height);
        label.rect = new CGV.Rect(rectOrigin.x, rectOrigin.y, label.width, label.height);
      }
    }

    visibleLabels(radius) {
      var labelArray = new CGV.CGArray();
      var visibleRange = this._canvas.visibleRangeForRadius(radius);
      // FIXME: probably better to store bp values in array and use that to find indices of labels to keep
      if (visibleRange) {
        if (visibleRange.start == 1 && visibleRange.stop == this.viewer.sequence.length) {
          labelArray = this._labels;
        } else {
          for (var i = 0, len = this._labels.length; i < len; i++) {
            if (visibleRange.contains(this._labels[i].bp)) {
              labelArray.push(this._labels[i]);
            }
          }
        }
      }
      return labelArray
    }

    draw(reverseRadius, directRadius) {

      // TODO: change origin when moving image
      // if (reverseRadius != this._innerRadius || directRadius != this._outerRadius) {
        this._innerRadius = reverseRadius;
        this._outerRadius = directRadius;
        this._calculateLabelRects();
      // }
      
      this._labelsToDraw = this.visibleLabels(directRadius);

      // Remove overlapping labels (TEMP)
      var labelRects = new CGV.CGArray();
      this._visibleLabels = new CGV.CGArray();
      for (var i = 0, len = this._labelsToDraw.length; i < len; i++) {
        label = this._labelsToDraw[i];
        if (!label.rect.overlap(labelRects)) {
          this._visibleLabels.push(label);
          labelRects.push(label.rect);
        }
      }

      var canvas = this._canvas;
      var ctx = canvas.context('map');
      var label, feature, bp, origin;
      ctx.font = this.font.css; // TODO: move to loop, but only set if it changes
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      for (var i = 0, len = this._visibleLabels.length; i < len; i++) {
        label = this._visibleLabels[i];
        feature = label.feature;
        // bp = feature.start + (feature.length / 2);
        canvas.radiantLine('map', label.bp, directRadius + this._labelLineMargin, this.labelLineLength, this._labelLineWidth, feature.color.rgbaString);
        // origin = canvas.pointFor(bp, directRadius + 5);
        ctx.fillStyle = feature.color.rgbaString;
        // ctx.fillText(label.name, origin.x, origin.y);
        ctx.fillText(label.name, label.rect.x, label.rect.y);
      }
      if (this.viewer.debug && this.viewer.debug.data.n) {
        this.viewer.debug.data.n['labels'] = this._visibleLabels.length;
      }
    }


  }

  CGV.LabelSet = LabelSet;

})(CGView);


