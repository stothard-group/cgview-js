//////////////////////////////////////////////////////////////////////////////
// Sequence
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {
  /**
   * <br />
   * The CGView Sequence class holds the sequence of the map.
   */
  class Sequence extends CGV.CGObject {

    /**
     * Create a Sequence
     *
     * @param {Viewer} viewer - The viewer that contains the backbone
     * @param {Object} options - Options used to create the sequence
     *
     *  Option                | Default          | Description
     *  ----------------------|-------------------------------------------------
     *  font                  | "sans-serif,plain,14" | A string describing the font. See {@link Font} for details.
     *  color                 | "black"          | A string describing the color. See {@link Color} for details.
     *  seq                   | undefined        | The sequence as a string.
     *  length                | seq length or 1000 | If no sequence is provided, the length can be used to set up the map.
     *
     * @param {Object=} meta - User-defined key:value pairs to add to the caption.
     */
    constructor(viewer, options = {}, meta = {}) {
      super(viewer, options, meta);
      this._viewer = viewer;
      this.seq = options.seq;
      this.bpMargin = 2;
      this.color = CGV.defaultFor(options.color, 'black');
      this.font = CGV.defaultFor(options.font, 'sans-serif, plain, 14');

      if (!this.seq) {
        this.length = options.length;
      }
      if (!this.length) {
        this.length = 1000;
      }
    }

    //////////////////////////////////////////////////////////////////////////
    // STATIC CLASSS METHODS
    //////////////////////////////////////////////////////////////////////////
    // TODO: Take into account lower case letters
    static complement(seq) {
      let compSeq = '';
      let char, compChar;
      for (let i = 0, len = seq.length; i < len; i++) {
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
          break;
        case 'U':
          compChar = 'A';
          break;
        case 'Y':
          compChar = 'R';
          break;
        case 'S':
          compChar = 'S';
          break;
        case 'W':
          compChar = 'W';
          break;
        case 'K':
          compChar = 'M';
          break;
        case 'M':
          compChar = 'K';
          break;
        case 'B':
          compChar = 'V';
          break;
        case 'D':
          compChar = 'H';
          break;
        case 'H':
          compChar = 'D';
          break;
        case 'V':
          compChar = 'B';
          break;
        case 'N':
          compChar = 'N';
          break;
        }
        compSeq = compSeq + compChar;
      }
      return compSeq;
    }

    static baseCalculation(type, seq) {
      if (type === 'gc-content') {
        return Sequence.calcGCContent(seq);
      } else if (type === 'gc-skew') {
        return Sequence.calcGCSkew(seq);
      }
    }

    static calcGCContent(seq) {
      if (seq.length === 0) { return  0.5; }
      const g = CGV.Sequence.count(seq, 'g');
      const c = CGV.Sequence.count(seq, 'c');
      return ( (g + c) / seq.length );
    }

    static calcGCSkew(seq) {
      const g = CGV.Sequence.count(seq, 'g');
      const c = CGV.Sequence.count(seq, 'c');
      if ( (g + c) === 0 ) { return 0.5; }
      // Gives value between -1 and 1
      const value = (g - c) / (g + c);
      // Scale to a value between 0 and 1
      return  0.5 + (value / 2);
    }

    static reverseComplement(seq) {
      return Sequence.complement( seq.split('').reverse().join('') );
    }

    static count(seq, pattern) {
      return (seq.match(new RegExp(pattern, 'gi')) || []).length;
    }

    /**
     * Create a random sequence of the specified length
     * @param {Number} length - The length of the sequence to create
     * @return {String}
     */
    static random(length) {
      let seq = '';
      let num;
      for (let i = 0; i < length; i++) {
        num = Math.floor(Math.random() * 4);
        switch (num % 4) {
        case 0:
          seq += 'A';
          break;
        case 1:
          seq += 'T';
          break;
        case 2:
          seq += 'G';
          break;
        case 3:
          seq += 'C';
        }
      }
      return seq;
    }

    reverseComplement() {
      return Sequence.reverseComplement(this.seq);
    }

    count(pattern) {
      return Sequence.count(this.seq, pattern);
    }

    //////////////////////////////////////////////////////////////////////////
    // MEMBERS
    //////////////////////////////////////////////////////////////////////////

    /**
     * @member {String} - Get or set the seqeunce.
     */
    get seq() {
      return this._seq;
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
      return this._sequenceExtractor;
    }

    /**
     * @member {Number} - Get or set the seqeunce length. If the *seq* property is set, the length can not be adjusted.
     */
    get length() {
      return this._length;
    }

    set length(value) {
      if (value) {
        if (!this.seq) {
          this._length = Number(value);
          this._updateScale();
        } else {
          console.error('Can not change the sequence length if *seq* is set.');
        }
      }
    }

    _updateScale() {
      // this.viewer.layout.updateBPScale(this.length);
      this.viewer.layout.updateScales();
      // this.canvas.scale.bp = d3.scaleLinear()
      //   .domain([1, this.length])
      //   .range([-1 / 2 * Math.PI, 3 / 2 * Math.PI]);
      // this.viewer._updateZoomMax();
      // console.log(this.canvas.scale)
    }

    /**
     * @member {Color} - Get or set the backbone color. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
     */
    get color() {
      return this._color;
    }

    set color(value) {
      if (value.toString() === 'Color') {
        this._color = value;
      } else {
        this._color = new CGV.Color(value);
      }
    }

    /**
     * @member {Font} - Get or set sequence font. When setting the font, a string representing the font or a {@link Font} object can be used. For details see {@link Font}.
     */
    get font() {
      return this._font;
    }

    set font(value) {
      if (value.toString() === 'Font') {
        this._font = value;
      } else {
        this._font = new CGV.Font(value);
      }
      this.bpSpacing = this.font.size;
    }

    /**
     * @member {Number} - Get or set the basepair spacing.
     */
    get bpSpacing() {
      return this._bpSpacing;
    }

    set bpSpacing(value) {
      this._bpSpacing = value;
      this.viewer._updateZoomMax();
    }

    /**
     * @member {Number} - Get or set the margin around sequence letters.
     */
    get bpMargin() {
      return this._bpMargin;
    }

    set bpMargin(value) {
      this._bpMargin = value;
    }

    /**
     * @member {Number} - Get the thick required to draw the sequence. Based on bpMargin and bpSpacing.
     */
    get thickness() {
      return CGV.pixel((this.bpSpacing * 2) + (this.bpMargin * 4));
    }

    get isLinear() {
      return false;
    }

    get isCircular() {
      return true;
    }

    asFasta(id = 'sequence') {
      return `>${id}\n${this.seq}`;
    }

    lengthOfRange(start, stop) {
      if (stop >= start) {
        return stop - start;
      } else {
        return this.length + (stop - start);
      }
    }

    /**
     * Subtract *bpToSubtract* from *position*, taking into account the sequence length
     * @param {Number} position - position (in bp) to subtract from
     * @param {Number} bpToSubtract - number of bp to subtract
     */
    subtractBp(position, bpToSubtract) {
      if (bpToSubtract < position) {
        return position - bpToSubtract;
      } else {
        return this.length + position - bpToSubtract;
      }
    }

    /**
     * Add *bpToAdd* to *position*, taking into account the sequence length
     * @param {Number} position - position (in bp) to add to
     * @param {Number} bpToAdd - number of bp to add
     */
    addBp(position, bpToAdd) {
      if (this.length >= (bpToAdd + position)) {
        return bpToAdd + position;
      } else {
        return position - this.length + bpToAdd;
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
      let seq;
      if (this.seq) {
        if (range.spansOrigin()) {
          // seq = this.seq.substr(range.start - 1) + this.seq.substr(0, range.stop);
          seq = this.seq.substring(range.start - 1) + this.seq.substring(0, range.stop);
        } else {
          // seq = this.seq.substr(range.start - 1, range.length + 1);
          seq = this.seq.substring(range.start - 1, range.stop);
        }
      } else {
        // FIXME: For now return fake sequence
        seq = this._fakeSequenceForRange(range);
      }
      return seq;
    }

    // FAKE method to get sequence
    _fakeSequenceForRange(range) {
      let seq = '';
      let bp = range.start;
      for (let i = 0, len = range.length; i < len; i++) {
        switch (bp % 4) {
        case 0:
          seq += 'A';
          break;
        case 1:
          seq += 'T';
          break;
        case 2:
          seq += 'G';
          break;
        case 3:
          seq += 'C';
        }
        bp++;
      }
      return seq;
    }

    /**
     * Returns an array of Ranges where the pattern was located. The pattern can be a RegEx or a String.
     * This method will return overlapping matches.
     * @param {String} pattern - RegEx or String Pattern to search for.
     * @return {Array)
     */
    findPattern(pattern, strand = 1) {
      const re = new RegExp(pattern, 'g');
      const ranges = [];
      let match, start;
      const seq = (strand === 1) ? this.seq : this.reverseComplement();
      while ( (match = re.exec(seq)) !== null) {
        start = (strand === 1) ? (match.index + 1) : (this.length - match.index - match[0].length + 1);
        ranges.push( new CGV.CGRange(this, start, start + match[0].length - 1 ) );
        re.lastIndex = match.index + 1;
      }
      return ranges;
    }


    featuresByReadingFrame(features) {
      const featuresByRF = {
        rfPlus1: [],
        rfPlus2: [],
        rfPlus3: [],
        rfMinus1: [],
        rfMinus2: [],
        rfMinus3: []
        // rfPlus1: new CGV.CGArray(),
        // rfPlus2: new CGV.CGArray(),
        // rfPlus3: new CGV.CGArray(),
        // rfMinus1: new CGV.CGArray(),
        // rfMinus2: new CGV.CGArray(),
        // rfMinus3: new CGV.CGArray()
      };
      let rf;
      features.each( (i, feature) => {
        if (feature.strand === -1) {
          rf = (this.length - feature.stop + 1) % 3;
          if (rf === 0) { rf = 3; }
          featuresByRF[`rfMinus${rf}`].push(feature);
        } else {
          rf = feature.start % 3;
          if (rf === 0) { rf = 3; }
          featuresByRF[`rfPlus${rf}`].push(feature);
        }
      });
      return featuresByRF;
    }

    _emptySequence(length) {
      // ES6
      // return '•'.repeat(length);
      return Array(length + 1).join('•');
    }

    draw() {
      if (!this.visible) { return; }
      const ctx = this.canvas.context('map');
      const backbone = this.viewer.backbone;
      const pixelsPerBp = backbone.pixelsPerBp();
      const seqZoomFactor = 0.25; // The scale at which the sequence will first appear.
      if (pixelsPerBp < CGV.pixel(this.bpSpacing - this.bpMargin) * seqZoomFactor) { return; }

      const scaleFactor = Math.min(1, pixelsPerBp / CGV.pixel(this.bpSpacing - this.bpMargin));

      const radius = CGV.pixel(backbone.adjustedCenterOffset);
      const range = backbone.visibleRange;
      let seq, complement;
      if (range) {
        if (this.seq) {
          seq = this.forRange(range);
          complement = CGV.Sequence.complement(seq);
        } else {
          seq = this._emptySequence(range.length);
          complement = this._emptySequence(range.length);
        }
        let bp = range.start;
        ctx.save();
        ctx.fillStyle = this.color.rgbaString;
        ctx.font = this.font.cssScaled(scaleFactor);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const radiusDiff = CGV.pixel((this.bpSpacing / 2) + this.bpMargin) * scaleFactor;
        for (let i = 0, len = range.length; i < len; i++) {
          let origin = this.canvas.pointFor(bp, radius + radiusDiff);
          if (i == 0) { console.log(bp, origin)}
          ctx.fillText(seq[i], origin.x, origin.y);
          origin = this.canvas.pointFor(bp, radius - radiusDiff);
          ctx.fillText(complement[i], origin.x, origin.y);
          bp++;
        }
        ctx.restore();
      }
    }

    toJSON() {
      return {
        font: this.font.string,
        color: this.color.rgbString,
        seq: this.seq,
        visible: this.visible
      };
    }

  }

  CGV.Sequence = Sequence;
})(CGView);


