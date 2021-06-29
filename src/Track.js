//////////////////////////////////////////////////////////////////////////////
// Track
//////////////////////////////////////////////////////////////////////////////

import CGObject from './CGObject';
import CGArray from './CGArray';
import Slot from './Slot';
import utils from './Utils';

// TODO: - Instead of check for features or plot. There could be a data attribute which
//         will point to features or a plot.

/**
 * The Track is used for layout information...
 *
 * ### Action and Events
 *
 * Action                                    | Viewer Method                              | Track Method        | Event
 * ------------------------------------------|--------------------------------------------|---------------------|-----
 * [Add](../docs.html#adding-tracks)         | [addTracks()](Viewer.html#addTracks)       | -                   | tracks-add
 * [Update](../docs.html#updating-tracks)    | [updateTracks()](Viewer.html#updateTracks) | [update()](#update) | tracks-update
 * [Remove](../docs.html#removing-tracks)    | [removeTracks()](Viewer.html#removeTracks) | [remove()](#remove) | tracks-remove
 * [Reorder](../docs.html#reordering-tracks) | [moveTrack()](Viewer.html#moveTrack)       | [move()](#move)     | tracks-reorder
 * [Read](../docs.html#reading-tracks)       | [tracks()](Viewer.html#tracks)             | -                   | -
 *
 * <a name="attributes"></a>
 * ### Attributes
 *
 * Attribute                         | Type      | Description
 * ----------------------------------|-----------|------------
 * [name](#name)                     | String    | Name of track [Default: "Unknown"]
 * [dataType](#dataType)             | String    | Type of data shown by the track: plot, feature [Default: feature]
 * [dataMethod](#dataMethod)         | String    | Methods used to extract/connect to features or a plot: sequence, source, type [Default: source]
 * [dataKeys](#dataKeys)             | String    | Values used by dataMethod to extract features or a plot.
 * [position](#position)             | String    | Position relative to backbone: inside, outside, or both [Default: both]
 * [separateFeaturesBy](#separateFeaturesBy) | String    | How features should be separated: none, strand, or readingFrame [Default: strand]
 * [thicknessRatio](#thicknessRatio) | Number    | Thickness of track compared to other tracks [Default: 1]
 * [loadProgress](#loadProgress)     | Number    | Number between 0 and 100 indicating progress of track loading. Used interanlly by workers.
 * [favorite](#favorite)             | Boolean   | Track is a favorite [Default: false]
 * [visible](CGObject.html#visible)  | Boolean   | Track is visible [Default: true]
 * [meta](CGObject.html#meta)        | Object    | [Meta data](../tutorials/details-meta-data.html) for Track
 *
 * ### Examples
 *
 * @extends CGObject
 */
class Track extends CGObject {

  /**
   * Create a new track.
   * @param {Viewer} viewer - The viewer
   * @param {Object} options - [Attributes](#attributes) used to create the track.
   * @param {Object} [meta] - User-defined [Meta data](../tutorials/details-meta-data.html) to add to the track.
   */
  constructor(viewer, data = {}, meta = {}) {
    super(viewer, data, meta);
    this.viewer = viewer;
    this._plot;
    this._features = new CGArray();
    this._slots = new CGArray();
    this.name = utils.defaultFor(data.name, 'Unknown');
    this.separateFeaturesBy = utils.defaultFor(data.separateFeaturesBy, 'strand');
    this.position = utils.defaultFor(data.position, 'both');
    this.dataType = utils.defaultFor(data.dataType, 'feature');
    this.dataMethod = utils.defaultFor(data.dataMethod, 'source');
    this.dataKeys = data.dataKeys;
    this.dataOptions = data.dataOptions || {};
    this._thicknessRatio = utils.defaultFor(data.thicknessRatio, 1);
    this._loadProgress = 0;
    this.refresh();
  }

  /**
   * Return the class name as a string.
   * @return {String} - 'Track'
   */
  toString() {
    return 'Track';
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
    viewer._tracks.push(this);
  }


  set visible(value) {
    // super.visible = value;
    this._visible = value;
    if (this.layout) {
      this.layout._adjustProportions();
    }
  }

  get visible() {
    // return super.visible
    return this._visible;
  }

  /**
   * @member {String} - Alias for getting the name. Useful for querying CGArrays.
   */
  get id() {
    return this.name;
  }

  /**
   * @member {String} - Get or set the *name*.
   */
  get name() {
    return this._name;
  }

  set name(value) {
    this._name = value;
  }

  /** * @member {Viewer} - Get the *Layout*
   */
  get layout() {
    return this.viewer.layout;
  }

  /**
   * @member {String} - Get or set the *dataType*. Must be one of 'feature' or 'plot' [Default: 'feature']
   */
  get dataType() {
    return this._dataType;
  }

