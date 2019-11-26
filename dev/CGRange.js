//////////////////////////////////////////////////////////////////////////////
// CGRange
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {
  /**
   * <br />
   * A CGRange contains a start, stop on a sequence contig.
   * Ranges are always in a clockise direction.
   * The start is always less than the stop position with following exception.
   * Since the genomes are circular, if the genome contains a single contig,
   * it's possibe for the range to loop around.
   */
  class CGRange {

    /**
     * Create a CGRange
     *
     * @param {Sequence} contig - The contig that contains the range. The contig provides the contig length
     * @param {Number} start - The start position.
     * @param {Number} stop - The stop position.
     */
    constructor(contig, start, stop) {
      this._contig = contig;
      this.start = start;
      this.stop = stop;
    }

    /**
     * @member {Sequence} - Get the sequence.
     */
    get contig() {
      return this._contig;
    }

    /**
     * @member {Sequence} - Get the sequence.
     */
    get sequence() {
      return this.contig.sequence;
    }

    /**
     * @member {Number} - Get the sequence length
     */
    get sequenceLength() {
      return this.sequence.length;
    }

    /**
     * @member {Number} - Get or set the range start.
     */
    get start() {
      return this._start;
    }

    set start(value) {
      this._start = Number(value);
    }

    /**
     * @member {Number} - Get or set the range stop.
     */
    get stop() {
      return this._stop;
    }

    set stop(value) {
      this._stop = Number(value);
    }

    /**
     * @member {Number} - Get or set the range start using the entire map coordinates.
     */
    get mapStart() {
      // return this._start;
      return this.start + this.contig.lengthOffset;
    }

    set mapStart(value) {
      // this._start = Number(value);
    }

    /**
     * @member {Number} - Get or set the range stop using the entire map coordinates.
     */
    get mapStop() {
      // return this._stop;
      return this.stop + this.contig.lengthOffset;
    }

    set mapStop(value) {
      // this._stop = Number(value);
    }

    get onMap() {
      return new CGV.CGRange(this.sequence.mapContig, this.mapStart, this.mapStop);
    }

    /**
     * @member {Number} - Get the length of the range.
     */
    get length() {
      if (this.stop >= this.start) {
        return this.stop - this.start + 1;
      } else {
        return this.contig.length + (this.stop - this.start) + 1;
      }
    }

    /**
     * @member {Number} - Get the middle of the range.
     */
    get middle() {
      const _middle = this.start + (this.length / 2);
      if (_middle > this.contig.length) {
        return (_middle - this.contig.length);
      } else {
        return _middle;
      }
    }

    /**
     * Return true if the range length is over half the length of the
     * sequence length
     * @return {Boolean}
     */
    overHalfMapLength() {
      return this.length > (this.sequence.length / 2);
    }

    // /**
    //  * Convert the *value* to be between the 1 and the sequence length.
    //  * Values bigger or smaller than the sequence length will be wrappeed around.
    //  * For example, if sequence length is 1000 and _value_ is 1200,
    //  * a value of 200 will be returned.
    //  * @param {Number} value - The number to normalize.
    //  * @return {Number}
    //  */
    // normalize(value) {
    //   let rotations;
    //   if (value > this.sequenceLength) {
    //     rotations = Math.floor(value / this.sequenceLength);
    //     return (value - (this.sequenceLength * rotations) );
    //   } else if (value < 1) {
    //     rotations = Math.ceil(Math.abs(value / this.sequenceLength));
    //     return (this.sequenceLength * rotations) + value;
    //   } else {
    //     return value;
    //   }
    // }
    //
    // /**
    //  * Return the *start* of the range plus the *value*.
    //  * @param {Number} - Number to add.
    //  * @return {Number}
    //  */
    // getStartPlus(value) {
    //   return this.normalize(this.start + value);
    // }
    //
    // /**
    //  * Return the *stop* of the range plus the *value*.
    //  * @param {Number} - Number to add.
    //  * @return {Number}
    //  */
    // getStopPlus(value) {
    //   return this.normalize(this.stop + value);
    // }

    /**
     * Return true if the range length is the same as the sequence length
     * @return {Boolean}
     */
    isMapLength() {
      return (this.length === this.sequence.length);
    }

    /**
     * Return true if the range spans the origin (ie. the stop is less than the start position)
     * @return {Boolean}
     */
    spansOrigin() {
      return (this.stop < this.start);
    }

    /**
     * Return true if the *position* in inside the range using map coordinates.
     * @param {Number} position - The position to check if it's in the range.
     * @return {Boolean}
     */
    contains(position) {
      if (this.stop >= this.start) {
        // Typical Range
        return (position >= this.mapStart && position <= this.mapStop);
      } else {
        // Range spans origin
        return (position >= this.mapStart || position <= this.mapStop);
      }
    }

    /**
     * Returns a copy of the Range.
     * @return {Range}
     */
    copy() {
      return new CGV.CGRange(this.contig, this.start, this.stop);
    }

    /**
     * Returns true if the range overlaps with *range2*.
     * @param {Range} range2 - The range with which to test overlap.
     * @return {Boolwan}
     */
    overlapsRange(range2) {
      // return (this.contains(range2.start) || this.contains(range2.stop) || range2.contains(this.start));
      return (this.contains(range2.start) || this.contains(range2.stop) || range2.contains(this.start));
    }

    /**
     * Merge the with the supplied range to give the biggest possible range.
     * This may produce unexpected results of the ranges do not overlap.
     * @param {Range} range2 - The range to merge with.
     * @return {Range}
     */
    mergeWithRange(range2) {
      // console.log('HERE')
      const range1 = this;
      const range3 = new CGV.CGRange(this.sequence, range1.start, range2.stop);
      const range4 = new CGV.CGRange(this.sequence, range2.start, range1.stop);
      const ranges = [range1, range2, range3, range4];
      let greatestLength = 0;
      let rangeLength, longestRange;
      for (let i = 0, len = ranges.length; i < len; i++) {
        rangeLength = ranges[i].length;
        if (rangeLength > greatestLength) {
          greatestLength = rangeLength;
          longestRange = ranges[i];
        }
      }
      return longestRange;
    }

  }

  CGV.CGRange = CGRange;
})(CGView);


