//////////////////////////////////////////////////////////////////////////////
// Label Placement Angled
//////////////////////////////////////////////////////////////////////////////

import LabelPlacementDefault from './LabelPlacementDefault';
import Rect from './Rect';
import CGArray from './CGArray';
import utils from './Utils';


// Notes:
// - label.bp is where the label line will be on the map side
// - label.attachBp is where the label line will be on the label side
// - If needed we can sort by island size. Place bigger islands first (or other way around)
// Paul's max label anngles
// if (Math.abs(Math.sin(lineStartRadians)) > 0.70d) {
//     # if close to vertical
//     allowedRadiansDelta = (1.0d / 16.0d) * (2.0d * Math.PI);
// } else {
//     allowedRadiansDelta = (1.0d / 10.0d) * (2.0d * Math.PI);
// }
// When placement starts, we know the zoom level
// - determine max bp change based on zoom level 

/**
 *
 * Testing have labels angled way (fanned out) from each other
 *
 * @extends LabelPlacementDefault
 * @private
 */
class LabelPlacementAngled extends LabelPlacementDefault {

  /**
   * Create a new label placement instance
   * @param {Annotation} annotation - The CGView annotation object
   * @param {Object} options - ...
   */
  constructor(annotation, options = {}) {
    super(annotation, options);
    // this._debug = false;
    // this._debug = true;

    // Debuging labels
    // - add what to log when a label is clicked
    this.viewer.on('click', (e) => {
      if (e.elementType === 'label') {
        const label = e.element;
        console.log(`${label.name}: BP:${label.bp}, aBP:${label._attachBp}, D:${label._direction}, P:${label._popped}`)
        console.log(label._island)
        console.log(label)
      }
    });
  }

  /**
   * Place provided labels
   * @param {Array} labels - The labels to place.
   * @param {Number} outerOffset - Initial distance from the map for label rect placement (not including line length)
   * @param {Object} options - ...
   */
  placeLabels(labels, outerOffset) {
    this._debug && console.log('LABELS -----------------------------------------')
    const canvas = this.canvas;
    let label, bp, lineLength, overlappingRect;
    // this._outerOffset = outerOffset;
    this._rectOffsetWithoutLineLength = outerOffset + this._labelLineMarginInner + this._labelLineMarginOuter;

    // Sort labels by bp position
    labels.sort( (a, b) => a.bp - b.bp );

    // The approximate bp adjustment for the label ine to reach the given angle (Degrees)
    // const maxLineAngle = 45;
    const maxLineAngle = 80;
    this.maxBpAdjustment = this.maxBpAdjustForAngle(maxLineAngle)
    // Reduce angle for 6/12 attachments (maybe by half)

    // Reset label properties
    for (let i = 0, len = labels.length; i < len; i++) {
      label = labels[i];
      label._attachBp = label.bp;
      label._direction = 0; // 0: straight; -1: back; 1: forward;
      label._popped = false;
      label._placementIndex = i;
      // FIXME: assuming circle for now
      label._next = (i === len-1) ? labels[0] : labels[i+1]
      label._prev = (i === 0) ? labels[labels.length-1] : labels[i-1];

      // Default Rect for label
      const outerPt = canvas.pointForBp(label.bp, this.rectCenterOffset());
      const rectOrigin = utils.rectOriginForAttachementPoint(outerPt, label.lineAttachment, label.width, label.height);
      label._defaultRect = new Rect(rectOrigin.x, rectOrigin.y, label.width, label.height);
      label.rect = label._defaultRect;

      // Default maxBp Adjustment
      // Top/bottom labels will have half the max adjust
      label._maxBpAdjustment = [6,12].includes(label.lineAttachment) ? this.maxBpAdjustment / 2 : this.maxBpAdjustment;
    }

    // Find Initial Islands
    let islands = this.findIslands(labels);

    // Next step
    // - Find extent of islands based on angle of label line and position on map
    // - Find next attahcment point and check if it extends to far
    // - If it does then find maximum angle for last label in island and
    //
    // - HERE NOW
    //
    // - Island
    //  - method to get bp and attachp bp limits based on last labels
    //  - if extents reached, the island can no longer grow
    //   NEXT place labels inward from both sides until you reach the middle
    //  - keep list of labels not paced (need to be popped)
    //  - and method for length of popped labels

    // Place island labels
    // INITIAL PLACEMENT
    for (let islandIndex = 0, len = islands.length; islandIndex < len; islandIndex++) {
      const island = islands[islandIndex];
      island.placeLabels();
    }
    // MERGE ISALNDS
    // console.log('BEFORE', islands.length)
    islands = LabelIsland.mergeIslands(this, islands);
    // console.log('AFTER', islands.length)
    // FINAL PLACEMENT
    for (let islandIndex = 0, len = islands.length; islandIndex < len; islandIndex++) {
      const island = islands[islandIndex];
      island.placeLabels();
    }

    for (let labelIndex = 0, len = labels.length; labelIndex < len; labelIndex++) {
      const label = labels[labelIndex];
      if (label.rect) {
        label.attachementPt = label.rect.ptForClockPosition(label.lineAttachment);
      }
    }
  }

