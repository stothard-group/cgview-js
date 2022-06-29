/**
 * @author Jason Grant <jason.grant@ualberta.ca>
 * @requires D3
 */
import { version } from '../package.json';
import utils from './Utils';
import CGArray from './CGArray';
import Canvas from './Canvas';
import Layout from './Layout';
import IO from './IO';
import Events from './Events';
import Sequence from './Sequence';
import Backbone from './Backbone';
import EventMonitor from './EventMonitor';
import Messenger from './Messenger';
import Settings from './Settings';
import Legend from './Legend';
import Dividers from './Dividers';
import Annotation from './Annotation';
import Ruler from './Ruler';
import { Highlighter } from './Highlighter';
import { CodonTables } from './CodonTable';
import ColorPicker from './ColorPicker';
import Debug from './Debug';
import Track from './Track';
import Caption from './Caption';
import Feature from './Feature';
import Contig from './Contig';
import Plot from './Plot';
import Bookmark from './Bookmark';
import CGRange from './CGRange';
import initializeZooming from './Viewer-Zoom';
import * as d3 from 'd3';

console.log(`CGView.js Version: ${version}`)

/**
 * The Viewer is the main container class for CGView. It controls the
 * overal appearance of the map (e.g. width, height, etc).
 * It also contains all the major components of the map (e.g. [Layout](Layout.html),
 * [Sequence](Sequence.html), [Ruler](Ruler.html), etc). Many
 * of component options can be set during construction of the Viewer.
 *
 * ### Action and Events
 *
 * Action                                  | Viewer Method                        | Event
 * ----------------------------------------|--------------------------------------|-----
 * [Update](../docs.html#updating-records) | [update()](Viewer.html#update)       | viewer-update
 *
 * <a name="attributes"></a>
 * ### Attributes
 *
 * Attribute                         | Type      | Description
 * ----------------------------------|-----------|------------
 * [name](#name)                     | String    | Name for the map
 * [id](#id)                         | String    | ID for the map [Default: random 20 character HexString]
 * [width](#width)                   | Number    | Width of the viewer map in pixels [Default: 600]
 * [height](#height)                 | Number    | Height of the viewer map in pixels [Default: 600]
 * [dataHasChanged](#dataHasChanged) | Boolean   | Indicates that data been update/added since this attribute was reset
 * [sequence](#sequence)<sup>iu</sup>    | Object | [Sequence](Sequence.html) options
 * [settings](#settings)<sup>iu</sup>    | Object | [Settings](Settings.html) options
 * [legend](#legend)<sup>iu</sup>        | Object | [Legend](Legend.html) options
 * [backbone](#backbone)<sup>iu</sup>    | Object | [Backbone](Backbone.html) options
 * [layout](#layout)<sup>iu</sup>        | Object | [Layout](Layout.html) options
 * [ruler](#ruler)<sup>iu</sup>          | Object | [Ruler](Ruler.html) options
 * [dividers](#dividers)<sup>iu</sup>    | Object | [Dividers](Dividers.html) options
 * [annotation](#annotation)<sup>iu</sup> | Object | [Annotation](Annotation.html) options
 * [highlighter](#highlighter)<sup>iu</sup> | Object | [Highlighter](Highlighter.html) options
 * 
 * <sup>iu</sup> Ignored on Viewer update
 *
 * ### Examples
 * ```js
 * cgv = new CGV.Viewer('#my-viewer', {
 *   height: 500,
 *   width: 500,
 *   sequence: {
 *     // The length of the sequence
 *     length: 1000
 *     // Or, you can provide a sequence
 *     // seq: 'ATGTAGCATGCATCAGTAGCTA...'
 *   }
 * });
 * 
 * // Draw the map
 * cgv.draw()
 * ```
 *
 * See the [tutorials](../tutorials/index.html) to learn more about making maps.
 */
class Viewer {


  /**
   * Create a viewer
   * @param {String} containerId - The ID (with or without '#') of the element to contain the viewer.
   * @param {Object} options - [Attributes](#attributes) used to create the viewer.
   *    Component options will be passed to the contructor of that component.
   */
  constructor(containerId, options = {}) {
    this.containerId = containerId.replace('#', '');
    this._container = d3.select(`#${this.containerId}`);
    // Get options
    this._width = utils.defaultFor(options.width, 600);
    this._height = utils.defaultFor(options.height, 600);
    this._wrapper = this._container.append('div')
      .attr('class', 'cgv-wrapper')
      .style('position', 'relative')
      .style('width', `${this.width}px`)
      .style('height', `${this.height}px`);

    // Create map id
    this._id = utils.randomHexString(40);

    // Create object to contain all CGObjects
    this._objects = {};

    // Initialize containers
    this._features = new CGArray();
    this._tracks = new CGArray();
    this._plots = new CGArray();
    this._captions = new CGArray();
    this._bookmarks = new CGArray();

    this._loading = true;

    // Initialize Canvas
    this.canvas = new Canvas(this, this._wrapper, {width: this.width, height: this.height});

    // Initialize Layout and set the default map format (ie. topology).
    this._layout = new Layout(this, options.layout);
    this.format = utils.defaultFor(options.format, 'circular');

    this._zoomFactor = 1;
    this._minZoomFactor = 0.5;

    // Initialize IO
    this.io = new IO(this);
    // Initialize DragAndDrop
    this.allowDragAndDrop = utils.defaultFor(options.allowDragAndDrop, true);
    // Initialize Events
    this._events = new Events();
    // Initialize Sequence
    this._sequence = new Sequence(this, options.sequence);
    // Initialize Backbone
    this._backbone = new Backbone(this, options.backbone);
    // this.initializeDragging();
    initializeZooming(this);
    // Initial Event Monitor
    this.eventMonitor = new EventMonitor(this);
    // Initial Messenger
    this.messenger = new Messenger(this, options.messenger);
    // Initialize General Setttings
    this._settings = new Settings(this, options.settings);
    // Initial Legend
    this._legend = new Legend(this, options.legend);
    // Initialize Slot Divider
    this._dividers = new Dividers(this, options.dividers);
    // Initialize Annotation
    this._annotation = new Annotation(this, options.annotation);
    // Initialize Ruler
    this._ruler = new Ruler(this, options.ruler);
    // Initialize Highlighter
    this._highlighter = new Highlighter(this, options.highlighter);
    // Initialize Codon Tables
    this.codonTables = new CodonTables;
    // Initialize Debug
    this.debug = utils.defaultFor(options.debug, false);

    this.layout.updateScales();

    // Integrate external dependencies for specific features
    this.externals = {};
    // Adding SVG using svgcanvas
    // https://github.com/zenozeng/svgcanvas
    this.externals.SVGContext = options.SVGContext;

    // TEMP adding
    if (options.features) {
      this.addFeatures(options.features);
    }

    // TEMP TESTING FOR EDIT MODE
    this.shiftSet = false;
    const shiftTest = (e) => {if (e.shiftKey) {console.log(e);}}
    this._wrapper.on('mouseover', () => {
      if (!this.shiftSet) {
        document.addEventListener('keydown', shiftTest);
        this.shiftSet = true;
      }
    }).on('mouseout', () => {
      if (this.shiftSet) {
        document.removeEventListener('keydown', shiftTest);
        this.shiftSet = false;
      }
    });

    this._loading = false;
    this.draw();
  }

