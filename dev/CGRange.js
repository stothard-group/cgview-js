//////////////////////////////////////////////////////////////////////////////
// CGRange
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * A CGRange contains a start, stop and sequence length. Because the genomes
   * are circular the range start can be bigger than the start. This means the start
   * is before 0 and the stop is after 0.
   * Ranges are always in a clockise direction.
   */
  class CGRange {

    /**
     * Create a CGRange
     *
     * @param {Viewer} viewer - The viewer that contains the range. The viewer provided the sequence length
     * @param {Number} start - The start position.
     * @param {Number} stop - The stop position.
     */
    constructor(viewer, start, stop) {
      this._viewer = viewer;
      this.start = start;
      this.stop = stop;
    }

    /**
     * @member {Viewer} - Get the viewer.
     */
    get viewer() {
      return this._viewer
    }

    /**
     * @member {Number} - Get the sequence length
     */
    get sequenceLength() {
      return this.viewer.sequenceLength
    }

    /**
     * @member {Number} - Get or set the range start.
     */
    get start() {
      return this._start
    }

    set start(value) {
      this._start = value;
    }

    /**
     * @member {Number} - Get or set the range stop.
     */
    get stop() {
      return this._stop
    }

    set stop(value) {
      this._stop = value;
    }

    /**
     * @member {Number} - Get the length of the range.
     */
    get length() {
      if (this.stop >= this.start) {
        return this.stop - this.start
      } else {
        return this.sequenceLength + (this.stop - this.start)
      } 
    }

    /**
     * Return true if the range length is the same as the sequence length
     * @return {Boolean}
     */
    isFullCircle() {
      return (this.length == this.sequenceLength)
    }

    /**
     * Merge the with the supplied range to give the biggest possible range.
     * @param {Range} range2 - The range to merge with.
     * @return {Range}
     */
    mergeWithRange(range2) {
      var range1 = this;
      var range3 = new CGV.CGRange(this.viewer, range1.start, range2.stop);
      var range4 = new CGV.CGRange(this.viewer, range2.start, range1.stop);
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