  set dataType(value) {
    if ( utils.validate(value, ['feature', 'plot']) ) {
      this._dataType = value;
    }
  }

  /** * @member {String} - Alias for *dataType*.
   */
  get type() {
    return this.dataType;
    // return this.contents.type;
  }

  /**
   * @member {String} - Get or set the *dataMethod* attribute. *dataMethod* describes how the features/plot should be extracted.
   *    Options are 'source', 'type', or 'sequence' [Default: 'source']
   */
  get dataMethod() {
    return this._dataMethod;
  }

  set dataMethod(value) {
    if ( utils.validate(value, ['source', 'type', 'sequence']) ) {
      this._dataMethod = value;
    }
  }

  /**
   * @member {String} - Get or set the *dataKeys* attribute. *dataKeys* describes which features/plot should be extracted. For example,
   *    if *dataMethod* is 'type', and *dataKeys* is 'CDS', then all features with a type of 'CDS' will be used to create the track.
   *    For *dataMethod* of 'sequence', the following values are possible for *dataKeys*: 'orfs', 'start-stop-codons', 'gc-content', 'gc-skew'.
   */
  get dataKeys() {
    return this._dataKeys;
  }

  set dataKeys(value) {
    this._dataKeys = (value === undefined) ? new CGArray() : new CGArray(value);
  }

  /** * @member {Object} - Get or set the *dataOptions*. The *dataOptions* are passed to the SequenceExtractor.
   */
  get dataOptions() {
    return this._dataOptions;
  }

  set dataOptions(value) {
    this._dataOptions = value;
  }


  /**
   * @member {String} - Get or set separateFeaturesBy. Possible values are 'none', 'strand', or 'readingFrame'.
   */
  get separateFeaturesBy() {
    return this._separateFeaturesBy;
  }

  set separateFeaturesBy(value) {
    if ( utils.validate(value, ['none', 'strand', 'readingFrame']) ) {
      this._separateFeaturesBy = value;
      this.updateSlots();
    }
  }

  /**
   * @member {String} - Get or set the position. Possible values are 'inside', 'outside', or 'both'.
   */
  get position() {
    return this._position;
  }

  set position(value) {
    if (utils.validate(value, ['inside', 'outside', 'both'])) {
      this._position = value;
      this.updateSlots();
    }
  }

  /**
   * @member {Plot} - Get the plot associated with this track
   */
  get plot() {
    return this._plot;
  }

  /**
   * @member {Number} - Get or set the load progress position (integer between 0 and 100)
   */
  get loadProgress() {
    return this._loadProgress;
  }

  set loadProgress(value) {
    this._loadProgress = value;
    // this.viewer.trigger('track-load-progress-changed', this);
  }

  /**
   * @member {Number} - Return the number of features or plot points contained in this track.
   */
  get itemCount() {
    if (this.type === 'plot') {
      return (this.plot) ? this.plot.length : 0;
    } else if (this.type === 'feature') {
      return this.features().length;
    } else {
      return 0;
    }
  }

  /**
   * @member {Viewer} - Get or set the track size as a ratio to all other tracks
   */
  get thicknessRatio() {
    return this._thicknessRatio;
  }

  set thicknessRatio(value) {
    this._thicknessRatio = Number(value);
    this.layout._adjustProportions();
  }

  update(attributes) {
    this.viewer.updateTracks(this, attributes);
  }

  remove() {
    this.viewer.removeTracks(this);
  }

  move(newIndex) {
    const currentIndex = this.viewer.tracks().indexOf(this);
    this.viewer.moveTrack(currentIndex, newIndex);
  }


  /**
   * Returns an [CGArray](CGArray.html) of Features or a single Feature from all the features in this track.
   * @param {Integer|String|Array} term - See [CGArray.get](CGArray.html#get) for details.
   * @return {CGArray}
   */
  features(term) {
    return this._features.get(term);
  }

  slots(term) {
    return this._slots.get(term);
  }

  /**
   * Returns an [CGArray](CGArray.html) of Features or a single Feature from all the unique features in this track.
   * Unique features are ones that only appear in this track.
   * @param {Integer|String|Array} term - See [CGArray.get](CGArray.html#get) for details.
   * @return {CGArray}
   */
  uniqueFeatures(term) {
    const features = new CGArray();
    for (let i = 0, len = this._features.length; i < len; i++) {
      if (this._features[i].tracks().length === 1) {
        features.push(this._features[i]);
      }
    }
    return features.get(term);
  }

  /**
   * Remove a feature or array of features from the track and slots.
   *
   * @param {Feature|Array} features - The Feature(s) to remove.
   */
  removeFeatures(features) {
    features = (features.toString() === 'CGArray') ? features : new CGArray(features);
    // this._features = new CGArray(
    //   this._features.filter( (f) => { return !features.includes(f) })
    // );
    this._features = this._features.filter( f => !features.includes(f) );
    this.slots().each( (i, slot) => {
      slot.removeFeatures(features);
    });
    this.viewer.trigger('track-update', this);
  }

