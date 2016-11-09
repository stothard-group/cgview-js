var CGView = {};

CGView.version = '0.1';

if (window.CGV === undefined) window.CGV = CGView;

(function(CGV) {

  class Viewer {

    constructor(container_id, options = {}) {
      this._container = d3.select(container_id);
      this.scale = {};
      // Get options
      this._width = CGV.default_for(options.width, 600);
      this._height = CGV.default_for(options.height, 600);
      this.sequenceLength = CGV.default_for(options.sequenceLength, 1000);
      this.featureSlotSpacing = CGV.default_for(options.featureSlotSpacing, 1);
      // this.backboneRadius = options.backboneRadius;
      this.backboneRadius = CGV.default_for(options.backboneRadius, 200);
      this._zoomFactor = 1;
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
      this.scale.x = d3.scaleLinear()
        .domain([CGV.pixel(-this.width/2), CGV.pixel(this.width/2)])
        .range([0, CGV.pixel(this.width)]);
      this.scale.y = d3.scaleLinear()
        .domain([CGV.pixel(this.height/2), CGV.pixel(-this.height/2)])
        .range([0, CGV.pixel(this.height)]);
      // this.scale.bp = d3.scaleLinear()
      //   .domain([0, this.sequence_length])
      //   .range([-1/2*Math.PI, 3/2*Math.PI]);

      this._io = new CGV.IO(this);

      this.initialize_dragging();
      this.initialize_zooming();

      this._featureSlots = new CGV.CGArray();

      // this.canvas.on('mousemove', function() {
      //   var pos = d3.mouse(sv.canvas);
      //   sv.mx = sv.scale.x.invert(JSV.pixel(pos[0]))
      //   sv.my = sv.scale.y.invert(JSV.pixel(pos[1]))
      //   // console.log([sv.mx, sv.my]);
      //   sv.highlight.hover();
      //   sv.annotation.check_hover();
      // });

      // this.draw_test();
      this.draw();
    }

    // Static classs methods
    static get debug_sections() {
      return ['time', 'zoom'];
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

    set sequenceLength(bp) {
      if (bp) {
        this._sequenceLength = Number(bp);
        this.scale.bp = d3.scaleLinear()
          .domain([0, this._sequenceLength])
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

    draw_arc(start, end, radius, color = '#000000', width = 1) {
      var scale = this.scale;
      var ctx = this.ctx;
      this.ctx.beginPath();
      this.ctx.strokeStyle = color;
      // this.ctx.strokeStyle = 'rgba(0,0,200,0.5)'
      this.ctx.lineWidth = width;
      // this.ctx.arc(scale.x(0), scale.y(0), CGV.pixel(radius), scale.bp(start), scale.bp(end), false);
      this.ctx.arc(scale.x(0), scale.y(0), radius, scale.bp(start), scale.bp(end), false);
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

    draw(fast) {
      var start_time = new Date().getTime();
      this.clear();
      var backboneThickness = CGV.pixel(3);
      var radius = CGV.pixel(this.backboneRadius);
      // var radius = this.backboneRadius;
      var directRadius = radius + (backboneThickness / 2);
      var reverseRadius = radius - (backboneThickness / 2);
      var spacing = CGV.pixel(this.featureSlotSpacing);
      var minDimension = CGV.pixel(Math.min(this.height, this.width));
      var maxRadius = minDimension; // TODO: need to add up all proportions

      // Draw Backbone
      this.draw_arc(0, this.sequenceLength, radius, 'black', backboneThickness);

      var residualThickness = 0;
      this._featureSlots.forEach((slot) => {
        var thickness = CGV.pixel( Math.min(this.backboneRadius, maxRadius) * slot._proportionOfRadius);
        // var thickness = Math.min(this.backboneRadius, maxRadius) * slot._proportionOfRadius;
        if (slot.isDirect()) {
          directRadius += ( (thickness / 2) + spacing + residualThickness);
          radius = directRadius;
        } else {
          reverseRadius -= ( (thickness / 2) + spacing + residualThickness);
          radius = reverseRadius;
        }
        residualThickness = thickness / 2;
        if (fast && slot._features.length > 500) {
          this.draw_arc(0, this.sequenceLength, radius, 'rgba(0,0,200,0.1)', thickness);
        } else {
          slot._features.forEach((feature) => {
            feature._featureRanges.forEach((range) => {
              this.draw_arc(range._start, range._stop, radius, feature._color, thickness);
            });
            feature._featurePaths.forEach((path) => {
              path.draw(this.ctx, this.scale, radius, thickness);
            });
          });
        }

      });
      this.drawAxis(directRadius);
      this.drawAxis(reverseRadius - 50);
      if (this.debug) {
        this.debug.data.time['draw'] = CGV.elapsed_time(start_time);
        this.debug.draw(this.ctx);
      }
    }

    drawAxis(radius) {
      var scale = this.scale;
      var tickCount = 10;
      var tickWidth = CGV.pixel(1);
      var tickLength = CGV.pixel(5);
      scale.bp.ticks(tickCount).forEach((tick) => {
        this.radiantLine(tick, radius, tickLength, tickWidth);
      });

    }

    radiantLine(bp, radius, length, lineWidth = 1, color = 'black') {
      var radians = this.scale.bp(bp);
      var centerX = this.scale.x(0);
      var centerY = this.scale.y(0);
      var innerX = centerX + radius * Math.cos(radians);
      var innerY = centerY + radius * Math.sin(radians);
      var outerX = centerX + (radius + length) * Math.cos(radians);
      var outerY = centerY + (radius + length) * Math.sin(radians);
      var ctx = this.ctx;

      ctx.beginPath();
      ctx.moveTo(innerX,innerY);
      ctx.lineTo(outerX,outerY);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }

    addFeatureSlot(featureSlot) {
      // TODO: error check that this is a featureSlot
      this._featureSlots.push(featureSlot);
      featureSlot._viewer = this;
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
