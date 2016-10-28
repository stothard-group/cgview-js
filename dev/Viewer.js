var CGView = {};

CGView.version = '0.1';

if (window.CGV === undefined) window.CGV = CGView;

(function(CGV) {

  class Viewer {

    constructor(container_id, options = {}) {
      this._container = d3.select(container_id);
      this._width = CGV.default_for(options.width, 600);
      this._height = CGV.default_for(options.height, 600);
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

      this.draw_test();
    }

    // Static classs methods
    static get debug_sections() {
      return ['times'];
    }

    get width() {
      return this._width;
    }

    get height() {
      return this._height;
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

    draw_test() {
      var scale = this.scale;
      var ctx = this.ctx;
      this.ctx.beginPath();
      this.ctx.arc(scale.x(0), scale.y(0), CGV.pixel(200), 0, 2*Math.PI, false);
      this.ctx.stroke();
    }

    

    draw_arc(start, end, radius, color) {
      var scale = this.scale;
      var ctx = this.ctx;
      this.ctx.beginPath();
      this.ctx.arc(scale.x(0), scale.y(0), CGV.pixel(radius), scale.bp(start), scale.bp(end), false);
      this.ctx.stroke();
    }


  }

  CGV.Viewer = Viewer;

})(CGView);