  // Initial pass for finding islands using the default rect for each label
  // - Islands occur when a label overlaps the next label which overlaps the next label and so on.
  findIslands(labels=[]) {
    let label, prevLabel;
    const islands = [];
    if (labels.length === 0) return islands;
    let  island = new LabelIsland(this, labels[0]);
    for (let labelIndex = 1, len = labels.length; labelIndex < len; labelIndex++) {
      label = labels[labelIndex];
      prevLabel = this._prevLabel(label);
      if (label._defaultRect.overlap([prevLabel._defaultRect])) {
        island.addLabels(label)
      } else {
        islands.push(island);
        island = new LabelIsland(this, label);
      }
    }
    // Add last island
    islands.push(island);
    // FIXME: if last label and first label overlap, the first and last islands must be merged
    return islands;
  }

  _nextLabel(label, direction=1) {
    return (direction >= 0) ? label._next : label._prev;
  }
  _prevLabel(label, direction=1) {
    return (direction >= 0) ? label._prev : label._next;
  }

  // Direction: 1 for forward, -1 for backward
  // Returns the attachPt for the next label. The point where the label line attaches to the next label.
  // AttachPt is the point on the rect that the line attaches to
  // Only works when the label overlaps with previous label
  // FIXME: NEED TO ADD MARGIN between rects
  // Coordinates:
  // - outerPtX/Y are on the canvas coordinates and refer to where on the label, the label line will attach.
  // - mapX/Y are on the map coordinates
  // Note the sign for map coordinates.
  // - when getting the sqrt of attachPt for 1,2,3,4,5: mapX is negative.
  // - when getting the sqrt of attachPt for 7,8,9,10,11: mapX is positive.
  _getNextAttachPt(label, direction=1) {
    const scale = this.viewer.scale;
    const goingForward = (direction > 0);
    // Distance from the map center to where the label rect will be attached
    const rectOffset = this.rectCenterOffset()
    const rectOffsetSquared = rectOffset*rectOffset;
    let outerPtX, outerPtY, mapY, mapX;
    let height = label.height;
    let width = label.width;
    const prevRect = this._prevLabel(label, direction)?.rect;
    // Return the default point for the label when their is no previous label to compare
    if (!prevRect) {
      console.log('NO PREV')
      return this.canvas.pointForBp(label.bp, rectOffset);
    }

    // Label Line Attachment Sites
    //  10,11       12       1,2
    //      \_______|_______/
    //   9 -|_______________|- 3
    //      /       |       \
    //  8,7         6        5,4
    switch (label.lineAttachment) {
      case 7:
      case 8:
        outerPtY = goingForward ? (prevRect.bottom + height) : prevRect.top;
        mapY = scale.y.invert(outerPtY);
        mapX = Math.sqrt( (rectOffsetSquared) - (mapY*mapY) );
        outerPtX = scale.x(mapX);
        break;
      case 9:
        outerPtY = goingForward ? (prevRect.bottom + (height/2)) : (prevRect.top - (height/2));
        mapY = scale.y.invert(outerPtY);
        mapX = Math.sqrt( (rectOffsetSquared) - (mapY*mapY) );
        outerPtX = scale.x(mapX);
        break;
      case 10:
      case 11:
        outerPtY = goingForward ? prevRect.bottom : (prevRect.top - height);
        mapY = scale.y.invert(outerPtY);
        mapX = Math.sqrt( (rectOffsetSquared) - (mapY*mapY) );
        outerPtX = scale.x(mapX);
        break;
      case 12:
        // Won't work for linear
        outerPtX = goingForward ? (prevRect.left - (width/2)) : (prevRect.right + (width/2));
        mapX = scale.x.invert(outerPtX);
        mapY = -Math.sqrt( (rectOffsetSquared) - (mapX*mapX) );
        outerPtY = scale.y(mapY);
        break;
      case 1:
      case 2:
        outerPtY = goingForward ? (prevRect.top - height) : prevRect.bottom;
        mapY = scale.y.invert(outerPtY);
        mapX = -Math.sqrt( (rectOffsetSquared) - (mapY*mapY) );
        outerPtX = scale.x(mapX);
        break;
      case 3:
        outerPtY = goingForward ? (prevRect.top - (height/2)) : (prevRect.bottom + (height/2));
        mapY = scale.y.invert(outerPtY);
        mapX = -Math.sqrt( (rectOffsetSquared) - (mapY*mapY) );
        outerPtX = scale.x(mapX);
        break;
      case 4:
      case 5:
        outerPtY = goingForward ? prevRect.top : (prevRect.bottom + height);
        mapY = scale.y.invert(outerPtY);
        mapX = -Math.sqrt( (rectOffsetSquared) - (mapY*mapY) );
        outerPtX = scale.x(mapX);
        break;
      case 6:
        // FIXME: Won't work for linear
        outerPtX = goingForward ? (prevRect.right + (width/2)) : (prevRect.left - (width/2));
        mapX = scale.x.invert(outerPtX);
        mapY = Math.sqrt( (rectOffsetSquared) - (mapX*mapX) );
        outerPtY = scale.y(mapY);
        break;
    }
    return {x: outerPtX, y: outerPtY};
  }

