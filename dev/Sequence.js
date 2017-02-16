//////////////////////////////////////////////////////////////////////////////
// Sequence
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * The CGView Sequence class hold the sequence of the map or is able to access
   * it via an API.
   */
  class Sequence {

    /**
     * Create a Sequence
     *
     * @param {Viewer} viewer - The viewer that contains the backbone
     * @param {Object} options - Options and stuff [MUST PROVIDE SEQUENCE OR LENGTH]
     */
    constructor(viewer, options = {}) {
      this._viewer = viewer;
      this.color = CGV.defaultFor(options.color, 'black');
      this.font = CGV.defaultFor(options.font, 'sans-serif, plain, 14');
      this.seq = options.seq;
      if (!this.seq) {
        this.length = options.length;
      }
      if (!this.length) {
        this.length = 1000;
        // throw('Sequence invalid. The seq or length must be provided.')
      }
    }

    //////////////////////////////////////////////////////////////////////////
    // STATIC CLASSS METHODS
    //////////////////////////////////////////////////////////////////////////
    // TODO: Take into account lower case letters
    static complement(seq) {
      var compSeq = ''
      var char, compChar;
      for (var i = 0, len = seq.length; i < len; i++) {
        char = seq.charAt(i);
        switch (char) {
          case 'A':
            compChar = 'T';
            break;
          case 'T':
            compChar = 'A';
            break;
          case 'G':
            compChar = 'C';
            break;
          case 'C':
            compChar = 'G';
        }
        compSeq = compSeq + compChar;
      }
      return compSeq
    }

    static calcGCContent(seq) {
      if (seq.length == 0) { return  0.5 }
      var g = CGV.Sequence.count(seq, 'g');
      var c = CGV.Sequence.count(seq, 'c');
      return ( (g + c) / seq.length )
    }

    static calcGCSkew(seq) {
      var g = CGV.Sequence.count(seq, 'g');
      var c = CGV.Sequence.count(seq, 'c');
      if ( (g + c) == 0 ) { return 0.5 }
      // Gives value between -1 and 1
      var value = (g - c) / (g + c);
      // Scale to a value between 0 and 1
      return  0.5 + (value / 2);
    }

    static reverseComplement(seq) {
      return Sequence.complement( seq.split('').reverse().join('') );
    }

    static count(seq, pattern) {
      return (seq.match(new RegExp(pattern, 'gi')) || []).length
    }

    reverseComplement() {
      return Sequence.reverseComplement(this.seq)
    }

    count(pattern) {
      return Sequence.count(this.seq, pattern)
    }

    //////////////////////////////////////////////////////////////////////////
    // MEMBERS
    //////////////////////////////////////////////////////////////////////////

    /**
     * @member {Viewer} - Get the viewer.
     */

    get viewer() {
      return this._viewer
    }

    /**
     * @member {Canvas} - Get the canvas.
     */
    get canvas() {
      return this.viewer.canvas
    }

    /**
     * @member {String} - Get or set the seqeunce.
     */
    get seq() {
      return this._seq
    }

    set seq(value) {
      this._seq = value;
      if (this._seq) {
        this._seq = this._seq.toUpperCase();
        this._length = value.length;
        this._updateScale();
        this._sequenceExtractor = new CGV.SequenceExtractor(this);
      } else {
        this._sequenceExtractor = undefined;
      }
    }

    /**
     * @member {Number} - Get the SeqeunceExtractor. Only available if the *seq* property is set.
     */
    get sequenceExtractor() {
      return this._sequenceExtractor
    }

    /**
     * @member {Number} - Get or set the seqeunce length. If the *seq* property is set, the length can not be adjusted.
     */
    get length() {
      return this._length
    }

    set length(value) {
      if (value) {
        if (!this.seq) {
          this._length = Number(value);
          this._updateScale();
        } else {
          console.error('Can not change the sequence length of *seq* is set.');
        }
      }
    }

    _updateScale() {
      this.canvas.scale.bp = d3.scaleLinear()
        .domain([1, this.length])
        .range([-1/2*Math.PI, 3/2*Math.PI]);
      this.viewer._updateZoomMax();
    }

    /**
     * @member {Color} - Get or set the backbone color. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
     */
    get color() {
      return this._color
    }

    set color(value) {
      if (value.toString() == 'Color') {
        this._color = value;
      } else {
        this._color = new CGV.Color(value);
      }
    }

    /**
     * @member {Font} - Get or set sequence font. When setting the font, a string representing the font or a {@link Font} object can be used. For details see {@link Font}.
     */
    get font() {
      return this._font
    }

    set font(value) {
      if (value.toString() == 'Font') {
        this._font = value;
      } else {
        this._font = new CGV.Font(value);
      }
      this.bpSpacing = this.font.size;
    }

    get isLinear() {
      return false
    }

    get isCircular() {
      return true
    }

    lengthOfRange(start, stop) {
      if (stop >= start) {
        return stop - start
      } else {
        return this.length + (stop - start)
      }
    }

    /**
     * Subtract *bpToSubtract* from *position*, taking into account the sequence length
     * @param {Number} position - position (in bp) to subtract from
     * @param {Number} bpToSubtract - number of bp to subtract
     */
    subtractBp(position, bpToSubtract) {
      if (bpToSubtract <= position) {
        return position - bpToSubtract
      } else {
        return this.length + position - bpToSubtract
      }
    }

    /**
     * Add *bpToAdd* to *position*, taking into account the sequence length
     * @param {Number} position - position (in bp) to add to
     * @param {Number} bpToAdd - number of bp to add
     */
    addBp(position, bpToAdd) {
      if (this.length >= (bpToAdd + position)) {
        return bpToAdd + position
      } else {
        return position - this.length + bpToAdd
      }
    }

    /**
     * Return the sequence for the *range*
     * 
     * @param {Range} range - the range for which to return the sequence
     * @param {Boolean} complement - If true return the complement sequence
     * @return {String}
     */
    forRange(range) {
      var seq;
      if (this.seq) {
        if (range.spansOrigin()) {
          seq = this.seq.substr(range.start - 1) + this.seq.substr(0, range.stop);
        } else {
          seq = this.seq.substr(range.start - 1, range.length);
        }
      } else {
        // FIXME: For now return fake sequence
        seq = this._fakeSequenceForRange(range);
      }
      return seq
    }

    // FAKE method to get sequence
    _fakeSequenceForRange(range) {
      var seq = [];
      var bp = range.start;
      for (var i = 0, len = range.length; i < len; i++) {
        switch (bp % 4) {
          case 0:
            seq[i] = 'A';
            break;
          case 1:
            seq[i] = 'T';
            break;
          case 2:
            seq[i] = 'G';
            break;
          case 3:
            seq[i] = 'C';
        }
        bp++;
      }
      return seq
    }

    _drawSequence() {
      var ctx = this.canvas.ctx;
      var scale = this.canvas.scale;
      var radius = CGV.pixel(this.zoomedRadius);
      var range = this.visibleRange
      if (range) {
        var seq = this._sequenceForRange(range);
        var bp = range.start;
        ctx.save();
        ctx.fillStyle = this.fontColor.rgbaString;
        ctx.font = this.font.css;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var radiusDiff = this.bpSpacing / 2 + this.bpMargin;
        for (var i = 0, len = range.length; i < len; i++) {
          var origin = this.canvas.pointFor(bp, radius + radiusDiff);
          ctx.fillText(seq[i], origin.x, origin.y);
          var origin = this.canvas.pointFor(bp, radius - radiusDiff);
          ctx.fillText(seq[i], origin.x, origin.y);
          bp++;
        }
        ctx.restore();
      }

    }

    /**
     * Returns an array of Ranges where the pattern was located. The pattern can be a RegEx or a String.
     * This method will return overlapping matches.
     * @param {String} pattern - RegEx or String Pattern to search for.
     * @return {Array)
     */
    findPattern(pattern, strand = 1) {
      var re = new RegExp(pattern, 'g');
      var ranges = [];
      var match, start;
      var seq = (strand == 1) ? this.seq : this.reverseComplement();
      while ( (match = re.exec(seq)) != null) {
        start = (strand == 1) ? (match.index + 1) : (this.length - match.index - match[0].length + 1);
        ranges.push( new CGV.CGRange(this, start, start + match[0].length - 1 ) );
        re.lastIndex = match.index + 1;
      }
      return ranges
    }

    featuresByReadingFrame(features) {
      var featuresByRF = {
        rf_plus_1: new CGV.CGArray(),
        rf_plus_2: new CGV.CGArray(),
        rf_plus_3: new CGV.CGArray(),
        rf_minus_1: new CGV.CGArray(),
        rf_minus_2: new CGV.CGArray(),
        rf_minus_3: new CGV.CGArray()
      };
      var rf;
      features.each( (i, feature) => {
        if (feature.strand == -1) {
          rf = (this.length - feature.stop + 1) % 3;
          if (rf == 0) { rf = 3; }
          featuresByRF['rf_minus_' + rf].push(feature);
        } else {
          rf = feature.start % 3;
          if (rf == 0) { rf = 3; }
          featuresByRF['rf_plus_' + rf].push(feature);
        }
      });
      return featuresByRF
    }

    // _drawSequenceDots() {
    //   var ctx = this.canvas.ctx;
    //   var scale = this.canvas.scale;
    //   var radius = CGV.pixel(this.zoomedRadius);
    //   var range = this.visibleRange
    //   if (range) {
    //     var bp = range.start;
    //     ctx.save();
    //     ctx.fillStyle = this.fontColor.rgbaString;
    //     var radiusDiff = this.bpSpacing / 2 + this.bpMargin;
    //     for (var i = 0, len = range.length; i < len; i++) {
    //       var origin = this.canvas.pointFor(bp, radius + radiusDiff);
    //       ctx.beginPath();
    //       ctx.arc(origin.x, origin.y, 3, 0, Math.PI * 2);
    //       ctx.fill();
    //       ctx.beginPath();
    //       var origin = this.canvas.pointFor(bp, radius - radiusDiff);
    //       ctx.arc(origin.x, origin.y, 3, 0, Math.PI * 2);
    //       ctx.fill();
    //       bp++;
    //     }
    //     ctx.restore();
    //   }
    // }

  }

  CGV.Sequence = Sequence;

})(CGView);


