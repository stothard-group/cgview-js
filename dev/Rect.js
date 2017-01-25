//////////////////////////////////////////////////////////////////////////////
// CGview Rect
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * A Rect consists of an x and y point (the upper-left corner) and
   * a width and height.
   */
  class Rect {

    /**
     * A Rect
     *
     * @param {Number} x - X coordinate of the Rect origin
     * @param {Number} y - Y coordinate of the Rect origin
     * @param {Number} width - Width of the rectangle
     * @param {Number} height - Height of the rectangle
     */
    constructor(x, y, width, height) {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
    }

    /**
     * @member {Number} - Get or set the width.
     */
    get width() {
      return this._width
    }

    set width(value) {
      this._width = value;
    }

    /**
     * @member {Number} - Get or set the height.
     */
    get height() {
      return this._height
    }

    set height(value) {
      this._height = value;
    }

    /**
     * @member {Number} - Get or set the x position of the origin.
     */
    get x() {
      return this._x
    }

    set x(value) {
      this._x = value;
    }

    /**
     * @member {Number} - Get or set the y position of the origin.
     */
    get y() {
      return this._y
    }

    set y(value) {
      this._y = value;
    }

    /**
     * @member {Number} - Get bottom of the Rect
     */
    get bottom() {
      return this.y + this.height;
    }

    /**
     * @member {Number} - Get top of the Rect. Same as Y.
     */
    get top() {
      return this.y;
    }

    /**
     * @member {Number} - Get left of the Rect. Same as X.
     */
    get left() {
      return this.x;
    }

    /**
     * @member {Number} - Get right of the Rect
     */
    get right() {
      return this.x + this.width;
    }

    /**
     * Check if any of the Rect overlaps with any Rects in the array.
     *
     * @param {Array} rectArray - Array of Rects
     * @return {Boolean}
     */
    overlap(rectArray) {
      // Gap between labels
      var widthGap = CGV.pixel(4);
      var r1 = this;
      var overlap = false;
      for (var i=0, len=rectArray.length; i < len; i++){
        var r2 = rectArray[i];
        if (r1.x <= r2.right && r2.x <= (r1.right + widthGap) && r1.y <= r2.bottom && r2.y <= r1.bottom) {
          overlap = true;
          break;
        }else{
          overlap = false;
        }
      }
      return overlap;
    }

    /**
     * Check if the Rect conains the point
     *
     * @param {Number} x - X coordinate of the point
     * @param {Number} y - Y coordinate of the point
     * @return {Boolean}
     */
    containsPt(x, y) {
      return ( x >= this.x && x <= (this.x + this.width) && y >= this.y && y <= (this.y + this.height) )
    }

  }

  CGV.Rect = Rect;

})(CGView);


