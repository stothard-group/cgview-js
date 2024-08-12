//////////////////////////////////////////////////////////////////////////////
// Feature
//////////////////////////////////////////////////////////////////////////////

import CGObject from './CGObject';
import CGArray from './CGArray';
import CGRange from './CGRange';
import Label from './Label';
import Contig from './Contig';
import utils from './Utils';

/**
 * A Feature is a region on the map with a start and stop position.
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
 * [tags](#tags)                    | String\|Array | A single string or an array of strings associated with the feature as tags
 * [contig](#contig)                | String\|Contig | Name of contig or the contig itself
 * [start](#start)<sup>rc</sup>     | Number   | Start base pair on the contig
 * [stop](#stop)<sup>rc</sup>       | Number   | Stop base pair on the contig
 * [locations](#locations)          | Array    | Array of locations (start, stop) on the contig (e.g. [[1, 100], [200, 300]])
 * [mapStart](#mapStart)<sup>ic</sup> | Number   | Start base pair on the map (converted to contig position)
 * [mapStop](#mapStop)<sup>ic</sup> | Number   | Stop base pair on the map (converted to contig position)
 * [strand](#strand)                | String   | Strand the features is on [Default: 1]
 * [score](#score)                  | Number   | Score associated with the feature
 * [favorite](#favorite)            | Boolean  | Feature is a favorite [Default: false]
 * [visible](CGObject.html#visible) | Boolean  | Feature is visible [Default: true]
 * [meta](CGObject.html#meta)       | Object   | [Meta data](../tutorials/details-meta-data.html) for Feature
 * [qualifiers](#qualifiers)        | Object   | Qualifiers associated with the feature (from GenBank/EMBL) [Default: {}]
 * 
 * <sup>rc</sup> Required on Feature creation
 * <sup>ic</sup> Ignored on Record creation
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
    this.tags = data.tags;
    this.favorite = utils.defaultFor(data.favorite, false);
    // this.contig = data.contig || viewer.sequence.mapContig;
    this.contig = data.contig;
    // this.range = new CGV.CGRange(this.viewer.sequence, Number(data.start), Number(data.stop));
    this.updateRanges(data.start, data.stop);
    this.strand = utils.defaultFor(data.strand, 1);
    this.score = utils.defaultFor(data.score, 1);
    this.locations = data.locations;
    this.codonStart = data.codonStart;
    this.geneticCode = data.geneticCode;
    this.label = new Label(this, {name: data.name} );
    this.qualifiers = {};
    this.qualifiers = data.qualifiers;
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
   * @member {tag} - Get or set the *tags*
   */
  get tags() {
    return this._tags;
  }

  set tags(value) {
    this._tags = (value == undefined || value === '') ? new CGArray() : new CGArray(value);
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
   * @member {qualifiers} - Get or set the *qualifiers*
   */
  get qualifiers() {
    return this._qualifiers;
  }

  set qualifiers(value) {
    if (typeof value === 'object' && value !== null) {
      this._qualifiers = value;
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
   * generated directly from the sequence and will not be saved when exporting to JSON.
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

  /**
   * @member {Number} - Get or set the locations of the feature in basepair (bp).
   *   An array of arrays where each sub-array contains the start and stop positions
   *   (e.g. [[1, 100], [200, 300]]).
   *   All start and stop positions are assumed to be going in a clockwise direction.
   *   TODO:
   *   - values should be checked:
   *     - that each array has 2 numbers
   *     - start must be less than stop (unless?)
   *     - order of locations should be checked
   *   - length can be different for locations
   *     - length could change if locations or always be the max length
   *     - could have locationsLength which is the length of the locations
   *   - extracing sequence from locations
   */
  get locations() {
    return this._locations || [[this.start, this.stop]];
  }

  set locations(value) {
    this._locations = value;
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
    if (value && (value.toString() === 'LegendItem') && value !== 'LegendItem') {
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
    if (value === undefined || value === this.sequence.mapContig) {
      // this._contig = undefined;
      newContig = this.sequence.mapContig;
      // If feature was on a contig update the positions
      if (oldContig) {
      }
    } else if (value && (value.toString() === 'Contig') && value !== 'Contig') {
      // this._contig  = value;
      newContig = value;
    } else {
      const contig = this.viewer.sequence.contigs(value);
      // const contig = this.viewer.sequence.contigs().filter( c => c.id && c.id.toLowerCase() === value.toLowerCase() )[0];
      if (contig) {
        // this._contig  = contig;
        newContig = contig;
      } else {
        console.error(`Feature '${this.name}' could not find contig '${value}'`)
        return;
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
      if (newContig.isMapContig) {
        this.updateRanges(this.mapStart, this.mapStop);
      } else {
        this.updateRanges(this.start, this.stop);
      }
    }
  }

  /**
   * Moves the feature, if it's on the mapContig, to the appropriate contig
   * based on the start position. This may truncate the feature if it does not 
   * fit completely
   * @private
   */
  moveToContig() {
    if (this.contig.isMapContig) {
      const contig = this.sequence.contigForBp(this.start);
      const start = this.start - contig.lengthOffset;
      const stop = this.stop - contig.lengthOffset;
      this.update({contig, start, stop});
    }
  }

  /**
   * Moves the feature, if it's on the mapContig, to the appropriate contig
   * based on the start position. This may truncate the feature if it does not 
   * fit completely
   * @private
   */
  moveToMapContig() {
    if (!this.contig.isMapContig) {
      this.contig = undefined;
    }
  }

  /**
   * Update feature [attributes](#attributes).
   * See [updating records](../docs.html#s.updating-records) for details.
   * @param {Object} attributes - Object describing the properties to change
   */
  update(attributes) {
    this.viewer.updateFeatures(this, attributes);
  }

  /**
   * Updates the feature range using the given *start* and *stop* positions.
   * If the feature is on a contig, the positions should be in relation to the contig.
   * @param {Number} start - Start position (bp).
   * @param {Number} stop - Stop position (bp).
   * @private
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

  // Draw the feature on the map either as a single range or as multiple locations
  // Multiple locations are drawn as separate ranges with connectors between them
  // Currently all the connectors will be drawn if the feature is visible in any slot
  // TODO: Only draw connectors if attached to a visible location
  draw(layer, slotCenterOffset, slotThickness, visibleRange, options = {}) {
    if (!this.visible) { return; }
    const canvas = this.canvas;
    if (this.locations.length > 1) {
      const connectors = [];
      // Draw each location
      // for (const location of this.locations) {
      for (let i = 0; i < this.locations.length; i++) {
        const location = this.locations[i];
        const range = new CGRange(this.contig, location[0], location[1]);
        const newOptions = {...options};
        if (this.decoration === 'arrow') {
          if (this.isDirect() && i !== this.locations.length - 1) {
            newOptions.directionalDecoration = 'arc';
          } else if (this.isReverse() && i !== 0) {
            newOptions.directionalDecoration = 'arc';
          }
        }
        this.drawRange(range, layer, slotCenterOffset, slotThickness, visibleRange, newOptions);
      }
      for (let i = 0; i < this.locations.length - 1; i++) {
        const location = this.locations[i];
        const nextLocation = this.locations[i + 1];
        if (nextLocation) {
          connectors.push([location[1]+1, nextLocation[0]-1]);
        }
      }
      // Draw connectors
      // Connector width is 5% of the feature thickness
      const connectorWidth = this.adjustedWidth(slotThickness) * 0.05;
      const color = options.color || this.color;
      const showShading = options.showShading;
      const minArcLength = this.legendItem.minArcLength;
      for (const connector of connectors) {
        canvas.drawElement(layer, connector[0], connector[1],
          this.adjustedCenterOffset(slotCenterOffset, slotThickness),
          color.rgbaString, connectorWidth, 'arc', showShading, minArcLength);
      }
    } else {
      this.drawRange(this.mapRange, layer, slotCenterOffset, slotThickness, visibleRange, options);
    }
  }

  // drawRange(layer, slotCenterOffset, slotThickness, visibleRange, options = {}) {
  drawRange(range, layer, slotCenterOffset, slotThickness, visibleRange, options = {}) {
    // if (!this.visible) { return; }
    // if (this.mapRange.overlapsMapRange(visibleRange)) {
    if (range.overlapsMapRange(visibleRange)) {
      const canvas = this.canvas;
      // let start = this.mapStart;
      // let stop = this.mapStop;
      let start = range.mapStart;
      let stop = range.mapStop;
      const containsStart = visibleRange.containsMapBp(start);
      const containsStop = visibleRange.containsMapBp(stop);
      const color = options.color || this.color;
      const directionalDecoration = options.directionalDecoration || this.directionalDecoration;
      const showShading = options.showShading;
      const minArcLength = this.legendItem.minArcLength;
      if (!containsStart) {
        // start = visibleRange.start - 100;
        start = Math.max(1, visibleRange.start - 100);
      }
      if (!containsStop) {
        // stop = visibleRange.stop + 100;
        stop = Math.min(this.sequence.length, visibleRange.stop + 100);
      }

      // When zoomed in, if the feature starts in the visible range and wraps around to end
      // in the visible range, the feature should be drawn as 2 arcs. Using overHalfMapLength() instead of isWrapped()
      // should catch features that wrap around the map but not the Origin (ie. almost fulll circle features)
      // const zoomedSplitFeature = containsStart && containsStop && (this.viewer.zoomFactor > 1000) && this.range.isWrapped();
      // const zoomedSplitFeature = containsStart && containsStop && (this.viewer.zoomFactor > 1000) && this.range.overHalfMapLength();
      const zoomedSplitFeature = containsStart && containsStop && (this.viewer.zoomFactor > 1000) && range.overHalfMapLength();
      //  When the feature wraps the origin on a linear map and both the start and stop
      //  can be seen, draw as 2 elements.
      // const unzoomedSplitLinearFeature = containsStart && containsStop && this.range.isWrapped() && (this.viewer.format === 'linear');
      const unzoomedSplitLinearFeature = containsStart && containsStop && range.isWrapped() && (this.viewer.format === 'linear');

      if (zoomedSplitFeature || unzoomedSplitLinearFeature) {
        const visibleStart = Math.max((visibleRange.start - 100), 1); // Do not draw off the edge of linear maps
        const visibleStop = Math.min((visibleRange.stop + 100), this.sequence.length); // Do not draw off the edge of linear maps
        canvas.drawElement(layer, visibleStart, stop,
          this.adjustedCenterOffset(slotCenterOffset, slotThickness),
          color.rgbaString, this.adjustedWidth(slotThickness), directionalDecoration, showShading, minArcLength);
        canvas.drawElement(layer, start, visibleStop,
          this.adjustedCenterOffset(slotCenterOffset, slotThickness),
          color.rgbaString, this.adjustedWidth(slotThickness), directionalDecoration, showShading, minArcLength);
      } else {
        canvas.drawElement(layer, start, stop,
          this.adjustedCenterOffset(slotCenterOffset, slotThickness),
          color.rgbaString, this.adjustedWidth(slotThickness), directionalDecoration, showShading, minArcLength);
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

    if (this.viewer.annotation.visible) {
      this.label._highlight();
    }

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
             (track.dataMethod === 'tag' && track.dataKeys.some( k => this.tags.includes(k))) ||
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
   * Remove the feature from the viewer, tracks and slots
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
    if (this.sequence.hasMultipleContigs && !this.contig.isMapContig) {
      // json.contig = this.contig.id;
      json.contig = this.contig.name;
    }
    // Locations
    if (this.locations.length > 1) {
      json.locations = this.locations;
    }
    // Tags
    if (this.tags !== undefined) {
      json.tags = (this.tags.length === 1) ? this.tags[0] : [...this.tags];
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
    // Qualifiers Data (TODO: maybe add an option to exclude this)
    if (Object.keys(this.qualifiers).length > 0) {
      json.qualifiers = this.qualifiers;
    }
    return json;
  }

}

export default Feature;


