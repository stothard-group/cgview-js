var CGView = {};

CGView.version = '0.1';

if (window.CGV === undefined) window.CGV = CGView;

(function(CGV) {

  /**
   * <br />
   * The *Viewer* is the main container class for CGView. It controls the
   * overal appearance of the map (e.g. width, height, backgroundColor, etc).
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
     * backgroundColor | Color  | Background [Color](Color.html) of viewer (Default: 'white')
     * sequence        | Object | [Sequence](Sequence.html) options
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
      this._container = d3.select('#' + this.containerId);
      // Get options
      this._width = CGV.defaultFor(options.width, 600);
      this._height = CGV.defaultFor(options.height, 600);
      this._wrapper = this._container.append('div')
        .attr('class', 'cgv-wrapper')
        .style('position', 'relative')
        .style('width', this.width + 'px')
        .style('height', this.height + 'px');

      // Initialize Canvas
      this.canvas = new CGV.Canvas(this, this._wrapper, {width: this.width, height: this.height});

      this.backgroundColor = options.backgroundColor;
      this._zoomFactor = 1;

      this._features = new CGV.CGArray();
      this._plots = new CGV.CGArray();
      this._captions = new CGV.CGArray();
      this._featureTypes = new CGV.CGArray();

      // Initial IO
      this.io = new CGV.IO(this);
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
      // Initial Legend
      this.legend = new CGV.Legend(this, options.legend);
      // Initialize Slot Divider
      this.slotDivider = new CGV.Divider(this, ( options.dividers && options.dividers.slot ) );
      // Initialize Layout
      this.layout = new CGV.Layout(this, options.layout);
      // Initialize Menu
      this.menu = new CGV.Menu(this);
      // Initialize Help
      this.help = new CGV.Help(this);
      // Initialize Annotation
      this.annotation = new CGV.Annotation(this, options.annotation);
      // Initialize Ruler
      this.ruler = new CGV.Ruler(this, options.ruler);
      // Initialize Highlighter
      this.highlighter = new CGV.Highlighter(this, options.highlighter);
      // Initialize Debug
      this.debug = CGV.defaultFor(options.debug, false);

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
     * @member {Number} - Get or set the zoom level of the image
     */
    get zoomFactor() {
      return this._zoomFactor;
    }

    set zoomFactor(value) {
      this._zoomFactor = value;
      // TODO: update anything related to zoom
    }

    /**
     * @member {Object} - Return the canvas [scales](Canvas.html#scale)
     */
    get scale() {
      return this.canvas.scale
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
     * @member {Sequence} - Get the [Sequence](Sequence.html)
     */
    get sequence() {
      return this._sequence;
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
      // this.legend.refresh();

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
      // var ctx = this.canvas.context('background');
      // ctx.fillStyle = this.backgroundColor.rgbaString;
      // ctx.fillRect(0, 0, CGV.pixel(this.width), CGV.pixel(this.height));
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

    refreshCaptions() {
      for (var i = 0, len = this._captions.length; i < len; i++) {
        this._captions[i].refresh();
      }
      this.legend.refresh();
    }

    /**
     * Move the viewer to show the map from the *start* to the *stop* position.
     * If only the *start* position is provided,
     * the viewer will center the image on that bp with the current zoom level.
     *
     * @param {Number} start - The start position in bp
     * @param {Number} stop - The stop position in bp (NOT IMPLEMENTED YET)
     */
    moveTo(start, duration = 1000) {
      var self = this;
      var domainX = this.scale.x.domain();
      var domainY = this.scale.y.domain();
      var halfWidth = Math.abs(domainX[1] - domainX[0]) / 2;
      var halfHeight = Math.abs(domainY[1] - domainY[0]) / 2;

      var radius = CGV.pixel(this.backbone.zoomedRadius);
      var radians = this.scale.bp(start);
      var x = radius * Math.cos(radians);
      var y = -radius * Math.sin(radians);

      var startDomains = [domainX[0], domainX[1], domainY[0], domainY[1]];
      var endDomains = [ x - halfWidth, x + halfWidth, y + halfHeight, y - halfHeight];

      d3.select(this.canvas.node).transition()
        .duration(duration)
        .tween('move', function() {
          var intermDomains = d3.interpolateArray(startDomains, endDomains)
          return function(t) {
            self.scale.x.domain([intermDomains(t)[0], intermDomains(t)[1]]);
            self.scale.y.domain([intermDomains(t)[2], intermDomains(t)[3]]);
            self.drawFast();
          }
        }).on('end', function() { self.drawFull(); });
    }

    getCurrentBp() {
      var domainX = this.scale.x.domain();
      var domainY = this.scale.y.domain();
      var centerX = (domainX[1] - domainX[0]) / 2 + domainX[0];
      var centerY = (domainY[1] - domainY[0]) / 2 + domainY[0];
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
//////////////////////////////////////////////////////////////////////////////
// CGObject
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  cgvID = 0;

  /**
   * The CGObject is the base class of many CGV Classes. In particular, any class that
   * that is drawn on the map will be a subclass of CGObject (e.g. [Track](Track.html),
   * [Slot](Slot.html), [Feature](Feature.html), [Plot](Plot.html), etc).
   */
  class CGObject {

    /**
     * @param {Viewer} viewer - The viewer object.
     * @param {Object} options - 
     * @param {Obejct} meta - 
     */
    constructor(viewer, options = {}, meta = {}) {
      this._viewer = viewer;
      this.meta = CGV.merge(options.meta, meta);
      this.visible = CGV.defaultFor(options.visible, true);
      this._cgvID = generateID();
    }

    /**
     * Return the class name as a string.
     * @return {String} - 'CGObject'
     */
    toString() {
      return 'CGObject';
    }

    get cgvID() {
      return this._cgvID
    }


    /**
     * @member {Viewer} - Get the viewer.
     */
    get viewer() {
      return this._viewer
    }

    /**
     * @member {Canvas} - Get the canvas.
     */
    get canvas() {
      return this.viewer.canvas
    }

    /**
     * @member {Sequence} - Get the sequence.
     */
    get sequence() {
      return this.viewer.sequence
    }

    /**
     * @member {Boolean} - Get or Set the visibility of this object.
     */
    get visible() {
      return this._visible
    }

    set visible(value) {
      this._visible = value;
    }

    /**
     * @member {Boolean} - Get or Set the meta data of this object.
     */
    get meta() {
      return this._meta
    }

    set meta(value) {
      this._meta = value;
    }

  }

  var generateID = function() {
    return 'cgv-id-' + cgvID++;
  }

  CGV.CGObject = CGObject;

})(CGView);
//////////////////////////////////////////////////////////////////////////////
// Annotation
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * Annotation controls the drawing and layout of features labels
   */
  class Annotation extends CGV.CGObject {

    constructor(viewer, options = {}, meta = {}) {
      super(viewer, options, meta);
      this._labels = new CGV.CGArray();
      this.font = CGV.defaultFor(options.font, 'SansSerif, plain, 12');
      this.labelLineLength = CGV.defaultFor(options.labelLineLength, 20);
      this._labelLineMargin = CGV.pixel(10);
      this._labelLineWidth = CGV.pixel(1);
      this.refresh();
      this._visibleLabels = new CGV.CGArray();
      this.color = options.color;
    }

    /**
     * Return the class name as a string.
     * @return {String} - 'Annotation'
     */
    toString() {
      return 'Annotation';
    }

    /**
     * @member {Color} - Get or set the divider color. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
     */
    get color() {
      return this._color
    }

    set color(value) {
      if (value === undefined || value.toString() == 'Color') {
        this._color = value;
      } else {
        this._color = new CGV.Color(value);
      }
    }

    /**
     * @member {Number} - Get or set the label line length.
     */
    get labelLineLength() {
      return this._labelLineLength
    }

    set labelLineLength(value) {
      this._labelLineLength = CGV.pixel(value);
    }

    /**
     * @member {Font} - Get or set the font. When setting the font, a string representing the font or a {@link Font} object can be used. For details see {@link Font}.
     */
    get font() {
      return this._font
    }

    set font(value) {
      if (value.toString() == 'Font') {
        this._font = value;
      } else {
        this._font = new CGV.Font(value);
      }
      this.refreshLabelWidths();
    }

    /**
     * @member {Number} - The number of labels in the set.
     */
    get length() {
      return this._labels.length
    }

    /**
     * Returns an [CGArray](CGArray.js.html) of Labels or a single Label.
     * @param {Integer|String|Array} term - See [CGArray.get](CGArray.js.html#get) for details.
     * @return {CGArray}
     */
    labels(term) {
      return this._labels.get(term)
    }

    /**
     * Add a new label to the set.
     *
     * @param {Label} label - The Label to add to the set.
     */
    addLabel(label) {
      this._labels.push(label);
    }

    /**
     * Remove a label from the set.
     *
     * @param {Label} label - The Label to remove from the set.
     */
    removeLabel(label) {
      this._labels = this._labels.remove(label);
      this.refresh();
    }

    refresh() {
      this._labelsNCList = new CGV.NCList(this._labels, { circularLength: this.sequence.length });
    }

    refreshLabelWidths() {
      var labelFonts = this._labels.map( (i) => { return i.font.css});
      var labelTexts = this._labels.map( (i) => { return i.name});
      var labelWidths = CGV.Font.calculateWidths(this.canvas.context('map'), labelFonts, labelTexts);
      for (var i = 0, len = this._labels.length; i < len; i++) {
        this._labels[i].width = labelWidths[i];
      }
    }

    _calculatePositions(labels) {
      labels = labels || this._labels;
      var visibleRange = this._visibleRange;
      var label, feature, containsStart, containsStop;
      var featureLengthDownStream, featureLengthUpStream;
      var sequence = this.sequence;
      for (var i = 0, len = labels.length; i < len; i++) {
        label = labels[i];
        feature = label.feature;
        containsStart = visibleRange.contains(feature.start);
        containsStop = visibleRange.contains(feature.stop);
        if (containsStart && containsStop) {
          label.bp = feature.start + (feature.length / 2);
        } else if (containsStart) {
          label.bp = feature.range.getStartPlus( sequence.lengthOfRange(feature.start, visibleRange.stop) / 2 );
        } else if (containsStop) {
          label.bp = feature.range.getStopPlus( -sequence.lengthOfRange(visibleRange.start, feature.stop) / 2 );
        } else {
          featureLengthDownStream = sequence.lengthOfRange(visibleRange.stop, feature.stop);
          featureLengthUpStream = sequence.lengthOfRange(feature.start, visibleRange.start);
          label.bp = (featureLengthDownStream / (featureLengthDownStream + featureLengthUpStream) * visibleRange.length) + visibleRange.start;
        }

      }
    }

    // Should be called when
    //  - Labels are added or removed
    //  - Font changes (Annotation or individual label)
    //  - Label name changes
    //  - Zoom level changes
    _calculateLabelRects(labels) {
      labels = labels || this._labels;
      var canvas = this.canvas;
      var scale = canvas.scale;
      var label, feature, radians, bp, x, y;
      var radius = this._outerRadius + this._labelLineMargin;
      for (var i = 0, len = labels.length; i < len; i++) {
        label = labels[i];
        feature = label.feature;
        // bp = feature.start + (feature.length / 2);
        bp = label.bp;
        radians = scale.bp(bp);
        var innerPt = canvas.pointFor(bp, radius);
        var outerPt = canvas.pointFor(bp, radius + this.labelLineLength);
        // Calculate where the label line should attach to Label.
        // The attachemnt point should be the opposite clock position of the feature.
        label.lineAttachment = CGV.clockPositionForAngle(radians + Math.PI);
        var rectOrigin = CGV.rectOriginForAttachementPoint(outerPt, label.lineAttachment, label.width, label.height);
        label.rect = new CGV.Rect(rectOrigin.x, rectOrigin.y, label.width, label.height);
      }
    }

    visibleLabels(radius) {
      var labelArray = new CGV.CGArray();
      // var visibleRange = this._canvas.visibleRangeForRadius(radius);
      var visibleRange = this._visibleRange;
      // FIXME: probably better to store bp values in array and use that to find indices of labels to keep
      if (visibleRange) {
        if (visibleRange.start == 1 && visibleRange.stop == this.sequence.length) {
          labelArray = this._labels;
        } else {
          labelArray = this._labelsNCList.find(visibleRange.start, visibleRange.stop);
        }
      }
      return labelArray
    }

    draw(reverseRadius, directRadius) {
      if (this._labels.length != this._labelsNCList.length) {
        this.refresh();
      }

      this._visibleRange = this.canvas.visibleRangeForRadius(directRadius);

      this._innerRadius = reverseRadius;
      this._outerRadius = directRadius;

      // Find Labels that are within the visible range and calculate bounds
      var possibleLabels = this.visibleLabels(directRadius);
      this._calculatePositions(possibleLabels);
      this._calculateLabelRects(possibleLabels);

      // Remove overlapping labels
      var labelRects = new CGV.CGArray();
      this._visibleLabels = new CGV.CGArray();
      for (var i = 0, len = possibleLabels.length; i < len; i++) {
        label = possibleLabels[i];
        if (!label.rect.overlap(labelRects)) {
          this._visibleLabels.push(label);
          labelRects.push(label.rect);
        }
      }

      // Draw nonoverlapping labels
      var canvas = this.canvas;
      var ctx = canvas.context('map');
      var label, feature, bp, origin;
      ctx.font = this.font.css; // TODO: move to loop, but only set if it changes
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      for (var i = 0, len = this._visibleLabels.length; i < len; i++) {
        label = this._visibleLabels[i];
        feature = label.feature;
        var color = this.color || feature.color;
        canvas.radiantLine('map', label.bp, directRadius + this._labelLineMargin, this.labelLineLength, this._labelLineWidth, color.rgbaString);
        ctx.fillStyle = color.rgbaString;
        ctx.fillText(label.name, label.rect.x, label.rect.y);
      }

      if (this.viewer.debug && this.viewer.debug.data.n) {
        this.viewer.debug.data.n['labels'] = this._visibleLabels.length;
      }
    }


  }

  CGV.Annotation = Annotation;

})(CGView);


//////////////////////////////////////////////////////////////////////////////
// Backbone
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * The CGView Backbone is the ring that separates the direct and reverse slots
   * of the map. All the slot thicknesses are measures in relation to the backbone
   * radius.
   */
  class Backbone extends CGV.CGObject {

    /**
     * Create a Backbone
     *
     * @param {Viewer} viewer - The viewer that contains the backbone
     * @param {Object} options - Options and stuff
     */
    constructor(viewer, options = {}, meta = {}) {
      super(viewer, options, meta);
      var defaultRadius = d3.min([this.viewer.width, this.viewer.height]) * 0.4;
      this.radius = CGV.defaultFor(options.radius, defaultRadius);
      this.color = CGV.defaultFor(options.color, 'grey');
      this.font = CGV.defaultFor(options.font, 'sans-serif, plain, 14');
      this.fontColor = CGV.defaultFor(options.fontColor, 'black');
      this.thickness = CGV.defaultFor(options.thickness, 5);
      this._bpThicknessAddition = 0;
      this.bpMargin = 4;
    }

    /**
     * Return the class name as a string.
     * @return {String} - 'Backbone'
     */
    toString() {
      return 'Backbone';
    }

    /**
     * @member {Color} - Get or set the backbone color. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
     */
    get color() {
      return this._color
    }

    set color(value) {
      if (value.toString() == 'Color') {
        this._color = value;
      } else {
        this._color = new CGV.Color(value);
      }
    }

    /**
     * @member {Color} - Get or set the sequence color. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
     */
    get fontColor() {
      return this._fontColor
    }

    set fontColor(value) {
      if (value.toString() == 'Color') {
        this._fontColor = value;
      } else {
        this._fontColor = new CGV.Color(value);
      }
    }

    /**
     * @member {Font} - Get or set sequence font. When setting the font, a string representing the font or a {@link Font} object can be used. For details see {@link Font}.
     */
    get font() {
      return this._font
    }

    set font(value) {
      if (value.toString() == 'Font') {
        this._font = value;
      } else {
        this._font = new CGV.Font(value);
      }
      this.bpSpacing = this.font.size;
    }

    /**
     * @member {Number} - Set or get the backbone radius. This is the unzoomed radius.
     */
    set radius(value) {
      if (value) {
        this._radius = value;
        this.viewer._updateZoomMax();
      }
    }

    get radius() {
      return this._radius
    }

    /**
     * @member {Number} - Get the zoomed backbone radius. This is the radius * zoomFacter
     */
    get zoomedRadius() {
      return this.radius * this.viewer._zoomFactor
    }

    /**
     * @member {Number} - Set or get the backbone thickness. This is the unzoomed thickness.
     */
    set thickness(value) {
      if (value) {
        this._thickness = value;
        this.viewer.layout && this.viewer.layout._adjustProportions();
      }
    }

    get thickness() {
      return this._thickness
    }

    /**
     * @member {Number} - Get the zoomed backbone thickness.
     */
    get zoomedThickness() {
      return Math.min(this.zoomedRadius, this.viewer.maxZoomedRadius()) * (this.thickness / this.radius) + (this.bpThicknessAddition / CGV.pixel(1));
    }

    /**
     * @member {Number} - Maximum thickness the backbone should become to allow viewing of the sequence
     */
    get maxThickness() {
      return this.bpSpacing * 2 + (this.bpMargin * 4);
    }

    /**
     * @member {Number} - Get or set the basepair spacing.
     */
    get bpSpacing() {
      return this._bpSpacing
    }

    set bpSpacing(value) {
      this._bpSpacing = value;
      this.viewer._updateZoomMax();
    }

    /**
     * @member {Number} - Get or set the margin around sequence letters.
     */
    get bpMargin() {
      return this._bpMargin
    }

    set bpMargin(value) {
      // this._bpMargin = CGV.pixel(value);
      this._bpMargin = value;
    }

    /**
     * A factor used to increase backbone thickness when approaching the ability to see BP.
     * @member {number}
     */
    get bpThicknessAddition() {
      return this._bpThicknessAddition
    }

    /**
     * The visible range
     * @member {Range}
     */
    get visibleRange() {
      return this._visibleRange
    }

    /**
     * The maximum zoom factor to get the correct spacing between basepairs.
     * @return {Number}
     */
    maxZoomFactor() {
      return (this.sequence.length * this.bpSpacing) / (2 * Math.PI * this.radius);
    }

    /**
     * The number of pixels per basepair along the backbone circumference.
     * @return {Number}
     */
    pixelsPerBp() {
      return CGV.pixel( (this.zoomedRadius * 2 * Math.PI) / this.sequence.length );
    }

    _drawSequence() {
      var ctx = this.canvas.context('map');
      var scale = this.canvas.scale;
      var radius = CGV.pixel(this.zoomedRadius);
      var range = this.visibleRange
      var seq, complement;
      if (range) {
        if (this.sequence.seq) {
          seq = this.sequence.forRange(range);
          complement = CGV.Sequence.complement(seq);
        } else {
          seq = this._emptySequence(range.length);
          complement = this._emptySequence(range.length);
        }
        var bp = range.start;
        ctx.save();
        ctx.fillStyle = this.fontColor.rgbaString;
        ctx.font = this.font.css;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var radiusDiff = this.bpSpacing / 2 + this.bpMargin;
        for (var i = 0, len = range.length; i < len; i++) {
          var origin = this.canvas.pointFor(bp, radius + radiusDiff);
          ctx.fillText(seq[i], origin.x, origin.y);
          var origin = this.canvas.pointFor(bp, radius - radiusDiff);
          ctx.fillText(complement[i], origin.x, origin.y);
          bp++;
        }
        ctx.restore();
      }
    }

    _emptySequence(length) {
      // ES6
      // return '•'.repeat(length);
      return Array(length + 1).join('•')
    }

    draw() {
      this._visibleRange = this.canvas.visibleRangeForRadius( CGV.pixel(this.zoomedRadius), 100);
      if (this.visibleRange) {
        this.viewer.canvas.drawArc('map', this.visibleRange.start, this.visibleRange.stop, CGV.pixel(this.zoomedRadius), this.color.rgbaString, CGV.pixel(this.zoomedThickness));
        if (this.pixelsPerBp() > 1) {
          var zoomedThicknessWithoutAddition = Math.min(this.zoomedRadius, this.viewer.maxZoomedRadius()) * (this.thickness / this.radius);
          var zoomedThickness = this.zoomedThickness;
          var addition = this.pixelsPerBp() * 2;
          if ( (zoomedThicknessWithoutAddition + addition ) >= this.maxThickness) {
            this._bpThicknessAddition = this.maxThickness - zoomedThicknessWithoutAddition;
          } else {
            this._bpThicknessAddition = addition;
          }
          if (this.pixelsPerBp() >= (this.bpSpacing - this.bpMargin)) {
            this._drawSequence();
          // } else if (this.pixelsPerBp() > 4) {
          //   this._drawSequenceDots();
          }
        } else {
          this._bpThicknessAddtion = 0
        }
      }
    }


  }

  CGV.Backbone = Backbone;

})(CGView);