  //////////////////////////////////////////////////////////////////////////
  // STATIC CLASSS METHODS
  //////////////////////////////////////////////////////////////////////////
  static get debugSections() {
    return ['time', 'zoom', 'position', 'n'];
  }

  //////////////////////////////////////////////////////////////////////////
  // MEMBERS
  //////////////////////////////////////////////////////////////////////////

  /**
   * @member {String} - Get CGView version
   */
  get version() {
    return version;
  }

  /**
   * @member {String} - Get map id
   */
  get id() {
    return this._id;
  }

  set id(value) {
    this._id = value;
  }

  /**
   * @member {String} - Get or set the map format: circular, linear
   */
  get format() {
    return this.layout.type;
    // return this.settings.format.type;
  }

  set format(value) {
    this.layout.type = value;
    // this.settings.type = value;
  }

  /**
   * @member {Layout} - Get the map [layout](Layout.html) object
   */
  get layout() {
    return this._layout;
  }

  /**
   * @member {Legend} - Get the map [legend](Legend.html) object
   */
  get legend() {
    return this._legend;
  }

  /**
   * @member {Annotation} - Get the map [annotation](Annotation.html) object
   */
  get annotation() {
    return this._annotation;
  }

  /**
   * @member {Dividers} - Get the map [dividers](Dividers.html) object
   */
  get dividers() {
    return this._dividers;
  }

  /**
   * @member {Ruler} - Get the map [ruler](Ruler.html) object
   */
  get ruler() {
    return this._ruler;
  }

  /**
   * @member {Settings} - Get the map [settings](Settings.html) object
   */
  get settings() {
    return this._settings;
  }

  /**
   * @member {Sequence} - Get the [Sequence](Sequence.html)
   */
  get sequence() {
    return this._sequence;
  }

  /**
   * @member {Backbone} - Get the [Backbone](Backbone.html)
   */
  get backbone() {
    return this._backbone;
  }

  /**
   * @member {Highlighter} - Get the [Highlighter](Highlighter.html)
   */
  get highlighter() {
    return this._highlighter;
  }


  /**
   * @member {String} - Get or set the map name
   */
  get name() {
    return this._name;
  }

  set name(value) {
    this._name = value;
  }

  /**
   * @member {Number} - Get or set the genetic code used for translation.
   * This genetic code will be used unless a feature has an overriding genetic code.
   * Alias for Settings.geneticCode.
   * Default: 11
   */
  get geneticCode() {
    // return this._geneticCode || 11;
    return this.settings.geneticCode;
  }

  set geneticCode(value) {
    // this._geneticCode = value;
    this.settings.geneticCode = value;
  }

  /**
   * @member {Number} - Get or set the width of the Viewer
   */
  get width() {
    return this._width;
  }

  set width(value) {
    this.resize(value);
  }

  /**
   * @member {Number} - Get or set the width of the Viewer
   */
  get height() {
    return this._height;
  }

  set height(value) {
    this.resize(null, value);
  }

  /**
   * @member {Number} - Get the height or the width of the viewer, which ever is smallest.
   */
  get minDimension() {
    return Math.min(this.height, this.width);
  }

  /**
   * @member {Number} - Get the height or the width of the viewer, which ever is largest.
   */
  get maxDimension() {
    return Math.max(this.height, this.width);
  }

  /**
   * @member {Number} - Get or set the zoom level of the map. A value of 1 is the intial zoom level.
   *   Increasing the zoom level to 2 will double the length of the backbone, and so on.
   */
  get zoomFactor() {
    return this._zoomFactor;
  }

  // FIXME: this should be done by layout?? OR not allowed
  set zoomFactor(value) {
    this.layout.zoom(Number(value));
  }

  /**
   * @member {Number} - Get the bp for the center of the canvas. Alias for Canvas.bpForCanvasCenter().
   */
  get bp() {
    return this.canvas.bpForCanvasCenter();
  }

  /**
   * @member {Number} - Get the distance from the backbone to the center of the canvas.
   */
  get bbOffset() {
    const halfRangeWidth = this.scale.x.range()[1] / 2;
    const halfRangeHeight = this.scale.y.range()[1] / 2;
    const offset = this.layout.centerOffsetForPoint({x: halfRangeWidth, y: halfRangeHeight});
    return this.backbone.adjustedCenterOffset - offset;
  }

  /**
   * @member {Number} - Get the minimum allowed zoom level
   */
  get minZoomFactor() {
    return this._minZoomFactor;
  }

  /**
   * @member {Number} - Get the maximum allowed zoom level. The maximum zoom level is set so
   * that at the maximum, the sequence can be clearly seen.
   */
  get maxZoomFactor() {
    return this.backbone.maxZoomFactor();
  }

  /**
   * @member {Object} - Return the canvas [scales](Canvas.html#scale)
   */
  get scale() {
    return this.layout.scale;
  }

  get colorPicker() {
    if (this._colorPicker === undefined) {
      // Create Color Picker
      const colorPickerId = `${this.containerId}-color-picker`;
      this._wrapper.append('div')
        // .classed('cp-color-picker-dialog', true)
        .attr('id', `${this.containerId}-color-picker`);
      this._colorPicker = new ColorPicker(colorPickerId);
    }
    return this._colorPicker;
  }

  get debug() {
    return this._debug;
  }

  set debug(options) {
    if (options) {
      if (options === true) {
        // Select all sections
        options = {};
        options.sections = Viewer.debugSections;
      }
      this._debug = new Debug(this, options);
    } else {
      this._debug = undefined;
    }
  }

  /**
   * Return true if viewer is being initialized or loading new data.
   */
  get loading() {
    return this._loading;
  }

  /**
   * @member {Boolean} - Get or set the dataHasChanged property. This will be
   * set to false, anytime the data API (add, update, remove, reorder) is
   * used. It is reset to false automatically when a new JSON is loaded via
   * [IO.loadJSON()](IO.html#loadJSON).
   */
  get dataHasChanged() {
    return this._dataHasChanged;
  }

  set dataHasChanged(value) {
    // console.log('DATA', value)
    this._dataHasChanged = value;
  }

  /**
   * Get the [Events](Events.html) object.
   */
  get events() {
    return this._events;
  }

  /**
   * @member {Object} - Get the last mouse position on canvas
   * @private
   */
  get mouse() {
    return this.eventMonitor.mouse;
  }

  /**
   * @member {Boolean} - Returns true if an animation started with 
   * [Viewer.animate()](IOViewer.html#animate) is in progress.
   */
  get isAnimating() {
    return Boolean(this._animateTimeoutID);
  }

