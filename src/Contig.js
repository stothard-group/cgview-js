//////////////////////////////////////////////////////////////////////////////
// Contig
//////////////////////////////////////////////////////////////////////////////

import CGObject from './CGObject';
import CGArray from './CGArray';
import CGRange from './CGRange';
import Sequence from './Sequence';
import Color from './Color';
import utils from './Utils';

/**
 * The Contig class contains details for a single contig.
 *
 * ### Action and Events
 *
 * Action                                     | Sequence Method                                | Contig Method       | Event
 * -------------------------------------------|------------------------------------------------|---------------------|-----
 * [Add](../docs.html#adding-records)         | [addContigs()](Sequence.html#addContigs)       | -                   | contigs-add
 * [Update](../docs.html#updating-records)    | [updateContigs()](Sequence.html#updateContigs) | [update()](#update) | contigs-update
 * [Remove](../docs.html#removing-records)    | [removeContigs()](Sequence.html#removeContigs) | [remove()](#remove) | contigs-remove
 * [Reorder](../docs.html#reordering-records) | [moveContigs()](Sequence.html#moveContig)      | [move()](#move)     | contigs-reorder
 * [Read](../docs.html#reading-records)       | [contigs()](Sequence.html#contigs)             | -                   | -
 *
 * <a name="attributes"></a>
 * ### Attributes
 *
 * Attribute                        | Type      | Description
 * ---------------------------------|-----------|------------
 * [name](#name)                    | String    | Contig name.
 * [id](#id)                        | String    | Contig ID.
 * [seq](#seq)<sup>iu</sup>         | String    | The contig sequence.
 * [length](#length)<sup>iu</sup>   | Number    | The length of the sequence. This is ignored if a seq is provided.
 * [orientation](#orientation)      | String    | '+' for forward orientation and '-' for the reverse.
 * [color](#color)                  | Color     | A string describing the color [Default: 'black']. See {@link Color} for details.
 * [visible](CGObject.html#visible) | Boolean   | Contig is visible [Default: true].
 * [meta](CGObject.html#meta)       | Object    | [Meta data](../tutorials/details-meta-data.html)
 * 
 * <sup>iu</sup> Ignored on Contig update
 *
 * @extends CGObject
 */
class Contig extends CGObject {

  /**
   * Create a Contig
   * @param {Viewer} viewer - The viewer
   * @param {Object} options - [Attributes](#attributes) used to create the contig
   * @param {Object} [meta] - User-defined [Meta data](../tutorials/details-meta-data.html) to add to the contig
   */
  constructor(sequence, options = {}, meta = {}) {
    super(sequence.viewer, options, meta);
    this._sequence = sequence;
    this._viewer = sequence.viewer;

    this.id = utils.defaultFor(options.id, this.cgvID);
    this.name = utils.defaultFor(options.name, this.id);
    this.orientation = utils.defaultFor(options.orientation, '+');
    this.seq = options.seq;
    this.color = options.color;
    this._features = new CGArray();
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
   * @private
   */
  static removeFeatures(features) {
    features = CGArray.arrayerize(features);
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
    if (!utils.validate(value, validKeys)) { return; }
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

  /**
   * @member {Color} - Get or set the color. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
   */
  get color() {
    return this._color;
  }

  set color(color) {
    if (color === undefined) {
      this._color = undefined;
    } else if (color.toString() === 'Color') {
      this._color = color;
    } else {
      this._color = new Color(color);
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
    return new CGRange(this.sequence.mapContig, this.lengthOffset + 1, this.lengthOffset + this.length);
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
   * @private
   */
  _updateLengthOffset(length) {
    this._lengthOffset = length;
    // this._mapRange = new CGV.CGRange(this.sequence.mapContig, length + 1, length + this.length);
  }

  /**
   * Reverse complement the sequence of this contig
   */
  reverseComplement() {
    return Sequence.reverseComplement(this.seq);
  }

  /**
   * Update contig [attributes](#attributes).
   * See [updating records](../docs.html#s.updating-records) for details.
   * @param {Object} attributes - Object describing the properties to change
   */
  update(attributes) {
    this.sequence.updateContigs(this, attributes);
  }

  /**
   * Returns true if this contig has a sequence
   */
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
   * Move this contig to a new index in the array of Sequence contigs.
   * @param {Number} newIndex - New index for this caption (0-based)
   */
  move(newIndex) {
    const currentIndex = this.sequence.contigs().indexOf(this);
    this.sequence.moveContig(currentIndex, newIndex);
  }

  /**
   * Zoom and pan map to show the contig
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

  /**
   * Reverse the orientations of the features on this contig
   * @private
   */
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

  /**
   * Return the sequence for a range on this contig
   * @param {Range} range - The range of the sequence
   * @param {Boolean} revComp - If true, returns the reverse complement sequence
   * @private
   */
  forRange(range, revComp) {
    return Sequence.forRange(this.seq, range, revComp);
  }

  /**
   * Returns sequence of this contig in fasta format
   */
  asFasta() {
    return `>${this.id}\n${this.seq}`;
  }

  /**
   * Highlight the contig.
   * @param {Color} color - Color of the highlight
   * @private
   */
  highlight(color) {
    const backbone = this.viewer.backbone;
    const canvas = this.viewer.canvas;
    const visibleRange = backbone.visibleRange;
    let highlightColor;
    if (color) {
      highlightColor = new Color(color);
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

  /**
   * Returns JSON representing the object
   */
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

export default Contig;