//////////////////////////////////////////////////////////////////////////////
// Canvas
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class Canvas {

    /**
     * - Adds several layers (canvases) for drawing
     * - Contains the x, y, bp scales
     * - has methods for for determining visible regions of the circle at a particular radius
     * NOTE: anything drawn to the canvas must take the pixel ratio into account
     *       and should use the CGV.pixel() method.
     * - TODO: Have image describing the circle (center at 0,0) and how it relates to the canvas
     */
    constructor(viewer, container, options = {}) {
      this._viewer = viewer;
      this.width = CGV.defaultFor(options.width, 600);
      this.height = CGV.defaultFor(options.height, 600);

      // Create layers
      this.determinePixelRatio(container);
      this._layerNames = ['background', 'map', 'captions', 'ui'];
      this._layers = this.createLayers(container, this._layerNames, this._width, this._height);

      // Setup scales
      this._scale = {};
      this.refreshScales();
    }

    determinePixelRatio(container) {
      var testNode = container.append("canvas")
        .style('position',  'absolute')
        .style('top',  0)
        .style('left',  0)
        .attr("width", this._width)
        .attr("height", this._height).node();
      // Check for canvas support
      if (testNode.getContext) {
        // Get pixel ratio and upscale canvas depending on screen resolution
        // http://www.html5rocks.com/en/tutorials/canvas/hidpi/
        CGV.pixelRatio = CGV.getPixelRatio(testNode);
      } else {
        container.html('<h3>CGView requires Canvas, which is not supported by this browser.</h3>');
      }
      d3.select(testNode).remove();
    }

    createLayers(container, layerNames, width, height) {
      var layers = {};

      for (var i = 0, len = layerNames.length; i < len; i++) {
        var layerName = layerNames[i]
        var zIndex = (i + 1) * 10;
        var node = container.append("canvas")
          .classed('cgv-layer', true)
          .classed('cgv-layer-' + layerName, true)
          .style('z-index',  zIndex)
          .attr("width", width)
          .attr("height", height).node();

        CGV.scaleResolution(node, CGV.pixelRatio);

        // Set viewer context
        var ctx = node.getContext('2d');
        layers[layerName] = { ctx: ctx, node: node };
      }
      return layers
    }

    resize(width, height) {
      this.width = width;
      this.height = height;
      for (var layerName of this.layerNames) {
        var layerNode = this.layers(layerName).node;
        // Note, here the width/height will take into account the pixelRatio
        layerNode.width = this.width;
        layerNode.height = this.height;
        // Note, here the width/height will be the same as viewer (no pixel ratio)
        layerNode.style.width = width + 'px';
        layerNode.style.height = height + 'px';
      }
      this.refreshScales();
    }









    /**
     * @member {Viewer} - Get the viewer.
     */
    get viewer() {
      return this._viewer
    }

    /**
     * @member {Object} - Return an object that contains the 3 [D3 Continuous Scales](https://github.com/d3/d3-scale#continuous-scales) used by CGView.
     *
     * Scale | Description
     * ------|------------
     *  x    | Convert between the canvas x position (0 is left side of canvas) and map x position (center of circle).
     *  y    | Convert between the canvas y position (0 is top side of canvas) and map y position (center of circle).
     *  bp   | Convert between bp and radians (Top of map is 1 bp and -π/2).
     *
     * ```js
     * // Examples:
     * // For a map with canvas width and height of 600. Before moving or zooming the map.
     * canvas.scale.x(0)          // 300
     * canvas.scale.y(0)          // 300
     * canvas.scale.x.invert(300) // 0
     * canvas.scale.y.invert(300) // 0
     * // For a map with a length of 1000
     * canvas.scale.bp(1)        // -π/2
     * canvas.scale.bp(250)      // 0
     * canvas.scale.bp(500)      // π/2
     * canvas.scale.bp(750)      // π
     * canvas.scale.bp(1000)     // 3π/2
     * canvas.scale.bp(1000)     // 3π/2
     * canvas.scale.bp.invert(π) // 750
     * ```
     *
     */
    get scale() {
      return this._scale
    }

    /**
     * @member {Array} - Get the names of the layers.
     */
    get layerNames() {
      return this._layerNames
    }

    /**
     * @member {Sequence} - Get the sequence.
     */
    get sequence() {
      return this.viewer.sequence
    }

    //TODO: move to setter for width and height
    refreshScales() {
      var x_domain, y_domain;
      var x1, x2, y1, y2;
      // Save scale domains to keep tract of translation
      if (this.scale.x) {
        var orig_x_domain = this.scale.x.domain();
        var orig_width = orig_x_domain[1] - orig_x_domain[0];
        x1 = orig_x_domain[0] / orig_width;
        x2 = orig_x_domain[1] / orig_width;
      } else {
        x1 = -0.5;
        x2 = 0.5;
      }
      if (this.scale.y) {
        var orig_y_domain = this.scale.y.domain();
        var orig_width = orig_y_domain[0] - orig_y_domain[1];
        y1 = orig_y_domain[0] / orig_width;
        y2 = orig_y_domain[1] / orig_width;
      } else {
        y1 = 0.5;
        y2 = -0.5;
      }
      this.scale.x = d3.scaleLinear()
        .domain([this.width * x1, this.width * x2])
        .range([0, this.width]);
      this.scale.y = d3.scaleLinear()
        .domain([this.height * y1, this.height * y2])
        .range([0, this.height]);
    }

    get width() {
      return CGV.pixel(this._width)
    }

    set width(width) {
      this._width = width;
    }

    get height() {
      return CGV.pixel(this._height)
    }

    set height(height) {
      this._height = height;
    }

    get cursor() {
      return d3.select(this.node('ui')).style('cursor')
    }

    set cursor(value) {
      d3.select(this.node('ui')).style('cursor', value);
    }

    /**
     * Clear the viewer canvas
     */
    clear(layerName = 'map') {
      if (layerName == 'all') {
        for (var i = 0, len = this.layerNames.length; i < len; i++) {
          this.clear(this.layerNames[i]);
        }
      } else if (layerName == 'background') {
        var ctx = this.context('background');
        ctx.clearRect(0, 0, CGV.pixel(this.width), CGV.pixel(this.height));
        ctx.fillStyle = this.viewer.backgroundColor.rgbaString;
        ctx.fillRect(0, 0, CGV.pixel(this.width), CGV.pixel(this.height));
      } else {
        this.context(layerName).clearRect(0, 0, CGV.pixel(this.width), CGV.pixel(this.height));
      }
    }
    // clear(color = 'white') {
    //   this.ctx.clearRect(0, 0, CGV.pixel(this.width), CGV.pixel(this.height));
    //   // this.ctx.fillStyle = color;
    //   // this.ctx.fillRect(0, 0, CGV.pixel(this.width), CGV.pixel(this.height));
    // }

    /**
    * Flash a message on the center of the viewer.
    */
    // flash(msg) {
    //   var ctx = this.ctx;
    //   // this.ctx.font = this.adjust_font(1.5);
    //   ctx.textAlign = 'center';
    //   ctx.textBaseline = 'center';
    //   var x = this.width / 2
    //   var y = this.height / 2
    //   ctx.fillText(msg, x, y);
    // }

    // Decoration: arc, clockwise-arrow, counterclockwise-arrow
    //
    //  clockwise-arrow (drawn clockwise from arcStartBp; direction = 1):
    //
    //    arcStartBp (feature start)      arcStopBp
    //           |                        |
    //           --------------------------  arrowTipBp
    //           |                          \|
    //           |                           x - arrowTipPt (feature stop)
    //           |                          /
    //           -------------------------x
    //                                    |
    //                                    innerArcStartPt
    //
    //  counterclockwise-arrow (drawn counterclockwise from arcStartBp; direction = -1):
    //
    //                arcStopBp                      arcStartBp (feature stop)
    //                       |                        |
    //           arrowTipBp   -------------------------
    //                    | /                         |
    //       arrowTipPt - x                           |
    //  (feature start)    \                          |
    //                       x-------------------------
    //                       |
    //                       innerArcStartPt
    //
    // If the zoomFactor gets too large, the arc drawing becomes unstable.
    // (ie the arc wiggle in the map as zooming)
    // So when the zoomFactor is large, switch to drawing lines (arcPath handles this).
    drawArc(layer, start, stop, radius, color = '#000000', width = 1, decoration = 'arc') {
      var scale = this.scale;
      var ctx = this.context(layer);

      if (decoration == 'arc') {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        this.arcPath(layer, radius, start, stop);
        ctx.stroke();
      }

      // Looks like we're drawing an arrow
      if (decoration != 'arc') {
        // Determine Arrowhead length
        // Using width which changes according zoom factor upto a point
        var arrowHeadLengthPixels = width / 2;
        var arrowHeadLengthBp = arrowHeadLengthPixels / this.pixelsPerBp(radius);

        // If arrow head length is longer than feature length, adjust start and stop
        var featureLength = this.sequence.lengthOfRange(start, stop);
        if ( featureLength < arrowHeadLengthBp ) {
          var middleBP = start + ( featureLength / 2 );
          start = middleBP - arrowHeadLengthBp / 2;
          stop = middleBP + arrowHeadLengthBp / 2;
        }

        // Set up drawing direction
        var arcStartBp = (decoration == 'clockwise-arrow') ? start : stop;
        var arrowTipBp = (decoration == 'clockwise-arrow') ? stop : start;
        var direction = (decoration == 'clockwise-arrow') ? 1 : -1;

        // Calculate important points
        var halfWidth = width / 2;
        var arcStopBp = arrowTipBp - (direction * arrowHeadLengthBp);
        var arrowTipPt = this.pointFor(arrowTipBp, radius);
        var innerArcStartPt = this.pointFor(arcStopBp, radius - halfWidth);

        // Draw arc with arrow head
        ctx.beginPath();
        ctx.fillStyle = color;
        this.arcPath(layer, radius + halfWidth, arcStartBp, arcStopBp, direction == -1);
        ctx.lineTo(arrowTipPt.x, arrowTipPt.y);
        ctx.lineTo(innerArcStartPt.x, innerArcStartPt.y);
        this.arcPath(layer, radius - halfWidth, arcStopBp, arcStartBp, direction == 1, 'noMoveTo');
        ctx.closePath();
        ctx.fill();
      }

    }

    /**
     * The method add an arc to the path. However, if the zoomFactor is very large,
     * the arc is added as a straight line.
     */
    arcPath(layer, radius, startBp, stopBp, anticlockwise=false, startType='moveTo') {
      var ctx = this.context(layer);
      var scale = this.scale;

      // Features less than 1000th the length of the sequence are drawn as straight lines
      var rangeLength = anticlockwise ? this.sequence.lengthOfRange(stopBp, startBp) : this.sequence.lengthOfRange(startBp, stopBp);
      if ( rangeLength < (this.sequence.length / 1000)) {
        var p2 = this.pointFor(stopBp, radius);
        if (startType == 'lineTo') {
          var p1 = this.pointFor(startBp, radius);
          ctx.lineTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
        } else if (startType == 'moveTo') {
          var p1 = this.pointFor(startBp, radius);
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
        } else if (startType == 'noMoveTo'){
          ctx.lineTo(p2.x, p2.y);
        }
      } else {
        ctx.arc(scale.x(0), scale.y(0), radius, scale.bp(startBp), scale.bp(stopBp), anticlockwise);
      }
    }

    // drawArc(start, stop, radius, color = '#000000', width = 1) {
    //   var scale = this.scale;
    //   var ctx = this.ctx;
    //   ctx.beginPath();
    //   ctx.strokeStyle = color;
    //   ctx.lineWidth = width;
    //   ctx.arc(scale.x(0), scale.y(0), radius, scale.bp(start), scale.bp(stop), false);
    //   ctx.stroke();
    // }

    radiantLine(layer, bp, radius, length, lineWidth = 1, color = 'black') {
      var innerPt = this.pointFor(bp, radius);
      var outerPt = this.pointFor(bp, radius + length);
      // var ctx = this.ctx;
      var ctx = this.context(layer);

      ctx.beginPath();
      ctx.moveTo(innerPt.x, innerPt.y);
      ctx.lineTo(outerPt.x, outerPt.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }


    pointFor(bp, radius) {
      var radians = this.scale.bp(bp);
      var x = this.scale.x(0) + radius * Math.cos(radians);
      var y = this.scale.y(0) + radius * Math.sin(radians);
      return {x: x, y: y}
    }

    bpForPoint(point) {
      return Math.round( this.scale.bp.invert( CGV.angleFromPosition(point.x, point.y) ) )
    }

    visibleRangesForRadius(radius, margin = 0) {
      var angles = CGV.circleAnglesFromIntersectingRect(radius,
        this.scale.x.invert(0 - margin),
        this.scale.y.invert(0 - margin),
        this.width + margin * 2,
        this.height + margin * 2
      )
      return angles.map( (a) => { return Math.round(this.scale.bp.invert(a)) })
    }

    //TODO if undefined, see if radius is visible
    visibleRangeForRadius(radius, margin = 0) {
      var ranges = this.visibleRangesForRadius(radius, margin);
      if (ranges.length == 2) {
        // return ranges
        return new CGV.CGRange(this.sequence, ranges[0], ranges[1])
      } else if (ranges.length > 2) {
        // return [ ranges[0], ranges[ranges.length -1] ]
        return new CGV.CGRange(this.sequence, ranges[0], ranges[ranges.length -1])
      } else if ( (radius - margin) > this.maximumVisibleRadius() ) {
        return undefined
      } else if ( (radius + margin) < this.minimumVisibleRadius() ) {
        return undefined
      } else {
        return new CGV.CGRange(this.sequence, 1, this.sequence.length)
      }
      // } else {
      //   return undefined
      // }
    }

    centerVisible() {
      var x = this.scale.x(0);
      var y = this.scale.y(0);
      return (x >= 0 &&
              x <= this.width &&
              y >= 0 &&
              y <= this.height)
    }

    /**
     * Return the distance between the circle center and the farthest corner of the canvas
     */
    maximumVisibleRadius() {
      // Maximum distance on x axis between circle center and the canvas 0 or width
      var maxX = Math.max( Math.abs(this.scale.x.invert(0)), Math.abs(this.scale.x.invert(this.width)) );
      // Maximum distance on y axis between circle center and the canvas 0 or height
      var maxY = Math.max( Math.abs(this.scale.y.invert(0)), Math.abs(this.scale.y.invert(this.height)) );
      // Return the hypotenuse
      return Math.sqrt( maxX * maxX + maxY * maxY)
    }

    minimumVisibleRadius() {
      if (this.centerVisible()) {
        // Center is visible so the minimum radius has to be 0
        return 0
      } else if ( CGV.oppositeSigns(this.scale.x.invert(0), this.scale.x.invert(this.width)) ) {
        // The canvas straddles 0 on the x axis, so the minimum radius is the distance to the closest horizontal line
        return Math.min( Math.abs(this.scale.y.invert(0)), Math.abs(this.scale.y.invert(this.height)))
      } else if ( CGV.oppositeSigns(this.scale.y.invert(0), this.scale.y.invert(this.height)) ) {
        // The canvas straddles 0 on the y axis, so the minimum radius is the distance to the closest vertical line
        return Math.min( Math.abs(this.scale.x.invert(0)), Math.abs(this.scale.x.invert(this.width)))
      } else {
        // Closest corner of the canvas
        // Minimum distance on x axis between circle center and the canvas 0 or width
        var minX = Math.min( Math.abs(this.scale.x.invert(0)), Math.abs(this.scale.x.invert(this.width)) );
        // Minimum distance on y axis between circle center and the canvas 0 or height
        var minY = Math.min( Math.abs(this.scale.y.invert(0)), Math.abs(this.scale.y.invert(this.height)) );
        // Return the hypotenuse
        return Math.sqrt( minX * minX + minY * minY)
      }
    }

    visibleRadii(margin) {
      return {min: this.minimumVisibleRadius(), max: this.maximumVisibleRadius()}
    }

    pixelsPerBp(radius) {
      return ( (radius * 2 * Math.PI) / this.sequence.length );
    }

    /**
     * Return the layer with the specified name (defaults to map layer)
     */
    layers(layer) {
      if (CGV.validate(layer, this._layerNames)) {
        return this._layers[layer]
      } else {
        console.error('Returning map layer by default')
        return this._layers['map']
      }
    }

    /**
     * Return the context for the specified layer (defaults to map layer)
     */
    context(layer) {
      if (CGV.validate(layer, this._layerNames)) {
        return this.layers(layer).ctx
      } else {
        console.error('Returning map layer by default')
        return this.layers('map').ctx
      }
    }

    /**
     * Return the node for the specified layer (defaults to map layer)
     */
    node(layer) {
      if (CGV.validate(layer, this._layerNames)) {
        return this.layers(layer).node
      } else {
        console.error('Returning map layer by default')
        return this.layers('map').node
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
        this.width = this.width * 0.4;
        this.height = this.height * 0.4;
      } else {
        this.width = this.width / 0.4;
        this.height = this.height / 0.4;
      }
      this.viewer.drawFull();
    }


  }

  CGV.Canvas = Canvas;

})(CGView);
//////////////////////////////////////////////////////////////////////////////
// Caption
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * <br />
   * The *Caption* object can be used to add additional annotation to
   * the map. A *Caption* contain one or more [CaptionItem]{@link CaptionItem} elements
   */
  class Caption extends CGV.CGObject {

    /**
     * Create a new Caption.
     *
     * @param {Caption} viewer - The parent *Viewer* for the *Caption*.
     * @param {Object} data - Data used to create the caption.
     *
     *  Option                | Default          | Description
     *  ----------------------|-------------------------------------------------
     *  position              | "upper-right"    | Where to draw the caption. One of "upper-left", "upper-center", "upper-right", "middle-left", "middle-center", "middle-right", "lower-left", "lower-center", or "lower-right".
     *  font                  | "SansSerif,plain,8" | A string describing the font. See {@link Font} for details.
     *  fontColor             | "black"          | A string describing the color. See {@link Color} for details.
     *  textAlignment         | "left"           | *left*, *center*, or *right*
     *  backgroundColor        | Viewer backgroundColor | A string describing the color. See {@link Color} for details.
     *
     * @param {Object=} meta - User-defined key:value pairs to add to the caption.
     */
    constructor(viewer, data = {}, meta = {}) {
      super(viewer, data, meta);
      this.viewer = viewer;
      this._items = new CGV.CGArray();
      this._position = CGV.defaultFor(data.position, 'upper-left');
      this.name = data.name;
      this.backgroundColor = data.backgroundColor;
      this.font = CGV.defaultFor(data.font, 'SansSerif, plain, 8');
      this.fontColor = CGV.defaultFor(data.fontColor, 'black');
      this.textAlignment = CGV.defaultFor(data.textAlignment, 'left');

      if (data.items) {
        data.items.forEach((itemData) => {
          new CGV[this.toString() + 'Item'](this, itemData);
        });
      }
      // FIXME: should be done whenever an item is added
      this.refresh();
    }

    /**
     * Return the class name as a string.
     * @return {String} - 'Caption'
     */
    toString() {
      return 'Caption';
    }

    /**
     * @member {Viewer} - Get or set the *Viewer*
     */
    get viewer() {
      return this._viewer
    }

    set viewer(viewer) {
      if (this.viewer) {
        // TODO: Remove if already attached to Viewer
      }
      this._viewer = viewer;
      viewer._captions.push(this);
    }

    get visible() {
      return this._visible
    }

    set visible(value) {
      super.visible = value;
      this.refresh();
    }

    /**
     * @member {Context} - Get the *Context*
     */
    get ctx() {
      return this.canvas.context('captions')
    }

    /**
     * @member {String} - Alias for getting the position. Useful for querying CGArrays.
     */
    get id() {
      return this.position
    }

    /**
     * @member {String} - Get or set the caption postion. One of "upper-left", "upper-center", "upper-right", "middle-left", "middle-center", "middle-right", "lower-left", "lower-center", or "lower-right".
     */
    get position() {
      return this._position
    }

    set position(value) {
      this._position = value;
      this.refresh();
    }

    /**
     * @member {String} - Get or set the caption name.
     */
    get name() {
      return this._name
    }

    set name(value) {
      this._name = value;
    }

    /**
     * @member {Color} - Get or set the backgroundColor. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
     */
    get backgroundColor() {
      // TODO set to cgview background color if not defined
      return this._backgroundColor
    }

    set backgroundColor(color) {
      // this._backgroundColor.color = color;
      if (color == undefined) {
        this._backgroundColor = this.viewer.backgroundColor;
      } else if (color.toString() == 'Color') {
        this._backgroundColor = color;
      } else {
        this._backgroundColor = new CGV.Color(color);
      }
      this.refresh();
    }

    /**
     * @member {Font} - Get or set the font. When setting the font, a string representing the font or a {@link Font} object can be used. For details see {@link Font}.
     */
    get font() {
      return this._font
    }

    set font(value) {
      if (value.toString() == 'Font'){
        this._font = value;
      } else {
        this._font = new CGV.Font(value);
      }
      this.refresh();
    }

    /**
     * @member {Color} - Get or set the fontColor. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
     */
    get fontColor() {
      return this._fontColor.rgbaString
    }

    set fontColor(value) {
      if (value.toString() == 'Color'){
        this._fontColor = value;
      } else {
        this._fontColor = new CGV.Color(value);
      }
      this.refresh();
    }

    /**
     * @member {String} - Get or set the text alignment. Possible values are *left*, *center*, or *right*.
     */
    get textAlignment() {
      return this._textAlignment
    }

    set textAlignment(value) {
      if ( CGV.validate(value, ['left', 'center', 'right']) ) {
        this._textAlignment = value;
      }
      this.refresh();
    }

    /**
     * @member {CGArray} - Get the *CaptionItems*
     */
    items(term) {
      return this._items.get(term)
    }

    /**
     * @member {CGArray} - Get the *CaptionItems*
     */
    visibleItems(term) {
      var filtered = this._items.filter( (i) => { return i.visible });
      return new CGV.CGArray(filtered).get(term)
    }

    /**
     * Recalculates the *Caption* size and position as well as the width of the child {@link CaptionItem}s.
     */
    // FIXME: should be called when ever a text or font changes
    refresh() {
      // Calculate height of Caption
      // - height of each item; plus space between items (equal to half item height); plus padding (highest item)
      this.clear();
      this.height = 0;
      var maxHeight = 0;
      if (!this._items) { return }
      var visibleItems = this.visibleItems();
      // for (var i = 0, len = this._items.length; i < len; i++) {
      for (var i = 0, len = visibleItems.length; i < len; i++) {
        var captionItem = visibleItems[i];
        var captionItemHeight = captionItem.height;
        this.height += captionItemHeight;
        if (i < len - 1) {
          // Add spacing
          this.height += (captionItemHeight / 2);
        }
        if (captionItemHeight > maxHeight) {
          maxHeight = captionItemHeight;
        }
      }
      this.padding = maxHeight / 2;
      this.height += this.padding * 2;

      // Calculate Caption Width
      this.width = 0;
      var itemFonts = visibleItems.map( (i) => { return i.font.css });
      var itemTexts = visibleItems.map( (i) => { return i.text });
      var itemWidths = CGV.Font.calculateWidths(this.ctx, itemFonts, itemTexts);
      for (var i = 0, len = itemWidths.length; i < len; i++) {
        var item = visibleItems[i];
        // This should only be used for legends
        if (item.drawSwatch) {
          itemWidths[i] += item.height + (this.padding / 2);
        }
        item._width = itemWidths[i];
      }
      this.width = d3.max(itemWidths) + (this.padding * 2);

      this._updateOrigin();
      this.draw();
    }

    _updateOrigin() {
      var margin = CGV.pixel(0);
      var canvasWidth = this.canvas.width;
      var canvasHeight = this.canvas.height;
      var captionWidth = this.width;
      var captionHeight = this.height;

      var position = this.position;
      if (position == 'upper-left') {
        this.originX = margin;
        this.originY = margin;
      } else if (position == 'upper-center') {
        this.originX = (canvasWidth / 2) - (captionWidth / 2);
        this.originY = margin;
      } else if (position == 'upper-right') {
        this.originX = canvasWidth - captionWidth - margin;
        this.originY = margin;
      } else if (position == 'middle-left') {
        this.originX = margin;
        this.originY = (canvasHeight / 2) - (captionHeight / 2);
      } else if (position == 'middle-center') {
        this.originX = (canvasWidth / 2) - (captionWidth / 2);
        this.originY = (canvasHeight / 2) - (captionHeight / 2);
      } else if (position == 'middle-right') {
        this.originX = canvasWidth - captionWidth - margin;
        this.originY = (canvasHeight / 2) - (captionHeight / 2);
      } else if (position == 'lower-left') {
        this.originX = margin;
        this.originY = canvasHeight - captionHeight - margin;
      } else if (position == 'lower-center') {
        this.originX = (canvasWidth / 2) - (captionWidth / 2);
        this.originY = canvasHeight - captionHeight - margin;
      } else if (position == 'lower-right') {
        this.originX = canvasWidth - captionWidth - margin;
        this.originY = canvasHeight - captionHeight - margin;
      }
    }

    moveItem(oldIndex, newIndex) {
      this._items.move(oldIndex, newIndex);
      this.refresh();
    }

    clear() {
      this.ctx.clearRect(this.originX, this.originY, this.width, this.height);
    }

    fillBackground() {
      this.ctx.fillStyle = this.backgroundColor.rgbaString;
      this.ctx.fillRect(this.originX, this.originY, this.width, this.height);
    }

    highlight(color = '#FFB') {
      if (!this.visible) { return }
      // var ctx = this.canvas.context('background');
      // ctx.fillStyle = color;
      // ctx.fillRect(this.originX, this.originY, this.width, this.height);
      var ctx = this.canvas.context('ui');
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'black';
      ctx.strokeRect(this.originX, this.originY, this.width, this.height);
    }

    draw() {
      if (!this.visible) { return }
      var ctx = this.ctx;
      this.fillBackground();
      ctx.textBaseline = 'top';
      for (var i = 0, len = this._items.length; i < len; i++) {
        var captionItem = this._items[i];
        if (!captionItem.visible) { continue }
        var captionItemHeight = captionItem.height;
        ctx.font = captionItem.font.css;
        ctx.textAlign = captionItem.textAlignment;
        // Draw Text Label
        ctx.fillStyle = captionItem.fontColor.rgbaString;
        ctx.fillText(captionItem.text, captionItem.textX(), captionItem.textY());
      }
    }

    remove() {
      var viewer = this.viewer;
      viewer._captions = viewer._captions.remove(this);
      viewer.clear('captions');
      viewer.refreshCaptions();
    }

  }

  CGV.Caption = Caption;

})(CGView);
//////////////////////////////////////////////////////////////////////////////
// CaptionItem
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * <br />
   * A *captionItem* is used to add text to a map *legend*. Individual
   * *Features* and *Plots* can be linked to a *captionItem*, so that the feature
   * or plot color will use the swatchColor of *captionItem*.
   */
  class CaptionItem extends CGV.CGObject {

    /**
     * Create a new CaptionItem. By default a captionItem will use its parent legend font, fontColor and textAlignment.
     *
     * @param {Caption} caption - The parent *Caption* for the *CaptionItem*.
     * @param {Object} data - Data used to create the captionItem:
     *
     *  Option                | Default          | Description
     *  ----------------------|-------------------------------------------------
     *  text                  | ""               | Text to display
     *  drawSwatch            | false            | Should a swatch be drawn beside the text
     *  font                  | Caption font      | A string describing the font. See {@link Font} for details.
     *  fontColor             | Caption fontColor | A string describing the color. See {@link Color} for details.
     *  textAlignment         | Caption textAlignment | *left*, *center*, or *right*
     *  swatchColor           | 'black'          | A string describing the color. See {@link Color} for details.
     *  swatchOpacity         | 1                | A value between 0 and 1.
     *
     * @param {Object=} meta - User-defined key:value pairs to add to the captionItem.
     */
    constructor(parent, data = {}, meta = {}) {
      super(parent.viewer, data, meta);
      this.parent = parent;
      this.meta = CGV.merge(data.meta, meta);
      this._text = CGV.defaultFor(data.text, '');
      this.font = data.font
      this.fontColor = data.fontColor;
      this.textAlignment = data.textAlignment;
      this._initializationComplete = true;
      this.refresh();
    }

    /**
     * Return the class name as a string.
     * @return {String} - 'CaptionItem'
     */
    toString() {
      return 'CaptionItem';
    }

    /**
     * @member {String} - Alias for getting the text. Useful for querying CGArrays.
     */
    get id() {
      return this.text
    }

    /**
     * @member {Caption} - Get the *Caption*
     */
    get caption() {
      return this._parent
    }

    /**
     * @member {Caption|Legend} - Get or set the *Parent*
     */
    get parent() {
      return this._parent
    }

    /**
     * @member {Caption|Legend} - Get or set the *Parent*
     */
    get parent() {
      return this._parent
    }

    set parent(newParent) {
      var oldParent = this.parent;
      this._parent = newParent;
      newParent._items.push(this);
      if (oldParent) {
        // Remove from old caption
        oldParent._items = oldParent._items.remove(this);
        oldParent.refresh();
        newParent.refresh();
      }
    }

    get visible() {
      return this._visible
    }

    set visible(value) {
      super.visible = value;
      this.refresh();
    }


    /**
     * @member {String} - Get or set the text
     */
    get text() {
      return this._text
    }

    set text(text) {
      this._text = text;
      this.refresh();
    }

    /**
     * @member {String} - Alias for text
     */
    get name() {
      return this.text
    }

    set name(value) {
      this.text = value;
    }

    /**
     * @member {String} - Get or set the text alignment. Defaults to the parent *Caption* text alignment. Possible values are *left*, *center*, or *right*.
     */
    get textAlignment() {
      return this._textAlignment || this.parent.textAlignment
    }

    set textAlignment(value) {
      // if (value == undefined) {
      //   this._textAlignment = this.parent.textAlignment;
      // } else {
      //   this._textAlignment = value;
      // }
		 	this._textAlignment = value;
      this.refresh();
    }

    // /**
    //  * @member {Viewer} - Get the *Viewer*.
    //  */
    // get viewer() {
    //   return this._viewer
    // }

    /**
     * @member {Number} - Get the width in pixels.
     */
    get width() {
      return this._width
    }

    /**
     * @member {Number} - Get the height in pixels. This will be the same as the font size.
     */
    get height() {
      return this.font.height
    }

    get swatchWidth() {
      return this.height
    }

    /**
     * @member {Font} - Get or set the font. When setting the font, a string representing the font or a {@link Font} object can be used. For details see {@link Font}.
     */
    get font() {
      return this._font
    }

    set font(value) {
      if (value == undefined) {
        this._font = this.parent.font;
      } else if (value.toString() == 'Font') {
        this._font = value;
      } else {
        this._font = new CGV.Font(value);
      }
      this.refresh();
    }

    /**
     * @member {Color} - Get or set the fontColor. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
     */
    get fontColor() {
      return this._fontColor
    }

    set fontColor(color) {
      if (color == undefined) {
        this._fontColor = this.parent._fontColor;
      } else if (color.toString() == 'Color') {
        this._fontColor = color;
      } else {
        this._fontColor = new CGV.Color(color);
      }
      this.refresh();
    }

    refresh() {
      if (this._initializationComplete) {
        this.parent.refresh();
      }
    }

    textX() {
      var parent = this.parent;
      if (this.textAlignment == 'left') {
        return parent.originX + parent.padding;
      } else if (this.textAlignment == 'center') {
        return parent.originX + (parent.width / 2);
      } else if (this.textAlignment == 'right') {
        return parent.originX + parent.width - parent.padding;
      }
    }

    textY() {
      var parent = this.parent;
      var y = parent.originY + parent.padding;
      var myIndex = parent._items.indexOf(this);
      for (var i = 0, len = parent._items.length; i < len; i++) {
        var captionItem = parent._items[i];
        if (captionItem == this) { break }
        if (!captionItem.visible) { continue }
        y += captionItem.height * 1.5;
      }
      return y
    }

    highlight(color = '#FFB') {
      if (!this.visible || !this.parent.visible) { return }
      // var ctx = this.canvas.context('background');
      // ctx.fillStyle = color;
      // ctx.fillRect(this.textX(), this.textY(), this.width, this.height);
      var ctx = this.canvas.context('ui');
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'black';
      ctx.strokeRect(this.textX(), this.textY(), this.width, this.height);
    }

    remove() {
      var parent = this.parent;
      parent._items = parent._items.remove(this);
      this.viewer.clear('captions');
      this.viewer.refreshCaptions();
      this.viewer.trigger( parent.toString().toLowerCase() + '-update');
    }


  }

  CGV.CaptionItem = CaptionItem;

})(CGView);
//////////////////////////////////////////////////////////////////////////////
// CGArray
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * CGArray is essentially an array for holding CGV Objects. Any method
   * that works directly on an Array (Mutator methods) will work on a CGArray
   * (e.g. pop, push, reverse)
   *
   * If a single array is provided it will be converted to an CGArray.
   * If mulitple elements are provided, they will be added to the new CGArray.
   */
  var CGArray = function() {
    if ( (arguments.length == 1) && (Array.isArray(arguments[0])) ) {
      for (var i = 0, len = arguments[0].length; i < len; i++) {
        this.push(arguments[0][i]);
      }
    } else if (arguments.length > 0) {
      this.push.apply(this, arguments)
    }
  }
  CGArray.prototype = Object.create(Array.prototype);

  /**
   * Return the string 'CGArray'
   * @return {String}
   */
  CGArray.prototype.toString = function() { return 'CGArray' }

  /**
   * Push the elements of the supplied CGArray/Array on to the CGArray.
   * @param {CGArray|Array} cgarray CGArray or Array to add
   * @return {CGArray}
   */
  CGArray.prototype.merge = function(cgarray) {
    for (var i = 0, len = cgarray.length; i < len; i++) {
      this.push(cgarray[i]);
    }
    return this
  };

  /**
   * Change one or more properties of each element of the CGArray.
   * ```javascript
   * my_cgarray.attr(property, value)
   * my_cgarray.attr( {property1: value1, property2: value2} )
   * ```
   *
   * @param {Property|Value} attributes A property name and the new value.
   * @param {Object}     attributes An object properties and their new values.
   * @return {CGArray}
   */
  CGArray.prototype.attr = function(attributes) {
    if ( (arguments.length == 1) && (typeof attributes == 'object') ) {
      var keys = Object.keys(attributes);
      var key_len = keys.length;
      for (var set_i=0, set_len=this.length; set_i < set_len; set_i++) {
        for (var key_i=0; key_i < key_len; key_i++) {
          this[set_i][keys[key_i]] = attributes[keys[key_i]];
        }
      }
    } else if (arguments.length == 2) {
      for (var i=0, len=this.length; i < len; i++) {
        this[i][arguments[0]] = arguments[1];
      }
    } else if (attributes != undefined) {
      throw new Error('attr(): must be 2 arguments or a single object');
    }
    return this;
  }

  /**
   * Call the draw method for each element in the CGArray.
   * See [SVPath.draw](SVPath.js.html#draw) for details
   * @param {} context
   * @param {} scale
   * @param {} fast
   * @param {} calculated
   * @param {} pixel_skip
   * @retrun {CGArray}
   */
  CGArray.prototype.draw = function(context, scale, fast, calculated, pixel_skip) {
    for (var i=0, len=this.length; i < len; i++) {
      this[i].draw(context, scale, fast, calculated, pixel_skip);
    }
    return this;
  }

  /**
   * Iterates through each element of the CGArray and run the callback.
   * In the callback _this_ will refer to the element.
   * ```javascript
   * .each(function(index, element))
   * ```
   *
   * Note: This is slower then a _forEach_ or a _for loop_ directly on the set.
   * @param {Function} callback Callback run on each element of CGArray.
   *   The callback will be called with 2 parameters: the index of the element
   *   and the element itself.
   * @return {CGArray}
   */
  CGArray.prototype.each = function(callback) {
    for (var i = 0, len = this.length; i < len; i++) {
      callback.call(this[i], i, this[i]);
    }
    return this;
  }

  CGArray.prototype.eachFromRange = function(startValue, stopValue, step, callback) {
    var startIndex = CGV.indexOfValue(this, startValue, true);
    var stopIndex = CGV.indexOfValue(this, stopValue, false);
    // This helps reduce the jumpiness of feature drawing with a step 
    // The idea is to alter the start index based on the step so the same
    // indices should be returned. i.e. the indices should be divisible by the step.
    if (startIndex > 0 && step > 1) {
      startIndex += step - (startIndex % step);
    }
    if (stopValue >= startValue) {
      // Return if both start and stop are between values in array
      if (this[startIndex] > stopValue || this[stopIndex] < startValue) { return }
      for (var i = startIndex; i <= stopIndex; i += step) {
        callback.call(this[i], i, this[i]);
      }
    } else {
      // Skip cases where the the start value is greater than the last value in array
      if (this[startIndex] >= startValue) {
        for (var i = startIndex, len = this.length; i < len; i += step) {
          callback.call(this[i], i, this[i]);
        }
      }
      // Skip cases where the the stop value is less than the first value in array
      if (this[stopIndex] <= stopValue) {
        for (var i = 0; i <= stopIndex; i += step) {
          callback.call(this[i], i, this[i]);
        }
      }
    }
    return this;
  }

  CGArray.prototype.countFromRange = function(startValue, stopValue, step) {
    var startIndex = CGV.indexOfValue(this, startValue, true);
    var stopIndex = CGV.indexOfValue(this, stopValue, false);

    if (startValue > this[this.length - 1]) {
      startIndex++;
    }
    if (stopValue < this[0]) {
      stopIndex--;
    }
    if (stopValue >= startValue) {
      return stopIndex - startIndex + 1
    } else {
      return (this.length - startIndex) + stopIndex + 1
    }
  }


  /**
   * Returns true if the CGArray contains the element.
   * @param {Object} element Element to check for
   * @return {Boolean}
   */
  CGArray.prototype.contains = function(element) {
    return (this.indexOf(element) >= 0)
  }

  /**
   * Returns new CGArray with element removed
   * @return {CGArray}
   */
  CGArray.prototype.remove = function(element) {
    var self = this;
    self = new CGArray( self.filter(function(i) { return i != element }) );
    return self;
  }

  /**
   * Return true if the CGArray is empty.
   * @return {Boolean}
   */
  CGArray.prototype.empty = function() {
    return this.length == 0;
  }

  /**
   * Returns true if the CGArray is not empty.
   * @return {Boolean}
   */
  CGArray.prototype.present = function() {
    return this.length > 0;
  }

  /**
   * Move the an item from oldIndex to newIndex.
   * @param {Number} oldIndex - index of element to move
   * @param {Number} newIndex - move element to this index
   */
  CGArray.prototype.move = function(oldIndex, newIndex) {
		if (newIndex >= this.length) {
			var k = newIndex - this.length;
			while ((k--) + 1) {
				this.push(undefined);
			}
		}
		this.splice(newIndex, 0, this.splice(oldIndex, 1)[0]);
		return this
  }



  /**
   * Sorts the CGArray by the provided property name.
   * @param {String} property Property to order each element set by [default: 'center']
   * @param {Boolean} descending Order in descending order (default: false)
   * @return {CGArray}
   */
  CGArray.prototype.order_by = function(property, descending) {
    // Sort by function call
    if (this.length > 0) {

      if (typeof this[0][property] === 'function'){
        this.sort(function(a,b) {
          if (a[property]() > b[property]()) {
            return 1;
          } else if (a[property]() < b[property]()) {
            return -1;
          } else {
            return 0;
          }
        })
      } else {
      // Sort by property
        this.sort(function(a,b) {
          if (a[property] > b[property]) {
            return 1;
          } else if (a[property] < b[property]) {
            return -1;
          } else {
            return 0;
          }
        })
      }
    }
    if (descending) this.reverse();
    return this;
  }

  CGArray.prototype.lineWidth = function(width) {
    for (var i=0, len=this.length; i < len; i++) {
      this[i].lineWidth = width;
    }
    return this;
  }

  /**
   * Retrieve subset of CGArray or an individual element from CGArray depending on term provided.
   * @param {Undefined} term Return full CGArray
   * @param {Integer}   term Return element at that index (base-1)
   * @param {String}    term Return first element with id same as string. If the id starts
   *   with 'path-id-', the first element with that path-id will be returned.
   * @param {Array}     term Return CGArray with elements with matching ids
   * @return {CGArray|or|Element}
   */
  CGArray.prototype.get = function(term) {
    // if (arguments.length == 0) {
    if (term == undefined) {
      return this;
    } else if (Number.isInteger(term)) {
      return this[term-1];
    } else if (typeof term == 'string') {
      if ( term.match(/^cgv-id-/) ) {
        return this.filter(function(element) { return element.cgvID == term; })[0];
      // } else if ( term.match(/^label-id-/) ) {
      //   return this.filter(function(element) { return element.label_id() == term; })[0];
      } else {
        return this.filter(function(element) { return element.id.toLowerCase() == term.toLowerCase(); })[0];
      }
    } else if (Array.isArray(term)) {
      var filtered = this.filter(function(element) { return term.some(function(id) { return element.id == id; }); });
      var cgarray = new CGArray();
      cgarray.push.apply(cgarray, filtered);
      return cgarray;
    } else {
      return new CGArray();
    }
  }

  /**
   * Returns true if set matchs the supplied set. The order does not matter
   * and duplicates are ignored.
   * @param {CGArray}     term CGArray to compare against
   * @return {Boolean}
   */
  CGArray.prototype.equals = function(set) {
    if (set.toString() != 'CGArray' && !Array.isArray(set)) { return false }
    var setA = this.unique();
    var setB = set.unique();
    var equals = true
    if (setA.length != setB.length) {
      return false
    }
    setA.forEach(function(a) {
      if (!setB.contains(a)) {
        equals = false
        return
      }
    })
    return equals
  }

  /**
   * Return new CGArray with no duplicated values.
   * @return {CGArray}
   */
  CGArray.prototype.unique = function() {
    return new CGArray(this.filter( onlyUnique ));
  }

  function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
  }

  // Polyfill for Array
  CGArray.prototype.find = function(predicate) {
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    var list = Object(this);
    var length = list.length >>> 0;
    var thisArg = arguments[1];
    var value;

    for (var i = 0; i < length; i++) {
      value = list[i];
      if (predicate.call(thisArg, value, i, list)) {
        return value;
      }
    }
    return undefined;
  };

  /** @ignore */

  CGV.CGArray = CGArray;

})(CGView);


//////////////////////////////////////////////////////////////////////////////
// CGRange
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * A CGRange contains a start, stop and sequence length. Because the genomes
   * are circular the range start can be bigger than the start. This means the start
   * is before 0 and the stop is after 0.
   * Ranges are always in a clockise direction.
   */
  class CGRange {

    /**
     * Create a CGRange
     *
     * @param {Sequence} sequence - The sequence that contains the range. The sequence provides the sequence length
     * @param {Number} start - The start position.
     * @param {Number} stop - The stop position.
     */
    constructor(sequence, start, stop) {
      this._sequence = sequence;
      this.start = start;
      this.stop = stop;
    }

    /**
     * @member {Sequence} - Get the sequence.
     */
    get sequence() {
      return this._sequence
    }

    /**
     * @member {Number} - Get the sequence length
     */
    get sequenceLength() {
      return this.sequence.length
    }

    /**
     * @member {Number} - Get or set the range start.
     */
    get start() {
      return this._start
    }

    set start(value) {
      this._start = Number(value);
    }

    /**
     * @member {Number} - Get or set the range stop.
     */
    get stop() {
      return this._stop
    }

    set stop(value) {
      this._stop = Number(value);
    }

    /**
     * @member {Number} - Get the length of the range.
     */
    get length() {
      if (this.stop >= this.start) {
        return this.stop - this.start + 1
      } else {
        return this.sequenceLength + (this.stop - this.start) + 1
      } 
    }

    /**
     * @member {Number} - Get the middle of the range.
     */
    get middle() {
      var _middle = this.start + (this.length / 2);
      if (_middle > this.sequenceLength) {
        return (_middle - this.sequenceLength)
      } else {
        return _middle
      }
    }

    /**
     * Return true if the range length is over half the length of the
     * sequence length
     * @return {Boolean}
     */
    overHalfCircle() {
      return this.length > (this.sequenceLength / 2)
    }

    /**
     * Convert the *value* to be between the 1 and the sequence length.
     * @param {Number} value - The number to normalize.
     * @return {Number}
     */
    normalize(value) {
      var rotations;
      if (value > this.sequenceLength) {
        rotations = Math.floor(value / this.sequenceLength);
        return (value - (this.sequenceLength * rotations) )
      } else if (value < 1) {
        rotations = Math.ceil(Math.abs(value / this.sequenceLength));
        return (this.sequenceLength * rotations) + value
      } else {
        return value
      }
    }

    /**
     * Return the *start* of the range plus the *value*.
     * @param {Number} - Number to add.
     * @return {Number}
     */
     getStartPlus(value) {
       return this.normalize(this.start + value)
    }

    /**
     * Return the *stop* of the range plus the *value*.
     * @param {Number} - Number to add.
     * @return {Number}
     */
     getStopPlus(value) {
       return this.normalize(this.stop + value)
    }

    /**
     * Return true if the range length is the same as the sequence length
     * @return {Boolean}
     */
    isFullCircle() {
      return (this.length == this.sequenceLength)
    }

    /**
     * Return true if the range spans the origin (ie. the stop is less than the start position)
     * @return {Boolean}
     */
    spansOrigin() {
      return (this.stop < this.start)
    }

    /**
     * Return true if the *position* in inside the range.
     * @param {Number} position - The position to check if it's in the range.
     * @return {Boolean}
     */
    contains(position) {
      if (this.stop >= this.start) {
        // Typical Range
        return (position >= this.start && position <= this.stop)
      } else {
        // Range spans origin
        return (position >= this.start || position <= this.stop)
      }
    }

    /**
     * Returns a copy of the Range.
     * @return {Range}
     */
    copy() {
      return new CGV.CGRange(this.sequence, this.start, this.stop)
    }

    /**
     * Returns true if the range overlaps with *range2*.
     * @param {Range} range2 - The range with which to test overlap.
     * @return {Boolwan}
     */
    overlapsRange(range2) {
      return (this.contains(range2.start) || this.contains(range2.stop) || range2.contains(this.start))
    }

    /**
     * Merge the with the supplied range to give the biggest possible range.
     * This may produce unexpected results of the ranges do not overlap.
     * @param {Range} range2 - The range to merge with.
     * @return {Range}
     */
    mergeWithRange(range2) {
      var range1 = this;
      var range3 = new CGV.CGRange(this.sequence, range1.start, range2.stop);
      var range4 = new CGV.CGRange(this.sequence, range2.start, range1.stop);
      var ranges = [range1, range2, range3, range4];
      var greatestLength = 0;
      var rangeLength, longestRange;
      for (var i = 0, len = ranges.length; i < len; i++) {
        rangeLength = ranges[i].length;
        if (rangeLength > greatestLength) {
          greatestLength = rangeLength;
          longestRange = ranges[i];
        }
      }
      return longestRange
    }

  }

  CGV.CGRange = CGRange;

})(CGView);


