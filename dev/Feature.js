//////////////////////////////////////////////////////////////////////////////
// Feature
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class Feature {

    /**
     * A Feature
     */
    constructor(viewer, data = {}, display = {}, meta = {}) {
      this.viewer = viewer;
      // this._color = new CGV.Color(data.color);
      this.type = CGV.defaultFor(data.type, '');
      this.source = CGV.defaultFor(data.source, '');
      this.range = new CGV.CGRange(this.viewer.sequence, Number(data.start), Number(data.stop));
      this._strand = CGV.defaultFor(data.strand, 1);
      this.label = new CGV.Label(this, {name: data.label} );
      this._radiusAdjustment = Number(data.radiusAdjustment) || 0;
      this._proportionOfThickness = Number(data.proportionOfThickness) || 1;
      // Decoration: arc, clockwise-arrow, counterclockwise-arrow
      // this._decoration = CGV.defaultFor(data.decoration, 'arc');

      this.extractedFromSequence = CGV.defaultFor(data.extractedFromSequence, false);

      if (data.legend) {
        this.legendItem  = viewer.legend.findLegendItemByName(data.legend);
      }
      if (!this.legendItem) {
        this._color = new CGV.Color('black');
      }
    }

    /**
     * @member {type} - Get or set the *type*
     */
    get type() {
      return this._type
    }

    set type(value) {
      this._type = value;
      this.featureType  = this.viewer.featureTypes().find( (i) => { return i.name == value });
    }

    /**
     * @member {featureType} - Get or set the *featureType*
     */
    get featureType() {
      return this._featureType
    }

    set featureType(value) {
      this._featureType = value;
    }

    /**
     * @member {Boolean} - Get or set the *extractedFromSequence*. These features are
     * generated directly from the sequence and do not have to be saved when exported JSON.
     */
    get extractedFromSequence() {
      return this._extractedFromSequence
    }

    set extractedFromSequence(value) {
      this._extractedFromSequence = value;
    }

    // /**
    //  * @member {Slot} - Get or set the *Slot*
    //  */
    // get slot() {
    //   return this._slot
    // }
    //
    // set slot(slot) {
    //   if (this.slot) {
    //     // TODO: Remove if already attached to Slot
    //   }
    //   this._slot = slot;
    //   slot._features.push(this);
    // }

    // /**
    //  * @member {Track} - Get or set the *Track*
    //  */
    // get track() {
    //   return this._track
    // }
    //
    // set track(track) {
    //   if (this.track) {
    //     // TODO: Remove if already attached to Track
    //   }
    //   this._track = track;
    //   track._features.push(this);
    // }

    /**
     * @member {Viewer} - Get the *Viewer*
     */
    get viewer() {
      return this._viewer
    }

    set viewer(viewer) {
      if (this.viewer) {
        // TODO: Remove if already attached to Viewer
      }
      this._viewer = viewer;
      viewer._features.push(this);
    }

    get strand() {
      return this._strand;
    }

    isDirect() {
      // return this.strand == 'direct'
      return this.strand == 1
    }

    isReverse() {
      // return this.strand == 'reverse'
      return this.strand == -1
    }

    /**
     * @member {Range} - Get or set the range of the feature. All ranges
     *   are assumed to be going in a clockwise direction.
     */
    get range() {
      return this._range
    }

    set range(value) {
      this._range = value;
    }
    /**
     * @member {Number} - Get or set the start position of the feature in basepair (bp).
     *   All start and stop positions are assumed to be going in a clockwise direction.
     */
    get start() {
      // return this._start
      return this.range.start
    }

    set start(value) {
      // this._start = value;
      this.range.start = value;
    }

    /**
     * @member {Number} - Get or set the stop position of the feature in basepair (bp).
     *   All start and stop positions are assumed to be going in a clockwise direction.
     */
    get stop() {
      // return this._stop
      return this.range.stop
    }

    set stop(value) {
      // this._stop = value
      this.range.stop = value;
    }

    get length() {
      return this.range.length
    }

    /**
     * @member {String} - Get or set the feature label.
     */
    get label() {
      return this._label
    }

    set label(value) {
      this._label = value;
    }

    /**
     * @member {String} - Get or set the color. TODO: reference COLOR class
     */
    get color() {
      return (this.legendItem) ? this.legendItem.swatchColor : this._color;
    }

    // FIXME: should you be able to change feature color directly??
    // set color(color) {
    //   if (color.toString() == 'Color') {
    //     this._color = color;
    //   } else {
    //     if (this._color && this._color.toString() == 'Color') {
    //       this._color.setColor(color);
    //     } else {
    //       this._color = new CGV.Color(color);
    //     }
    //   }
    // }

    /**
     * @member {String} - Get or set the decoration. Choices are *arc* [Default], *arrow*, *score*
     */
    get decoration() {
      // return (this.featureType) ? this.featureType.decoration : 'arc';
      if (this.featureType) {
        if (this.featureType.decoration == 'arrow') {
          return this.strand == 1 ? 'clockwise-arrow' : 'counterclockwise-arrow'
        } else {
          return this.featureType.decoration
        }
      } else {
        return 'arc'
      }
    }

    // set decoration(value) {
    //   this._decoration = value;
    // }

    /**
     * @member {LegendItem} - Get or set the LegendItem. If a LegendItem is associated with this feature,
     *   the LegendItem swatch Color and Opacity will be used for drawing this feature. The swatch settings will
     *   override the color and opacity set for this feature.
     */
    get legendItem() {
      return this._legendItem;
    }

    set legendItem(value) {
      this._legendItem = value;
    }



    draw(canvas, slotRadius, slotThickness, visibleRange) {
      if (this.range.overlapsRange(visibleRange)) {
        var start = this.start;
        var stop = this.stop;
        var containsStart = visibleRange.contains(start);
        var containsStop = visibleRange.contains(stop);
        if (!containsStart) {
          start = visibleRange.start - 100;
        }
        if (!containsStop) {
          stop = visibleRange.stop + 100;
        }
        // When zoomed in, if the feature starts in the visible range and wraps around to end
        // in the visible range, the feature should be draw as 2 arcs.
        if ( (this.viewer.zoomFactor > canvas.drawArcsCutoff) &&
             (containsStart && containsStop) &&
             (this.range.overHalfCircle()) ) {

          canvas.drawArc('map', visibleRange.start - 100, stop,
            this.adjustedRadius(slotRadius, slotThickness),
            this.color.rgbaString, this.adjustedWidth(slotThickness), this.decoration);
          canvas.drawArc('map', start, visibleRange.stop + 100,
            this.adjustedRadius(slotRadius, slotThickness),
            this.color.rgbaString, this.adjustedWidth(slotThickness), this.decoration);
        } else {
          canvas.drawArc('map', start, stop,
            this.adjustedRadius(slotRadius, slotThickness),
            this.color.rgbaString, this.adjustedWidth(slotThickness), this.decoration);
        }
      }
    }

    // radius by default would be the center of the slot as provided unless:
    // - _radiusAdjustment is not 0
    // - _proportionOfThickness is not 1
    adjustedRadius(radius, slotThickness) {
      if (this._radiusAdjustment == 0 && this._proportionOfThickness == 1) {
        return radius
      } else if (this._radiusAdjustment == 0) {
        return radius - (slotThickness / 2) + (this._proportionOfThickness * slotThickness / 2)
      } else {
        // TODO:
        return radius
      }
    }

    adjustedWidth(width) {
      return this._proportionOfThickness * width;
    }

  }

  CGV.Feature = Feature;

})(CGView);