  ///////////////////////////////////////////////////////////////////////////
  // METHODS
  ///////////////////////////////////////////////////////////////////////////

  /**
   * Resizes the the Viewer
   *
   * @param {Number} width - New width
   * @param {Number} height - New height
   * @param {Boolean} keepAspectRatio - If only one of width/height is given the ratio will remain the same. (NOT IMPLEMENTED YET)
   * @param {Boolean} fast -  After resize, should the viewer be draw redrawn fast.
   */
  resize(width, height, keepAspectRatio = true, fast) {
    this._width = width || this.width;
    this._height = height || this.height;

    this._wrapper
      .style('width', `${this.width}px`)
      .style('height', `${this.height}px`);

    this.canvas.resize(this.width, this.height);

    this.refreshCanvasLayer();
    // Hide Color Picker: otherwise it may disappear off the screen
    this.colorPicker.close();

    this.layout._adjustProportions();

    this.draw(fast);

    // this.trigger('resize');
  }

  /**
   * Returns an [CGArray](CGArray.html) of CGObjects or a single CGObject from all the CGObjects in the viewer.
   * Term      | Returns
   * ----------|----------------
   * undefined | All objects
   * String    | CGObject with a cgvID equal to the string or undefined
   * Array     | CGArray of CGObjects with matching cgvIDs
   *
   * @param {String|Array} term - The values returned depend on the term (see above table).
   * @return {CGArray|or|CGObject}
   */
  objects(term) {
    if (term === undefined) {
      return this._objects;
    } else if (typeof term === 'string') {
      return this._objects[term];
    } else if (Array.isArray(term)) {
      const array = new CGArray();
      for (let i = 0, len = term.length; i < len; i++) {
        array.push(this._objects[term[i]]);
      }
      return array;
    } else {
      return new CGArray();
    }
  }

  /**
   * Returns an [CGArray](CGArray.html) of Slots or a single Slot from all the Slots in the Layout.
   * @param {Integer|String|Array} term - See [CGArray.get](CGArray.html#get) for details.
   * @return {CGArray}
   */
  slots(term) {
    let slots = new CGArray();
    for (let i = 0, len = this._tracks.length; i < len; i++) {
      slots = slots.concat(this._tracks[i]._slots);
    }
    return slots.get(term);
  }

  /**
   * Returns a [CGArray](CGArray.html) of features or a single feature.
   * See [reading records](../docs.html#s.reading-records) for details.
   * @param {Integer|String|Array} term - See [CGArray.get](CGArray.html#get) for details.
   * @return {Feature|CGArray}
   */
  features(term) {
    return this._features.get(term);
  }

  /**
   * Returns an [CGArray](CGArray.html) of contigs or a single contig from all the contigs in the viewer. This is an alias for Viewer.sequence.contigs().
   * @param {Integer|String|Array} term - See [CGArray.get](CGArray.html#get) for details.
   * @return {CGArray}
   */
  contigs(term) {
    return this.sequence.contigs(term);
  }

  update(attributes) {
    // Validate attribute keys
    let keys = Object.keys(attributes);
    const validKeys = ['name', 'id', 'width', 'height', 'dataHasChanged'];
    if (!utils.validate(keys, validKeys)) { return; }

    // Special Case for Resizing - we don't want to update width and height separately
    if (keys.includes('width') && keys.includes('height')) {
      this.resize(attributes.width, attributes.height);
      keys = keys.filter( i => i !== 'width' && i !== 'height' );
    }

    // Trigger ignores 'viewer-update' for dataHasChanged. So we add it here if needed.
    if (keys.length > 0 && !keys.includes('dataHasChanged')) {
      attributes.dataHasChanged = true;
    }

    for (let i = 0; i < keys.length; i++) {
      this[keys[i]] = attributes[keys[i]];
    }
    this.trigger('viewer-update', { attributes });
  }


  /**
   * Returns a [CGArray](CGArray.html) of tracks or a single track.
   * See [reading records](../docs.html#s.reading-records) for details.
   * @param {Integer|String|Array} term - See [CGArray.get](CGArray.html#get) for details.
   * @return {Track|CGArray}
   */
  tracks(term) {
    return this._tracks.get(term);
  }

  /**
   * Add one or more [tracks](Track.html) (see [attributes](Track.html#attributes)).
   * See [adding records](../docs.html#s.adding-records) for details.
   * @param {Object|Array} data - Object or array of objects describing the tracks
   * @return {CGArray<Track>} CGArray of added tracks
   */
  addTracks(trackData = []) {
    trackData = CGArray.arrayerize(trackData);
    const tracks = trackData.map( (data) => new Track(this, data));

    // Recenter the map tracks if zoomed in if zoomed in
    if (!(this.backbone.visibleRange && this.backbone.visibleRange.overHalfMapLength())) {
      this.recenterTracks();
    }

    this.dirty = true;

    this.trigger('tracks-add', tracks);
    return tracks;
  }

  /**
   * Remove tracks.
   * See [removing records](../docs.html#s.removing-records) for details.
   * @param {Track|Array} tracks - Track or a array of tracks to remove
   */
  removeTracks(tracks) {
    tracks = CGArray.arrayerize(tracks);
    this._tracks = this._tracks.filter( t => !tracks.includes(t) );
    this.layout._adjustProportions();
    // Remove from Objects
    tracks.forEach( t => t.deleteFromObjects() );
    this.trigger('tracks-remove', tracks);
  }