//////////////////////////////////////////////////////////////////////////////
// Color
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * <br />
   * The Color class is meant to represent a color and opacity in a consistant manner
   * Colors are stored internally as an RGBA string (CSS/Canvas compatible) for quick access.
   * The color can be provided or generated in the following formats:
   *
   * *String*:
   *
   * Type    | Example
   * --------|--------
   * RGB     | 'rgb(100, 100, 240)'
   * RGBA    | 'rgba(100, 100, 240, 0.5)'
   * HEX     | '#FF8833' or '#F83'
   * Name    | 'black' (Browser supported color names [List](http://www.w3schools.com/colors/colors_names.asp))
   * HSL     | not implemented yet
   * HSLA    | not implemented yet
   *
   *
   * <br />
   * *Object*:
   *
   * Type    | Example
   * --------|--------
   * RGB     | {r: 100, g: 100, b: 100}
   * RGBA    | {r: 100, g: 100, b: 100, a: 0.5}
   * HSV     | {h:240, s: 50, v: 30}
   *
   * To set the color using any of the above formats, use the [setColor]{@link Color#setColor} method.
   */
  class Color {

    /**
     * Create a Color using a string or object as described above.
     * @param {(String|Object)} color - A color string or object.
     */
    constructor(color) {
      this.setColor(color);
    }

    /**
     * Return the class name as a string.
     * @return {String} - 'Color'
     */
    toString() {
      return 'Color';
    }

    /**
     * Set the color using a color string (e.g RGB, RGBA, Hex, HLA) or a color object (e.g. RGB, RGBA, HSV)
     * as described above.
     * @param {(String|Object)} - A color string or object
     */
    setColor(color) {
      if (typeof color === 'string' || color instanceof String) {
        this._string = color;
      } else {
        var keys = new CGV.CGArray(Object.keys(color));
        if (keys.contains('h') && keys.contains('s') && keys.contains('v')) {
          this.hsv = color;
        } else if (keys.contains('r') && keys.contains('g') && keys.contains('b') && keys.contains('a')) {
          this.rgba = color;
        } else if (keys.contains('r') && keys.contains('g') && keys.contains('b')) {
          this.rgb = color;
        }
      }
    }

    /**
     * Set the color using, RGB, RGBA, Hex, etc String
     * @private
     */
    set _string(value) {
      var rgba = Color.string2rgba(value, this.opacity);
      this._rgbaString = Color.rgba2String(rgba);
      this._updateOpacityFromRgba();
    }


    /**
     * @member {Number} - Get or set the opacity (alpha) of the color.
     */
    get opacity() {
      return (this._opacity == undefined) ? 1 : this._opacity;
    }

    set opacity(value) {
      this._opacity = Color._validateOpacity(value);
      this._updateRgbaOpacity();
    }

    /**
     * @member {String} - Return the color as an RGBA string.
     */
    get rgbaString() {
      return this._rgbaString;
    }

    /**
     * @member {String} - Return the color as an RGB string.
     */
    get rgbString() {
      return Color.rgb2String(this.rgb);
    }

    /**
     * @member {Object} - Get or set the color using a RGB object.
     */
    get rgb() {
      var result = /^rgba\((\d+),(\d+),(\d+)/.exec(this.rgbaString);
      return result ? { r: Number(result[1]), g: Number(result[2]), b: Number(result[3]) } : undefined
    }

    set rgb(value) {
      this._string = Color.rgb2String(value);
      this._updateOpacityFromRgba();
    }

    /**
     * @member {Object} - Get or set the color using a RGBA object.
     */
    get rgba() {
      var result = /^rgba\((\d+),(\d+),(\d+),([\d\.]+)/.exec(this.rgbaString);
      return result ? { r: Number(result[1]), g: Number(result[2]), b: Number(result[3]), a: Number(result[4]) } : undefined
    }

    set rgba(value) {
      this._string = Color.rgba2String(value);
      this._updateOpacityFromRgba();
    }

    /**
     * @member {Object} - Get or set the color using a HSV object.
     */
    get hsv() {
      return Color.rgb2hsv(this.rgb)
    }

    set hsv(value) {
      var rgba = Color.hsv2rgb(value); 
      rgba.a = this.opacity;
      this.rgba = rgba;
    }

    get hex() {
    }

    get hla() {
    }

    copy() {
      return new CGV.Color(this.rgbaString)
    }

    highlight(colorAdjustment = 0.25) {
      var hsv = this.hsv;
      hsv.v += (hsv.v < 0.5) ? colorAdjustment : -colorAdjustment;
      this.hsv = hsv;
    }

    /**
     * Update the internal RGBA String using the current opacity property.
     * @private
     */
    _updateRgbaOpacity() {
      this._rgbaString = this._rgbaString.replace(/^(rgba\(.*,)([\d\.]+?)(\))/, (m, left, opacity, right) => {
        return left + this.opacity + right;
      });
    }

    /**
     * Update the the opacity property using the value in the internal RGBA string
     * @private
     */
    _updateOpacityFromRgba() {
      var result = /^rgba.*,([\d\.]+?)\)$/.exec(this.rgbaString);
      if (result) {
        this._opacity = Color._validateOpacity(result[1]);
      }
    }

  }

  /**
   * Convert a legal color string to RGBA. See http://www.w3schools.com/cssref/css_colors_legal.asp
   * @function string2rgba
   * @memberof Color
   * @param {String} value - *value* can be a hexidecimal, HSL, RGB, RGBA, or a color name.
   * @param {Number} opacity - a number between 0 and 1.
   * @return {String} The color as an RGBA object.
   * @static
   * @private
   */
  Color.string2rgba = function(value, opacity = 1) {
    if ( /^#/.test(value) ) {
      return Color.hexString2rgba(value, opacity)
    } else if ( /^rgb\(/.test(value) ) {
      return Color.rgbString2rgba(value, opacity)
    } else if ( /^rgba\(/.test(value) ) {
      return Color.rgbaString2rgba(value, opacity)
    } else if ( /^hsl\(/.test(value) ) {
      return Color.hslStringToRgba(value, opacity)
    } else {
      var hex = Color.name2HexString(value);
      return Color.hexString2rgba(hex, opacity)
    }
  }

  /**
   * Validate that the opacity is between 0 and 1.
   * @private
   */
  Color._validateOpacity = function(value) {
    value = Number(value)
    if (isNaN(value)) {
      value = 1
    } else if (value > 1) {
      value = 1
    } else if (value < 0) {
      value = 0
    }
    return value
  }

  /**
   * Validate that the RGBA color components are between 0 and 255. Also validate the opacity.
   * @private
   */
  Color._validateRgba = function(value) {
    return {
      r: Color._validateRgbNumber(value.r),
      g: Color._validateRgbNumber(value.g),
      b: Color._validateRgbNumber(value.b),
      a: Color._validateOpacity(value.a)
    }
  }

  /**
   * Validate that the number is between 0 and 255.
   * @private
   */
  Color._validateRgbNumber = function(value) {
    value = Number(value)
    if (value == NaN) {
      value = 0
    } else if (value > 255) {
      value = 255
    } else if (value < 0) {
      value =  0
    }
    return value
  }

  /**
   * Convert an RGB string to an RGBA object
   * @function rgbString2rgba
   * @memberof Color
   * @param {String} rgbString - *rgbString* should take the form of 'rgb(red,green,blue)', where red, green and blue are numbers between 0 and 255.
   * @param {Number} opacity - a number between 0 and 1.
   * @return {String} The color as an RGBA object.
   * @static
   * @private
   */
  Color.rgbString2rgba = function(rgbString, opacity = 1) {
    rgbString = rgbString.replace(/ +/g, '');
    var result = /^rgb\((\d+),(\d+),(\d+)\)/.exec(rgbString);
    return result ? { r: Number(result[1]), g: Number(result[2]), b: Number(result[3]), a: opacity } : undefined
  }

  /**
   * Convert an RGBA String color to RGBA.
   * @function rgbString2rgba
   * @memberof Color
   * @param {String} rgbaString - *rgbaString* should take the form of 'rgb(red,green,blue, alpha)', where red, green and blue are numbers between 0 and 255.
   * @return {String} The color as RGBA.
   * @static
   * @private
   */
  Color.rgbaString2rgba = function(rgbaString) {
    rgbaString = rgbaString.replace(/ +/g, '');
    var result = /^rgba\((\d+),(\d+),(\d+),([\d\.]+)\)/.exec(rgbaString);
    return result ? { r: Number(result[1]), g: Number(result[2]), b: Number(result[3]), a: Number(result[4]) } : undefined
  }

  /**
   * Convert an HSL color to RGBA.
   * @function hslToRgba
   * @memberof Color
   * @param {String} hsl - *hsl*  NOT Implemented yet
   * @param {Number} opacity - a number between 0 and 1.
   * @return {String} The color as RGBA.
   * @static
   * @private
   */
  Color.hslStringToRgba = function(hsl) {
    console.log('NOT IMPLEMENTED')
  }

  /**
   * Convert a RGB object to an HSV object.
   * r, g, b can be either in <0,1> range or <0,255> range.
   * Credits to http://www.raphaeljs.com
   * @private
   */
  Color.rgb2hsv = function(rgb) {

    var r = rgb.r;
    var g = rgb.g;
    var b = rgb.b;

    if (r > 1 || g > 1 || b > 1) {
      r /= 255;
      g /= 255;
      b /= 255;
    }

    var H, S, V, C;
    V = Math.max(r, g, b);
    C = V - Math.min(r, g, b);
    H = (C == 0 ? null :
         V == r ? (g - b) / C + (g < b ? 6 : 0) :
         V == g ? (b - r) / C + 2 :
                  (r - g) / C + 4);
    H = (H % 6) * 60;
    S = C == 0 ? 0 : C / V;
    return { h: H, s: S, v: V };
  }

  /**
   * Convert an HSV object to RGB HEX string.
   * Credits to http://www.raphaeljs.com
   * @private
   */
  Color.hsv2rgb = function(hsv) {
    var R, G, B, X, C;
    var h = (hsv.h % 360) / 60;

    C = hsv.v * hsv.s;
    X = C * (1 - Math.abs(h % 2 - 1));
    R = G = B = hsv.v - C;

    h = ~~h;
    R += [C, X, 0, 0, X, C][h];
    G += [X, C, C, X, 0, 0][h];
    B += [0, 0, X, C, C, X][h];

    var r = Math.floor(R * 255);
    var g = Math.floor(G * 255);
    var b = Math.floor(B * 255);
    return { r: r, g: g, b: b };
  }

  /**
   * Convert a Hexidecimal color string to an RGBA object.
   * Credite to http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
   * @function hex2rgba
   * @memberof Color
   * @param {String} hex - *hex* can be shorthand (e.g. "03F") or fullform (e.g. "0033FF"), with or without the starting '#'.
   * @param {Number} opacity - a number between 0 and 1.
   * @return {String} The color as an RGBA object.
   * @static
   * @private
   */
  Color.hexString2rgba = function(hex, opacity = 1) {
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
      return r + r + g + g + b + b;
    });
    // Defaults:
    var red = 0;
    var green = 0;
    var blue = 0;
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      red = parseInt(result[1], 16);
      green = parseInt(result[2], 16);
      blue = parseInt(result[3], 16);
    }
    return { r: red, g: green, b: blue, a: opacity }
  }

  /**
   * Convert a RGBA object to a RGBA string
   * @function rgba2String
   * @memberof Color
   * @param {Object} rgba - RGBA object
   * @return {String} - RGBA String
   * @static
   * @private
   */
  Color.rgba2String = function(rgba) {
    rgba = Color._validateRgba(rgba);
    return 'rgba(' + rgba.r + ','+ rgba.g + ','  + rgba.b + ',' + rgba.a + ')'
  }

  /**
   * Convert a RGB object to a RGB string
   * @function rgb2String
   * @memberof Color
   * @param {Object} rgb - RGB object
   * @return {String} - RGB String
   * @static
   * @private
   */
  Color.rgb2String = function(rgb) {
    return 'rgb(' + rgb.r + ','+ rgb.g + ','  + rgb.b + ')'
  }


  /**
   * Convert a named color to RGBA.
   * @function name2HexString
   * @memberof Color
   * @param {String} name - *name* should be one of the ~150 browser supported color names [List](http://www.w3schools.com/colors/colors_names.asp))
   * @return {String} The color as a Hex string.
   * @static
   * @private
   */
  Color.name2HexString = function(name) {
    name = name.toLowerCase();
    var hex = Color.names()[name];
    if (hex) {
      return hex
    } else {
      console.log('Name not found! Defaulting to Black')
      return '#000000'
    }
  }

  Color.names = function() {
    return {
      aliceblue: '#f0f8ff',
      antiquewhite: '#faebd7',
      aqua: '#00ffff',
      aquamarine: '#7fffd4',
      azure: '#f0ffff',
      beige: '#f5f5dc',
      bisque: '#ffe4c4',
      black: '#000000',
      blanchedalmond: '#ffebcd',
      blue: '#0000ff',
      blueviolet: '#8a2be2',
      brown: '#a52a2a',
      burlywood: '#deb887',
      cadetblue: '#5f9ea0',
      chartreuse: '#7fff00',
      chocolate: '#d2691e',
      coral: '#ff7f50',
      cornflowerblue: '#6495ed',
      cornsilk: '#fff8dc',
      crimson: '#dc143c',
      cyan: '#00ffff',
      darkblue: '#00008b',
      darkcyan: '#008b8b',
      darkgoldenrod: '#b8860b',
      darkgray: '#a9a9a9',
      darkgrey: '#a9a9a9',
      darkgreen: '#006400',
      darkkhaki: '#bdb76b',
      darkmagenta: '#8b008b',
      darkolivegreen: '#556b2f',
      darkorange: '#ff8c00',
      darkorchid: '#9932cc',
      darkred: '#8b0000',
      darksalmon: '#e9967a',
      darkseagreen: '#8fbc8f',
      darkslateblue: '#483d8b',
      darkslategray: '#2f4f4f',
      darkslategrey: '#2f4f4f',
      darkturquoise: '#00ced1',
      darkviolet: '#9400d3',
      deeppink: '#ff1493',
      deepskyblue: '#00bfff',
      dimgray: '#696969',
      dimgrey: '#696969',
      dodgerblue: '#1e90ff',
      firebrick: '#b22222',
      floralwhite: '#fffaf0',
      forestgreen: '#228b22',
      fuchsia: '#ff00ff',
      gainsboro: '#dcdcdc',
      ghostwhite: '#f8f8ff',
      gold: '#ffd700',
      goldenrod: '#daa520',
      gray: '#808080',
      grey: '#808080',
      green: '#008000',
      greenyellow: '#adff2f',
      honeydew: '#f0fff0',
      hotpink: '#ff69b4',
      indianred : '#cd5c5c',
      indigo : '#4b0082',
      ivory: '#fffff0',
      khaki: '#f0e68c',
      lavender: '#e6e6fa',
      lavenderblush: '#fff0f5',
      lawngreen: '#7cfc00',
      lemonchiffon: '#fffacd',
      lightblue: '#add8e6',
      lightcoral: '#f08080',
      lightcyan: '#e0ffff',
      lightgoldenrodyellow: '#fafad2',
      lightgray: '#d3d3d3',
      lightgrey: '#d3d3d3',
      lightgreen: '#90ee90',
      lightpink: '#ffb6c1',
      lightsalmon: '#ffa07a',
      lightseagreen: '#20b2aa',
      lightskyblue: '#87cefa',
      lightslategray: '#778899',
      lightslategrey: '#778899',
      lightsteelblue: '#b0c4de',
      lightyellow: '#ffffe0',
      lime: '#00ff00',
      limegreen: '#32cd32',
      linen: '#faf0e6',
      magenta: '#ff00ff',
      maroon: '#800000',
      mediumaquamarine: '#66cdaa',
      mediumblue: '#0000cd',
      mediumorchid: '#ba55d3',
      mediumpurple: '#9370db',
      mediumseagreen: '#3cb371',
      mediumslateblue: '#7b68ee',
      mediumspringgreen: '#00fa9a',
      mediumturquoise: '#48d1cc',
      mediumvioletred: '#c71585',
      midnightblue: '#191970',
      mintcream: '#f5fffa',
      mistyrose: '#ffe4e1',
      moccasin: '#ffe4b5',
      navajowhite: '#ffdead',
      navy: '#000080',
      oldlace: '#fdf5e6',
      olive: '#808000',
      olivedrab: '#6b8e23',
      orange: '#ffa500',
      orangered: '#ff4500',
      orchid: '#da70d6',
      palegoldenrod: '#eee8aa',
      palegreen: '#98fb98',
      paleturquoise: '#afeeee',
      palevioletred: '#db7093',
      papayawhip: '#ffefd5',
      peachpuff: '#ffdab9',
      peru: '#cd853f',
      pink: '#ffc0cb',
      plum: '#dda0dd',
      powderblue: '#b0e0e6',
      purple: '#800080',
      rebeccapurple: '#663399',
      red: '#ff0000',
      rosybrown: '#bc8f8f',
      royalblue: '#4169e1',
      saddlebrown: '#8b4513',
      salmon: '#fa8072',
      sandybrown: '#f4a460',
      seagreen: '#2e8b57',
      seashell: '#fff5ee',
      sienna: '#a0522d',
      silver: '#c0c0c0',
      skyblue: '#87ceeb',
      slateblue: '#6a5acd',
      slategray: '#708090',
      slategrey: '#708090',
      snow: '#fffafa',
      springgreen: '#00ff7f',
      steelblue: '#4682b4',
      tan: '#d2b48c',
      teal: '#008080',
      thistle: '#d8bfd8',
      tomato: '#ff6347',
      turquoise: '#40e0d0',
      violet: '#ee82ee',
      wheat: '#f5deb3',
      white: '#ffffff',
      whitesmoke: '#f5f5f5',
      yellow: '#ffff00',
      yellowgreen: '#9acd32'
    }
  }

  CGV.Color = Color;

})(CGView);

// ColorPicker
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class ColorPicker {


    /**
     * The ColorPicker
     * Based on Flexi Color Picker: http://www.daviddurman.com/flexi-color-picker/
     * Color is stored interanlly as HSV, as well as a Color object.
     */
    constructor(containerId, options = {}) {
      this.containerId = containerId;
      this.container = d3.select('#' + containerId).node();
      this._width = CGV.defaultFor(options.width, 100);
      this._height = CGV.defaultFor(options.height, 100);

      this._color = new CGV.Color( CGV.defaultFor(options.colorString, 'rgba(255,0,0,1)') );
      this.hsv = this._color.hsv;
      this.opacity = this._color.opacity;

      this.onChange = options.onChange;
      this.onClose = options.onClose;

      this.container.innerHTML = this._colorpickerHTMLSnippet();
      d3.select(this.container).classed('cp-dialog', true);
      this.dialogElement = this.container.getElementsByClassName('cp-dialog')[0];
      this.slideElement = this.container.getElementsByClassName('cp-color-slider')[0];
      this.pickerElement = this.container.getElementsByClassName('cp-color-picker')[0];
      this.alphaElement = this.container.getElementsByClassName('cp-alpha-slider')[0];
      this.slideIndicator = this.container.getElementsByClassName('cp-color-slider-indicator')[0];
      this.pickerIndicator = this.container.getElementsByClassName('cp-color-picker-indicator')[0];
      this.alphaIndicator = this.container.getElementsByClassName('cp-alpha-slider-indicator')[0];
      this.currentColorIndicator = this.container.getElementsByClassName('cp-color-current')[0];
      this.originalColorIndicator = this.container.getElementsByClassName('cp-color-original')[0];
      this.doneButton = this.container.getElementsByClassName('cp-done-button')[0];
      this._configureView();

      // Prevent the indicators from getting in the way of mouse events
      this.slideIndicator.style.pointerEvents = 'none';
      this.pickerIndicator.style.pointerEvents = 'none';
      this.alphaIndicator.style.pointerEvents = 'none';

      d3.select(this.slideElement).on('mousedown.click', this.slideListener());
      d3.select(this.pickerElement).on('mousedown.click', this.pickerListener());
      d3.select(this.alphaElement).on('mousedown.click', this.alphaListener());
      d3.select(this.originalColorIndicator).on('mousedown.click', this.originalColorListener());
      d3.select(this.doneButton).on('mousedown.click', this.doneListener());

      this.enableDragging(this, this.slideElement, this.slideListener());
      this.enableDragging(this, this.pickerElement, this.pickerListener());
      this.enableDragging(this, this.alphaElement, this.alphaListener());
      this.enableDragging(this, this.container, this.dialogListener());

      d3.select(this.container).style('visibility', 'hidden');
    }

    get color() {
      return this._color
    }

    updateColor() {
      this._color.hsv = this.hsv;
      this._color.opacity = this.opacity;
      this.updateIndicators();
      var pickerRgbString = CGV.Color.rgb2String( CGV.Color.hsv2rgb( {h: this.hsv.h, s: 1, v: 1} ) );
      this.pickerElement.style.backgroundColor = pickerRgbString;
      d3.select(this.alphaElement).selectAll('stop').attr('stop-color', this.color.rgbString);
      this.currentColorIndicator.style.backgroundColor = this.color.rgbaString;
      this.onChange && this.onChange(this.color);
    }

    setColor(value) {
      this._color.setColor(value);
      this.hsv = this._color.hsv;
      // this.opacity = this._color.opacity;
      this.opacity = Number(this._color.opacity.toFixed(2));
      this.originalColorIndicator.style.backgroundColor = this._color.rgbaString;
      this.updateColor();
    }

    updateIndicators() {
      var hsv = this.hsv;
      var slideY = hsv.h * this.slideElement.offsetHeight / 360;
      var pickerHeight = this.pickerElement.offsetHeight;
      var pickerX = hsv.s * this.pickerElement.offsetWidth;
      var pickerY = pickerHeight - (hsv.v * pickerHeight);
      var alphaX = this.alphaElement.offsetWidth * this.opacity;

      var pickerIndicator = this.pickerIndicator;
      var slideIndicator = this.slideIndicator;
      var alphaIndicator = this.alphaIndicator;
      slideIndicator.style.top = (slideY - slideIndicator.offsetHeight/2) + 'px';
      pickerIndicator.style.top = (pickerY - pickerIndicator.offsetHeight/2) + 'px';
      pickerIndicator.style.left = (pickerX - pickerIndicator.offsetWidth/2) + 'px';
      alphaIndicator.style.left = (alphaX - alphaIndicator.offsetWidth/2) + 'px';
    }

    setPosition(pos) {
      this.container.style.left = pos.x + 'px';
      this.container.style.top = pos.y + 'px';
    }

    get width() {
      return this.container.offsetWidth
    }

    get height() {
      return this.container.offsetHeight
    }

    _colorpickerHTMLSnippet() {
      return [
        '<div class="cp-color-picker-wrapper">',
              '<div class="cp-color-picker"></div>',
              // '<div class="cp-color-picker-indicator"></div>',
              '<div class="cp-color-picker-indicator">',
                 '<div class="cp-picker-indicator-rect-1"></div>',
                 '<div class="cp-picker-indicator-rect-2"></div>',
              '</div>',
        '</div>',
        '<div class="cp-color-slider-wrapper">',
              '<div class="cp-color-slider"></div>',
              // '<div class="cp-color-slider-indicator"></div>',
              '<div class="cp-color-slider-indicator">',
                 '<div class="cp-color-indicator-rect-1"></div>',
                 '<div class="cp-color-indicator-rect-2"></div>',
              '</div>',
        '</div>',
        '<div class="cp-alpha-slider-wrapper">',
              '<div class="cp-alpha-slider"></div>',
              // '<div class="cp-alpha-slider-indicator"></div>',
              '<div class="cp-alpha-slider-indicator">',
                 '<div class="cp-alpha-indicator-rect-1"></div>',
                 '<div class="cp-alpha-indicator-rect-2"></div>',
              '</div>',
        '</div>',
        '<div class="cp-dialog-footer">',
              '<div class="cp-footer-color-section">',
                  '<div class="cp-color-original"></div>',
                  '<div class="cp-color-current"></div>',
              '</div>',
              '<div class="cp-footer-button-section">',
                  '<button class="cp-done-button">Done</button>',
              '</div>',
        '</div>'

      ].join('');
    }

    /**
     * Create slide, picker, and alpha markup
     * The container ID is used to make unique ids for the SVG defs
     */
    _configureView() {
      var slide, picker, alpha;
      var containerId = this.containerId;
      slide = $el('svg', { xmlns: 'http://www.w3.org/2000/svg', version: '1.1', width: '20px', height: '100px' },
                [
                  $el('defs', {},
                    $el('linearGradient', { id: containerId + '-gradient-hsv', x1: '0%', y1: '100%', x2: '0%', y2: '0%'},
                      [
                        $el('stop', { offset: '0%', 'stop-color': '#FF0000', 'stop-opacity': '1' }),
                        $el('stop', { offset: '13%', 'stop-color': '#FF00FF', 'stop-opacity': '1' }),
                        $el('stop', { offset: '25%', 'stop-color': '#8000FF', 'stop-opacity': '1' }),
                        $el('stop', { offset: '38%', 'stop-color': '#0040FF', 'stop-opacity': '1' }),
                        $el('stop', { offset: '50%', 'stop-color': '#00FFFF', 'stop-opacity': '1' }),
                        $el('stop', { offset: '63%', 'stop-color': '#00FF40', 'stop-opacity': '1' }),
                        $el('stop', { offset: '75%', 'stop-color': '#0BED00', 'stop-opacity': '1' }),
                        $el('stop', { offset: '88%', 'stop-color': '#FFFF00', 'stop-opacity': '1' }),
                        $el('stop', { offset: '100%', 'stop-color': '#FF0000', 'stop-opacity': '1' })
                      ]
                     )
                   ),
                  $el('rect', { x: '0', y: '0', width: '20px', height: '100px', fill: 'url(#' + containerId + '-gradient-hsv)'})
                ]
               );

      picker = $el('svg', { xmlns: 'http://www.w3.org/2000/svg', version: '1.1', width: '100px', height: '100px' },
                 [
                   $el('defs', {},
                     [
                       $el('linearGradient', { id: containerId + '-gradient-black', x1: '0%', y1: '100%', x2: '0%', y2: '0%'},
                         [
                           $el('stop', { offset: '0%', 'stop-color': '#000000', 'stop-opacity': '1' }),
                           $el('stop', { offset: '100%', 'stop-color': '#CC9A81', 'stop-opacity': '0' })
                         ]
                        ),
                       $el('linearGradient', { id: containerId + '-gradient-white', x1: '0%', y1: '100%', x2: '100%', y2: '100%'},
                         [
                           $el('stop', { offset: '0%', 'stop-color': '#FFFFFF', 'stop-opacity': '1' }),
                           $el('stop', { offset: '100%', 'stop-color': '#CC9A81', 'stop-opacity': '0' })
                         ]
                        )
                     ]
                    ),
                   $el('rect', { x: '0', y: '0', width: '100px', height: '100px', fill: 'url(#' + containerId + '-gradient-white)'}),
                   $el('rect', { x: '0', y: '0', width: '100px', height: '100px', fill: 'url(#' + containerId + '-gradient-black)'})
                 ]
                );

      alpha = $el('svg', { xmlns: 'http://www.w3.org/2000/svg', version: '1.1', width: '127px', height: '10px', style: 'position: absolute;' },
                [
                  $el('defs', {}, 
                    [
                      $el('linearGradient', { id: containerId + '-alpha-gradient' },
                        [
                          $el('stop', { offset: '0%', 'stop-color': '#FFFFFF', 'stop-opacity': '0' }),
                          $el('stop', { offset: '100%', 'stop-color': '#FFFFFF', 'stop-opacity': '1' })
                        ]
                       ),
                      $el('pattern', { id: containerId + '-alpha-squares', x: '0', y: '0', width: '10px', height: '10px', patternUnits: 'userSpaceOnUse' },
                        [
                          $el('rect', { x: '0', y: '0', width: '10px', height: '10px', fill: 'white'}),
                          $el('rect', { x: '0', y: '0', width: '5px', height: '5px', fill: 'lightgray'}),
                          $el('rect', { x: '5px', y: '5px', width: '5px', height: '5px', fill: 'lightgray'})
                        ]
                      )
                    ]
                  ),
                  $el('rect', { x: '0', y: '0', width: '127px', height: '10px', fill: 'url(#' + containerId + '-alpha-squares)'}),
                  $el('rect', { x: '0', y: '0', width: '127px', height: '10px', fill: 'url(#' + containerId + '-alpha-gradient)'})
                ]
               );

      this.slideElement.appendChild(slide);
      this.pickerElement.appendChild(picker);
      this.alphaElement.appendChild(alpha);
    }



   /**
    * Enable drag&drop color selection.
    * @param {object} ctx ColorPicker instance.
    * @param {DOMElement} element HSV slide element or HSV picker element.
    * @param {Function} listener Function that will be called whenever mouse is dragged over the element with event object as argument.
    */
    enableDragging(ctx, element, listener) {
      d3.select(element).on('mousedown', function() {
        d3.event.preventDefault();
        d3.event.stopPropagation();
        var mouseStart = mousePosition(element);
        d3.select(document).on('mousemove.colordrag', function() {
          if (document.selection) {
            document.selection.empty()
          } else {
            window.getSelection().removeAllRanges()
          }
          listener(mouseStart);
        });
        d3.select(document).on('mouseup', function() {
          d3.select(document).on('mousemove.colordrag', null);
        });
      });
    }

    /**
     * Return click event handler for the slider.
     * Sets picker background color and calls ctx.callback if provided.
     */  
    slideListener() {
      var cp = this;
      var slideElement = cp.slideElement;
      return function() {
        var mouse = mousePosition(slideElement);
        cp.hsv.h = mouse.y / slideElement.offsetHeight * 360// + cp.hueOffset;
        // Hack to fix indicator bug
        if (cp.hsv.h >= 359) { cp.hsv.h = 359}
        cp.updateColor();
      }
    };

    /**
     * Return click event handler for the picker.
     * Calls ctx.callback if provided.
     */
    pickerListener() {
      var cp = this;
      var pickerElement = cp.pickerElement;
      return function() {
        var width = pickerElement.offsetWidth;
        var height = pickerElement.offsetHeight;
        var mouse = mousePosition(pickerElement);
        cp.hsv.s = mouse.x / width;
        cp.hsv.v = (height - mouse.y) / height;
        cp.updateColor();
      }
    }

    /**
     * Return click event handler for the alpha.
     * Sets alpha background color and calls ctx.callback if provided.
     */  
    alphaListener() {
      var cp = this;
      var alphaElement = cp.alphaElement;
      return function() {
        var mouse = mousePosition(alphaElement);
        var opacity =  mouse.x / alphaElement.offsetWidth;
        cp.opacity = Number(opacity.toFixed(2));
        cp.updateColor();
      }
    };

    /**
     * Return click event handler for the dialog.
     */  
    dialogListener() {
      var cp = this;
      var container = cp.container;
      return function(mouseStart) {
        container.style.left = (d3.event.pageX - mouseStart.x) + 'px';
        container.style.top = (d3.event.pageY - mouseStart.y) + 'px';
      }
    };


    /**
     * Return click event handler for the original color.
     */  
    originalColorListener() {
      var cp = this;
      return function() {
        cp.setColor(cp.originalColorIndicator.style.backgroundColor);
      }
    };

    /**
     * Return click event handler for the done button.
     */  
    doneListener() {
      var cp = this;
      return function() {
        cp.onChange = undefined;
        cp.close()
      }
    };

    get visible() {
      return d3.select(this.container).style('visibility') == 'visible';
    }

    set visible(value) {
      value ? this.open() : this.close();
    }

    open() {
      var box = d3.select(this.container);
      box.style('visibility', 'visible');
      box.transition().duration(200)
        .style('opacity', 1);
      return this;
    }

    close() {
      d3.select(this.container).transition().duration(200)
        .style('opacity', 0)
        .on('end', function() {
          d3.select(this).style('visibility', 'hidden');
        });
      this.onClose && this.onClose();
      this.onClose = undefined;
      return this;
    }

  }

  /**
   * Create SVG element.
   */
  function $el(el, attrs, children) {
    el = document.createElementNS('http://www.w3.org/2000/svg', el);
    for (var key in attrs)
      el.setAttribute(key, attrs[key]);
    if (Object.prototype.toString.call(children) != '[object Array]') children = [children];
    var i = 0, len = (children[0] && children.length) || 0;
    for (; i < len; i++)
      el.appendChild(children[i]);
    return el;
  }

  /**
   * Return mouse position relative to the element el.
   */
  function mousePosition(element) {
    var width = element.offsetWidth;
    var height = element.offsetHeight;

    var pos = d3.mouse(element);
    var mouse = {x: pos[0], y: pos[1]}
    if (mouse.x > width) {
      mouse.x = width;
    } else if (mouse.x < 0) {
      mouse.x = 0;
    }
    if (mouse.y > height) {
      mouse.y = height;
    } else if (mouse.y < 0) {
      mouse.y = 0;
    }
    return mouse
  }

  CGV.ColorPicker = ColorPicker;

})(CGView);
//////////////////////////////////////////////////////////////////////////////
// Debug
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class Debug {

    constructor(options = {}) {
      this._data = {};
      this._sections = CGV.defaultFor(options.sections, []);
      // Create object for each section
      for (var section of this.sections) {
        this.data[section] = {}
      }
    }

    get sections() {
      return this._sections;
    }

    get data() {
      return this._data;
    }


    // // DEBUG INFO EXAMPLE
    // if (this.debug) {
    //   axis = axis.toUpperCase();
    //   this.debug_data.zoom['d' + axis]  = JSV.round(axis_diff);
    //   this.debug_data.zoom['v' + axis]  = JSV.round(value);
    //   this.debug_data.zoom['r' + axis]  = JSV.round(axis_ratio);
    // }
    // Other Example
    // var start_time = new Date().getTime();
    // ....code and stuff....
    // if (this.debug) {
    //   this.debug_data.time['draw'] = JSV.elapsed_time(start_time);
    //   this.draw_debug(this.legend.bottom());
    // }
    // 
    // Draws any information in 'data' onto the left side of the viewer
    draw(ctx, x = 10, y = 20) {
      x = CGV.pixel(x);
      y = CGV.pixel(y);
      var data = this._data;
      var sections = this._sections;

      ctx.font = CGV.pixel(10) + 'pt Sans-Serif';
      ctx.fillStyle = 'black';
      var line_height = CGV.pixel(18);
      ctx.textAlign = 'left';
      var section_keys = this.debug === true ? Object.keys(data) : this.debug;
      var i = 0;
      sections.forEach(function(section_key) {
        var data_keys = Object.keys(data[section_key]);
        data_keys.forEach(function(data_key) {
          ctx.fillText((section_key + '|' + data_key + ': ' + data[section_key][data_key]), x, y + (line_height * i));
          i += 1;
        });
      })
    }

  }

  CGV.Debug = Debug;

})(CGView);
/////////////////////////////////////////////////////////////////////////////
// CGViewer Dialog
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * This class is for creating dialog boxes with custom content.
   */
  class Dialog {

    constructor(viewer, options) {
      options = options || {};
      this._wrapper = viewer._wrapper.node();

      this.fadeTime = CGV.defaultFor(options.fadeTime, 500);
      this.header_text = CGV.defaultFor(options.header_text, '');
      this.content_text = CGV.defaultFor(options.content_text, '');
      this.height = CGV.defaultFor(options.height, 300);
      this.width = CGV.defaultFor(options.width, 300);
      this.buttons = options.buttons;

      this.box = d3.select(this._wrapper).append('div')
        .style('display', 'none')
        .attr('class', 'cgv-dialog');

      this.header = this.box.append('div')
        .attr('class', 'cgv-dialog-header')
        .html(this.header_text);

      this.dismiss = this.box.append('div')
        .attr('class', 'cgv-dialog-dismiss')
        .html('X')
        .on('click', () => { this.close(); });

      this.contents = this.box.append('div')
        .attr('class', 'cgv-dialog-contents cgv-scroll');

      if (this.buttons) {
        this.footer = this.box.append('div')
          .attr('class', 'cgv-dialog-footer');
        this._generate_buttons();
      }

      this.contents.html(this.content_text);

      this._adjust_size();

      return this;
    }

    //////////////////////////////////////////////////////////////////////////
    // MEMBERS
    //////////////////////////////////////////////////////////////////////////

    /**
     * @member {Boolean} - Returns true if the dialog is visible.
     */
    get visible() {
      return (this.box.style('display') != 'none');
    }

    /**
     * @member {Number} - Get or set the time it take for the dialog to appear and disappear in milliseconds [Default: 500].
     */
    get fadeTime() {
      return this._fadeTime;
    }

    set fadeTime(value) {
      this._fadeTime = value;
    }

    //////////////////////////////////////////////////////////////////////////
    // METHODS
    //////////////////////////////////////////////////////////////////////////

  /**
   * Opens the dialog
   * @param {Number} duration - The duration of the open animation in milliseconds. Defaults to fadeTime [Dialog.fadeTime](Dialog.html#fadeTime).
   */
    open(duration) {
      duration = CGV.defaultFor(duration, this.fadeTime)
      this._adjust_size();
      this.box.style('display', 'block');
      this.box.transition().duration(duration)
        .style('opacity', 1);
      return this;
    }

  /**
   * Closes the dialog
   * @param {Number} duration - The duration of the close animation in milliseconds. Defaults to fadeTime [Dialog.fadeTime](Dialog.html#fadeTime).
   */
    close(duration) {
      duration = CGV.defaultFor(duration, this.fadeTime)
      this.box.transition().duration(duration)
        .style('opacity', 0)
        .on('end', function() {
          d3.select(this).style('display', 'none');
        });
      return this;
    }

    _generate_buttons() {
      var labels = Object.keys(this.buttons);
      labels.forEach( (label) => {
        this.footer.append('button')
          .html(label)
          .attr('class', 'cgv-button')
          .on('click', () => { this.buttons[label].call(this) });
      });

    }

    _adjust_size() {
      // Minimum buffer between dialog and edges of container (times 2)
      var buffer = 50;
      var wrapper_width = this._wrapper.offsetWidth;
      var wrapper_height = this._wrapper.offsetHeight;
      var width = this.width;
      var height = this.height;

      if (this.height > wrapper_height - buffer) height = wrapper_height - buffer;
      if (this.width > wrapper_width - buffer) width = wrapper_width - buffer;

      var header_height = 40;
      var footer_height = this.buttons ? 35 : 0;
      var content_height = height - header_height - footer_height;

      this.box
        .style('width', width + 'px')
        .style('height', height + 'px')

      this.contents
        .style('height', content_height + 'px');
    }

  }

  CGV.Dialog = Dialog;

})(CGView);


//////////////////////////////////////////////////////////////////////////////
// Divider
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * The CGView Divider is a line that separates tracks or slots.
   */
  class Divider extends CGV.CGObject {

    /**
     * Create a divider
     *
     * @param {Viewer} viewer - The viewer that contains the divider
     * @param {Object} options - Options and stuff
     */
    constructor(viewer, options = {}, meta = {}) {
      super(viewer, options, meta);
      this.color = CGV.defaultFor(options.color, 'grey');
      this._thickness = CGV.defaultFor(options.thickness, 1);
      this._spacing = CGV.defaultFor(options.spacing, 1);
      this.radii = new CGV.CGArray();
    }

    /**
     * @member {Color} - Get or set the divider color. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
     */
    get color() {
      return this._color
    }

    set color(value) {
      if (value.toString() == 'Color') {
        this._color = value;
      } else {
        this._color = new CGV.Color(value);
      }
    }

    /**
     * @member {Number} - Set or get the divider thickness. This is the unzoomed thickness.
     */
    set thickness(value) {
      if (value) {
        this._thickness = Math.round(value);
        this.viewer.layout._adjustProportions();
      }
    }

    get thickness() {
      return this._thickness
    }

    /**
     * @member {Number} - Set or get the divider spacing.
     */
    set spacing(value) {
      if (value) {
        this._spacing = Math.round(value);
        this.viewer.layout._adjustProportions();
      }
    }

    get spacing() {
      return this._spacing
    }

    /**
     * @member {Number} - Set or get the array of divider radii.
     */
    set radii(value) {
      if (value && value.toString() == 'CGArray') {
        this._radii = value;
      }
    }

    get radii() {
      return this._radii
    }

    /**
     * The visible range
     * @member {Range}
     */
    get visibleRange() {
      return this._visibleRange
    }

    clearRadii() {
      this.radii = new CGV.CGArray();
    }

    addRadius(radius) {
      this._radii.push(radius)
    }

    draw() {
      if (!this.visible) { return }
      for (var i = 0, len = this._radii.length; i < len; i++) {
        var radius = this._radii[i]
        this._visibleRange = this.canvas.visibleRangeForRadius(radius, 100);
        if (this.visibleRange) {
          this.viewer.canvas.drawArc('map', this.visibleRange.start, this.visibleRange.stop, radius, this.color.rgbaString, CGV.pixel(this.thickness));
        }
      }
    }

  }

  CGV.Divider = Divider;

})(CGView);


//////////////////////////////////////////////////////////////////////////////
// EventMonitor
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * EventMonitor monitor events on the CGView Canvas and triggers events.
   */
  class EventMonitor {

    constructor(viewer) {
      this._viewer = viewer;

      // Setup Events on the viewer
      // var events = new CGV.Events();
      this.events = viewer.events;
      // viewer._events = events;
      // viewer.on = events.on;
      // viewer.off = events.off;
      // viewer.trigger = events.trigger;
      // viewer.events = events;

      this._initializeMousemove();
      this._initializeClick();
      // this.events.on('mousemove', (e) => {console.log(e.bp)})
      this.events.on('click', (e) => {console.log(e)})

      this.events.on('mousemove', (e) => {
        // console.log(e.bp);
        // console.log([e.mapX, e.mapY]);
        if (this.viewer.debug && this.viewer.debug.data.position) {
          this.viewer.debug.data.position['xy'] = Math.round(e.mapX) + ', ' + Math.round(e.mapY);
          this.viewer.debug.data.position['bp'] = e.bp;
          this.viewer.debug.data.position['feature'] = e.feature && e.feature.label.name;
          this.viewer.debug.data.position['score'] = e.score;
          this.canvas.clear('ui');
          this.viewer.debug.draw(this.canvas.context('ui'));
        }
      });

      this._legendSwatchClick();
      this._legendSwatchMouseOver();
      this._highlighterMouseOver();
    }

    /**
     * @member {Viewer} - Get the *Viewer*
     */
    get viewer() {
      return this._viewer
    }

    /**
     * @member {Canvas} - Get the *Canvas*
     */
    get canvas() {
      return this.viewer.canvas
    }

    _initializeMousemove() {
      var viewer = this.viewer;
      d3.select(this.canvas.node('ui')).on('mousemove.cgv', () => {
        viewer.clear('ui');
        this.events.trigger('mousemove', this._createEvent(d3.event));
      });
    }
    _initializeClick() {
      d3.select(this.canvas.node('ui')).on('click.cgv', () => {
        // event = {d3: d3.event, canvasX: d3.event.x, canvasY: d3.event.y}
        this.events.trigger('click', this._createEvent(d3.event));
      });
    }

    _createEvent(d3_event) {
      var scale = this.canvas.scale;
      var canvasX = CGV.pixel(d3_event.offsetX);
      var canvasY = CGV.pixel(d3_event.offsetY);
      var mapX = scale.x.invert(canvasX);
      var mapY = scale.y.invert(canvasY);
      var radius = Math.sqrt( mapX*mapX + mapY*mapY);
      var slot = this.viewer.layout.slotForRadius(radius);
      var bp = this.canvas.bpForPoint({x: mapX, y: mapY});
      var feature = slot && slot.findFeaturesForBp(bp)[0];
      var plot = slot && slot._plot;
      var score = plot && plot.scoreForPosition(bp).toFixed(2);
      return {
        bp: bp,
        radius: radius,
        slot: slot,
        feature: feature,
        plot: plot,
        score: score,
        canvasX: canvasX,
        canvasY: canvasY,
        mapX: mapX,
        mapY: mapY,
        d3: d3.event
      }
    }

    _legendSwatchClick() {
      var viewer = this.viewer;
      this.events.on('click.swatch', (e) => {
        var legend = viewer.legend;
        var swatchedLegendItems = legend.visibleItems();
        for (var i = 0, len = swatchedLegendItems.length; i < len; i++) {
          if ( swatchedLegendItems[i]._swatchContainsPoint( {x: e.canvasX, y: e.canvasY} ) ) {
            var legendItem = swatchedLegendItems[i];
            legendItem.swatchSelected = true
            var cp = viewer.colorPicker;
            if (!cp.visible) {
              legend.setColorPickerPosition(cp);
            }
            cp.onChange = function(color) {
              legendItem.swatchColor = color.rgbaString;
              cgv.drawFast();
            };
            cp.onClose = function() {
              legendItem.swatchSelected = false;
              cgv.drawFull();
              legend.draw();
            };
            cp.setColor(legendItem._swatchColor.rgba);
            cp.open();
            break;
          }
        }
      });
    }

    _legendSwatchMouseOver() {
      var viewer = this.viewer;
      this.events.on('mousemove.swatch', (e) => {
        var legend = viewer.legend;
        var swatchedLegendItems = legend.visibleItems();
        var oldHighlightedItem = legend.highlightedSwatchedItem;
        legend.highlightedSwatchedItem = undefined;
        for (var i = 0, len = swatchedLegendItems.length; i < len; i++) {
          if ( swatchedLegendItems[i]._swatchContainsPoint( {x: e.canvasX, y: e.canvasY} ) ) {
            var legendItem = swatchedLegendItems[i];
            legendItem.swatchHighlighted = true
            this.canvas.cursor = 'pointer';
            legend.draw();
            break;
          }
        }
        // No swatch selected
        if (oldHighlightedItem && !legend.highlightedSwatchedItem) {
          this.canvas.cursor = 'auto';
          legend.draw();
        }
      });
    }

    _highlighterMouseOver() {
      var viewer = this.viewer;
      var highlighter = viewer.highlighter;
      this.events.on('mousemove.highlighter', (e) => {
        if (e.feature) {
          e.feature.highlight(e.slot);
        } else if (e.plot) {
          var score = e.plot.scoreForPosition(e.bp);
          if (score) {
            var startIndex = CGV.indexOfValue(e.plot.positions, e.bp, false);
            var start = e.plot.positions[startIndex];
            var stop = e.plot.positions[startIndex + 1] || viewer.sequence.length;
            var baselineRadius = e.slot.radius - (e.slot.thickness / 2) + (e.slot.thickness * e.plot.baseline);
            var scoredRadius = baselineRadius + (score - e.plot.baseline) * e.slot.thickness;
            var thickness = Math.abs(baselineRadius - scoredRadius);
            var radius = Math.min(baselineRadius, scoredRadius) + (thickness / 2);
            var color = (score >= e.plot.baseline) ? e.plot.colorPositive.copy() : e.plot.colorNegative.copy();
            color.highlight();

            viewer.canvas.drawArc('ui', start, stop, radius, color, thickness);
          }

        }
      });
    }

  }

  CGV.EventMonitor = EventMonitor;

})(CGView);


