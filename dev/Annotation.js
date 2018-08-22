//////////////////////////////////////////////////////////////////////////////
// Annotation
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * <br />
   * Annotation controls the drawing and layout of features labels
   */
  class Annotation extends CGV.CGObject {

    constructor(viewer, options = {}, meta = {}) {
      super(viewer, options, meta);
      this._labels = new CGV.CGArray();
      this.font = CGV.defaultFor(options.font, 'sans-serif, plain, 12');
      this.labelLineLength = CGV.defaultFor(options.labelLineLength, 20);
      this.priorityMax = CGV.defaultFor(options.priorityMax, 50);
      this._labelLineMarginInner = CGV.pixel(10);
      this._labelLineMarginOuter = CGV.pixel(5); // NOT REALLY IMPLEMENTED YET
      this._labelLineWidth = CGV.pixel(1);
      this.refresh();
      this._visibleLabels = new CGV.CGArray();
      this.color = options.color;
      this.lineCap = 'round';
      this.onlyDrawFavorites = CGV.defaultFor(options.onlyDrawFavorites, false);
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
      if (value === undefined || value.toString() === 'Color') {
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
     * @member {Number} - Get or set the number of priority labels that will be drawn for sure.
     *    If they overlap the label will be moved until they no longer overlap.
     *    Priority is defined as features that are marked as a "favorite". After favorites,
     *    features are sorted by size. For example, if priorityMax is 50 and there are 10 "favorite"
     *    features. The favorites will be drawn and then the 40 largest features will be drawn.
     */
    get priorityMax() {
      return this._priorityMax
    }

    set priorityMax(value) {
      this._priorityMax = value;
    }

    /**
     * @member {Font} - Get or set the font. When setting the font, a string representing the font or a {@link Font} object can be used. For details see {@link Font}.
     */
    get font() {
      return this._font
    }

    set font(value) {
      if (value.toString() === 'Font') {
        this._font = value;
      } else {
        this._font = new CGV.Font(value);
      }
      this.refreshLabelWidths();
      this._font.on('change', () => { this.refreshLabelWidths() });
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

    // #<{(|*
    //  * Remove a label from the set.
    //  *
    //  * @param {Label} label - The Label to remove from the set.
    //  |)}>#
    // removeLabel(label) {
    //   this._labels = this._labels.remove(label);
    //   this.refresh();
    // }

    /**
     * Remove a label or an array of labels from the set.
     *
     * @param {Label|Array} labels - The Label(s) to remove from the set.
     */
    removeLabels(labels) {
      labels = (labels.toString() === 'CGArray') ? labels : new CGV.CGArray(labels);
      // this._labels = new CGV.CGArray(
      //   this._labels.filter( (i) => { return !labels.includes(i) })
      // );
      this._labels = this._labels.filter( i => !labels.includes(i) );
      this.refresh();
    }

    refresh() {
      this._labelsNCList = new CGV.NCList(this._labels, { circularLength: this.sequence.length });
    }

    refreshLabelWidths() {
      let labelFonts = this._labels.map( i => i.font.css );
      let labelTexts = this._labels.map( i => i.name );
      let labelWidths = CGV.Font.calculateWidths(this.canvas.context('map'), labelFonts, labelTexts);
      for (let i = 0, len = this._labels.length; i < len; i++) {
        this._labels[i].width = labelWidths[i];
      }
    }

    // Determine basepair position for each label.
    // This will just be the center of the feature,
    // unless the the whole feature is not visible.
    _calculatePositions(labels) {
      labels = labels || this._labels;
      let visibleRange = this._visibleRange;
      let label, feature, containsStart, containsStop, radians;
      let featureLengthDownStream, featureLengthUpStream;
      let sequence = this.sequence;
      let scale = this.canvas.scale;
      for (let i = 0, len = labels.length; i < len; i++) {
        label = labels[i];
        feature = label.feature;
        containsStart = visibleRange.contains(feature.start);
        containsStop = visibleRange.contains(feature.stop);
        let testType;
        if (containsStart && containsStop) {
          label.bp = label.bpDefault;
          label.lineAttachment = label.lineAttachmentDefault;
        } else {
          if (containsStart) {
            label.bp = feature.range.getStartPlus( sequence.lengthOfRange(feature.start, visibleRange.stop) / 2 );
          } else if (containsStop) {
            label.bp = feature.range.getStopPlus( -sequence.lengthOfRange(visibleRange.start, feature.stop) / 2 );
          } else {
            featureLengthDownStream = sequence.lengthOfRange(visibleRange.stop, feature.stop);
            featureLengthUpStream = sequence.lengthOfRange(feature.start, visibleRange.start);
            let halfVisibleRangeLength = visibleRange.length / 2;
            let center = visibleRange.start + halfVisibleRangeLength;
            if (featureLengthUpStream > featureLengthDownStream) {
              label.bp = center + halfVisibleRangeLength * featureLengthDownStream / (featureLengthDownStream + featureLengthUpStream);
            } else {
              label.bp = center + halfVisibleRangeLength * featureLengthUpStream / (featureLengthDownStream + featureLengthUpStream);
            }
          }
          // Calculate where the label line should attach to Label.
          // The attachemnt point should be the opposite clock position of the feature.
          // This might need to be recalculated of the label has moved alot
          radians = scale.bp(label.bp);
          label.lineAttachment = CGV.clockPositionForAngle(radians + Math.PI);
        }
      }
    }

    // Calculates non overlapping rects for priority labels
    _calculatePriorityLabelRects(labels) {
      labels = labels || this._labels;
      let canvas = this.canvas;
      let scale = canvas.scale;
      let label, bp, x, y, lineLength, overlappingRect, overlappingLabel;
      let radius = this._outerRadius + this._labelLineMarginInner;
      let placedRects = new CGV.CGArray();
      for (let i = 0, len = labels.length; i < len; i++) {
        label = labels[i];
        bp = label.bp;
        lineLength = this.labelLineLength;
        do {
          let outerPt = canvas.pointFor(bp, radius + lineLength + this._labelLineMarginOuter);
          let rectOrigin = CGV.rectOriginForAttachementPoint(outerPt, label.lineAttachment, label.width, label.height);
          label.rect = new CGV.Rect(rectOrigin.x, rectOrigin.y, label.width, label.height);
          overlappingRect = label.rect.overlap(placedRects);
          lineLength += label.height;
        } while (overlappingRect);
        placedRects.push(label.rect);
        label.attachementPt = label.rect.ptForClockPosition(label.lineAttachment);
      }
    }

    // Should be called when
    //  - Labels are added or removed
    //  - Font changes (Annotation or individual label)
    //  - Label name changes
    //  - Zoom level changes
    _calculateLabelRects(labels) {
      labels = labels || this._labels;
      let canvas = this.canvas;
      let scale = canvas.scale;
      let label, bp, x, y;
      let radius = this._outerRadius + this._labelLineMarginInner;
      for (let i = 0, len = labels.length; i < len; i++) {
        label = labels[i];
        bp = label.bp;
        // let innerPt = canvas.pointFor(bp, radius);
        let outerPt = canvas.pointFor(bp, radius + this.labelLineLength + this._labelLineMarginOuter);
        let rectOrigin = CGV.rectOriginForAttachementPoint(outerPt, label.lineAttachment, label.width, label.height);
        label.rect = new CGV.Rect(rectOrigin.x, rectOrigin.y, label.width, label.height);
        label.attachementPt = label.rect.ptForClockPosition(label.lineAttachment);
      }
    }

    visibleLabels(radius) {
      let labelArray = new CGV.CGArray();
      // let visibleRange = this._canvas.visibleRangeForRadius(radius);
      let visibleRange = this._visibleRange;
      if (visibleRange) {
        if (visibleRange.start === 1 && visibleRange.stop === this.sequence.length) {
          labelArray = this._labels;
        } else {
          labelArray = this._labelsNCList.find(visibleRange.start, visibleRange.stop);
        }
      }
      return labelArray
    }


    // Labels must already be sorted so favorite are first
    _onlyFavoriteLabels(labels) {
      labels = labels || this._labels;
      let nonFavoriteIndex = labels.findIndex( (label) => !label.feature.favorite )
      if (nonFavoriteIndex !== -1) {
        return labels.slice(0, nonFavoriteIndex);
      } else {
        return labels
      }
    }

    _sortByPriority(labels) {
      labels = labels || this._labels;
      labels.sort( (a,b) => {
        if (b.feature.favorite === a.feature.favorite) {
          return b.feature.length - a.feature.length
        } else {
          return a.feature.favorite ? -1 : 1
        }
      });
      return labels
    }

    draw(reverseRadius, directRadius) {
      if (this._labels.length !== this._labelsNCList.length) {
        this.refresh();
      }

      this._visibleRange = this.canvas.visibleRangeForRadius(directRadius);

      this._innerRadius = reverseRadius;
      this._outerRadius = directRadius;

      // Find Labels that are within the visible range and calculate bounds
      let possibleLabels = this.visibleLabels(directRadius);

      possibleLabels = this._sortByPriority(possibleLabels);
      if (this.onlyDrawFavorites) {
        possibleLabels = this._onlyFavoriteLabels(possibleLabels);
      }
      this._calculatePositions(possibleLabels);

      let priorityLabels = possibleLabels.slice(0, this.priorityMax);
      let remainingLabels = possibleLabels.slice(this.priorityMax);

      this._calculatePriorityLabelRects(priorityLabels);
      this._calculateLabelRects(remainingLabels);

      // Remove overlapping labels
      let labelRects = priorityLabels.map( (p) => {return p.rect});
      this._visibleLabels = priorityLabels;
      for (let i = 0, len = remainingLabels.length; i < len; i++) {
        let label = remainingLabels[i];
        if (!label.rect.overlap(labelRects)) {
          this._visibleLabels.push(label);
          labelRects.push(label.rect);
        }
      }

      // Draw nonoverlapping labels
      let canvas = this.canvas;
      let ctx = canvas.context('map');
      let label, rect;
      ctx.font = this.font.css; // TODO: move to loop, but only set if it changes
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      // Draw label lines first so that label text will draw over them
      for (let i = 0, len = this._visibleLabels.length; i < len; i++) {
        label = this._visibleLabels[i];
        let color = this.color || label.feature.color;

        // canvas.radiantLine('map', label.bp,
        //   directRadius + this._labelLineMarginInner,
        //   this.labelLineLength + this._labelLineMarginOuter,
          // this._labelLineWidth, color.rgbaString, this.lineCap);
        let innerPt = canvas.pointFor(label.bp, directRadius + this._labelLineMarginInner);
        let outerPt = label.attachementPt;
        ctx.beginPath();
        ctx.moveTo(innerPt.x, innerPt.y);
        ctx.lineTo(outerPt.x, outerPt.y);
        ctx.strokeStyle = color.rgbaString;
        ctx.lineCap = this.lineCap;
        ctx.lineWidth = this._labelLineWidth;
        ctx.stroke();
      }

      // Draw label text
      let backgroundColor = this.viewer.settings.backgroundColor.copy();
      backgroundColor.opacity = 0.75;
      for (let i = 0, len = this._visibleLabels.length; i < len; i++) {
        label = this._visibleLabels[i];
        let color = this.color || label.feature.color;

        ctx.fillStyle = backgroundColor.rgbaString;
        rect = label.rect;
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

        ctx.fillStyle = color.rgbaString;
        ctx.fillText(label.name, label.rect.x, label.rect.y);
      }

      if (this.viewer.debug && this.viewer.debug.data.n) {
        this.viewer.debug.data.n['labels'] = this._visibleLabels.length;
      }
    }

    toJSON() {
      return {
        font: this.font.string,
        color: this.color && this.color.rgbaString,
        visible: this.visible
      }
    }

  }

  CGV.Annotation = Annotation;

})(CGView);


