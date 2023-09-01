//////////////////////////////////////////////////////////////////////////////
// Slot
//////////////////////////////////////////////////////////////////////////////

import CGObject from './CGObject';
import CGArray from './CGArray';
import NCList from './NCList';
import utils from './Utils';

/**
 * A Slot is a single ring on the Map.
 *
 * @extends CGObject
 */
class Slot extends CGObject {

  /**
   * Slot
   */
  constructor(track, data = {}, meta = {}) {
    super(track.viewer, data, meta);
    this.track = track;
    this._strand = utils.defaultFor(data.strand, 'direct');
    this._features = new CGArray();
    this._plot;
    this.refresh();
  }

  /**
   * Return the class name as a string.
   * @return {String} - 'Slot'
   */
  toString() {
    return 'Slot';
  }

  /** * @member {Track} - Get the *Track*
   */
  get track() {
    return this._track;
  }

  set track(track) {
    if (this.track) {
      // TODO: Remove if already attached to Track
    }
    this._track = track;
    track._slots.push(this);
  }

  /** * @member {String} - Get the Track Type
   */
  get type() {
    return this.track.type;
  }

  /** * @member {Layout} - Get the *Layout*
   */
  get layout() {
    return this.track.layout;
  }

  /**
   * @member {String} - Get the position of the slot in relation to the backbone
   */
  get position() {
    if (this.track.position === 'both') {
      return (this.isDirect() ? 'outside' : 'inside');
    } else {
      return this.track.position;
    }
  }

  /** * @member {String} - Get the *Track* drawOrder
   */
  get drawOrder() {
    return this._track.drawOrder;
  }

  /** * @member {Boolean} - Return true if drawing by score
   */
  get drawByScore() {
    return this.drawOrder === 'score';
  }

  /**
   * @member {Boolean} - Is the slot position inside the backbone
   */
  get inside() {
    return this.position === 'inside';
  }

  /**
   * @member {Boolean} - Is the slot position outside the backbone
   */
  get outside() {
    return this.position === 'outside';
  }

  /**
   * @member {Viewer} - Get or set the track size as a proportion of the map thickness 
   * @private
   */
  get proportionOfMap() {
    return this._proportionOfMap;
  }

  set proportionOfMap(value) {
    this._proportionOfMap = value;
  }

  /**
   * @member {Viewer} - Get the track size as a ratio to all other tracks
   * @private
   */
  get thicknessRatio() {
    return this.track.thicknessRatio;
  }

  /**
   * @member {Number} - Get the current offset of the center of the slot from the backbone.
   */
  get bbOffset() {
    return this._bbOffset;
  }

  /**
   * @member {Number} - Get the current center offset of the center of the slot.
   */
  get centerOffset() {
    return this.bbOffset + this.viewer.backbone.adjustedCenterOffset;
  }

  /**
   * @member {Number} - Get the current thickness of the slot.
   */
  get thickness() {
    return this._thickness;
  }


  get strand() {
    return this._strand;
  }

  isDirect() {
    return this.strand === 'direct';
  }

  isReverse() {
    return this.strand === 'reverse';
  }

  get hasFeatures() {
    return this._features.length > 0;
  }

  get hasPlot() {
    return this._plot;
  }

  features(term) {
    return this._features.get(term);
  }

  replaceFeatures(features) {
    this._features = features;
    this.refresh();
  }

  /**
   * The number of pixels per basepair along the feature track circumference.
   * @return {Number}
   * @private
   */
  pixelsPerBp() {
    return this.layout.pixelsPerBp(this.centerOffset);
  }

  // Refresh needs to be called when new features are added, etc
  refresh() {
    this._featureNCList = new NCList(this._features, {circularLength: this.sequence.length, startProperty: 'mapStart', stopProperty: 'mapStop'});
  }

  /**
   * Get the visible range
   * @member {Range}
   */
  get visibleRange() {
    return this._visibleRange;
  }

  /**
   * Does the slot contain the given *centerOffset*.
   * @param {Number} offset - The centerOffset.
   * @return {Boolean}
   */
  containsCenterOffset(offset) {
    const halfthickness = this.thickness / 2;
    return (offset >= (this.centerOffset - halfthickness)) && (offset <= (this.centerOffset + halfthickness));
  }