//////////////////////////////////////////////////////////////////////////////
// Events
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * Events is a system to plug in callbacks to specific events in CGV.
   * Use [on](#on) to add a callback and [off](#off) to remove it.
   * Here are a list of events supported in CGV:
   *
   *  Event               | Description
   *  --------------------|-------------
   *  legend-update       | Called after legend items removed or added
   *  caption-update      | Called after caption items removed or added
   *  track-update        | Called when track is updated
   *  feature-type-update | Called when featureTypes is updated
   *
   *
   *  mousemove           | Called when the mouse moves on the map
   *  drag-start          | Called once before viewer starts drag animation
   *  drag                | Called every frame of the drag animation
   *  drag-end            | Called after dragging is complete
   *  zoom-start          | Called once before viewer starts zoom animation
   *  zoom                | Called every frame of the zoom animation
   *  zoom-end            | Called after zooming is complete
   *  domain-change       | Called after the viewer domains have changed
   *  selection-add       | Called when an element is added to the selection
   *  selection-remove    | Called after an element is removed from the selection
   *  selection-clear     | Called before the selection is cleared
   *  selection-empty     | Called after the selection becomes empty
   *  highlight-start     | Called when an element is highlighted
   *  highlight-end       | Called when an element is unhighlighted
   *  label-click         | Called when a annotation label is clicked
   */
  class Events {

    constructor() {
      this._handlers = {};
    }


    /**
     * Attach a callback function to a specific JSV event.
     * ```js
     * sv = new JSV.SpectraViewer('#my-spectra');
     * sv.on('drag-start', function() { console.log('Dragging has begun!') };
     *
     * // The event can be namespaced for easier removal later
     * sv.on('drag-start.my_plugin', function() { console.log('Dragging has begun!') };
     * ```
     * @param {String} event Name of event. Events can be namespaced.
     * @param {Function} callback Function to call when event is triggered
     */
    on(event, callback) {
      var handlers = this._handlers;
      checkType(event);
      var type = parseEvent(event)
      if ( !handlers[type] ) handlers[type] = [];
      handlers[type].push( new Handler(event, callback) );
    }

    /**
     * Remove a callback function from a specific JSV event. If no __callback__ is provided,
     * then all callbacks for the event will be removed. Namespaced events can and should be used 
     * to avoid unintentionally removing callbacks attached by other plugins.
     * ```js
     * // Remove all callbacks attached to the 'drag-start' event.
     * // This includes any namespaced events.
     * sv.off('drag-start');
     *
     * // Remove all callbacks attached to the 'drag-start' event namespaced to 'my_plugin'
     * sv.off('drag-start.my_plugin');
     *
     * // Remove all callbacks attached to any events namespaced to 'my_plugin'
     * sv.off('.my_plugin');
     * ```
     * @param {String} event Name of event. Events can be namespaced.
     * @param {Function} callback Specfic function to remove
     */
    off(event, callback) {
      var handlers = this._handlers;
      checkType(event);
      var type = parseEvent(event);
      var namespace = parseNamespace(event);
      // If no callback is supplied remove all of them
      if (arguments.length == 1) {
        if (namespace) {
          if (type) {
            handlers[type] = handlers[type].filter(function(h) { return h.namespace != namespace; });
          } else {
            Object.keys(handlers).forEach(function(key) {
              handlers[key] = handlers[key].filter(function(h) { return h.namespace != namespace; });
            });
          }
        } else {
          handlers[type] = undefined;
        }
      } else {
        // Remove specific callback
        handlers[type] = handlers[type].filter(function(h) { return h.callback != callback; });
      }
    }

    /**
     * Trigger a callback function for a specific event.
     * ```js
     * // Triggers all callback functions associated with drag-start
     * sv.trigger('drag-start');
     *
     * // Triggers can also be namespaced
     * sv.trigger('drag-start.my_plugin');
     * ```
     * @param {String} event Name of event. Events can be namespaced.
     * @param {Object} object Object to be passed back to 'on'.
     */
    trigger(event, object) {
      var handlers = this._handlers;
      checkType(event);
      var type = parseEvent(event);
      var namespace = parseNamespace(event);
      if (Array.isArray(handlers[type])) {
        handlers[type].forEach(function(handler) {
          if (namespace) {
            if (handler.namespace == namespace) handler.callback.call(null, object);
          } else {
            handler.callback.call(null, object);
          }
        });
      }
    }

  }

    /** @ignore */

    var checkType = function(type) {
      if (typeof type != 'string') {
        throw new Error('Type must be a string');
      }
    }

    var Handler = function(event, callback) {
      this.callback = callback;
      this.event_type = parseEvent(event);
      this.namespace = parseNamespace(event);
    }

    var parseEvent = function(event) {
      return event.replace(/\..*/, '');
    }

    var parseNamespace = function(event) {
      result = event.match(/\.(.*)/);
      return result ? result[1] : undefined
    }

  CGV.Events = Events;

})(CGView);


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
//////////////////////////////////////////////////////////////////////////////
// FeatureType
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class FeatureType extends CGV.CGObject {

    /**
     * A Feature Type 
     */
    constructor(viewer, data = {}, meta = {}) {
      super(viewer, data, meta)
      this.viewer = viewer
      this.name = CGV.defaultFor(data.name, '');
      // Decoration: arc, arrow, score
      this.decoration = CGV.defaultFor(data.decoration, 'arc');
      this.viewer.trigger('feature-type-update');
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
      viewer._featureTypes.push(this);
    }

    /**
     * @member {String} - Get or set the *name*
     */
    get name() {
      return this._name
    }

    set name(value) {
      this._name = value;
    }

    /**
     * @member {String} - Alias for [name](FeatureType.html#name)
     */
    get id() {
      return this.name
    }

    set id(value) {
      this.name = value;
    }

    /**
     * @member {String} - Get or set the decoration. Choices are *arc* [Default], *arrow*, *score*
     */
    get decoration() {
      return this._decoration;
    }

    set decoration(value) {
      if ( CGV.validate(value, ['arc', 'arrow', 'score']) ) {
        this._decoration = value;
      }
    }

    features(term) {
      var viewer = this.viewer;
      var _features = new CGV.CGArray( viewer._features.filter( (f) => { return f.featureType == this } ));
      return _features.get(term);
    }

    remove() {
      var viewer = this.viewer;
      viewer._featureTypes = viewer._featureTypes.remove(this);
      viewer.trigger('feature-type-update');
    }

  }

  CGV.FeatureType = FeatureType;

})(CGView);
//////////////////////////////////////////////////////////////////////////////
// Font
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * <br />
   * The *Font* class stores the font internally as a CSS font string but makes it
   * easy to change individual components of the font. For example, the size can be
   * changed using the [size]{@link Font#size} method. A font consists of 3 components:
   *
   *   Component   | Description
   *   ------------|---------------
   *   *family*    | This can be a generic family (e.g. serif, sans-serif, monospace) or a specific font family (e.g. Times New Roman, Arail, or Courier)
   *   *style*     | One of *plain*, *bold*, *italic*, or *bold-italic*
   *   *size*      | The size of the font in pixels. The size will be adjusted for retina displays.
   *
   */
  class Font {

    /**
     * Create a new *Font*. The *Font* can be created using a string or an object representing the font.
     *
     * @param {(String|Object)} font - If a string is provided, it must have the following format:
     *   family,style,size (e.g. 'serif,plain,12'). If an object is provided, it must have a *family*,
     *   *style* and *size* property (e.g. { family: 'serif', style: 'plain', size: 12 })
     */
    constructor(font) {
      this._rawFont = font;
    }

    /**
     * Return the class name as a string.
     * @return {String} - 'Font'
     */
    toString() {
      return 'Font';
    }

    set _rawFont(font) {
      if (typeof font === 'string' || font instanceof String) {
        this.string = font;
      } else {
        var keys = new CGV.CGArray(Object.keys(font));
        if (keys.contains('family') && keys.contains('style') && keys.contains('size')) {
          this.family = font.family;
          this.style = font.style;
          this.size = font.size;
        } else {
          console.log('Font objects require the following keys: family, style, and size');
        }
      }
    }

    /**
     * @member {String} - Get or set the font using a simple string format: family,style,size (e.g. 'serif,plain,12').
     */
    get string() {
      return this.family + ',' + this.style + ',' + this.size
    }

    set string(value) {
      value = value.replace(/ +/g, '');
      var parts = value.split(',');
      if (parts.length == 3) {
        this.family = parts[0];
        this.style = parts[1];
        this.size = parts[2];
      } else {
        console.log('Font must have 3 parts')
      }
      this._generateFont();
    }

    /**
     * @member {String} - Return the font as CSS usable string. This is also how the font is stored internally for quick access.
     */
    get css() {
      return this._font
    }

    /**
     * Return the font as a CSS string with the size first scaled by multiplying by the *scale* factor.
     * @param {Number} scale - Scale factor.
     * @return {String} - Return the font as CSS usable string.
     */
    // cssScaled(scale) {
    //   if (scale && scale != 1) {
    //     return this._styleAsCss() + ' ' + (this.size * scale) + 'px ' + this.family;
    //   } else {
    //     return this.css
    //   }
    // }


    /**
     * @member {String} - Get or set the font family. Defaults to *sans-serif*.
     */
    get family() {
      return this._family || 'sans-serif'
    }

    set family(value) {
      this._family = value;
      this._generateFont();
    }

    /**
     * @member {Number} - Get or set the font size. The size is stored as a number and is in pixels.
     * The actual value may be altered when setting it to take into account the pixel
     * ratio of the screen. Defaults to *12*.
     */
    get size() {
      // return this._size || CGV.pixel(12)
      return this._size || 12
    }

    set size(value) {
      // this._size = CGV.pixel(Number(value));
      this._size = Number(value);
      this._generateFont();
    }

    /**
     * @member {String} - Get or set the font style. The possible values are *plain*, *bold*, *italic* and
     * *bold-italic*. Defaults to *plain*.
     */
    get style() {
      return this._style || 'plain'
    }

    set style(value) {
      this._style = value;
      this._generateFont();
    }

    /**
     * @member {Boolean} - Get or set the font boldness.
     */
    get bold() {
      return ( this.style == 'bold' || this.style == 'bold-italic')
    }

    set bold(value) {
      if (value) {
        if (this.style == 'plain') {
          this.style = 'bold';
        } else if (this.style == 'italic') {
          this.style = 'bold-italic';
        }
      } else {
        if (this.style == 'bold') {
          this.style = 'plain';
        } else if (this.style == 'bold-italic') {
          this.style = 'italic';
        }
      }
    }

    /**
     * @member {Boolean} - Get or set the font italics.
     */
    get italic() {
      return ( this.style == 'italic' || this.style == 'bold-italic')
    }

    set italic(value) {
      if (value) {
        if (this.style == 'plain') {
          this.style = 'italic';
        } else if (this.style == 'bold') {
          this.style = 'bold-italic';
        }
      } else {
        if (this.style == 'italic') {
          this.style = 'plain';
        } else if (this.style == 'bold-italic') {
          this.style = 'bold';
        }
      }
    }

    /**
     * @member {Number} - Get the font height. This will be the same as the font [size]{@link Font#size}.
     */
    get height() {
      return CGV.pixel(this.size)
    }


    /**
     * Measure the width of the supplied *text* using the *context* and the *Font* settings.
     *
     * @param {Context} context - The canvas context to use to measure the width.
     * @param {String} text - The text to measure.
     * @return {Number} - The width of the *text* in pixels.
     */
    width(ctx, text) {
      ctx.font = this.css;
      return ctx.measureText(text).width
    }

    copy() {
      return new CGV.Font(this.string)
    }

    _styleAsCss() {
      if (this.style == 'plain') {
        return 'normal'
      } else if (this.style == 'bold') {
        return 'bold'
      } else if (this.style == 'italic') {
        return 'italic'
      } else if (this.style == 'bold-italic') {
        return 'italic bold'
      } else {
        return ''
      }
    }

    _generateFont() {
      this._font = this._styleAsCss() + ' ' + CGV.pixel(this.size) + 'px ' + this.family;
    }

  }

  /**
   * Calculate the width of multiple *strings* using the supplied *fonts* and *context*.
   * This method minimizes the number of times the context font is changed to speed up
   * the calculations
   * @function calculateWidths
   * @memberof Font
   * @static
   * @param {Context} ctx - The context to use for measurements.
   * @param {Font[]} fonts - An array of fonts. Must be the same length as *strings*.
   * @param {String[]} strings - An array of strings. Must be the same length as *fonts*.
   * @return {Number[]} - An array of widths.
   */
  Font.calculateWidths = function(ctx, fonts, strings) {
    ctx.save();
    var widths = [];
    var map = [];

    for (var i = 0, len = fonts.length; i < len; i++) {
      map.push({
        index: i,
        font: fonts[i],
        text: strings[i]
      });
    }

    map.sort( (a,b) => {
      return a.font > b.font ? 1 : -1;
    });

    var currentFont = ''
    var font;
    for (var i = 0, len = map.length; i < len; i++) {
      font = map[i].font;
      text = map[i].text;
      if (font != currentFont) {
        ctx.font = font;
        currentFont = font;
      }
      // widths[i] = ctx.measureText(text).width;
      widths[map[i].index] = ctx.measureText(text).width;
    }
    ctx.restore();
    return widths
  }

  CGV.Font = Font;

})(CGView);
//////////////////////////////////////////////////////////////////////////////
// CGview Help
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class Help {

    constructor(viewer) {
      this.viewer = viewer;

      this.dialog = new CGV.Dialog(viewer, {
        header_text: 'CGView (CGV) Help',
        content_text: help_text,
        width: 700,
        height: 350
      });

    }

  }

  var help_text = '' +
    'The map can be scrolled around or scaled using the controls in the menu or by using the various mouse and keyboard shortcuts:' + 
    '<h3>Viewer Controls</h3>' +
    '<table class="cgv-table">' +
    '<thead><tr><th>Action</th><th>Command</th></tr></thead><tbody>' +
    '<tr><td>Zoom In/Out</td><td>Scroll wheel</td></tr>' +
    '<tr><td>Move Around</td><td>Click and Drag</td></tr></tbody></table>' +
    '<h3>Change Map</h3>' +
    '<table class="cgv-table">' +
    '<thead><tr><th>Action</th><th>Command</th></tr></thead><tbody>' +
    '<tr><td>Change Feature Colors</td><td>Click on color swatches in legend</td></tr>' +
    '</tbody></table>' +
    '<h3>Troubleshooting</h3>' +
    '<p>If the viewer is not showing any map or is slow, try updating to the latest version of your ' +
    'browser. We have found that <a href="https://www.google.com/chrome" target="_blank">Google Chrome</a> is the fastest.</p></div></div>';

  CGV.Help = Help;

})(CGView);


//////////////////////////////////////////////////////////////////////////////
// Highlighter
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * The Highlighter object controls highlighting of features and plots on the Viewer
   * when the mouse hovers over them.
   */
  class Highlighter {
    /**
     * The following options can be set when creating a
     * [SpectraViewer](SpectraViewer.js.html):
     *
     *  Option                | Default     | Description
     *  ----------------------|-------------------------------------------------
     *  textDisplay          | true        | Show popup with description of highlighted element. A custom display string can be provided to display specific information about the element. See below for examples.
     *  display               | {lineWidth: 3} | Display options as described in [SVPath](SVPath.js.html)
     *
     * ####Custom Text Display####
     *
     * If a String is provided for _text_display_ it will parsed first to replace sections
     * with this format: #{T:name} where T is how to extract the information and _name_ is the property/function name to call on the element
     * T can be one of:
     *   * p: property (e.g. element.name)
     *   * f: function (e.g. element.name( ))
     *   * m: meta property (e.g. element.meta.name)
     *
     * Example:
     *
     * If _text_display_ was "Compound: #{p:name} [#{f:display_concentration}]", this would
     * this would display something like the following:
     *   Compound: Glucose [132 uM]
     *
     *
     * @param {Viewer} viewer - The [Viewer](Viewer.html) object
     * @param {Object} options - Options for how highlighting should work. Described below.
     * @return {Highlighter}
     */
    constructor(viewer, options = {}) {
      this._viewer = viewer;
      this.textDisplay = CGV.defaultFor(options.textDisplay, true);
      // display_defaults = { lineWidth: 3, visible: true };
      // this.display = CGV.merge(display_defaults, options.display);
      // this.popup_box = this.sv.sv_wrapper.append('div').attr('class', 'jsv-highlight-popup-box').style('visibility', 'hidden');
      // this.text_container = this.popup_box.append('div').attr('class', 'jsv-highlight-text-container');
    }

    /**
     * @member {Viewer} - Get the viewer.
     */
    get viewer() {
      return this._viewer
    }


    // SVHighlighter.prototype.hover = function() {
    //   var sv = this.sv;
    //   if (this.element_type) {
    //     var old_element = this.highlighted_element;
    //     var element = sv.find_element_mouse_over(this.element_type, this.restriction_spectrum_id, this.possible_elements, this.visible_only);
    //     if ( sv.selection.mouse_in_selection() || sv.selection.mouse_in_handle() ) {
    //       element = undefined;
    //     }
    //     if (old_element != element) {
    //       this.highlighted_element = element;
    //       // Remove previous highlighting
    //       if (old_element) {
    //         old_element.display_settings(this.saved_display_settings);
    //         this.hide_popup_box();
    //       }
    //       // Highlight new element
    //       if (element) {
    //         this.saved_display_settings = element.display_settings();
    //         element.display_settings(this.display);
    //         this.show_popup_box();
    //       }
    //       // sv.calc_draw();
    //       sv.full_draw();
    //     }
    //   }
    // }
    //
    // SVHighlighter.prototype.remove = function() {
    //   if (this.highlighted_element) {
    //     this.highlighted_element.display_settings(this.saved_display_settings);
    //     this.highlighted_element = undefined;
    //     this.hide_popup_box();
    //   }
    // }
    //
    // SVHighlighter.prototype.hide_popup_box = function() {
    //   this.sv.trigger('highlight-end');
    //   // this.popup_box.style('display', 'none');
    //   this.popup_box.style('visibility', 'hidden');
    // }
    //
    // SVHighlighter.prototype.show_popup_box = function() {
    //   var element = this.highlighted_element;
    //   var text = '';
    //   if (this.textDisplay === true) {
    //     text = this.default_text();
    //   } else if (typeof this.textDisplay == 'string') {
    //     text = this.parsed_text();
    //   }
    //   this.sv.trigger('highlight-start');
    //   if (this.textDisplay) {
    //     // Increase popup width before adding text, so text_container is not compressed
    //     this.popup_box.style('width', '100%');
    //     this.text_container.html(text);
    //     // this.popup_box.style('display', 'block').style('width', parseInt(this.text_container.style('width')) + 20);
    //     var box_width = this.text_container.node().offsetWidth + 20;
    //     // Alter position if menu is showing
    //     var top = this.sv.menu.visible() ? this.sv.menu.height() + 5 : 15 ;
    //     // Show
    //     this.popup_box.style('visibility', 'visible')
    //       .style('top', top + 'px')
    //       .style('width', box_width + 'px');
    //   }
    // }
    //
    // SVHighlighter.prototype.default_text = function() {
    //   var text = '';
    //   if (this.element_type == 'peak') {
    //     text = 'Peak: ' + d3.round(this.highlighted_element.center, 3) + ' ppm';
    //   } else if (this.element_type == 'cluster') {
    //     text = 'Cluster: ' + d3.round(this.highlighted_element.center(), 3) + ' ppm';
    //   } else if (this.element_type == 'compound') {
    //     text = this.highlighted_element.name;
    //   } else if (this.element_type == 'spectrum') {
    //     text = this.highlighted_element.name;
    //   }
    //   return text;
    // }
    //
    //
    // SVHighlighter.prototype.parsed_text = function() {
    //   var element = this.highlighted_element;
    //   var parser = function(match, p1, p2) {
    //     var text;
    //     if (p1 == 'p') {
    //       text = element[p2];
    //     } else if (p1 == 'f') {
    //       text = element[p2]();
    //     } else if (p1 == 'm') {
    //       text = element.meta[p2];
    //     }
    //     return text;
    //   }
    // // 'bob#{a:1}test#{b:2}'.replace(/\#\{(.):(.*?)\}/g, function(match, p1, p2) {return ' - ' + p2 + ' - '})
    //   return this.textDisplay.replace(/#\{(.):(.*?)\}/g, parser);
    // }

  }

  CGV.Highlighter = Highlighter;

})(CGView);



//////////////////////////////////////////////////////////////////////////////
// IO
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class IO {

    /**
     * Interface for reading and writing data to and from CGView
     * @param {Viewer} viewer - Viewer stuff...
     */
    constructor(viewer) {
      this._viewer = viewer;
    }

    /**
     * Load data from NEW JSON format.
     * Removes any previous viewer data and overrides options that are already set.
     * @param {Object} data - TODO
     */
    loadJSON(json) {
      var viewer = this._viewer;
      // Load Sequence
      viewer._sequence = new CGV.Sequence(viewer, json.sequence);
      // Load Settings TODO:
      var settings = json.settings;
      // viewer.annotation.visible = CGV.defaultFor(json.globalLabel, viewer.globalLabel);
      // viewer.annotation.font = CGV.defaultFor(json.labelFont, viewer.labelFont);

      // Ruler
      viewer.ruler = new CGV.Ruler(viewer, settings.ruler);
      // Backbone
      viewer.backbone = new CGV.Backbone(viewer, settings.backbone);
      // Load Captions
      if (json.captions) {
        json.captions.forEach((captionData) => {
          new CGV.Caption(viewer, captionData);
        });
      }

      // Load Legend
      viewer.legend = new CGV.Legend(viewer, json.legend);

      // Create featureTypes
      if (json.featureTypes) {
        json.featureTypes.forEach((featureTypeData) => {
          new CGV.FeatureType(viewer, featureTypeData);
        });
      }

      // Create features
      if (json.features) {
        json.features.forEach((featureData) => {
          new CGV.Feature(viewer, featureData);
        });
      }

      if (json.dividers) {
      }

      if (json.plots) {
        json.plots.forEach((plotData) => {
          console.log('PLOT')
          new CGV.Plot(viewer, plotData);
        });
      }

      // Load Layout
      viewer.layout = new CGV.Layout(viewer, json.layout);

    }

    exportImage(width, height) {
      var viewer = this._viewer;
      var canvas = viewer.canvas;
      width = width || viewer.width;
      height = height || viewer.height;

      var windowTitle = 'CGV-Image-' + width + 'x' + height;

      // Adjust size based on pixel Ratio
      width = width / CGV.pixelRatio;
      height = height / CGV.pixelRatio;

      // Save current settings
      // var origContext = canvas.ctx;
      var origLayers = canvas._layers;
      var debug = viewer.debug;
      viewer.debug = false;

      // Create new layers and add export layer
      var layerNames = canvas.layerNames.concat(['export']);
      var tempLayers = canvas.createLayers(d3.select('body'), layerNames, width, height);

      // Calculate scaling factor
      var minNewDimension = d3.min([width, height]);
      var scaleFactor = minNewDimension / viewer.minDimension;

      // Scale context of layers, excluding the 'export' layer
      for (var name of canvas.layerNames) {
        tempLayers[name].ctx.scale(scaleFactor, scaleFactor);
      }
      canvas._layers = tempLayers;

      // Draw map on to new layers
      viewer.drawExport();
      viewer.fillBackground();
      // Legend
      viewer.legend.draw();
      // Captions
      for (var i = 0, len = viewer._captions.length; i < len; i++) {
        viewer._captions[i].draw();
      }

      // Copy drawing layers to export layer
      var exportContext = tempLayers['export'].ctx;
      exportContext.drawImage(tempLayers['background'].node, 0, 0);
      exportContext.drawImage(tempLayers['map'].node, 0, 0);
      exportContext.drawImage(tempLayers['captions'].node, 0, 0);

      // Generate image from export layer
      var image = tempLayers['export'].node.toDataURL();

      // Restore original layers and settings
      canvas._layers = origLayers
      viewer.debug = debug;

      // Delete temp canvas layers
      for (var name of layerNames) {
        d3.select(tempLayers[name].node).remove();
      }

      var win = window.open();
      var html = [
        '<html>',
          '<head>',
            '<title>',
              windowTitle,
            '</title>',
          '</head>',
          '<body>',
        // FIXME: The following 3 lines are TEMPORARILY commented out while making preview comparisons
            '<h2>Your CGView Image is Below</h2>',
            '<p>To save, right click on either image below and choose "Save Image As...". The two images are the same. The first is scaled down for easier previewing, while the second shows the map at actual size. Saving either image will download the full size map.</p>',
            '<h3>Preview</h3>',
            '<img style="border: 1px solid grey" width="' + viewer.width + '" height="' + viewer.height +  '" src="' + image +  '"/ >',
            '<h3>Actual Size</h3>',
            '<img style="border: 1px solid grey" src="' + image +  '"/ >',
          '</body>',
        '<html>'
      ].join('');
      win.document.write(html);
    }

  }

  CGV.IO = IO;

})(CGView);


    /**
     * Load data from OLD JSON format (modeled after XML from original CGView).
     * Removes any previous viewer data and overrides options that are already set.
     * @param {Object} data - TODO
     */
    // load_json(json) {
    //   var viewer = this._viewer;
    //
    //   // Determine scale factor between viewer and json map data
    //   var jsonMinDimension = Math.min(json.height, json.width);
    //   var viewerMinDimension = Math.min(viewer.height, viewer.width);
    //   var scaleFacter = jsonMinDimension / viewerMinDimension;
    //
    //   // Override Main Viewer settings
    //   if (json.sequence) {
    //     viewer.sequence.seq = json.sequence.seq;
    //   } else {
    //     viewer.sequence.length = CGV.defaultFor(json.sequenceLength, viewer.sequence.length);
    //   }
    //   viewer.globalLabel = CGV.defaultFor(json.globalLabel, viewer.globalLabel);
    //   viewer.labelFont = CGV.defaultFor(json.labelFont, viewer.labelFont);
    //   viewer.ruler.font = CGV.defaultFor(json.rulerFont, viewer.ruler.font);
    //   viewer.backbone.radius = json.backboneRadius / scaleFacter;
    //   viewer.backbone.color = CGV.defaultFor(json.backboneColor, viewer.backbone.color);
    //   viewer.backbone.thickness = Math.ceil(json.backboneThickness / scaleFacter);
    //   // ...
    //
    //   // Load Tracks
    //   if (json.tracks) {
    //     json.tracks.forEach((slotData) => {
    //       new CGV.Track(viewer, slotData);
    //     });
    //   }
    //
    //   // Load Legends
    //   if (json.legends) {
    //     json.legends.forEach((legendData) => {
    //       new CGV.Legend(viewer, legendData);
    //     });
    //   }
    //
    //   // Associate features and arcplots with LegendItems
    //   var swatchedLegendItems = viewer.swatchedLegendItems();
    //   var itemsLength = swatchedLegendItems.length;
    //   var legendItem;
    //   // Features
    //   var features = viewer.features();
    //   var feature;
    //   for (var i = 0, len = features.length; i < len; i++) {
    //     feature = features[i];
    //     for (var j = 0; j < itemsLength; j++) {
    //       legendItem = swatchedLegendItems[j];
    //       if (feature._color.rgbaString == legendItem.swatchColor.rgbaString) {
    //         feature.legendItem = legendItem;
    //         break
    //       }
    //     }
    //   }
    //   // Plots
    //   var plots = viewer.plots();
    //   var plot;
    //   for (var i = 0, len = plots.length; i < len; i++) {
    //     plot = plots[i];
    //     for (var j = 0; j < itemsLength; j++) {
    //       legendItem = swatchedLegendItems[j];
    //       if (plot._color.rgbaString == legendItem.swatchColor.rgbaString) {
    //         plot.legendItem = legendItem;
    //       }
    //       if (plot._colorPositive && plot._colorPositive.rgbaString == legendItem.swatchColor.rgbaString) {
    //         plot.legendItemPositive = legendItem;
    //       }
    //       if (plot._colorNegative && plot._colorNegative.rgbaString == legendItem.swatchColor.rgbaString) {
    //         plot.legendItemNegative = legendItem;
    //       }
    //     }
    //   }
    // }
//////////////////////////////////////////////////////////////////////////////
// Label
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class Label {

    constructor(feature, options = {}) {
      this._feature = feature;
      this.name = options.name;
      this.bp = this.feature.start + (this.feature.length / 2);
    }

    /**
     * @member {String} - Get or set the label name.
     */
    get name() {
      return this._name
    }

    set name(value) {
      if (value == undefined || value == '') {
        this.width = 0;
        // Label was in Annotation, so remove it
        if (!(this._name == '' || this._name == undefined)) {
          this.annotation.removeLabel(this);
        }
        this._name = '';
      } else {
        // Label was not in Annotation, so add it
        if (this._name == '' || this._name == undefined) {
          this.annotation.addLabel(this);
        }
        this._name = value;
        this.width = this.font.width(this.viewer.canvas.context('map'), this._name);
      }
    }

    /**
     * @member {Rect} - Get or set the label bounding rect.
     */
    get rect() {
      return this._rect
    }

    set rect(value) {
      this._rect = value;
    }

    /**
     * @member {Number} - Get or set the label width.
     */
    get width() {
      return this._width
    }

    set width(value) {
      this._width = value;
    }


    /**
     * @member {Number} - Get the label height which is based on the font size.
     */
    get height() {
      return this.font.height
    }

    /**
     * @member {Point} - Get or set the label origin. The upper-left corner of the label.
     */
    get origin() {
      return this._origin
    }

    set origin(value) {
      this._origin = value;
    }

    /**
     * @member {Number} - Get or set the label attachment point. This number represents where on the label
     *                    the label lines attaches in term of a hand on a clock. (e.g. 12 would be top middle of label)
     */
    get lineAttachment() {
      return this._lineAttachment
    }

    set lineAttachment(value) {
      this._lineAttachment = value;
    }

    /**
     * @member {Font} - Get or set the font. When setting the font, a string representing the font or a {@link Font} object can be used. For details see {@link Font}.
     */
    get font() {
      return this._font || this.annotation.font;
    }

    set font(value) {
      if (value == undefined) {
        this._font = this.annotation.font;
      } else if (value.toString() == 'Font') {
        this._font = value;
      } else {
        this._font = new CGV.Font(value);
      }
    }

    /**
     * @member {Viewer} - Get the *Viewer*
     */
    get viewer() {
      return this.feature.viewer
    }

    /**
     * @member {Annotation} - Get the *Annotation*
     */
    get annotation() {
      return this.viewer.annotation
    }

    /**
     * @member {Feature} - Get the Feature
     */
    get feature() {
      return this._feature
    }

    /**
     * @member {Number} - Get the start position of the feature
     */
    get start() {
      return this.feature.start
    }

    /**
     * @member {Number} - Get the stop position of the feature
     */
    get stop() {
      return this.feature.stop
    }


  }

  CGV.Label = Label;

})(CGView);