  /**
   * Remove the plot from the track and slots.
   */
  removePlot() {
    this._plot = undefined;
    this.slots().each( (i, slot) => {
      slot.removePlot();
    });
    this.viewer.trigger('track-update', this);
  }

  refresh() {
    this._features = new CGArray();
    this._plot = undefined;
    if (this.dataMethod === 'sequence') {
      this.extractFromSequence();
    } else if (this.type === 'feature') {
      this.updateFeatures();
    } else if (this.type === 'plot') {
      this.updatePlot();
    }
    this.updateSlots();
  }

  extractFromSequence() {
    const sequenceExtractor = this.viewer.sequence.sequenceExtractor;
    if (sequenceExtractor) {
      sequenceExtractor.extractTrackData(this, this.dataKeys[0], this.dataOptions);
    } else {
      console.error('No sequence is available to extract features/plots from');
    }
  }

  updateFeatures() {
    if (this.dataMethod === 'source' || this.dataMethod === 'type') {
      this.viewer.features().each( (i, feature) => {
        if (this.dataKeys.includes(feature[this.dataMethod]) && feature.contig.visible) {
          this._features.push(feature);
        }
      });
    }
  }

  updatePlot() {
    if (this.dataMethod === 'source') {
      // Plot with particular Source
      this.viewer.plots().find( (plot) => {
        if (plot.source === this.dataKeys[0]) {
          this._plot = plot;
        }
      });
    }
  }

  updateSlots() {
    if (this.type === 'feature') {
      this.updateFeatureSlots();
    } else if (this.type === 'plot') {
      this.updatePlotSlot();
    }
    this.layout._adjustProportions();
    // this.viewer.trigger('track-update', this);
  }

  updateFeatureSlots() {
    this._slots = new CGArray();
    if (this.separateFeaturesBy === 'readingFrame') {
      const features = this.sequence.featuresByReadingFrame(this.features());
      // Direct Reading Frames
      for (const rf of [1, 2, 3]) {
        const slot = new Slot(this, {strand: 'direct'});
        slot.replaceFeatures(features[`rfPlus${rf}`]);
      }
      // Reverse Reading Frames
      for (const rf of [1, 2, 3]) {
        const slot = new Slot(this, {strand: 'reverse'});
        slot.replaceFeatures(features[`rfMinus${rf}`]);
      }
    } else if (this.separateFeaturesBy === 'strand') {
      const features = this.featuresByStrand();
      // Direct Slot
      let slot = new Slot(this, {strand: 'direct'});
      slot.replaceFeatures(features.direct);
      // Reverse Slot
      slot = new Slot(this, {strand: 'reverse'});
      slot.replaceFeatures(features.reverse);
    } else {
      // Combined Slot
      const slot = new Slot(this, {strand: 'direct'});
      slot.replaceFeatures(this.features());
    }
  }

  // FIXME: this should become simply (update)
  // update(attributes = {}) {
  //   this.viewer.updateTracks(this, attributes);
  // }
  triggerUpdate() {
    this.viewer.updateTracks(this);
  }

  featuresByStrand() {
    const features = {};
    features.direct = new CGArray();
    features.reverse = new CGArray();
    this.features().each( (i, feature) => {
      if (feature.strand === -1) {
        features.reverse.push(feature);
      } else {
        features.direct.push(feature);
      }
    });
    return features;
  }

  updatePlotSlot() {
    this._slots = new CGArray();
    const slot = new Slot(this, {type: 'plot'});
    slot._plot = this._plot;
  }

  highlight(color = '#FFB') {
    if (this.visible) {
      this.slots().each( (i, slot) => {
        slot.highlight(color);
      });
    }
  }

  toJSON(options = {}) {
    const json = {
      name: this.name,
      separateFeaturesBy: this.separateFeaturesBy,
      position: this.position,
      thicknessRatio: this.thicknessRatio,
      dataType: this.dataType,
      dataMethod: this.dataMethod
    };
    // DataKeys
    json.dataKeys = (this.dataKeys.length === 1) ? this.dataKeys[0] : [...this.dataKeys];
    // DataOptions
    if (this.dataOptions && Object.keys(this.dataOptions).length > 0) {
      json.dataOptions = this.dataOptions;
    }
    // Optionally add default values
    if (!this.visible || options.includeDefaults) {
      json.visible = this.visible;
    }
    // This could be a new Track specific toJSON option
    if (options.includeDefaults) {
      json.loadProgress = this.loadProgress;
    }
    return json;
  }

}

export default Track;


