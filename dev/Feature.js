//////////////////////////////////////////////////////////////////////////////
// Feature
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {
  class Feature extends CGV.CGObject {

    /**
     * A Feature
     */
    constructor(viewer, data = {}, meta = {}) {
      super(viewer, data, meta);
      this.viewer = viewer;
      this.type = CGV.defaultFor(data.type, '');
      this.source = CGV.defaultFor(data.source, '');
      // this.range = new CGV.CGRange(this.viewer.sequence, Number(data.start), Number(data.stop));
      this.contig = data.contig;
      this.updateRanges(data.start, data.stop);
      this.strand = CGV.defaultFor(data.strand, 1);
      this.score = CGV.defaultFor(data.score, 1);
      this.label = new CGV.Label(this, {name: data.name} );
      this._centerOffsetAdjustment = Number(data.centerOffsetAdjustment) || 0;
      this._proportionOfThickness = Number(data.proportionOfThickness) || 1;


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
      return this._type;
    }

    set type(value) {
      this._type = value;
    }

    /**
     * @member {String} - Get or set the name via the [Label](Label.html).
     */
    get name() {
      return this.label && this.label.name;
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
      return this._extractedFromSequence;
    }

    set extractedFromSequence(value) {
      this._extractedFromSequence = value;
    }

    /**
     * @member {Viewer} - Get the *Viewer*
     */
    get viewer() {
      return this._viewer;
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

    set strand(value) {
      if (value === '-' || Number(value) === -1) {
        this._strand = -1;
      } else {
        this._strand = 1;
      }
    }

    /**
     * @member {Number} - Get the *Score*
     */
    get score() {
      return this._score;
    }

    set score(value) {
      if (Number.isNaN(Number(value))) { return; }
      this._score = CGV.constrain(Number(value), 0, 1);
    }

    isDirect() {
      return this.strand === 1;
    }

    isReverse() {
      return this.strand === -1;
    }

    /**
     * @member {Range} - Get or set the range of the feature. All ranges
     *   are assumed to be going in a clockwise direction.
     */
    get range() {
      return this._range;
    }

    set range(value) {
      this._range = value;
    }

    /**
     * @member {Range} - Get or set the range of the feature with respect to its contig.
     *   All ranges are assumed to be going in a clockwise direction.
     */
    get contigRange() {
      return this._contigRange;
    }

    set contigRange(value) {
      this._contigRange = value;
    }

    /**
     * @member {Number} - Get or set the start position of the feature in basepair (bp).
     *   All start and stop positions are assumed to be going in a clockwise direction.
     */
    get start() {
      return this.range.start;
    }

    set start(value) {
      // FIXME: check if on a contig. If so update contigRange as well.
      this.range.start = value;
    }

    /**
     * @member {Number} - Get or set the stop position of the feature in basepair (bp).
     *   All start and stop positions are assumed to be going in a clockwise direction.
     */
    get stop() {
      return this.range.stop;
    }

    set stop(value) {
      // FIXME: check if on a contig. If so update contigRange as well.
      this.range.stop = value;
    }

    get length() {
      return this.range.length;
    }

    /**
     * @member {String} - Get or set the feature label.
     */
    get label() {
      return this._label;
    }

    set label(value) {
      this._label = value;
    }

    /**
     * @member {String} - Get or set the feature as a favorite.
     */
    get favorite() {
      return Boolean(this._favorite);
    }

    set favorite(value) {
      this._favorite = value;
    }

    /**
     * @member {String} - Get or set the color. TODO: reference COLOR class
     */
    get color() {
      // return (this.legendItem) ? this.legendItem.swatchColor : this._color;
      return this.legendItem.swatchColor;
    }

    /**
     * @member {String} - Get the decoration.
     */
    get decoration() {
      // return (this.legendItem && this.legendItem.decoration || 'arc')
      return (this.legendItem.decoration || 'arc');
    }

    get directionalDecoration() {
      if (this.decoration === 'arrow') {
        return this.strand === 1 ? 'clockwise-arrow' : 'counterclockwise-arrow';
      } else if (this.decoration === 'score') {
        return 'arc';
      } else {
        return this.decoration;
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
      if (this.legendItem && value === undefined) { return; }
      if (value && value.toString() === 'LegendItem') {
        this._legendItem  = value;
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

    /**
     * @member {Contig} - Get or set the Contig. The Contig can be set with a Contig object
     *   or with the name of a Contig.
     */
    get contig() {
      return this._contig;
    }

    set contig(value) {
      if (value === undefined) {
        this._contig = undefined;
        return;
      }
      if (value && value.toString() === 'Contig') {
        this._contig  = value;
      } else {
        const contig = this.viewer.sequence.contigs(value);
        if (contig) {
          this._contig  = contig;
        } else {
          console.error(`Feature '${this.name}' could not find contig '${value}'`)
        }
      }
    }

    /**
     * Updates the feature range using the given *start* and *stop* positions.
     * If the feature is on a contig, the positions should be in relation to the contig.
     *
     * @param {Number} start - Start position (bp).
     * @param {Number} stop - Stop position (bp).
     */
    updateRanges(start, stop) {
      start = Number(start);
      stop = Number(stop);
      const sequence = this.sequence;
      let globalStart = start;
      let globalStop = stop;
      if (this.contig) {
        // Create range as global bp position and
        // contigRange as given start/stop positions
        globalStart = sequence.bpForContig(this.contig, start);
        globalStop = sequence.bpForContig(this.contig, stop);
        this.contigRange = new CGV.CGRange(sequence, start, stop);
      }
      this.range = new CGV.CGRange(sequence, globalStart, globalStop);
    }

    draw(layer, slotCenterOffset, slotThickness, visibleRange, options = {}) {
      if (!this.visible) { return; }
      if (this.range.overlapsRange(visibleRange)) {
        const canvas = this.canvas;
        let start = this.start;
        let stop = this.stop;
        const containsStart = visibleRange.contains(start);
        const containsStop = visibleRange.contains(stop);
        const color = options.color || this.color;
        const showShading = options.showShading;
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
          canvas.drawElement(layer, visibleRange.start - 100, stop,
            this.adjustedCenterOffset(slotCenterOffset, slotThickness),
            color.rgbaString, this.adjustedWidth(slotThickness), this.directionalDecoration, showShading);
          canvas.drawElement(layer, start, visibleRange.stop + 100,
            this.adjustedCenterOffset(slotCenterOffset, slotThickness),
            color.rgbaString, this.adjustedWidth(slotThickness), this.directionalDecoration, showShading);
        } else {
          canvas.drawElement(layer, start, stop,
            this.adjustedCenterOffset(slotCenterOffset, slotThickness),
            color.rgbaString, this.adjustedWidth(slotThickness), this.directionalDecoration, showShading);
        }
      }
    }

    /**
     * Highlights the feature on every slot it is visible. An optional slot can be provided,
     * in which case the feature will on ly be highlighted on the slot.
     * @param {Slot} slot - Only highlight the feature on this slot.
     */
    highlight(slot) {
      if (!this.visible) { return; }
      this.canvas.clear('ui');
      const color = this.color.copy();
      color.highlight();
      if (slot && slot.features().includes(this)) {
        this.draw('ui', slot.centerOffset, slot.thickness, slot.visibleRange, {color: color});
      } else {
        this.viewer.slots().each( (i, slot) => {
          if (slot.features().includes(this)) {
            this.draw('ui', slot.centerOffset, slot.thickness, slot.visibleRange, {color: color});
          }
        });
      }
    }

    // TODO: Not using _centerOffsetAdjustment yet
    // centerOffset by default would be the center of the slot as provided unless:
    // - _centerOffsetAdjustment is not 0
    // - _proportionOfThickness is not 1
    // - legend decoration is score
    adjustedCenterOffset(centerOffset, slotThickness) {
      if (this.legendItem.decoration === 'score') {
        // FIXME: does not take into account proportionOfThickness and centerOffsetAdjustment for now
        return centerOffset - (slotThickness / 2) + (this.score * slotThickness / 2);
      } else {
        if (this._centerOffsetAdjustment === 0 && this._proportionOfThickness === 1) {
          return centerOffset;
        } else if (this._centerOffsetAdjustment === 0) {
          return centerOffset - (slotThickness / 2) + (this._proportionOfThickness * slotThickness / 2);
        } else {
          return centerOffset;
        }
      }
    }

    adjustedWidth(width) {
      if (this.legendItem.decoration === 'score') {
        return this.score * width;
      } else {
        return this._proportionOfThickness * width;
      }
    }

    /**
     * Return an array of the tracks that contain this feature
     * FIXME: this will not return the tracks for features on tracks with 'from' = 'sequence'
     *        - is this a problem??
     */
    tracks(term) {
      const tracks = new CGV.CGArray();
      this.viewer.tracks().each( (i, track) => {
        if (track.type === 'feature') {
          if ( (track.contents.from === 'source' && track.contents.extract.includes(this.source)) ||
               (track.contents.from === 'type' && track.contents.extract.includes(this.type)) ||
               (track.contents.from === 'sequence' && this.extractedFromSequence && track.features().includes(this)) ) {
            tracks.push(track);
          }
        }
      });
      return tracks.get(term);
    }

    /**
     * Return an array of the slots that contain this feature
     */
    slots(term) {
      const slots = new CGV.CGArray();
      this.tracks().each( (i, track) => {
        track.slots().each( (j, slot) => {
          if (slot.features().includes(this)) {
            slots.push(slot);
          }
        });
      });
      return slots.get(term);
    }

    /**
     * Remove the Feature from the viewer, tracks and slots
     */
    remove() {
      this.viewer._features = this.viewer._features.remove(this);
      this.viewer.annotation.removeLabels(this.label);
      this.tracks().each( (i, track) => {
        track.removeFeatures(this);
      });
    }

    /**
     * Zoom and pan map to show the feature
     *
     * @param {Number} duration - Length of animation
     * @param {Object} ease - The d3 animation ease [Default: d3.easeCubic]
     */
    moveTo(duration, ease) {
      const buffer = Math.ceil(this.length * 0.05);
      const start = this.sequence.subtractBp(this.start, buffer);
      const stop = this.sequence.addBp(this.stop, buffer);
      this.viewer.moveTo(start, stop, duration, ease);
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
        if ( track.features().includes(this) ||
             (track.contents.from === 'source' && track.contents.extract === this.source) ) {
          track.refresh();
        }
      });
    }

    toJSON() {
      return {
        name: this.name,
        type: this.type,
        start: this.start,
        stop: this.stop,
        strand: this.strand,
        source: this.source,
        legend: this.legend.name,
        score: this.score,
        visible: this.visible
      };
    }

  }

  CGV.Feature = Feature;
})(CGView);
