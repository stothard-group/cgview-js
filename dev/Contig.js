//////////////////////////////////////////////////////////////////////////////
// Contig
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {
  /**
   * <br />
   * The CGView Contig class contains details for a single contig.
   */
  class Contig extends CGV.CGObject {

    /**
     * Create a Contig
     *
     * @param {Sequence} sequence - The sequence that contains the contig
     * @param {Object} options - Options used to create the contig
     *
     *  Option                | Default          | Description
     *  ----------------------|-------------------------------------------------
     *
     * @param {Object=} meta - User-defined key:value pairs to add to the caption.
     */
    constructor(sequence, options = {}, meta = {}) {
      super(sequence.viewer, options, meta);
      this._sequence = sequence;
      this._viewer = sequence.viewer;

      this.id = CGV.defaultFor(options.id, this.cgvID);
      this.name = CGV.defaultFor(options.name, this.id);
      this.orientation = CGV.defaultFor(options.orientation, '+');
      this.seq = options.seq;
      this._lengthBefore = 0;

      if (!this.seq) {
        this.length = options.length;
      }
      if (!this.length) {
        console.error(`Contig ${this.name} [${this.id}] has no sequence or length set!`)
      }

    }

    //////////////////////////////////////////////////////////////////////////
    // MEMBERS
    //////////////////////////////////////////////////////////////////////////

    /**
     * Return the class name as a string.
     * @return {String} - 'Contig'
     */
    toString() {
      return 'Contig';
    }

    /**
     * @member {String} - Get or set the contig ID. Must be unique for all contigs
     */
    get id() {
      return this._id;
    }

    set id(value) {
      // TODO: Check if id is unique
      this._id = value;
    }

    /**
     * @member {String} - Get or set the contig name
     */
    get name() {
      return this._name;
    }

    set name(value) {
      this._name = value;
    }

    /**
     * @member {String} - Get or set the contig orientation. Value must be '+' or '-'.
     *   Flipping the orienation will reverse complement the contig sequence and
     *   adjust all the features on this contig.
     */
    get orientation() {
      return this._orientation;
    }

    set orientation(value) {
      // FIXME: check that value is '+' or '-'
      this._orientation = value;
      // FIXME: reverse complement the sequence
      // FIXME: update feature start, stop and strand
    }

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
        // TODO: check if features still fit, if the length is reduced
      }
    }

    /**
     * @member {Number} - Get or set the sequence length. If the *seq* property is set, the length can not be adjusted.
     */
    get length() {
      return this._length;
    }

    set length(value) {
      if (value) {
        if (!this.seq) {
          this._length = Number(value);
          this.sequence._updateScale();
          // TODO: check if features still fit, if the length is reduced
        } else {
          console.error('Can not change the sequence length if *seq* is set.');
        }
      }
    }

    /**
     * @member {Number} - Get the length of all the contigs before this one.
     */
    get lengthBefore() {
      return this._lengthBefore;
    }

    hasSeq() {
      return typeof this.seq == 'string';
    }

    draw() {
    }

    toJSON() {
      const json = {
        id: this.id,
        name: this.name,
        orientation: this.orientation,
        length: this.length
      };
      if (this.hasSeq) {
        json.seq = this.seq;
      }
      return json;
    }

  }

  CGV.Contig = Contig;
})(CGView);


