//////////////////////////////////////////////////////////////////////////////
// CGRange
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * <br />
   * A CGRange contains a start, stop and sequence length. Because the genomes
   * are circular the range start can be bigger than the start. This means the start
   * is before 0 and the stop is after 0.
   * Ranges are always in a clockise direction.
   */
  class CGRange {

    /**
     * Create a CGRange
     *
     * @param {Sequence} sequence - The sequence that contains the range. The sequence provides the sequence length
     * @param {Number} start - The start position.
     * @param {Number} stop - The stop position.
     */
    constructor(sequence, start, stop) {
      this._sequence = sequence;
      this.start = start;
      this.stop = stop;
    }

    /**
     * @member {Sequence} - Get the sequence.
     */
    get sequence() {
      return this._sequence
    }

    /**
     * @member {Number} - Get the sequence length
     */
    get sequenceLength() {
      return this.sequence.length
    }

    /**
     * @member {Number} - Get or set the range start.
     */
    get start() {
      return this._start
    }

    set start(value) {
      this._start = Number(value);
    }

    /**
     * @member {Number} - Get or set the range stop.
     */
    get stop() {
      return this._stop
    }

    set stop(value) {
      this._stop = Number(value);
    }

    /**
     * @member {Number} - Get the length of the range.
     */
    get length() {
      if (this.stop >= this.start) {
        return this.stop - this.start + 1
      } else {
        return this.sequenceLength + (this.stop - this.start) + 1
      } 
    }

    /**
     * @member {Number} - Get the middle of the range.
     */
    get middle() {
      var _middle = this.start + (this.length / 2);
      if (_middle > this.sequenceLength) {
        return (_middle - this.sequenceLength)
      } else {
        return _middle
      }
    }

    /**
     * Return true if the range length is over half the length of the
     * sequence length
     * @return {Boolean}
     */
    overHalfCircle() {
      return this.length > (this.sequenceLength / 2)
    }

    /**
     * Convert the *value* to be between the 1 and the sequence length.
     * @param {Number} value - The number to normalize.
     * @return {Number}
     */
    normalize(value) {
      var rotations;
      if (value > this.sequenceLength) {
        rotations = Math.floor(value / this.sequenceLength);
        return (value - (this.sequenceLength * rotations) )
      } else if (value < 1) {
        rotations = Math.ceil(Math.abs(value / this.sequenceLength));
        return (this.sequenceLength * rotations) + value
      } else {
        return value
      }
    }

    /**
     * Return the *start* of the range plus the *value*.
     * @param {Number} - Number to add.
     * @return {Number}
     */
     getStartPlus(value) {
       return this.normalize(this.start + value)
    }

    /**
     * Return the *stop* of the range plus the *value*.
     * @param {Number} - Number to add.
     * @return {Number}
     */
     getStopPlus(value) {
       return this.normalize(this.stop + value)
    }

    /**
     * Return true if the range length is the same as the sequence length
     * @return {Boolean}
     */
    isFullCircle() {
      return (this.length == this.sequenceLength)
    }

    /**
     * Return true if the range spans the origin (ie. the stop is less than the start position)
     * @return {Boolean}
     */
    spansOrigin() {
      return (this.stop < this.start)
    }

    /**
     * Return true if the *position* in inside the range.
     * @param {Number} position - The position to check if it's in the range.
     * @return {Boolean}
     */
    contains(position) {
      if (this.stop >= this.start) {
        // Typical Range
        return (position >= this.start && position <= this.stop)
      } else {
        // Range spans origin
        return (position >= this.start || position <= this.stop)
      }
    }

    /**
     * Returns a copy of the Range.
     * @return {Range}
     */
    copy() {
      return new CGV.CGRange(this.sequence, this.start, this.stop)
    }

    /**
     * Returns true if the range overlaps with *range2*.
     * @param {Range} range2 - The range with which to test overlap.
     * @return {Boolwan}
     */
    overlapsRange(range2) {
      return (this.contains(range2.start) || this.contains(range2.stop) || range2.contains(this.start))
    }

    /**
     * Merge the with the supplied range to give the biggest possible range.
     * This may produce unexpected results of the ranges do not overlap.
     * @param {Range} range2 - The range to merge with.
     * @return {Range}
     */
    mergeWithRange(range2) {
      var range1 = this;
      var range3 = new CGV.CGRange(this.sequence, range1.start, range2.stop);
      var range4 = new CGV.CGRange(this.sequence, range2.start, range1.stop);
      var ranges = [range1, range2, range3, range4];
      var greatestLength = 0;
      var rangeLength, longestRange;
      for (var i = 0, len = ranges.length; i < len; i++) {
        rangeLength = ranges[i].length;
        if (rangeLength > greatestLength) {
          greatestLength = rangeLength;
          longestRange = ranges[i];
        }
      }
      return longestRange
    }

  }

  CGV.CGRange = CGRange;

})(CGView);


