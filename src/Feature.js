//////////////////////////////////////////////////////////////////////////////
// Feature
//////////////////////////////////////////////////////////////////////////////

import CGObject from './CGObject';
import CGArray from './CGArray';
import CGRange from './CGRange';
import Label from './Label';
import utils from './Utils';

/**
 * A Feature is a region on the map and must have a start and stop position.
 * MORE...
 *
 * ### Action and Events
 *
 * Action                                  | Viewer Method                                  | Feature Method      | Event
 * ----------------------------------------|------------------------------------------------|---------------------|-----
 * [Add](../docs.html#adding-records)      | [addFeatures()](Viewer.html#addFeatures)       | -                   | features-add
 * [Update](../docs.html#updating-records) | [updateFeatures()](Viewer.html#updateFeatures) | [update()](#update) | features-update
 * [Remove](../docs.html#removing-records) | [removeFeatures()](Viewer.html#removeFeatures) | [remove()](#remove) | features-remove
 * [Read](../docs.html#reading-records)    | [features()](Viewer.html#features)             | -                   | -
 *
 * <a name="attributes"></a>
 * ### Attributes
 *
 * Attribute                        | Type     | Description
 * ---------------------------------|----------|------------
 * [name](#name)                    | String   | Name of feature
 * [type](#type)                    | String   | Feature type (e.g. CDS, rRNA, etc)
 * [legend](#legend)                | String\|LegendItem | Name of legendItem or the legendItem itself
 * [source](#source)                | String   | Source of the feature
 * [contig](#contig)                | String\|Contig | Name of contig or the contig itself
 * [start](#start)<sup>rc</sup>     | Number   | Start base pair on the contig
 * [stop](#stop)<sup>rc</sup>       | Number   | Stop base pair on the contig
 * [mapStart](#mapStart)            | Number   | Start base pair on the map (converted to contig position)
 * [mapStop](#mapStop)              | Number   | Stop base pair on the map (converted to contig position)
 * [strand](#strand)                | String   | Strand the features is on [Default: 1]
 * [score](#score)                  | Number   | Score associated with the feature
 * [favorite](#favorite)            | Boolean  | Feature is a favorite [Default: false]
 * [visible](CGObject.html#visible) | Boolean  | Feature is visible [Default: true]
 * [meta](CGObject.html#meta)       | Object   | [Meta data](../tutorials/details-meta-data.html) for Feature
 * 
 * <sup>rc</sup> Required on Feature creation
 *
 * Implementation notes:
 *   - The feature range is the range on the contig
 *   - Feature.mapRange is the range on the Sequence.mapContig
 *   - If there is only one contig in the map, then Feature.mapRange === Feature.range
 *   - Feature.start/stop are positions on the contig
 *   - Feature mapStart/mapStop are position on Sequence.mapContig
 *   - If no contig is provided, the default contig will be Sequence.mapContig
 *     - Whenever mapContig is updated/regenerated the feature will be moved to the new mapContig
 *     - Features on the mapContig are able to span contigs
 *     - If contigs are rearranged, a mapContig feature will stay at the same position (start/stop)
 *
 * @extends CGObject
 */
class Feature extends CGObject {