  /**
   * Update track properties to the viewer. If no attribtes are given, the trigger event will still be called.
   */
  // updateTracks(tracks, attributes) {
  //   tracks = CGArray.arrayerize(tracks);
  //   if (attributes) {
  //     // Validate attribute keys
  //     const keys = Object.keys(attributes);
  //     const validKeys = ['name', 'position', 'separateFeaturesBy', 'visible', 'thicknessRatio', 'loadProgress', 'contents'];
  //     if (!validate(keys, validKeys)) { return false; }
  //     const contents = attributes.contents;
  //     if (contents) {
  //       // Validate content attribute keys
  //       const contentKeys = Object.keys(contents);
  //       const validContentKeys = ['type', 'from', 'extract', 'options'];
  //       if (!validate(contentKeys, validContentKeys)) { return false; }
  //       for (const track of tracks) {
  //         for (const contentKey of contentKeys) {
  //           const value = contents[contentKey];
  //           track.contents[contentKey] = value;
  //         }
  //         track.refresh();
  //       }
  //       // const {contents, ...modifiedAttributes} = attributes;
  //       const modifiedAttributes = keys.reduce( (obj, k) => {
  //         if (k !== 'contents') { obj[k] = attributes[k]; }
  //         return obj;
  //       }, {});
  //       tracks.attr(modifiedAttributes);
  //     } else {
  //       tracks.attr(attributes);
  //     }
  //   }
  //   this.trigger('tracks-update', { tracks, attributes });
  // }
  /**
   * Update [attributes](Track.html#attributes) for one or more tracks.
   * See [updating records](../docs.html#s.updating-records) for details.
   * @param {Track|Array|Object} tracksOrUpdates - Track, array of tracks or object describing updates
   * @param {Object} attributes - Object describing the properties to change
   */
  updateTracks(tracksOrUpdates, attributes) {
    const { records: tracks, updates } = this.updateRecords(tracksOrUpdates, attributes, {
      recordClass: 'Track',
      validKeys: ['name', 'position', 'separateFeaturesBy', 'dataType', 'dataMethod', 'dataKeys', 'dataOptions', 'favorite', 'visible', 'loadProgress', 'thicknessRatio']
    });
    let tracksToRefresh = [];
    if (updates) {
      const cgvIDs = Object.keys(updates);
      for (let cgvID of cgvIDs) {
        const value = updates[cgvID];
        const track = this.objects(cgvID);
        //TODO: try Sets
        const keys = Object.keys(value);
        if (keys.includes('dataMethod') || keys.includes('dataType') || keys.includes('dataKeys')) {
          if (!tracksToRefresh.includes(track)) {
            tracksToRefresh.push(track);
          }
        }
      }
    } else if (attributes) {
      const keys = Object.keys(attributes);
      if (keys.includes('dataMethod') || keys.includes('dataType') || keys.includes('dataKeys')) {
        tracksToRefresh = tracks;
      }
    }
    for (const track of tracksToRefresh) {
      track.refresh();
    }
    this.trigger('tracks-update', { tracks, attributes, updates });
  }

  /**
   * Move a track from one index to a new one
   * @param {Number} oldIndex - Index of track to move (0-based)
   * @param {Number} newIndex - New index for the track (0-based)
   */
  moveTrack(oldIndex, newIndex) {
    this._tracks.move(oldIndex, newIndex);
    this.layout._adjustProportions();
    this.trigger('tracks-moved', {oldIndex: oldIndex, newIndex: newIndex});
  }

  /**
   * Returns an [CGArray](CGArray.html) of Captions or a single Caption.
   * @param {Integer|String|Array} term - See [CGArray.get](CGArray.html#get) for details.
   * @return {CGArray}
   */
  captions(term) {
    return this._captions.get(term);
  }

  visibleCaptions(term) {
    return this._captions.filter( i => i.visible ).get(term);
  }

  /**
   * Add one or more [captions](Caption.html) (see [attributes](Caption.html#attributes)).
   * See [adding records](../docs.html#s.adding-records) for details.
   * @param {Object|Array} data - Object or array of objects describing the captions
   * @return {CGArray<Caption>} CGArray of added captions
   */
  addCaptions(captionData = []) {
    captionData = CGArray.arrayerize(captionData);
    const captions = captionData.map( (data) => new Caption(this, data));
    this.trigger('captions-add', captions);
    return captions;
  }

  updateCaptions(captionsOrUpdates, attributes) {
    const { records: captions, updates } = this.updateRecords(captionsOrUpdates, attributes, {
      recordClass: 'Caption',
      validKeys: ['name', 'on', 'anchor', 'position', 'font', 'visible', 'fontColor', 'textAlignment', 'backgroundColor']
    });
    this.trigger('captions-update', { captions, attributes, updates });
  }

  removeCaptions(captions) {
    captions = CGArray.arrayerize(captions);
    this._captions = this._captions.filter( f => !captions.includes(f) );
    // Update Layers
    this.clear('canvas');
    this.refreshCanvasLayer();
    // Remove from Objects
    captions.forEach( c => c.deleteFromObjects() );

    this.trigger('captions-remove', captions);
  }

  /**
   * Move a caption from one index to a new one
   * @param {Number} oldIndex - Index of caption to move (0-based)
   * @param {Number} newIndex - New index for the caption (0-based)
   */
  moveCaption(oldIndex, newIndex) {
    this._captions.move(oldIndex, newIndex);
    this.refreshCanvasLayer();
    this.trigger('captions-moved', {oldIndex: oldIndex, newIndex: newIndex});
  }

  /**
   * Returns a [CGArray](CGArray.html) of plots or a single plot.
   * See [reading records](../docs.html#s.reading-records) for details.
   * @param {Integer|String|Array} term - See [CGArray.get](CGArray.html#get) for details.
   * @return {Plot|CGArray}
   */
  plots(term) {
    return this._plots.get(term);
  }

  /**
   * Returns an [CGArray](CGArray.html) of Feature/Plot Source name or a single item.
   * @param {Integer|String|Array} term - See [CGArray.get](CGArray.html#get) for details.
   * @return {CGArray}
   */
  // FIXME: need better way to keep track of sources
  // FIXME: sources should not contain things like orfs???
  // FIXME: contains empty source for sequence plots.
  sources(term) {
    const featureSources = this._features.map( f => f.source );
    const plotSources = this._plots.map( p => p.source );
    const trackSources = this.tracks().
      filter( c => c.dataMethod === 'source').
      map( c => c.dataKeys ).flat();

    const allSources = featureSources.concat(plotSources).concat(trackSources);
    return new CGArray([...new Set(allSources)]).get(term);
  }

  /**
   * Returns an [CGArray](CGArray.html) of all Feature/Plot tags or a single item.
   * @param {Integer|String|Array} term - See [CGArray.get](CGArray.html#get) for details.
   * @return {CGArray}
   */
  // FIXME: need better way to keep track of tags
  // FIXME: add plots tags
  tags(term) {
    const featureTags = this._features.map( f => f.tags );
    // const plotTags = this._plots.map( p => p.tags );
    const trackTags = this.tracks().
      filter( c => c.dataMethod === 'tag').
      map( c => c.dataKeys );

    // const allTags = featureTags.concat(plotTags).concat(trackTags).flat();
    const allTags = featureTags.concat(trackTags).flat();
    return new CGArray([...new Set(allTags)]).get(term);
  }

  updateRecordsWithAttributes(records, attributes, options = {}) {
    const validKeys = options.validKeys;
    const recordClass = options.recordClass;
    // Validate attribute keys
    const attibuteKeys = Object.keys(attributes);
    if (validKeys && !utils.validate(attibuteKeys, validKeys)) { return; }
    // Validate record Class
    records = CGArray.arrayerize(records);
    if (recordClass && records.some( r => r.toString() !== recordClass )) {
      console.error(`The following records were not of the Class '${recordClass}':`, records.filter ( r => r.toString() != recordClass));
      return;
    }
    // Update Records
    records.attr(attributes);
    return records;
  }

