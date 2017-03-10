var CGView = {};

CGView.version = '0.1';

if (window.CGV === undefined) window.CGV = CGView;

(function(CGV) {

  /** My main class */
  class Viewer {

    /**
     * Create a viewer
     * @param {string} container_id - The ID of the element to contain the viewer
     */
    constructor(containerId, options = {}) {
      this.containerId = containerId.replace('#', '');
      this._container = d3.select(containerId);
      // Get options
      this._width = CGV.defaultFor(options.width, 600);
      this._height = CGV.defaultFor(options.height, 600);
      this._wrapper = this._container.append('div')
        .attr('class', 'cgv-wrapper')
        .style('position', 'relative')
        .style('width', this.width + 'px')
        .style('height', this.height + 'px');
      this.canvas = new CGV.Canvas(this, this._wrapper, {width: this.width, height: this.height});

      // TODO: move to settings or elsewhere
      this.slotSpacing = CGV.defaultFor(options.slotSpacing, 1);
      this.globalLabel = CGV.defaultFor(options.globalLabel, true);
      this.backgroundColor = options.backgroundColor;

      this._zoomFactor = 1;
      this.debug = CGV.defaultFor(options.debug, false);

      this._features = new CGV.CGArray();
      this._plots = new CGV.CGArray();
      this._captions = new CGV.CGArray();
      this._featureTypes = new CGV.CGArray();

      // Initial IO
      this.io = new CGV.IO(this);
      // Initial Messenger
      this.messenger = new CGV.Messenger(this, options.messenger);
      // Initial Legend
      this.legend = new CGV.Legend(this, options.legend);
      // Initialize Sequence
      this.sequence = new CGV.Sequence(this, options.sequence);
      // Initialize Backbone
      this.backbone = new CGV.Backbone(this, options.backbone);
      // Initialize Slot Divider
      this.slotDivider = new CGV.Divider(this, ( options.dividers && options.dividers.slot ) );
      // Initialize Layout
      this.layout = new CGV.Layout(this, options.layout);
      // Initialize Menu
      this.menu = new CGV.Menu(this);
      // Initialize Help
      this.help = new CGV.Help(this);
      // Initialize LabelSet
      this.labelSet = new CGV.LabelSet(this, options.labelSet);
      // Initialize Ruler
      this.ruler = new CGV.Ruler(this, options.ruler);
      // Initialize Events
      this.initialize_dragging();
      this.initialize_zooming();
      this.eventMonitor = new CGV.EventMonitor(this);

      // this.drawFull();
    }

    //////////////////////////////////////////////////////////////////////////
    // STATIC CLASSS METHODS
    //////////////////////////////////////////////////////////////////////////
    static get debug_sections() {
      return ['time', 'zoom', 'position', 'n'];
    }

    //////////////////////////////////////////////////////////////////////////
    // MEMBERS
    //////////////////////////////////////////////////////////////////////////

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
     * @member {Color} - Get or set the backgroundColor. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
     */
    get backgroundColor() {
      return this._backgroundColor
    }

    set backgroundColor(color) {
      if (color == undefined) {
        this._backgroundColor = new CGV.Color('white');
      } else if (color.toString() == 'Color') {
        this._backgroundColor = color;
      } else {
        this._backgroundColor = new CGV.Color(color);
      }
      this.fillBackground();
    }

    /**
     * @member {Font} - Get or set the label font. When setting the font, a string representing the font or a {@link Font} object can be used. For details see {@link Font}.
     */
    get labelFont() {
      return this.labelSet.font
    }

    set labelFont(value) {
      this.labelSet.font = value;
    }


    // TODO: move to labelset
    /**
     * @member {Number} - Get or set whether or not feature labels should be drawn on the map.
     *                    This value overrides the showLabel attributes in all child elements.
     */
    get globalLabel() {
      return this._globalLabel;
    }

    set globalLabel(value) {
      this._globalLabel = CGV.booleanify(value);
    }

    /**
     * @member {Number} - Get or set the zoom level of the image
     */
    get zoomFactor() {
      return this._zoomFactor;
    }

    set zoomFactor(value) {
      this._zoomFactor = value;
      // TODO: update anything related to zoom
    }

    get scale() {
      return this.canvas.scale
    }

    // TODO: move to layout or settings?
    /**
     * Get or set the max slot thickness.
     */
    get maxSlotThickness() {
      return this._maxSlotThickness;
    }

    set maxSlotThickness(value) {
      this._maxSlotThickness = value;
    }

    get colorPicker() {
      if (this._colorPicker == undefined) {
        // Create Color Picker
        var colorPickerId = this.containerId + '-color-picker';
        this._container.append('div')
          .classed('cp-color-picker-dialog', true)
          .attr('id', this.containerId + '-color-picker');
        this._colorPicker = new CGV.ColorPicker(colorPickerId);
      }
      return this._colorPicker
    }

    get debug() {
      return this._debug;
    }

    set debug(options) {
      if (options) {
        if (options === true) {
          // Select all sections
          options = {};
          options.sections = Viewer.debug_sections;
        }
        this._debug = new CGV.Debug(options);
      } else {
        this._debug = undefined;
      }
    }

    /**
     * This test method reduces the canvas width and height so
     * you can see how the features are reduced (not drawn) as
     * you move the map out of the visible range.
     */
    get _testDrawRange() {
      return this.__testDrawRange;
    }

    set _testDrawRange(value) {
      this.__testDrawRange = value;
      if (value) {
        this.canvas.width = this.canvas.width * 0.4;
        this.canvas.height = this.canvas.height * 0.4;
      } else {
        this.canvas.width = this.canvas.width / 0.4;
        this.canvas.height = this.canvas.height / 0.4;
      }
      this.drawFull();
    }

    //////////////////////////////////////////////////////////////////////////
    // METHODS
    //////////////////////////////////////////////////////////////////////////

    // load_json(json) {
    //   this._io.load_json(json);
    // }

    /**
     * Resizes the the Viewer
     *
     * @param {Number} width - New width
     * @param {Number} height - New height
     * @param {Boolean} keepAspectRatio - If only one of width/height is given the ratio will remain the same. (NOT IMPLEMENTED YET)
     * @param {Boolean} fast -  After resize, should the viewer be draw redrawn fast.
     */
    resize(width, height, keepAspectRatio=true, fast) {
      var canvas = this.canvas;
      this._width = width || this.width;
      this._height = height || this.height;

      this._wrapper
        .style('width', this.width + 'px')
        .style('height', this.height + 'px');

      this.canvas.resize(this.width, this.height)

      this.refreshCaptions();
      this.legend.refresh();

      this.layout._adjustProportions();

      this.draw(fast);
    }


    /**
     * Returns an [CGArray](CGArray.js.html) of Slots or a single Slot from all the Slots in the Layout.
     * @param {Integer|String|Array} term - See [CGArray.get](CGArray.js.html#get) for details.
     * @return {CGArray}
     */
    slots(term) {
      return this.layout.slots(term);
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
      return this.layout.tracks(term);
    }

    /**
     * Returns an [CGArray](CGArray.js.html) of ArcPlots or a single ArcPlot from all the Tracks in the viewer.
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

    /**
     * Returns an [CGArray](CGArray.js.html) of featureTypes or a single featureTypes.
     * @param {Integer|String|Array} term - See [CGArray.get](CGArray.js.html#get) for details.
     * @return {CGArray}
     */
    featureTypes(term) {
      return this._featureTypes.get(term);
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

    /**
     * Return the maximum radius to use for calculating slot thickness when zoomed
     * @return {Number}
     */
    maxZoomedRadius() {
      // return this.minDimension * 1.4; // TODO: need to add up all proportions
      return this.minDimension * 1; // TODO: need to add up all proportions
    }

    fillBackground() {
      this.clear('background');
      var ctx = this.canvas.context('background');
      ctx.fillStyle = this.backgroundColor.rgbaString;
      ctx.fillRect(0, 0, CGV.pixel(this.width), CGV.pixel(this.height));
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

    findFeatureTypeByName(name) {
      return this._featureTypes.find( (i) => { return i.name.toLowerCase() == name.toLowerCase() });
    }

    findFeatureTypeOrCreate(name, decoration = 'arc') {
      var type = this.findFeatureTypeByName(name);
      if (!type) {
        type = new CGV.FeatureType(this, {
          name: name,
          decoration: decoration
        });
      }
      return type
    }

    // Get mouse position in the 'container' taking into account the pixel ratio
    // mouse(container) {
    //   if (container == undefined) {
    //     container = self.canvas
    //   }
    //   return d3.mouse(container).map(function(p) { return CGV.pixel(p); });
    // }


    refreshCaptions() {
      for (var i = 0, len = this._captions.length; i < len; i++) {
        this._captions[i].refresh();
      }
    }

    /**
     * Move the viewer to show the map from the *start* to the *stop* position.
     * If only the *start* position is provided,
     * the viewer will center the image on that bp with the current zoom level.
     *
     * @param {Number} start - The start position in bp
     * @param {Number} stop - The stop position in bp
     */
    moveTo(start, stop) {

    }

  }

  CGV.Viewer = Viewer;

})(CGView);
