//////////////////////////////////////////////////////////////////////////////
// CGview Rect
//////////////////////////////////////////////////////////////////////////////

/**
 * <br />
 * A Rect consists of an x and y point (the upper-left corner) and
 * a width and height.
 */
export default class Rect {

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
    return this._width;
  }

  set width(value) {
    this._width = value;
  }

  /**
   * @member {Number} - Get or set the height.
   */
  get height() {
    return this._height;
  }

  set height(value) {
    this._height = value;
  }

  /**
   * @member {Number} - Get or set the x position of the origin.
   */
  get x() {
    return this._x;
  }

  set x(value) {
    this._x = value;
  }

  /**
   * @member {Number} - Get or set the y position of the origin.
   */
  get y() {
    return this._y;
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
   * If there is an overlap the first overlapping Rect is returned.
   *
   * @param {Array} rectArray - Array of Rects
   * @return {Boolean}
   */
  overlap(rectArray) {
    // Gap between labels
    const widthGap = 4;
    const r1 = this;
    let overlap = false;
    for (let i = 0, len = rectArray.length; i < len; i++) {
      const r2 = rectArray[i];
      if (r1.x <= r2.right && r2.x <= (r1.right + widthGap) && r1.y <= r2.bottom && r2.y <= r1.bottom) {
        overlap = r2;
        break;
      } else {
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
    return ( x >= this.x && x <= (this.x + this.width) && y >= this.y && y <= (this.y + this.height) );
  }

  ptForClockPosition(clockPosition) {
    let x, y;
    switch (clockPosition) {
    case 1:
    case 2:
      x = this.x + this.width;
      y = this.y;
      break;
    case 3:
      x = this.x + this.width;
      y = this.y + (this.height / 2);
      break;
    case 4:
    case 5:
      x = this.x + this.width;
      y = this.y + this.height;
      break;
    case 6:
      x = this.x + (this.width / 2);
      y = this.y + this.height;
      break;
    case 7:
    case 8:
      x = this.x;
      y = this.y + this.height;
      break;
    case 9:
      x = this.x;
      y = this.y + (this.height / 2);
      break;
    case 10:
    case 11:
      x = this.x;
      y = this.y;
      break;
    case 12:
      x = this.x + (this.width / 2);
      y = this.y;
    }
    return {x: x, y: y};
  }

}