// testRF(features) {
//   let startTime, rf;
//   startTime = new Date().getTime();
//   let rf1 = this.featuresByReadingFrame(features);
//   console.log("READING FRAME Normal Creation Time: " + CGV.elapsedTime(startTime) );
//   // SETUP
//   features.each( (i, feature) => {
//     if (feature.strand === -1) {
//       rf = (this.length - feature.stop + 1) % 3;
//       if (rf === 0) { rf = 3; }
//       feature.rf = rf;
//     } else {
//       rf = feature.start % 3;
//       if (rf === 0) { rf = 3; }
//       feature.rf = rf;
//     }
//   });
//   startTime = new Date().getTime();
//   let rf2 = {
//     rfPlus1: new CGV.CGArray( features.filter( (f) => { return f.rf === 1  && f.strand === 1})),
//     rfPlus2: new CGV.CGArray( features.filter( (f) => { return f.rf === 2  && f.strand === 1})),
//     rfPlus3: new CGV.CGArray( features.filter( (f) => { return f.rf === 3  && f.strand === 1})),
//     rfMinus1: new CGV.CGArray( features.filter( (f) => { return f.rf === 1  && f.strand === -1})),
//     rfMinus2: new CGV.CGArray( features.filter( (f) => { return f.rf === 2  && f.strand === -1})),
//     rfMinus3: new CGV.CGArray( features.filter( (f) => { return f.rf === 3  && f.strand === -1}))
//   };
//   console.log("READING FRAME NEW Creation Time: " + CGV.elapsedTime(startTime) );
//   return rf2;
// }
