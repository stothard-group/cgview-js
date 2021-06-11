//////////////////////////////////////////////////////////////////////////////
// Canvas
//////////////////////////////////////////////////////////////////////////////

import Color from './Color';
import utils from './Utils';
import * as d3 from 'd3';

class Canvas {

  /**
   * - Adds several layers (canvases) for drawing
   * - Contains the x, y, bp scales
   * - has methods for for determining visible regions of the circle at a particular centerOffset
   * - TODO: Have image describing the circle (center at 0,0) and how it relates to the canvas
   *
   * Layers:
   *  - background: for drawing behind the map
   *  - map: main layer, where the map is drawn
   *  - forground: for drawing in front of the map (e.g. map based captions)
   *  - canvas: layer for traning static components (e.g. canvas based captions and legend)
   *  - debug: layer to draw debug information
   *  - ui: layer for captuing interactions
   *
   */
  constructor(viewer, container, options = {}) {
    this._viewer = viewer;
    this.width = utils.defaultFor(options.width, 600);
    this.height = utils.defaultFor(options.height, 600);

    // Create layers
    this.determinePixelRatio(container);
    this._layerNames = ['background', 'map', 'foreground', 'canvas', 'debug', 'ui'];
    this._layers = this.createLayers(container, this._layerNames, this._width, this._height);
  }

  get pixelRatio() {
    return this._pixelRatio;
  }

  determinePixelRatio(container) {
    const testNode = container.append('canvas')
      .style('position',  'absolute')
      .style('top',  0)
      .style('left',  0)
      .attr('width', this._width)
      .attr('height', this._height).node();
    // Check for canvas support
    if (testNode.getContext) {
      // Get pixel ratio and upscale canvas depending on screen resolution
      // http://www.html5rocks.com/en/tutorials/canvas/hidpi/
      this._pixelRatio = utils.getPixelRatio(testNode);
    } else {
      container.html('<h3>CGView requires Canvas, which is not supported by this browser.</h3>');
    }
    d3.select(testNode).remove();
  }

  createLayers(container, layerNames, width, height, scaleLayers = true) {
    const layers = {};

    for (let i = 0, len = layerNames.length; i < len; i++) {
      const layerName = layerNames[i];
      const zIndex = (i + 1) * 10;
      const node = container.append('canvas')
        .classed('cgv-layer', true)
        .classed(`cgv-layer-${layerName}`, true)
        .style('z-index',  zIndex)
        .attr('width', width)
        .attr('height', height).node();

      if (scaleLayers) {
        utils.scaleResolution(node, this.pixelRatio);
      }

      // Set viewer context
      const ctx = node.getContext('2d');

      // Consider this to help make linear horizontal lines cleaner
      // ctx.translate(0.5, 0.5);

      layers[layerName] = { ctx: ctx, node: node };
    }
    return layers;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    for (const layerName of this.layerNames) {
      const layerNode = this.layers(layerName).node;
      // Note, here the width/height will take into account the pixelRatio
      layerNode.width = this.width;
      layerNode.height = this.height;
      // Note, here the width/height will be the same as viewer (no pixel ratio)
      layerNode.style.width = `${width}px`;
      layerNode.style.height = `${height}px`;

      utils.scaleResolution(layerNode, this.pixelRatio);
    }
    this.layout.updateScales();
  }

  /**
   * @member {Viewer} - Get the viewer.
   */
  get viewer() {
    return this._viewer;
  }