  updateRecordsIndividually(updates, options = {}) {
    const validKeys = options.validKeys;
    const recordClass = options.recordClass;
    // Validate attribute keys
    if (validKeys) {
      let allAttributeKeys = [];
      const values = Object.values(updates);
      for (const value of values) {
        allAttributeKeys = allAttributeKeys.concat(Object.keys(value));
      }
      const uniqAttributeKeys = [...new Set(allAttributeKeys)];
      if (!utils.validate(uniqAttributeKeys, validKeys)) { return; }
    }
    // Get records form cgvIDs update keys
    const cgvIDs = new CGArray(Object.keys(updates));
    const records = cgvIDs.map( id => this.objects(id) );
    // Validate record Class
    if (recordClass && records.some( r => r.toString() !== recordClass )) {
      console.error(`The following records were not of the Class '${recordClass}':`, records.filter ( r => r.toString() != recordClass));
      return;
    }
    // Update Records
    for (const record of records) {
      const attributes = Object.keys(updates[record.cgvID]);
      for (const attribute of attributes) {
        record[attribute] = updates[record.cgvID][attribute];
      }
    }
    return records;
  }

  // Returns records (CGArray), updates, attributes
  // NOTE: Not used by Viewer.updateTracks or Viewer.update
  updateRecords(recordsOrUpdates = [], attributes = {}, options = {}) {
    let records, updates;
    if (recordsOrUpdates.toString() === '[object Object]') {
      // Assume recordsOrUpdate is an object of updates
      updates = recordsOrUpdates;
      records = this.updateRecordsIndividually(updates, options);
    } else {
      // Assume recordsOrUpdate is an individual record or an array of records
      records = this.updateRecordsWithAttributes(recordsOrUpdates, attributes, options);
    }
    return { records, updates, attributes };
  }

  /**
   * Returns a CGArray of the records that have had the attributesOfInterest changed.
   * If attributes has any of the attributesOfInterest then all the records are returned.
   * Otherwise any record in updates that has an attributesOfInterest of changed is returned.
   * @private
   */
  recordsWithChangedAttributes(attributesOfInterest, records, attributes = {}, updates) {
    records = CGArray.arrayerize(records);
    let returnedRecords = new CGArray();
    attributesOfInterest = CGArray.arrayerize(attributesOfInterest);
    const attributeKeys = Object.keys(attributes);
    if (attributeKeys.length > 0) {
      for (const attribute of attributesOfInterest) {
        if (attributeKeys.includes(attribute)) {
          return returnedRecords = records;
        }
      }
    } else if (updates) {
      for (const record of records) {
        for (const attribute of attributesOfInterest) {
          if (Object.keys(updates[record.cgvID]).includes(attribute)) {
            returnedRecords.push(record);
            continue;
          }
        }
      }
    }
    return returnedRecords;
  }

  /**
   * Add one or more [features](Feature.html) (see [attributes](Feature.html#attributes)).
   * See [adding records](../docs.html#s.adding-records) for details.
   * @param {Object|Array} data - Object or array of objects describing the features
   * @return {CGArray<Feature>} CGArray of added features
   */
  // FIXME: for History, we will want to be able to handle passing an array of features
  //  not just feature data. That way they don't have to be reinitialized and they keep the same cgvIDs.
  addFeatures(featureData = []) {
    featureData = CGArray.arrayerize(featureData);
    const features = featureData.map( (data) => new Feature(this, data));
    this.annotation.refresh();
    // FIXME: need to update tracks??
    // This causes sequence-based (e.g. orfs) to reload too
    // this.tracks().each( (i,t) => t.refresh() );
    this.trigger('features-add', features);
    return features;
  }

  /**
   * Remove features.
   * See [removing records](../docs.html#s.removing-records) for details.
   * @param {Feature|Array} features - Feature or a array of features to remove
   */
  removeFeatures(features) {
    features = CGArray.arrayerize(features);
    this._features = this._features.filter( f => !features.includes(f) );
    // Update Annotationa and Tracks
    const labels = features.map( f => f.label );
    this.annotation.removeLabels(labels);
    this.tracks().each( (i, track) => {
      track.removeFeatures(features);
    });
    this.annotation.refresh();
    // Update Contigs
    Contig.removeFeatures(features);
    // Remove from Objects
    features.forEach( f => f.deleteFromObjects() );

    this.trigger('features-remove', features);
  }

  /**
   * Update [attributes](Feature.html#attributes) for one or more features.
   * See [updating records](../docs.html#s.updating-records) for details.
   * @param {Feature|Array|Object} featuresOrUpdates - Feature, array of features or object describing updates
   * @param {Object} attributes - Object describing the properties to change
   */
  updateFeatures(featuresOrUpdates, attributes) {
    const { records: features, updates } = this.updateRecords(featuresOrUpdates, attributes, {
      recordClass: 'Feature',
      validKeys: ['name', 'type', 'contig', 'legendItem', 'source', 'tags', 'favorite', 'visible', 'strand', 'start', 'stop', 'mapStart', 'mapStop']
    });
    // Refresh tracks if any attribute is source, type, tags
    let refreshTracks;
    if (updates) {
      const values = Object.values(updates);
      for (let value of values) {
        refreshTracks = Object.keys(values).some( a => ['source', 'type', 'tags'].includes(a));
      }
    } else if (attributes) {
      refreshTracks = Object.keys(attributes).some( a => ['source', 'type', 'tags'].includes(a));
    }
    if (refreshTracks) {
      for (let track of cgv.tracks()) {
        track.refresh();
      }
    }
    // Refresh labels if any attribute is start or stop
    let positionChanged;
    if (updates) {
      const values = Object.values(updates);
      for (let value of values) {
        if (Object.keys(value).includes('start') || Object.keys(value).includes('stop')) {
          positionChanged = true;
        }
      }
    } else {
      positionChanged = attributes && (Object.keys(attributes).includes('start') || Object.keys(attributes).includes('stop'));
    }
    if (positionChanged) {
      this.annotation.refresh();
    }
    this.trigger('features-update', { features, attributes, updates });
  }

  /**
   * Add one or more [plots](Plot.html) (see [attributes](Plot.html#attributes)).
   * See [adding records](../docs.html#s.adding-records) for details.
   * @param {Object|Array} data - Object or array of objects describing the plots
   * @return {CGArray<Plot>} CGArray of added plots
   */
  addPlots(plotData = []) {
    plotData = CGArray.arrayerize(plotData);
    const plots = plotData.map( (data) => new Plot(this, data));
    this.annotation.refresh();
    this.trigger('plots-add', plots);
    return plots;
  }

  /**
   * Remove plots.
   * See [removing records](../docs.html#s.removing-records) for details.
   * @param {Plot|Array} plots - Plot or a array of plots to remove
   */
  removePlots(plots) {
    plots = CGArray.arrayerize(plots);
    this._plots = this._plots.filter( p => !plots.includes(p) );
    plots.each( (i, plot) => {
      plot.tracks().each( (j, track) => {
        track.removePlot();
      });
    });
    // Remove from Objects
    plots.forEach( f => f.deleteFromObjects() );

    this.trigger('plots-remove', plots);
  }

