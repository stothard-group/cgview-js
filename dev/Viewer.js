/**
 * @author Jason Grant <jason.grant@ualberta.ca>
 * @version 0.2
 * @requires D3
 */
// +-------------------------------------------------------+
// |             _____________    ___                      |
// |            / ____/ ____/ |  / (_)__ _      __         |
// |           / /   / / __ | | / / / _ \ | /| / /         |
// |          / /___/ /_/ / | |/ / /  __/ |/ |/ /          |
// |          \____/\____/  |___/_/\___/|__/|__/           |
// +-------------------------------------------------------+

const CGView = {};

CGView.version = '0.2';
console.log(`CGView Version: ${CGView.version}`);

if (window.CGV === undefined) window.CGV = CGView;

(function(CGV) {
  /**
   * <br />
   * The *Viewer* is the main container class for CGView. It controls the
   * overal appearance of the map (e.g. width, height, etc).
   * It also contains all the major components of the map (e.g. [Layout](Layout.html),
   * [Sequence](Sequence.html), [Ruler](Ruler.html), etc). Many
   * of component options can be set during construction of the Viewer.
   */
  class Viewer {

    /**
     * Create a viewer
     * @param {String} containerId - The ID (with or without '#') of the element to contain the viewer.
     * @param {Object} options - Options for setting up the viewer. Component
     * options will be passed to the contructor of that component.
     *
     * <br />
     *
     * Name         | Type   | Description
     * -------------|--------|------------
     * width           | Number | Width of viewer in pixels (Default: 600)
     * height          | Number | Height of viewer in pixels (Default: 600)
     * sequence        | Object | [Sequence](Sequence.html) options
     * settings        | Object | [Settings](Settings.html) options
     * legend          | Object | [Legend](Legend.html) options
     * backbone        | Object | [Backbone](Backbone.html) options
     * layout          | Object | [Layout](Layout.html) options
     * ruler           | Object | [Ruler](Ruler.html) options
     * dividers        | Object | [Dividers](Dividers.html) options
     * annotation      | Object | [Annotation](Annotation.html) options
     * highlighter     | Object | [Highlighter](Highlighter.html) options
     *
     */
    constructor(containerId, options = {}) {
      this.containerId = containerId.replace('#', '');
      this._container = d3.select(`#${this.containerId}`);
      // Get options
      this._width = CGV.defaultFor(options.width, 600);
      this._height = CGV.defaultFor(options.height, 600);
      this._wrapper = this._container.append('div')
        .attr('class', 'cgv-wrapper')
        .style('position', 'relative')
        .style('width', `${this.width}px`)
        .style('height', `${this.height}px`);

      // Create map id
      this._id = CGV.randomHexString(40);

      // Create object to contain all CGObjects
      this._objects = {};

      // Initialize containers
      this._features = new CGV.CGArray();
      this._tracks = new CGV.CGArray();
      this._plots = new CGV.CGArray();
      this._captions = new CGV.CGArray();
      this._bookmarks = new CGV.CGArray();

      this._loading = true;

      // Initialize Canvas
      this.canvas = new CGV.Canvas(this, this._wrapper, {width: this.width, height: this.height});

      // Initialize Layout and set the default map format.
      this._layout = new CGV.Layout(this, options.layout);
      this.format = CGV.defaultFor(options.format, 'circular');

      this._zoomFactor = 1;
      this._minZoomFactor = 0.5;

      // Initialize IO
      this.io = new CGV.IO(this);
      // Initialize DragAndDrop
      this.allowDragAndDrop = CGV.defaultFor(options.allowDragAndDrop, true);
      // Initialize Events
      this.events = new CGV.Events();
      // Initialize Sequence
      this._sequence = new CGV.Sequence(this, options.sequence);
      // Initialize Backbone
      this.backbone = new CGV.Backbone(this, options.backbone);
      // this.initializeDragging();
      this.initializeZooming();
      // Initial Event Monitor
      this.eventMonitor = new CGV.EventMonitor(this);
      // Initial Messenger
      this.messenger = new CGV.Messenger(this, options.messenger);
      // Initialize General Setttings
      this.settings = new CGV.Settings(this, options.settings);
      // Initial Legend
      this.legend = new CGV.Legend(this, options.legend);
      // Initialize Slot Divider
      this.dividers = new CGV.Dividers(this, options.dividers);
      // Initialize Annotation
      this.annotation = new CGV.Annotation(this, options.annotation);
      // Initialize Ruler
      this.ruler = new CGV.Ruler(this, options.ruler);
      // Initialize Highlighter
      this.highlighter = new CGV.Highlighter(this, options.highlighter);
      // Initialize Debug
      this.debug = CGV.defaultFor(options.debug, false);

      this.layout.updateScales();

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
     * @member {Number} - Get map id
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
     * @member {Layout} - Get the map layout object.
     */
    get layout() {
      return this._layout;
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
        this._container.append('div')
          // .classed('cp-color-picker-dialog', true)
          .attr('id', `${this.containerId}-color-picker`);
        this._colorPicker = new CGV.ColorPicker(colorPickerId);
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
        this._debug = new CGV.Debug(this, options);
      } else {
        this._debug = undefined;
      }
    }

    /**
     * @member {Sequence} - Get the [Sequence](Sequence.html)
     */
    get sequence() {
      return this._sequence;
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
      console.log('DATA', value)
      this._dataHasChanged = value;
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
     * Returns an [CGArray](CGArray.html) of CGObjects or a single CGObject from all the CGObejcts in the viewer.
     * @param {Undefined} term Returns all objects
     * @param {String}    term Returns the CGObject with a cgvID equal to the string.
     * @param {Array}     term Returns an CGArray of CGObjects with with matching cgvIDs.
     * @return {CGArray|or|CGObject}
     */
    objects(term) {
      if (term === undefined) {
        return this._objects;
      } else if (typeof term === 'string') {
        return this._objects[term];
      } else if (Array.isArray(term)) {
        const array = new CGV.CGArray();
        for (let i = 0, len = term.length; i < len; i++) {
          array.push(this._objects[term[i]]);
        }
        return array;
      } else {
        return new CGV.CGArray();
      }
    }

    /**
     * Returns an [CGArray](CGArray.html) of Slots or a single Slot from all the Slots in the Layout.
     * @param {Integer|String|Array} term - See [CGArray.get](CGArray.html#get) for details.
     * @return {CGArray}
     */
    slots(term) {
      let slots = new CGV.CGArray();
      for (let i = 0, len = this._tracks.length; i < len; i++) {
        slots = slots.concat(this._tracks[i]._slots);
      }
      return slots.get(term);
    }

    /**
     * Returns an [CGArray](CGArray.html) of Features or a single Feature from all the features in the viewer.
     * @param {Integer|String|Array} term - See [CGArray.get](CGArray.html#get) for details.
     * @return {CGArray}
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
      if (!CGV.validate(keys, validKeys)) { return; }

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
     * Returns an [CGArray](CGArray.html) of Tracks or a single Track from all the Tracks in the viewer.
     * @param {Integer|String|Array} term - See [CGArray.get](CGArray.html#get) for details.
     * @return {CGArray}
     */
    tracks(term) {
      return this._tracks.get(term);
    }

    /**
     * Adds tracks to the viewer. See
     */
    addTracks(trackData = []) {
      trackData = CGV.CGArray.arrayerize(trackData);
      const tracks = trackData.map( (data) => new CGV.Track(this, data));

      // Recenter the map tracks if zoomed in if zoomed in
      if (!(this.backbone.visibleRange && this.backbone.visibleRange.overHalfMapLength())) {
        this.recenterTracks();
      }

      this.dirty = true;

      this.trigger('tracks-add', tracks);
      return tracks;
    }

    removeTracks(tracks) {
      tracks = CGV.CGArray.arrayerize(tracks);
      this._tracks = this._tracks.filter( t => !tracks.includes(t) );
      this.layout._adjustProportions();
      // Remove from Objects
      tracks.forEach( t => t.deleteFromObjects() );
      this.trigger('tracks-remove', tracks);
    }


    /**
     * Update track properties to the viewer. If no attribtes are given, the trigger event will still be called.
     */
    updateTracks(tracks, attributes) {
      tracks = CGV.CGArray.arrayerize(tracks);
      if (attributes) {
        // Validate attribute keys
        const keys = Object.keys(attributes);
        const validKeys = ['name', 'position', 'readingFrame', 'strand', 'visible', 'thicknessRatio', 'loadProgress', 'contents'];
        if (!CGV.validate(keys, validKeys)) { return false; }
        const contents = attributes.contents;
        if (contents) {
          // Validate content attribute keys
          const contentKeys = Object.keys(contents);
          const validContentKeys = ['type', 'from', 'extract', 'options'];
          if (!CGV.validate(contentKeys, validContentKeys)) { return false; }
          for (const track of tracks) {
            for (const contentKey of contentKeys) {
              const value = contents[contentKey];
              track.contents[contentKey] = value;
            }
            track.refresh();
          }
          // const {contents, ...modifiedAttributes} = attributes;
          const modifiedAttributes = keys.reduce( (obj, k) => {
            if (k !== 'contents') { obj[k] = attributes[k]; }
            return obj;
          }, {});
          tracks.attr(modifiedAttributes);
        } else {
          tracks.attr(attributes);
        }
      }
      this.trigger('tracks-update', { tracks, attributes });
    }

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
     * Adds Captions to the viewer. See
     */
    addCaptions(captionData = []) {
      captionData = CGV.CGArray.arrayerize(captionData);
      const captions = captionData.map( (data) => new CGV.Caption(this, data));
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
      captions = CGV.CGArray.arrayerize(captions);
      this._captions = this._captions.filter( f => !captions.includes(f) );
      // Update Layers
      this.clear('canvas');
      this.refreshCanvasLayer();
      // Remove from Objects
      captions.forEach( c => c.deleteFromObjects() );

      this.trigger('captions-remove', captions);
    }

    moveCaption(oldIndex, newIndex) {
      this._captions.move(oldIndex, newIndex);
      this.refreshCanvasLayer();
      this.trigger('captions-moved', {oldIndex: oldIndex, newIndex: newIndex});
    }

    /**
     * Returns an [CGArray](CGArray.html) of Plots or a single Plot from all the Tracks in the viewer.
     * @param {Integer|String|Array} term - See [CGArray.get](CGArray.html#get) for details.
     * @return {CGArray}
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
    sources(term) {
      const featureSources = this._features.map( f => f.source );
      const plotSources = this._plots.map( p => p.source );
      const trackSources = this.tracks().
        map(t => t.contents).
        filter( c => c.from === 'source').
        map( c => c.extract ).flat();

      const allSources = featureSources.concat(plotSources).concat(trackSources);
      return new CGV.CGArray([...new Set(allSources)]).get(term);
    }

    updateRecordsWithAttributes(records, attributes, options = {}) {
      const validKeys = options.validKeys;
      const recordClass = options.recordClass;
      // Validate attribute keys
      const attibuteKeys = Object.keys(attributes);
      if (validKeys && !CGV.validate(attibuteKeys, validKeys)) { return; }
      // Validate record Class
      records = CGV.CGArray.arrayerize(records);
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
        if (!CGV.validate(uniqAttributeKeys, validKeys)) { return; }
      }
      // Get records form cgvIDs update keys
      const cgvIDs = new CGV.CGArray(Object.keys(updates));
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
     */
    recordsWithChangedAttributes(attributesOfInterest, records, attributes = {}, updates) {
      records = CGV.CGArray.arrayerize(records);
      let returnedRecords = new CGV.CGArray();
      attributesOfInterest = CGV.CGArray.arrayerize(attributesOfInterest);
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
     * Adds features to the viewer. See
     * // FIXME: for History, we will want to be able to handle passing an array of features
     *           not just feature data. That way they don't have to be reinitialized and they keep the same cgvIDs.
     */
    addFeatures(featureData = []) {
      featureData = CGV.CGArray.arrayerize(featureData);
      const features = featureData.map( (data) => new CGV.Feature(this, data));
      this.annotation.refresh();
      // FIXME: need to update tracks??
      // This causes sequence-based (e.g. orfs) to reload too
      // this.tracks().each( (i,t) => t.refresh() );
      this.trigger('features-add', features);
      return features;
    }

    removeFeatures(features) {
      features = CGV.CGArray.arrayerize(features);
      this._features = this._features.filter( f => !features.includes(f) );
      // Update Annotationa and Tracks
      const labels = features.map( f => f.label );
      this.annotation.removeLabels(labels);
      this.tracks().each( (i, track) => {
        track.removeFeatures(features);
      });
      this.annotation.refresh();
      // Update Contigs
      CGV.Contig.removeFeatures(features);
      // Remove from Objects
      features.forEach( f => f.deleteFromObjects() );

      this.trigger('features-remove', features);
    }

    /**
     * Update feature properties to the viewer.
     */
    updateFeatures(featuresOrUpdates, attributes) {
      const { records: features, updates } = this.updateRecords(featuresOrUpdates, attributes, {
        recordClass: 'Feature',
        validKeys: ['name', 'type', 'contig', 'legendItem', 'source', 'favorite', 'visible', 'strand', 'start', 'stop', 'mapStart', 'mapStop']
      });
      // Refresh tracks if any attribute is source
      let sourceChanged;
      if (featuresOrUpdates.toString() === '[object Object]') {
        const values = Object.values(featuresOrUpdates);
        for (let value of values) {
          if (Object.keys(value).includes('source')) {
            sourceChanged = true;
          }
        }
      } else {
        sourceChanged = attributes && Object.keys(attributes).includes('source');
      }
      if (sourceChanged) {
        for (let track of cgv.tracks()) {
          track.refresh();
        }
      }
      this.trigger('features-update', { features, attributes, updates });
    }

    /**
     * Adds plots to the viewer.
     */
    addPlots(plotData = []) {
      plotData = CGV.CGArray.arrayerize(plotData);
      const plots = plotData.map( (data) => new CGV.Plot(this, data));
      this.annotation.refresh();
      this.trigger('plots-add', plots);
      return plots;
    }

    removePlots(plots) {
      plots = CGV.CGArray.arrayerize(plots);
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
     * Update plot properties to the viewer.
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
     * Returns an [CGArray](CGArray.html) of Bookmarks or a single Bookmark from all the Bookmarks in the viewer.
     * @param {Integer|String|Array} term - See [CGArray.get](CGArray.html#get) for details.
     * @return {CGArray}
     */
    bookmarks(term) {
      return this._bookmarks.get(term);
    }

    /**
     * Adds bookmarks to the viewer...
     */
    addBookmarks(bookmarkData = []) {
      bookmarkData = CGV.CGArray.arrayerize(bookmarkData);
      const bookmarks = bookmarkData.map( (data) => new CGV.Bookmark(this, data));
      this.trigger('bookmarks-add', bookmarks);
      return bookmarks;
    }

    /**
     * Remove bookmarks...
     */
    removeBookmarks(bookmarks) {
      bookmarks = CGV.CGArray.arrayerize(bookmarks);
      this._bookmarks = this._bookmarks.filter( b => !bookmarks.includes(b) );
      // Remove from Objects
      bookmarks.forEach( b => b.deleteFromObjects() );
      this.trigger('bookmarks-remove', bookmarks);
    }

    bookmarkByShortcut(shortcut) {
      return this.bookmarks().find( b => b.shortcut && b.shortcut === `${shortcut}` );
    }

    /**
     * Update bookmark properties to the viewer.
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

    test2MoveTo(start, stop) {
      // TODO: check for visibile range
      const startRange = this.backbone.visibleRange;
      const startBp = startRange.middle;
      const endBp = new CGV.CGRange(this.sequence.mapContig, start, stop).middle;
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
    //     const endBp = new CGV.CGRange(this.sequence, start, stop).middle;
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
        bbOffset = CGV.defaultFor(options.bbOffset, 0),
        duration = CGV.defaultFor(options.duration, 1000),
        ease = CGV.defaultFor(options.ease, d3.easeCubic),
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
            self.trigger('drag');
            self.drawFast();
          };
        }).on('end', function() {
          callback ? callback.call() : self.drawFull();
        });
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
        bbOffset = CGV.defaultFor(options.bbOffset, 0),
        duration = CGV.defaultFor(options.duration, 1000),
        ease = CGV.defaultFor(options.ease, d3.easeCubic),
        callback
      } = options;

      const zoomExtent = self._zoom.scaleExtent();
      zoomFactor = CGV.constrain(zoomFactor, zoomExtent[0], zoomExtent[1]);

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

    /*
     * Set zoom level to 1 and centers map
     */
    reset(duration = 1000, ease) {
      this.zoomTo(0, 1, {duration, ease});
    }

    /*
     * Recenter the map tracks at the current bp position
     */
    recenterTracks(duration = 0) {
      this.moveTo(this.bp, undefined, {duration});
    }

    // FIXME: Each object must use update API
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

    on(event, callback) {
      this.events.on(event, callback);
    }

    off(event, callback) {
      this.events.off(event, callback);
    }

    trigger(event, object) {
      this.events.trigger(event, object);
      // Almost all events will results in data changing with the following exceptions
      const eventsToIgnoreForDataChange = ['viewer-update', 'cgv-json-load', 'drag', 'zoom-start', 'zoom', 'zoom-end'];
      if (!this.loading && !eventsToIgnoreForDataChange.includes(event)) {
        // console.log(event, object)
        this.update({dataHasChanged: true});
      }
    }

  }

  CGV.Viewer = Viewer;
})(CGView);
