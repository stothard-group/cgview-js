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
      // this.scale = {};
      // Get options
      this._width = CGV.defaultFor(options.width, 600);
      this._height = CGV.defaultFor(options.height, 600);
      this.canvas = new CGV.Canvas(this, this._container, {width: this._width, height: this._height});
      this.ruler = new CGV.Ruler(this);
      this.sequenceLength = CGV.defaultFor(options.sequenceLength, 1000);
      this.featureSlotSpacing = CGV.defaultFor(options.featureSlotSpacing, 1);
      this.backboneRadius = CGV.defaultFor(options.backboneRadius, 200);
      this._zoomFactor = 1;
      this.debug = CGV.defaultFor(options.debug, false);

      this._io = new CGV.IO(this);

      this.initialize_dragging();
      this.initialize_zooming();

      this._featureSlots = new CGV.CGArray();
      this._legends = new CGV.CGArray();

      d3.select(this.canvas.canvasNode).on('mousemove', () => {
        if (this.debug) {
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
          if ( swatchedLegendItems[i].swatchContainsPoint(pt) ) {
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
      return ['time', 'zoom', 'position'];
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
    }

    /**
     * @member {Number} - Get or set the width of the Viewer
     */
    get height() {
      return this._height;
    }

    set height(value) {
      // TODO: update canvas
    }

    /**
     * @member {Number} - Set or get the backbone radius
     */
    set backboneRadius(radius) {
      if (radius) {
        this._backboneRadius = radius;
      } else {
        this._backboneRadius = d3.min([this.width, this.height]) * 0.4;
      }
    }

    get backboneRadius() {
      return this._backboneRadius * this._zoomFactor
    }

    /**
     * @member {Number} - Get or set the zoom level of the image
     */
    get zoomFactor() {
      return this._zoomFactor;
    }

    set zoomeFactor(value) {
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
    clear() {
      this.canvas.clear();
    }

    /**
    * Flash a message on the center of the viewer.
    */
    flash(msg) {
      this.canvas.flash(msg);
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
      var backboneThickness = CGV.pixel(3);
      var slotRadius = CGV.pixel(this.backboneRadius);
      var directRadius = slotRadius + (backboneThickness / 2);
      var reverseRadius = slotRadius - (backboneThickness / 2);
      var spacing = CGV.pixel(this.featureSlotSpacing);
      // var minDimension = CGV.pixel(Math.min(this.height, this.width));
      var minDimension = Math.min(this.height, this.width);
      var maxRadius = minDimension; // TODO: need to add up all proportions

      var visibleRadii = this.canvas.visibleRadii();

      // Draw Backbone
      this.canvas.drawArc(1, this.sequenceLength, slotRadius, 'black', backboneThickness);

      var residualSlotThickness = 0;

      // FetaureSlots
      for (var i = 0, len = this._featureSlots.length; i < len; i++) {
        // TESTING
        // if ([0].indexOf(i) == -1) {
        //   continue
        // }

        var slot = this._featureSlots[i];
        // Calculate Slot dimensions
        // The slotRadius is the radius at the center of the slot
        var slotThickness = CGV.pixel( Math.min(this.backboneRadius, maxRadius) * slot._proportionOfRadius);
        if (slot.isDirect()) {
          directRadius += ( (slotThickness / 2) + spacing + residualSlotThickness);
          slotRadius = directRadius;
        } else {
          reverseRadius -= ( (slotThickness / 2) + spacing + residualSlotThickness);
          slotRadius = reverseRadius;
        }
        residualSlotThickness = slotThickness / 2;
        // Only draw visible slots
        if ( ( (slotRadius - residualSlotThickness) <= visibleRadii.max ) && ( (slotRadius + residualSlotThickness) >= visibleRadii.min) ) {
          // Draw Slot
          slot.draw(this.canvas, fast, slotRadius, slotThickness);
        }

      }

      // Ruler
      this.ruler.draw(reverseRadius, directRadius);
      if (this.debug) {
        this.debug.data.time['draw'] = CGV.elapsed_time(start_time);
        this.debug.draw(this.ctx);
      }

      // Legends
      for (var i = 0, len = this._legends.length; i < len; i++) {
        this._legends[i].draw(this.ctx);
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
        return this.sequencelength + (stop - start)
      } 
    }


    toImage(width, height) {
      width = width || this.width;
      height = height || this.height;

      var windowTitle = 'CGV-Image-' + width + 'x' + height,

      // Adjust size based on pixel Ratio
      width = width / CGV.pixel_ratio;
      height = height / CGV.pixel_ratio;

      // Save current settings
      var orig_context = this.canvas.ctx;

      // Generate new context and scales
      var temp_canvas = d3.select('body').append('canvas')
        .attr('width', width).attr('height', height).node();

      CGV.scale_resolution(temp_canvas, CGV.pixel_ratio);
      this.canvas.ctx = temp_canvas.getContext('2d');

      this.canvas.width = width;
      this.canvas.height = height;
      this.canvas.refreshScales();
      this.width = width
      this.height = height
      this.backboneRadius = 0.4 * width;
      for (var i = 0, len = this._legends.length; i < len; i++) {
        this._legends[i].refresh();
      }

      // Generate image
      this.draw_full();
      var image = temp_canvas.toDataURL();

      // Restore original settings
      this.canvas.width = width;
      this.canvas.height = height;
      this.canvas.refreshScales();
      this.canvas.ctx = orig_context;

      // Delete temp canvas
      d3.select(temp_canvas).remove();

      var win = window.open();
      var html = [
        '<html>',
          '<head>',
            '<title>',
              windowTitle,
            '</title>',
          '</head>',
          '<body>',
            '<h2>Your CGView Image is Below</h2>',
            '<p>To save, right click on the image and choose "Save Image As..."</p>',
            '<img style="border: 1px solid grey" src="' + image +  '"/ >',
          '</body>',
        '<html>'
      ].join('');
      win.document.write(html);
    }


  }

  CGV.Viewer = Viewer;

})(CGView);
