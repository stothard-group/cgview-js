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
      this.sequenceLength = CGV.defaultFor(options.sequenceLength, 1000);
      this.featureSlotSpacing = CGV.defaultFor(options.featureSlotSpacing, 1);

      this.globalLabel = CGV.defaultFor(options.globalLabel, true);
      this.backgroundColor = options.backgroundColor;
      this._zoomFactor = 1;
      this.debug = CGV.defaultFor(options.debug, false);

      this._io = new CGV.IO(this);


      this._featureSlots = new CGV.CGArray();
      this._legends = new CGV.CGArray();

      // Initialize Backbone
      this.backbone = new CGV.Backbone(this, options.backbone);
      // Initialize Menu
      this.menu = new CGV.Menu(this);
      // Initialize Help
      this.help = new CGV.Help(this);
      // Initialize LabelSet
      this.labelSet = new CGV.LabelSet(this);
      this.labelFont = CGV.defaultFor(options.labelFont, 'sans-serif, plain, 12');
      this.labelLineLength = CGV.defaultFor(options.labelLineLength, 20);
      // Initialize Ruler
      this.ruler = new CGV.Ruler(this);
      this.ruler.font = CGV.defaultFor(options.rulerFont, 'sans-serif, plain, 10');
      // Initialize Events
      this.initialize_dragging();
      this.initialize_zooming();

      d3.select(this.canvas.canvasNode).on('mousemove', () => {
        if (this.debug && this.debug.data.position) {
          var pos = d3.mouse(this.canvas.canvasNode);
          var mx = this.scale.x.invert(CGV.pixel(pos[0]))
          var my = this.scale.y.invert(CGV.pixel(pos[1]))
          // console.log([mx, my]);
          // console.log(this.canvas.bpForPoint({x: mx, y: my}));
          this.debug.data.position['xy'] = Math.round(mx) + ', ' + Math.round(my);
          this.debug.data.position['bp'] = this.canvas.bpForPoint({x: mx, y: my})
        }
      });

      d3.select(this.canvas.canvasNode).on('click', () => {
        console.log('CLICK')
        var swatchedLegendItems = this.swatchedLegendItems();
        var pos = d3.mouse(this.canvas.canvasNode);
        var pt = {x: CGV.pixel(pos[0]), y: CGV.pixel(pos[1])};
        for (var i = 0, len = swatchedLegendItems.length; i < len; i++) {
          if ( swatchedLegendItems[i]._swatchContainsPoint(pt) ) {
            var legendItem = swatchedLegendItems[i];
            console.log('SWATCH')
            // Clear previous selections
            for (var j = 0, len = swatchedLegendItems.length; j < len; j++) {
              swatchedLegendItems[j].swatchSelected = false;
            }
            if (this.colorPicker == undefined) {
              // Add element to contain picker
              var colorPickerId = this.containerId + '-color-picker';
              this._container.append('div')
                .classed('cp-color-picker', true)
                .attr('id', this.containerId + '-color-picker');
              // Create Color Picker
              this.colorPicker = new CGV.ColorPicker(colorPickerId);
              legendItem.legend.setColorPickerPosition(this.colorPicker);
            }
            var cp = this.colorPicker;
            legendItem.swatchSelected = true;
            if (!cp.visible) {
              legendItem.legend.setColorPickerPosition(cp);
            }
            cp.onChange = function(color) {
              legendItem.swatchColor = color.rgbaString;
              cgv.draw_fast();
            };
            cp.onClose = function() {
              legendItem.swatchSelected = false;
              cgv.draw_fast();
            };
            cp.setColor(legendItem._swatchColor.rgba);
            cp.open();
          }
        }

      });
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
      // TODO: update canvas
      // USE RESIZE
    }

    /**
     * @member {Number} - Get or set the width of the Viewer
     */
    get height() {
      return this._height;
    }

    set height(value) {
      // TODO: update canvas
      // USE RESIZE
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
     * Get or set the sequence length
     */
    get sequenceLength() {
      return this._sequenceLength;
    }

    set sequenceLength(bp) {
      if (bp) {
        this._sequenceLength = Number(bp);
        this.canvas.scale.bp = d3.scaleLinear()
          .domain([1, this._sequenceLength])
          .range([-1/2*Math.PI, 3/2*Math.PI]);
        this._updateZoomMax();
      }
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
     * @param {Boolean} keepAspectRatio - If only one of width/height is given the ratio will remain the same.
     * @param {Boolean} fast -  After resize, should the viewer be draw redrawn fast.
     */
    resize(width, height, keepAspectRatio=true, fast) {
      var canvas = this.canvas;
      this._width = width || this.width;
      this._height = height || this.height;
      // canvas.width = this._width;
      // canvas.height = this._height;
      // canvas.refreshScales();
      d3.select(canvas.canvasNode).style('width', this._width);
      d3.select(canvas.canvasNode).style('height', this._height);
      this.draw();

      // this.container
      //   .style('width', this.width + 'px');
      // d3.select(this.canvas)
      //   .attr('width', this.width)
      //   .attr('height', this.height);
      // this.font = this.adjust_font();
      // this.axis_title_font = this.adjust_font(1, undefined, 'bold');
      // this.scaled_height = JSV.pixel(this.height - this.axis_x_gutter);
      // this.scaled_width  = JSV.pixel(this.width - this.axis_y_gutter);
      // this.scale.y.range([this.scaled_height, 0]);
      // this.boundary.y.range([this.scaled_height, 0]);
      // this.scale.x.range(this.x_range());
      // this.boundary.x.range(this.x_range());
      // this.svg.attr('width', this.width).attr('height', this.height);
      // JSV.scale_resolution(this.canvas, JSV.pixel_ratio);

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
      return this.minDimension * 1.4; // TODO: need to add up all proportions
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
      var maxRadius = this.maxZoomedRadius();

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
        var slotThickness = CGV.pixel( Math.min(this.backbone.zoomedRadius, maxRadius) * slot.proportionOfRadius);
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
    }

    // addFeatureSlot(featureSlot) {
    //   // TODO: error check that this is a featureSlot
    //   this._featureSlots.push(featureSlot);
    //   featureSlot._viewer = this;
    // }

    /**
     * Subtract *bpToSubtract* from *position*, taking into account the sequenceLength
     * @param {Number} position - position (in bp) to subtract from
     * @param {Number} bpToSubtract - number of bp to subtract
     */
    subtractBp(position, bpToSubtract) {
      if (bpToSubtract <= position) {
        return position - bpToSubtract
      } else {
        return this.sequenceLength + position - bpToSubtract
      }
    }

    /**
     * Add *bpToAdd* to *position*, taking into account the sequenceLength
     * @param {Number} position - position (in bp) to add to
     * @param {Number} bpToAdd - number of bp to add
     */
    addBp(position, bpToAdd) {
      if (this.sequenceLength >= (bpToAdd + position)) {
        return bpToAdd + position
      } else {
        return position - this.sequenceLength + bpToAdd
      }
    }


    // Get mouse position in the 'container' taking into account the pixel ratio
    // mouse(container) {
    //   if (container == undefined) {
    //     container = self.canvas
    //   }
    //   return d3.mouse(container).map(function(p) { return CGV.pixel(p); });
    // }

    lengthOfRange(start, stop) {
      if (stop >= start) {
        return stop - start
      } else {
        return this.sequenceLength + (stop - start)
      } 
    }

    // mergeRanges(range1, range2) {
    //   var start, stop, testStart, testStop, rangeLength;
    //   var greatestLength = 0;
    //   var bounds = [ [range1[0], range1[1]], [range1[0], range2[1]], [range2[0], range1[1]], [range2[0], range2[1]] ];
    //   for (var i = 0, len = bounds.length; i < len; i++) {
    //     testStart = bounds[i][0];
    //     testStop = bounds[i][1];
    //     rangeLength = this.lengthOfRange(testStart, testStop)
    //     if (rangeLength > greatestLength) {
    //       greatestLength = rangeLength;
    //       start = testStart;
    //       stop = testStop;
    //     }
    //   }
    //   return [start, stop]
    // }
    //
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