  /**
   * Return the first feature in this slot that contains the given bp.
   * @param {Number} bp - the position in bp to search for.
   * @return {Feature}
   */
  findFeaturesForBp(bp) {
    return this._featureNCList.find(bp);
  }

  findLargestFeatureLength() {
    let length = 0;
    let nextLength;
    for (let i = 0, len = this._features.length; i < len; i++) {
      nextLength = this._features[i].length;
      if (nextLength > length) {
        length = nextLength;
      }
    }
    return length;
  }

  clear() {
    const range = this._visibleRange;
    if (range) {
      const centerOffset = this.centerOffset;
      const slotThickness = this.thickness;
      const ctx = this.canvas.context('map');
      ctx.globalCompositeOperation = 'destination-out'; // The existing content is kept where it doesn't overlap the new shape.
      this.canvas.drawElement('map', range.start, range.stop, centerOffset, 'white', slotThickness);
      ctx.globalCompositeOperation = 'source-over'; // Default
    }
  }

  highlight(color = '#FFB') {
    const range = this._visibleRange;
    if (range && this.visible) {
      const centerOffset = this.centerOffset;
      const slotThickness = this.thickness;
      this.canvas.drawElement('background', range.start, range.stop, centerOffset, color, slotThickness);
    }
  }

  draw(canvas, fast) {
    const slotCenterOffset = this.centerOffset;
    const slotThickness = this.thickness;
    const range = canvas.visibleRangeForCenterOffset(slotCenterOffset, slotThickness);
    this._visibleRange = range;
    if (range) {
      const start = range.start;
      const stop = range.stop;
      if (this.hasFeatures) {
        let featureCount = this._features.length;
        if (!range.isMapLength()) {
          featureCount = this._featureNCList.count(start, stop);
        }
        let step = 1;
        // Change step if drawing fast and there are too many features
        if (fast && featureCount > this.layout.fastFeaturesPerSlot) {
          // Use a step that is rounded up to the nearest power of 2
          // This combined with eachFromRange altering the start index based on the step
          // means that as we zoom, the visible features remain consistent.
          // e.g. When zooming all the features visible at a step of 16
          // will be visible when the step is 8 and so on.
          const initialStep = Math.ceil(featureCount / this.layout.fastFeaturesPerSlot);
          step = utils.base2(initialStep);
        }
        const showShading = fast ? false : undefined;
        // When drawing shadows, draw in reverse order to make them look better
        if (this.viewer.settings.showShading && this.isDirect()) { step *= -1; }

        // Draw Features
        if (this.drawByScore) {
          // Special case where we draw with features sorted by score (draw highest score last)
          const sortedFeatures = this._featureNCList.find(start, stop, step).sort((a, b) => (a.score - b.score) || (a.length - b.length) );
          for (const feature of sortedFeatures) {
            feature.draw('map', slotCenterOffset, slotThickness, range, {showShading: showShading});
          }
        } else {
          // Draw by position (more efficient)
          this._featureNCList.run(start, stop, step, (feature) => {
            feature.draw('map', slotCenterOffset, slotThickness, range, {showShading: showShading});
          });
        }

        // Debug
        if (this.viewer.debug && this.viewer.debug.data.n) {
          const index = this.viewer.slots().indexOf(this);
          this.viewer.debug.data.n[`slot_${index}`] = featureCount;
        }
      } else if (this.hasPlot) {
        this._plot.draw(canvas, slotCenterOffset, slotThickness, fast, range);
      }
    }
  }

  drawProgress(progress) {
    const canvas = this.canvas;
    const centerOffset = this.centerOffset;
    const slotThickness = this.thickness;
    const range = this._visibleRange;
    // Draw progress like thickening circle
    if (progress > 0 && progress < 100 && range) {
      const thickness = slotThickness * progress / 100;
      canvas.drawElement('background', range.start, range.stop, centerOffset, '#EAEAEE', thickness, 'arc', false);
    }
  }

  /**
   * Remove a feature or array of features from the slot.
   * @param {Feature|Array} features - The Feature(s) to remove.
   * @private
   */
  removeFeatures(features) {
    features = (features.toString() === 'CGArray') ? features : new CGArray(features);
    this._features = this._features.filter( f => !features.includes(f) );
    this.refresh();
  }

  /**
   * Remove the plot from the slot.
   * @private
   */
  removePlot() {
    this._plot = undefined;
    this.refresh();
  }


}

export default Slot;


