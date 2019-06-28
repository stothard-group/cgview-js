//////////////////////////////////////////////////////////////////////////////
// CGView Anchor
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {
  /**
   * <br />
   * A Anchor is simply a point on a box/rect that can be described in words ('top-left')
   * or as x/y percents where 0 is the top/left and 100 is the bottom/right.
   * Anchors are typically used to describe the focal point on a box or where to
   * draw an attachemnt line.
   */
  class Anchor {

    /**
     * Creating an Anchor. The default value for Anchor will be 'top-left' ({xPercent: 0, yPercent: 0}).
     *
     * @param {String|Object} value - A string describing the position or
     *   an object with 2 properties: xPercent, yPercent.
     *   The percent values should be between 0 (top/left) and 100 (bottom/right).
     *   Percents below 0 will become 0 and values abouve 100 will become 100.
     *   The following tables show the possible string values and their corresponding
     *   x/y Percents.
     *
     *   String           | xPercent | yPercent
     *   -----------------|----------|---------
     *   top-left         | 0        | 0
     *   top-center       | 50       | 0
     *   top-right        | 100      | 0
     *   middle-left      | 0        | 50
     *   middle-center    | 50       | 50
     *   middle-right     | 100      | 50
     *   bottom-left      | 0        | 100
     *   bottom-center    | 50       | 100
     *   bottom-right     | 100      | 100
     */
    constructor(value) {
      if (typeof value === 'string') {
        this.name = value;
      } else if (typeof value === 'object') {
        this.xPercent = Number(value.xPercent) || 50;
        this.yPercent = Number(value.yPercent) || 50;
      } else {
        this.xPercent = 50;
        this.yPercent = 50;
      }
    }

    /**
     * Return the class name as a string.
     * @return {String} - 'Anchor'
     */
    toString() {
      return 'Anchor';
    }

    //////////////////////////////////////////////////////////////////////////
    // MEMBERS
    //////////////////////////////////////////////////////////////////////////

    /**
     * @member {Number} - Get or set the xPercent. The value will be constrained between 0 and 100.
     */
    get xPercent() {
      return this._xPercent;
    }

    set xPercent(value) {
      this._xPercent = CGV.constrain(value, 0, 100);
      // this._name = this._nameFromPercents();
      this._name = CGV.Position.nameFromPercents();
    }

    /**
     * @member {Number} - Get or set the yPercent. The value will be constrained between 0 and 100.
     */
    get yPercent() {
      return this._yPercent;
    }

    set yPercent(value) {
      this._yPercent = CGV.constrain(value, 0, 100);
      // this._name = this._nameFromPercents();
      this._name = CGV.Position.nameFromPercents();
    }

    /**
     * @member {String} - Get or set the anchor name. If a string can not
     * describe the anchor, _undefined_ will be returned.
     */
    get name() {
      // return this._nameFromPercents();
      return this._name;
    }

    set name(value) {
      if (value && CGV.validate(value, CGV.Position.names)) {
        this._name = value;
        this._updatePercentsFromName(value);
      }
    }

    // Should only be called from set name so the string is validated first.
    _updatePercentsFromName(name) {
      const { xPercent, yPercent } = CGV.Position.percentsFromName(name);

      this.xPercent = xPercent;
      this.yPercent = yPercent;
    }

    toJSON() {
      if (this.name) {
        return this.name;
      } else {
        return {
          xPercent: this.xPercent,
          yPercent: this.yPercent
        };
      }
    }

  }

  CGV.Anchor = Anchor;
})(CGView);