  /**
   * Update [attributes](Plot.html#attributes) for one or more plot.
   * See [updating records](../docs.html#s.updating-records) for details.
   * @param {Plot|Array|Object} plotsOrUpdates - Plot, array of plot or object describing updates
   * @param {Object} attributes - Object describing the properties to change
   */
  updatePlots(plotsOrUpdates, attributes) {
    const { records: plots, updates } = this.updateRecords(plotsOrUpdates, attributes, {
      recordClass: 'Plot',
      validKeys: ['name', 'type','legend', 'legendPositive', 'legendNegative', 'source',
        'favorite', 'visible', 'baseline', 'axisMin', 'axisMax']
    });
    // Refresh tracks if any attribute is source
    // let sourceChanged;
    // if (plotsOrUpdates.toString() === '[object Object]') {
    //   const values = Object.values(plotsOrUpdates);
    //   for (let value of values) {
    //     if (Object.keys(value).includes('source')) {
    //       sourceChanged = true;
    //     }
    //   }
    // } else {
    //   sourceChanged = attributes && Object.keys(attributes).includes('source');
    // }
    // if (sourceChanged) {
    //   for (let track of cgv.tracks()) {
    //     track.refresh();
    //   }
    // }
    this.trigger('plots-update', { plots, attributes, updates });
  }

  /**
   * Returns a [CGArray](CGArray.html) of Bookmarks or a single Bookmark.
   * See [reading records](../docs.html#s.reading-records) for details.
   * @param {Integer|String|Array} term - See [CGArray.get](CGArray.html#get) for details.
   * @return {Bookmark|CGArray<Bookmark>}
   */
  bookmarks(term) {
    return this._bookmarks.get(term);
  }

  /**
   * Add one or more [Bookmarks](Bookmark.html) (see [attributes](Bookmark.html#attributes)).
   * See [adding records](../docs.html#s.adding-records) for details.
   * @param {Object|Array} data - Object or array of objects describing the bookmarks
   * @return {CGArray<Bookmark>} CGArray of added bookmarks
   */
  addBookmarks(bookmarkData = []) {
    bookmarkData = CGArray.arrayerize(bookmarkData);
    const bookmarks = bookmarkData.map( (data) => new Bookmark(this, data));
    this.trigger('bookmarks-add', bookmarks);
    return bookmarks;
  }

  /**
   * Remove bookmarks.
   * See [removing records](../docs.html#s.removing-records) for details.
   * @param {Bookmark | Array} bookmarks - Bookmark or a array of bookmarks to remove
   */
  removeBookmarks(bookmarks) {
    bookmarks = CGArray.arrayerize(bookmarks);
    this._bookmarks = this._bookmarks.filter( b => !bookmarks.includes(b) );
    // Remove from Objects
    bookmarks.forEach( b => b.deleteFromObjects() );
    this.trigger('bookmarks-remove', bookmarks);
  }

  bookmarkByShortcut(shortcut) {
    return this.bookmarks().find( b => b.shortcut && b.shortcut === `${shortcut}` );
  }

  /**
   * Update [attributes](Bookmark.html#attributes) for one or more bookmarks.
   * See [updating records](../docs.html#s.updating-records) for details.
   * @param {Bookmark | Array| Object } bookmarksOrUpdates - Bookmark, array of bookmarks or object describing updates
   * @param {Object} attributes - Object describing the properties to change
   */
  updateBookmarks(bookmarksOrUpdates, attributes) {
    const { records: bookmarks, updates } = this.updateRecords(bookmarksOrUpdates, attributes, {
      recordClass: 'Bookmark',
      validKeys: ['name', 'bp', 'zoom', 'format', 'favorite', 'shortcut', 'bbOffset']
    });
    this.trigger('bookmarks-update', { bookmarks, attributes, updates });
  }

  /**
   * Clear the viewer canvas
   */
  clear(layerName = 'map') {
    this.canvas.clear(layerName);
  }

  /**
  * Flash a message on the center of the viewer.
  * @private
  */
  flash(msg) {
    this.messenger.flash(msg);
  }

  fillBackground() {
    this.clear('background');
  }

  drawFull() {
    this.layout.drawFull();
  }

  drawFast() {
    this.layout.drawFast();
  }

  drawExport() {
    this.layout.drawExport();
  }

  /**
   * Draw the map. By default the full version of the map is drawn. The map can be drawn faster but this will
   * reduce the number of features and other components are drawn.
   * @param {Boolean} fast - If true, a fast version of the map is draw. Fast drawing is best for zooming and scrolling.
   */
  draw(fast) {
    this.layout.draw(fast);
  }

  featureTypes(term) {
    return this._features.map( f => f.type ).unique().get(term);
  }

  featuresByType(type) {
    return this._features.filter( f => f.type === type );
  }

  featuresBySource(source) {
    return this._features.filter( f => f.source === source );
  }

  refreshCanvasLayer() {
    for (let i = 0, len = this._captions.length; i < len; i++) {
      this._captions[i].refresh();
    }
    this.legend && this.legend.refresh();
  }

  /**
   * Animate through a defined set of elements (eg. features, bookmarks) or a
   * random number of features. By default the map will reset between
   * animations. To stop the animation, click the map canvas or call
   * [Viewer.stopAnimate()](Viewer.html#stopAnimate).
   * @param {Number|Array} elements - An array of [features](Feature.html) or
   *   [bookmarks](Bookmark.html). If a number is provided, that number of random
   *   features will be animated.
   * @param {Object} options - Options for the animations:
   * <br />
   * Name         | Type    | Description
   * -------------|---------|------------
   * noReset      | Boolean | If set to true, the map will not reset between animations [Default: false]
   * resetPosition  | Feature,Bookmark | A feature or bookmark to reset the map to between animations [Default: call [Viewer.reset()](Viewer.html#reset)]
   * resetDuration  | Number | Number of milliseconds for the reset animation [Default: 3000]
   * resetPause  | Number | Number of milliseconds to pause on the reset position [Default: 1000]
   * elementDuration  | Number | Number of milliseconds for each element animation [Default: 3000]
   * elementPause  | Number | Number of milliseconds to pause on each element position [Default: 1000]
   *
   * @param {Number} step - The element index (base-0) to start the animation with [Default: 0]
   * @param {Boolean} reset - Whether this is a reset animation or not [Default: false]
   * @param {Boolean} newAnimation - Whether this is a newAnimation or a continuation of a previous one [Default: true]
   */
  animate(elements=5, options={}, step=0, reset=false, newAnimation=true) {
    const noReset = options.noReset;
    const resetPosition = options.resetPosition;
    const resetDuration = utils.defaultFor(options.resetDuration, 3000);
    const resetPause = utils.defaultFor(options.resetPause, 1000);
    const elementDuration = utils.defaultFor(options.elementDuration, 3000);
    const elementPause = utils.defaultFor(options.elementPause, 1000);

    if (newAnimation) {
      // Stop previous animations
      this.stopAnimate();
    }

    // Get random features if an integer was provided for elements
    if (Number.isInteger(elements)) {
      const allFeatures = this.features();
      if (allFeatures.length > 0) {
        let animateFeatures = [];
        for (let i = 0; i < elements; i++) {
          const randomIndex = Math.floor(Math.random() * allFeatures.length);
          const randomFeature = allFeatures[randomIndex];
          animateFeatures.push(randomFeature);
        }
        elements = animateFeatures;
      } else {
        console.error('No features to animate');
        return;
      }
    }

    // Is this step reseting the animation?
    const resetStep = reset && !noReset;

    // Duration for timeout depends on resetStep and element/resetDuration and element/resetPause
    const timeoutDuration = resetStep ? (resetDuration + resetPause) : (elementDuration + elementPause);

    // console.log(`Animate: Step ${step}; Reseting: ${resetStep}; Duration: ${timeoutDuration}`);

    if (resetStep) {
      if (resetPosition) {
        resetPosition.moveTo(resetDuration);
      } else {
        this.reset(resetDuration);
      }
    } else {
      elements[step].moveTo(elementDuration);
      step = (step >= (elements.length - 1)) ? 0 : step + 1;
    }
    this._animateTimeoutID = setTimeout( () => {
      this.animate(elements, options, step, !reset, false)
    }, timeoutDuration);
  }

