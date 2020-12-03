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
      this.color = options.color;
      this._features = new CGV.CGArray();
      this._updateLengthOffset(0);

      if (!this.seq) {
        this.length = options.length;
      }
      if (!this.length) {
        console.error(`Contig ${this.name} [${this.id}] has no sequence or length set!`)
      }

    }

    //////////////////////////////////////////////////////////////////////////
    // STATIC
    //////////////////////////////////////////////////////////////////////////

    /**
     * Removes supplied features from their contigs
     */
    static removeFeatures(features) {
      features = CGV.CGArray.arrayerize(features);
      if (features.length === 0) { return }
      const viewer = features[0].viewer;
      const contigMap = {};
      for (const feature of features) {
        const cgvID = feature.contig && feature.contig.cgvID;
        if (cgvID) {
          contigMap[cgvID] ? contigMap[cgvID].push(feature) : contigMap[cgvID] = [feature];
        }
      }
      const cgvIDs = Object.keys(contigMap);
      for (const cgvID of cgvIDs) {
        const contig = viewer.objects(cgvID);
        contig._features = contig._features.filter ( f => !contigMap[cgvID].includes(f) );
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
     * @member {String} - Get the sequence.
     */
    get sequence() {
      return this._sequence;
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
     * @member {Number} - Get the contig index (base-1) in relation to all the other contigs.
     */
    get index() {
      return this._index;
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
      const validKeys = ['-', '+'];
      if (!CGV.validate(value, validKeys)) { return; }
      if (this._orientation && (value !== this._orientation)) {
        this.reverseFeatureOrientations();
      }
      if (this.seq) {
        this.seq = this.reverseComplement();
      }
      this._orientation = value;
      // FIXME: reverse complement the sequence
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
    get lengthOffset() {
      return this._lengthOffset;
    }

    get color() {
      return this._color;
    }

    set color(color) {
      if (color === undefined) {
        this._color = undefined;
      } else if (color.toString() === 'Color') {
        this._color = color;
      } else {
        this._color = new CGV.Color(color);
      }
    }

    /**
     * @member {CGRange} - Get the range of the contig in relation to the entire map.
     *   The range start is the total length of the contigs before this one plus 1.
     *   The range stop is the total length of the contigs before this one plus this contigs length.
     */
    get mapRange() {
      // FIXME: this need to be stored better
      // return this._mapRange;
      return new CGV.CGRange(this.sequence.mapContig, this.lengthOffset + 1, this.lengthOffset + this.length);
    }

    /**
     * @member {Number} - Get the start position (bp) of the contig in relation to the entire map.
     *   The start is the total length of the contigs before this one plus 1.
     */
    get mapStart() {
      return this.mapRange.start;
    }

    /**
     * @member {Number} - Get the stop position (bp) of the contig in relation to the entire map.
     *   The stop is the total length of the contigs before this one plus this contigs length.
     */
    get mapStop() {
      return this.mapRange.stop;
    }

    /**
     * Updates the lengthOffset for this contig and also update the mapRange.
     * @param {length} - Total length of all the contigs before this one.
     */
    _updateLengthOffset(length) {
      this._lengthOffset = length;
      // this._mapRange = new CGV.CGRange(this.sequence.mapContig, length + 1, length + this.length);
    }

    reverseComplement() {
      return CGV.Sequence.reverseComplement(this.seq);
    }

    update(attributes) {
      this.sequence.updateContigs(this, attributes);
    }

    hasSeq() {
      return typeof this.seq === 'string';
    }

    /**
     * Returns an [CGArray](CGArray.html) of Features or a single Feature from all the features on this Contig.
     * @param {Integer|String|Array} term - See [CGArray.get](CGArray.html#get) for details.
     * @return {CGArray}
     */
    features(term) {
      return this._features.get(term);
    }

    /**
     * Remove the Contig from the Sequence
     */
    remove() {
      this.sequence.removeContigs(this);
    }

    /**
     * Zoom and pan map to show the contig
     *
     * @param {Number} duration - Length of animation
     * @param {Object} ease - The d3 animation ease [Default: d3.easeCubic]
     */
    moveTo(duration, ease) {
      if (this.mapRange.isMapLength()) {
        this.viewer.reset(duration, ease);
      } else {
        const buffer = Math.ceil(this.length * 0.05);
        const start = this.sequence.subtractBp(this.mapStart, buffer);
        const stop = this.sequence.addBp(this.mapStop, buffer);
        this.viewer.moveTo(start, stop, {duration, ease});
      }
    }

    reverseFeatureOrientations() {
      const updates = {};
      for (let i = 0, len = this._features.length; i < len; i++) {
        const feature = this._features[i];
        updates[feature.cgvID] = {
          start: this.length - feature.stop + 1,
          stop: this.length - feature.start + 1,
          strand: -(feature.strand)
        };
      }
      this.viewer.updateFeatures(updates);
    }

    // TODO: options for id
    asFasta() {
      return `>${this.id}\n${this.seq}`;
    }

    highlight(color) {
      const backbone = this.viewer.backbone;
      const canvas = this.viewer.canvas;
      const visibleRange = backbone.visibleRange;
      let highlightColor;
      if (color) {
        highlightColor = new CGV.Color(color);
      } else {
        let origColor = (this.index % 2 === 0) ? backbone.color : backbone.colorAlternate;
        if (this.color) {
          origColor = this.color;
        }
        highlightColor = origColor.copy();
        highlightColor.highlight();
      }
      if (this.visible) {
        const start = this.sequence.bpForContig(this);
        const stop = this.sequence.bpForContig(this, this.length);
        this.viewer.canvas.drawElement('ui', start, stop, backbone.adjustedCenterOffset, highlightColor.rgbaString, backbone.adjustedThickness, backbone.directionalDecorationForContig(this));
      }
    }

    toJSON(options = {}) {
      const json = {
        id: this.id,
        name: this.name,
        orientation: this.orientation,
        length: this.length,
        color: this.color && this.color.rgbaString,
        // visible: this.visible
      };
      if (this.hasSeq) {
        json.seq = this.seq;
      }
      // Optionally add default values
      // Visible is normally true
      if (!this.visible || options.includeDefaults) {
        json.visible = this.visible;
      }
      return json;
    }

  }

  CGV.Contig = Contig;
})(CGView);


