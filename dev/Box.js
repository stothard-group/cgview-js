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

      // this.x = x;
      // this.y = y;
      // this.width = width;
      // this.height = height;
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
      const origin = this.originForPosition(value);
      console.log(origin)
      this._x = origin.x;
      this._y = origin.y;

      // this.refresh();
    }

    originForPosition(position) {
      if (this.relativeTo === 'map') {
        return this._originForPositionRelativeToMap(position);
      } else if (this.relativeTo === 'canvas') {
        return this._originForPositionRelativeToCanvas(position);
      }
    }

    _originForPositionRelativeToMap(position) {
    }

    _originForPositionRelativeToCanvas(position) {
      if (typeof position === 'string') {
        return this._originOnCanvasFromString(position);
      } else {
        return this._originOnCanvasFromObject(position);
      }
    }


    /**
     * @member {Number} - Get or set the width.
     */
    get width() {
      return this._width;
    }

    set width(value) {
      // FIXME: refresh position
      this._width = value;
    }

    /**
     * @member {Number} - Get or set the height.
     */
    get height() {
      return this._height;
    }

    set height(value) {
      // FIXME: refresh position
      this._height = value;
    }

    /**
     * @member {Number} - Get the x position of the origin.
     */
    get x() {
      return this._x;
    }

    // set x(value) {
    //   this._x = value;
    // }

    /**
     * @member {Number} - Get the y position of the origin.
     */
    get y() {
      return this._y;
    }

    // set y(value) {
    //   this._y = value;
    // }

    /**
     * @member {Number} - Get bottom of the Box
     */
    get bottom() {
      return this.y + this.height;
    }

    /**
     * @member {Number} - Get top of the Box. Same as Y.
     */
    get top() {
      return this.y;
    }

    /**
     * @member {Number} - Get left of the Box. Same as X.
     */
    get left() {
      return this.x;
    }

    /**
     * @member {Number} - Get right of the Box
     */
    get right() {
      return this.x + this.width;
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

    _originOnCanvasFromString(position) {
      const margin = 0;
      const canvasWidth = this.canvas.width;
      const canvasHeight = this.canvas.height;
      const boxWidth = this.width;
      const boxHeight = this.height;
      let x, y;

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
      console.log('her')
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

  }

  CGV.Box = Box;
})(CGView);