//////////////////////////////////////////////////////////////////////////////
// Layout
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * The Layout is in control of creating slots from tracks and drawing the map.
   */
  class Layout {

    /**
     * Create a Layout
     */
    constructor(viewer, data = {}, display = {}, meta = {}) {
      this._viewer = viewer;
      this._tracks = new CGV.CGArray();
      this._fastMaxFeatures = 1000;

      // Create tracks
      if (data.tracks) {
        data.tracks.forEach((trackData) => {
          new CGV.Track(this, trackData);
        });
      }
      //TODO:
      //console.log the number of features and plots not associated with a track

      this._adjustProportions();
    }

    /** * @member {Viewer} - Get the *Viewer*
     */
    get viewer() {
      return this._viewer
    }

    /** * @member {Canvas} - Get the *Canvas*
     */
    get canvas() {
      return this.viewer.canvas
    }

    /** * @member {Number} - Get the inside radius
     */
    get insideRadius() {
      return this._insideRadius
    }

    /** * @member {Number} - Get the outside radius
     */
    get outsideRadius() {
      return this._outsideRadius
    }

    /**
     * Calculate the backbone radius and slot proportions based on the Viewer size and
     * the number of slots.
     */
    _adjustProportions() {
      var viewer = this.viewer;
      // Maximum ring radius (i.e. the radius of the outermost ring) as a proportion of Viewer size
      var maxOuterProportion = 0.35;
      var maxOuterRadius = maxOuterProportion * viewer.minDimension;
      // Minimum space required at center of map as a proportion of Viewer size
      var minInnerProportion = 0.15;
      var minInnerRadius = minInnerProportion * viewer.minDimension;
      // The maximum amount of space for drawing slots
      var dividerSpace = this.visibleSlots().length * (viewer.slotDivider.thickness + viewer.slotDivider.spacing);
      var slotSpace = maxOuterRadius - minInnerRadius - viewer.backbone.thickness - dividerSpace;
      // Max slotnesses in pixels
      var maxFeatureSlotThickness = 30;
      var maxPlotSlotThickness = 100;
      // The maximum thickness ratio between plot and feature slots. If there is
      // space try to keep the plot thickness this many times thicker than the feature slot thickness.
      var maxPlotToFeatureRatio = 6;
      var nPlotSlots = this.visibleSlots().filter( (t) => { return t.type == 'plot' }).length;
      var nFeatureSlots = this.visibleSlots().filter( (t) => { return t.type == 'feature' }).length;
      // slotSpace = nPlotSlots * plotThickness + nFeatureSlots * featureThickness
      // plotThickness = maxPlotToFeatureRatio * featureThickness
      // Solve:
      var featureThickness = slotSpace / ( (maxPlotToFeatureRatio * nPlotSlots) + nFeatureSlots );
      var plotThickness = maxPlotToFeatureRatio * featureThickness;
      featureThickness = Math.min(featureThickness, maxFeatureSlotThickness);
      plotThickness = Math.min(plotThickness, maxPlotSlotThickness);
      // Determine thickness of outside slots
      var nOutsideSlots = this.visibleSlots().filter( (t) => { return t.outside });
      var outsideThickness = 0;
      nOutsideSlots.forEach( (slot) => {
        if (slot.type == 'feature') {
          outsideThickness += featureThickness;
        } else if (slot.type == 'plot') {
          outsideThickness += plotThickness;
        }
      });
      // Set backbone radius
      var backboneRadius = maxOuterRadius - outsideThickness;
      viewer.backbone.radius = backboneRadius;
      // Update slot thick proportions
      var featureProportionOfRadius = featureThickness / backboneRadius;
      var plotProportionOfRadius = plotThickness / backboneRadius;
      this.visibleSlots().each( (i, slot) => {
        if (slot.type == 'feature') {
          slot.proportionOfRadius = featureProportionOfRadius;
        } else if (slot.type == 'plot') {
          slot.proportionOfRadius = plotProportionOfRadius;
        }
      });
      this.updateLayout(true);
    }

    tracks(term) {
      return this._tracks.get(term)
    }

    slots(term) {
      var slots = new CGV.CGArray();
      for (var i=0, len=this._tracks.length; i < len; i++) {
        slots.merge(this._tracks[i]._slots);
      }
      return slots.get(term);
    }

    visibleSlots(term) {
      var slots = new CGV.CGArray(
        this.slots().filter( (s) => { return s.visible && s.track.visible })
      );
      return slots.get(term);
    }

    slotForRadius(radius) {
      var slots = this.visibleSlots();
      var slot;
      for (var i=0, len=slots.length; i < len; i++) {
        if (slots[i].containsRadius(radius)) {
          slot = slots[i];
          break;
        }
      }
      return slot
    }

    get slotLength() {
      return this._slotLength || 0
    }

    get fastMaxFeatures() {
      return this._fastMaxFeatures
    }

    get fastFeaturesPerSlot() {
      return this._fastFeaturesPerSlot
    }

    /**
     * Get or set the max slot thickness.
     */
    get maxSlotThickness() {
      return this._maxSlotThickness;
    }

    set maxSlotThickness(value) {
      this._maxSlotThickness = value;
    }

    drawMapWithoutSlots() {
      var viewer = this.viewer;
      var backbone = viewer.backbone;
      var canvas = this.canvas;
      var startTime = new Date().getTime();

      viewer.clear('map');
      viewer.clear('ui');

      if (viewer.messenger.visible) {
        viewer.messenger.close();
      }

      // All Text should have base line top
      // FIXME: contexts 
      // ctx.textBaseline = 'top';

      // Draw Backbone
      backbone.draw();

      // Recalculate the slot radius and thickness if the zoom level has changed
      this.updateLayout();

      // Divider rings
      viewer.slotDivider.draw();
      // Ruler
      viewer.ruler.draw(this.insideRadius, this.outsideRadius);
      // Labels
      if (viewer.annotation.visible) {
        viewer.annotation.draw(this.insideRadius, this.outsideRadius);
      }
      // Progess
      this.drawProgress();
      // Debug
      if (viewer.debug) {
        viewer.debug.data.time['fastDraw'] = CGV.elapsed_time(startTime);
        viewer.debug.draw(canvas.context('ui'));
      }
      if (canvas._testDrawRange) {
        var ctx = canvas.context('captions')
        ctx.strokeStyle = 'grey';
        ctx.rect(0, 0, canvas.width, canvas.height);
        ctx.stroke();
      }
      // Slots timout
      this._slotIndex = 0;
      if (this._slotTimeoutID) {
        clearTimeout(this._slotTimeoutID);
        this._slotTimeoutID = undefined;
      }
    }

    drawFast() {
      this.drawMapWithoutSlots();
      this.drawAllSlots(true);
    }

    drawFull() {
      this.drawMapWithoutSlots();
      this.drawAllSlots(true);
      this._drawFullStartTime = new Date().getTime();
      this.drawSlotWithTimeOut(this);
    }

    drawExport() {
      this.drawMapWithoutSlots();
      this.drawAllSlots(false);
    }

    draw(fast) {
      fast ? this.drawFast() : this.drawFull();
    }

    drawAllSlots(fast) {
      var track, slot;
      for (var i = 0, trackLen = this._tracks.length; i < trackLen; i++) {
        track = this._tracks[i];
        if (!track.visible) { continue }
        for (var j = 0, slotLen = track._slots.length; j < slotLen; j++) {
          slot = track._slots[j];
          if (!slot.visible) { continue }
          slot.draw(this.canvas, fast)
        }
      }
    }

    drawSlotWithTimeOut(layout) {
      var slots = layout.visibleSlots();
      var slot = slots[layout._slotIndex];
      if (!slot) { return }
      slot.clear();
      slot.draw(layout.canvas);
      layout._slotIndex++;
      if (layout._slotIndex < slots.length) {
        layout._slotTimeoutID = setTimeout(layout.drawSlotWithTimeOut, 0, layout);
      } else if (layout.viewer.debug) {
        layout.viewer.clear('ui');
        layout.viewer.debug.data.time['fullDraw'] = CGV.elapsed_time(layout._drawFullStartTime);
        layout.viewer.debug.draw(layout.canvas.context('ui'));
      }
    }

    /**
     * Updates the radius and thickness of every slot, divider and ruler, only if the zoom level has changed
     */
    updateLayout(force) {
      var viewer = this.viewer;
      if (!force && this._savedZoomFactor == viewer._zoomFactor) {
        return
      } else {
        this._savedZoomFactor = viewer._zoomFactor;
      }
      var backbone = viewer.backbone;
      var backboneThickness = CGV.pixel(backbone.zoomedThickness);
      var slotRadius = CGV.pixel(backbone.zoomedRadius);
      var directRadius = slotRadius + (backboneThickness / 2);
      var reverseRadius = slotRadius - (backboneThickness / 2);
      var spacing = CGV.pixel(viewer.slotDivider.spacing);
      var residualSlotThickness = 0;
      var track, slot;
      viewer.slotDivider.clearRadii();
      this._slotLength = 0;
      for (var i = 0, trackLen = this._tracks.length; i < trackLen; i++) {
        track = this._tracks[i];
        if (!track.visible) { continue }
        // Slots and Dividers
        for (var j = 0, slotLen = track._slots.length; j < slotLen; j++) {
          var slot = track._slots[j];
          if (!slot.visible) { continue }
          this._slotLength++;
          // Calculate Slot dimensions
          // The slotRadius is the radius at the center of the slot
          var slotThickness = this._calculateSlotThickness(slot.proportionOfRadius);
          slot._thickness = slotThickness;
          if (track.position == 'outside' || (track.position == 'both' && slot.isDirect()) ) {
            directRadius += ( (slotThickness / 2) + spacing + residualSlotThickness);
            slotRadius = directRadius;
          } else {
            reverseRadius -= ( (slotThickness / 2) + spacing + residualSlotThickness);
            slotRadius = reverseRadius;
          }

          slot._radius = slotRadius;

          residualSlotThickness = slotThickness / 2;

          // Calculate Divider dimensions
          if (viewer.slotDivider.visible) {
            var dividerThickness = viewer.slotDivider.thickness;
            if (track.position == 'outside' || (track.position == 'both' && slot.isDirect()) ) {
              directRadius += spacing + residualSlotThickness + dividerThickness;
              slotRadius = directRadius;
            } else {
              reverseRadius -= spacing + residualSlotThickness + dividerThickness;
              slotRadius = reverseRadius;
            }
            viewer.slotDivider.addRadius(slotRadius);
            residualSlotThickness = dividerThickness / 2;
          }
        }
      }
      this._fastFeaturesPerSlot = this._fastMaxFeatures / this.slotLength;
      this._insideRadius = reverseRadius;
      this._outsideRadius = directRadius;
    }

    /**
     * Slot thickness is based on a proportion of the backbone radius.
     * As the viewer is zoomed the slot radius increases until
     *  - The zoomed radius > the max zoomed radius (~ minimum dimension of the viewer).
     *    Therefore we should always be able to see all the slots in the viewer
     *  - The slot thickness is greater than the maximum allowed slot thickness (if it's defined)
     */
    _calculateSlotThickness(proportionOfRadius) {
      var viewer = this.viewer;
      var thickness = CGV.pixel( Math.min(viewer.backbone.zoomedRadius, viewer.maxZoomedRadius()) * proportionOfRadius);
      return (this.maxSlotThickness ? Math.min(thickness, CGV.pixel(this.maxSlotThickness)) : thickness)
    }

    drawProgress() {
      this.canvas.clear('background');
      var track, slot, progress;
      for (var i = 0, trackLen = this._tracks.length; i < trackLen; i++) {
        track = this._tracks[i];
        progress = track.loadProgress;
        for (var j = 0, slotLen = track._slots.length; j < slotLen; j++) {
          slot = track._slots[j];
          slot.drawProgress(progress);
        }
      }
    }

    moveTrack(oldIndex, newIndex) {
      this._tracks.move(oldIndex, newIndex);
      this._adjustProportions();
    }

    removeTrack(track) {
      this._tracks = this._tracks.remove(track);
      this._adjustProportions();
    }



  }

  CGV.Layout = Layout;

})(CGView);
//////////////////////////////////////////////////////////////////////////////
// Legend
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * <br />
   * The *Legend* is a subclass of Caption with the ability to draw swatches beside items.
   * @extends Caption
   */
  class Legend extends CGV.Caption {

    /**
     * Create a new Legend.
     *
     * @param {Legend} viewer - The parent *Viewer* for the *Legend*.
     * @param {Object} data - Data used to create the legend.
     *
     *  Option                | Default          | Description
     *  ----------------------|-------------------------------------------------
     *  position              | "upper-right"    | Where to draw the legend. One of "upper-left", "upper-center", "upper-right", "middle-left", "middle-center", "middle-right", "lower-left", "lower-center", or "lower-right".
     *  font                  | "SansSerif,plain,8" | A string describing the font. See {@link Font} for details.
     *  fontColor             | "black"          | A string describing the color. See {@link Color} for details.
     *  textAlignment         | "left"           | *left*, *center*, or *right*
     *  backgroundColor        | Viewer backgroundColor | A string describing the color. See {@link Color} for details.
     *
     * @param {Object=} meta - User-defined key:value pairs to add to the legend.
     */
    constructor(viewer, data = {}, meta = {}) {
      super(viewer, data, meta);
      this.name = 'Legend'
    }

    /**
     * Return the class name as a string.
     * @return {String} - 'Legend'
     */
    toString() {
      return 'Legend';
    }

    /**
     * @member {Viewer} - Get or set the *Viewer*
     */
    get viewer() {
      return this._viewer
    }

    set viewer(viewer) {
      this._viewer = viewer;
    }

    /**
     * @member {LegendItem} - Get or set the selected swatch legendItem
     */
    get selectedSwatchedItem() {
      return this._selectedSwatchedItem
    }

    set selectedSwatchedItem(value) {
      this._selectedSwatchedItem = value;
    }

    /**
     * @member {LegendItem} - Get or set the highlighted swatch legendItem
     */
    get highlightedSwatchedItem() {
      return this._highlightedSwatchedItem
    }

    set highlightedSwatchedItem(value) {
      this._highlightedSwatchedItem = value;
    }

    // Legend is in Canvas space (need to consider pixel ratio) but colorPicker is not.
    setColorPickerPosition(cp) {
      var margin = 5;
      var pos;
      var viewerRect = this.viewer._container.node().getBoundingClientRect();
      var originX = this.originX / CGV.pixel(1) + viewerRect.left + window.pageXOffset;
      var originY = this.originY / CGV.pixel(1) + viewerRect.top + window.pageYOffset;
      var legendWidth = this.width / CGV.pixel(1);
      if (/-left$/.exec(this.position)) {
        pos = {x: originX + legendWidth + margin, y: originY}
      } else {
        pos = {x: originX - cp.width - margin, y: originY}
      }
      cp.setPosition(pos);
    }

    get swatchPadding() {
      return this.padding / 2
    }

    findLegendItemByName(name) {
      if (!name) { return }
      return this._items.find( (i) => { return name.toLowerCase() == i.text.toLowerCase() });
    }

    findLegendItemOrCreate(name = 'Unknown', color = 'black') {
      var item = this.findLegendItemByName(name);
      if (!item) {
        item = new CGV.LegendItem(this, {
          text: name,
          swatchColor: color
        });
      }
      return item
    }

    draw() {
      if (!this.visible) { return }
      var ctx = this.ctx;
      this.fillBackground();
      var textX, swatchX;
      ctx.lineWidth = 1;
      ctx.textBaseline = 'top';
      for (var i = 0, len = this._items.length; i < len; i++) {
        var legendItem = this._items[i];
        if (!legendItem.visible) { continue }
        var y = legendItem.textY();
        var legendItemHeight = legendItem.height;
        var drawSwatch = legendItem.drawSwatch;
        var swatchWidth = legendItem.swatchWidth;
        ctx.font = legendItem.font.css;
        ctx.textAlign = legendItem.textAlignment;
        if (drawSwatch) {
          // Swatch border color
          if (legendItem.swatchSelected) {
            ctx.strokeStyle = 'black';
          } else if (legendItem.swatchHighlighted) {
            ctx.strokeStyle = 'grey';
          } else {
            ctx.strokeStyle = this.backgroundColor.rgbaString;
          }
          // Draw box around Swatch depending on state
          var border = CGV.pixel(2)
          var swatchX = legendItem.swatchX();
          ctx.strokeRect(swatchX - border, y - border, swatchWidth + (border * 2), swatchWidth + (border * 2));
          // Draw Swatch
          ctx.fillStyle = legendItem.swatchColor.rgbaString;
          ctx.fillRect(swatchX, y, swatchWidth, swatchWidth);
        }
        // Draw Text Label
        ctx.fillStyle = legendItem.fontColor.rgbaString;
        ctx.fillText(legendItem.text, legendItem.textX(), y);
      }
    }

  }

  CGV.Legend = Legend;

})(CGView);
//////////////////////////////////////////////////////////////////////////////
// LegendItem
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * <br />
   * A *legendItem* is used to add text to a map *legend*. Individual
   * *Features* and *Plots* can be linked to a *legendItem*, so that the feature
   * or plot color will use the swatchColor of *legendItem*.
   * @extends CaptionItem
   */
  class LegendItem extends CGV.CaptionItem {

    /**
     * Create a new LegendItem. By default a legendItem will use its parent legend font, fontColor and textAlignment.
     *
     * @param {Legend} legend - The parent *Legend* for the *LegendItem*.
     * @param {Object} data - Data used to create the legendItem:
     *
     *  Option                | Default          | Description
     *  ----------------------|-------------------------------------------------
     *  text                  | ""               | Text to display
     *  drawSwatch            | false            | Should a swatch be drawn beside the text
     *  font                  | Legend font      | A string describing the font. See {@link Font} for details.
     *  fontColor             | Legend fontColor | A string describing the color. See {@link Color} for details.
     *  textAlignment         | Legend textAlignment | *left*, *center*, or *right*
     *  swatchColor           | 'black'          | A string describing the color. See {@link Color} for details.
     *  swatchOpacity         | 1                | A value between 0 and 1.
     *
     * @param {Object=} meta - User-defined key:value pairs to add to the legendItem.
     */
    constructor(parent, data = {}, meta = {}) {
      super(parent, data, meta)
      this._drawSwatch = CGV.defaultFor(data.drawSwatch, true);
      this._swatchColor = new CGV.Color( CGV.defaultFor(data.swatchColor, 'black') );
      this.refresh();
      this.viewer.trigger('legend-update');
    }

    /**
     * Return the class name as a string.
     * @return {String} - 'LegendItem'
     */
    toString() {
      return 'LegendItem';
    }

    /**
     * @member {Legend} - Get the *Legend*
     */
    get legend() {
      return this._parent
    }

    /**
     * @member {Boolean} - Get or set the drawSwatch property. If true a swatch will be
     * drawn beside the legendItem text.
     */
    get drawSwatch() {
      return this._drawSwatch
    }

    set drawSwatch(value) {
      this._drawSwatch = value;
      this.refresh();
    }

    get swatchWidth() {
      return this.height
    }

    /**
     * @member {Color} - Get or set the swatchColor. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
     */
    get swatchColor() {
      return this._swatchColor
    }

    set swatchColor(color) {
      if (color.toString() == 'Color') {
        this._swatchColor = color;
      } else {
        this._swatchColor.setColor(color);
      }
      this.refresh();
    }

    /**
     * @member {Color} - Alias for  [swatchColor](LegendItem.html#swatchColor).
     */
    get color() {
      return this.swatchColor
    }

    set color(color) {
      this.swatchColor = color
    }

    /**
     * @member {Boolean} - Get or set whether this item is selected
     */
    get swatchSelected() {
      return this.legend.selectedSwatchedItem == this
    }

    set swatchSelected(value) {
      if (value) {
        this.legend.selectedSwatchedItem = this;
      } else {
        if (this.legend.selectedSwatchedItem == this) {
          this.legend.selectedSwatchedItem = undefined;
        }
      }
    }

    /**
     * @member {Boolean} - Get or set whether this item is highlighted
     */
    get swatchHighlighted() {
      return this.legend.highlightedSwatchedItem == this
    }

    set swatchHighlighted(value) {
      if (value) {
        this.legend.highlightedSwatchedItem = this;
      } else {
        if (this.legend.highlightedSwatchedItem == this) {
          this.legend.highlightedSwatchedItem = undefined;
        }
      }
    }


    textX() {
      if (this.drawSwatch) {
        var parent = this.parent;
        if (this.textAlignment == 'left') {
          return this.swatchX() + this.swatchWidth + parent.swatchPadding;
        } else if (this.textAlignment == 'center') {
          return parent.originX + (parent.width / 2);
        } else if (this.textAlignment == 'right') {
          return this.swatchX() - parent.swatchPadding;
        }
      } else {
        return super.textX();
      }
    }

    swatchX() {
      var parent = this.parent;
      if (this.textAlignment == 'left') {
        return parent.originX + parent.padding;
      } else if (this.textAlignment == 'center') {
        return parent.originX + parent.padding;
      } else if (this.textAlignment == 'right') {
        return parent.originX + parent.width - parent.padding - this.swatchWidth;
      }
    }


    // FIXME: does not work for swatches aligned right; need swatchY method
    _swatchContainsPoint(pt) {
      var x = this.parent.originX + this.parent.padding;
      var y = this.parent.originY + this.parent.padding;
      var visibleItems = this.parent.visibleItems();
      for (var i = 0, len = visibleItems.length; i < len; i++) {
        var item = visibleItems[i];
        if (item == this) { break }
        y += (item.height * 1.5);
      }

      if (pt.x >= x && pt.x <= x + this.height && pt.y >= y && pt.y <= y + this.height) {
        return true
      }
    }

    features(term) {
      var viewer = this.viewer;
      var _features = new CGV.CGArray( viewer._features.filter( (f) => { return f.legendItem == this } ));
      return _features.get(term);
    }

    plots(term) {
      var viewer = this.viewer;
      var _plots = new CGV.CGArray( viewer._plots.filter( (f) => {
        return (f.legendItem == this || f.legendItemPositive == this || f.legendNegative == this)
      }));
      return _plots.get(term);
    }
  }

  CGV.LegendItem = LegendItem;

})(CGView);
//////////////////////////////////////////////////////////////////////////////
// CGViewer Menu
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * Menu
   */
  class Menu {

    // NOTE: need to explicitly state menu and handle sizes here and not just in CSS
    // in order to work with hidden elements like tabs
    /**
     * Create a new menu
     */
    constructor(viewer) {
      this.viewer = viewer;
      this.slideTime = 500;
      // this.available = true;
      this._menu_div = viewer._wrapper.append('div')
        .style('visibility', 'hidden')
        .attr('class', 'cgv-menu')
        .on('click', function() { window.getSelection().removeAllRanges() });
      this._menu_svg = this._menu_div.append('svg')
        .attr('width', this.width)
        .attr('height', this.height);
      this._handle_div = viewer._wrapper.append('div')
        .attr('class', 'cgv-menu-handle')
        .on('click', () => { this.opened ? this.close() : this.open(); })
        .on('mouseover', () => { this._handle_mouseover(); })
        .on('mouseout', () => { this._handle_mouseout(); });

      var handle_width = 40;
      var handle_height = 12;

      this._handle_svg = this._handle_div.append('svg')
        .attr('width', handle_width)
        .attr('height', handle_height);

      this._handle_stroke_width = 4
      this._handle_data_closed = [ {x: 0, y: 0}, {x: handle_width/2, y: handle_height - this._handle_stroke_width}, {x: handle_width, y: 0} ];
      this._handle_data_opened = [ {x: 0, y: handle_height}, {x: handle_width/2, y: this._handle_stroke_width}, {x: handle_width, y: handle_height} ];

      this._draw();
      // viewer.trigger('domain-change.menu');
    }


    //////////////////////////////////////////////////////////////////////////
    // MEMBERS
    //////////////////////////////////////////////////////////////////////////

    /**
     * @member {Number} - Get or set the time it take for the menu to appear and disappear in milliseconds [Default: 500].
     */
    get slideTime() {
      return this._slideTime;
    }

    set slideTime(value) {
      this._slideTime = value;
    }

    /**
     * @member {Boolean} - Get or set the availability of the menu. If false, the menu will not be visible at all.
     */
    get available() {
      return this._available;
    }

    set available(value) {
      if (value) {
        this._available = true;
        this._handle_div.style('visibility', 'visible');
        this._menu_div.style('visibility', 'visible');
      } else {
        this._available = false;
        this._handle_div.style('visibility', 'hidden');
        this._menu_div.style('visibility', 'hidden');
      }
    }

    /**
     * @member {Boolean} - Returns true if the menu is open.
     */
    get opened() {
      return (this._menu_div.style('visibility') == 'visible');
    }

    /**
     * @member {Number} - Returns the width of the menu.
     */
    get width() {
      // return this._menu_div.node().offsetWidth;
      // return this._menu_div.node().getBoundingClientRect().width;
      return 300;
    }

    /**
     * @member {Number} - Returns the height of the menu.
     */
    get height() {
      // return this._menu_div.node().offsetHeight;
      // return this._menu_div.node().getBoundingClientRect().height;
      return  41;
    }

    //////////////////////////////////////////////////////////////////////////
    // METHODS
    //////////////////////////////////////////////////////////////////////////

  /**
   * Opens the menu
   * @param {Number} duration - The duration of the open animation in milliseconds. Defaults to slideTime [Menu.slideTime](Menu.html#slideTime).
   */
    open(duration) {
      duration = CGV.defaultFor(duration, this.slideTime)
      this._menu_div.style('visibility', 'visible');
      this._menu_div.transition().duration(duration)
        .style('top', '0px')
        .style('opacity', 1);

      this._handle_path.transition('shape').duration(duration).attr('d', line_function(this._handle_data_opened))
    }

  /**
   * Closes the menu
   * @param {Number} duration - The duration of the close animation in milliseconds. Defaults to slideTime [Menu.slideTime](Menu.html#slideTime).
   */
    close(duration) {
      duration = CGV.defaultFor(duration, this.slideTime)
      this._menu_div.transition().duration(duration)
        .style('top', '-50px')
        .style('opacity', 0)
        .on('end', function() {
          d3.select(this).style('visibility', 'hidden');
        });

      this._handle_path.transition('shape').duration(duration).attr('d', line_function(this._handle_data_closed))
    }

    _handle_mouseover() {
      this._handle_path.transition('color').duration(200)
        .attr('stroke', 'black');
    }

    _handle_mouseout() {
      this._handle_path.transition().duration(200)
        .attr('stroke', 'grey');
    }

    _draw() {
      var viewer = this.viewer;
      var self = this;
      var timeout;
      var translate_px = 5;
      var mousedown_delay = 4;

      // Handle
      this._handle_path = this._handle_svg.append("path")
        .attr("d", line_function(this._handle_data_closed))
        .attr("stroke", "grey")
        .attr("stroke-width", this._handle_stroke_width)
        .attr("fill", "none");

      // Scroll/Move Buttons
      var left_arrow_data = [ {x: 11, y: 4}, {x: 4, y: 15}, {x: 11, y: 26} ];
      var right_arrow_data = [ {x: 4, y: 4}, {x: 11, y: 15}, {x: 4, y: 26} ];

      var left_arrow = path(this._menu_svg, left_arrow_data);
      var right_arrow = path(this._menu_svg, right_arrow_data);

      this.nav_group = this._menu_svg.append('g');
      this.scroll_left_button = button(this.nav_group, 0, 0, 15, 30, left_arrow);
      this.scroll_right_button = button(this.nav_group, 17, 0, 15, 30, right_arrow);
      this.nav_group.attr('transform', 'translate(' + 7 + ',' + 4 + ')');

      // this.scroll_left_button.on('mousedown', function() {
      //   if (d3.select(this).classed('disabled')) return;
      //   timeout = scroll_interval(viewer, 'x', translate_px, mousedown_delay);
      //   return false;
      // })
      //
      // this.scroll_right_button.on('mousedown', function() {
      //   if (d3.select(this).classed('disabled')) return;
      //   timeout = scroll_interval(viewer, 'x', -translate_px, mousedown_delay);
      //   return false;
      // })

      $(document).mouseup(function(){
        if (timeout) {
          clearInterval(timeout);
          viewer.full_draw();
        }
      });

      // Zoom Buttons
      this.zoom_group = this._menu_svg.append('g');
      this.zoom_y_minus_button = button(this.zoom_group, 6, 18, 16, 16, minus_path(this._menu_svg));
      this.zoom_y_plus_button = button(this.zoom_group, 6, 0, 16, 16, plus_path(this._menu_svg));
      this.zoom_x_minus_button = button(this.zoom_group, 25, 9, 16, 16, minus_path(this._menu_svg));
      this.zoom_x_plus_button = button(this.zoom_group, 43, 9, 16, 16, plus_path(this._menu_svg));
      scale_path(this.zoom_group, 0, 0.5, 5, 34, 0);
      scale_path(this.zoom_group, 25.5, 32, 5, 34, -90);
      this.zoom_group.attr('transform', 'translate(' + 55 + ',' + 2 + ')');

      this.zoom_x_minus_button.on('click', function() {
        if (d3.select(this).classed('disabled')) return;
        var zoom_diff = viewer.scale.x.diff() / 2;
        var new_domains =  [ [viewer.scale.x.min() - zoom_diff, viewer.scale.x.max() + zoom_diff], viewer.scale.y.domain() ];
        viewer.move_to(new_domains)
      })

      this.zoom_x_plus_button.on('click', function() {
        if (d3.select(this).classed('disabled')) return;
        var zoom_diff = viewer.scale.x.diff() / 4;
        var new_domains =  [ [viewer.scale.x.min() + zoom_diff, viewer.scale.x.max() - zoom_diff], viewer.scale.y.domain() ];
        viewer.move_to(new_domains)
      })

      this.zoom_y_minus_button.on('click', function() {
        if (d3.select(this).classed('disabled')) return;
        var zoom_diff = viewer.scale.y.diff() / 2;
        var new_domains =  [ viewer.scale.x.domain(), [viewer.scale.y.min() - zoom_diff, viewer.scale.y.max() + zoom_diff] ];
        viewer.move_to(new_domains)
      })

      this.zoom_y_plus_button.on('click', function() {
        if (d3.select(this).classed('disabled')) return;
        var zoom_diff = viewer.scale.y.diff() / 4;
        var new_domains =  [ viewer.scale.x.domain(), [viewer.scale.y.min() + zoom_diff, viewer.scale.y.max() - zoom_diff] ];
        viewer.move_to(new_domains)
      })

      // // Set button disabled status
      // viewer.on('domain-change.menu', function() {
      //   if (viewer.zoom_x == 1) {
      //     self.zoom_x_minus_button.classed('disabled', true);
      //   } else if (viewer.zoom_x >= viewer.zoom_max) {
      //     self.zoom_x_plus_button.classed('disabled', true);
      //   } else {
      //     self.zoom_x_minus_button.classed('disabled', false);
      //     self.zoom_x_plus_button.classed('disabled', false);
      //   }
      //   if (viewer.zoom_y == 1) {
      //     self.zoom_y_minus_button.classed('disabled', true);
      //   } else if (viewer.zoom_y >= viewer.zoom_max) {
      //     self.zoom_y_plus_button.classed('disabled', true);
      //   } else {
      //     self.zoom_y_minus_button.classed('disabled', false);
      //     self.zoom_y_plus_button.classed('disabled', false);
      //   }
      //   if (viewer.scale.x.min() == viewer.boundary.x.min()) {
      //     self.scroll_right_button.classed('disabled', true);
      //   } else {
      //     self.scroll_right_button.classed('disabled', false);
      //   }
      //   if (viewer.scale.x.max() == viewer.boundary.x.max()) {
      //     self.scroll_left_button.classed('disabled', true);
      //   } else {
      //     self.scroll_left_button.classed('disabled', false);
      //   }
      // });


      // Help Button
      var help_icon = this._menu_svg.append('text')
        .attr('x', 15)
        .attr('y', 24)
        .attr('font-family', 'sans-serif')
        .attr('font-size', '26px')
        .attr('stroke-width', 1)
        .attr('fill', 'black')
        .attr('class', 'cgv-button-text')
        .style('text-anchor', 'middle' )
        .text('?');
      this.help_button = button(this._menu_svg, 260, 4, 30, 30, help_icon);

      this.help_button.on('click', function() {
        viewer.help.dialog.open();
      })

      // Save/Download Button
      var download_group = download_path(this._menu_svg)
        .attr('transform', 'translate(5,7)');

      this.download_button = button(this._menu_svg, 220, 4, 30, 30, download_group);
      this.download_dialog = new CGV.Dialog(viewer, {
        header_text: 'Save Image',
        content_text: download_html(viewer),
        buttons: {
          'Cancel': function() { this.close(); },
          'Generate': function() { download_image(viewer, this); }
        }, width: 400,
        height: 200
      });

      this.download_button.on('click', function() {
        self.download_dialog.open();
      })

      // Settings Button
      var settings_group = settings_path(this._menu_svg)
        .attr('transform', 'translate(5,5)');

      this.settings_button = button(this._menu_svg, 180, 4, 30, 30, settings_group);

      this.settings_button.on('click', function() {
        viewer.settings.open();
      })

      // CGV Button
      // TODO: add link to CGV website when available
      var cgv_icon = this._menu_svg.append('text')
        .attr('x', 149)
        .attr('y', 32)
        .attr('font-family', 'sans-serif')
        .attr('font-size', '16px')
        .attr('font-weight', 'bold')
        .attr('stroke-width', 1)
        .attr('fill', 'grey')
        .attr('class', 'cgv-button-text')
        .style('text-anchor', 'middle' )
        .text('CGV');

    }

    // var scroll_interval = function(viewer, axis, translate_px, delay) {
    //   return setInterval(function() {
    //     viewer.translate_axis(axis, translate_px);
    //     viewer.fast_draw();
    //   }, delay)
    // }

  }
    var path = function(svg, path_data) {
      return svg.append('path')
        .attr('d', line_function(path_data))
        .attr('stroke', 'black')
        // .attr('stroke-linecap', 'round')
        .attr("stroke-width", 3)
        .attr("fill", "none");
    }

    var plus_path = function(svg) {
      var group = svg.append('g');
      group.append('line')
        .attr('x1', 3)
        .attr('y1', 8)
        .attr('x2', 13)
        .attr('y2', 8)
        .attr('stroke-width', 3)
        .attr('stroke', 'black');

      group.append('line')
        .attr('x1', 8)
        .attr('y1', 3)
        .attr('x2', 8)
        .attr('y2', 13)
        .attr('stroke-width', 3)
        .attr('stroke', 'black');

      return group;
    }

    var minus_path = function(svg) {
      return svg.append('line')
        .attr('x1', 3)
        .attr('y1', 8)
        .attr('x2', 13)
        .attr('y2', 8)
        .attr('stroke-width', 3)
        .attr('stroke', 'black');
    }

    var scale_path = function(svg, x, y, width, height, angle) {
      var group = svg.append('g');
      var stroke_width = 1;
      var gap = 2;
      var y1_with_gap = y + gap;
      var y2_with_gap = y + height - gap;
      var head_len = 2;
      var center = x + (width / 2);
      group.append('line').attrs({
        x1: x, y1: y,
        x2: x + width, y2: y,
        'stroke-width': stroke_width
      });
      group.append('line').attrs({
        x1: x, y1: y + height,
        x2: x + width, y2: y + height,
        'stroke-width': stroke_width
      });
      group.append('line').attrs({
        x1: center, y1: y1_with_gap,
        x2: center, y2: y2_with_gap,
        'stroke-width': stroke_width
      });
      group.append('line').attrs({
        x1: center, y1: y1_with_gap,
        x2: center - head_len, y2: y1_with_gap + head_len,
        'stroke-width': stroke_width
      });
      group.append('line').attrs({
        x1: center, y1: y1_with_gap,
        x2: center + head_len, y2: y1_with_gap + head_len,
        'stroke-width': stroke_width
      });
      group.append('line').attrs({
        x1: center, y1: y2_with_gap,
        x2: center - head_len, y2: y2_with_gap - head_len,
        'stroke-width': stroke_width
      });
      group.append('line').attrs({
        x1: center, y1: y2_with_gap,
        x2: center + head_len, y2: y2_with_gap - head_len,
        'stroke-width': stroke_width
      });

      group
        .attr('stroke', 'rgb(150, 150, 150)')
        .attr('transform', 'rotate(' + angle + ',' + x + ',' + y + ')');
      return group;
    }

    var settings_path = function(svg) {
      var group = svg.append('g');
      var stroke_width = 4;
      group.append('circle').attrs({
        cx: 10, cy:10, r: 7,
      }).style('fill', 'rgb(75, 75, 75');
      group.append('line').attrs({
        x1: 10, y1: 1,
        x2: 10, y2: 19,
        'stroke-width': stroke_width
      });
      group.append('line').attrs({
        x1: 1, y1: 10,
        x2: 19, y2: 10,
        'stroke-width': stroke_width
      });
      group.append('line').attrs({
        x1: 3.5, y1: 3.5,
        x2: 16.5, y2: 16.5,
        'stroke-width': stroke_width
      });
      group.append('line').attrs({
        x1: 16.5, y1: 3.5,
        x2: 3.5, y2: 16.5,
        'stroke-width': stroke_width
      });
      group.append('circle').attrs({
        cx: 10, cy:10, r: 3,
      }).style('fill', 'white');

      // group.append('line').attrs({
      //   x1: 10, y1: 3,
      //   x2: 10, y2: 17,
      //   'stroke-width': stroke_width
      // });
      // group.append('line').attrs({
      //   x1: 3, y1: 10,
      //   x2: 17, y2: 10,
      //   'stroke-width': stroke_width
      // });
      // group.append('line').attrs({
      //   x1: 5, y1: 5,
      //   x2: 15, y2: 15,
      //   'stroke-width': stroke_width
      // });
      // group.append('line').attrs({
      //   x1: 15, y1: 5,
      //   x2: 5, y2: 15,
      //   'stroke-width': stroke_width
      // });
      // group.append('circle').attrs({
      //   cx: 10, cy:10, r: 5,
      // }).style('fill', 'rgb(75, 75, 75');
      // group.append('circle').attrs({
      //   cx: 10, cy:10, r: 3,
      // }).style('fill', 'white');

      return group;
    }

    var download_path = function(svg) {
      var group = svg.append('g');
      var stroke_width = 3;
      group.append('line').attrs({
        x1: 10, y1: 0,
        x2: 10, y2: 12,
        'stroke-linecap': 'round',
        'stroke-width': stroke_width
      });
      group.append('line').attrs({
        x1: 6, y1: 7,
        x2: 10, y2: 12,
        'stroke-linecap': 'round',
        'stroke-width': stroke_width
      });
      group.append('line').attrs({
        x1: 14, y1: 7,
        x2: 10, y2: 12,
        'stroke-linecap': 'round',
        'stroke-width': stroke_width
      });
      group.append('line').attrs({
        x1: 2, y1: 16,
        x2: 18, y2: 16,
        'stroke-linecap': 'round',
        'stroke-width': stroke_width
      });

      return group;
    }

    var button = function(svg, x, y, width, height, path_group) {
      var button_group = svg.append('g').attr('class', 'cgv-menu-button');
      button_group.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', width)
        .attr('height', height)
        .attr('rx', 2)
        .attr('ry', 2)
        .style({
          'stroke-width': 1
        });

      var path = path_group.remove();
      button_group.append('g').
        attr('class', 'cgv-button-image').
        append(function() { return path.node(); });

      button_group.attr('transform', 'translate(' + x + '.5,' + y + '.5)')

      return button_group;
    }

    var line_function = d3.line()
      .x(function(d) { return d.x; })
      .y(function(d) { return d.y; });

    var download_html = function(viewer) {
      return   '' +
      '<div class="cgv-alert">Display the viewer image in a new window to download or print. Note that you must allow pop-ups!</div>' +
      // Width AND Height
      // '<div><label class="cgv-label">Width</label><div class="cgv-input-group">' + 
      // '<input class="cgv-input" id="cgv-save-width" type="text" value="' + viewer.width + '" /><div class="cgv-input-addon">px</div></div></div>' +
      // '<div><label class="cgv-label">Height</label><div class="cgv-input-group">' + 
      // '<input class="cgv-input" id="cgv-save-height" type="text" value="' + viewer.height + '" /><div class="cgv-input-addon">px</div></div></div>';
      // Size
      '<div><label class="cgv-label">Size</label><div class="cgv-input-group">' + 
      '<input class="cgv-input" id="cgv-save-width" type="text" value="' + viewer.width + '" /><div class="cgv-input-addon">px</div></div></div>';
    }

    var download_image = function(viewer, dialog) {
      // var height = viewer._wrapper.select('#cgv-save-height').property('value');
      var height = viewer._wrapper.select('#cgv-save-width').property('value');
      var width = viewer._wrapper.select('#cgv-save-width').property('value');
      var image = viewer.io.exportImage(width, height);
      dialog.close();
    }

  CGV.Menu = Menu;

})(CGView);


