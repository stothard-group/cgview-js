//////////////////////////////////////////////////////////////////////////////
// Annotation
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * Annotation controls the drawing and layout of features labels
   */
  class Annotation extends CGV.CGObject {

    constructor(viewer, options = {}, meta = {}) {
      super(viewer, options, meta);
      this._labels = new CGV.CGArray();
      this.font = CGV.defaultFor(options.font, 'SansSerif, plain, 12');
      this.labelLineLength = CGV.defaultFor(options.labelLineLength, 20);
      this._labelLineMargin = CGV.pixel(10);
      this._labelLineWidth = CGV.pixel(1);
      this.refresh();
      this._visibleLabels = new CGV.CGArray();
      this.color = options.color;
    }

    /**
     * Return the class name as a string.
     * @return {String} - 'Annotation'
     */
    toString() {
      return 'Annotation';
    }

    /**
     * @member {Color} - Get or set the label color. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
     */
    get color() {
      return this._color
    }

    set color(value) {
      if (value === undefined || value.toString() == 'Color') {
        this._color = value;
      } else {
        this._color = new CGV.Color(value);
      }
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
     * @member {Number} - The number of labels in the set.
     */
    get length() {
      return this._labels.length
    }

    /**
     * Returns an [CGArray](CGArray.js.html) of Labels or a single Label.
     * @param {Integer|String|Array} term - See [CGArray.get](CGArray.js.html#get) for details.
     * @return {CGArray}
     */
    labels(term) {
      return this._labels.get(term)
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
      this.refresh();
    }

    refresh() {
      this._labelsNCList = new CGV.NCList(this._labels, { circularLength: this.sequence.length });
    }

    refreshLabelWidths() {
      var labelFonts = this._labels.map( (i) => { return i.font.css});
      var labelTexts = this._labels.map( (i) => { return i.name});
      var labelWidths = CGV.Font.calculateWidths(this.canvas.context('map'), labelFonts, labelTexts);
      for (var i = 0, len = this._labels.length; i < len; i++) {
        this._labels[i].width = labelWidths[i];
      }
    }

    _calculatePositions(labels) {
      labels = labels || this._labels;
      var visibleRange = this._visibleRange;
      var label, feature, containsStart, containsStop;
      var featureLengthDownStream, featureLengthUpStream;
      var sequence = this.sequence;
      for (var i = 0, len = labels.length; i < len; i++) {
        label = labels[i];
        feature = label.feature;
        containsStart = visibleRange.contains(feature.start);
        containsStop = visibleRange.contains(feature.stop);
        if (containsStart && containsStop) {
          label.bp = feature.start + (feature.length / 2);
        } else if (containsStart) {
          label.bp = feature.range.getStartPlus( sequence.lengthOfRange(feature.start, visibleRange.stop) / 2 );
        } else if (containsStop) {
          label.bp = feature.range.getStopPlus( -sequence.lengthOfRange(visibleRange.start, feature.stop) / 2 );
        } else {
          featureLengthDownStream = sequence.lengthOfRange(visibleRange.stop, feature.stop);
          featureLengthUpStream = sequence.lengthOfRange(feature.start, visibleRange.start);
          label.bp = (featureLengthDownStream / (featureLengthDownStream + featureLengthUpStream) * visibleRange.length) + visibleRange.start;
        }

      }
    }

    // Should be called when
    //  - Labels are added or removed
    //  - Font changes (Annotation or individual label)
    //  - Label name changes
    //  - Zoom level changes
    _calculateLabelRects(labels) {
      labels = labels || this._labels;
      var canvas = this.canvas;
      var scale = canvas.scale;
      var label, feature, radians, bp, x, y;
      var radius = this._outerRadius + this._labelLineMargin;
      for (var i = 0, len = labels.length; i < len; i++) {
        label = labels[i];
        feature = label.feature;
        // bp = feature.start + (feature.length / 2);
        bp = label.bp;
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
      // var visibleRange = this._canvas.visibleRangeForRadius(radius);
      var visibleRange = this._visibleRange;
      // FIXME: probably better to store bp values in array and use that to find indices of labels to keep
      if (visibleRange) {
        if (visibleRange.start == 1 && visibleRange.stop == this.sequence.length) {
          labelArray = this._labels;
        } else {
          labelArray = this._labelsNCList.find(visibleRange.start, visibleRange.stop);
        }
      }
      return labelArray
    }

    draw(reverseRadius, directRadius) {
      if (this._labels.length != this._labelsNCList.length) {
        this.refresh();
      }

      this._visibleRange = this.canvas.visibleRangeForRadius(directRadius);

      this._innerRadius = reverseRadius;
      this._outerRadius = directRadius;

      // Find Labels that are within the visible range and calculate bounds
      var possibleLabels = this.visibleLabels(directRadius);
      this._calculatePositions(possibleLabels);
      this._calculateLabelRects(possibleLabels);

      // Remove overlapping labels
      var labelRects = new CGV.CGArray();
      this._visibleLabels = new CGV.CGArray();
      for (var i = 0, len = possibleLabels.length; i < len; i++) {
        label = possibleLabels[i];
        if (!label.rect.overlap(labelRects)) {
          this._visibleLabels.push(label);
          labelRects.push(label.rect);
        }
      }

      // Draw nonoverlapping labels
      var canvas = this.canvas;
      var ctx = canvas.context('map');
      var label, feature, bp, origin;
      ctx.font = this.font.css; // TODO: move to loop, but only set if it changes
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      for (var i = 0, len = this._visibleLabels.length; i < len; i++) {
        label = this._visibleLabels[i];
        feature = label.feature;
        var color = this.color || feature.color;
        canvas.radiantLine('map', label.bp, directRadius + this._labelLineMargin, this.labelLineLength, this._labelLineWidth, color.rgbaString);
        ctx.fillStyle = color.rgbaString;
        ctx.fillText(label.name, label.rect.x, label.rect.y);
      }

      if (this.viewer.debug && this.viewer.debug.data.n) {
        this.viewer.debug.data.n['labels'] = this._visibleLabels.length;
      }
    }


  }

  CGV.Annotation = Annotation;

})(CGView);


