//////////////////////////////////////////////////////////////////////////////
// Feature
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class Feature extends CGV.CGObject {

    /**
     * A Feature
     */
    constructor(viewer, data = {}, meta = {}) {
      super(viewer, data, meta)
      this.viewer = viewer;
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

      this.legendItem  = data.legend;
    }

    /**
     * Return the class name as a string.
     * @return {String} - 'Feature'
     */
    toString() {
      return 'Feature';
    }

    /**
     * @member {type} - Get or set the *type*
     */
    get type() {
      return this._type
    }

    set type(value) {
      this._type = value;
      this.featureType  = this.viewer.findFeatureTypeOrCreate(value, 'arc');
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
     * @member {String} - Get or set the name via the [Label](Label.html).
     */
    get name() {
      return this.label && this.label.name
    }

    set name(value) {
      if (this.label) {
        this.label.name = value;
      } else {
        this.label = new CGV.Label(this, {name: value} );
      }
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

    // /**
    //  * @member {Canvas} - Get the *Canvas*
    //  */
    // get canvas() {
    //   return this.viewer.canvas
    // }


    get strand() {
      return this._strand;
    }

    set strand(value) {
      this._strand = value;
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

    /**
     * @member {String} - Get or set the decoration. Choices are *arc* [Default], *arrow*, *score*
     */
    get decoration() {
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

    /**
     * @member {LegendItem} - Get or set the LegendItem. The LegendItem can be set with a LegendItem object
     *   or with the name of a legenedItem.
     */
    get legendItem() {
      return this._legendItem;
    }

    set legendItem(value) {
      if (this.legendItem && value == undefined) { return }
      if (value && value.toString() == 'LegendItem') {
        this._legendItem  = value
      } else {
        this._legendItem  = this.viewer.legend.findLegendItemOrCreate(value);
      }
    }

    /**
     * @member {LegendItem} - Alias for [legendItem](Feature.html#legendItem).
     */
    get legend() {
      return this.legendItem;
    }

    set legend(value) {
      this.legendItem = value;
    }


    draw(layer, slotRadius, slotThickness, visibleRange, options = {}) {
      if (!this.visible) { return }
      if (this.range.overlapsRange(visibleRange)) {
        var canvas = this.canvas;
        var start = this.start;
        var stop = this.stop;
        var containsStart = visibleRange.contains(start);
        var containsStop = visibleRange.contains(stop);
        var color = options.color || this.color;
        if (!containsStart) {
          start = visibleRange.start - 100;
        }
        if (!containsStop) {
          stop = visibleRange.stop + 100;
        }
        // When zoomed in, if the feature starts in the visible range and wraps around to end
        // in the visible range, the feature should be drawn as 2 arcs.
        if ( (this.viewer.zoomFactor > 1000) &&
             (containsStart && containsStop) &&
             (this.range.overHalfCircle()) ) {

          canvas.drawArc(layer, visibleRange.start - 100, stop,
            this.adjustedRadius(slotRadius, slotThickness),
            color.rgbaString, this.adjustedWidth(slotThickness), this.decoration);
          canvas.drawArc(layer, start, visibleRange.stop + 100,
            this.adjustedRadius(slotRadius, slotThickness),
            color.rgbaString, this.adjustedWidth(slotThickness), this.decoration);
        } else {
          canvas.drawArc(layer, start, stop,
            this.adjustedRadius(slotRadius, slotThickness),
            color.rgbaString, this.adjustedWidth(slotThickness), this.decoration);
        }
      }
    }

    /**
     * Highlights the feature on every slot it is visible. An optional slot can be provided,
     * in which case the feature will on ly be highlighted on the slot.
     * @param {Slot} slot - Only highlight the feature on this slot.
     */
    highlight(slot) {
      if (!this.visible) { return }
      this.canvas.clear('ui');
      var color = this.color.copy();
      color.highlight();
      if (slot && slot.features().contains(this)) {
        this.draw('ui', slot.radius, slot.thickness, slot.visibleRange, {color: color});
      } else {
        this.viewer.slots().each( (i, slot) => {
          if (slot.features().contains(this)) {
            this.draw('ui', slot.radius, slot.thickness, slot.visibleRange, {color: color});
          }
        });
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

    /**
     * Return an array of the tracks that contain this feature
     */
    tracks() {
      var tracks = new CGV.CGArray();
      this.viewer.tracks().each( (i, track) => {
        if (track.features().contains(this)) {
          tracks.push(track);
        }
      });
      return tracks
    }

    /**
     * Return an array of the slots that contain this feature
     */
   slots() {
      var slots = new CGV.CGArray();
      this.tracks().each( (i, track) => {
        track.slots().each( (j, slot) => {
          if (slot.features().contains(this)) {
            slots.push(slot);
          }
        });
      });
      return slots
    }

    /**
     * Remove the Feature from the viewer, tracks and slots
     */
    remove() {
      this.viewer._features = this.viewer._features.remove(this);
      this.viewer.annotation.removeLabel(this.label);
      this.tracks().each( (i, track) => {
        track.removeFeature(this);
      });

    }

    // Update tracks, slots, etc associated with feature.
    // Or add feature to tracks and refresh them, if this is a new feature.
    // Don't refresh if bulkImport is true
    //
    refresh() {
      // this.bulkImport = false;
      // Get tracks currently associated with this feature.
      // And find any new tracks that may now need to be associated with this feature
      // (e.g. if the feature source changed, it may now belong to a different track)
      this.viewer.tracks().each( (i, track) => {
        if ( track.features().contains(this) ||
             (track.contents.from == 'source' && track.contents.extract == this.source) ) {
          track.refresh();
        }
      });
    }

  }

  CGV.Feature = Feature;

})(CGView);
