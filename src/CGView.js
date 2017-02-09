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
        .style('position', 'relative');
      this.canvas = new CGV.Canvas(this, this._wrapper, {width: this.width, height: this.height});
      this.featureSlotSpacing = CGV.defaultFor(options.featureSlotSpacing, 1);

      this.globalLabel = CGV.defaultFor(options.globalLabel, true);
      this.backgroundColor = options.backgroundColor;
      this._zoomFactor = 1;
      this.debug = CGV.defaultFor(options.debug, false);

      this._io = new CGV.IO(this);
      this._featureSlots = new CGV.CGArray();
      this._legends = new CGV.CGArray();

      // Initialize Sequence
      this.sequence = new CGV.Sequence(this, options.sequence);
      // Initialize Backbone
      this.backbone = new CGV.Backbone(this, options.backbone);
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

      // this.full_draw();
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

    /**
     * @member {Number} - Get or set the label line length.
     */
    get labelLineLength() {
      return this.labelSet.labelLineLength
    }

    set labelLineLength(value) {
      this.labelSet.labelLineLength = value;
    }

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

    get ctx() {
      return this.canvas.ctx
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
      this.draw_full();
    }

    //////////////////////////////////////////////////////////////////////////
    // METHODS
    //////////////////////////////////////////////////////////////////////////

    load_json(json) {
      this._io.load_json(json);
    }

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

      canvas.canvasNode.width = this._width * CGV.pixel_ratio;
      canvas.canvasNode.height = this._height * CGV.pixel_ratio;
      canvas.canvasNode.style.width = this._width + 'px';
      canvas.canvasNode.style.height = this._height + 'px';
      canvas.width = this._width;
      canvas.height = this._height;
      this.refreshLegends();
      this.canvas.refreshScales();

      this.draw(fast);
    }


    /**
     * Returns an [CGArray](CGArray.js.html) of Features or a single Feature from all the FeatureSlots in the viewer.
     * @param {Integer|String|Array} term - See [CGArray.get](CGArray.js.html#get) for details.
     * @return {CGArray}
     */
    features(term) {
      var features = new CGV.CGArray();
      for (var i=0, len=this._featureSlots.length; i < len; i++) {
        features.merge(this._featureSlots[i]._features);
      }
      return features.get(term);
    }

    /**
     * Returns an [CGArray](CGArray.js.html) of ArcPlots or a single ArcPlot from all the FeatureSlots in the viewer.
     * @param {Integer|String|Array} term - See [CGArray.get](CGArray.js.html#get) for details.
     * @return {CGArray}
     */
    arcPlots(term) {
      var plots = new CGV.CGArray();
      var arcPlot;
      for (var i=0, len=this._featureSlots.length; i < len; i++) {
        arcPlot = this._featureSlots[i]._arcPlot;
        if (arcPlot) {
          plots.push(arcPlot);
        }
      }
      return plots.get(term);
    }

    swatchedLegendItems(term) {
      var items = new CGV.CGArray();
      for (var i=0, len=this._legends.length; i < len; i++) {
        items.merge( this._legends[i]._legendItems.filter( (item) => {return item.drawSwatch}) );
      }
      return items.get(term);
    }

    // load_xml(xml) {
    //   this._io.load_xml(xml);
    // }

    /**
     * Clear the viewer canvas
     */
    clear(color = this.backgroundColor.rgbString) {
      this.canvas.clear(color);
    }

    /**
    * Flash a message on the center of the viewer.
    */
    flash(msg) {
      this.canvas.flash(msg);
    }

    /**
     * Return the maximum radius to use for calculating slot thickness when zoomed
     * @return {Number}
     */
    maxZoomedRadius() {
      // return this.minDimension * 1.4; // TODO: need to add up all proportions
      return this.minDimension * 1; // TODO: need to add up all proportions
    }


    /**
     * Slot thickness is based on a proportion of the backbone radius.
     * As the viewer is zoomed the slot radius increases until
     *  - The zoomed radius > the max zoomed radius (~ minimum dimension of the viewer).
     *    Therefore the we should always be able to see all the slots in the viewer
     *  - The slot thickness is greater than the maximum allowed slot thickness (if it's defined)
     */
    _calculateSlotThickness(proportionOfRadius) {
      var thickness = CGV.pixel( Math.min(this.backbone.zoomedRadius, this.maxZoomedRadius()) * proportionOfRadius);
      return (this.maxSlotThickness ? Math.min(thickness, CGV.pixel(this.maxSlotThickness)) : thickness)
    }

    draw_full() {
      this.draw();
    }

    draw_fast() {
      this.draw(true);
    }

    draw(fast) {
      var start_time = new Date().getTime();
      this.clear();
      var backboneThickness = CGV.pixel(this.backbone.zoomedThickness);
      var slotRadius = CGV.pixel(this.backbone.zoomedRadius);
      var directRadius = slotRadius + (backboneThickness / 2);
      var reverseRadius = slotRadius - (backboneThickness / 2);
      var spacing = CGV.pixel(this.featureSlotSpacing);
      var visibleRadii = this.canvas.visibleRadii();

      // All Text should have base line top
      this.ctx.textBaseline = 'top';

      // Draw Backbone
      this.backbone.draw();

      var residualSlotThickness = 0;

      // FetaureSlots
      for (var i = 0, len = this._featureSlots.length; i < len; i++) {
        var slot = this._featureSlots[i];
        // Calculate Slot dimensions
        // The slotRadius is the radius at the center of the slot
        var slotThickness = this._calculateSlotThickness(slot.proportionOfRadius);

        if (slot.isDirect()) {
          directRadius += ( (slotThickness / 2) + spacing + residualSlotThickness);
          slotRadius = directRadius;
        } else {
          reverseRadius -= ( (slotThickness / 2) + spacing + residualSlotThickness);
          slotRadius = reverseRadius;
        }
        residualSlotThickness = slotThickness / 2;
        // Draw Slot
        slot.draw(this.canvas, fast, slotRadius, slotThickness);

      }

      // Ruler
      this.ruler.draw(reverseRadius, directRadius);

      // Legends
      for (var i = 0, len = this._legends.length; i < len; i++) {
        this._legends[i].draw(this.ctx);
      }

      // Labels
      if (this.globalLabel) {
        this.labelSet.draw(reverseRadius, directRadius);
      }

      if (this.debug) {
        this.debug.data.time['draw'] = CGV.elapsed_time(start_time);
        this.debug.draw(this.ctx);
      }

      if (this._testDrawRange) {
        this.ctx.strokeStyle = 'grey';
        this.ctx.rect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.stroke();
      }
    }

    // addFeatureSlot(featureSlot) {
    //   // TODO: error check that this is a featureSlot
    //   this._featureSlots.push(featureSlot);
    //   featureSlot._viewer = this;
    // }



    // Get mouse position in the 'container' taking into account the pixel ratio
    // mouse(container) {
    //   if (container == undefined) {
    //     container = self.canvas
    //   }
    //   return d3.mouse(container).map(function(p) { return CGV.pixel(p); });
    // }


    refreshLegends() {
      for (var i = 0, len = this._legends.length; i < len; i++) {
        this._legends[i].refresh();
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
//////////////////////////////////////////////////////////////////////////////
// Initializing Zooming
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  CGV.Viewer.prototype._updateZoomMax = function() {
    if (this._zoom) {
      this._zoom.scaleExtent([1, this.backbone.maxZoomFactor()]);
    }
  }

  CGV.Viewer.prototype.initialize_zooming = function() {
    var self = this;
    var zoomMax = this.backbone.maxZoomFactor();
    self._zoom = d3.zoom()
      .scaleExtent([1, zoomMax])
      .on('start', zoomstart)
      .on('zoom',  zooming)
      .on('end',   zoomend);
    d3.select(self.canvas.canvasNode).call(self._zoom)
      .on('dblclick.zoom', null);

    function zoomstart() {
      // self.trigger('zoom-start');
    }

    function zooming() {
      var start_time = new Date().getTime();
      var pos = d3.mouse(self.canvas.canvasNode);
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

      self.draw(true);

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
      self.draw();
    }
  }

})(CGView);


