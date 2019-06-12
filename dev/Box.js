//////////////////////////////////////////////////////////////////////////////
// CGview Box
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {
  /**
   * <br />
   * A Box consists of an x and y point (the top-left corner) and
   * a width and height. 
   */
  class Box {

    /**
     * Create a Box
     *
     * @param {Viewer} viewer - The viewer this box will be associated with.
     * @param {Object} options - Options for creating the box.
     * @param {Object} width - Meta data...
     *
     * ### Options
     *
     * Name         | Type   | Description
     * -------------|--------|------------
     * width        | Number | Width of box (Default: 100)
     * height       | Number | Height of box (Default: 100)
     * padding      | Number | Sets paddedX and paddedY values (Default: 0)
     * position     | String|Object | Where to place the box. See position details below.
     * relativeTo   | String | Box position is relative to 'canvas' or 'map' [Default: 'canvas']
     * color        | String|Color | A string describing the color. See {@link Color} for details.
     *
     * @param {String|Object} position - A string or object describing the position.
     *   This value depends on the relativeTo parameter.
     *
     *   If relativeTo is 'canvas', the box will be in a static position on the Canvas
     *   and will not move as the map is panned. String values (e.g. top-right, bottom-middle, etc)
     *   position the box appropriately. An object with xOffset and yOffset values between
     *   0 and 100 will position the box along the x and y axes starting from the top-left.
     *   The string values are associated with specific offsets. For example,
     *   top-left = {xOffset: 0, yOffset: 0}
     *   middle-center = {xOffset: 50, yOffset: 50}
     *   bottom-right = {xOffset: 100, yOffset: 100}
     *
     *   If relativeTo is 'map', the box will move with the map as it's panned.
     *   The position  will consist of
     *     - bp
     *     - bbOffset: distance from the backbone
     *     - anchor: where the point on the box is anchored
     *   String values (e.g. top-right, bottom-middle, etc) for the position are
     *   a special case that automatically set the bp, bbOffset, anchor values so
     *   the box will appear in the same location as if the relativeTo is set to canvas
     *   and the map zoomFactor is 1x.
     *
     *   const box = new Box(width, height, position='middle-center', relativeTo: 'canvas')
     *   const box = new Box(viewer, options, meta))
     *
     */
    constructor(viewer, options = {}, meta = {}) {
      this._viewer = viewer;
      this._width = CGV.defaultFor(options.width, 100);
      this._height = CGV.defaultFor(options.height, 100);
      this.relativeTo = CGV.defaultFor(options.relativeTo, 'canvas');
      this.position = CGV.defaultFor(options.position, 'middle-center');
      this.color = CGV.defaultFor(options.color, 'white');
      this.padding = CGV.defaultFor(options.padding, 0);
    }

    /**
     * Return the class name as a string.
     * @return {String} - 'Box'
     */
    toString() {
      return 'Box';
    }

    get viewer() {
      return this._viewer;
    }

    get canvas() {
      return this.viewer.canvas;
    }

    /**
     * FIXME: standarize the strings
     * @member {String} - Get or set the postion. String values include: "top-left", "top-center", "top-right", "middle-left", "middle-center", "middle-right", "bottom-left", "bottom-center", or "bottom-right".
     */
    get position() {
      return this._position;
    }

    // relativeTo: canvas
    //   value = 'top-right'
    //   value = {xOffset: 100, yOffset: 0}
    // relativeTo: map
    //   value = 'top-right'
    //   value = {bp: 1000, bbOffset: 200, anchor: ??}
    set position(value) {
      this._position = value;
      this.refresh();
    }


    /**
     * @member {Number} - Get or set the width.
     */
    get width() {
      return this._width;
    }

    set width(value) {
      this._width = value;
      this.refresh();
    }

    /**
     * @member {Number} - Get or set the height.
     */
    get height() {
      return this._height;
    }

    set height(value) {
      this._height = value;
      this.refresh();
    }

    /**
     * @member {Number} - Get the x position of the origin.
     */
    get x() {
      return this._x;
    }

    /**
     * @member {Number} - Get the y position of the origin.
     */
    get y() {
      return this._y;
    }

    /**
     * @member {Number} - Get or set the padding. This will be added to x and y when accessed via paddedX and paddedY.
     */
    get padding() {
      return this._padding;
    }

    set padding(value) {
      this._padding = value;
    }

    /**
     * @member {Number} - Get the x position of the origin plus padding.
     */
    get paddedX() {
      return this.x + this.padding;
    }

    /**
     * @member {Number} - Get the y position of the origin plus padding.
     */
    get paddedY() {
      return this.y + this.padding;
    }

    /**
     * @member {Number} - Get bottom of the Box
     */
    get bottom() {
      return this.y + this.height;
    }

    /**
     * @member {Number} - Get bottom of the Box minus padding
     */
    get bottomPadded() {
      return this.bottom - this.padding;
    }

    /**
     * @member {Number} - Get top of the Box. Same as Y.
     */
    get top() {
      return this.y;
    }

    /**
     * @member {Number} - Get top of the Box plus padding.
     */
    get topPadded() {
      return this.top + this.padding;
    }

    /**
     * @member {Number} - Get left of the Box. Same as X.
     */
    get left() {
      return this.x;
    }

    /**
     * @member {Number} - Get left of the Box plus padding.
     */
    get leftPadded() {
      return this.left + this.padding;
    }

    /**
     * @member {Number} - Get right of the Box.
     */
    get right() {
      return this.x + this.width;
    }

    /**
     * @member {Number} - Get right of the Box minus padding.
     */
    get rightPadded() {
      return this.right - this.padding;
    }

    /**
     * @member {Number} - Get the center x of the box.
     */
    get centerX() {
      return this.x + (this.width / 2);
    }

    /**
     * @member {Number} - Get the center y of the box.
     */
    get centerY() {
      return this.y + (this.height / 2);
    }

    resize(width, height) {
      this._width = width;
      this._height = height;
      this.refresh();
    }

    /**
     * Check if the Box conains the point
     *
     * @param {Number} x - X coordinate of the point
     * @param {Number} y - Y coordinate of the point
     * @return {Boolean}
     */
    containsPt(x, y) {
      return ( x >= this.x && x <= (this.x + this.width) && y >= this.y && y <= (this.y + this.height) );
    }

    originForPosition(position) {
      if (this.relativeTo === 'map') {
        return this._originForPositionRelativeToMap(position);
      } else if (this.relativeTo === 'canvas') {
        return this._originForPositionRelativeToCanvas(position);
      }
    }

    _originForPositionRelativeToMap(position) {
      if (typeof position === 'string') {
        return this._originOnMapFromString(position);
      } else {
        return this._originOnMapFromObject(position);
      }
    }

    _originForPositionRelativeToCanvas(position) {
      if (typeof position === 'string') {
        return this._originOnCanvasFromString(position);
      } else {
        return this._originOnCanvasFromObject(position);
      }
    }

    _originOnCanvasFromString(position) {
      const margin = 0;
      const canvasWidth = this.canvas.width;
      const canvasHeight = this.canvas.height;
      const boxWidth = this.width;
      const boxHeight = this.height;
      let x, y;

      //FIXME: will be changed in BUILDER
      position = position.replace('upper', 'top');
      position = position.replace('lower', 'bottom');

      if (position === 'top-left') {
        x = margin;
        y = margin;
      } else if (position === 'top-center') {
        x = (canvasWidth / 2) - (boxWidth / 2);
        y = margin;
      } else if (position === 'top-right') {
        x = canvasWidth - boxWidth - margin;
        y = margin;
      } else if (position === 'middle-left') {
        x = margin;
        y = (canvasHeight / 2) - (boxHeight / 2);
      } else if (position === 'middle-center') {
        x = (canvasWidth / 2) - (boxWidth / 2);
        y = (canvasHeight / 2) - (boxHeight / 2);
      } else if (position === 'middle-right') {
        x = canvasWidth - boxWidth - margin;
        y = (canvasHeight / 2) - (boxHeight / 2);
      } else if (position === 'bottom-left') {
        x = margin;
        y = canvasHeight - boxHeight - margin;
      } else if (position === 'bottom-center') {
        x = (canvasWidth / 2) - (boxWidth / 2);
        y = canvasHeight - boxHeight - margin;
      } else if (position === 'bottom-right') {
        x = canvasWidth - boxWidth - margin;
        y = canvasHeight - boxHeight - margin;
      }
      return {x, y};
    }

    _originOnCanvasFromObject(position) {
      const xOffset = position.xOffset;
      const yOffset = position.yOffset;

      // boxX and boxY are the weighted point on the box dependent on the offsets
      // e.g. 0 xOffset would be 0% box width
      // e.g. 50 xOffset would be 50% box width
      // e.g. 100 xOffset would be 100% box width
      const boxX = this.width * xOffset / 100;
      const boxY = this.height * yOffset / 100;

      const canvasX = this.canvas.width * xOffset / 100;
      const canvasY = this.canvas.height * yOffset / 100;

      const x = canvasX - boxX;
      const y = canvasY - boxY;

      return {x, y};
    }

    _originOnMapFromString(position) {
      // const margin = 0;
      // const canvasWidth = this.canvas.width;
      // const canvasHeight = this.canvas.height;
      // const boxWidth = this.width;
      // const boxHeight = this.height;
      // let x, y;
      //
      // //FIXME: will be changed in BUILDER
      // position = position.replace('upper', 'top');
      // position = position.replace('lower', 'bottom');
      //
      // if (position === 'top-left') {
      //   x = margin;
      //   y = margin;
      // } else if (position === 'top-center') {
      //   x = (canvasWidth / 2) - (boxWidth / 2);
      //   y = margin;
      // } else if (position === 'top-right') {
      //   x = canvasWidth - boxWidth - margin;
      //   y = margin;
      // } else if (position === 'middle-left') {
      //   x = margin;
      //   y = (canvasHeight / 2) - (boxHeight / 2);
      // } else if (position === 'middle-center') {
      //   x = (canvasWidth / 2) - (boxWidth / 2);
      //   y = (canvasHeight / 2) - (boxHeight / 2);
      // } else if (position === 'middle-right') {
      //   x = canvasWidth - boxWidth - margin;
      //   y = (canvasHeight / 2) - (boxHeight / 2);
      // } else if (position === 'bottom-left') {
      //   x = margin;
      //   y = canvasHeight - boxHeight - margin;
      // } else if (position === 'bottom-center') {
      //   x = (canvasWidth / 2) - (boxWidth / 2);
      //   y = canvasHeight - boxHeight - margin;
      // } else if (position === 'bottom-right') {
      //   x = canvasWidth - boxWidth - margin;
      //   y = canvasHeight - boxHeight - margin;
      // }
      // return {x, y};
    }

    // bp, bbOffset, anchor
    _originOnMapFromObject(position) {
      const bp = position.bp;
      const bbOffset = position.bbOffset;

      const centerOffset = bbOffset + this.viewer.backbone.adjustedCenterOffset;

      const point = this.canvas.pointForBp(bp, centerOffset);

      // // boxX and boxY are the weighted point on the box dependent on the offsets
      // // e.g. 0 xOffset would be 0% box width
      // // e.g. 50 xOffset would be 50% box width
      // // e.g. 100 xOffset would be 100% box width
      // const boxX = this.width * xOffset / 100;
      // const boxY = this.height * yOffset / 100;
      //
      // const canvasX = this.canvas.width * xOffset / 100;
      // const canvasY = this.canvas.height * yOffset / 100;
      //
      // const x = canvasX - boxX;
      // const y = canvasY - boxY;
      // return {x, y};

      return point;
    }

    refresh() {
      const origin = this.originForPosition(this.position);
      this._x = origin.x;
      this._y = origin.y;
    }


    clear(ctx) {
      // Added margin of 1 to remove thin lines of previous background that were not being removed
      ctx.clearRect(this.x - 1, this.y - 1, this.width + 2, this.height + 2);
    }

  }

  CGV.Box = Box;
})(CGView);