//////////////////////////////////////////////////////////////////////////////
// Messenger
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   *
   */
  class Messenger {

    /**
     * Class to shoe message on viewer
     *
     */
    constructor(viewer, options = {}) {
      this._viewer = viewer;
      this._wrapper = viewer._wrapper.node();

      this.fadeTime = CGV.defaultFor(options.fadeTime, 100);
      this.height = CGV.defaultFor(options.height, 40);
      this.width = CGV.defaultFor(options.width, 200);

      this.box = d3.select(this._wrapper).append('div')
        .style('display', 'none')
        // .attr('class', 'cgv-dialog');
        .attr('class', 'cgv-messenger')
        .style('width', this.height)
        .style('height', this.width)
        // .style('line-height', this.height);
        // .style('border', '1px solid black')
        // .style('position', 'absolute')
        // .style('top', '0')
        // .style('bottom', '0')
        // .style('right', '0')
        // .style('left', '0')
        // .style('text-align', 'center')
        // .style('margin', 'auto auto');

      this.contents = this.box.append('div')
        .attr('class', 'cgv-messenger-contents');

      this._adjust_size();

      return this;
    }

    /**
     * Return the class name as a string.
     * @return {String} - 'Messenger'
     */
    toString() {
      return 'Messenger';
    }

    //////////////////////////////////////////////////////////////////////////
    // MEMBERS
    //////////////////////////////////////////////////////////////////////////

    /**
     * @member {Viewer} - Get the viewer.
     */
    get viewer() {
      return this._viewer
    }

    /**
     * @member {Boolean} - Returns true if the dialog is visible.
     */
    get visible() {
      return (this.box.style('display') != 'none');
    }

    /**
     * @member {Number} - Get or set the time it take for the dialog to appear and disappear in milliseconds [Default: 500].
     */
    get fadeTime() {
      return this._fadeTime;
    }

    set fadeTime(value) {
      this._fadeTime = value;
    }

    //////////////////////////////////////////////////////////////////////////
    // METHODS
    //////////////////////////////////////////////////////////////////////////

  /**
   * Opens the messenger
   * @param {Number} duration - The duration of the open animation in milliseconds. Defaults to fadeTime [Dialog.fadeTime](Dialog.html#fadeTime).
   */
    open(duration) {
      duration = CGV.defaultFor(duration, this.fadeTime)
      this._adjust_size();
      this.box.style('display', 'block');
      // this.box.transition().duration(duration)
      //   .style('opacity', 1);
      this.box.style('opacity', 1);
      return this;
    }

  /**
   * Closes the messenger
   * @param {Number} duration - The duration of the close animation in milliseconds. Defaults to fadeTime [Dialog.fadeTime](Dialog.html#fadeTime).
   */
    close(duration) {
      duration = CGV.defaultFor(duration, this.fadeTime)
      this.box.transition().duration(duration)
        .style('opacity', 0)
        .on('end', function() {
          d3.select(this).style('display', 'none');
        });
      return this;
    }


    _adjust_size() {
      // Minimum buffer between dialog and edges of container (times 2)
      var buffer = 50;
      var wrapper_width = this._wrapper.offsetWidth;
      var wrapper_height = this._wrapper.offsetHeight;
      var width = this.width;
      var height = this.height;

      if (this.height > wrapper_height - buffer) height = wrapper_height - buffer;
      if (this.width > wrapper_width - buffer) width = wrapper_width - buffer;

      var header_height = 20;
      var footer_height = 20
      var content_height = height - header_height - footer_height;

      this.box
        .style('width', width + 'px')
        .style('height', height + 'px')

      // this.contents
      //   .style('height', content_height + 'px');
    }


    flash(msg) {
      this.contents.html(msg);
      this.open();
    }

  }

  CGV.Messenger = Messenger;

})(CGView);
//////////////////////////////////////////////////////////////////////////////
// NCList
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * The NCList is a container for intervals that allows fast searching of overlaping regions.
   *
   * Nested Containment List (NCList): A new algorithm for accelerating
   * interval query of genome alignment and interval databases.
   * Alekseyenko, A., and Lee, C. (2007).
   * Bioinformatics, doi:10.1093/bioinformatics/btl647
   * https://academic.oup.com/bioinformatics/article/23/11/1386/199545/Nested-Containment-List-NCList-a-new-algorithm-for
   *
   * Code adapted from
   * https://searchcode.com/codesearch/view/17093141
   */
  class NCList {
    /**
     * Each interval should have a start and stop property.
     *
     * @param {Array} intervals - Array of Intervals used to create the NCList.
     * @param {Object} options - 
     * @return {NCList}
     */
    constructor(intervals = [], options = {}) {
      this.intervals = [];
      this.circularLength = options.circularLength;
      this.fill(intervals);
    }

    /**
     * @member {Number} - The number of intervals in the NCList
     */
    get length() {
      return this._length
    }


    /**
     * Splits intervals that span the Origin of cicular sequences
     */
    _normalize(intervals) {
      var interval;
      var nomalizedIntervals = []
      for (var i = 0, len = intervals.length; i < len; i++) {
        interval = intervals[i];
        if (interval.start <= interval.stop) {
          nomalizedIntervals.push( {interval: interval, index: i});
        } else {
          nomalizedIntervals.push({
            interval: interval,
            index: i,
            start: interval.start,
            stop: this.circularLength,
            crossesOrigin: true
          });
          nomalizedIntervals.push({
            interval: interval,
            index: i,
            start: 1,
            stop: interval.stop,
            crossesOrigin: true
          });
        }
      }
      return nomalizedIntervals
    }

    /**
     * Fils the NCList with the given intervals
     * @param {Array} intervals - Array of intervals
     */
    fill(intervals) {
      this._length = intervals.length;
      if (intervals.length == 0) {
          this.topList = [];
          return;
      }
      var start = this.start;
      var end = this.end;
      var sublist = this.sublist;

      intervals = this._normalize(intervals);
      this.intervals = intervals;

      // Sort by overlap
      intervals.sort(function(a, b) {
          if (start(a) != start(b))
              return start(a) - start(b);
          else
              return end(b) - end(a);
      });
      var sublistStack = [];
      var curList = [];
      this.topList = curList;
      curList.push(intervals[0]);
      if (intervals.length == 1) return;
      var curInterval, topSublist;
      for (var i = 1, len = intervals.length; i < len; i++) {
          curInterval = intervals[i];
          //if this interval is contained in the previous interval,
          if (end(curInterval) < end(intervals[i - 1])) {
              //create a new sublist starting with this interval
              sublistStack.push(curList);
              curList = new Array(curInterval);
              sublist(intervals[i - 1], curList);
          } else {
              //find the right sublist for this interval
              while (true) {
                  if (0 == sublistStack.length) {
                      curList.push(curInterval);
                      break;
                  } else {
                      topSublist = sublistStack[sublistStack.length - 1];
                      if (end(topSublist[topSublist.length - 1])
                          > end(curInterval)) {
                          //curList is the first (deepest) sublist that
                          //curInterval fits into
                          curList.push(curInterval);
                          break;
                      } else {
                          curList = sublistStack.pop();
                      }
                  }
              }
          }
      }
    }

    /**
     * Method to retrieve the stop coordinate of the interval
     */
    end(interval) {
      return interval.stop || interval.interval.stop
    }

    /**
     * Method to retrieve the start coordinate of the interval
     */
    start(interval) {
      return interval.start || interval.interval.start
    }

    /**
     * Method to set the sublist for the given interval.
     */
    sublist(interval, list) {
      interval.sublist = list;
    }


    _run(start, stop = start, step = 1, callback = function() {}, list = this.topList) {
      var skip;
      var len = list.length;
      var i = this._binarySearch(list, start, true, 'stop')
      while (i >= 0 && i < len && this.start(list[i]) <= stop) {
        skip = false

        if (list[i].crossesOrigin) {
          if (this._runIntervalsCrossingOrigin.indexOf(list[i].interval) != -1) {
            skip = true;
          } else {
            this._runIntervalsCrossingOrigin.push(list[i].interval);
          }
        }

        if (!skip && list[i].index % step == 0) {
          callback.call(list[i].interval, list[i].interval);
        }
        if (list[i].sublist) {
          this._run(start, stop, step, callback, list[i].sublist);
        }
        i++;
      }
    }

    /*
     * Run the callback for each interval that overlaps with the given range.
     * @param {Number} start - Start position of the range
     * @param {Number} stop - Stop position of the range [Default: same as start]
     * @param {Number} step - Skip intervals by increasing the step [Default: 1]
     */
    run(start, stop, step, callback = function() {}) {
      this._runIntervalsCrossingOrigin = [];
      if (this.circularLength && stop < start) {
        this._run(start, this.circularLength, step,  callback);
        this._run(1, stop, step,  callback);
      } else {
        this._run(start, stop, step, callback);
      }
    }

    /*
     * Count the number of intervals that overlaps with the given range.
     * @param {Number} start - Start position of the range
     * @param {Number} stop - Stop position of the range [Default: same as start]
     * @param {Number} step - Skip intervals by increasing the step [Default: 1]
     * @return {Number}
     */
    count(start, stop, step) {
      var count = 0;
      this.run(start, stop, step, (i) => {
        count++
      });
      return count
    }

    /*
     * Return intervals that overlaps with the given range.
     * @param {Number} start - Start position of the range
     * @param {Number} stop - Stop position of the range [Default: same as start]
     * @param {Number} step - Skip intervals by increasing the step [Default: 1]
     * @return {Array}
     */
    find(start, stop, step) {
      var overlaps = [];
      this.run(start, stop, step, (i) => {
        overlaps.push(i);
      });
      return overlaps
    }


    _binarySearch(data, search_value, upper, getter) {
      var min_index = -1;
      var max_index = data.length;
      var current_index, current_value;

      while (max_index - min_index > 1) {
        current_index = (min_index + max_index) / 2 | 0;
        current_value = this.end(data[current_index]);
        if (current_value < search_value) {
          min_index = current_index;
        } else if (current_value > search_value){
          max_index = current_index;
        } else {
          return current_index;
        }
      }
      return (upper ? max_index : min_index);
    }


    /*
     * Test that the correct intervalsare returned especially for circular sequences
     */
    static test() {
      function testInterval(nc, start, stop, expected) {
        var result = nc.find(start, stop).map( (n) => {return n.name}).sort().join(', ')
        var expected = expected.sort().join(', ');
        var testOut = '' + start + '..' + stop + ': ' + expected + ' - ';
        testOut += (result == expected) ? 'Pass' : 'FAIL' + ' - ' + result;
        console.log(testOut);
      }

      var intervals = [
        {name: 'A', start: 1, stop: 20},
        {name: 'B', start: 10, stop: 15},
        {name: 'C', start: 10, stop: 20},
        {name: 'D', start: 15, stop: 30},
        {name: 'E', start: 20, stop: 30},
        {name: 'F', start: 20, stop: 50},
        {name: 'G', start: 80, stop: 100},
        {name: 'H', start: 90, stop: 95},
        {name: 'I', start: 90, stop: 5},
        {name: 'J', start: 95, stop: 15},
        {name: 'K', start: 95, stop: 2},
        {name: 'L', start: 92, stop: 50}
      ]
      var nc = new CGV.NCList(intervals, { circularLength: 100 });

      testInterval(nc, 10, 20, ['A', 'B', 'C', 'D', 'E', 'F', 'J', 'L']);
      testInterval(nc, 40, 85, ['F', 'G', 'L']);
      testInterval(nc, 40, 95, ['F', 'G', 'H', 'I', 'J', 'K', 'L']);
      testInterval(nc, 95, 10, ['A', 'B', 'C', 'G', 'H', 'I', 'J', 'K', 'L']);

      return nc
    }

  }

  CGV.NCList = NCList;

})(CGView);

//////////////////////////////////////////////////////////////////////////////
// Plot
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class Plot {

    /**
     * Draw a plot consisting of arcs
     */
    constructor(viewer, data = {}, display = {}, meta = {}) {
      this.viewer = viewer;
      this.positions = data.positions;
      this.scores = data.scores;
      this.source = CGV.defaultFor(data.source, '');
      this._baseline = CGV.defaultFor(data.baseline, 0.5);

      if (data.legend) {
        this.legendItem  = data.legend;
      }
      if (data.legendPositive) {
        this.legendItemPositive  = data.legendPositive;
      }
      if (data.legendNegative) {
        this.legendItemNegative  = data.legendNegative;
      }
      var plotID = viewer.plots().indexOf(this) + 1;
      if (!this.legendItemPositive && !this.legendItemNegative) {
        this.legendItem  = 'Plot-' + plotID;
      } else if (!this.legendItemPositive) {
        this.legendItemPositive  = this.legendItemNegative;
      } else if (!this.legendItemNegative) {
        this.legendItemNegative  = this.legendItemPositive;
      }

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
      viewer._plots.push(this);
    }

    /**
     * @member {CGArray} - Get or set the positions (bp) of the plot.
     */
    get positions() {
      return this._positions || new CGV.CGArray()
    }

    set positions(value) {
      if (value) {
        this._positions = new CGV.CGArray(value);
      }
    }

    /**
     * @member {CGArray} - Get or set the scores of the plot. Value should be between 0 and 1.
     */
    get score() {
      return this._score || new CGV.CGArray()
    }

    set score(value) {
      if (value) {
        this._score = new CGV.CGArray(value);
      }
    }

    /**
     * @member {Number} - Get the number of points in the plot
     */
    get length() {
      return this.positions.length
    }

    /**
     * @member {Array|Color} - Return an array of the positive and negativ colors [PositiveColor, NegativeColor].
     */
    get color() {
      return [this.colorPositive, this.colorNegative]
    }

    get colorPositive() {
      return this.legendItemPositive.color
    }

    get colorNegative() {
      return this.legendItemNegative.color
    }

    /**
     * @member {LegendItem} - Set both the legendItemPositive and
     * legendItemNegative to this legendItem. Get an array of the legendItems: [legendItemPositive, legendItemNegative].
     */
    get legendItem() {
      return [this.legendItemPositive, this.legendItemNegative]
    }

    set legendItem(value) {
      this.legendItemPositive = value;
      this.legendItemNegative = value;
    }

    /**
     * @member {LegendItem} - Alias for [legendItem](plot.html#legendItem)
     */
    get legend() {
      return this.legendItem
    }

    set legend(value) {
      this.legendItem = value;
    }

    /**
     * @member {LegendItem} - Get or Set both the LegendItem for the positive portion of the plot (i.e. above
     *   [baseline](Plot.html#baseline).
     */
    get legendItemPositive() {
      return this._legendItemPositive;
    }

    set legendItemPositive(value) {
      // this._legendItemPositive = value;

      if (this.legendItemPositive && value == undefined) { return }
      if (value && value.toString() == 'LegendItem') {
        this._legendItemPositive  = value
      } else {
        this._legendItemPositive  = this.viewer.legend.findLegendItemOrCreate(value);
      }
    }

    /**
     * @member {LegendItem} - Get or Set both the LegendItem for the negative portion of the plot (i.e. below
     *   [baseline](Plot.html#baseline).
     */
    get legendItemNegative() {
      return this._legendItemNegative;
    }

    set legendItemNegative(value) {
      // this._legendItemNegative = value;

      if (this.legendItemNegative && value == undefined) { return }
      if (value && value.toString() == 'LegendItem') {
        this._legendItemNegative  = value
      } else {
        this._legendItemNegative  = this.viewer.legend.findLegendItemOrCreate(value);
      }
    }

    /**
     * @member {LegendItem} - Alias for [legendItemPositive](plot.html#legendItemPositive).
     */
    get legendPositive() {
      return this._legendItemPositive;
    }

    set legendPositive(value) {
      this._legendItemPositive = value;
    }

    /**
     * @member {LegendItem} - Alias for [legendItemNegative](plot.html#legendItemNegative).
     */
    get legendNegative() {
      return this._legendItemNegative;
    }

    set legendNegative(value) {
      this._legendItemNegative = value;
    }

    /**
     * @member {Number} - Get or set the plot baseline. This is a value between 0 and 1 and indicates where
     *  where the baseline will be drawn. By default this is 0.5 (i.e. the center of the slot).
     */
    get baseline() {
      return this._baseline;
    }

    set baseline(value) {
      if (value > 1) {
        this._baseline = 1;
      } else if (value < 0) {
        this._baseline = 0;
      } else {
        this._baseline = value;
      }
    }

    scoreForPosition(bp) {
      var index = CGV.indexOfValue(this.positions, bp);
      if (index == 0 && bp < this.positions[index]) {
        return undefined
      } else {
        return this.scores[index]
      }
    }

    draw(canvas, slotRadius, slotThickness, fast, range) {
      // var startTime = new Date().getTime();
      if (this.colorNegative.rgbaString == this.colorPositive.rgbaString) {
        this._drawPath(canvas, slotRadius, slotThickness, fast, range, this.colorPositive);
      } else {
        this._drawPath(canvas, slotRadius, slotThickness, fast, range, this.colorPositive, 'positive');
        this._drawPath(canvas, slotRadius, slotThickness, fast, range, this.colorNegative, 'negative');
      }
      // console.log("Plot Time: '" + CGV.elapsed_time(startTime) );
    }

    // To add a fast mode use a step when creating the indices
    _drawPath(canvas, slotRadius, slotThickness, fast, range, color, orientation) {
      var ctx = canvas.context('map');
      var scale = canvas.scale;
      var positions = this.positions;
      var scores = this.scores;
      // This is the difference in radial pixels required before a new arc is draw
      var radialDiff = fast ? 1 : 0.5;
      // var radialDiff = 0.5;

      var sequenceLength = this.viewer.sequence.length;

      var startIndex = CGV.indexOfValue(positions, range.start, false);
      var stopIndex = CGV.indexOfValue(positions, range.stop, false);
      // Change stopIndex to last position if stop is between 1 and first position
      if (stopIndex == 0 && range.stop < positions[stopIndex]) {
        stopIndex = positions.length - 1;
      }
      var startPosition = startIndex == 0 ? positions[startIndex] : range.start;
      var stopPosition = range.stop;
      // console.log(startPosition + '..' + stopPosition)

      // var startScore = startIndex == 0 ? this.baseline : scores[startIndex];
      var startScore = scores[startIndex];

      startScore = this._keepPoint(startScore, orientation) ? startScore : this.baseline;

      ctx.beginPath();

      // Calculate baseline Radius
      var baselineRadius = slotRadius - (slotThickness / 2) + (slotThickness * this.baseline);

      // Move to the first point
      var startPoint = canvas.pointFor(startPosition, baselineRadius);
      ctx.moveTo(startPoint.x, startPoint.y);

      var savedR = baselineRadius + (startScore - this.baseline) * slotThickness;
      var savedPosition = startPosition;
      var lastScore = startScore;

      var currentR, score, currentPosition;
      var crossingBaseline = false;
      var drawNow = false;
      var step = 1;
      if (fast) {
        // When drawing fast, use a step value scaled to base-2
        var positionsLength = positions.countFromRange(startPosition, stopPosition);
        var maxPositions = 4000;
        var initialStep = positionsLength / maxPositions;
        if (initialStep > 1) {
          step = CGV.base2(initialStep);
        }
      }
      positions.eachFromRange(startPosition, stopPosition, step, (i) => {
        // Handle Origin in middle of range
        if (i == 0 && startIndex != 0) {
          canvas.arcPath('map', savedR, savedPosition, sequenceLength, false, 'lineTo');
          savedPosition = 1;
          savedR = baselineRadius;
        }

        // NOTE: In the future the radialDiff code (see bottom) could be used to improve speed of NON-fast
        // drawing. However, there are a few bugs that need to be worked out
        score = scores[i];
        currentPosition = positions[i];
        canvas.arcPath('map', savedR, savedPosition, currentPosition, false, 'lineTo');
        if ( this._keepPoint(score, orientation) ){
          savedR = baselineRadius + (score - this.baseline) * slotThickness;
        } else {
          savedR = baselineRadius;
        }
        savedPosition = currentPosition;
      });

      // Change stopPosition if between 1 and first position
      if (stopIndex == positions.length - 1 && stopPosition < positions[0]) {
        stopPosition = sequenceLength;
      }
      // Finish drawing plot to stop position
      canvas.arcPath('map', savedR, savedPosition, stopPosition, false, 'lineTo');
      var endPoint = canvas.pointFor(stopPosition, baselineRadius);
      ctx.lineTo(endPoint.x, endPoint.y);
      // Draw plot anticlockwise back to start along baseline
      canvas.arcPath('map', baselineRadius, stopPosition, startPosition, true, 'noMoveTo');
      ctx.fillStyle = color.rgbaString;
      ctx.fill();

      // ctx.strokeStyle = 'black';
      // TODO: draw stroked line for sparse data
      // ctx.lineWidth = 0.05;
      // ctx.strokeStyle = color.rgbaString;
      // ctx.stroke();

    }


    _keepPoint(score, orientation) {
      if (orientation == undefined) {
        return true
      } else if (orientation == 'positive' && score > this.baseline) {
        return true
      } else if (orientation == 'negative' && score < this.baseline ) {
        return true
      }
      return false
    }

  }


  CGV.Plot = Plot;

})(CGView);

// NOTE: radialDiff
        // score = scores[i];
        // currentPosition = positions[i];
        // currentR = baselineRadius + (score - this.baseline) * slotThickness;
        //
        // if (drawNow || crossingBaseline) {
        //   canvas.arcPath('map', savedR, savedPosition, currentPosition, false, 'lineTo');
        //   savedPosition = currentPosition;
        //   drawNow = false;
        //   crossingBaseline = false;
        //   if ( this._keepPoint(score, orientation) ) {
        //     savedR = currentR;
        //   } else {
        //     savedR = baselineRadius;
        //   }
        // if (orientation && ( (lastScore - this.baseline) * (score - this.baseline) < 0)) {
        //   crossingBaseline = true;
        // }
        //
        // if ( Math.abs(currentR - savedR) >= radialDiff ){
        //   drawNow = true;
        // }
        // lastScore = score;
// END RadialDiff


        // score = scores[i];
        // currentPosition = positions[i];
        // canvas.arcPath('map', savedR, savedPosition, currentPosition, false, 'lineTo');
        // if ( this._keepPoint(score, orientation) ){
        //   savedR = baselineRadius + (score - this.baseline) * slotThickness;
        // } else {
        //   savedR = baselineRadius;
        // }
        // savedPosition = currentPosition;


    //
        // score = scores[i];
        // currentPosition = positions[i];
        // canvas.arcPath('map', savedR, savedPosition, currentPosition, false, 'lineTo');
        // currentR = baselineRadius + (score - this.baseline) * slotThickness;
        // savedR = currentR;
        // savedPosition = currentPosition;
    //
    //
      // positions.eachFromRange(startPosition, stopPosition, step, (i) => {
        // if (i == 0) {
        //   lastScore = this.baseline;
        //   savedPosition = 1;
        //   savedR = baselineRadius;
        // }
      //   lastScore = score;
      //   score = scores[i];
      //   currentPosition = positions[i];
      //   currentR = baselineRadius + (score - this.baseline) * slotThickness;
      //   // If going from positive to negative need to save currentR as 0 (baselineRadius)
      //   // Easiest way is to check if the sign changes (i.e. multipling last and current score is negative)
      //   if (orientation && ( (lastScore - this.baseline) * (score - this.baseline) < 0)) {
      //     currentR = baselineRadius;
      //     canvas.arcPath('map', currentR, savedPosition, currentPosition, false, true);
      //     savedR = currentR;
      //     savedPosition = currentPosition;
      //   } else if ( this._keepPoint(score, orientation) ){
      //     if ( Math.abs(currentR - savedR) >= radialDiff ){
      //       canvas.arcPath('map', currentR, savedPosition, currentPosition, false, true);
      //       savedR = currentR;
      //       savedPosition = currentPosition
      //     }
      //   } else {
      //     savedR = baselineRadius;
      //   }
      // });
//////////////////////////////////////////////////////////////////////////////
// CGview Rect
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * A Rect consists of an x and y point (the upper-left corner) and
   * a width and height.
   */
  class Rect {

    /**
     * A Rect
     *
     * @param {Number} x - X coordinate of the Rect origin
     * @param {Number} y - Y coordinate of the Rect origin
     * @param {Number} width - Width of the rectangle
     * @param {Number} height - Height of the rectangle
     */
    constructor(x, y, width, height) {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
    }

    /**
     * @member {Number} - Get or set the width.
     */
    get width() {
      return this._width
    }

    set width(value) {
      this._width = value;
    }

    /**
     * @member {Number} - Get or set the height.
     */
    get height() {
      return this._height
    }

    set height(value) {
      this._height = value;
    }

    /**
     * @member {Number} - Get or set the x position of the origin.
     */
    get x() {
      return this._x
    }

    set x(value) {
      this._x = value;
    }

    /**
     * @member {Number} - Get or set the y position of the origin.
     */
    get y() {
      return this._y
    }

    set y(value) {
      this._y = value;
    }

    /**
     * @member {Number} - Get bottom of the Rect
     */
    get bottom() {
      return this.y + this.height;
    }

    /**
     * @member {Number} - Get top of the Rect. Same as Y.
     */
    get top() {
      return this.y;
    }

    /**
     * @member {Number} - Get left of the Rect. Same as X.
     */
    get left() {
      return this.x;
    }

    /**
     * @member {Number} - Get right of the Rect
     */
    get right() {
      return this.x + this.width;
    }

    /**
     * Check if any of the Rect overlaps with any Rects in the array.
     *
     * @param {Array} rectArray - Array of Rects
     * @return {Boolean}
     */
    overlap(rectArray) {
      // Gap between labels
      var widthGap = CGV.pixel(4);
      var r1 = this;
      var overlap = false;
      for (var i=0, len=rectArray.length; i < len; i++){
        var r2 = rectArray[i];
        if (r1.x <= r2.right && r2.x <= (r1.right + widthGap) && r1.y <= r2.bottom && r2.y <= r1.bottom) {
          overlap = true;
          break;
        }else{
          overlap = false;
        }
      }
      return overlap;
    }

    /**
     * Check if the Rect conains the point
     *
     * @param {Number} x - X coordinate of the point
     * @param {Number} y - Y coordinate of the point
     * @return {Boolean}
     */
    containsPt(x, y) {
      return ( x >= this.x && x <= (this.x + this.width) && y >= this.y && y <= (this.y + this.height) )
    }

  }

  CGV.Rect = Rect;

})(CGView);


//////////////////////////////////////////////////////////////////////////////
// Ruler
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class Ruler extends CGV.CGObject {

    /**
     * The *Ruler* controls and draws the sequence ruler in bp.
     */
    constructor(viewer, options = {}, meta = {}) {
      super(viewer, options, meta);
      this.tickCount = CGV.defaultFor(options.tickCount, 10);
      this.tickWidth = CGV.defaultFor(options.tickWidth, 1);
      this.tickLength = CGV.defaultFor(options.tickLength, 5);
      this.rulerPadding = CGV.defaultFor(options.rulerPadding, 10);
      this.font = CGV.defaultFor(options.font, 'sans-serif, plain, 10');
      this.color = new CGV.Color( CGV.defaultFor(options.color, 'black') );
    }

    get font() {
      return this._font
    }

    set font(value) {
      if (value.toString() == 'Font') {
        this._font = value;
      } else {
        this._font = new CGV.Font(value);
      }
    }

    /**
     * @member {Color} - Get or set the Color. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
     */
    get color() {
      return this._color
    }

    set color(color) {
      if (color.toString() == 'Color') {
        this._color = color;
      } else {
        this._color.setColor(color);
      }
    }

    get tickCount() {
      return this._tickCount
    }

    set tickCount(count) {
      this._tickCount = count; 
    }

    get tickWidth() {
      return this._tickWidth
    }

    set tickWidth(width) {
      this._tickWidth = CGV.pixel(width);
    }

    get tickLength() {
      return this._tickLength
    }

    set tickLength(length) {
      this._tickLength = CGV.pixel(length);
    }

    get rulerPadding() {
      return this._rulerPadding
    }

    set rulerPadding(padding) {
      this._rulerPadding = CGV.pixel(padding);
    }

    /**
     * @member {Array} - Get the array of Major Ticks.
     */
    get majorTicks() {
      return this._majorTicks
    }

    /**
     * @member {Number} - Get distance between major tick marks.
     */
    get majorTickStep() {
      return this._majorTickStep
    }

    /**
     * @member {Array} - Get the array of Minor Ticks.
     */
    get minorTicks() {
      return this._minorTicks
    }

    /**
     * @member {Number} - Get distance between minor tick marks.
     */
    get minorTickStep() {
      return this._minorTickStep
    }

    /**
     * @member {Object} - Get the d3 formatter for printing the tick labels
     */
    get tickFormater() {
      return this._tickFormater
    }

    /**
     * Create d3 tickFormat based on the distance between ticks
     * @param {Number} tickStep - Distance between ticks
     * @return {Object}
     */
    _createTickFormatter(tickStep) {
      var tickFormat, tickPrecision;
      if (tickStep <= 50) {
        tickFormat = d3.formatPrefix(',.0', 1);
      } else if (tickStep <= 50e3) {
        tickPrecision = d3.precisionPrefix(tickStep, 1e3)
        tickFormat = d3.formatPrefix('.' + tickPrecision, 1e3);
      } else if (tickStep <= 50e6) {
        tickPrecision = d3.precisionPrefix(tickStep, 1e6)
        tickFormat = d3.formatPrefix('.' + tickPrecision, 1e6);
      }
      return tickFormat
    }

    // Below the zoomFactorCutoff, all ticks are calculated for the entire map
    // Above the zoomFactorCutoff, ticks are created for the visible range
    _updateTicks(innerRadius, outerRadius) {
      var zoomFactorCutoff = 5;
      var sequenceLength = this.sequence.length;
      var start = 0;
      var stop = 0;
      var majorTicks = new CGV.CGArray();
      var majorTickStep = 0;
      var minorTicks = new CGV.CGArray();
      var minorTickStep = 0;
      var tickCount = this.tickCount;

      // Find start and stop to create ticks
      if (this.viewer.zoomFactor < zoomFactorCutoff) {
        start = 1;
        stop = sequenceLength;
      } else {
        tickCount = Math.ceil(tickCount / 2);
        var innerRange = this.canvas.visibleRangeForRadius(innerRadius);
        var outerRange = this.canvas.visibleRangeForRadius(outerRadius);
        if (innerRange && outerRange) {
          var mergedRange = innerRange.mergeWithRange(outerRange);
          start = mergedRange.start;
          stop = mergedRange.stop;
        } else if (innerRange) {
          start = innerRange.start;
          stop = innerRange.stop;
        } else if (outerRange) {
          start = outerRange.start;
          stop = outerRange.stop;
        }
      }

      // Create Major ticks and tickStep
      if (stop > start) {
        majorTicks.merge( d3.ticks(start, stop, tickCount) );
        majorTickStep = d3.tickStep(start, stop, tickCount);
      } else if (stop < start) {
        // Ratio of the sequence length before 0 to sequence length after zero
        // The number of ticks will for each region will depend on this ratio
        var tickCountRatio = (sequenceLength - start) / this.sequence.lengthOfRange(start, stop);
        var ticksBeforeZero = Math.round(tickCount * tickCountRatio);
        var ticksAfterZero = Math.round(tickCount * (1 - tickCountRatio)) * 2; // Multiply by 2 for a margin of safety
        if (ticksBeforeZero > 0) {
          majorTicks.merge( d3.ticks(start, sequenceLength, ticksBeforeZero) );
          majorTickStep = Math.round(d3.tickStep(start, sequenceLength, ticksBeforeZero));
          for (var i = 1; i <= ticksAfterZero; i ++) {
            if (majorTickStep * i < start) {
              majorTicks.push( majorTickStep * i );
            }
          }
        } else {
          majorTicks.merge( d3.ticks(1, stop, tickCount) );
          majorTickStep = Math.round(d3.tickStep(1, stop, tickCount));
        }
      }

      // Find Minor ticks
      minorTicks = new CGV.CGArray();
      if ( !(majorTickStep % 5) ) {
        minorTickStep = majorTickStep / 5;
      } else if ( !(majorTickStep % 2) ) {
        minorTickStep = majorTickStep / 2;
      } else {
        minorTickStep = 0;
      }
      if (minorTickStep) {
        if (this.sequence.lengthOfRange(majorTicks[majorTicks.length - 1], majorTicks[0]) <= 3*majorTickStep) {
          start = 0;
          stop = sequenceLength;
        } else {
          start = majorTicks[0] - majorTickStep;
          stop = majorTicks[majorTicks.length - 1] + majorTickStep;
        }
        if (start < stop) {
          for (var tick = start; tick <= stop; tick += minorTickStep) {
            if (tick % majorTickStep) {
              minorTicks.push(tick);
            }
          }
        } else {
          for (var tick = start; tick <= sequenceLength; tick += minorTickStep) {
            if (tick % majorTickStep) {
              minorTicks.push(tick);
            }
          }
          for (var tick = 0; tick <= stop; tick += minorTickStep) {
            if (tick % majorTickStep) {
              minorTicks.push(tick);
            }
          }
        }
      }
      this._majorTicks = majorTicks;
      this._majorTickStep = majorTickStep;
      this._minorTicks = minorTicks;
      this._minorTickStep = minorTickStep;
      this._tickFormater = this._createTickFormatter(majorTickStep);
    }

    draw(innerRadius, outerRadius) {
      if (this.visible) {
        this._updateTicks(innerRadius, outerRadius);
        this.drawForRadius(innerRadius, 'inner');
        this.drawForRadius(outerRadius, 'outer', false);
      }
    }


    drawForRadius(radius, position = 'inner', drawLabels = true) {
      var ctx = this.canvas.context('map');
      var scale = this.canvas.scale;
      var tickLength = (position == 'inner') ? -this.tickLength : this.tickLength;
      // ctx.fillStyle = 'black'; // Label Color
      ctx.fillStyle = this.color.rgbaString; // Label Color
      ctx.font = this.font.css;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      // Draw Tick for first bp (Origin)
      this.canvas.radiantLine('map', 1, radius, tickLength, this.tickWidth * 2);
      // Draw Major ticks
      this.majorTicks.each( (i, bp) => {
        this.canvas.radiantLine('map', bp, radius, tickLength, this.tickWidth);
        if (drawLabels) {
          var label = this.tickFormater(bp);
          this.drawLabel(bp, label, radius, position);
        }
      });
      // Draw Minor ticks
      this.minorTicks.each( (i, bp) => {
        this.canvas.radiantLine('map', bp, radius, tickLength / 2, this.tickWidth);
      });
    }

    drawLabel(bp, label, radius, position = 'inner') {
      var scale = this.canvas.scale;
      var ctx = this.canvas.context('map');
      // Put space between number and units
      // var label = label.replace(/([^\d\.]+)/, ' $1bp');
      var label = label.replace(/([kM])?$/, ' $1bp');
      // INNER
      var innerPt = this.canvas.pointFor(bp, radius - this.rulerPadding);
      var radians = scale.bp(bp);
      var attachmentPosition = CGV.clockPositionForAngle(radians);
      var labelWidth = this.font.width(ctx, label);
      var labelPt = CGV.rectOriginForAttachementPoint(innerPt, attachmentPosition, labelWidth, this.font.height);
      ctx.fillText(label, labelPt.x, labelPt.y);
    }

  }

  CGV.Ruler = Ruler;

})(CGView);

    // drawForRadius_ORIG(radius, position = 'inner', drawLabels = true) {
    //   var ctx = this.canvas.ctx;
    //   var scale = this.canvas.scale;
    //   var ranges = this.canvas.visibleRangeForRadius(radius);
    //   var start = ranges ? ranges[0] : 1;
    //   var stop = ranges ? ranges[1] : this.viewer.sequenceLength;
    //   var tickLength = (position == 'inner') ? -this.tickLength : this.tickLength;
    //   ctx.fillStyle = 'black'; // Label Color
    //   ctx.font = this.font.css;
    //   ctx.textAlign = 'left';
    //   // Tick format for labels
    //   var tickFormat = scale.bp.tickFormat(this.tickCount * this.viewer.zoomFactor, 's');
    //   // Draw Tick for 1 bp
    //   this.canvas.radiantLine(1, radius, tickLength, this.tickWidth);
    //   // Draw Major ticks
    //   var majorTicks = new CGV.CGArray(scale.bp.ticks(this.tickCount * this.viewer.zoomFactor))
    //   majorTicks.eachFromRange(start, stop, 1, (i, bp) => {
    //     this.canvas.radiantLine(bp, radius, tickLength, this.tickWidth);
    //     if (drawLabels) {
    //       var label = tickFormat(bp);
    //       this.drawLabel(bp, label, radius, position);
    //     }
    //   });
    //   // Draw Minor ticks
    //   var minorTicks = new CGV.CGArray(scale.bp.ticks(majorTicks.length * 5))
    //   minorTicks.eachFromRange(start, stop, 1, (i, bp) => {
    //     this.canvas.radiantLine(bp, radius, tickLength / 2, this.tickWidth);
    //   });
    // }
