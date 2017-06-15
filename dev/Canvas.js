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
        ctx.fillStyle = this.viewer.settings.backgroundColor.rgbaString;
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
      var settings = this.viewer.settings;
      var shadowFraction = 0.10;
      var shadowColorDiff = 0.15;

      if (decoration == 'arc') {
        if (settings.showShading) {
          var shadowWidth = width * shadowFraction;
          // Main Arc
          var mainWidth = width - (2 * shadowWidth);
          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.lineWidth = mainWidth;
          this.arcPath(layer, radius, start, stop);
          ctx.stroke();

          var shadowRadiusDiff = (mainWidth / 2) + (shadowWidth / 2);
          ctx.lineWidth = shadowWidth;
          // Highlight
          ctx.beginPath();
          ctx.strokeStyle = new CGV.Color(color).lighten(shadowColorDiff).rgbaString;
          this.arcPath(layer, radius + shadowRadiusDiff, start, stop);
          ctx.stroke();

          // Shadow
          ctx.beginPath();
          ctx.strokeStyle = new CGV.Color(color).darken(shadowColorDiff).rgbaString;
          this.arcPath(layer, radius - shadowRadiusDiff, start, stop);
          ctx.stroke();

        } else {
          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.lineWidth = width;
          this.arcPath(layer, radius, start, stop);
          ctx.stroke();
        }
      }

      // Looks like we're drawing an arrow
      if (decoration != 'arc') {
        // Determine Arrowhead length
        // Using width which changes according zoom factor upto a point
        // var arrowHeadLengthPixels = width / 3;
        var arrowHeadLengthPixels = width * settings.arrowHeadLength;
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

        if (settings.showShading) {
          var halfMainWidth =  width * (0.5 - shadowFraction);
          var shadowPt = this.pointFor(arcStopBp, radius - halfMainWidth);

          // Main Arrow
          ctx.beginPath();
          ctx.fillStyle = color;
          this.arcPath(layer, radius + halfMainWidth, arcStartBp, arcStopBp, direction == -1);
          ctx.lineTo(arrowTipPt.x, arrowTipPt.y);
          ctx.lineTo(shadowPt.x, shadowPt.y);
          this.arcPath(layer, radius - halfMainWidth, arcStopBp, arcStartBp, direction == 1, 'noMoveTo');
          ctx.closePath();
          ctx.fill();

          // Highlight
          var highlightPt = this.pointFor(arcStopBp, radius + halfMainWidth);
          ctx.beginPath();
          ctx.fillStyle = new CGV.Color(color).lighten(shadowColorDiff).rgbaString;
          this.arcPath(layer, radius + halfWidth, arcStartBp, arcStopBp, direction == -1);
          ctx.lineTo(arrowTipPt.x, arrowTipPt.y);
          ctx.lineTo(highlightPt.x, highlightPt.y);
          this.arcPath(layer, radius + halfMainWidth, arcStopBp, arcStartBp, direction == 1, 'noMoveTo');
          ctx.closePath();
          ctx.fill();

          // Shadow
          ctx.beginPath();
          ctx.fillStyle = new CGV.Color(color).darken(shadowColorDiff).rgbaString;
          this.arcPath(layer, radius - halfWidth, arcStartBp, arcStopBp, direction == -1);
          ctx.lineTo(arrowTipPt.x, arrowTipPt.y);
          ctx.lineTo(shadowPt.x, shadowPt.y);
          this.arcPath(layer, radius - halfMainWidth, arcStopBp, arcStartBp, direction == 1, 'noMoveTo');
          ctx.closePath();
          ctx.fill();

        } else {
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

    radiantLine(layer, bp, radius, length, lineWidth = 1, color = 'black', cap = 'butt') {
      var innerPt = this.pointFor(bp, radius);
      var outerPt = this.pointFor(bp, radius + length);
      var ctx = this.context(layer);

      ctx.beginPath();
      ctx.moveTo(innerPt.x, innerPt.y);
      ctx.lineTo(outerPt.x, outerPt.y);
      ctx.strokeStyle = color;

      ctx.lineCap = cap;

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
