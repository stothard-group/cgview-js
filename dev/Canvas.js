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
    constructor(container, options = {}) {
      this.width = CGV.default_for(options.width, 600);
      this.height = CGV.default_for(options.height, 600);
      this.scale = {};

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

      // Set up scales
      this.scale.x = d3.scaleLinear()
        .domain([-this.width/2, this.width/2])
        .range([0, this.width]);
      this.scale.y = d3.scaleLinear()
        .domain([this.height/2, -this.height/2])
        .range([0, this.height]);
      // this.scale.bp = d3.scaleLinear()
      //   .domain([0, this.sequence_length])
      //   .range([-1/2*Math.PI, 3/2*Math.PI]);

    }


    get width() {
      return CGV.pixel(this._width)
    }

    get height() {
      return CGV.pixel(this._height)
    }

    set width(width) {
      this._width = width;
    }

    set height(height) {
      this._height = height;
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
      var x = this.width / 2
      var y = this.height / 2
      ctx.fillText(msg, x, y);
    }

    drawArc(start, end, radius, color = '#000000', width = 1) {
      var scale = this.scale;
      var ctx = this.ctx;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      // this.ctx.arc(scale.x(0), scale.y(0), CGV.pixel(radius), scale.bp(start), scale.bp(end), false);
      ctx.arc(scale.x(0), scale.y(0), radius, scale.bp(start), scale.bp(end), false);
      ctx.stroke();
    }

    radiantLine(bp, radius, length, lineWidth = 1, color = 'black') {
      var radians = this.scale.bp(bp);
      var centerX = this.scale.x(0);
      var centerY = this.scale.y(0);
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

    // lengthOfRange(start, stop) {
    // }

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

  }

  CGV.Canvas = Canvas;

})(CGView);