//////////////////////////////////////////////////////////////////////////////
// Sequence
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * The CGView Sequence class hold the sequence of the map or is able to access
   * it via an API.
   */
  class Sequence {

    /**
     * Create a Sequence
     *
     * @param {Viewer} viewer - The viewer that contains the backbone
     * @param {Object} options - Options and stuff [MUST PROVIDE SEQUENCE OR LENGTH]
     */
    constructor(viewer, options = {}) {
      this._viewer = viewer;
      this.color = CGV.defaultFor(options.color, 'black');
      this.font = CGV.defaultFor(options.font, 'sans-serif, plain, 14');
      this.seq = options.seq;
      if (!this.seq) {
        this.length = options.length;
      }
      if (!this.length) {
        this.length = 1000;
        // throw('Sequence invalid. The seq or length must be provided.')
      }
    }

    //////////////////////////////////////////////////////////////////////////
    // STATIC CLASSS METHODS
    //////////////////////////////////////////////////////////////////////////
    // TODO: Take into account lower case letters
    static complement(seq) {
      var compSeq = ''
      var char, compChar;
      for (var i = 0, len = seq.length; i < len; i++) {
        char = seq.charAt(i);
        switch (char) {
          case 'A':
            compChar = 'T';
            break;
          case 'T':
            compChar = 'A';
            break;
          case 'G':
            compChar = 'C';
            break;
          case 'C':
            compChar = 'G';
        }
        compSeq = compSeq + compChar;
      }
      return compSeq
    }

    static baseCalculation(type, seq) {
      if (type == 'gc_content') {
        return Sequence.calcGCContent(seq);
      } else if (type == 'gc_skew') {
        return Sequence.calcGCSkew(seq);
      }
    }

    static calcGCContent(seq) {
      if (seq.length == 0) { return  0.5 }
      var g = CGV.Sequence.count(seq, 'g');
      var c = CGV.Sequence.count(seq, 'c');
      return ( (g + c) / seq.length )
    }

    static calcGCSkew(seq) {
      var g = CGV.Sequence.count(seq, 'g');
      var c = CGV.Sequence.count(seq, 'c');
      if ( (g + c) == 0 ) { return 0.5 }
      // Gives value between -1 and 1
      var value = (g - c) / (g + c);
      // Scale to a value between 0 and 1
      return  0.5 + (value / 2);
    }

    static reverseComplement(seq) {
      return Sequence.complement( seq.split('').reverse().join('') );
    }

    static count(seq, pattern) {
      return (seq.match(new RegExp(pattern, 'gi')) || []).length
    }

    /**
     * Create a random sequence of the specified length
     * @param {Number} length - The length of the sequence to create
     * @return {String}
     */
    static random(length) {
      var seq = '';
      var num;
      for (var i = 0; i < length; i++) {
        num = Math.floor(Math.random() * 4)
        switch (num % 4) {
          case 0:
            seq += 'A';
            break;
          case 1:
            seq += 'T';
            break;
          case 2:
            seq += 'G';
            break;
          case 3:
            seq += 'C';
        }
      }
      return seq
    }

    reverseComplement() {
      return Sequence.reverseComplement(this.seq)
    }

    count(pattern) {
      return Sequence.count(this.seq, pattern)
    }

    //////////////////////////////////////////////////////////////////////////
    // MEMBERS
    //////////////////////////////////////////////////////////////////////////

    /**
     * @member {Viewer} - Get the viewer.
     */

    get viewer() {
      return this._viewer
    }

    /**
     * @member {Canvas} - Get the canvas.
     */
    get canvas() {
      return this.viewer.canvas
    }

    /**
     * @member {String} - Get or set the seqeunce.
     */
    get seq() {
      return this._seq
    }

    set seq(value) {
      this._seq = value;
      if (this._seq) {
        this._seq = this._seq.toUpperCase();
        this._length = value.length;
        this._updateScale();
        this._sequenceExtractor = new CGV.SequenceExtractor(this);
      } else {
        this._sequenceExtractor = undefined;
      }
    }

    /**
     * @member {Number} - Get the SeqeunceExtractor. Only available if the *seq* property is set.
     */
    get sequenceExtractor() {
      return this._sequenceExtractor
    }

    /**
     * @member {Number} - Get or set the seqeunce length. If the *seq* property is set, the length can not be adjusted.
     */
    get length() {
      return this._length
    }

    set length(value) {
      if (value) {
        if (!this.seq) {
          this._length = Number(value);
          this._updateScale();
        } else {
          console.error('Can not change the sequence length of *seq* is set.');
        }
      }
    }

    _updateScale() {
      this.canvas.scale.bp = d3.scaleLinear()
        .domain([1, this.length])
        .range([-1/2*Math.PI, 3/2*Math.PI]);
      this.viewer._updateZoomMax();
    }

    /**
     * @member {Color} - Get or set the backbone color. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
     */
    get color() {
      return this._color
    }

    set color(value) {
      if (value.toString() == 'Color') {
        this._color = value;
      } else {
        this._color = new CGV.Color(value);
      }
    }

    /**
     * @member {Font} - Get or set sequence font. When setting the font, a string representing the font or a {@link Font} object can be used. For details see {@link Font}.
     */
    get font() {
      return this._font
    }

    set font(value) {
      if (value.toString() == 'Font') {
        this._font = value;
      } else {
        this._font = new CGV.Font(value);
      }
      this.bpSpacing = this.font.size;
    }

    get isLinear() {
      return false
    }

    get isCircular() {
      return true
    }

    lengthOfRange(start, stop) {
      if (stop >= start) {
        return stop - start
      } else {
        return this.length + (stop - start)
      }
    }

    /**
     * Subtract *bpToSubtract* from *position*, taking into account the sequence length
     * @param {Number} position - position (in bp) to subtract from
     * @param {Number} bpToSubtract - number of bp to subtract
     */
    subtractBp(position, bpToSubtract) {
      if (bpToSubtract < position) {
        return position - bpToSubtract
      } else {
        return this.length + position - bpToSubtract
      }
    }

    /**
     * Add *bpToAdd* to *position*, taking into account the sequence length
     * @param {Number} position - position (in bp) to add to
     * @param {Number} bpToAdd - number of bp to add
     */
    addBp(position, bpToAdd) {
      if (this.length >= (bpToAdd + position)) {
        return bpToAdd + position
      } else {
        return position - this.length + bpToAdd
      }
    }

    /**
     * Return the sequence for the *range*
     * 
     * @param {Range} range - the range for which to return the sequence
     * @param {Boolean} complement - If true return the complement sequence
     * @return {String}
     */
    forRange(range) {
      var seq;
      if (this.seq) {
        if (range.spansOrigin()) {
          seq = this.seq.substr(range.start - 1) + this.seq.substr(0, range.stop);
        } else {
          seq = this.seq.substr(range.start - 1, range.length);
        }
      } else {
        // FIXME: For now return fake sequence
        seq = this._fakeSequenceForRange(range);
      }
      return seq
    }

    // FAKE method to get sequence
    _fakeSequenceForRange(range) {
      var seq = '';
      var bp = range.start;
      for (var i = 0, len = range.length; i < len; i++) {
        switch (bp % 4) {
          case 0:
            seq += 'A';
            break;
          case 1:
            seq += 'T';
            break;
          case 2:
            seq += 'G';
            break;
          case 3:
            seq += 'C';
        }
        bp++;
      }
      return seq
    }

    _drawSequence() {
      var ctx = this.canvas.context('map');
      var scale = this.canvas.scale;
      var radius = CGV.pixel(this.zoomedRadius);
      var range = this.visibleRange
      if (range) {
        var seq = this._sequenceForRange(range);
        var bp = range.start;
        ctx.save();
        ctx.fillStyle = this.fontColor.rgbaString;
        ctx.font = this.font.css;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var radiusDiff = this.bpSpacing / 2 + this.bpMargin;
        for (var i = 0, len = range.length; i < len; i++) {
          var origin = this.canvas.pointFor(bp, radius + radiusDiff);
          ctx.fillText(seq[i], origin.x, origin.y);
          var origin = this.canvas.pointFor(bp, radius - radiusDiff);
          ctx.fillText(seq[i], origin.x, origin.y);
          bp++;
        }
        ctx.restore();
      }

    }

    /**
     * Returns an array of Ranges where the pattern was located. The pattern can be a RegEx or a String.
     * This method will return overlapping matches.
     * @param {String} pattern - RegEx or String Pattern to search for.
     * @return {Array)
     */
    findPattern(pattern, strand = 1) {
      var re = new RegExp(pattern, 'g');
      var ranges = [];
      var match, start;
      var seq = (strand == 1) ? this.seq : this.reverseComplement();
      while ( (match = re.exec(seq)) != null) {
        start = (strand == 1) ? (match.index + 1) : (this.length - match.index - match[0].length + 1);
        ranges.push( new CGV.CGRange(this, start, start + match[0].length - 1 ) );
        re.lastIndex = match.index + 1;
      }
      return ranges
    }

    // testRF(features) {
    //   var startTime, rf;
    //   startTime = new Date().getTime();
    //   var rf1 = this.featuresByReadingFrame(features);
    //   console.log("READING FRAME Normal Creation Time: " + CGV.elapsed_time(startTime) );
    //   // SETUP
    //   features.each( (i, feature) => {
    //     if (feature.strand == -1) {
    //       rf = (this.length - feature.stop + 1) % 3;
    //       if (rf == 0) { rf = 3; }
    //       feature.rf = rf;
    //     } else {
    //       rf = feature.start % 3;
    //       if (rf == 0) { rf = 3; }
    //       feature.rf = rf;
    //     }
    //   });
    //   startTime = new Date().getTime();
    //   var rf2 = {
    //     rf_plus_1: new CGV.CGArray( features.filter( (f) => { return f.rf == 1  && f.strand == 1})),
    //     rf_plus_2: new CGV.CGArray( features.filter( (f) => { return f.rf == 2  && f.strand == 1})),
    //     rf_plus_3: new CGV.CGArray( features.filter( (f) => { return f.rf == 3  && f.strand == 1})),
    //     rf_minus_1: new CGV.CGArray( features.filter( (f) => { return f.rf == 1  && f.strand == -1})),
    //     rf_minus_2: new CGV.CGArray( features.filter( (f) => { return f.rf == 2  && f.strand == -1})),
    //     rf_minus_3: new CGV.CGArray( features.filter( (f) => { return f.rf == 3  && f.strand == -1}))
    //   };
    //   console.log("READING FRAME NEW Creation Time: " + CGV.elapsed_time(startTime) );
    //   return rf2;
    // }

    featuresByReadingFrame(features) {
      var featuresByRF = {
        rf_plus_1: new CGV.CGArray(),
        rf_plus_2: new CGV.CGArray(),
        rf_plus_3: new CGV.CGArray(),
        rf_minus_1: new CGV.CGArray(),
        rf_minus_2: new CGV.CGArray(),
        rf_minus_3: new CGV.CGArray()
      };
      var rf;
      features.each( (i, feature) => {
        if (feature.strand == -1) {
          rf = (this.length - feature.stop + 1) % 3;
          if (rf == 0) { rf = 3; }
          featuresByRF['rf_minus_' + rf].push(feature);
        } else {
          rf = feature.start % 3;
          if (rf == 0) { rf = 3; }
          featuresByRF['rf_plus_' + rf].push(feature);
        }
      });
      return featuresByRF
    }

    // _drawSequenceDots() {
    //   var ctx = this.canvas.ctx;
    //   var scale = this.canvas.scale;
    //   var radius = CGV.pixel(this.zoomedRadius);
    //   var range = this.visibleRange
    //   if (range) {
    //     var bp = range.start;
    //     ctx.save();
    //     ctx.fillStyle = this.fontColor.rgbaString;
    //     var radiusDiff = this.bpSpacing / 2 + this.bpMargin;
    //     for (var i = 0, len = range.length; i < len; i++) {
    //       var origin = this.canvas.pointFor(bp, radius + radiusDiff);
    //       ctx.beginPath();
    //       ctx.arc(origin.x, origin.y, 3, 0, Math.PI * 2);
    //       ctx.fill();
    //       ctx.beginPath();
    //       var origin = this.canvas.pointFor(bp, radius - radiusDiff);
    //       ctx.arc(origin.x, origin.y, 3, 0, Math.PI * 2);
    //       ctx.fill();
    //       bp++;
    //     }
    //     ctx.restore();
    //   }
    // }

  }

  CGV.Sequence = Sequence;

})(CGView);


//////////////////////////////////////////////////////////////////////////////
// SequenceExtractor
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * The Extractor creates features or plots based on the sequence
   */
  class SequenceExtractor {

    /**
     * Create a Sequence Extractor
     *
     * @param {Viewer} sequence - The sequence to extract from.
     * @param {Object} options - Options and stuff
     */
    constructor(sequence, options = {}) {
      this.sequence = sequence;
      if (!sequence.seq) {
        throw('Sequence invalid. The sequence must be provided.')
      }
    }

    //////////////////////////////////////////////////////////////////////////
    // MEMBERS
    //////////////////////////////////////////////////////////////////////////

    /**
     * @member {Sequence} - Get or set the sequence.
     */

    get sequence() {
      return this._sequence
    }

    set sequence(value) {
      if (value) {
        this._sequence = value;
      }
    }

    /**
     * @member {String} - Get the seqeunce as a string
     */
    get seqString() {
      return this.sequence.seq
    }

    /**
     * @member {String} - Get the viewer
     */
    get viewer() {
      return this.sequence.viewer
    }

    /**
     * @member {Number} - Get the seqeunce length.
     */
    get length() {
      return this.sequence.length
    }

    //////////////////////////////////////////////////////////////////////////
    // METHODS
    //////////////////////////////////////////////////////////////////////////

    fn2workerURL(fn) {
      var blob = new Blob(['('+fn.toString()+')()'], {type: 'application/javascript'})
      return URL.createObjectURL(blob)
    }

    extractTrackData(track, extractType, options = {}) {
      if (!CGV.validate(extractType, ['start_stop_codons', 'orfs', 'gc_skew', 'gc_content'])) { return }
      switch (extractType) {
        case 'start_stop_codons':
        case 'orfs':
          track.contents.type = 'feature';
          this.generateFeatures(track, extractType, options);
          break;
        case 'gc_skew':
        case 'gc_content':
          track.contents.type = 'plot';
          this.generatePlot(track, extractType, options);
          break;
      }
    }

    generateFeatures(track, extractType, options = {}) {
      if (!CGV.validate(extractType, ['start_stop_codons', 'orfs'])) { return }
      var startTime = new Date().getTime();
      var viewer = this.viewer;
      // Start worker
      var url = this.fn2workerURL(CGV.WorkerFeatureExtraction);
      var worker = new Worker(url);
      // Prepare message
      var message = {
        type:         extractType,
        startPattern: CGV.defaultFor(options.start, 'ATG'),
        stopPattern:  CGV.defaultFor(options.stop, 'TAA,TAG,TGA'),
        seqString:    this.seqString,
        minORFLength: CGV.defaultFor(options.minORFLength, 100)
      }
      worker.postMessage(message);
      worker.onmessage = (e) => {
        var messageType = e.data.messageType;
        if (messageType == 'progress') {
          track.loadProgress = e.data.progress;
          viewer.layout.drawProgress();
        }
        if (messageType == 'complete') {
          track.loadProgress = 100;
          var featureDataArray = e.data.featureDataArray;
          console.log("Features '" + extractType + "' Worker Time: " + CGV.elapsed_time(startTime) );
          var features = new CGV.CGArray();
          startTime = new Date().getTime();
          var featureData;
          var legends = this.createLegendItems(extractType);
          var featureType = this.getFeatureType(extractType); // this will create the feature type
          console.log(extractType)
          for (var i = 0, len = featureDataArray.length; i < len; i++) {
            featureData = featureDataArray[i];
            featureData.legend = legends[featureData.type];
            features.push( new CGV.Feature(viewer, featureData) );
          }
          console.log("Features '" + extractType + "' Creation Time: " + CGV.elapsed_time(startTime) );
          startTime = new Date().getTime();
          track._features = features;
          track.updateSlots();
          console.log("Features '" + extractType + "' Update Time: " + CGV.elapsed_time(startTime) );
          viewer.drawFull();
        }
      }

      worker.onerror = (e) => {
        // do stuff
      }

    }


    generatePlot(track, extractType, options = {}) {
      if (!CGV.validate(extractType, ['gc_content', 'gc_skew'])) { return }
      var startTime = new Date().getTime();
      // var extractType = options.sequence;
      var viewer = this.viewer;
      // Start worker
      var url = this.fn2workerURL(CGV.WorkerBaseContent);
      var worker = new Worker(url);
      // Prepare message
      var message = {
        type:      extractType,
        window:    CGV.defaultFor(options.window, this.getWindowStep().window),
        step:      CGV.defaultFor(options.step, this.getWindowStep().step),
        deviation: CGV.defaultFor(options.deviation, 'scale'), // 'scale' or 'average
        seqString: this.seqString
      };
      worker.postMessage(message);
      worker.onmessage = (e) => {
        var messageType = e.data.messageType;
        if (messageType == 'progress') {
          track.loadProgress = e.data.progress;
          viewer.layout.drawProgress();
        }
        if (messageType == 'complete') {
          var baseContent = e.data.baseContent;
          var data = { positions: baseContent.positions, scores: baseContent.scores, baseline: baseContent.average };
          data.legendPositive = this.getLegendItem(extractType, '+').text;
          data.legendNegative = this.getLegendItem(extractType, '-').text;

          var plot = new CGV.Plot(viewer, data);
          track._plot = plot;
          track.updateSlots();
          console.log("Plot '" + extractType + "' Worker Time: " + CGV.elapsed_time(startTime) );
          viewer.drawFull();
        }
      }

      worker.onerror = (e) => {
        // do stuff
      }

    }

    getFeatureType(extractType) {
      var viewer = this.viewer;
      var featureType;
      switch (extractType) {
        case 'start_stop_codons':
          featureType = viewer.findFeatureTypeOrCreate('Codon', 'arc');
          break;
        case 'orfs':
          featureType = viewer.findFeatureTypeOrCreate('ORF', 'arrow');
          break;
        default:
          featureType = viewer.findFeatureTypeOrCreate('Unknown', 'arc');
      }
      return featureType 
    }

    createLegendItems(extractType) {
      var legends = {};
      if (extractType == 'orfs') {
        legends = {
          'ORF': this.getLegendItem('ORF')
        }
      } else if (extractType == 'start_stop_codons') {
        legends = {
          'start-codon': this.getLegendItem('start-codon'),
          'stop-codon': this.getLegendItem('stop-codon')
        }
      }
      return legends
    }

    getLegendItem(extractType, sign) {
      var legend = this.viewer.legend;
      var item;
      switch (extractType) {
        case 'start-codon':
          item = legend.findLegendItemOrCreate('Start', 'blue');
          break;
        case 'stop-codon':
          item = legend.findLegendItemOrCreate('Stop', 'red');
          break;
        case 'ORF':
          item = legend.findLegendItemOrCreate('ORF', 'green');
          break;
        case 'gc_content':
          item = legend.findLegendItemOrCreate('GC Content', 'black');
          break;
        case 'gc_skew':
          var color = (sign == '+') ? 'rgb(0,153,0)' : 'rgb(153,0,153)';
          var name = (sign == '+') ? 'GC Skew+' : 'GC Skew-';
          item = legend.findLegendItemOrCreate(name, color);
          break;
        default:
          item = legend.findLegendItemOrCreate('Unknown', 'grey');
      }
      return item 
    }

    getWindowStep() {
      var windowSize, step;
      var length = this.length;
      if (length < 1e3 ) {
        windowSize = 10;
        step = 1;
      } else if (length < 1e4) {
        windowSize = 50;
        step = 1;
      } else if (length < 1e5) {
        windowSize = 500;
        step = 1;
      } else if (length < 1e6) {
        windowSize = 1000;
        step = 10;
      } else if (length < 1e7) {
        windowSize = 10000;
        step = 100;
      }
      return { step: step, window: windowSize }
    }

  }

  CGV.SequenceExtractor = SequenceExtractor;

})(CGView);


    // extractFeatures(options = {}) {
    //   var features = new CGV.CGArray();
    //   if (options.sequence == 'start_stop_codons') {
    //     features = this.extractStartStops(options);
    //   } else if (options.sequence == 'orfs') {
    //     features = this.extractORFs(options);
    //   }
    //   return features
    // }

    // generateFeatures(track, options) {
    //   if (options.sequence == 'start_stop_codons') {
    //     features = this.generateStartStops(options);
    //   } else if (options.sequence == 'orfs') {
    //     features = this.extractORFs(options);
    //   }
    // }
    //
    //
    // extractPlot(options = {}) {
    //   if (options.sequence == 'gc_content') {
    //     return this.extractBaseContentPlot('gc_content', options);
    //   } else if (options.sequence == 'gc_skew') {
    //     return this.extractBaseContentPlot('gc_skew', options);
    //   }
    // }
    //
    // // PLOTS should be bp: [1,23,30,45], score: [0, 0.4, 1]
    // // score must be between 0 and 1
    // extractBaseContentPlot(type, options = {}) {
    //   var startTime = new Date().getTime();
    //   if (!CGV.validate(type, ['gc_content', 'gc_skew'])) { return }
    //   this.viewer.flash("Creating '" + type + "' Plot...");
    //
    //
    //   options.window = CGV.defaultFor(options.window, this.getWindowStep().window);
    //   options.step = CGV.defaultFor(options.step, this.getWindowStep().step);
    //   var step = options.step
    //   var deviation = CGV.defaultFor(options.deviation, 'scale'); // 'scale' or 'average'
    //   // var deviation = CGV.defaultFor(options.deviation, 'average'); // 'scale' or 'average'
    //
    //   var baseContent = this.calculateBaseContent(type, options);
    //   var positions = [];
    //   var position;
    //
    //   // The current position marks the middle of the calculated window.
    //   // Adjust the bp position to mark where the plot changes,
    //   // NOT the center point of the window.
    //   // i.e. half way between the current position and the last
    //   for (var i = 0, len = baseContent.positions.length; i < len; i++) {
    //     position = baseContent.positions[i];
    //     if (i == 0) {
    //       positions.push(1);
    //     } else {
    //       positions.push(position - step/2);
    //     }
    //   }
    //   var data = { positions: positions, scores: baseContent.scores, baseline: baseContent.average };
    //   data.legendPositive = this.getLegendItem(type, '+').text;
    //   data.legendNegative = this.getLegendItem(type, '-').text;
    //
    //   var plot = new CGV.Plot(this.viewer, data);
    //   console.log("Plot '" + type + "' Extraction Time: " + CGV.elapsed_time(startTime) );
    //   return plot
    // }


    // calculateBaseContent(type, options) {
    //   var windowSize = CGV.defaultFor(options.window, this.getWindowStep().window);
    //   var step = CGV.defaultFor(options.step, this.getWindowStep().step);
    //   var deviation = CGV.defaultFor(options.deviation, 'scale'); // 'scale' or 'average'
    //   // var deviation = CGV.defaultFor(options.deviation, 'average'); // 'scale' or 'average'
    //
    //   var positions = [];
    //   var scores = [];
    //   var average =  CGV.Sequence.baseCalculation(type, this.seqString);
    //   // Starting points for min and max
    //   var min = 1;
    //   var max = 0;
    //   var halfWindowSize = windowSize / 2;
    //   var start, stop;
    //
    //   // FIXME: not set up for linear sequences
    //   // position marks the middle of the calculated window
    //   for (var position = 1, len = this.length; position < len; position += step) {
    //     // Extract DNA for window and calculate score
    //     start = this.sequence.subtractBp(position, halfWindowSize);
    //     stop = this.sequence.addBp(position, halfWindowSize);
    //     var range = new CGV.CGRange(this.sequence, start, stop);
    //     var seq = this.sequence.forRange(range);
    //     var score = CGV.Sequence.baseCalculation(type, seq);
    //
    //     if (score > max) {
    //       max = score;
    //     }
    //     if (score < min) {
    //       min = score;
    //     }
    //
    //     positions.push(position);
    //     scores.push(score);
    //   }
    //
    //   // Adjust scores if scaled
    //   // Min value becomes 0
    //   // Max value becomes 1
    //   // Average becomes 0.5
    //   if (deviation == 'scale') {
    //     scores = scores.map( (score) => {
    //       if (score >= average) {
    //         return CGV.scaleValue(score, {min: average, max: max}, {min: 0.5, max: 1});
    //       } else {
    //         return CGV.scaleValue(score, {min: min, max: average}, {min: 0, max: 0.5});
    //       }
    //     });
    //     min = 0;
    //     max = 1;
    //     average = 0.5;
    //   }
    //   return { positions: positions, scores: scores, min: min, max: max, average: average }
    // }
    // extractORFs(options = {}) {
    //   this.viewer.flash('Finding ORFs...');
    //   var startTime = new Date().getTime();
    //   var features = new CGV.CGArray();
    //   var type = 'ORF'
    //   var source = 'orfs'
    //   var minORFLength = CGV.defaultFor(options.minORFLength, 100)
    //   // Get start features by reading frame
    //   var startPattern = CGV.defaultFor(options.start, 'ATG')
    //   var startFeatures = this.createFeaturesFromPattern(startPattern, 'start-codon', 'start-stop-codons');
    //   var startsByRF = this.sequence.featuresByReadingFrame(startFeatures);
    //   // Get stop features by reading frame
    //   var stopPattern = CGV.defaultFor(options.stop, 'TAA,TAG,TGA');
    //   var stopFeatures = this.createFeaturesFromPattern(stopPattern, 'start-codon', 'start-stop-codons');
    //   var stopsByRF = this.sequence.featuresByReadingFrame(stopFeatures);
    //   // Get forward ORFs
    //   var position,  orfLength, range, readingFrames;
    //   readingFrames = ['rf_plus_1', 'rf_plus_2', 'rf_plus_3'];
    //   var start, stop, stopIndex;
    //   for (var rf of readingFrames) {
    //     position = 1;
    //     stopIndex = 0;
    //     for (var i = 0, len_i = startsByRF[rf].length; i < len_i; i++) {
    //       start = startsByRF[rf][i];
    //       if (start.start < position) {
    //         continue;
    //       }
    //       for (var j = stopIndex, len_j = stopsByRF[rf].length; j < len_j; j++) {
    //         stop = stopsByRF[rf][j];
    //         orfLength = stop.stop - start.start;
    //         if (orfLength >= minORFLength) {
    //           position = stop.stop;
    //           range = new CGV.CGRange(this.sequence, start.start, stop.stop);
    //           features.push( this.createFeature(range, type, 1, source ) );
    //           stopIndex = j;
    //           break;
    //         }
    //       }
    //     }
    //   }
    //   // Get reverse ORFs
    //   readingFrames = ['rf_minus_1', 'rf_minus_2', 'rf_minus_3'];
    //   for (var rf of readingFrames) {
    //     stopIndex = 0;
    //     position = this.sequence.length;
    //     var startsByRFSorted = startsByRF[rf].order_by('start', true);
    //     var stopsByRFSorted = stopsByRF[rf].order_by('start', true);
    //     for (var i = 0, len_i = startsByRF[rf].length; i < len_i; i++) {
    //       start = startsByRF[rf][i];
    //       if (start.start > position) {
    //         continue;
    //       }
    //       for (var j = stopIndex, len_j = stopsByRF[rf].length; j < len_j; j++) {
    //         stop = stopsByRF[rf][j];
    //         orfLength = start.stop - stop.start;
    //         if (orfLength >= minORFLength) {
    //           position = stop.start;
    //           range = new CGV.CGRange(this.sequence, stop.start, start.stop);
    //           features.push( this.createFeature(range, type, -1, source ) );
    //           stopIndex = j;
    //           break;
    //         }
    //       }
    //     }
    //   }
    //   console.log('ORF Extraction Time: ' + CGV.elapsed_time(startTime) );
    //   return features
    // }
    // extractStartStops(options = {}) {
    //   this.viewer.flash('Finding Start/Stop Codons...');
    //   var startTime = new Date().getTime();
    //   // Forward and Reverse Starts
    //   var startPattern = CGV.defaultFor(options.start, 'ATG')
    //   var features = this.createFeaturesFromPattern(startPattern, 'start-codon', 'start-stop-codons');
    //   // Forward and Reverse Stops
    //   var stopPattern = CGV.defaultFor(options.stop, 'TAA,TAG,TGA');
    //   features.merge( this.createFeaturesFromPattern(stopPattern, 'stop-codon', 'start-stop-codons'))
    //   console.log('Start/Stop Extraction Time: ' + CGV.elapsed_time(startTime) );
    //   return features
    // }
    //
    // createFeaturesFromPattern(pattern, type, source) {
    //   var features = new CGV.CGArray();
    //   pattern = pattern.toUpperCase().split(',').map( (s) => { return s.trim() }).join('|')
    //   for (var strand of [1, -1]) {
    //     // var startTime = new Date().getTime();
    //     var ranges = this.sequence.findPattern(pattern, strand)
    //     // console.log("Find Pattern '" + pattern + "' Strand " + strand + " Time: " + CGV.elapsed_time(startTime) );
    //     // var startTime = new Date().getTime();
    //     for (var i = 0, len = ranges.length; i < len; i++) {
    //       features.push( this.createFeature(ranges[i], type, strand, source ) );
    //     }
    //     // console.log("Features for Pattern '" + pattern + "' Strand " + strand + " Time: " + CGV.elapsed_time(startTime) );
    //   }
    //   return features.order_by('start')
    // }
    // createFeature(range, type, strand, source) {
    //   var featureData = {
    //     type: type,
    //     start: range.start,
    //     stop: range.stop,
    //     strand: strand,
    //     source: source,
    //     extractedFromSequence: true
    //   }
    //   featureData.legend = this.getLegendItem(type).text;
    //   return new CGV.Feature(this.viewer, featureData)
    // }

