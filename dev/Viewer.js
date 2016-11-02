var CGView = {};

CGView.version = '0.1';

if (window.CGV === undefined) window.CGV = CGView;

(function(CGV) {

  class Viewer {

    constructor(container_id, options = {}) {
      this._container = d3.select(container_id);
      // Get options
      this._width = CGV.default_for(options.width, 600);
      this._height = CGV.default_for(options.height, 600);
      this.sequenceLength = CGV.default_for(options.sequenceLength, 1000);
      this.backboneRadius = options.backboneRadius;
      this.debug = CGV.default_for(options.debug, false);

      // Create the viewer canvas
      // NOTE: anything drawn to the canvas must take the pixel ratio into account
      //       and should use the CGV.pixel() method.
      this.canvas = this._container.append("canvas")
        .classed('cgv-viewer', true)
        .style('border', '1px solid #DDD')
        .attr("width", this.width)
        .attr("height", this.height).node();

      // Check for canvas support
      if (!this.canvas.getContext) {
        this._container.html('<h3>CGView requires Canvas, which is not supported by this browser.</h3>');
      }

      // Get pixel ratio and upscale canvas depending on screen resolution
      // http://www.html5rocks.com/en/tutorials/canvas/hidpi/
      CGV.pixel_ratio = CGV.get_pixel_ratio(this.canvas);
      CGV.scale_resolution(this.canvas, CGV.pixel_ratio);

      // Set viewer context
      this.ctx = this.canvas.getContext('2d');

      // Set up scales
      this.scale = {};
      this.scale.x = d3.scaleLinear()
        .domain([CGV.pixel(-this.width/2), CGV.pixel(this.width/2)])
        .range([0, CGV.pixel(this.width)]);
      this.scale.y = d3.scaleLinear()
        .domain([CGV.pixel(-this.height/2), CGV.pixel(this.height/2)])
        .range([0, CGV.pixel(this.height)]);
      var bp_length = 1000;
      this.scale.bp = d3.scaleLinear()
        .domain([0, bp_length])
        .range([-1/2*Math.PI, 3/2*Math.PI]);

      this._io = new CGV.IO(this);

      this.initialize_dragging();

      this._featureSlots = new CGV.CGArray();


      // this.draw_test();
      this.draw();
    }

    // Static classs methods
    static get debug_sections() {
      return ['time'];
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
      return this._backboneRadius;
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

    draw_test() {
      var scale = this.scale;
      var ctx = this.ctx;
      this.ctx.beginPath();
      this.ctx.arc(scale.x(0), scale.y(0), CGV.pixel(200), 0, 2*Math.PI, false);
      this.ctx.stroke();
    }

    

    draw_arc(start, end, radius, color = '#000000', width = 1) {
      var scale = this.scale;
      var ctx = this.ctx;
      this.ctx.beginPath();
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = width;
      this.ctx.arc(scale.x(0), scale.y(0), CGV.pixel(radius), scale.bp(start), scale.bp(end), false);
      this.ctx.stroke();
    }

    /**
     * Clear the viewer canvas
     */
    clear() {
      this.ctx.clearRect(0, 0, CGV.pixel(this.width), CGV.pixel(this.height));
    }

    /**
    * Flash a message on the center of the viewer.
    */
    flash(msg) {
      var ctx = this.ctx;
      // this.ctx.font = this.adjust_font(1.5);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'center';
      var x = CGV.pixel(this.width) / 2
      var y = CGV.pixel(this.height) / 2
      ctx.fillText(msg, x, y);
    }

    draw() {
      this.clear();
      for (let i = 1; i < 100; i++) {
        this.draw_arc(0, 1000, 30+i*5);
        for (let j = 1; j < 1000; j=j+10) {
          this.draw_arc(j, j+5, 30+i*5, '#00BB00', 3);
        }
        for (let j = 1; j < 1000; j=j+10) {
          this.draw_arc(j+7, j+8, 30+i*5, '#0000BB', 3);
        }
      }
      if (this.debug) {
        // this.debug_data.time['draw'] = JSV.elapsed_time(start_time);
        this.debug.draw(this.ctx);
      }
    }

    addFeatureSlot(featureSlot) {
      // TODO: error check that this is a featureSlot
      this._featureSlots.push(featureSlot);
      featureSlot._viewer = this;
    }


  }

  CGV.Viewer = Viewer;

})(CGView);
