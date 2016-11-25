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
    constructor(container_id, options = {}) {
      this._container = d3.select(container_id);
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

      this.ruler.draw(reverseRadius, directRadius);
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
        return this.sequencelength + (stop - start)
      } 
    }

  }

  CGV.Viewer = Viewer;

})(CGView);