//////////////////////////////////////////////////////////////////////////////
// Slot
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * A Slot is a single ring on the Map.
   * @extends CGObject
   */
  class Slot extends CGV.CGObject {

    /**
     * Slot
     */
    constructor(track, data = {}, meta = {}) {
      super(track.viewer, data, meta);
      this.track = track;
      this._strand = CGV.defaultFor(data.strand, 'direct');
      this._features = new CGV.CGArray();
      this._plot;
      this.proportionOfRadius = CGV.defaultFor(data.proportionOfRadius, 0.1)
      this.refresh();
    }

    /**
     * Return the class name as a string.
     * @return {String} - 'Slot'
     */
    toString() {
      return 'Slot';
    }

    /** * @member {Track} - Get the *Track*
     */
    get track() {
      return this._track
    }

    set track(track) {
      if (this.track) {
        // TODO: Remove if already attached to Track
      }
      this._track = track;
      track._slots.push(this);
    }

    /** * @member {String} - Get the Track Type
     */
    get type() {
      return this.track.type
    }

    /** * @member {Layout} - Get the *Layout*
     */
    get layout() {
      return this.track.layout
    }

    /**
     * @member {String} - Get the position of the slot in relation to the backbone
     */
    get position() {
      if (this.track.position == 'both') {
        return (this.isDirect() ? 'outside' : 'inside')
      } else {
        return this.track.position
      }
    }

    /**
     * @member {Boolean} - Is the slot position inside the backbone
     */
    get inside() {
      return this.position == 'inside'
    }

    /**
     * @member {Boolean} - Is the slot position outside the backbone
     */
    get outside() {
      return this.position == 'outside'
    }

    /**
     * @member {Viewer} - Get or set the track size with is measured as a 
     * proportion of the backbone radius.
     */
    get proportionOfRadius() {
      return this._proportionOfRadius
    }

    set proportionOfRadius(value) {
      this._proportionOfRadius = value;
    }

    /**
     * @member {Number} - Get the current radius of the slot.
     */
    get radius() {
      return this._radius
    }

    /**
     * @member {Number} - Get the current thickness of the slot.
     */
    get thickness() {
      return this._thickness
    }


    get strand() {
      return this._strand;
    }

    isDirect() {
      return this.strand == 'direct'
    }

    isReverse() {
      return this.strand == 'reverse'
    }

    get hasFeatures() {
      return this._features.length > 0
    }

    get hasPlot() {
      return this._plot
    }

    features(term) {
      return this._features.get(term)
    }

    replaceFeatures(features) {
      this._features = features;
      this.refresh();
    }

    /**
     * The number of pixels per basepair along the feature track circumference.
     * @return {Number}
     */
    pixelsPerBp() {
      return (this.radius * 2 * Math.PI) / this.sequence.length;
    }

    // Refresh needs to be called when new features are added, etc
    refresh() {
      this._featureNCList = new CGV.NCList(this._features, {circularLength: this.sequence.length});
    }

    /**
     * Get the visible range
     * @member {Range}
     */
    get visibleRange() {
      return this._visibleRange
    }

    /**
     * Does the slot contain the given *radius*.
     * @param {Number} radius - The radius.
     * @return {Boolean}
     */
    containsRadius(radius) {
      var halfthickness = this.thickness / 2;
      return (radius >= (this.radius - halfthickness)) && (radius <= (this.radius + halfthickness))
    }

    /**
     * Return the first feature in this slot that contains the given bp.
     * @param {Number} bp - the position in bp to search for.
     * @return {Feature}
     */
    findFeaturesForBp(bp) {
      return this._featureNCList.find(bp);
    }

    findLargestFeatureLength() {
      var length = 0;
      var nextLength;
      for (var i = 0, len = this._features.length; i < len; i++) {
        nextLength = this._features[i].length;
        if (nextLength > length) {
          length = nextLength
        }
      }
      return length
    }

    clear() {
      var range = this._visibleRange;
      if (range) {
        var slotRadius = this.radius;
        var slotThickness = this.thickness;
        var ctx = this.canvas.context('map');
        ctx.globalCompositeOperation = "destination-out"; // The existing content is kept where it doesn't overlap the new shape.
        this.canvas.drawArc('map', range.start, range.stop, slotRadius, 'white', slotThickness);
        ctx.globalCompositeOperation = "source-over"; // Default
      }
    }

    highlight(color='#FFB') {
      var range = this._visibleRange;
      if (range && this.visible) {
        var slotRadius = this.radius;
        var slotThickness = this.thickness;
        this.canvas.drawArc('background', range.start, range.stop, slotRadius, color, slotThickness);
      }
    }

    // draw(canvas, fast, slotRadius, slotThickness) {
    draw(canvas, fast) {
      var slotRadius = this.radius;
      var slotThickness = this.thickness;
      var range = canvas.visibleRangeForRadius(slotRadius, slotThickness);
      this._visibleRange = range;
      if (range) {
        var start = range.start;
        var stop = range.stop;
        if (this.hasFeatures) {
          var featureCount = this._features.length;
          if (!range.isFullCircle()) {
            featureCount = this._featureNCList.count(start, stop);
          }
          var step = 1;
          // Change step if drawing fast and there are too many features
          if (fast && featureCount > this.layout.fastFeaturesPerSlot) {
            // Use a step that is rounded up to the nearest power of 2
            // This combined with eachFromRange altering the start index based on the step
            // means that as we zoom, the visible features remain consistent.
            // e.g. When zooming all the features visible at a step of 16
            // will be visible when the step is 8 and so on.
            var initialStep = Math.ceil(featureCount / this.layout.fastFeaturesPerSlot);
            step = CGV.base2(initialStep);
          }
          // Draw Features
          this._featureNCList.run(start, stop, step, (feature) => {
            feature.draw('map', slotRadius, slotThickness, range);
          })

          // Debug
          if (this.viewer.debug && this.viewer.debug.data.n) {
            var index = this.viewer._slots.indexOf(this);
            this.viewer.debug.data.n['slot_' + index] = featureCount;
          }
        } else if (this.hasPlot) {
          this._plot.draw(canvas, slotRadius, slotThickness, fast, range);
        }
      }
    }

    drawProgress(progress) {
      var canvas = this.canvas;
      var slotRadius = this.radius;
      var slotThickness = this.thickness;
      var range = this._visibleRange;
      // Draw progress like thickening circle
      if (progress > 0 && progress < 100 && range) {
        var thickness = slotThickness * progress / 100;
        canvas.drawArc('background', range.start, range.stop, slotRadius, '#EAEAEE', thickness);
      }
    }

    /**
     * Remove a feature from the slot.
     *
     * @param {Feature} feature - The Feature to remove.
     */
    removeFeature(feature) {
      this._features = this._features.remove(feature);
      this.refresh();
    }


  }

  CGV.Slot = Slot;

})(CGView);
//////////////////////////////////////////////////////////////////////////////
// Track
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * The Track is used for layout information
   * @extends CGObject
   */
  class Track extends CGV.CGObject {

    /**
     * Create a new track.
     */
    constructor(layout, data = {}, meta = {}) {
      super(layout.viewer, data, meta);
      this.layout = layout;
      this._plot;
      this._features = new CGV.CGArray();
      this._slots = new CGV.CGArray();
      this.name = CGV.defaultFor(data.name, 'Unknown');
      this.readingFrame = CGV.defaultFor(data.readingFrame, 'combined');
      this.strand = CGV.defaultFor(data.strand, 'separated');
      this.position = CGV.defaultFor(data.position, 'both');
      this.contents = data.contents || {};
      this.loadProgress = 0;
      this.refresh();
    }

    /**
     * Return the class name as a string.
     * @return {String} - 'Track'
     */
    toString() {
      return 'Track';
    }

    set visible(value) {
      super.visible = value;
      if (this.layout) {
        this.layout._adjustProportions();
      }
    }

    get visible() {
      return super.visible
    }

    /**
     * @member {String} - Alias for getting the name. Useful for querying CGArrays.
     */
    get id() {
      return this.name
    }

    /**
     * @member {String} - Get or set the *name*.
     */
    get name() {
      return this._name
    }

    set name(value) {
      this._name = value;
    }

    /** * @member {Viewer} - Get or set the *Layout*
     */
    get layout() {
      return this._layout
    }

    set layout(layout) {
      if (this.layout) {
        // TODO: Remove if already attached to layout
      }
      this._layout = layout;
      layout._tracks.push(this);
    }

    /** * @member {Object} - Get or set the *Contents*.
     */
    get contents() {
      return this._contents
    }

    set contents(value) {
      this._contents = value;
    }

    /** * @member {String} - Get the *Content Type*.
     */
    get type() {
      return this.contents && this.contents.type
    }

    /**
     * @member {String} - Get or set the strand. Possible values are 'separated' or 'combined'.
     */
    get strand() {
      return this._strand;
    }

    set strand(value) {
      if ( CGV.validate(value, ['separated', 'combined']) ) {
        this._strand = value;
        this.updateSlots();
      }
    }

    /**
     * @member {String} - Get or set the readingFrame. Possible values are 'combined' or 'separated'.
     */
    get readingFrame() {
      return this._readingFrame;
    }

    set readingFrame(value) {
      if (CGV.validate(value, ['separated', 'combined'])) {
        this._readingFrame = value;
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
      if (CGV.validate(value, ['inside', 'outside', 'both'])) {
        this._position = value;
        this.updateSlots();
      }
    }

    /**
     * @member {Plot} - Get the plot associated with this track
     */
    get plot() {
      return this._plot
    }

    /**
     * @member {Number} - Get or set the load progress position (integer between 0 and 100)
     */
    get loadProgress() {
      return this._loadProgress;
    }

    set loadProgress(value) {
      this._loadProgress = value;
    }

    /**
     * @member {Number} - Return the number of features or plot points contained in this track.
     */
    get count() {
      if (this.type == 'plot') {
        return (this.plot) ? this.plot.length : 0
      } else if (this.type == 'feature') {
        return this.features().length
      }
    }

    features(term) {
      return this._features.get(term)
    }

    slots(term) {
      return this._slots.get(term)
    }

    /**
     * Remove a feature from the track and slots.
     *
     * @param {Feature} feature - The Feature to remove.
     */
    removeFeature(feature) {
      this._features = this._features.remove(feature);
      this.slots().each( (i, slot) => {
        slot.removeFeature(feature);
      });
      this.viewer.trigger('track-update', this);
    }

    refresh() {
      this._features = new CGV.CGArray();
      this._plot = undefined;
      if (this.contents.from == 'sequence') {
        this.extractFromSequence();
      } else if (this.type == 'feature') {
        this.updateFeatures();
      } else if (this.type == 'plot') {
        this.updatePlot();
      }
      this.updateSlots();
    }

    extractFromSequence() {
      var sequenceExtractor = this.viewer.sequence.sequenceExtractor;
      if (sequenceExtractor) {
        sequenceExtractor.extractTrackData(this, this.contents.extract, this.contents.options);
      } else {
        console.error('No sequence is available to extract features/plots from');
      }
    }

    updateFeatures() {
      if (this.contents.from == 'source') {
        // Features with particular Source
        this.viewer.features().each( (i, feature) => {
          if (feature.source == this.contents.extract) {
            this._features.push(feature);
          }
        });
      } else if (this.contents.types) {
        // Features with particular Type
        var featureTypes = new CGV.CGArray(this.contents.featureType);
        this.viewer.features().each( (i, feature) => {
          if (featureTypes.contains(feature.type)) {
            this._features.push(feature);
          }
        });
      }
    }

    updatePlot() {
      if (this.contents.from == 'source') {
        // Plot with particular Source
        this.viewer.plots().find( (plot) => {
          if (plot.source == this.contents.extract) {
            this._plot = plot;
          }
        });
      }
    }

    updateSlots() {
      if (this.type == 'feature') {
        this.updateFeatureSlots();
      } else if (this.type == 'plot') {
        this.updatePlotSlot();
      }
      this.layout._adjustProportions();
      this.viewer.trigger('track-update', this);
    }

    updateFeatureSlots() {
      this._slots = new CGV.CGArray();
      if (this.readingFrame == 'separated') {
        var features = this.sequence.featuresByReadingFrame(this.features());
        // Direct Reading Frames
        for (var rf of [1, 2, 3]) {
          var slot = new CGV.Slot(this, {strand: 'direct'});
          slot.replaceFeatures(features['rf_plus_' + rf]);
        }
        // Revers Reading Frames
        for (var rf of [1, 2, 3]) {
          var slot = new CGV.Slot(this, {strand: 'reverse'});
          slot.replaceFeatures(features['rf_minus_' + rf]);
        }
      } else {
        if (this.strand == 'separated') {
          var features = this.featuresByStrand();
          // Direct Slot
          var slot = new CGV.Slot(this, {strand: 'direct'});
          slot.replaceFeatures(features.direct)
          // Reverse Slot
          var slot = new CGV.Slot(this, {strand: 'reverse'});
          slot.replaceFeatures(features.reverse)
        } else if (this.strand == 'combined') {
          // Combined Slot
          var slot = new CGV.Slot(this, {strand: 'direct'});
          slot.replaceFeatures(this.features());

        }
      }
    }

    featuresByStrand() {
      var features = {};
      features.direct = new CGV.CGArray();
      features.reverse = new CGV.CGArray();
      this.features().each( (i, feature) => {
        if (feature.strand == -1) {
          features.reverse.push(feature);
        } else {
          features.direct.push(feature);
        }
      });
      return features
    }

    updatePlotSlot() {
      this._slots = new CGV.CGArray();
      var slot = new CGV.Slot(this, {type: 'plot'});
      slot._plot = this._plot;
    }

    highlight(color='#FFB') {
      if (this.visible) {
        this.slots().each( (i, slot) => {
          slot.highlight(color);
        });
      }
    }

    remove() {
      this.layout.removeTrack(this);
    }

  }

  CGV.Track = Track;

})(CGView);
//////////////////////////////////////////////////////////////////////////////
// Utils
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  CGV.testSearch = function(length) {
    var pattern = /ATG/igm;
    var indices = []
    var seq = "";
    var possible = "ATCG";

    console.log('Making Sequence...');
    for (var i=0; i < length; i++ ) {
      seq += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    window.seq = seq
    console.log('Finding Pattern...');
    var start_time = new Date().getTime();
    while (match = pattern.exec(seq)) {
      indices.push(match.index);
    }
    console.log('ATGs found: ' + indices.length);
    console.log('Time: ' + CGV.elapsed_time(start_time));
  }

  /**
   * Return the _defaultValue_ if _value_ is undefined
   * @param {Object} value         Returned if it is defined
   * @param {Object} defaultValue Returned if _value_ is undefined
   * @return {Object}
   */
  CGV.defaultFor = function(value, defaultValue) {
    return (value === undefined) ? defaultValue : value;
  }

  /**
   * Return true if the value is one of the validOptions.
   *
   * @param {Object} value - Value to validate
   * @param {Array} validOptions - Array of valid options
   * @return {Boolean}
   */
  CGV.validate = function(value, validOptions) {
    if (validOptions.indexOf(value) != -1) {
      return true
    } else {
      console.error("The value '" + value + "' is not one of the following: " +  validOptions.join(', '))
      return false
    }
  }

  /**
   * Converts the value to a boolean. The following values will be false,
   * all other values will be true: 'false', 'False', false, undefined.
   *
   * @param {Object} value - Value to convert to boolean.
   * @return {Boolean}
   */
  CGV.booleanify = function(value) {
    if (value == 'false' || value == 'False' || value == undefined || value == false) {
      return false
    } else {
      return true
    }
  }

  /**
   * Return the pixel ratio. The default is 1.
   */
  CGV.pixelRatio = 1;

  /**
   * Converts provided number of pixels based on pixel ratio which depends on
   * the screen resolution. Typical displays will have a pixel ration of 1,
   * while retina displays will have a pixel ration of 2.
   *
   * **Important**: Whenever drawing on the canvas, convert the pixels first
   * using this method.
   *
   * @param {Integer} value Number of pixels
   * @return {Intger}
   */
  CGV.pixel = function(px) {
    return px * CGV.pixelRatio;
  }

  CGV.getPixelRatio = function(canvas) {
    var context = canvas.getContext('2d');
    //  query the various pixel ratios
    var devicePixelRatio = window.devicePixelRatio || 1;

    var backingStoreRatio = context.webkitBackingStorePixelRatio ||
      context.mozBackingStorePixelRatio ||
      context.msBackingStorePixelRatio ||
      context.oBackingStorePixelRatio ||
      context.backingStorePixelRatio || 1;

    return devicePixelRatio / backingStoreRatio;
  }

  CGV.scaleResolution = function(canvas, ratio){
    // upscale the canvas if the two ratios don't match
    if (ratio != 1) {

      var oldWidth  = canvas.width;
      var oldHeight = canvas.height;

      canvas.width  = oldWidth  * ratio;
      canvas.height = oldHeight * ratio;

      canvas.style.width  = oldWidth  + 'px';
      canvas.style.height = oldHeight + 'px';
    }
  }

  CGV.elapsed_time = function(old_time) {
    var elapsed = (new Date().getTime()) - old_time;
    return elapsed + ' ms';
  }

  // Circle Quadrants and Angles in Radians
  //        3/2π
  //       -----
  //     / 3 | 4 \
  //  π|---------| 0
  //     \ 2 | 1 /
  //       -----
  //        1/2π
  // Note:
  //   - For CGView, quadrant 4 has both x and y as positive
  //   - Quandrant 4 has minus angles to match up with the bp scale
  //   - The center of the circle is always (0,0)
  CGV.angleFromPosition = function(x, y) {
    var angle = 1/2*Math.PI;
    if (x != 0) {
      angle = Math.atan(Math.abs(y / x));
    }
    if (y >= 0 && x >= 0) {
      // quadrant 4
      // angle = 2*Math.PI - angle;
      angle = 0 - angle;
    } else if (y < 0 && x >= 0) {
      // quandrant 1
    } else if (y < 0 && x < 0) {
      // quandrant 2
      angle = Math.PI - angle;
    } else if (y >= 0 && x < 0) {
      // quandrant 3
      angle = Math.PI + angle;
    }
    return angle
  }

  /**
   * Calculate the hour hand clock position for the supplied angle where:
   *   3/2π -> 12 o'clock
   *   0    -> 3 o'clock
   *   1/2π -> 6 o'clock
   *   π    -> 9 o'clock
   *
   * @param {Number} radians - The angle in radians
   * @return {Number}
   */
  CGV.clockPositionForAngle = function(radians) {
    var clockPostion = Math.round( (radians + Math.PI/2) * (6/Math.PI) );
    if (clockPostion > 12) {
      clockPostion -= 12;
    } else if (clockPostion < 1) {
      clockPostion += 12;
    }
    return clockPostion
  }

  /**
   * Calculate the origin for a Rect with *width* and *length* that connects
   * to a *point* at a specific *clockPosition*.
   *
   * @param {Object} point - The point that connects to the Rect. Consists of an x and y attribute
   * @param {Number} clockPosition - Where on the Rect the point connects to in clock coordinates. An integer between 1 and 12.
   * @param {Number} width - The width of the Rect
   * @param {Number} height - The height of the Rect
   * @return {Object} - The origin for the Rect consisting of an x and y attribute
   */
  CGV.rectOriginForAttachementPoint = function(point, clockPosition, width, height) {
    var x, y;
    switch (clockPosition) {
      case 1:
        x = point.x - (width * 3 / 4);
        y = point.y;
        break;
      case 2:
        x = point.x - width;
        y = point.y;
        break;
      case 3:
        x = point.x - width;
        y = point.y - (height / 2);
        break;
      case 4:
        x = point.x - width;
        y = point.y - height;
        break;
      case 5:
        x = point.x - (width * 3 / 4);
        y = point.y - height;
        break;
      case 6:
        x = point.x - (width / 2);
        y = point.y - height;
        break;
      case 7:
        x = point.x - (width / 4);
        y = point.y - height;
        break;
      case 8:
        x = point.x;
        y = point.y - height;
        break;
      case 9:
        x = point.x;
        y = point.y - (height / 2);
        break;
      case 10:
        x = point.x;
        y = point.y;
        break;
      case 11:
        x = point.x - (width / 4);
        y = point.y;
        break;
      case 12:
        x = point.x - (width / 2);
        y = point.y;
    }
    return {x: x, y: y}
  }

  // CGV.withinRange = function(bp, start, end) {
  //   if (end >= start) {
  //     // Typical Range
  //     return (bp >= start && bp <= end)
  //   } else {
  //     // Range spans 0
  //     return (bp >= start || bp <= end)
  //   }
  // }

  /**
   * Rounds the number use d3.format.
   * @param {Number} value Number to round
   * @param {Integer} places Number of decimal places to round [Default: 2]
   * @return {Number}
   */
  CGV.round = function(value, places) {
    var places = places || 2;
    // return d3.round(value, places);
    return Number(value.toFixed(places));
  }

  // a and b should be arrays of equal length
  CGV.dotProduct = function(a, b) {
    var value = 0;
    for (var i = 0, len = a.length; i < len; i++) {
      value += a[i] * b[i];
    }
    return value
  }

  CGV.pointsAdd = function(a, b) {
    var value =  [0, 0];
    value[0] = a[0] + b[0];
    value[1] = a[1] + b[1];
    return value
  }

  CGV.pointsSubtract = function(a, b) {
    var value = [0, 0];
    value[0] = a[0] - b[0];
    value[1] = a[1] - b[1];
    return value
  }

  // Using code from:
  // http://stackoverflow.com/questions/1073336/circle-line-segment-collision-detection-algorithm
  CGV.circleAnglesFromIntersectingLine = function(radius, x1, y1, x2, y2) {
    // Direction vector of line segment, from start to end
    var d = CGV.pointsSubtract([x2,y2], [x1,y1]);
    // Vector from center of circle to line segment start
    // Center of circle is alwas [0,0]
    var f = [x1, y1]

    // t2 * (d DOT d) + 2t*( f DOT d ) + ( f DOT f - r2 ) = 0
    var a = CGV.dotProduct(d, d);
    var b = 2 * CGV.dotProduct(f, d);
    var c = CGV.dotProduct(f, f) - (radius * radius);

    var discriminant = b*b - 4*a*c;

    var angles = {};
    if (discriminant >= 0) {
      discriminant = Math.sqrt(discriminant);
      var t1 = (-b - discriminant)/(2*a);
      var t2 = (-b + discriminant)/(2*a);
      if (t1 >= 0 && t1 <=1) {
        var px = x1 + (t1 * (x2 - x1));
        var py = y1 + (t1 * (y2 - y1));
        // angles.push(CGV.angleFromPosition(px, py))
        angles.t1 = CGV.angleFromPosition(px, py)
      }
      if (t2 >= 0 && t2 <=1) {
        var px = x1 + (t2 * (x2 - x1));
        var py = y1 + (t2 * (y2 - y1));
        // angles.push(CGV.angleFromPosition(px, py))
        angles.t2 = CGV.angleFromPosition(px, py)
      }
    }
    return angles
  }


  // Return 2 or more angles that intersect with rectangle defined by xy, height, and width
  // Center of circle is always (0,0)
  CGV.circleAnglesFromIntersectingRect = function(radius, x, y, width, height) {
    var angles = [];
    // Top
    angles.push(CGV.circleAnglesFromIntersectingLine(radius, x, y, x + width, y));
    // Right
    angles.push(CGV.circleAnglesFromIntersectingLine(radius, x + width, y, x + width, y - height));
    // Bottom
    angles.push(CGV.circleAnglesFromIntersectingLine(radius, x + width, y - height, x, y - height));
    // Left
    angles.push(CGV.circleAnglesFromIntersectingLine(radius, x, y - height, x, y));
    angles = angles.filter( (a) => { return Object.keys(a).length > 0 })
    if (angles.length > 0) {
      // Resort the angles
      // T1 and T2 are what percent along a line that intersect with the circle
      // T1 is closest to the line start
      // Essentially, with the ways the lines of the rect have been set up
      // T2 is always a start angle and T1 is always an end angle.
      // So if the very first angle is a T1 we want to move it to the end of the list of angles
      var firstKeys = Object.keys(angles[0]);
      if (firstKeys.length == 1 && firstKeys[0] == 't1') {
        angles.push(angles.shift());
      } 
      if (firstKeys.length == 2) {
        angles.push({t1: angles[0].t1});
        angles[0].t1 = undefined;
      }
      angles = angles.map( (a) => {
        var r = []
        if (a.t1 != undefined) {
          r.push(a.t1)
        }
        if (a.t2 != undefined) {
          r.push(a.t2)
        }
        return r
      });
      angles = [].concat.apply([], angles);
    }

    return angles
  }


  /**
   * Binary search to find the index of data where data[index] equals _search_value_.
   * If no element equals value, the returned index will be the upper or lower [default]
   * index that surrounds the value.
   *
   * @param {Array} data Array of numbers. Must be sorted from lowest to highest.
   * @param {Number} search_value The value to search for.
   * @param {Boolean} upper Only used if no element equals the _search_value_ 
   *
   *    - _true_: return index to right of value
   *    - _false_: return index to left of value [default]
   *
   * @return {Number}
   */
  CGV.indexOfValue = function(data, search_value, upper) {
    var min_index = 0;
    var max_index = data.length - 1;
    var current_index, current_value;
    if (data[min_index] >= search_value) return min_index;
    if (data[max_index] <= search_value) return max_index;

    while (max_index - min_index > 1) {
      current_index = (min_index + max_index) / 2 | 0;
      // current_index = (min_index + max_index) >>> 1 | 0;
      current_value = data[current_index];
      if (current_value < search_value) {
        min_index = current_index;
      } else if (current_value > search_value){
        max_index = current_index;
      } else {
        return current_index;
      }
    }
    return (upper ? max_index : min_index);
  }


  /**
   * Return true of nubmer a and b have opposite signs
   */
  CGV.oppositeSigns = function(a, b) {
    return (a * b) < 0
  }

  /**
   * Return the next largest base 2 value for the given number
   */
  CGV.base2 = function(value) {
    return Math.pow(2, Math.ceil(Math.log(value) / Math.log(2)));
  }

  /**
   * Merges top level properties of each supplied object.
   * ```javascript
   * CGV.merge({a:1, b:1}, {b:2, c:2}, {c:3, d:3});
   * //=> {a: 1, b: 2, c: 3, d: 3}
   * ```
   * If a non object is provided, it is ignored. This can be useful if
   * merging function arguments that may be undefined.
   * @param {Object} object_1,object_2,..,object_n Objects to merge
   * @return {Object}
   */
  CGV.merge = function() {
    var data = {};
    var object, keys, key;
    for (var arg_i=0, arg_len=arguments.length; arg_i < arg_len; arg_i++) {
      object = arguments[arg_i];
      if (typeof object === 'object') {
        keys = Object.keys(object);
        for (var key_i=0, key_len=keys.length; key_i < key_len; key_i++){
          key = keys[key_i];
          data[key] = object[key];
        }
      }
    }
    return data;
  }


  /**
   * This function scales a value from the *from* range to the *to* range.
   * To scale from [min,max] to [a,b]:
   *
   *                 (b-a)(x - min)
   *          f(x) = --------------  + a
   *                   max - min
   */
  CGV.scaleValue = function(value, from={min: 0, max: 1}, to={min: 0, max: 1}) {
    return (to.max - to.min) * (value - from.min) / (from.max - from.min) + to.min;
  }






  //
  // /**
  //  * Returns a string id using the _id_base_ and _start_ while
  //  * making sure the id is not in _current_ids_.
  //  * ```javascript
  //  * JSV.unique_id('spectra_', 1, ['spectra_1', 'spectra_2']);
  //  * //=> 'spectra_3'
  //  * ```
  //  * @param {String} id_base Base of ids
  //  * @param {Integer} start Integer to start trying to creat ids with
  //  * @param {Array} current_ids Array of current ids
  //  * @return {String}
  //  */
  // JSV.unique_id = function(id_base, start, current_ids) {
  //   var id;
  //   do {
  //     id = id_base + start;
  //     start++;
  //   } while (current_ids.indexOf(id) > -1);
  //   return id;
  // }
  //
  //
  // /**
  //  * Returns the number of milliseconds elapsed since the supplied time.
  //  * The returned time will have 'ms' appended to it.
  //  * @param {Integer} old_time Old time in milliseconds
  //  * @return {Integer}
  //  */
  // JSV.elapsed_time = function(old_time) {
  //   var elapsed = (new Date().getTime()) - old_time;
  //   return elapsed + ' ms';
  // }
  //
  //
  // /**
  //  * Returns a number unless _n_ is undefined in which case _undefined_ is returned.
  //  * @param {Object} n The object to convert to a number
  //  * @return {Number}
  //  */
  // JSV.number = function(n) {
  //   if (n === undefined) return;
  //   return Number(n);
  // }
  //
  // /** 
  //  * Convience function to determine if an object is a number.
  //  * @param {Object} n The object to check
  //  * @return {Boolean}
  //  */
  // JSV.isNumeric = function (n) {
  //   return isFinite(n) && parseFloat(n) == n;
  // }
  //
  // /** 
  //  * Return the number of decimal places found in _num_.
  //  *
  //  * @param {Number} num The number to check
  //  * @return {Number}
  //  */
  // JSV.decimalPlaces = function(num) {
  //   var match = (''+num).match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
  //   if (!match) { return 0; }
  //   return Math.max(
  //              0,
  //              // Number of digits right of decimal point.
  //              (match[1] ? match[1].length : 0)
  //              // Adjust for scientific notation.
  //              - (match[2] ? +match[2] : 0));
  // }
  //
  // // COLORS
  // // http://krazydad.com/tutorials/makecolors.php
  // JSV.colors = function(len, center, width, alpha, freq1, freq2, freq3,
  //                                  phase1, phase2, phase3) {
  //   var colors = [];
  //   if (len == undefined)      len    = 50;
  //   if (center == undefined)   center = 200;
  //   if (width == undefined)    width  = 30;
  //   if (alpha == undefined)    alpha  = 1;
  //   if (freq1 == undefined)    freq1  = 2.4;
  //   if (freq2 == undefined)    freq2  = 2.4;
  //   if (freq3 == undefined)    freq3  = 2.4;
  //   if (phase1 == undefined)   phase1 = 0;
  //   if (phase2 == undefined)   phase2 = 2;
  //   if (phase3 == undefined)   phase3 = 4;
  //
  //   for (var i = 0; i < len; ++i) {
  //     var red   = Math.round(Math.sin(freq1*i + phase1) * width + center);
  //     var green = Math.round(Math.sin(freq2*i + phase2) * width + center);
  //     var blue  = Math.round(Math.sin(freq3*i + phase3) * width + center);
  //     colors.push('rgba(' + red + ',' + green + ',' + blue + ',' + alpha + ')');
  //   }
  //   return colors;
  // }
  //
  // JSV.test_colors = function(colors) {
  //   colors.forEach(function(color) {
  //     document.write( '<font style="color:' + color + '">&#9608;</font>')
  //   })
  //   document.write( '<br/>')
  // }
  //

})(CGView);


//////////////////////////////////////////////////////////////////////////////
// Initializing Dragging
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * Initialize Spectra Viewer Dragging.
   */
  CGV.Viewer.prototype.initializeDragging = function() {
    var self = this;
    self._drag = d3.drag()
      .on('start', dragstart)
      .on('drag',  dragging)
      .on('end',   dragend);
    d3.select(self.canvas.node('ui')).call(self._drag);

    function dragstart() {
      // d3.event.sourceEvent.preventDefault(); // Prevent text cursor
      // self.svg.style('cursor', 'all-scroll');
      d3.select(self.canvas.node('ui')).style('cursor', 'all-scroll');
      // self.trigger('drag-start');
    }

    function dragging() {
      var start_time = new Date().getTime();
      // // Restore selected peaks
      // // if (self.selection.empty()) self.selection._elements = current_selected_elements;
      // self.translate_axis('x', d3.event.dx);
      // self.translate_axis('y', d3.event.dy);
      domain_x = self.scale.x.domain();
      domain_y = self.scale.y.domain();
      var dx = CGV.pixel(d3.event.dx);
      var dy = CGV.pixel(d3.event.dy);


      self.scale.x.domain([domain_x[0] - dx, domain_x[1] - dx])
      self.scale.y.domain([domain_y[0] + dy, domain_y[1] + dy])
      self.drawFast();
      // self.draw(true);
      // self.trigger('drag');
      // self.fast_draw();
      //
      // DEBUG INFO
      if (self.debug) {
        self.debug.data.time['drag'] = CGV.elapsed_time(start_time);
        // self.debug_data.drag['dX'] = CGV.round(d3.event.dx);
        // self.debug_data.drag['dY'] = CGV.round(d3.event.dy);
        // self.debug_data.drag['zX'] = CGV.round(self.zoom_x);
        // self.debug_data.drag['zY'] = CGV.round(self.zoom_y);
      }
    }

    function dragend() {
      // self.trigger('drag-end');
      // self.full_draw();
      // self.draw()
      self.drawFull()
    }
  }

})(CGView);


//////////////////////////////////////////////////////////////////////////////
// Initializing Zooming
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  CGV.Viewer.prototype._updateZoomMax = function() {
    if (this._zoom) {
      this._zoom.scaleExtent([0.8, this.backbone.maxZoomFactor()]);
    }
  }

  CGV.Viewer.prototype.initializeZooming = function() {
    var self = this;
    var zoomMax = this.backbone.maxZoomFactor();
    self._zoom = d3.zoom()
      .scaleExtent([1, zoomMax])
      .on('start', zoomstart)
      .on('zoom',  zooming)
      .on('end',   zoomend);
    d3.select(self.canvas.node('ui')).call(self._zoom)
      .on('dblclick.zoom', null);

    function zoomstart() {
      // self.trigger('zoom-start');
      // console.log('START')
      // if (self.layout._slotTimeoutID) {
      //   clearTimeout(self.layout._slotTimeoutID);
      //   self.layout._slotTimeoutID = undefined;
      // }
    }

    function zooming() {
      var start_time = new Date().getTime();
      var pos = d3.mouse(self.canvas.node('ui'));
      var mx = self.scale.x.invert(CGV.pixel(pos[0]))
      var my = self.scale.y.invert(CGV.pixel(pos[1]))

      var radius = self.backbone.zoomedRadius;
      var angle = CGV.angleFromPosition(mx, my);

      self._zoomFactor = d3.event.transform.k

      var radiusDiff = radius - self.backbone.zoomedRadius;

      var dx = CGV.pixel(Math.cos(-angle) * radiusDiff);
      var dy = CGV.pixel(Math.sin(-angle) * radiusDiff);

      var domain_x = self.scale.x.domain();
      var domain_y = self.scale.y.domain();

      self.scale.x.domain([domain_x[0] - dx, domain_x[1] - dx])
      self.scale.y.domain([domain_y[0] - dy, domain_y[1] - dy])

      // console.log('Mouse: ', [mx, my]);
      // console.log('radius: ', radius);
      // console.log('Angle: ', angle);
      // console.log('TX: ', [dx, dy]);
      // console.log('rDiff: ', radiusDiff);

      // self.trigger('zoom');
      // self.fast_draw();

      self.drawFast();

      // DEBUG INFO
      if (self.debug) {
        if (self.debug.data.time) {
          self.debug.data.time['zoom'] = CGV.elapsed_time(start_time);
        }
        if (self.debug.data.zoom) {
          self.debug.data.zoom['scale'] = CGV.round(self._zoomFactor, 1);
        }
      }
    }

    function zoomend() {
      // self.svg.style('cursor', 'all-scroll');
      // self.trigger('zoom-end');
      // self.full_draw();
      self.drawFull();
    }
  }

})(CGView);


(function(CGV) {

  CGV.WorkerFeatureExtraction = function() {
    onmessage = function(e) {
      var progressState;
      var type = e.data.type;
      console.log('Starting ' + type);
      var featureDataArray = [];
      if (type == 'start_stop_codons') {
        progressState = { start: 0, stop: 50 };
        featureDataArray = extractStartStopCodons(1, e.data, progressState);
        progressState = { start: 50, stop: 100 };
        featureDataArray = featureDataArray.concat( extractStartStopCodons(-1, e.data, progressState) );
      } else if (type == 'orfs') {
        var featureDataArray = extractORFs(e.data);
      }
      // Sort the features by start
      featureDataArray.sort( (a, b) => {
        return a.start - b.start
      });
      // Return results
      postMessage({ messageType: 'complete', featureDataArray: featureDataArray });
      console.log('Done ' + type);
    }
    onerror = function(e) {
      console.error('Oops. Problem with ' + e.data.type);
    }


    extractStartStopCodons = function(strand, options, progressState = {}) {
      var progress = 0;
      var savedProgress = 0;
      var source = 'start-stop-codons';
      var seq = (strand == 1) ? options.seqString : reverseComplement(options.seqString);
      var startPattern = options.startPattern.toUpperCase().split(',').map( (s) => { return s.trim() }).join('|')
      var stopPattern = options.stopPattern.toUpperCase().split(',').map( (s) => { return s.trim() }).join('|')
      var totalPattern = startPattern + '|' + stopPattern;
      var startPatternArray = startPattern.split('|');
      var stopPatternArray = stopPattern.split('|');

      var re = new RegExp(totalPattern, 'g');
      var match, start, featureData, type;
      var seqLength = seq.length;
      var featureDataArray = [];

      while ( (match = re.exec(seq)) != null) {
        start = (strand == 1) ? (match.index + 1) : (seqLength - match.index - match[0].length + 1);
        if (startPatternArray.indexOf(match[0]) >= 0) {
          type = 'start-codon';
        } else if (stopPatternArray.indexOf(match[0]) >= 0) {
          type = 'stop-codon';
        }

        featureData = {
          type: type,
          start: start,
          stop: start + match[0].length - 1,
          strand: strand,
          source: source,
          extractedFromSequence: true
        }
        featureDataArray.push(featureData);

        // Progress
        progress = Math.round( (strand == 1) ? (start / seqLength * 100) : ( (seqLength - start) / seqLength * 100) );
        savedProgress = postProgress(progress, savedProgress, progressState);

        re.lastIndex = match.index + 1;
      }
      return featureDataArray
    }

    postProgress = function(currentProgress, savedProgress, progressState = {}) {
      var progressStart = progressState.start || 0;
      var progressStop = progressState.stop || 100;
      var progressIncrement = progressState.increment || 1;
      var progressRange = progressStop - progressStart;
      if ( (currentProgress > savedProgress) && (currentProgress % progressIncrement == 0) ) {
        savedProgress = currentProgress;
        var messageProgress = progressStart + (progressRange * currentProgress / 100);
        if (messageProgress % progressIncrement == 0) {
          // console.log(messageProgress)
          postMessage({ messageType: 'progress', progress: messageProgress });
        }
      }
      return savedProgress
    }

    extractORFs = function(options) {
      var minORFLength = options.minORFLength;
      var seq = options.seqString;
      var seqLength = seq.length;
      var featureDataArray = [];
      var progressState = {start: 0, stop: 25};


      var codonDataArray = extractStartStopCodons(1, options, progressState);
      var progressState = {start: 25, stop: 50};
      codonDataArray = codonDataArray.concat( extractStartStopCodons(-1, options, progressState) );
      var startFeatures = codonDataArray.filter( (f) => { return f.type == 'start-codon' });
      var stopFeatures = codonDataArray.filter( (f) => { return f.type == 'stop-codon' });

      var startsByRF = featuresByReadingFrame(startFeatures, seqLength);
      var stopsByRF = featuresByReadingFrame(stopFeatures, seqLength);

      var progressState = {start: 50, stop: 75};
      featureDataArray =  orfsByStrand(1, startsByRF, stopsByRF, minORFLength, seqLength, progressState);
      var progressState = {start: 75, stop: 100};
      featureDataArray = featureDataArray.concat( orfsByStrand(-1, startsByRF, stopsByRF, minORFLength, seqLength, progressState) );
      return featureDataArray
    }

    orfsByStrand = function(strand, startsByRF, stopsByRF, minORFLength, seqLength, progressState = {}) {
      var position, orfLength, range, starts, stops;
      var start, stop, stopIndex;
      var progress, savedProgress;
      var type = 'ORF';
      var source = 'orfs';
      var featureDataArray = [];
      var readingFrames = (strand == 1) ? ['rf_plus_1', 'rf_plus_2', 'rf_plus_3'] : ['rf_minus_1', 'rf_minus_2', 'rf_minus_3'];
      // for (var rf of readingFrames) {
      readingFrames.forEach( function(rf) {
        position = (strand == 1) ? 1 : seqLength;
        stopIndex = 0;
        starts = startsByRF[rf]; 
        stops = stopsByRF[rf];
        progressInitial = 33 * readingFrames.indexOf(rf);
        progress = 0;
        savedProgress = 0;
        if (strand == -1) {
          // Sort descending by start
          starts.sort( (a,b) => { return b.start - a.start }); 
          stops.sort( (a,b) => { return b.start - a.start });
        }
        for (var i = 0, len_i = starts.length; i < len_i; i++) {
          start = starts[i];
          progress = progressInitial + Math.round( i / len_i * 33);
          savedProgress = postProgress(progress, savedProgress, progressState);
          if ( (strand == 1) && (start.start < position) || (strand == -1) && (start.start > position) ) {
            continue;
          }
          for (var j = stopIndex, len_j = stopsByRF[rf].length; j < len_j; j++) {
            stop = stops[j];
            orfLength = (strand == 1) ? stop.stop - start.start : start.stop - stop.start;
            if (orfLength >= minORFLength) {
              position = (strand == 1) ? stop.stop : stop.start;

              featureData = {
                type: type,
                start: (strand == 1) ? start.start : stop.start,
                stop: (strand == 1) ? stop.stop : start.stop,
                strand: strand,
                source: source,
                extractedFromSequence: true
              }
              featureDataArray.push(featureData);

              // progress = Math.round(start / seqLength * 100);
              // if ( (progress > savedProgress) && (progress % progressIncrement == 0) ) {
              //   savedProgress = progress;
              //   postMessage({ messageType: 'progress', progress: progress });
              // }

              stopIndex = j;
              break;
            } else if (orfLength > 0) {
              position = (strand == 1) ? stop.stop : stop.start;
              stopIndex = j;
              break;
            }
          }
        }
      });
      return featureDataArray
    }

    reverseComplement = function(seq) {
      return complement( seq.split('').reverse().join('') );
    }

    complement = function(seq) {
      var compSeq = ''
      var char, compChar;
      for (var i = 0, len = seq.length; i < len; i++) {
        char = seq.charAt(i);
        switch (char) {
          case 'A':
            compChar = 'T';
            break;
          case 'T':
            compChar = 'A';
            break;
          case 'G':
            compChar = 'C';
            break;
          case 'C':
            compChar = 'G';
        }
        compSeq = compSeq + compChar;
      }
      return compSeq
    }

    featuresByReadingFrame = function(features, seqLength) {
      var featuresByRF = {
        rf_plus_1: [],
        rf_plus_2: [],
        rf_plus_3: [],
        rf_minus_1: [],
        rf_minus_2: [],
        rf_minus_3: []
      };
      var rf, feature;
      for (var i = 0, len = features.length; i < len; i++) {
        feature = features[i];
        if (feature.strand == -1) {
          rf = (seqLength - feature.stop + 1) % 3;
          if (rf == 0) { rf = 3; }
          featuresByRF['rf_minus_' + rf].push(feature);
        } else {
          rf = feature.start % 3;
          if (rf == 0) { rf = 3; }
          featuresByRF['rf_plus_' + rf].push(feature);
        }
      }
      return featuresByRF
    }

  }
})(CGView);

(function(CGV) {

  CGV.WorkerBaseContent = function() {
    onmessage = function(e) {
      console.log('Starting ' + e.data.type);
      calculateBaseContent(e.data);
      console.log('Done ' + e.data.type);

    }
    onerror = function(e) {
      console.error('Oops. Problem with ' + e.data.type);
    }

    calculateBaseContent = function(options) {
      var progress = 0;
      var savedProgress = 0;
      var progressIncrement = 1;
      var positions = [];
      var scores = [];
      var type = options.type;
      var seq = options.seqString;
      var windowSize = options.window;
      var step = options.step;
      var deviation = options.deviation;
      var average = baseCalculation(type, seq);
      // Starting points for min and max
      var min = 1;
      var max = 0;
      var halfWindowSize = windowSize / 2;
      var start, stop;

      // Position marks the middle of the calculated window
      for (var position = 1, len = seq.length; position < len; position += step) {
        // Extract DNA for window and calculate score
        start = subtractBp(seq, position, halfWindowSize);
        stop = addBp(seq, position, halfWindowSize);
        var subSeq = subSequence(seq, start, stop);
        var score = baseCalculation(type, subSeq);

        if (score > max) {
          max = score;
        }
        if (score < min) {
          min = score;
        }

        // The current position marks the middle of the calculated window.
        // Adjust the bp position to mark where the plot changes,
        // NOT the center point of the window.
        // i.e. half way between the current position and the last
        if (position == 1) {
          positions.push(1);
        } else {
          positions.push(position - step/2);
        }
        // positions.push(position);

        scores.push(score);
        progress = Math.round(position / len * 100);
        if ( (progress > savedProgress) && (progress % progressIncrement == 0) ) {
          savedProgress = progress;
          postMessage({ messageType: 'progress', progress: progress });
        }
      }

      // Adjust scores if scaled
      // Min value becomes 0
      // Max value becomes 1
      // Average becomes 0.5
      if (deviation == 'scale') {
        scores = scores.map( (score) => {
          if (score >= average) {
            return scaleValue(score, {min: average, max: max}, {min: 0.5, max: 1});
          } else {
            return scaleValue(score, {min: min, max: average}, {min: 0, max: 0.5});
          }
        });
        min = 0;
        max = 1;
        average = 0.5;
      }
      var baseContent = { positions: positions, scores: scores, min: min, max: max, average: average }
      postMessage({ messageType: 'complete', baseContent: baseContent });
    }

    baseCalculation = function(type, seq) {
      if (type == 'gc_content') {
        return calcGCContent(seq);
      } else if (type == 'gc_skew') {
        return calcGCSkew(seq);
      }
    }

    calcGCContent = function(seq) {
      if (seq.length == 0) { return  0.5 }
      var g = count(seq, 'g');
      var c = count(seq, 'c');
      return ( (g + c) / seq.length )
    }

    calcGCSkew = function(seq) {
      var g = count(seq, 'g');
      var c = count(seq, 'c');
      if ( (g + c) == 0 ) { return 0.5 }
      // Gives value between -1 and 1
      var value = (g - c) / (g + c);
      // Scale to a value between 0 and 1
      return  0.5 + (value / 2);
    }

    count = function(seq, pattern) {
      return (seq.match(new RegExp(pattern, 'gi')) || []).length
    }

    /**
     * Subtract *bpToSubtract* from *position*, taking into account the sequence length
     * @param {Number} position - position (in bp) to subtract from
     * @param {Number} bpToSubtract - number of bp to subtract
     */
    subtractBp = function(seq, position, bpToSubtract) {
      if (bpToSubtract < position) {
        return position - bpToSubtract
      } else {
        return seq.length + position - bpToSubtract
      }
    }

    /**
     * Add *bpToAdd* to *position*, taking into account the sequence length
     * @param {Number} position - position (in bp) to add to
     * @param {Number} bpToAdd - number of bp to add
     */
    addBp = function(seq, position, bpToAdd) {
      if (seq.length >= (bpToAdd + position)) {
        return bpToAdd + position
      } else {
        return position - seq.length + bpToAdd
      }
    }

    subSequence = function(seq, start, stop) {
      var subSeq;
      if (stop < start) {
        subSeq = seq.substr(start - 1) + seq.substr(0, stop);
      } else {
        subSeq = seq.substr(start - 1, (stop - start));
      }
      return subSeq
    }

    /**
     * This function scales a value from the *from* range to the *to* range.
     * To scale from [min,max] to [a,b]:
     *
     *                 (b-a)(x - min)
     *          f(x) = --------------  + a
     *                   max - min
     */
    scaleValue = function(value, from={min: 0, max: 1}, to={min: 0, max: 1}) {
      return (to.max - to.min) * (value - from.min) / (from.max - from.min) + to.min;
    }

  }
})(CGView);

