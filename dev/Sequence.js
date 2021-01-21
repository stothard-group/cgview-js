//////////////////////////////////////////////////////////////////////////////
// Sequence
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {
  /**
   * <br />
   * The CGView Sequence represents the sequence that makes up the map. The essential
   * proptery of the Sequence is the length. The length must be known in order to draw
   * a map of the correct size. There are 3 ways to set the Sequence length on map
   * creation.
   * - seq: provide the sequence. The length will be set directly from the sequence.
   * - length: provide the sequence length without sequence
   * - contigs: an array of contigs. Each contig must then include its length or sequence.
   *
   * The seq and length propteries are read only and cannot be changed unless a new
   * map is loaded (see IO.loadJSON). With contigs, the updateContigs and
   * moveContigs methods can be used to change the name, orienation, visbility and
   * order, however, the seq and length property of each contig is still read only.
   *
   * Sequence Coordinates:
   * CGView uses two coordinate systems: Contig space and map space. For features and plot, positions are relative to contigs. However, when drawing we use positions relative to the entire map.
   * [Image of map with contigs. Show contig/map space]
   */
  class Sequence extends CGV.CGObject {

    /**
     * Create a Sequence
     * REPLACE WITH API
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
     *  contigs               | undefined        | An array of ...
     *
     * @param {Object=} meta - User-defined key:value pairs to add to the caption.
     *
     * Implementation notes:
     *   - Internally contigs are always used. If 'seq' is provided, it will be converted to a single contig.
     *   - All the contigs are concatenated into a single contig called mapContig.
     *     -  Sequence.seq === Sequence.mapContig.seq
     *   - If there is only one contig then Sequence.mapContig === Sequence.contigs(1)
     *   - Make note in update/updateContig methods that if only one contig is provided (or the sequence seq), they are treated the same internally. Therefore, if the contig name is changed, so is the sequence name.
     *   - Note for toJSON: will output single contigs as attributes of the sequence (so no contigs property)
     *
     */
    constructor(viewer, options = {}, meta = {}) {
      super(viewer, options, meta);
      this._viewer = viewer;
      this.bpMargin = 2;
      this.color = CGV.defaultFor(options.color, 'black');
      this.font = CGV.defaultFor(options.font, 'sans-serif, plain, 14');

      this._contigs = new CGV.CGArray();

      this.createMapContig(options);

      this.viewer.trigger('sequence-update', { attributes: this.toJSON({includeDefaults: true}) });
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
     * Return the class name as a string.
     * @return {String} - 'Sequence'
     */
    toString() {
      return 'Sequence';
    }

    /**
     * @member {String} - Get or set the seqeunce.
     */
    get seq() {
      // return this._seq;
      return this.mapContig.seq;
    }

    // set seq(value) {
    //   this._seq = value;
    //   if (this._seq) {
    //     this._seq = this._seq.toUpperCase();
    //     this._length = value.length;
    //     this._updateScale();
    //     this._sequenceExtractor = new CGV.SequenceExtractor(this);
    //   } else {
    //     this._sequenceExtractor = undefined;
    //   }
    // }

    /**
     * @member {Contig} - This is used internally to represent the entire map sequence.
     *   It is generated by the supplied seq or the concatenation of all the contigs.
     *   The Sequence.seq (or length) is the same as Sequence.mapContig.seq (or length).
     */
    get mapContig() {
      return this._mapContig;
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
      // return this._length;
      return this.mapContig.length;
    }

    // set length(value) {
    //   if (value) {
    //     if (!this.seq) {
    //       this._length = Number(value);
    //       this._updateScale();
    //     } else {
    //       console.error('Can not change the sequence length if *seq* is set.');
    //     }
    //   }
    // }

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
      return (this.bpSpacing * 2) + (this.bpMargin * 8);
    }

    get isLinear() {
      return false;
    }

    get isCircular() {
      return true;
    }

    /**
     * @member {Boolean} - Return true of a sequence is available. Returns false if there is only a length.
     */
    get hasSeq() {
      return typeof this.seq === 'string';
    }

    get hasMultipleContigs() {
      return this._contigs.length > 1;
    }


    // loadContigs(contigs) {
    //   // Create contigs
    //   for (const contigData of contigs) {
    //     const contig = new CGV.Contig(this, contigData);
    //     this._contigs.push(contig);
    //   }
    //   this.updateFromContigs();
    // }

    addContigs(contigData = []) {
      contigData = CGV.CGArray.arrayerize(contigData);
      const contigs = contigData.map( (data) => {
        const contig = new CGV.Contig(this, data);
        this._contigs.push(contig);
        return contig;
      });
      this.updateMapContig();
      this.viewer.trigger('contigs-add', contigs);
      // this.updateFromContigs();
      return contigs;
      // Check for sequence or length
      // Can probably just add the sequence or length, instead of calling updateFromContigs
      // Update Plots
      // this.updateFromContigs()
    }

    // Removing contigs, will remove the features associated with the contig
    // This will only work with contigs in Sequence.contigs(). It will
    // not remove the mapContig.
    // Will not remove last contig. If removing all contigs, the last contig will not be removed.
    // TODO: deal with plots
    removeContigs(contigs) {
      contigs = CGV.CGArray.arrayerize(contigs).slice();
      // Do not remove last contig
      if (contigs.length === this._contigs.length) {
        const lastContig = contigs.pop();
        console.error('The last contig can not be removed. Keeping:', lastContig);
      }
      if (contigs.length > 0) {
        // First remove features
        const features = contigs.map( c => c.features() ).flat();
        this.viewer.removeFeatures(features);
        // Remove contigs
        this._contigs = this._contigs.filter( c => !contigs.includes(c) );
        // Remove from Objects
        contigs.forEach( c => c.deleteFromObjects() );
        this.updateMapContig();
      }

      this.viewer.trigger('contigs-remove', contigs);
    }

    /**
     * Update contige properties.
     */
    updateContigs(contigsOrUpdates, attributes) {
      const { records: contigs, updates } = this.viewer.updateRecords(contigsOrUpdates, attributes, {
        recordClass: 'Contig',
        validKeys: ['name', 'orientation', 'color', 'visible']
      });

      // FIXME: this should only update if orientation, order or visible changes
      this.updateMapContig();
      // TRYING THIS OUT
      for (const track of this.viewer.tracks()) {
        track.refresh();
      }
      this.viewer.annotation.refresh();
      // FIXME: Only trigger contigs if visibiliy changes
      this.viewer.trigger('tracks-update', { tracks: this.viewer.tracks() });
      // TODO: refresh sequence, features, etc
      this.viewer.trigger('contigs-update', { contigs, attributes, updates });
    }

    moveContig(oldIndex, newIndex) {
      this._contigs.move(oldIndex, newIndex);
      // FIXME: UPDATE OFFSET AND RANGES
      // FIXME: UPDATE Sequence Plot Extractors
      this.updateMapContig();

      // TRYING THIS OUT
      for (const track of this.viewer.tracks()) {
        track.refresh();
      }
      this.viewer.annotation.refresh();

      this.viewer.trigger('contigs-moved', {oldIndex: oldIndex, newIndex: newIndex});

      // Calling contigs-update as well.
      // Because each contig between oldIndex and newIndex will have there order/index changed
      const contigs = [];
      const start = Math.min(oldIndex, newIndex);
      const len = Math.max(oldIndex, newIndex);
      for (let i = start; i <= len; i++) {
        contigs.push(this._contigs[i]);
      }
      this.viewer.trigger('contigs-update', { contigs, attributes: {} });


    }


    // Order of importance:
    // 1) seq
    // 2) contigs
    //   a) seq
    //   b) length
    // 3) length
    // 4) Default: length 1000 bp
    createMapContig(data) {
      if (data.seq) {
        // this._mapContig = new CGV.Contig(this, data);
        // FIXME: name and id stuff
        this.addContigs([{seq: data.seq}]);
      } else if (data.contigs) {
        this.addContigs(data.contigs);
      } else if (data.length) {
        this.addContigs([{length: data.length}]);
      } else {
        // console.error('A "seq", "contigs", or "length" must be provided');
        this.addContigs([{length: 1000}]);
      }
    }

    updateMapContig() {
      if (this._contigs.length === 1) {
        this._mapContig = this._contigs[0];
        this._mapContig._index = 1;
        this._mapContig._updateLengthOffset(0);
      } else {
        // Concatenate contigs
        // The contigs can't have a mixture of sequence and length
        // Check first contig to see if it contains a sequence or length
        const useSeq = this._contigs[0].hasSeq;
        let seq = '';
        let length = 0;
        for (let i = 0, len = this._contigs.length; i < len; i++) {
          const contig = this._contigs[i];
          contig._index = i + 1;
          if (!contig.visible) {continue;}

          contig._updateLengthOffset(length);

          if (useSeq) {
            if (contig.hasSeq) {
              seq += contig.seq;
              length += contig.seq.length;
            } else {
              console.error(`Expecting Sequence but Contig ${contig.name} [${contig.id}] has no sequence !`)
            }
          } else {
            if (contig.length) {
              length += contig.length;
            } else {
              console.error(`Expecting Length but Contig ${contig.name} [${contig.id}] has no length!`)
            }
          }
        }
        const oldMapContig = this.mapContig;
        // Create new mapContig
        const data = (useSeq) ? {seq} : {length};
        this._mapContig = new CGV.Contig(this, data);
        // Move features from previous mapContig to new mapContig
        if (oldMapContig) {
          oldMapContig.features().forEach( f => f.contig = this.mapContig  );
          oldMapContig.deleteFromObjects();
        }
      }
      this._sequenceExtractor = (this.hasSeq) ? new CGV.SequenceExtractor(this) : undefined;
      this._updateScale();
    }

    // updateFromContigs() {
    //   if (this._contigs.length === 0) {
    //     this.seq = '';
    //     return;
    //   }
    //   // Check first contig to see if it contains a sequence or length
    //   const useSeq = this._contigs[0].hasSeq;
    //   let seq = '';
    //   let length = 0;
    //   for (let i = 0, len = this._contigs.length; i < len; i++) {
    //     const contig = this._contigs[i];
    //     contig._index = i + 1;
    //     contig._updateLengthBefore(length);
    //
    //     if (useSeq) {
    //       if (contig.hasSeq) {
    //         seq += contig.seq;
    //         length += contig.seq.length;
    //       } else {
    //         console.error(`Expecting Sequence but Contig ${this.name} [${this.id}] has no sequence !`)
    //       }
    //     } else {
    //       if (contig.length) {
    //         length += contig.length;
    //       } else {
    //         console.error(`Expecting Length but Contig ${this.name} [${this.id}] has no length!`)
    //       }
    //     }
    //   }
    //   // Create sequence
    //   if (useSeq) {
    //     this.seq = seq;
    //   } else {
    //     this.length = length;
    //   }
    // }

    contigs(term) {
      return this._contigs.get(term);
    }

    /**
     * Returns all the visible contigs that overlap the given range using map coordinates.
     * @param {CGRange} range - Range to find overlapping contigs.
     *
     * @return {CGArray} CGArray of Contigs
     */
    contigsForMapRange(range) {
      const contigs = new CGV.CGArray();
      for (let i = 1, len = this.sequence.contigs().length; i <= len; i++) {
        const contig = this.sequence.contigs(i);
        if (contig.visible && range.overlapsMapRange(contig.mapRange)) {
          contigs.push(contig);
        }
      }
      return contigs;
    }

    /**
     * Return the map bp position given a local *bp* on the given *contig*.
     * @param {Contig} contig - Contig object
     * @param {Number} bp - bp position on the contig
     *
     * @return {Number} map position.
     */
    bpForContig(contig, bp = 1) {
      // FIXME: contig can be contig or contig ID
      return contig.mapStart + bp - 1;
    }

    /**
     * Return the contig for the given map bp.
     *
     * @return {Contig}
     */
    contigForBp(bp) {
      // FIXME: could be sped up with a binary search
      if (this.hasMultipleContigs) {
        for (let i = 0, len = this._contigs.length; i < len; i++) {
          if (bp <= this._contigs[i].lengthOffset) {
            return this._contigs[i - 1];
          }
        }
        // Must be in last contig
        return this._contigs[this._contigs.length - 1];
      }
    }

    // id is not used if there are multiple contigs and we are not concatenating them
    asFasta(id, options = {}) {
      const concatenate = options.concatenateContigs;
      if (concatenate || !this.hasMultipleContigs) {
        const name = id || this.contigs(1).id;
        return `>${name}\n${this.seq}`;
      } else {
        let fasta = '';
        for (const contig of this._contigs) {
          fasta += `${contig.asFasta()}\n`;
        }
        return fasta;
      }
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
     * Constrains the supplied *bp* to be between 1 and the sequence length.
     *  - If the bp is less than 1: 1 is returned.
     *  - If greater than the sequence length: sequence length is returned.
     *  - Otherwise the supplied bp is returned.
     * @param {Number} bp - position (in bp)
     */
    constrain(bp) {
      return CGV.constrain(bp, 1, this.length);
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
        if (range.isWrapped()) {
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
        ranges.push( new CGV.CGRange(this.mapContig, start, start + match[0].length - 1 ) );
        re.lastIndex = match.index + 1;
      }
      return ranges;
    }


    featuresByReadingFrame(features) {
      const featuresByRF = {
        rfPlus1: new CGV.CGArray(),
        rfPlus2: new CGV.CGArray(),
        rfPlus3: new CGV.CGArray(),
        rfMinus1: new CGV.CGArray(),
        rfMinus2: new CGV.CGArray(),
        rfMinus3: new CGV.CGArray()
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
      if (pixelsPerBp < (this.bpSpacing - this.bpMargin) * seqZoomFactor) { return; }

      const scaleFactor = Math.min(1, pixelsPerBp / (this.bpSpacing - this.bpMargin));

      const centerOffset = backbone.adjustedCenterOffset;
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
        // Distance from the center of the backbone to place sequence text
        const centerOffsetDiff = ((this.bpSpacing / 2) + this.bpMargin) * scaleFactor;
        for (let i = 0, len = range.length; i < len; i++) {
          let origin = this.canvas.pointForBp(bp, centerOffset + centerOffsetDiff);
          // if (i == 0) { console.log(bp, origin)}
          ctx.fillText(seq[i], origin.x, origin.y);
          origin = this.canvas.pointForBp(bp, centerOffset - centerOffsetDiff);
          ctx.fillText(complement[i], origin.x, origin.y);
          bp++;
        }
        ctx.restore();
      }
    }

    invertColors() {
      this.update({
        color: this.color.invert().rgbaString
      });
    }

    update(attributes) {
      this.viewer.updateRecords(this, attributes, {
        recordClass: 'Sequence',
        validKeys: ['color', 'font', 'visible']
      });
      this.viewer.trigger('sequence-update', { attributes });
    }

    toJSON(options = {}) {
      const json = {
        font: this.font.string,
        color: this.color.rgbString,
        contigs: this._contigs.map( c => c.toJSON(options) )
      };
      // Optionally add default values
      if (!this.visible || options.includeDefaults) {
        json.visible = this.visible;
      }
      return json;
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