  /**
   * Approximate bp change between label line start (label.bp) and end (label._attachBp)
   * for the given angle in degrees.
   * Most accurate as the circle approaches looking like a line
   *                      bp
   *                      |  x - xDistance is top line from bp to attachBp
   *                      +----+ - attachBp
   *                      |   /
   *    labelLineLength - |  /
   *                      | /
   *                      v - angle
   * @param {Number} degrees - Label line angle
   */
  maxBpAdjustForAngle(degrees) {
    this.rectCenterOffset();
    // The distance (with no angle) from line start to line end
    const distanceBpToAttachBp = this.initialLabelLineLength;
    const radians = degrees * Math.PI/180
    // Find out xDistance for angle
    const xDistance = distanceBpToAttachBp * Math.tan(radians)
    // Convert to bp difference
    const startPt = this.canvas.pointForBp(1, this.rectCenterOffset());
    startPt.x += xDistance;
    const bpDiff = this.canvas.bpForPoint(startPt);
    this._debug && console.log(`BP Diff for angle ${degrees}°: ${bpDiff}`);
    return bpDiff
  }

}

export default LabelPlacementAngled;

//////////////////////////////////////////////////////////////////////////////
// Helper Classes
//////////////////////////////////////////////////////////////////////////////
class LabelIsland {

  constructor(labelPlacement, labels) {
    this.labelPlacement = labelPlacement;
    this._labels = [];
    this.canvas = labelPlacement.canvas;
    this.addLabels(labels);
  }

  static mergeIslands(labelPlacement, islands) {
    // place labels of curent isalnd and next island
    // do they clash
    // yes - merge and re-place island and try to merge again
    //  no - continue on



    const mergedIslands = [];
    let labelsToMerge = islands[0]?.labels;
    for (let islandIndex = 0, len = islands.length; islandIndex < len; islandIndex++) {
      const island = islands[islandIndex];
      const nextIndex = (islandIndex >= (len-1)) ? 0 : islandIndex + 1;
      const nextIsland = islands[nextIndex];
      if (island.clash(nextIsland)) {
        labelsToMerge = labelsToMerge.concat(nextIsland.labels);
      } else {
        mergedIslands.push(new LabelIsland(labelPlacement, labelsToMerge));
        labelsToMerge = nextIsland.labels;
      }
    }
    return mergedIslands;
  }

  get labels() {
    return this._labels;
  }

  get length() {
    return this.labels.length;
  }

  get single() {
    return this.labels.length === 1;
  }

  get firstLabel() {
    return this.labels[0];
  }

  get lastLabel() {
    return this.labels[this.labels.length-1];
  }

  // Add a label or an array of labels
  addLabels(labels) {
    if (labels) {
      if (Array.isArray(labels)) {
        // Labels is an array of labels
        this._labels = this._labels.concat(labels);
        for (const label of labels) {
          label._island = this;
        }
      } else {
        // Labels is a single label
        this._labels.push(labels);
        labels._island = this;
      }
    }
  }

  // Find middle label and adjust outward from there.
  // We know that the labels on each side overlaps and so on
  placeLabels() {
    let forwardMaxAngleReached, backwardMaxAngleReached;
    if (!this.single) {
      // Basic placement
      const centerIndex = Math.floor((this.length-1) / 2);
      forwardMaxAngleReached = this.adjustLabels(centerIndex, 1);
      backwardMaxAngleReached = this.adjustLabels(centerIndex, -1);
    }
    // Not enough room, find labels to pop
    if (forwardMaxAngleReached || backwardMaxAngleReached) {
      // Place labels with max angle until labels overlap again
      this.placeWithMaxAngle();
      // Place remaining labels as popped
      // this.placePoppedLabels();
    }
  }

