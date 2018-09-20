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

      this._initialized = false;

      // Initialize Canvas
      this.canvas = new CGV.Canvas(this, this._wrapper, {width: this.width, height: this.height});

      // Set the map format which will also initialize the Layout
      this.format = CGV.defaultFor(options.format, 'circular');

      // this.backgroundColor = options.backgroundColor;
      this._zoomFactor = 1;
      this._minZoomFactor = 0.5;

      // Initialize IO
      this.io = new CGV.IO(this);
      // Initialize DragAndDrop
      this.allowDragAndDrop = CGV.defaultFor(options.allowDragAndDrop, true);
      // Initialize Sequence
      this._sequence = new CGV.Sequence(this, options.sequence);
      // Initialize Backbone
      this.backbone = new CGV.Backbone(this, options.backbone);
      // Initialize Events
      this.initializeDragging();
      this.initializeZooming();
      this.events = new CGV.Events();
      this.eventMonitor = new CGV.EventMonitor(this);
      // Initial Messenger
      this.messenger = new CGV.Messenger(this, options.messenger);
      // Initialize General Setttings
      this.settings = new CGV.Settings(this, options.settings);
      // Initial Legend
      this.legend = new CGV.Legend(this, options.legend);
      // Initialize Slot Divider
      this.slotDivider = new CGV.Divider(this, ( options.dividers && options.dividers.slot ) );
      // // Initialize Layout
      // this.layout = new CGV.Layout(this, options.layout);
      // Initialize Annotation
      this.annotation = new CGV.Annotation(this, options.annotation);
      // Initialize Ruler
      this.ruler = new CGV.Ruler(this, options.ruler);
      // Initialize Highlighter
      this.highlighter = new CGV.Highlighter(this, options.highlighter);
      // Initialize Debug
      this.debug = CGV.defaultFor(options.debug, false);

      this._initialized = true;

      // this.drawFull();
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

    /**
     * @member {String} - Get or set the map format: circular, linear
     */
    get format() {
      return this.layout.type;
    }

    set format(value) {
      // Determine map center bp before changing layout
      const centerBp = this._layout && this.canvas.bpForCanvasCenter();
      const layoutChanged = Boolean(this._layout && this._layout.type !== value);
      // const oldLayout = this._layout;
      if (value === 'linear') {
        this._layout = new CGV.LayoutLinear(this);
      } else if (value === 'circular') {
        this._layout = new CGV.LayoutCircular(this);
      } else {
        throw 'Format must be one of the following: linear, circular';
      }
      // FIXME
      this.layout.updateScales(layoutChanged, centerBp);
    }

    /**
     * @member {Number} - Get the map layout object.
     */
    get layout() {
      return this._layout;
    }

    /**
     * @member {Number} - Get or set the map name
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
     * @member {Number} - Get or set the zoom level of the image
     */
    get zoomFactor() {
      return this._zoomFactor;
    }

    // FIXME: this should be done by layout?? OR not allowed
    set zoomFactor(value) {
      // this._zoomFactor = value;
      this.layout.zoom(value);
    }

    /**
     * @member {Number} - Get the minimum allowed zoom level
     */
    get minZoomFactor() {
      return this._minZoomFactor;
    }

    /**
     * @member {Number} - Get the maximum allowed zoom level
     */
    get maxZoomFactor() {
      return this.backbone.maxZoomFactor();
    }


    /**
     * @member {Object} - Return the canvas [scales](Canvas.html#scale)
     */
    get scale() {
      return this.canvas.scale;
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
        this._debug = new CGV.Debug(options);
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
     * @member {Number} - Get or set the ability to drag-n-drop JSON files on to viewer
     */
    get allowDragAndDrop() {
      return this._allowDragAndDrop;
    }

    set allowDragAndDrop(value) {
      this._allowDragAndDrop = value;
      if (value) {
        this.io.initializeDragAndDrop();
      } else {
        // console.log('COMONE')
        // d3.select(this.canvas.node('ui')).on('.dragndrop', null);
      }
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

      this.refreshCaptions();
      // Hide Color Picker: otherwise it may disappear off the screen
      this.colorPicker.close();

      this.layout._adjustProportions();

      this.draw(fast);

      this.trigger('resize');
    }

    /**
     * Returns an [CGArray](CGArray.js.html) of CGObjects or a single CGObject from all the CGObejcts in the viewer.
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
     * Returns an [CGArray](CGArray.js.html) of Slots or a single Slot from all the Slots in the Layout.
     * @param {Integer|String|Array} term - See [CGArray.get](CGArray.js.html#get) for details.
     * @return {CGArray}
     */
    // slots(term) {
    //   return this.layout.slots(term);
    // }
    slots(term) {
      let slots = new CGV.CGArray();
      for (let i = 0, len = this._tracks.length; i < len; i++) {
        slots = slots.concat(this._tracks[i]._slots);
      }
      return slots.get(term);
    }

    /**
     * Returns an [CGArray](CGArray.js.html) of Features or a single Feature from all the features in the viewer.
     * @param {Integer|String|Array} term - See [CGArray.get](CGArray.js.html#get) for details.
     * @return {CGArray}
     */
    features(term) {
      return this._features.get(term);
    }

    /**
     * Returns an [CGArray](CGArray.js.html) of Tracks or a single Track from all the Tracks in the viewer.
     * @param {Integer|String|Array} term - See [CGArray.get](CGArray.js.html#get) for details.
     * @return {CGArray}
     */
    tracks(term) {
      // return this.layout.tracks(term);
      return this._tracks.get(term);
    }

    removeTrack(track) {
      this._tracks = this._tracks.remove(track);
      this.layout._adjustProportions();
    }

    /**
     * Returns an [CGArray](CGArray.js.html) of Plots or a single Plot from all the Tracks in the viewer.
     * @param {Integer|String|Array} term - See [CGArray.get](CGArray.js.html#get) for details.
     * @return {CGArray}
     */
    plots(term) {
      return this._plots.get(term);
    }

    /**
     * Returns an [CGArray](CGArray.js.html) of Captions or a single Caption.
     * @param {Integer|String|Array} term - See [CGArray.get](CGArray.js.html#get) for details.
     * @return {CGArray}
     */
    captions(term) {
      return this._captions.get(term);
    }

    visibleCaptions(term) {
      // let filtered = this._captions.filter( (i) => { return i.visible });
      // return new CGV.CGArray(filtered).get(term)
      return this._captions.filter( i => i.visible ).get(term);
    }

    /**
     * Returns an [CGArray](CGArray.js.html) of Feature/Plot Source name or a single item.
     * @param {Integer|String|Array} term - See [CGArray.get](CGArray.js.html#get) for details.
     * @return {CGArray}
     */
    sources(term) {
      const featureSources = this._features.map( f => f.source );
      const plotSources = this._plots.map( p => p.source );
      const allSources = featureSources.concat(plotSources);
      return new CGV.CGArray([...new Set(allSources)]).get(term);
    }

    removeFeatures(features) {
      features = (features.toString() === 'CGArray') ? features : new CGV.CGArray(features);
      // this._features = new CGV.CGArray(
      //   this._features.filter( (f) => { return !features.includes(f) })
      // );
      this._features = this._features.filter( f => !features.includes(f) );
      const labels = features.map( f => f.label );
      this.annotation.removeLabels(labels);
      this.tracks().each( (i, track) => {
        track.removeFeatures(features);
      });
    }

    removePlots(plots) {
      for (let i = 0, len = plots.length; i < len; i++) {
        plots[i].remove();
      }
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

    // #<{(|*
    //  * Return the maximum radius to use for calculating slot thickness when zoomed
    //  * @return {Number}
    //  |)}>#
    // maxZoomedRadius() {
    //   return this.minDimension;
    // }

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

    refreshCaptions() {
      for (let i = 0, len = this._captions.length; i < len; i++) {
        this._captions[i].refresh();
      }
      this.legend.refresh();
    }

    test2MoveTo(start, stop) {
      // TODO: check for visibile range
      const startRange = this.backbone.visibleRange;
      const startBp = startRange.middle;
      const endBp = new CGV.CGRange(this.sequence, start, stop).middle;
      const startEndLength = Math.abs(endBp - startBp);

      const zoomScale = d3.scalePow()
        .exponent(5)
      // let zoomScale = d3.scaleLinear()
        .domain([1, this.sequence.length / 4])
        .range([this.backbone.maxZoomFactor(), 1]);

      const zoomThrough = zoomScale(startEndLength);

      this.testMoveTo(start, stop, {zoomThrough: zoomThrough});
    }

    testMoveTo(start, stop, options = {}) {
      const duration = options.duration || 1000;
      const ease = options.ease || d3.easeCubic;
      const zoomThrough = options.zoomThrough;
      const zoomFactor = this.zoomFactor;

      if (zoomThrough && zoomThrough <= zoomFactor) {
        const startRange = this.backbone.visibleRange;
        const startBp = startRange.middle;
        const endBp = new CGV.CGRange(this.sequence, start, stop).middle;
        let startEndLength = Math.abs(endBp - startBp);
        let middleBp;
        if ( startEndLength < (this.sequence.length / 2) ) {
          middleBp = Math.min(startBp, endBp) + (startEndLength / 2);
        } else {
          startEndLength = this.sequence.length - startEndLength;
          middleBp = this.sequence.addBp( Math.max(startBp, endBp), startEndLength );
        }
        this.zoomTo(middleBp, zoomThrough, duration, d3.easePolyOut.exponent(5), () => {
          this.moveTo(start, stop, duration, d3.easePolyIn.exponent(5));
        });
      } else {
        this.moveTo(start, stop, duration, ease);
      }
    }

    /**
     * Move the viewer to show the map from the *start* to the *stop* position.
     * If only the *start* position is provided,
     * the viewer will center the image on that bp with the current zoom level.
     *
     * @param {Number} start - The start position in bp
     * @param {Number} stop - The stop position in bp
     * @param {Number} duration - The animation duration in milliseconds [Default: 1000]
     * @param {Object} ease - The d3 animation ease [Default: d3.easeCubic]
     */
    // FIXME: add callback like zoomTo
    moveTo(start, stop, duration = 1000, ease) {
      if (stop) {
        const bpLength = this.sequence.lengthOfRange(start, stop);
        const bp = this.sequence.addBp(start, bpLength / 2);
        // Use viewer width as estimation arc length
        const arcLength = this.width;
        const zoomedRadius = arcLength / (bpLength / this.sequence.length * Math.PI * 2);
        const zoomFactor = zoomedRadius / this.backbone.radius;
        this.zoomTo(bp, zoomFactor, duration, ease);
      } else {
        this._moveTo(start, duration, ease);
      }
    }

    _moveTo(bp, duration = 1000, ease) {
      const self = this;
      ease = ease || d3.easeCubic;
      const domainX = this.scale.x.domain();
      const domainY = this.scale.y.domain();
      const halfWidth = Math.abs(domainX[1] - domainX[0]) / 2;
      const halfHeight = Math.abs(domainY[1] - domainY[0]) / 2;

      const radius = this.backbone.zoomedRadius;
      const radians = this.scale.bp(bp);
      const x = radius * Math.cos(radians);
      const y = -radius * Math.sin(radians);

      const startDomains = [domainX[0], domainX[1], domainY[0], domainY[1]];
      const endDomains = [ x - halfWidth, x + halfWidth, y + halfHeight, y - halfHeight];

      d3.select(this.canvas.node('ui')).transition()
        .duration(duration)
        .ease(ease)
        .tween('move', function() {
          const intermDomains = d3.interpolateArray(startDomains, endDomains);
          return function(t) {
            self.scale.x.domain([intermDomains(t)[0], intermDomains(t)[1]]);
            self.scale.y.domain([intermDomains(t)[2], intermDomains(t)[3]]);
            self.drawFast();
          };
        }).on('end', function() {
          self.drawFull();
        });
    }


    /**
     * Move the viewer to *bp* position at the provided *zoomFactor*.
     * If *bp* is falsy (inc. 0), the map is centered.
     *
     * @param {Number} bp - The position in bp
     * @param {Number} zoomFactor - The zoome level
     */
    zoomTo(bp, zoomFactor, duration = 1000, ease, callback) {
      const self = this;
      ease = ease || d3.easeCubic;

      const zoomExtent = self._zoom.scaleExtent();
      zoomFactor = CGV.constrain(zoomFactor, zoomExtent[0], zoomExtent[1]);

      // Current Domains
      const domainX = this.scale.x.domain();
      const domainY = this.scale.y.domain();

      // Get range
      const halfRangeWidth = this.scale.x.range()[1] / 2;
      const halfRangeHeight = this.scale.y.range()[1] / 2;

      const radius = this.backbone.centerOffset * zoomFactor;
      const radians = this.scale.bp(bp);
      const x = bp ? (radius * Math.cos(radians) ) : 0;
      const y = bp ? (-radius * Math.sin(radians) ) : 0;

      const startDomains = [domainX[0], domainX[1], domainY[0], domainY[1]];
      const endDomains = [ x - halfRangeWidth, x + halfRangeWidth, y + halfRangeHeight, y - halfRangeHeight];

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
      this.zoomTo(0, 1, duration, ease);
    }

    getCurrentBp() {
      const domainX = this.scale.x.domain();
      const domainY = this.scale.y.domain();
      const centerX = ((domainX[1] - domainX[0]) / 2) + domainX[0];
      const centerY = ((domainY[1] - domainY[0]) / 2) + domainY[0];
      return this.canvas.bpForPoint( {x: centerX, y: centerY} );
    }

    moveCaption(oldIndex, newIndex) {
      this._captions.move(oldIndex, newIndex);
      this.refreshCaptions();
    }

    on(event, callback) {
      this.events.on(event, callback);
    }

    off(event, callback) {
      this.events.off(event, callback);
    }

    trigger(event, object) {
      this.events.trigger(event, object);
    }

  }

  CGV.Viewer = Viewer;
})(CGView);