//////////////////////////////////////////////////////////////////////////////
// Initializing Dragging
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * Initialize Spectra Viewer Dragging.
   */
  CGV.Viewer.prototype.initialize_dragging = function() {
    var self = this;
    self._drag = d3.drag()
      .on('start', dragstart)
      .on('drag',  dragging)
      .on('end',   dragend);
    d3.select(self.canvas.canvasNode).call(self._drag);

    function dragstart() {
      // d3.event.sourceEvent.preventDefault(); // Prevent text cursor
      // self.svg.style('cursor', 'all-scroll');
      d3.select(self.canvas.canvasNode).style('cursor', 'all-scroll');
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
      self.draw(true);
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
      self.draw()
    }
  }

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
  CGV.pixel_ratio = 1;

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
    return px * CGV.pixel_ratio;
  }

  CGV.get_pixel_ratio = function(canvas) {
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

  CGV.scale_resolution = function(canvas, ratio){
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
      }
    }

    /**
     * @member {Number} - Get or set the seqeunce length. If the *seq* property is set, the length can not be adjusted.
     */
    get length() {
      return this._length
    }

    _updateScale() {
      this.canvas.scale.bp = d3.scaleLinear()
        .domain([1, this.length])
        .range([-1/2*Math.PI, 3/2*Math.PI]);
      this.viewer._updateZoomMax();
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
      if (bpToSubtract <= position) {
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
          seq = this.seq.substr(range.start) + this.seq.substr(0, range.stop);
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
      var seq = [];
      var bp = range.start;
      for (var i = 0, len = range.length; i < len; i++) {
        switch (bp % 4) {
          case 0:
            seq[i] = 'A';
            break;
          case 1:
            seq[i] = 'T';
            break;
          case 2:
            seq[i] = 'G';
            break;
          case 3:
            seq[i] = 'C';
        }
        bp++;
      }
      return seq
    }

    _drawSequence() {
      var ctx = this.canvas.ctx;
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
// Ruler
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class Ruler {

    /**
     * The *Ruler* controls and draws the sequence ruler in bp.
     */
    constructor(viewer, options = {}) {
      this._viewer = viewer;
      this.tickCount = CGV.defaultFor(options.tickCount, 10);
      this.tickWidth = CGV.defaultFor(options.tickWidth, 1);
      this.tickLength = CGV.defaultFor(options.tickLength, 5);
      this.rulerPadding = CGV.defaultFor(options.rulerPadding, 10);
      this.font = CGV.defaultFor(options.font, 'sans-serif, plain, 10');
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
        var ticksAfterZero = Math.round(tickCount * (1 - tickCountRatio)) * 2; // Multiply by to for a margin of safety
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
      this._updateTicks(innerRadius, outerRadius);
      this.drawForRadius(innerRadius, 'inner');
      this.drawForRadius(outerRadius, 'outer', false);
    }


    drawForRadius(radius, position = 'inner', drawLabels = true) {
      var ctx = this.canvas.ctx;
      var scale = this.canvas.scale;
      var tickLength = (position == 'inner') ? -this.tickLength : this.tickLength;
      ctx.fillStyle = 'black'; // Label Color
      ctx.font = this.font.css;
      ctx.textAlign = 'left';
      // Draw Tick for first bp (Origin)
      this.canvas.radiantLine(1, radius, tickLength, this.tickWidth * 2);
      // Draw Major ticks
      this.majorTicks.each( (i, bp) => {
        this.canvas.radiantLine(bp, radius, tickLength, this.tickWidth);
        if (drawLabels) {
          var label = this.tickFormater(bp);
          this.drawLabel(bp, label, radius, position);
        }
      });
      // Draw Minor ticks
      this.minorTicks.each( (i, bp) => {
        this.canvas.radiantLine(bp, radius, tickLength / 2, this.tickWidth);
      });
    }

    drawLabel(bp, label, radius, position = 'inner') {
      var scale = this.canvas.scale;
      var ctx = this.canvas.ctx;
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
// CGViewer Menu
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  // NOTE: need to explicitly state menu and handle sizes here and not just in CSS
  // in order to work with hidden elements like tabs
  function Menu(viewer) {
    var self = this;
    this.viewer = viewer;
    this.slide_time = 500;
    this._visible = true;
    this.menu = viewer._wrapper.append('div')
      .style('visibility', 'hidden')
      .attr('class', 'cgv-menu')
      .on('click', function() { window.getSelection().removeAllRanges() });

    this.menu_svg = this.menu.append('svg')
      .attr('width', this.width())
      .attr('height', this.height());

    // this.handle = viewer.viewer_wrapper.append('div')
    this.handle = viewer._wrapper.append('div')
      .attr('class', 'cgv-menu-handle')
      .on('click', function() {
        if (self.opened()) {
          self.close();
        } else {
          self.open();
        }
      })
      .on('mouseover', function() { self.handle_mouseover(); })
      .on('mouseout', function() { self.handle_mouseout(); });

    // var handle_width = this.handle.node().offsetWidth;
    // var handle_height = this.handle.node().offsetHeight;
    var handle_width = 40;
    var handle_height = 12;

    this.handle_svg = this.handle.append('svg')
      .attr('width', handle_width)
      .attr('height', handle_height);

    this.stroke_width = 4
    this.handle_data_closed = [ {x: 0, y: 0}, {x: handle_width/2, y: handle_height - this.stroke_width}, {x: handle_width, y: 0} ];
    this.handle_data_opened = [ {x: 0, y: handle_height}, {x: handle_width/2, y: this.stroke_width}, {x: handle_width, y: handle_height} ];

    this.draw();
    // viewer.trigger('domain-change.menu');
    // this.close(0);
  }

  Menu.prototype.visible = function(value) {
    if (arguments.length == 0) return this._visible;
    if (value) {
      this._visible = true;
      this.handle.style('visibility', 'visible');
      this.menu.style('visibility', 'visible');
    } else {
      this._visible = false;
      this.handle.style('visibility', 'hidden');
      this.menu.style('visibility', 'hidden');
    }
  }

  Menu.prototype.opened = function() {
    return (this.menu.style('visibility') == 'visible');
  }

  Menu.prototype.width = function() {
    // return this.menu.node().offsetWidth;
    // return this.menu.node().getBoundingClientRect().width;
    return 300;
  }

  Menu.prototype.height = function() {
    // return this.menu.node().offsetHeight;
    // return this.menu.node().getBoundingClientRect().height;
    return  41;
  }

  Menu.prototype.open = function(duration) {
    duration = CGV.defaultFor(duration, this.slide_time)
    this.menu.style('visibility', 'visible');
    this.menu.transition().duration(duration)
      .style('top', '0px')
      .style('opacity', 1);

    this.handle_path.transition('shape').duration(duration).attr('d', line_function(this.handle_data_opened))
  }

  Menu.prototype.close = function(duration) {
    duration = CGV.defaultFor(duration, this.slide_time)
    this.menu.transition().duration(duration)
      .style('top', '-50px')
      .style('opacity', 0)
      .on('end', function() {
        d3.select(this).style('visibility', 'hidden');
      });

    this.handle_path.transition('shape').duration(duration).attr('d', line_function(this.handle_data_closed))
  }

  Menu.prototype.handle_mouseover = function() {
    this.handle_path.transition('color').duration(200)
      .attr('stroke', 'black');
  }

  Menu.prototype.handle_mouseout = function() {
    this.handle_path.transition().duration(200)
      .attr('stroke', 'grey');
  }

  Menu.prototype.draw = function() {
    var viewer = this.viewer;
    var self = this;
    var timeout;
    var translate_px = 5;
    var mousedown_delay = 4;

    // Handle
    this.handle_path = this.handle_svg.append("path")
      .attr("d", line_function(this.handle_data_closed))
      .attr("stroke", "grey")
      .attr("stroke-width", this.stroke_width)
      .attr("fill", "none");

    // Scroll/Move Buttons
    var left_arrow_data = [ {x: 11, y: 4}, {x: 4, y: 15}, {x: 11, y: 26} ];
    var right_arrow_data = [ {x: 4, y: 4}, {x: 11, y: 15}, {x: 4, y: 26} ];

    var left_arrow = path(this.menu_svg, left_arrow_data);
    var right_arrow = path(this.menu_svg, right_arrow_data);

    this.nav_group = this.menu_svg.append('g');
    this.scroll_left_button = button(this.nav_group, 0, 0, 15, 30, left_arrow);
    this.scroll_right_button = button(this.nav_group, 17, 0, 15, 30, right_arrow);
    this.nav_group.attr('transform', 'translate(' + 7 + ',' + 4 + ')');

    this.scroll_left_button.on('mousedown', function() {
      if (d3.select(this).classed('disabled')) return;
      timeout = scroll_interval(viewer, 'x', translate_px, mousedown_delay);
      return false;
    })

    this.scroll_right_button.on('mousedown', function() {
      if (d3.select(this).classed('disabled')) return;
      timeout = scroll_interval(viewer, 'x', -translate_px, mousedown_delay);
      return false;
    })

    $(document).mouseup(function(){
      if (timeout) {
        clearInterval(timeout);
        viewer.full_draw();
      }
    });

    // Zoom Buttons
    this.zoom_group = this.menu_svg.append('g');
    this.zoom_y_minus_button = button(this.zoom_group, 6, 18, 16, 16, minus_path(this.menu_svg));
    this.zoom_y_plus_button = button(this.zoom_group, 6, 0, 16, 16, plus_path(this.menu_svg));
    this.zoom_x_minus_button = button(this.zoom_group, 25, 9, 16, 16, minus_path(this.menu_svg));
    this.zoom_x_plus_button = button(this.zoom_group, 43, 9, 16, 16, plus_path(this.menu_svg));
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
    help_icon = this.menu_svg.append('text')
      .attr('x', 15)
      .attr('y', 24)
      .attr('font-family', 'sans-serif')
      .attr('font-size', '26px')
      .attr('stroke-width', 1)
      .attr('fill', 'black')
      .attr('class', 'cgv-button-text')
      .style('text-anchor', 'middle' )
      .text('?');
    this.help_button = button(this.menu_svg, 260, 4, 30, 30, help_icon);

    this.help_button.on('click', function() {
      viewer.help.dialog.open();
    })

    // Save/Download Button
    download_group = download_path(this.menu_svg)
      .attr('transform', 'translate(5,7)');

    this.download_button = button(this.menu_svg, 220, 4, 30, 30, download_group);
    // this.download_dialog = new CGV.Dialog(viewer, {
    //   header_text: 'Save Image',
    //   content_text: download_html(viewer),
    //   buttons: {
    //     'Cancel': function() { this.close(); },
    //     'Generate': function() { download_image(viewer, this); }
    //   }, width: 400,
    //   height: 250
    // });
    //
    // this.download_button.on('click', function() {
    //   self.download_dialog.open();
    // })

    // Settings Button
    settings_group = settings_path(this.menu_svg)
      .attr('transform', 'translate(5,5)');

    this.settings_button = button(this.menu_svg, 180, 4, 30, 30, settings_group);

    this.settings_button.on('click', function() {
      viewer.settings.open();
    })

    // CGV Button
    // TODO: add link to CGV website when available
    cgv_icon = this.menu_svg.append('text')
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

  var scroll_interval = function(viewer, axis, translate_px, delay) {
    return setInterval(function() {
      viewer.translate_axis(axis, translate_px);
      viewer.fast_draw();
    }, delay)
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
    // .interpolate("linear");

  var download_html = function(viewer) {
    return   '' +
    '<div class="cgv-alert">Display the viewer image in a new window to download or print. Note that you must allow pop-ups!</div>' +
    '<div><label class="cgv-label">Width</label><div class="cgv-input-group">' + 
    '<input class="cgv-input" id="cgv-save-width" type="text" value="' + viewer.width + '" /><div class="cgv-input-addon">px</div></div></div>' +
    '<div><label class="cgv-label">Height</label><div class="cgv-input-group">' + 
    '<input class="cgv-input" id="cgv-save-height" type="text" value="' + viewer.height + '" /><div class="cgv-input-addon">px</div></div></div>';
  }

  var download_image = function(viewer, dialog) {
    var height = viewer.viewer_wrapper.select('#cgv-save-height').property('value');
    var width = viewer.viewer_wrapper.select('#cgv-save-width').property('value');
    var image = viewer.image(width, height);
    var window_name = 'CGV-Image-' + width + 'x' + height;
    var win = window.open(image, window_name);
    dialog.close();
    setTimeout(function() { win.document.title = window_name }, 100);
  }



  CGV.Menu = Menu;

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
      var image = viewer._io.exportImage(width, height);
      dialog.close();
    }

  CGV.Menu = Menu;

})(CGView);


//////////////////////////////////////////////////////////////////////////////
// LegendItem
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * <br />
   * A *legendItem* is used to add text to a map *legend*. Individual
   * *Features* and *ArcPlots* can be linked to a *legendItem*, so that the feature
   * or arcPlot color will use the swatchColor of *legendItem*.
   */
  class LegendItem {

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
    constructor(legend, data = {}, meta = {}) {
      this.legend = legend;
      this.meta = CGV.merge(data.meta, meta);
      this.text = CGV.defaultFor(data.text, '');
      this.drawSwatch = CGV.defaultFor(data.drawSwatch, false);
      this.font = data.font
      this.fontColor = data.fontColor;
      this.textAlignment = data.textAlignment;
      this.drawSwatch = CGV.defaultFor(data.drawSwatch, false);
      this._swatchColor = new CGV.Color( CGV.defaultFor(data.swatchColor, 'black') );
      this.swatchOpacity = CGV.defaultFor(data.swatchOpacity, 1);
    }


    /**
     * @member {Legend} - Get or set the *Legend*
     */
    get legend() {
      return this._legend
    }

    set legend(newLegend) {
      var oldLegend = this.legend;
      this._viewer = newLegend.viewer;
      this._legend = newLegend;
      newLegend._legendItems.push(this);
      if (oldLegend) {
        // Remove from old legend
        oldLegend._legendItems = oldLegend._legendItems.remove(this);
        oldLegend.refresh();
        newLegend.refresh();
      }
    }

    /**
     * @member {String} - Get or set the text
     */
    get text() {
      return this._text
    }

    set text(text) {
      this._text = text;
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
    }

    /**
     * @member {String} - Get or set the text alignment. Defaults to the parent *Legend* text alignment. Possible values are *left*, *center*, or *right*.
     */
    get textAlignment() {
      return this._textAlignment
    }

    set textAlignment(value) {
      if (value == undefined) {
        this._textAlignment = this.legend.textAlignment;
      } else {
        this._textAlignment = value;
      }
    }

    /**
     * @member {Viewer} - Get the *Viewer*.
     */
    get viewer() {
      return this._viewer
    }

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

    /**
     * @member {Font} - Get or set the font. When setting the font, a string representing the font or a {@link Font} object can be used. For details see {@link Font}.
     */
    get font() {
      return this._font
    }

    set font(value) {
      if (value == undefined) {
        this._font = this.legend.font;
      } else if (value.toString() == 'Font') {
        this._font = value;
      } else {
        this._font = new CGV.Font(value);
      }
    }

    /**
     * @member {Color} - Get or set the fontColor. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
     */
    get fontColor() {
      return this._fontColor
    }

    set fontColor(color) {
      if (color == undefined) {
        this._fontColor = this.legend._fontColor;
      } else if (color.toString() == 'Color') {
        this._fontColor = color;
      } else {
        this._fontColor = new CGV.Color(color);
      }
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
    }

    /**
     * @member {String} - Get or set the opacity.
     */
    get swatchOpacity() {
      return this._swatchColor.opacity
    }

    set swatchOpacity(value) {
      this._swatchColor.opacity = value;
    }

    _swatchContainsPoint(pt) {
      var x = this.legend.originX + this.legend.padding;
      var y = this.legend.originY + this.legend.padding;
      for (var i = 0, len = this.legend._legendItems.length; i < len; i++) {
        var item = this.legend._legendItems[i];
        if (item == this) { break }
        y += (item.height * 1.5);
      }

      if (pt.x >= x && pt.x <= x + this.height && pt.y >= y && pt.y <= y + this.height) {
        return true
      }
    }
  }

  CGV.LegendItem = LegendItem;

})(CGView);
//////////////////////////////////////////////////////////////////////////////
// Legend
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * <br />
   * The *Legend* object can be used to describe a map legend or or add additional annotation to
   * the map. A *Legend* contain one or more [LegendItem]{@link LegendItem} elements
   */
  class Legend {

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
     *  backgroundOpacity     | 1                | A value between 0 and 1.
     *
     * @param {Object=} meta - User-defined key:value pairs to add to the legend.
     */
    constructor(viewer, data = {}, meta = {}) {
      this.viewer = viewer;
      this.meta = CGV.merge(data.meta, meta);
      this.canvas = viewer.canvas;
      this._legendItems = new CGV.CGArray();
      this._position = CGV.defaultFor(data.position, 'upper-right');
      this.backgroundColor = data.backgroundColor;
      this.backgroundOpacity = CGV.defaultFor(data.backgroundOpacity, 1);
      this.font = CGV.defaultFor(data.font, 'SansSerif, plain, 8');
      this._fontColor = new CGV.Color( CGV.defaultFor(data.fontColor, 'black') );
      this.textAlignment = CGV.defaultFor(data.textAlignment, 'left');

      if (data.legendItems) {
        data.legendItems.forEach((legendItemData) => {
          new CGV.LegendItem(this, legendItemData);
        });
      }
      this.refresh();
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
      viewer._legends.push(this);
    }

    /**
     * @member {String} - Get or set the legend postion. One of "upper-left", "upper-center", "upper-right", "middle-left", "middle-center", "middle-right", "lower-left", "lower-center", or "lower-right".
     */
    get position() {
      return this._position
    }

    set position(value) {
      this._position = value;
      this._updateOrigin();
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
    }

    /**
     * @member {String} - Get or set the opacity.
     */
    get backgroundOpacity() {
      return this._backgroundColor.opacity
    }

    set backgroundOpacity(value) {
      this._backgroundColor.opacity = value;
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
    }

    /**
     * @member {Color} - Get or set the fontColor. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
     */
    get fontColor() {
      // TODO set to cgview font color if not defined
      return this._fontColor.rgbaString
    }

    set fontColor(color) {
      this._fontColor.color = color;
    }

    /**
     * @member {String} - Get or set the text alignment. Possible values are *left*, *center*, or *right*.
     */
    get textAlignment() {
      return this._textAlignment
    }

    set textAlignment(value) {
      this._textAlignment = value;
    }

    /**
     * Recalculates the *Legend* size and position as well as the width of the child {@link LegendItem}s.
     */
    refresh() {
      // Calculate height of Legend
      // - height of each item; plus space between items (equal to half item height); plus padding (highest item)
      this.height = 0;
      var maxHeight = 0;
      for (var i = 0, len = this._legendItems.length; i < len; i++) {
        var legendItemHeight = this._legendItems[i].height;
        this.height += legendItemHeight;
        if (i < len - 1) {
          // Add spacing
          this.height += (legendItemHeight / 2);
        }
        if (legendItemHeight > maxHeight) {
          maxHeight = legendItemHeight;
        }
      }
      this.padding = maxHeight / 2;
      this.height += this.padding * 2;

      this.width = 0;
      var itemFonts = this._legendItems.map( (i) => { return i.font.css });
      var itemTexts = this._legendItems.map( (i) => { return i.text });
      var itemWidths = CGV.Font.calculateWidths(this.canvas.ctx, itemFonts, itemTexts);
      // Add swatch width
      for (var i = 0, len = itemWidths.length; i < len; i++) {
        var item = this._legendItems[i];
        if (item.drawSwatch) {
          itemWidths[i] += item.height + (this.padding / 2);
        }
        item._width = itemWidths[i];
      }
      this.width = d3.max(itemWidths) + (this.padding * 2);

      this._updateOrigin();
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

    _updateOrigin() {
      var margin = CGV.pixel(0);
      var canvasWidth = this.canvas.width;
      var canvasHeight = this.canvas.height;
      var legendWidth = this.width;
      var legendHeight = this.height;

      var position = this.position;
      if (position == 'upper-left') {
        this.originX = margin;
        this.originY = margin;
      } else if (position == 'upper-center') {
        this.originX = (canvasWidth / 2) - (legendWidth / 2);
        this.originY = margin;
      } else if (position == 'upper-right') {
        this.originX = canvasWidth - legendWidth - margin;
        this.originY = margin;
      } else if (position == 'middle-left') {
        this.originX = margin;
        this.originY = (canvasHeight / 2) - (legendHeight / 2);
      } else if (position == 'middle-center') {
        this.originX = (canvasWidth / 2) - (legendWidth / 2);
        this.originY = (canvasHeight / 2) - (legendHeight / 2);
      } else if (position == 'middle-right') {
        this.originX = canvasWidth - legendWidth - margin;
        this.originY = (canvasHeight / 2) - (legendHeight / 2);
      } else if (position == 'lower-left') {
        this.originX = margin;
        this.originY = canvasHeight - legendHeight - margin;
      } else if (position == 'lower-center') {
        this.originX = (canvasWidth / 2) - (legendWidth / 2);
        this.originY = canvasHeight - legendHeight - margin;
      } else if (position == 'lower-right') {
        this.originX = canvasWidth - legendWidth - margin;
        this.originY = canvasHeight - legendHeight - margin;
      }
    }

    draw(ctx) {
      ctx.fillStyle = this.backgroundColor.rgbaString;
      ctx.fillRect(this.originX, this.originY, this.width, this.height);
      var textX, swatchX;
      var y = this.originY + this.padding;
      for (var i = 0, len = this._legendItems.length; i < len; i++) {
        var legendItem = this._legendItems[i];
        var legendItemHeight = legendItem.height;
        var drawSwatch = legendItem.drawSwatch;
        var swatchWidth = legendItemHeight;
        var swatchPadding = this.padding / 2;
        ctx.font = legendItem.font.css;
        ctx.textAlign = legendItem.textAlignment;
        if (drawSwatch) {
          // Find x positions
          if (legendItem.textAlignment == 'left') {
            swatchX = this.originX + this.padding;
            textX = swatchX + swatchWidth + swatchPadding;
          } else if (legendItem.textAlignment == 'center') {
            swatchX = this.originX + this.padding;
            textX = this.originX + (this.width / 2);
          } else if (legendItem.textAlignment == 'right') {
            swatchX = this.originX + this.width - this.padding - swatchWidth;
            textX = swatchX - swatchPadding;
          }
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
          ctx.strokeRect(swatchX - border, y - border, swatchWidth + (border * 2), swatchWidth + (border * 2));
          // Draw Swatch
          ctx.fillStyle = legendItem.swatchColor.rgbaString;
          ctx.fillRect(swatchX, y, swatchWidth, swatchWidth);
          // Draw Text Label
          ctx.fillStyle = legendItem.fontColor.rgbaString;
          ctx.fillText(legendItem.text, textX, y);
        } else {
          // Find x position
          if (legendItem.textAlignment == 'left') {
            textX = this.originX + this.padding;
          } else if (legendItem.textAlignment == 'center') {
            textX = this.originX + (this.width / 2);
          } else if (legendItem.textAlignment == 'right') {
            textX = this.originX + this.width - this.padding;
          }
          // Draw Text Label
          ctx.fillStyle = legendItem.fontColor.rgbaString;
          ctx.fillText(legendItem.text, textX, y);
        }
        y += (legendItemHeight * 1.5);
      }
    }

  }

  CGV.Legend = Legend;

})(CGView);
//////////////////////////////////////////////////////////////////////////////
// LabelSet
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class LabelSet {

    constructor(viewer, options = {}) {
      this._viewer = viewer;
      this._canvas = viewer.canvas;
      this._labels = new CGV.CGArray();
      this.font = CGV.defaultFor(options.font, 'SansSerif, plain, 12');
      this.labelLineLength = CGV.defaultFor(options.labelLineLength, 20);
      this._labelLineMargin = CGV.pixel(10);
      this._labelLineWidth = CGV.pixel(1);
      // this._visibleLabels = new CGV.CGArray();
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
     * @member {Viewer} - Get the *Viewer*
     */
    get viewer() {
      return this._viewer
    }

    /**
     * @member {Number} - The number of labels in the set.
     */
    get length() {
      return this._labels.length
    }

    /**
     * Add a new label to the set.
     *
     * @param {Label} label - The Label to add to the set.
     */
    addLabel(label) {
      this._labels.push(label);
      this.sort();
    }

    /**
     * Remove a label from the set.
     *
     * @param {Label} label - The Label to remove from the set.
     */
    removeLabel(label) {
      this._labels = this._labels.remove(label);
    }

    /**
     * Sort the labels by position (middle of the feature in bp). 
     */
    sort() {
      // this._labels = this._labels.remove(label);
      this._labels.sort( (a,b) => { return a.bp > b.bp ? 1 : -1 } );
    }

    refreshLabelWidths() {
      // Refresh labels widths
      var labelFonts = this._labels.map( (i) => { return i.font.css});
      var labelTexts = this._labels.map( (i) => { return i.name});
      var labelWidths = CGV.Font.calculateWidths(this._canvas.ctx, labelFonts, labelTexts);
      for (var i = 0, len = this._labels.length; i < len; i++) {
        this._labels[i].width = labelWidths[i];
      }
    }

    // Should be called when
    //  - Labels are added or removed
    //  - Font changes (LabelSet or individual label)
    //  - Label name changes
    //  - Zoom level changes
    _calculateLabelRects() {
      var canvas = this._canvas;
      var scale = canvas.scale;
      var label, feature, radians, bp, x, y;
      var radius = this._outerRadius + this._labelLineMargin;
      for (var i = 0, len = this._labels.length; i < len; i++) {
        label = this._labels[i];
        feature = label.feature;
        bp = feature.start + (feature.length / 2);
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
      var visibleRange = this._canvas.visibleRangeForRadius(radius);
      // FIXME: probably better to store bp values in array and use that to find indices of labels to keep
      if (visibleRange) {
        for (var i = 0, len = this._labels.length; i < len; i++) {
          if (visibleRange.contains(this._labels[i].bp)) {
            labelArray.push(this._labels[i]);
          }
        }
      } else {
        labelArray = this._labels;
      }
      return labelArray
    }

    draw(reverseRadius, directRadius) {

      // TODO: change origin when moving image
      // if (reverseRadius != this._innerRadius || directRadius != this._outerRadius) {
        this._innerRadius = reverseRadius;
        this._outerRadius = directRadius;
        this._calculateLabelRects();
      // }
      
      this._labelsToDraw = this.visibleLabels(directRadius);

      // Remove overlapping labels (TEMP)
      var labelRects = new CGV.CGArray();
      this._visibleLabels = new CGV.CGArray();
      for (var i = 0, len = this._labelsToDraw.length; i < len; i++) {
        label = this._labelsToDraw[i];
        if (!label.rect.overlap(labelRects)) {
          this._visibleLabels.push(label);
          labelRects.push(label.rect);
        }
      }

      var canvas = this._canvas;
      var ctx = canvas.ctx;
      var label, feature, bp, origin;
      ctx.font = this.font.css; // TODO: move to loop, but only set if it changes
      ctx.textAlign = 'left';
      for (var i = 0, len = this._visibleLabels.length; i < len; i++) {
        label = this._visibleLabels[i];
        feature = label.feature;
        // bp = feature.start + (feature.length / 2);
        canvas.radiantLine(label.bp, directRadius + this._labelLineMargin, this.labelLineLength, this._labelLineWidth, feature.color.rgbaString);
        // origin = canvas.pointFor(bp, directRadius + 5);
        ctx.fillStyle = feature.color.rgbaString;
        // ctx.fillText(label.name, origin.x, origin.y);
        ctx.fillText(label.name, label.rect.x, label.rect.y);
      }
      if (this.viewer.debug && this.viewer.debug.data.n) {
        this.viewer.debug.data.n['labels'] = this._visibleLabels.length;
      }
    }


  }

  CGV.LabelSet = LabelSet;

})(CGView);


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
        // Label was in LabelSet, so remove it
        if (!(this._name == '' || this._name == undefined)) {
          this.labelSet.removeLabel(this);
        }
        this._name = '';
      } else {
        // Label was not in LabelSet, so add it
        if (this._name == '' || this._name == undefined) {
          this.labelSet.addLabel(this);
        }
        this._name = value;
        this.width = this.font.width(this.viewer.canvas.ctx, this._name);
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
      return this.font.size
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
      return this._font || this.labelSet.font;
    }

    set font(value) {
      if (value == undefined) {
        this._font = this.labelSet.font;
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
     * @member {LabelSet} - Get the *LabelSet*
     */
    get labelSet() {
      return this.viewer.labelSet
    }

    /**
     * @member {Feature} - Get the Feature
     */
    get feature() {
      return this._feature
    }


  }

  CGV.Label = Label;

})(CGView);