  adjustLabels(centerIndex, direction) {
    const canvas = this.canvas;
    for (let i = centerIndex+direction, len = this.labels.length; (direction > 0) ? i < len : i >= 0; i+=direction) {
      const label = this.labels[i];
      let labelAttachPt = this.labelPlacement._getNextAttachPt(label, direction);
      // Before getting rect, check if line angle is too large
      let attachBp = canvas.bpForPoint(labelAttachPt);
      // This may be different for different labels based on clock position
      // const maxBpAdjustment = [6,12].includes(label.lineAttachment) ?
      //   this.labelPlacement.maxBpAdjustment / 2 :
      //   this.labelPlacement.maxBpAdjustment;


      // If max bp adjustemnt is reached, return so labels can be placed from the outside inward
      if (Math.abs(attachBp - label.bp) > label._maxBpAdjustment) {
        return true;
      }
      // TODO: MERGING ISLANDS
      // - check if we overlap with next island
      // - decide whether to merge or not

      this.adjustLabelWithAttachPt(label, labelAttachPt);
    }
  }

  // Set the first and last label to their maximum angle and place labels
  // inwards from there until the labels overlap. Return the overlapping
  // labels and the remaining unplaced labels.
  placeWithMaxAngle() {
    const canvas = this.canvas;
    let forwardIndex, backwardIndex, backLabel, frontLabel;
    this.adjustLabelToMaxAngle(this.firstLabel, -1);
    this.adjustLabelToMaxAngle(this.lastLabel, 1);
    for (let i = 1, len = this.labels.length; i < len; i++) {
      forwardIndex = i;
      backwardIndex = len - 1 - i;
      if (forwardIndex >= backwardIndex) {
        // Reached the middle
        // console.log('MIDDLE', forwardIndex, backwardIndex)
        // May need to do some final adjustments with the middle labels
        return;
      }
      backLabel = this.labels[forwardIndex];
      frontLabel = this.labels[backwardIndex];
      this.adjustLabelToNextAttachPt(backLabel, 1);
      this.adjustLabelToNextAttachPt(frontLabel, -1);
      // FIXME: test with "clash" instead of overlap (when i have a clash method)
      if (backLabel.rect.overlap([frontLabel.rect])) {
        // Return the current label indices as the limits of popping labels
        console.log('overlap', forwardIndex, backwardIndex);
        this.poppedStartIndex = forwardIndex;
        this.poppedStopIndex = backwardIndex;
        return;
      }
    }
  }

  // TODO: proper popping label placement
  // - For now just extend line length until there is no overlap
  // - Future:
  //  - angle popped labels based on the inner labels, that were not popped
  placePoppedLabels() {
    let label, bp, lineLength, overlappingRect;
    const placedRects = [];
    for (let i = this.poppedStartIndex; i <= this.poppedStopIndex; i++) {
      label = this.labels[i];
      bp = label.bp;
      lineLength = this.labelPlacement.initialLabelLineLength;
      do {
        const outerPt = this.canvas.pointForBp(bp, this.labelPlacement.rectCenterOffset(lineLength));
        this.adjustLabelWithAttachPt(label, outerPt);
        // FIXME: need label rect of island and more??
        overlappingRect = label.rect.overlap(placedRects);
        lineLength += label.height;
      } while (overlappingRect);
      placedRects.push(label.rect);
    }
  }

  // Adjust label to the next closest position from the previous label
  adjustLabelToNextAttachPt(label, direction) {
    let labelAttachPt = this.labelPlacement._getNextAttachPt(label, direction);
    this.adjustLabelWithAttachPt(label, labelAttachPt);
  }

  // Adjust label, to the given attachment point
  adjustLabelWithAttachPt(label, labelAttachPt) {
    const rectOrigin = utils.rectOriginForAttachementPoint(labelAttachPt, label.lineAttachment, label.width, label.height);
    label.rect = new Rect(rectOrigin.x, rectOrigin.y, label.width, label.height);
    label._attachBp = this.canvas.bpForPoint(labelAttachPt);
  }

  // Adjust label, so that is label line is at the maximum allowed angle
  adjustLabelToMaxAngle(label, direction) {
    // const maxBpAdjustment = this.labelPlacement.maxBpAdjustment;
    const maxBpAdjustment = label._maxBpAdjustment;
    const labelAttachPt = this.canvas.pointForBp(label.bp + (direction * maxBpAdjustment), this.labelPlacement.rectCenterOffset());
    this.adjustLabelWithAttachPt(label, labelAttachPt);
  }

  // Looking Forward
  clash(island) {
    return this.labelsClash(this.lastLabel, island.firstLabel);
  }

  labelsClash(label1, label2) {
    const rectsOverlap = label1.rect.overlap([label2.rect]);
    const linesCross = (label1.bp < label2.bp) ? (label1._attachBp > label2._attachBp) : (label1._attachBp < label2._attachBp);
    return (rectsOverlap || linesCross);
  }

  // merge(island) {
  //   this._labels = this._labels.concat(island.labels);
  //   // TODO: may need to resort but maybe not if we only go forward
  // }

}