  /**
   * Stops an animation started with [Viewer.animate()](Viewer.html#animate).
   */
  stopAnimate() {
    clearTimeout(this._animateTimeoutID);
    this._animateTimeoutID = undefined;
    d3.select(this.canvas.node('ui')).interrupt();
  }




  test2MoveTo(start, stop) {
    // TODO: check for visibile range
    const startRange = this.backbone.visibleRange;
    const startBp = startRange.middle;
    const endBp = new CGRange(this.sequence.mapContig, start, stop).middle;
    const startEndLength = Math.abs(endBp - startBp);

    const zoomScale = d3.scalePow()
      .exponent(5)
    // let zoomScale = d3.scaleLinear()
      .domain([1, this.sequence.length / 4])
      .range([this.backbone.maxZoomFactor(), 1]);

    const zoomThrough = zoomScale(startEndLength);

    this.testMoveTo(start, stop, {zoomThrough: zoomThrough});
  }

  // testMoveTo(start, stop, options = {}) {
  //   const duration = options.duration || 1000;
  //   const ease = options.ease || d3.easeCubic;
  //   const zoomThrough = options.zoomThrough;
  //   const zoomFactor = this.zoomFactor;
  //
  //   if (zoomThrough && zoomThrough <= zoomFactor) {
  //     const startRange = this.backbone.visibleRange;
  //     const startBp = startRange.middle;
  //     const endBp = new CGRange(this.sequence, start, stop).middle;
  //     let startEndLength = Math.abs(endBp - startBp);
  //     let middleBp;
  //     if ( startEndLength < (this.sequence.length / 2) ) {
  //       middleBp = Math.min(startBp, endBp) + (startEndLength / 2);
  //     } else {
  //       startEndLength = this.sequence.length - startEndLength;
  //       middleBp = this.sequence.addBp( Math.max(startBp, endBp), startEndLength );
  //     }
  //     this.zoomTo(middleBp, zoomThrough, duration, d3.easePolyOut.exponent(5), () => {
  //       this.moveTo(start, stop, duration, d3.easePolyIn.exponent(5));
  //     });
  //   } else {
  //     this.moveTo(start, stop, duration, ease);
  //   }
  // }

  /**
   * Move the viewer to show the map from the *start* to the *stop* position.
   * If only the *start* position is provided,
   * the viewer will center the image on that bp with the current zoom level.
   *
   * @param {Number} start - The start position in bp
   * @param {Number} stop - The stop position in bp
   * @param {Object} options - Options for the move:
   * <br />
   * Name         | Type   | Description
   * -------------|--------|------------
   * bbOffset       | Number | Distance the map backbone should be moved from center [Default: 0]
   * duration     | Number | The animation duration in milliseconds [Default: 1000]
   * ease         | Number | The d3 animation ease [Default: d3.easeCubic]
   * callback     | Function | Function called after the animation is complete.
   */
  moveTo(start, stop, options = {}) {
    if (stop) {
      const bpLength = this.sequence.lengthOfRange(start, stop);
      const bp = this.sequence.addBp(start, bpLength / 2);

      const zoomFactor = this.layout.zoomFactorForLength(bpLength);

      // this.zoomTo(bp, zoomFactor, duration, ease, callback);
      this.zoomTo(bp, zoomFactor, options);
    } else {
      // this._moveTo(start, duration, ease, callback);
      this._moveTo(start, options);
    }
  }

  _moveTo(bp, options = {}) {
    const self = this;

    const {
      bbOffset = utils.defaultFor(options.bbOffset, 0),
      duration = utils.defaultFor(options.duration, 1000),
      ease = utils.defaultFor(options.ease, d3.easeCubic),
      callback
    } = options;

    const domainX = this.scale.x.domain();
    const domainY = this.scale.y.domain();

    const startDomains = [domainX[0], domainX[1], domainY[0], domainY[1]];
    const endDomains = this.layout.domainsFor(bp, undefined, bbOffset);

    d3.select(this.canvas.node('ui')).transition()
      .duration(duration)
      .ease(ease)
      .tween('move', function() {
        const intermDomains = d3.interpolateArray(startDomains, endDomains);
        return function(t) {
          self.scale.x.domain([intermDomains(t)[0], intermDomains(t)[1]]);
          self.scale.y.domain([intermDomains(t)[2], intermDomains(t)[3]]);
          self.trigger('zoom');
          self.drawFast();
        };
      }).on('end', function() {
        callback ? callback.call() : self.drawFull();
      });
  }

  _moveLeftRight(factor=0.5, direction, options = {}) {
    const currentBp = this.canvas.bpForCanvasCenter();
    const length = this.sequence.length;
    let bpChange = length * factor / this.zoomFactor;
    console.log(factor)

    if (direction !== 'right') {
      bpChange *= -1;
    }

    let newBp = currentBp + bpChange;
    if (this.format === 'linear') {
      newBp = (utils.constrain((currentBp + bpChange), 1, this.sequence.length));
    }
    this.moveTo(newBp, null, options);
  }

  /**
   * Moves the map left or counterclockwise by factor, where the factor is the fraction of the current visable range.
   * For example, if 1000 bp are currently visible then the default (factor = 0.5) move
   * would be 500 bp.
   * @param {Number} factor - the fraction of the current visible region to move [Default: 0.5]
   * @param {Object} options - Options for the moving:
   * <br />
   * Name         | Type   | Description
   * -------------|--------|------------
   * bbOffset     | Number | Distance the map backbone should be moved from center [Default: 0]
   * duration     | Number | The animation duration in milliseconds [Default: 1000]
   * ease         | Number | The d3 animation ease [Default: d3.easeCubic]
   * callback     | Function | Function called after the animation is complete.
   */
  moveLeft(factor, options = {}) {
    this._moveLeftRight(factor, 'left', options);
  }