  /**
   * Create a new feature.
   * @param {Viewer} viewer - The viewer
   * @param {Object} options - [Attributes](#attributes) used to create the feature
   * @param {Object} [meta] - User-defined [Meta data](../tutorials/details-meta-data.html) to add to the feature.
   */
  constructor(viewer, data = {}, meta = {}) {
    super(viewer, data, meta);
    this.viewer = viewer;
    this.type = utils.defaultFor(data.type, '');
    this.source = utils.defaultFor(data.source, '');
    this.favorite = utils.defaultFor(data.favorite, false);
    this.contig = data.contig || viewer.sequence.mapContig;
    // this.range = new CGV.CGRange(this.viewer.sequence, Number(data.start), Number(data.stop));
    this.updateRanges(data.start, data.stop);
    this.strand = utils.defaultFor(data.strand, 1);
    this.score = utils.defaultFor(data.score, 1);
    this.codonStart = data.codonStart;
    this.geneticCode = data.geneticCode;
    this.label = new Label(this, {name: data.name} );
    this._centerOffsetAdjustment = Number(data.centerOffsetAdjustment) || 0;
    this._proportionOfThickness = Number(data.proportionOfThickness) || 1;

    this.extractedFromSequence = utils.defaultFor(data.extractedFromSequence, false);

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
      this.label = new Label(this, {name: value} );
    }
  }

  /**
   * @member {String} - Get or set the Codon start (Default: 1)
   */
  get codonStart() {
    return this._codonStart || 1;
  }

  set codonStart(value) {
    this._codonStart = value;
  }

  /**
   * @member {String} - Get or set the Genetic code used for translation. If no genetic code is set, the default for the map will be used.
   */
  get geneticCode() {
    return this._geneticCode;
  }

  set geneticCode(value) {
    this._geneticCode = value;
  }

  /**
   * @member {Boolean} - Get or set the *extractedFromSequence*. If true, this feature was
   * generated directly from the sequence and will not be saved when exported to JSON.
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
    this._score = utils.constrain(Number(value), 0, 1);
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
  get mapRange() {
    return this.range.onMap;
  }

  /**
   * @member {Number} - Get or set the start position of the feature in basepair (bp).
   *   All start and stop positions are assumed to be going in a clockwise direction.
   *   This position is relative to the contig the feature is on. If there is only one
   *   contig, this value will be the same as mapStart.
   */
  get start() {
    return this.range.start;
  }

  set start(value) {
    this.range.start = value;
  }

  /**
   * @member {Number} - Get or set the stop position of the feature in basepair (bp).
   *   All start and stop positions are assumed to be going in a clockwise direction.
   *   This position is relative to the contig the feature is on. If there is only one
   *   contig, this value will be the same as mapStop.
   */
  get stop() {
    return this.range.stop;
  }

  set stop(value) {
    this.range.stop = value;
  }

  /**
   * @member {Number} - Get or set the start position of the feature in basepair (bp).
   *   All start and stop positions are assumed to be going in a clockwise direction.
   */
  get mapStart() {
    return this.range.mapStart;
  }

  set mapStart(value) {
    this.range.mapStart = value;
  }

  /**
   * @member {Number} - Get or set the stop position of the feature in basepair (bp).
   *   All start and stop positions are assumed to be going in a clockwise direction.
   */
  get mapStop() {
    return this.range.mapStop;
  }

  set mapStop(value) {
    this.range.mapStop = value;
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
    const oldContig = this._contig;
    let newContig;
    if (value === undefined) {
      // this._contig = undefined;
      newContig = undefined;
    } else if (value && value.toString() === 'Contig') {
      // this._contig  = value;
      newContig = value;
    } else {
      const contig = this.viewer.sequence.contigs(value);
      if (contig) {
        // this._contig  = contig;
        newContig = contig;
      } else {
        console.error(`Feature '${this.name}' could not find contig '${value}'`)
      }
    }
    if (oldContig !== newContig) {
      // Add feature to new Contig
      if (newContig) {
        newContig._features.push(this);
      }
      // Remove feature from old Contig
      if (oldContig) {
        Contig.removeFeatures(this);
      }
    }
    // Must be done after calling Contig.removeFeatures()
    this._contig = newContig;
    if (oldContig) {
      // FIXME: adjust start/stop if the new contig is shorter than old contig
      // and the position needs to be constrained. Try to keep the same length.
      this.updateRanges(this.start, this.stop);
    }
  }

  update(attributes) {
    this.viewer.updateFeatures(this, attributes);
  }

  /**
   * Updates the feature range using the given *start* and *stop* positions.
   * If the feature is on a contig, the positions should be in relation to the contig.
   *
   * @param {Number} start - Start position (bp).
   * @param {Number} stop - Stop position (bp).
   */
  // updateRanges(start, stop) {
  //   start = Number(start);
  //   stop = Number(stop);
  //   const sequence = this.sequence;
  //   let globalStart = start;
  //   let globalStop = stop;
  //   if (this.contig) {
  //     // Create range as global bp position and
  //     // contigRange as given start/stop positions
  //     globalStart = sequence.bpForContig(this.contig, start);
  //     globalStop = sequence.bpForContig(this.contig, stop);
  //     this.contigRange = new CGV.CGRange(sequence, start, stop);
  //   }
  //   this.range = new CGV.CGRange(sequence, globalStart, globalStop);
  // }
  updateRanges(start, stop) {
    start = Number(start);
    stop = Number(stop);
    const contig = this.contig || this.sequence.mapContig;
    this.range = new CGRange(contig, start, stop);
  }

  draw(layer, slotCenterOffset, slotThickness, visibleRange, options = {}) {
    if (!this.visible) { return; }
    if (this.mapRange.overlapsMapRange(visibleRange)) {
      const canvas = this.canvas;
      let start = this.mapStart;
      let stop = this.mapStop;
      const containsStart = visibleRange.containsMapBp(start);
      const containsStop = visibleRange.containsMapBp(stop);
      const color = options.color || this.color;
      const showShading = options.showShading;
      if (!containsStart) {
        // start = visibleRange.start - 100;
        start = Math.max(1, visibleRange.start - 100);
      }
      if (!containsStop) {
        // stop = visibleRange.stop + 100;
        stop = Math.min(this.sequence.length, visibleRange.stop + 100);
      }

      // When zoomed in, if the feature starts in the visible range and wraps around to end
      // in the visible range, the feature should be drawn as 2 arcs.
      // const zoomedSplitFeature = containsStart && containsStop && (this.viewer.zoomFactor > 1000) && this.range.overlapsMapRange();
      const zoomedSplitFeature = containsStart && containsStop && (this.viewer.zoomFactor > 1000) && this.range.isWrapped();
      //  When the feature wraps the origin on a linear map and both the start and stop
      //  can be seen, draw as 2 elements.
      const unzoomedSplitLinearFeature = containsStart && containsStop && this.range.isWrapped() && (this.viewer.format === 'linear');

      if (zoomedSplitFeature || unzoomedSplitLinearFeature) {
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
   * in which case the feature will only be highlighted on the slot.
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
    const tracks = new CGArray();
    this.viewer.tracks().each( (i, track) => {
      if (track.type === 'feature') {
        if ( (track.dataMethod === 'source' && track.dataKeys.includes(this.source)) ||
             (track.dataMethod === 'type' && track.dataKeys.includes(this.type)) ||
             (track.dataMethod === 'sequence' && this.extractedFromSequence && track.features().includes(this)) ) {
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
    const slots = new CGArray();
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
    this.viewer.removeFeatures(this);
  }

  /**
   * Zoom and pan map to show the feature
   *
   * @param {Number} duration - Length of animation
   * @param {Object} ease - The d3 animation ease [Default: d3.easeCubic]
   */
  moveTo(duration, ease) {
    const buffer = Math.ceil(this.length * 0.05);
    const start = this.sequence.subtractBp(this.mapStart, buffer);
    const stop = this.sequence.addBp(this.mapStop, buffer);
    this.viewer.moveTo(start, stop, {duration, ease});
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
           (track.dataMethod === 'source' && track.dataKeys.includes(this.source) ) ) {
        track.refresh();
      }
    });
  }

  /**
   * Translate the sequence of this feature.
   *
   * The source of the genetic code used for translation uses the following precedence:
   * geneticCode (provided to translate method) > geneticCode (of Feature) > geneticCode (of Viewer)
   *
   * @param {Number} geneticCode - Number indicating the genetic code to use for the translation. This will override the any genetic code set for the feature or Viewer.
   * @return {String} - Amino acid sequence
   */
  translate(geneticCode) {
    const code = geneticCode || this.geneticCode || this.viewer.geneticCode;
    const table = this.viewer.codonTables.byID(code);
    return table && table.translate(this.seq, this.start_codon);
  }

  /**
   * Returns the DNA sequence for the feature.
   *
   * @return {String} - DNA sequence of feature.
   */
  get seq() {
    return this.contig.forRange(this.range, this.isReverse());
  }

  toJSON(options = {}) {
    const json = {
      name: this.name,
      type: this.type,
      start: this.start,
      stop: this.stop,
      strand: this.strand,
      source: this.source,
      legend: this.legend.name
      // score: this.score,
      // visible: this.visible,
      // favorite: this.favorite
    };
    if (this.codonStart && this.codonStart != 1) {
      json.codonStart = this.codonStart;
    }
    if (this.geneticCode && this.geneticCode != this.viewer.geneticCode) {
      json.geneticCode = this.geneticCode;
    }
    if (this.sequence.hasMultipleContigs) {
      json.contig = this.contig.name;
    }
    // Optionally add default values
    // Visible is normally true
    if (!this.visible || options.includeDefaults) {
      json.visible = this.visible;
    }
    // Score is normally undefined (which defaults to 1)
    if ((this.score !== undefined && this.score !== 1) || options.includeDefaults) {
      json.score = this.score;
    }
    // Favorite is normally false
    if (this.favorite || options.includeDefaults) {
      json.favorite = this.favorite;
    }
    // Meta Data (TODO: add an option to exclude this)
    if (Object.keys(this.meta).length > 0) {
      json.meta = this.meta;
    }
    return json;
  }

}

export default Feature;