// Static methods for converting XML <-> JSON
// NOTE: xml2json required for conversions
// https://github.com/abdmob/x2js
// Class for reading and writing JSON
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
     * Load data from new JSON format (modeled after XML from original CGView).
     * Removes any previous viewer data and overrides options that are already set.
     * @param {Object} data - TODO
     */
    load_json(json) {
      var viewer = this._viewer;

      // Determine scale factor between viewer and json map data
      var jsonMinDimension = Math.min(json.height, json.width);
      var viewerMinDimension = Math.min(viewer.height, viewer.width);
      var scaleFacter = jsonMinDimension / viewerMinDimension;

      // Override Main Viewer settings
      if (json.sequence) {
        viewer.sequence.seq = json.sequence.seq;
      } else {
        viewer.sequence.length = CGV.defaultFor(json.sequenceLength, viewer.sequence.length);
      }
      viewer.globalLabel = CGV.defaultFor(json.globalLabel, viewer.globalLabel);
      viewer.labelFont = CGV.defaultFor(json.labelFont, viewer.labelFont);
      viewer.ruler.font = CGV.defaultFor(json.rulerFont, viewer.ruler.font);
      viewer.backbone.radius = json.backboneRadius / scaleFacter;
      viewer.backbone.color = CGV.defaultFor(json.backboneColor, viewer.backbone.color);
      viewer.backbone.thickness = Math.ceil(json.backboneThickness / scaleFacter);
      // ...

      // Load FeatureSlots
      if (json.featureSlots) {
        json.featureSlots.forEach((slotData) => {
          new CGV.FeatureSlot(viewer, slotData);
        });
      }

      // Load Legends
      if (json.legends) {
        json.legends.forEach((legendData) => {
          new CGV.Legend(viewer, legendData);
        });
      }

      // Associate features and arcplots with LegendItems
      var swatchedLegendItems = viewer.swatchedLegendItems();
      var itemsLength = swatchedLegendItems.length;
      var legendItem;
      // Features
      var features = viewer.features();
      var feature;
      for (var i = 0, len = features.length; i < len; i++) {
        feature = features[i];
        for (var j = 0; j < itemsLength; j++) {
          legendItem = swatchedLegendItems[j];
          if (feature._color.rgbaString == legendItem.swatchColor.rgbaString) {
            feature.legendItem = legendItem;
            break
          }
        }
      }
      // ArcPlots
      var arcPlots = viewer.arcPlots();
      var arcPlot;
      for (var i = 0, len = arcPlots.length; i < len; i++) {
        arcPlot = arcPlots[i];
        for (var j = 0; j < itemsLength; j++) {
          legendItem = swatchedLegendItems[j];
          if (arcPlot._color.rgbaString == legendItem.swatchColor.rgbaString) {
            arcPlot.legendItem = legendItem;
          }
          if (arcPlot._colorPositive && arcPlot._colorPositive.rgbaString == legendItem.swatchColor.rgbaString) {
            arcPlot.legendItemPositive = legendItem;
          }
          if (arcPlot._colorNegative && arcPlot._colorNegative.rgbaString == legendItem.swatchColor.rgbaString) {
            arcPlot.legendItemNegative = legendItem;
          }
        }
      }
    }

    // Load data from conventionaly CGView XML file.
    load_xml(xml) {
      var json = IO.xml_to_json(xml);
      this.load_json(json);
    }

    static xml_to_json(xml) {
      if (!window.X2JS) {
        console.log("X2JS needs to be installed to read CGView XML: https://github.com/abdmob/x2js");
        return
      }
      var x2js = new X2JS({ attributePrefix: '' });
      // var json = x2js.xml_str2json(xml);
      var json = xmlToJson(xml);
      // var cgview = json.cgview
      // cgview.featureSlots = cgview.featureSlot
      // delete cgview.featureSlot

      return json
    }

    static json_to_xml(json) {
    }

    exportImage(width, height) {
      var viewer = this._viewer;
      var canvas = viewer.canvas;
      width = width || viewer.width;
      height = height || viewer.height;

      var windowTitle = 'CGV-Image-' + width + 'x' + height;

      // Adjust size based on pixel Ratio
      width = width / CGV.pixel_ratio;
      height = height / CGV.pixel_ratio;

      // Save current settings
      var origContext = canvas.ctx;
      var debug = viewer.debug;
      viewer.debug = false;

      // Generate new context and scales
      var tempCanvas = d3.select('body').append('canvas')
        .attr('width', width).attr('height', height).node();

      CGV.scale_resolution(tempCanvas, CGV.pixel_ratio);
      canvas.ctx = tempCanvas.getContext('2d');

      // Calculate scaling factor
      var minNewDimension = d3.min([width, height]);
      var scaleFactor = minNewDimension / viewer.minDimension;
      canvas.ctx.scale(scaleFactor, scaleFactor);

      // Generate image
      viewer.draw_full();
      var image = tempCanvas.toDataURL();

      // Restore original context and settings
      canvas.ctx = origContext;
      viewer.debug = debug;

      // Delete temp canvas
      d3.select(tempCanvas).remove();

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

  // Changes XML to JSON
  // function xmlToJson(xml) {
  //   // Create the return object
  //   var obj = {};
  //
  //   if (xml.nodeType == 1) { // element
  //     // do attributes
  //     if (xml.attributes.length > 0) {
  //     obj["@attributes"] = {};
  //       for (var j = 0; j < xml.attributes.length; j++) {
  //         var attribute = xml.attributes.item(j);
  //         obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
  //       }
  //     }
  //   } else if (xml.nodeType == 3) { // text
  //     obj = xml.nodeValue;
  //   }
  //
  //   // do children
  //   if (xml.hasChildNodes()) {
  //     for(var i = 0; i < xml.childNodes.length; i++) {
  //       var item = xml.childNodes.item(i);
  //       var nodeName = item.nodeName;
  //       if (typeof(obj[nodeName]) == "undefined") {
  //         obj[nodeName] = xmlToJson(item);
  //       } else {
  //         if (typeof(obj[nodeName].push) == "undefined") {
  //           var old = obj[nodeName];
  //           obj[nodeName] = [];
  //           obj[nodeName].push(old);
  //         }
  //         obj[nodeName].push(xmlToJson(item));
  //       }
  //     }
  //   }
  //   return obj;
  // };

  CGV.IO = IO;

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
    cssScaled(scale) {
      if (scale && scale != 1) {
        return this._styleAsCss() + ' ' + (this.size * scale) + 'px ' + this.family;
      } else {
        return this.css
      }
    }


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
      return this._size || CGV.pixel(12)
    }

    set size(value) {
      this._size = CGV.pixel(Number(value));
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
     * @member {Number} - Get the font height. This will be the same as the font [size]{@link Font#size}.
     */
    get height() {
      return this.size
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
      this._font = this._styleAsCss() + ' ' + this.size + 'px ' + this.family;
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
// FeatureSlot
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class FeatureSlot {

    /**
     * TEST
     */
    constructor(viewer, data = {}, display = {}, meta = {}) {
      this.viewer = viewer;
      this._strand = CGV.defaultFor(data.strand, 'direct');
      this._features = new CGV.CGArray();
      this._arcPlot;
      this.proportionOfRadius = CGV.defaultFor(data.proportionOfRadius, 0.1)

      this._featureStarts = new CGV.CGArray();

      if (data.features) {
        data.features.forEach((featureData) => {
          new CGV.Feature(this, featureData);
        });
        this.refresh();
      }

      if (data.arcPlot) {
        new CGV.ArcPlot(this, data.arcPlot);
      }
    }

    /** * @member {Viewer} - Get or set the *Viewer*
     */
    get viewer() {
      return this._viewer
    }

    set viewer(viewer) {
      if (this.viewer) {
        // TODO: Remove if already attached to Viewer
      }
      this._viewer = viewer;
      viewer._featureSlots.push(this);
    }

    /**
     * @member {Sequence} - Get the sequence.
     */
    get sequence() {
      return this.viewer.sequence
    }

    /**
     * @member {Viewer} - Get or set the slot size with is measured as a 
     * proportion of the backbone radius.
     */
    get proportionOfRadius() {
      return this._proportionOfRadius
    }

    set proportionOfRadius(value) {
      this._proportionOfRadius = value;
    }

    /**
     * @member {Number} - Get the current radius of the featureSlot.
     */
    get radius() {
      return this._radius
    }

    /**
     * @member {Number} - Get the current thickness of the featureSlot.
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

    get hasArcPlot() {
      return this._arcPlot
    }

    /**
     * The number of pixels per basepair along the feature slot circumference.
     * @return {Number}
     */
    pixelsPerBp() {
      return (this.radius * 2 * Math.PI) / this.sequence.length;
    }

    // Refresh needs to be called when new features are added, etc
    // Features need to be sorted by start position
    // NOTE: consider using d3 bisect for inserting new features in the proper sort order
    refresh() {
      // Sort the features by start
      this._features.sort( (a, b) => {
        return a.start - b.start
      });
      // Clear feature starts
      this._featureStarts = new CGV.CGArray();
      for (var i = 0, len = this._features.length; i < len; i++) {
        this._featureStarts.push(this._features[i].start);
      }
      this._largestFeatureLength = this.findLargestFeatureLength();
    }

    /**
     * Get the visible range
     * @member {Range}
     */
    get visibleRange() {
      return this._visibleRange
    }

    get largestFeatureLength() {
      return this._largestFeatureLength
    }

    findLargestFeatureLength() {
      var length = 0;
      for (var i = 0, len = this._features.length; i < len; i++) {
        var nextLength = this._features[i].length;
        if (nextLength > length) {
          length = nextLength
        }
      }
      return length
    }

    draw(canvas, fast, slotRadius, slotThickness) {
      var range = canvas.visibleRangeForRadius(slotRadius, slotThickness);
      this._visibleRange = range;
      this._radius = slotRadius;
      this._thickness = slotThickness;
      if (range) {
        var start = range.start;
        var stop = range.stop;
        if (this.hasFeatures) {
          var featureCount = this._features.length;
          var largestLength = this.largestFeatureLength;
          // Case where the largest feature should not be subtracted
          // _____ Visible
          // ----- Not Visbile
          // Do no subtract the largest feature so that the start loops around to before the stop
          // -----Start_____Stop-----
          // In cases where the start is shortly after the stop, make sure that subtracting the largest feature does not put the start before the stop
          // _____Stop-----Start_____
          if ( (largestLength <= (this.sequence.length - Math.abs(start - stop))) &&
               (this.sequence.subtractBp(start, stop) > largestLength) ) {
            start = range.getStartPlus(-largestLength);
            featureCount = this._featureStarts.countFromRange(start, stop);
          }
          if (fast && featureCount > 2000) {
            canvas.drawArc(1, this.sequence.length, slotRadius, 'rgba(0,0,200,0.03)', slotThickness);
          } else {
            this._featureStarts.eachFromRange(start, stop, 1, (i) => {
              this._features[i].draw(canvas, slotRadius, slotThickness, range);
            })
          }
          if (this.viewer.debug && this.viewer.debug.data.n) {
            var index = this.viewer._featureSlots.indexOf(this);
            this.viewer.debug.data.n['slot_' + index] = featureCount;
          }
        } else if (this.hasArcPlot) {
          this._arcPlot.draw(canvas, slotRadius, slotThickness, fast, range);
        }
      }
    }

  }

  CGV.FeatureSlot = FeatureSlot;

})(CGView);
//////////////////////////////////////////////////////////////////////////////
// Feature
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class Feature {

    /**
     * A Feature
     */
    constructor(featureSlot, data = {}, display = {}, meta = {}) {
      this.featureSlot = featureSlot;
      // this.color = data.color;
      // this._opacity = data.opacity;
      this._color = new CGV.Color(data.color);
      this.opacity = parseFloat(data.opacity);
      this.range = new CGV.CGRange(this.viewer.sequence, Number(data.start), Number(data.stop));
      // this.start = Number(data.start);
      // this.stop = Number(data.stop);
      this.label = new CGV.Label(this, {name: data.label} );
      this._radiusAdjustment = Number(data.radiusAdjustment) || 0;
      this._proportionOfThickness = Number(data.proportionOfThickness) || 1;
      // Decoration: arc, clockwise-arrow, counterclockwise-arrow
      this._decoration = CGV.defaultFor(data.decoration, 'arc');
    }

    /**
     * @member {FeatureSlot} - Get or set the *FeatureSlot*
     */
    get featureSlot() {
      return this._featureSlot
    }

    set featureSlot(slot) {
      if (this.featureSlot) {
        // TODO: Remove if already attached to FeatureSlot
      }
      this._featureSlot = slot;
      slot._features.push(this);
      this._viewer = slot.viewer;
    }

    /**
     * @member {Viewer} - Get the *Viewer*
     */
    get viewer() {
      return this._viewer
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
     * @member {String} - Get or set the color. Defaults to the *FeatureSlot* color. TODO: reference COLOR class
     */
    get color() {
      return (this.legendItem) ? this.legendItem.swatchColor : this._color;
    }

    set color(color) {
      if (color.toString() == 'Color') {
        this._color = color;
      } else {
        this._color.setColor(color);
      }
    }

    /**
     * @member {String} - Get or set the opacity. 
     */
    get opacity() {
      // return this._color.opacity
      return (this.legendItem) ? this.legendItem.swatchOpacity : this._color.opacity;
    }

    set opacity(value) {
      this._color.opacity = value;
    }

    /**
     * @member {String} - Get or set the decoration. Choices are *arc* [Default], *clockwise-arrow*, *counterclockwise-arrow*
     */
    get decoration() {
      return this._decoration;
    }

    set decoration(value) {
      this._decoration = value;
    }

    /**
     * @member {LegendItem} - Get or set the LegendItem. If a LegendItem is associated with this feature,
     *   the LegendItem swatch Color and Opacity will be used for drawing this feature. The swatch settings will
     *   override the color and opacity set for this feature.
     */
    get legendItem() {
      return this._legendItem;
    }

    set legendItem(value) {
      this._legendItem = value;
    }



    draw(canvas, slotRadius, slotThickness, visibleRange) {
      if (this.range.overlapsRange(visibleRange)) {
        var start = this.start;
        var stop = this.stop;
        var containsStart = visibleRange.contains(start);
        var containsStop = visibleRange.contains(stop);
        if (!containsStart) {
          start = visibleRange.start - 100;
        }
        if (!containsStop) {
          stop = visibleRange.stop + 100;
        }
        // When zoomed in, if the feature starts in the visible range and wraps around to end
        // in the visible range, the feature should be draw as 2 arcs.
        if ( (this.viewer.zoomFactor > canvas.drawArcsCutoff) &&
             (containsStart && containsStop) &&
             (this.range.overHalfCircle()) ) {

          canvas.drawArc(visibleRange.start - 100, stop,
            this.adjustedRadius(slotRadius, slotThickness),
            this.color.rgbaString, this.adjustedWidth(slotThickness), this.decoration);
          canvas.drawArc(start, visibleRange.stop + 100,
            this.adjustedRadius(slotRadius, slotThickness),
            this.color.rgbaString, this.adjustedWidth(slotThickness), this.decoration);
        } else {
          canvas.drawArc(start, stop,
            this.adjustedRadius(slotRadius, slotThickness),
            this.color.rgbaString, this.adjustedWidth(slotThickness), this.decoration);
        }
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

  }

  CGV.Feature = Feature;

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
      var events = new CGV.Events();
      this.events = events;
      // viewer._events = events;
      // viewer.on = events.on;
      // viewer.off = events.off;
      // viewer.trigger = events.trigger;

      this._initializeMousemove();
      this._initializeClick();
      // this.events.on('mousemove', (e) => {console.log(e.bp)})
      this.events.on('click', (e) => {console.log(e)})

      this.events.on('mousemove', (e) => {
        // console.log(e.bp);
        // console.log([e.mapX, e.mapY]);
        if (this.debug && this.debug.data.position) {
          this.debug.data.position['xy'] = e.mapX + ', ' + e.mapY;
          this.debug.data.position['bp'] = e.bp;
        }
      });

      this._legendSwatchClick();
      this._legendSwatchMouseOver();

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
      d3.select(this.canvas.canvasNode).on('mousemove.cgv', () => {
        this.events.trigger('mousemove', this._createEvent(d3.event));
      });
    }
    _initializeClick() {
      d3.select(this.canvas.canvasNode).on('click.cgv', () => {
        event = {d3: d3.event, canvasX: d3.event.x, canvasY: d3.event.y}
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
      return {
        bp: this.canvas.bpForPoint({x: mapX, y: mapY}),
        radius: radius,
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
        var swatchedLegendItems = viewer.swatchedLegendItems();
        for (var i = 0, len = swatchedLegendItems.length; i < len; i++) {
          if ( swatchedLegendItems[i]._swatchContainsPoint( {x: e.canvasX, y: e.canvasY} ) ) {
            var legendItem = swatchedLegendItems[i];
            // Clear previous selections
            for (var j = 0, len = swatchedLegendItems.length; j < len; j++) {
              swatchedLegendItems[j].swatchSelected = false;
            }
            legendItem.swatchSelected = true;
            var cp = viewer.colorPicker;
            if (!cp.visible) {
              legendItem.legend.setColorPickerPosition(cp);
            }
            cp.onChange = function(color) {
              legendItem.swatchColor = color.rgbaString;
              // cgv.draw_fast();
              cgv.draw();
            };
            cp.onClose = function() {
              legendItem.swatchSelected = false;
              // cgv.draw_fast();
              cgv.draw();
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
        var swatchedLegendItems = viewer.swatchedLegendItems();
        var _swatchHighlighted = false;
        for (var i = 0, len = swatchedLegendItems.length; i < len; i++) {
          if ( swatchedLegendItems[i]._swatchContainsPoint( {x: e.canvasX, y: e.canvasY} ) ) {
            var legendItem = swatchedLegendItems[i];
            // Clear previous selections
            for (var j = 0, len = swatchedLegendItems.length; j < len; j++) {
              swatchedLegendItems[j].swatchHighlighted = false;
            }
            _swatchHighlighted = true;
            legendItem.swatchHighlighted = true;
            this.canvas.cursor = 'pointer';
            legendItem.legend.draw(this.canvas.ctx);
            break;
          }
        }
        // No swatch selected
        if (!_swatchHighlighted) {
          for (var i = 0, len = swatchedLegendItems.length; i < len; i++) {
            var legendItem = swatchedLegendItems[i];
            if (legendItem.swatchHighlighted) {
              legendItem.swatchHighlighted = false;
              this.canvas.cursor = 'auto';
              legendItem.legend.draw(this.canvas.ctx);
              break;
            }
          }
        }
      });
    }

  }

  CGV.EventMonitor = EventMonitor;

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
      this.opacity = this._color.opacity;
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
        cp.opacity = mouse.x / alphaElement.offsetWidth;
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
//////////////////////////////////////////////////////////////////////////////
// Canvas
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class Canvas {

    /**
     * - Sets up the canvas for drawing
     * - Contains the x, y, bp scales
     * - has methods for for determining visible regions of the circle at a particular radius
     * - TODO: Have image describing the circle (center at 0,0) and how it relates to the canvas
     */
    constructor(viewer, container, options = {}) {
      this._viewer = viewer;
      this.width = CGV.defaultFor(options.width, 600);
      this.height = CGV.defaultFor(options.height, 600);
      this.scale = {};
      this._drawArcsCutoff = 10000;

      // Create the viewer canvas
      // NOTE: anything drawn to the canvas must take the pixel ratio into account
      //       and should use the CGV.pixel() method.
      this.canvasNode = container.append("canvas")
        .classed('cgv-viewer', true)
        .style('border', '1px solid #DDD')
        .attr("width", this._width)
        .attr("height", this._height).node();

      // Check for canvas support
      if (!this.canvasNode.getContext) {
        container.html('<h3>CGView requires Canvas, which is not supported by this browser.</h3>');
      }

      // Get pixel ratio and upscale canvas depending on screen resolution
      // http://www.html5rocks.com/en/tutorials/canvas/hidpi/
      CGV.pixel_ratio = CGV.get_pixel_ratio(this.canvasNode);
      CGV.scale_resolution(this.canvasNode, CGV.pixel_ratio);

      // Set viewer context
      this.ctx = this.canvasNode.getContext('2d');
      this.refreshScales();

    }

    /**
     * @member {Viewer} - Get the viewer.
     */
    get viewer() {
      return this._viewer
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
      return d3.select(this.canvasNode).style('cursor')
    }

    set cursor(value) {
      d3.select(this.canvasNode).style('cursor', value);
    }

    /**
     * When the zoomFactor is below the cutoff, draw arcs.
     * When the zoomFactor is above the cutoff, draw lines.
     */
    get drawArcsCutoff() {
      return this._drawArcsCutoff
    }

    /**
     * Clear the viewer canvas
     */
    clear(color = 'white') {
      // this.ctx.clearRect(0, 0, CGV.pixel(this.width), CGV.pixel(this.height));
      this.ctx.fillStyle = color;
      this.ctx.fillRect(0, 0, CGV.pixel(this.width), CGV.pixel(this.height));
    }

    /**
    * Flash a message on the center of the viewer.
    */
    flash(msg) {
      var ctx = this.ctx;
      // this.ctx.font = this.adjust_font(1.5);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'center';
      var x = this.width / 2
      var y = this.height / 2
      ctx.fillText(msg, x, y);
    }

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
    drawArc(start, stop, radius, color = '#000000', width = 1, decoration = 'arc') {
      var scale = this.scale;
      var ctx = this.ctx;

      if (decoration == 'arc') {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        this.arcPath(radius, start, stop);
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
        this.arcPath(radius + halfWidth, arcStartBp, arcStopBp, direction == -1);
        ctx.lineTo(arrowTipPt.x, arrowTipPt.y);
        ctx.lineTo(innerArcStartPt.x, innerArcStartPt.y);
        this.arcPath(radius - halfWidth, arcStopBp, arcStartBp, direction == 1, true);
        ctx.closePath();
        ctx.fill();
      }

    }

    /**
     * The method add an arc to the path. However, if the zoomFactor is very large,
     * the arc is added as a straight line.
     */
    arcPath(radius, startBp, stopBp, anticlockwise=false, noMoveTo=false) {
      var ctx = this.ctx;
      var scale = this.scale;
      if (this.viewer.zoomFactor < this.drawArcsCutoff) {
        ctx.arc(scale.x(0), scale.y(0), radius, scale.bp(startBp), scale.bp(stopBp), anticlockwise);
      } else {
        var p1 = this.pointFor(startBp, radius);
        var p2 = this.pointFor(stopBp, radius);
        if (noMoveTo) {
          ctx.lineTo(p2.x, p2.y);
        } else {
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
        }
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

    radiantLine(bp, radius, length, lineWidth = 1, color = 'black') {
      var innerPt = this.pointFor(bp, radius);
      var outerPt = this.pointFor(bp, radius + length);
      var ctx = this.ctx;

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

  }

  CGV.Canvas = Canvas;

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
      this._start = value;
    }

    /**
     * @member {Number} - Get or set the range stop.
     */
    get stop() {
      return this._stop
    }

    set stop(value) {
      this._stop = value;
    }

    /**
     * @member {Number} - Get the length of the range.
     */
    get length() {
      if (this.stop >= this.start) {
        return this.stop - this.start
      } else {
        return this.sequenceLength + (this.stop - this.start)
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

  // TODO: add step
  CGArray.prototype.eachFromRange = function(startValue, stopValue, step, callback) {
    var startIndex = CGV.indexOfValue(this, startValue, true);
    var stopIndex = CGV.indexOfValue(this, stopValue, false);
    if (stopValue >= startValue) {
      for (var i = startIndex; i <= stopIndex; i++) {
        callback.call(this[i], i, this[i]);
      }
    } else {
      for (var i = startIndex, len = this.length; i < len; i++) {
        callback.call(this[i], i, this[i]);
      }
      for (var i = 0; i <= stopIndex; i++) {
        callback.call(this[i], i, this[i]);
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
      if ( term.match(/^path-id-/) ) {
        return this.filter(function(element) { return element.path_id() == term; })[0];
      } else if ( term.match(/^label-id-/) ) {
        return this.filter(function(element) { return element.label_id() == term; })[0];
      } else {
        return this.filter(function(element) { return element.id == term; })[0];
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
// Backbone
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * The CGView Backbone is the ring that separates the direct and reverse slots
   * of the map. All the slot thicknesses are measures in relation to the backbone
   * radius.
   */
  class Backbone {

    /**
     * Create a Backbone
     *
     * @param {Viewer} viewer - The viewer that contains the backbone
     * @param {Object} options - Options and stuff
     */
    constructor(viewer, options = {}) {
      this._viewer = viewer;
      var defaultRadius = d3.min([this.viewer.width, this.viewer.height]) * 0.4;
      this.radius = CGV.defaultFor(options.radius, defaultRadius);
      this.color = CGV.defaultFor(options.color, 'black');
      this.font = CGV.defaultFor(options.font, 'sans-serif, plain, 14');
      this.fontColor = CGV.defaultFor(options.fontColor, 'black');
      this.thickness = CGV.defaultFor(options.thickness, 5);
      this._bpThicknessAddition = 0;
      this.bpMargin = 4;
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
      var ctx = this.canvas.ctx;
      var scale = this.canvas.scale;
      var radius = CGV.pixel(this.zoomedRadius);
      var range = this.visibleRange
      if (range) {
        var seq = this.sequence.forRange(range);
        var complement = CGV.Sequence.complement(seq);
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

    draw() {
      this._visibleRange = this.canvas.visibleRangeForRadius( CGV.pixel(this.zoomedRadius), 100);
      if (this.visibleRange) {
        this.viewer.canvas.drawArc(this.visibleRange.start, this.visibleRange.stop, CGV.pixel(this.zoomedRadius), this.color.rgbaString, CGV.pixel(this.zoomedThickness));
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
// ArcPlot
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class ArcPlot {

    /**
     * Draw a plot consisting of arcs
     */
    constructor(featureSlot, data = {}, display = {}, meta = {}) {
      this.featureSlot = featureSlot;
      this._bp = new CGV.CGArray();
      this._proportionOfThickness =  new CGV.CGArray();
      this._color = new CGV.Color( CGV.defaultFor(data.color, 'black') );
      this._colorPositive = data.colorPositive ? new CGV.Color(data.colorPositive) : undefined;
      this._colorNegative = data.colorNegative ? new CGV.Color(data.colorNegative) : undefined;

      if (data.bp) {
        this._bp = new CGV.CGArray(data.bp);
      }
      if (data.proportionOfThickness) {
        this._proportionOfThickness = new CGV.CGArray(data.proportionOfThickness);
      }
    }

    /**
     * @member {FeatureSlot} - Get or set the *FeatureSlot*
     */
    get featureSlot() {
      return this._featureSlot
    }

    set featureSlot(slot) {
      if (this.featureSlot) {
        // TODO: Remove if already attached to FeatureSlot
      }
      this._featureSlot = slot;
      slot._arcPlot = this;
      this._viewer = slot.viewer;
    }

    /**
     * @member {Viewer} - Get the *Viewer*
     */
    get viewer() {
      return this._viewer
    }

    get color() {
      // return this._color || this.featureSlot.color
      return (this.legendItem) ? this.legendItem.swatchColor : this._color;
    }

    get colorPositive() {
      // return this._colorPositive || this._color
      // return (this.legendPositiveItem) ? this.legendItemPositive.swatchColor : this._colorPositive.rgbaString;

      if (this.legendItemPositive) {
        return this.legendItemPositive.swatchColor
      } else if (this._colorPositive) {
        return this._colorPositive
      } else {
        return this.color
      }
    }

    get colorNegative() {
      // return this._colorNegative || this._color
      // return (this.legendNegativeItem) ? this.legendItemNegative.swatchColor : this._colorNegative.rgbaString;
      if (this.legendItemNegative) {
        return this.legendItemNegative.swatchColor
      } else if (this._colorNegative) {
        return this._colorNegative
      } else {
        return this.color
      }
    }

    /**
     * @member {LegendItem} - Get or set the LegendItem. If a LegendItem is associated with this plot,
     *   the LegendItem swatch Color and Opacity will be used for drawing this plot. The swatch settings will
     *   override the color and opacity set for this plot.
     */
    get legendItem() {
      return this._legendItem;
    }

    set legendItem(value) {
      this._legendItem = value;
    }

    get legendItemPositive() {
      return this._legendItemPositive;
    }

    set legendItemPositive(value) {
      this._legendItemPositive = value;
    }

    get legendItemNegative() {
      return this._legendItemNegative;
    }

    set legendItemNegative(value) {
      this._legendItemNegative = value;
    }

    draw(canvas, slotRadius, slotThickness, fast, range) {
      if (this.colorNegative.rgbaString == this.colorPositive.rgbaString) {
        this._drawPath(canvas, slotRadius, slotThickness, fast, range, this.colorPositive);
      } else {
        this._drawPath(canvas, slotRadius, slotThickness, fast, range, this.colorPositive, 'positive');
        this._drawPath(canvas, slotRadius, slotThickness, fast, range, this.colorNegative, 'negative');
      }
    }

    // To add a fast mode use a step when creating the indices
    _drawPath(canvas, slotRadius, slotThickness, fast,  range, color, orientation) {
      fast = false
      var ctx = canvas.ctx;
      var scale = canvas.scale;
      var bp = this._bp;
      var prop = this._proportionOfThickness;
      // This is the difference in radial pixels required before a new arc is draw
      // var radialDiff = fast ? 1 : 0.5;
      var radialDiff = 0.5;

      var startBp = range.start;
      var stopBp = range.stop;

      ctx.beginPath();
      ctx.lineWidth = 0.0001;

      var savedR = slotRadius;
      var savedBp = startBp;
      var currentR;
      var index, currentProp, currentBp, lastProp;
      // var step = fast ? 2 : 1
      bp.eachFromRange(startBp, stopBp, 1, (i) => {
        lastProp = currentProp;
        currentProp = prop[i];
        currentBp = bp[i];
        currentR = slotRadius + prop[i] * slotThickness;
        // If going from positive to negative need to save currentR as 0 (slotRadius)
        if (orientation && (lastProp * currentProp < 0)) {
          currentR = slotRadius;
          savedR = currentR;
          canvas.arcPath(currentR, savedBp, currentBp, false, true);
          savedBp = currentBp;
        }
        if ( this._keepPoint(currentProp, orientation) ){
          if ( Math.abs(currentR - savedR) >= radialDiff ){
            canvas.arcPath(currentR, savedBp, currentBp, false, true);
            savedR = currentR;
            savedBp = currentBp
          }
        } else {
          savedR = slotRadius;
        }
      });
      canvas.arcPath(savedR, savedBp, stopBp, false, true);
      var endPoint = canvas.pointFor(stopBp, slotRadius);
      ctx.lineTo(endPoint.x, endPoint.y);
      canvas.arcPath(slotRadius, stopBp, startBp, true, true);
      ctx.fillStyle = color.rgbaString;
      ctx.fill();
    }

    _keepPoint(proportionOfRadius, orientation) {
      if (orientation == undefined) {
        return true
      } else if (orientation == 'positive' && proportionOfRadius > 0) {
        return true
      } else if (orientation == 'negative' && proportionOfRadius < 0 ) {
        return true
      }
      return false
    }

  }


  CGV.ArcPlot = ArcPlot;

})(CGView);