  /**
   * @member {Layout} - Get the layout.
   */
  get layout() {
    return this.viewer.layout;
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
  // get scale() {
  //   return this._scale;
  //   // return this.layout.scale;
  // }

  /**
   * @member {Array} - Get the names of the layers.
   */
  get layerNames() {
    return this._layerNames;
  }

  /**
   * @member {Sequence} - Get the sequence.
   */
  get sequence() {
    return this.viewer.sequence;
  }

  get width() {
    return this._width;
  }

  set width(width) {
    this._width = width;
  }

  get height() {
    return this._height;
  }

  set height(height) {
    this._height = height;
  }

  get cursor() {
    return d3.select(this.node('ui')).style('cursor');
  }

  set cursor(value) {
    d3.select(this.node('ui')).style('cursor', value);
  }

  /**
   * Clear the viewer canvas
   */
  clear(layerName = 'map') {
    if (layerName === 'all') {
      for (let i = 0, len = this.layerNames.length; i < len; i++) {
        this.clear(this.layerNames[i]);
      }
    } else if (layerName === 'background') {
      const ctx = this.context('background');
      // ctx.clearRect(0, 0, CGV.pixel(this.width), CGV.pixel(this.height));
      ctx.clearRect(0, 0, this.width, this.height);
      ctx.fillStyle = this.viewer.settings.backgroundColor.rgbaString;
      // ctx.fillRect(0, 0, CGV.pixel(this.width), CGV.pixel(this.height));
      ctx.fillRect(0, 0, this.width, this.height);
    } else {
      // this.context(layerName).clearRect(0, 0, CGV.pixel(this.width), CGV.pixel(this.height));
      this.context(layerName).clearRect(0, 0, this.width, this.height);
    }
  }

  // Decoration: arc, clockwise-arrow, counterclockwise-arrow, none
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
  // So when the zoomFactor is large, switch to drawing lines (path handles this).
  drawElement(layer, start, stop, centerOffset, color = '#000000', width = 1, decoration = 'arc', showShading) {
    if (decoration === 'none') { return; }
    const ctx = this.context(layer);
    const settings = this.viewer.settings;
    const shadowFraction = 0.10;
    const shadowColorDiff = 0.15;
    ctx.lineCap = 'butt';
    // ctx.lineJoin = 'round';
    showShading = (showShading === undefined) ? settings.showShading : showShading;


    if (decoration === 'arc') {
      if (showShading) {
        const shadowWidth = width * shadowFraction;
        // Main Arc
        const mainWidth = width - (2 * shadowWidth);
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = mainWidth;
        this.path(layer, centerOffset, start, stop);
        ctx.stroke();

        const shadowOffsetDiff = (mainWidth / 2) + (shadowWidth / 2);
        ctx.lineWidth = shadowWidth;
        // Highlight
        ctx.beginPath();
        ctx.strokeStyle = new Color(color).lighten(shadowColorDiff).rgbaString;
        this.path(layer, centerOffset + shadowOffsetDiff, start, stop);
        ctx.stroke();

        // Shadow
        ctx.beginPath();
        ctx.strokeStyle = new Color(color).darken(shadowColorDiff).rgbaString;
        this.path(layer, centerOffset - shadowOffsetDiff, start, stop);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        this.path(layer, centerOffset, start, stop);
        ctx.stroke();
      }
    }

    // Looks like we're drawing an arrow
    if (decoration === 'clockwise-arrow' || decoration === 'counterclockwise-arrow') {
      // Determine Arrowhead length
      // Using width which changes according zoom factor upto a point
      const arrowHeadLengthPixels = width * settings.arrowHeadLength;
      const arrowHeadLengthBp = arrowHeadLengthPixels / this.pixelsPerBp(centerOffset);

      // If arrow head length is longer than feature length, adjust start and stop
      const featureLength = this.sequence.lengthOfRange(start, stop);
      if ( featureLength < arrowHeadLengthBp ) {
        const middleBP = start + ( featureLength / 2 );
        start = middleBP - (arrowHeadLengthBp / 2);
        stop = middleBP + (arrowHeadLengthBp / 2);
      }

      // Set up drawing direction
      const arcStartBp = (decoration === 'clockwise-arrow') ? start : stop;
      const arrowTipBp = (decoration === 'clockwise-arrow') ? stop : start;
      const direction = (decoration === 'clockwise-arrow') ? 1 : -1;

      // Calculate important points
      const halfWidth = width / 2;
      const arcStopBp = arrowTipBp - (direction * arrowHeadLengthBp);
      const arrowTipPt = this.pointForBp(arrowTipBp, centerOffset);
      const innerArcStartPt = this.pointForBp(arcStopBp, centerOffset - halfWidth);

      if (showShading) {
        const halfMainWidth =  width * (0.5 - shadowFraction);
        const shadowPt = this.pointForBp(arcStopBp, centerOffset - halfMainWidth);

        // Main Arrow
        ctx.beginPath();
        ctx.fillStyle = color;
        this.path(layer, centerOffset + halfMainWidth, arcStartBp, arcStopBp, direction === -1);
        ctx.lineTo(arrowTipPt.x, arrowTipPt.y);
        ctx.lineTo(shadowPt.x, shadowPt.y);
        this.path(layer, centerOffset - halfMainWidth, arcStopBp, arcStartBp, direction === 1, 'noMoveTo');
        ctx.closePath();
        ctx.fill();

        // Highlight
        const highlightPt = this.pointForBp(arcStopBp, centerOffset + halfMainWidth);
        ctx.beginPath();
        ctx.fillStyle = new Color(color).lighten(shadowColorDiff).rgbaString;
        this.path(layer, centerOffset + halfWidth, arcStartBp, arcStopBp, direction === -1);
        ctx.lineTo(arrowTipPt.x, arrowTipPt.y);
        ctx.lineTo(highlightPt.x, highlightPt.y);
        this.path(layer, centerOffset + halfMainWidth, arcStopBp, arcStartBp, direction === 1, 'noMoveTo');
        ctx.closePath();
        ctx.fill();

        // Shadow
        ctx.beginPath();
        ctx.fillStyle = new Color(color).darken(shadowColorDiff).rgbaString;
        this.path(layer, centerOffset - halfWidth, arcStartBp, arcStopBp, direction === -1);
        ctx.lineTo(arrowTipPt.x, arrowTipPt.y);
        ctx.lineTo(shadowPt.x, shadowPt.y);
        this.path(layer, centerOffset - halfMainWidth, arcStopBp, arcStartBp, direction === 1, 'noMoveTo');
        ctx.closePath();
        ctx.fill();
      } else {
        // Draw arc with arrow head
        ctx.beginPath();
        ctx.fillStyle = color;
        this.path(layer, centerOffset + halfWidth, arcStartBp, arcStopBp, direction === -1);
        ctx.lineTo(arrowTipPt.x, arrowTipPt.y);
        ctx.lineTo(innerArcStartPt.x, innerArcStartPt.y);
        this.path(layer, centerOffset - halfWidth, arcStopBp, arcStartBp, direction === 1, 'noMoveTo');
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  /**
   * The method add an arc to the path. However, if the zoomFactor is very large,
   * the arc is added as a straight line.
   */
  // FIXME: try calling layout.path with object parameters and compare speed
  // e.g. path({layer: 'map', offset = radius, etc})
  path(layer, centerOffset, startBp, stopBp, anticlockwise = false, startType = 'moveTo') {
    this.layout.path(layer, centerOffset, startBp, stopBp, anticlockwise, startType);
  }

  radiantLine(layer, bp, centerOffset, length, lineWidth = 1, color = 'black', cap = 'butt') {
    const innerPt = this.pointForBp(bp, centerOffset);
    const outerPt = this.pointForBp(bp, centerOffset + length);
    const ctx = this.context(layer);

    ctx.beginPath();
    ctx.moveTo(innerPt.x, innerPt.y);
    ctx.lineTo(outerPt.x, outerPt.y);
    ctx.strokeStyle = color;

    ctx.lineCap = cap;

    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }


  pointForBp(bp, centerOffset) {
    return this.layout.pointForBp(bp, centerOffset);
  }

  // Return the bp for the mouse position on the canvas
  bpForMouse() {
    const pos = d3.mouse(this.node('ui'));
    return this.bpForPoint({x: pos[0], y: pos[1]});
  }

  // Return the bp for the center of the canvas.
  bpForCanvasCenter() {
    return this.bpForPoint({x: this.width / 2, y: this.height / 2});
  }

  // FIXME: this should be removed and everywhere should call layout method
  bpForPoint(point) {
    return this.layout.bpForPoint(point);
  }


  // TODO if undefined, see if centerOffset is visible
  visibleRangeForCenterOffset(centerOffset, margin = 0) {
    return this.layout.visibleRangeForCenterOffset(centerOffset, margin);
  }

  pixelsPerBp(centerOffset = this.viewer.backbone.adjustedCenterOffset) {
    return this.layout.pixelsPerBp(centerOffset);
  }

  /**
   * Return the layer with the specified name (defaults to map layer)
   */
  layers(layer) {
    if (this._layerNames.includes(layer)) {
      return this._layers[layer];
    } else {
      console.error('Returning map layer by default');
      return this._layers.map;
    }
  }

  /**
   * Return the context for the specified layer (defaults to map layer)
   */
  context(layer) {
    if (this._layerNames.includes(layer)) {
      return this.layers(layer).ctx;
    } else {
      console.error('Returning map layer by default');
      return this.layers('map').ctx;
    }
  }

  /**
   * Return the node for the specified layer (defaults to map layer)
   */
  node(layer) {
    if (this._layerNames.includes(layer)) {
      return this.layers(layer).node;
    } else {
      console.error('Returning map layer by default');
      return this.layers('map').node;
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

export default Canvas;


