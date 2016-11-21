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
      this._width = CGV.default_for(options.width, 600);
      this._height = CGV.default_for(options.height, 600);
      this.canvas = new CGV.Canvas(this._container, {width: this._width, height: this._height});
      this.axis = new CGV.Axis(this.canvas);
      this.sequenceLength = CGV.default_for(options.sequenceLength, 1000);
      this.featureSlotSpacing = CGV.default_for(options.featureSlotSpacing, 1);
      // this.backboneRadius = options.backboneRadius;
      this.backboneRadius = CGV.default_for(options.backboneRadius, 200);
      this._zoomFactor = 1;
      this.debug = CGV.default_for(options.debug, false);

      this._io = new CGV.IO(this);

      this.initialize_dragging();
      this.initialize_zooming();

      this._featureSlots = new CGV.CGArray();

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

    // Static classs methods
    static get debug_sections() {
      return ['time', 'zoom', 'position'];
    }

    get width() {
      return this._width;
    }

    get height() {
      return this._height;
    }

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

    get scale() {
      return this.canvas.scale
    }

    get ctx() {
      return this.canvas.ctx
    }

    set sequenceLength(bp) {
      if (bp) {
        this._sequenceLength = Number(bp);
        this.canvas.scale.bp = d3.scaleLinear()
          .domain([1, this._sequenceLength])
          .range([-1/2*Math.PI, 3/2*Math.PI]);
      }
    }

    get sequenceLength() {
      return this._sequenceLength;
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

    load_json(json) {
      this._io.load_json(json);
    }

    load_xml(xml) {
      this._io.load_xml(xml);
    }

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
      var minDimension = CGV.pixel(Math.min(this.height, this.width));
      var maxRadius = minDimension; // TODO: need to add up all proportions

      var visibleRadii = this.canvas.visibleRadii();

      // Draw Backbone
      this.canvas.drawArc(0, this.sequenceLength, slotRadius, 'black', backboneThickness);

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

      this.axis.draw(reverseRadius, directRadius);
      if (this.debug) {
        this.debug.data.time['draw'] = CGV.elapsed_time(start_time);
        this.debug.draw(this.ctx);
      }
    }

    addFeatureSlot(featureSlot) {
      // TODO: error check that this is a featureSlot
      this._featureSlots.push(featureSlot);
      featureSlot._viewer = this;
    }

    subtractBp(position, bpToSubtract) {
      if (bpToSubtract <= position) {
        return position - bpToSubtract
      } else {
        return this.sequenceLength + position - bpToSubtract
      }
    }

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

  }

  CGV.Viewer = Viewer;

})(CGView);
