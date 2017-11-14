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
      this._labelLineMargin = CGV.pixel(10);
      this._labelLineWidth = CGV.pixel(1);
      this.refresh();
      this._visibleLabels = new CGV.CGArray();
      this.color = options.color;
      this.lineCap = 'round';
      this.priorityMax = 50;
      this.maxLabelAngleDegrees = 1; // Degrees
      this.maxLabelAngleBp = this.canvas.scale.bp.invert((-90+this.maxLabelAngleDegrees) * Math.PI / 180);
      this.labelAngleBpIncrement = this.maxLabelAngleBp / 10;
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
      var label, feature, containsStart, containsStop, radians;
      var featureLengthDownStream, featureLengthUpStream;
      var sequence = this.sequence;
      var scale = this.canvas.scale;
      for (var i = 0, len = labels.length; i < len; i++) {
        label = labels[i];
        feature = label.feature;
        containsStart = visibleRange.contains(feature.start);
        containsStop = visibleRange.contains(feature.stop);
        var testType;
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
            var halfVisibleRangeLength = visibleRange.length / 2;
            var center = visibleRange.start + halfVisibleRangeLength;
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

    // Calculates non overlapping rects for the labels
    // No change in angle is done
    _calculatePriorityLabelRects_NO_ANGLES(labels) {
      labels = labels || this._labels;
      var canvas = this.canvas;
      var scale = canvas.scale;
      var label, bp, x, y, lineLength, overlappingRect, overlappingLabel;
      var radius = this._outerRadius + this._labelLineMargin;
      var placedRects = new CGV.CGArray();
      for (var i = 0, len = labels.length; i < len; i++) {
        label = labels[i];
        bp = label.bp;
        lineLength = this.labelLineLength;
        do {
          var outerPt = canvas.pointFor(bp, radius + lineLength);
          var rectOrigin = CGV.rectOriginForAttachementPoint(outerPt, label.lineAttachment, label.width, label.height);
          label.rect = new CGV.Rect(rectOrigin.x, rectOrigin.y, label.width, label.height);
          overlappingRect = label.rect.overlap(placedRects);
          lineLength += label.height;
        } while (overlappingRect);
        // TODO: try 2 label sliding window
        // Add label property to rect for getting access to while checking for overlap
        label.rect.label = label;
        placedRects.push(label.rect);
        label.attachementPt = label.rect.ptForClockPosition(label.lineAttachment);
      }
    }

    // // Calculates non overlapping rects for the labels
    // // Angle may change
    // _calculatePriorityLabelRects(labels) {
    //   labels = labels || this._labels;
    //   var canvas = this.canvas;
    //   var scale = canvas.scale;
    //   var label, bp, x, y, lineLength, overlappingRect, overlappingLabel;
    //   var radius = this._outerRadius + this._labelLineMargin;
    //   var placedRects = new CGV.CGArray();
    //   for (var i = 0, len = labels.length; i < len; i++) {
    //     label = labels[i];
    //     bp = label.bp;
    //     lineLength = this.labelLineLength;
    //     do {
    //       var outerPt = canvas.pointFor(bp, radius + lineLength);
    //       var rectOrigin = CGV.rectOriginForAttachementPoint(outerPt, label.lineAttachment, label.width, label.height);
    //       label.rect = new CGV.Rect(rectOrigin.x, rectOrigin.y, label.width, label.height);
    //       overlappingRect = label.rect.overlap(placedRects);
    //       // if (overlappingRect) {
    //       //   overlappingLabel = overlappingRect.label;
    //       //   // adjust label rect
    //       //   // NEED to account for circular
    //       //   if (Math.abs(label.bp - bp) < 5000) {
    //       //     if (overlappingLabel.bp < bp) {
    //       //       bp += 1000;
    //       //     } else {
    //       //       bp -= 1000;
    //       //     }
    //       //   }
    //       //   var outerPt = canvas.pointFor(bp, radius + lineLength);
    //       //   var rectOrigin = CGV.rectOriginForAttachementPoint(outerPt, label.lineAttachment, label.width, label.height);
    //       //   label.rect = new CGV.Rect(rectOrigin.x, rectOrigin.y, label.width, label.height);
    //       //
    //       //   overlappingRect = label.rect.overlap(placedRects);
    //       //   lineLength += label.height;
    //       //   // NEED to add max angle change
    //       // }
    //       lineLength += label.height;
    //     } while (overlappingRect);
    //     // TODO: try 2 label sliding window
    //     // Add label property to rect for getting access to while checking for overlap
    //     label.rect.label = label;
    //     placedRects.push(label.rect);
    //     label.attachementPt = label.rect.ptForClockPosition(label.lineAttachment);
    //   }
    // }

    // Calculates non overlapping rects for the labels
    // Angle may change
    _calculatePriorityLabelRects_WITH_ANGLES(labels) {
      labels = labels || this._labels;
      var canvas = this.canvas;
      var scale = canvas.scale;
      var label, bp, x, y, lineLength, overlappingRect, overlappingLabel, label1, label2;
      var radius = this._outerRadius + this._labelLineMargin;
      var placedRects = new CGV.CGArray();

      // Sort labels by feature position
      labels.sort( (a,b) => { return a.bp - b.bp} );
      // Reset label offsets
      // TODO: need to reset when a feature becomes unfavorited
      for (var i = 0, len = labels.length; i < len; i++) {
        labels[i].bpLineDiff = 0;
        labels[i].radiusLineDiff = 0;
      }

      // label = labels[0];
      // // Set up the first label so it's ready for comparison
      // var outerPt = canvas.pointFor(label.bp, radius + lineLength);
      // var rectOrigin = CGV.rectOriginForAttachementPoint(outerPt, label.lineAttachment, label.width, label.height);
      // label.rect = new CGV.Rect(rectOrigin.x, rectOrigin.y, label.width, label.height);

      // Do comparision of labels 2 at a time
      do {
        var overlapFound = false;
        for (var i = 0, len = labels.length; i < len; i++) {
          label1 = labels[i];
          label2 = (i == len - 1) ? labels[0] : labels[i+1];
          // Label 1
          var outerPt = canvas.pointFor(label1.bp + label1.bpLineDiff, radius + this.labelLineLength + label1.radiusLineDiff);
          var rectOrigin = CGV.rectOriginForAttachementPoint(outerPt, label1.lineAttachment, label1.width, label1.height);
          label1.rect = new CGV.Rect(rectOrigin.x, rectOrigin.y, label1.width, label1.height);
          // Label 2
          var outerPt = canvas.pointFor(label2.bp + label2.bpLineDiff, radius + this.labelLineLength + label2.radiusLineDiff);
          var rectOrigin = CGV.rectOriginForAttachementPoint(outerPt, label2.lineAttachment, label2.width, label2.height);
          label2.rect = new CGV.Rect(rectOrigin.x, rectOrigin.y, label2.width, label2.height);
          if (label1.rect.overlap([label2.rect])) {
            overlapFound = true;
            if (Math.abs(label2.bpLineDiff) < this.maxLabelAngleBp) {
              label2.bpLineDiff += this.labelAngleBpIncrement;
              if (Math.abs(label1.bpLineDiff) < this.maxLabelAngleBp) {
                label1.bpLineDiff -= this.labelAngleBpIncrement;
              }
            } else {
              label1.bpLineDiff = 0;
              label2.bpLineDiff = 0;
              label2.radiusLineDiff += label2.height;
            }
          }
        }
        // TODO: do we need attachemntPt still?
        // label.attachementPt = label.rect.ptForClockPosition(label.lineAttachment);
      } while (overlapFound);
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
      var label, bp, x, y;
      var radius = this._outerRadius + this._labelLineMargin;
      for (var i = 0, len = labels.length; i < len; i++) {
        label = labels[i];
        bp = label.bp;
        // var innerPt = canvas.pointFor(bp, radius);
        var outerPt = canvas.pointFor(bp, radius + this.labelLineLength);
        var rectOrigin = CGV.rectOriginForAttachementPoint(outerPt, label.lineAttachment, label.width, label.height);
        label.rect = new CGV.Rect(rectOrigin.x, rectOrigin.y, label.width, label.height);
        label.attachementPt = label.rect.ptForClockPosition(label.lineAttachment);
      }
    }

    visibleLabels(radius) {
      var labelArray = new CGV.CGArray();
      // var visibleRange = this._canvas.visibleRangeForRadius(radius);
      var visibleRange = this._visibleRange;
      if (visibleRange) {
        if (visibleRange.start == 1 && visibleRange.stop == this.sequence.length) {
          labelArray = this._labels;
        } else {
          labelArray = this._labelsNCList.find(visibleRange.start, visibleRange.stop);
        }
      }
      return labelArray
    }

    _sortByPriority(labels) {
      labels = labels || this._labels;
      labels.sort( (a,b) => {
        if (b.feature.favorite == a.feature.favorite) {
          return b.feature.length - a.feature.length
        } else {
          return a.feature.favorite ? -1 : 1
        }
      });
      return labels
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

      possibleLabels = this._sortByPriority(possibleLabels);
      this._calculatePositions(possibleLabels);

      var priorityLabels = possibleLabels.slice(0, this.priorityMax);
      var remainingLabels = possibleLabels.slice(this.priorityMax);

      // this._calculatePriorityLabelRects(priorityLabels);
      // this._calculatePriorityLabelRects_WITH_ANGLES(priorityLabels);
      this._calculatePriorityLabelRects_NO_ANGLES(priorityLabels);
      this._calculateLabelRects(remainingLabels);

      // Remove overlapping labels
      // var labelRects = new CGV.CGArray();
      var labelRects = priorityLabels.map( (p) => {return p.rect});
      this._visibleLabels = priorityLabels;
      for (var i = 0, len = remainingLabels.length; i < len; i++) {
        label = remainingLabels[i];
        if (!label.rect.overlap(labelRects)) {
          this._visibleLabels.push(label);
          labelRects.push(label.rect);
        }
      }
      // this._visibleLabels = new CGV.CGArray();
      // for (var i = 0, len = possibleLabels.length; i < len; i++) {
      //   label = possibleLabels[i];
      //   if (!label.rect.overlap(labelRects)) {
      //     this._visibleLabels.push(label);
      //     labelRects.push(label.rect);
      //   }
      // }

      // Draw nonoverlapping labels
      var canvas = this.canvas;
      var ctx = canvas.context('map');
      var label, rect;
      ctx.font = this.font.css; // TODO: move to loop, but only set if it changes
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      // Draw label lines first so that label text will draw over them
      for (var i = 0, len = this._visibleLabels.length; i < len; i++) {
        label = this._visibleLabels[i];
        var color = this.color || label.feature.color;

        var innerPt = canvas.pointFor(label.bp, directRadius + this._labelLineMargin);
        // var outerPt = canvas.pointFor(label.bp + label.bpLineDiff, directRadius + this._labelLineMargin + this.labelLineLength + label.radiusLineDiff);
        var outerPt = label.attachementPt;
        ctx.beginPath();
        ctx.moveTo(innerPt.x, innerPt.y);
        ctx.lineTo(outerPt.x, outerPt.y);
        ctx.strokeStyle = color.rgbaString;
        ctx.lineCap = this.lineCap;
        ctx.lineWidth = this._labelLineWidth;
        ctx.stroke();
      }

      // Draw label text
      var backgroundColor = this.viewer.settings.backgroundColor.copy();
      backgroundColor.opacity = 0.75;
      for (var i = 0, len = this._visibleLabels.length; i < len; i++) {
        label = this._visibleLabels[i];
        var color = this.color || label.feature.color;


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