  /**
   * Moves the map right or clockwise by factor, where the factor is the fraction of the current visable range.
   * For example, if 1000 bp are currently visible then the default (factor = 0.5) move
   * would be 500 bp.
   * @param {Number} factor - the fraction of the current visible region to move [Default: 0.5]
   * @param {Object} options - Options for the moving:
   * <br />
   * Name         | Type   | Description
   * -------------|--------|------------
   * bbOffset     | Number | Distance the map backbone should be moved from center [Default: 0]
   * duration     | Number | The animation duration in milliseconds [Default: 1000]
   * ease         | Number | The d3 animation ease [Default: d3.easeCubic]
   * callback     | Function | Function called after the animation is complete.
   */
  moveRight(factor, options = {}) {
    this._moveLeftRight(factor, 'right', options);
  }


  /**
   * Move the viewer to *bp* position at the provided *zoomFactor*.
   * If *bp* is falsy (inc. 0), the map is centered.
   *
   * @param {Number} bp - The position in bp
   * @param {Number} zoomFactor - The zoome level
   * @param {Object} options - Options for the zoom:
   * <br />
   * Name         | Type   | Description
   * -------------|--------|------------
   * bbOffset     | Number | Distance the map backbone should be moved from center [Default: 0]
   * duration     | Number | The animation duration in milliseconds [Default: 1000]
   * ease         | Number | The d3 animation ease [Default: d3.easeCubic]
   * callback     | Function | Function called after the animation is complete.
   */
  zoomTo(bp, zoomFactor, options = {}) {
    const self = this;

    const {
      bbOffset = utils.defaultFor(options.bbOffset, 0),
      duration = utils.defaultFor(options.duration, 1000),
      ease = utils.defaultFor(options.ease, d3.easeCubic),
      callback
    } = options;

    const zoomExtent = self._zoom.scaleExtent();
    zoomFactor = utils.constrain(zoomFactor, zoomExtent[0], zoomExtent[1]);

    // Current Domains
    const domainX = this.scale.x.domain();
    const domainY = this.scale.y.domain();

    const startDomains = [domainX[0], domainX[1], domainY[0], domainY[1]];
    const endDomains = this.layout.domainsFor(bp, zoomFactor, bbOffset);

    d3.select(this.canvas.node('ui')).transition()
      .duration(duration)
      .ease(ease)
      .tween('move', function() {
        const intermDomains = d3.interpolateArray(startDomains, endDomains);
        const intermZoomFactors = d3.interpolate(self._zoomFactor, zoomFactor);
        return function(t) {
          self.scale.x.domain([intermDomains(t)[0], intermDomains(t)[1]]);
          self.scale.y.domain([intermDomains(t)[2], intermDomains(t)[3]]);
          self._zoomFactor = intermZoomFactors(t);
          d3.zoomTransform(self.canvas.node('ui')).k = intermZoomFactors(t);

          self.layout.adjustBpScaleRange();

          self.trigger('zoom');
          self.drawFast();
        };
      }).on('start', function() {
        self.trigger('zoom-start');
      }).on('end', function() {
        self.trigger('zoom-end');
        callback ? callback.call() : self.drawFull();
      });
  }

  /**
   * Zoom in on the current bp a factor
   * @param {Number} - Amount to zoom in by [Default: 2]
   */
  zoomIn(factor=2) {
    const bp = utils.constrain(this.canvas.bpForCanvasCenter(), 1, this.sequence.length);
    this.zoomTo(bp, this.zoomFactor * factor);
  }

  /**
   * Zoom out on the current bp a factor
   * @param {Number} - Amount to zoom out by [Default: 2]
   */
  zoomOut(factor=2) {
    const bp = utils.constrain(this.canvas.bpForCanvasCenter(), 1, this.sequence.length);
    this.zoomTo(bp, this.zoomFactor / factor);
  }

  /**
   * Set zoom level to 1 and centers map
   */
  reset(duration = 1000, ease) {
    this.zoomTo(0, 1, {duration, ease});
  }

  /**
   * Recenter the map tracks at the current bp position
   */
  recenterTracks(duration = 0) {
    this.moveTo(this.bp, undefined, {duration});
  }


  _updateZoomMax() {
    if (this._zoom) {
      this._zoom.scaleExtent([this.minZoomFactor, this.maxZoomFactor]);
    }
  };

  // FIXME: Each object must use update API
  /**
   * Inverts the colors of all map elements (e.g. legendItems, backbone, background).
   */
  invertColors() {
    this.settings.update({backgroundColor: this.settings.backgroundColor.invert().rgbaString});

    this.legend.invertColors();
    this.captions().each( (i, caption) => caption.invertColors() );
    this.refreshCanvasLayer();
    this.ruler.invertColors();
    this.dividers.invertColors();
    this.backbone.invertColors();
    this.sequence.invertColors();
    this.annotation.invertColors();
    this.draw();
  }

  /**
   * See [Events.on()](Events.html#on) 
   */
  on(event, callback) {
    this.events.on(event, callback);
  }

  /**
   * See [Events.off()](Events.html#off) 
   */
  off(event, callback) {
    this.events.off(event, callback);
  }

  /**
   * See [Events.trigger()](Events.html#trigger) 
   */
  trigger(event, object) {
    this.events.trigger(event, object);
    // Almost all events will results in data changing with the following exceptions
    const eventsToIgnoreForDataChange = ['viewer-update', 'cgv-json-load', 'bookmarks-shortcut', 'zoom-start', 'zoom', 'zoom-end'];
    if (!this.loading && !eventsToIgnoreForDataChange.includes(event)) {
      // console.log(event, object)
      // Also need to ignore track-update with loadProgress
      // const attributeKeys = object && object.attributes && Object.keys(object.attributes);
      // if ( !(attributeKeys && attributeKeys.length === 1 && attributeKeys[0] === 'loadProgress')) {
      //   this.update({dataHasChanged: true});
      // }
      // Special conditions where we do not want to say dataHasChanged
      // Ignore track-update with loadProgress
      const attributeKeys = object && object.attributes && Object.keys(object.attributes);
      if ( attributeKeys && attributeKeys.length === 1 && attributeKeys[0] === 'loadProgress') {
        // console.log('Skip loadProgress')
        return;
      }
      // Ignore plot-add with SequenceExtracted plots
      if (event === 'plots-add') {
        const plots = object;
        if (plots.every( p => p.extractedFromSequence) ) {
          // console.log('Skip Extracted Plot')
          return;
        }
      }
      if (event === 'tracks-update') {
        const attributes = object && object.attributes;
        if (attributes === undefined) {
          // console.log('Skip track update with no attributes')
          return;
        }
      }
      this.update({dataHasChanged: true});
    }
  }

}

export default Viewer;

