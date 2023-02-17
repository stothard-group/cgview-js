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
    this._debug = false;

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
    this._rectOffsetWithoutLineLength = outerOffset + this._labelLineMarginInner + this._labelLineMarginOuter;

    // Sort labels by bp position
    labels.sort( (a, b) => a.bp - b.bp );

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
    }

    // Find Initial Islands
    const islands = this.findIslands(labels);
    // console.log(islands)

    // Place island labels
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
        island.addLabel(label)
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
    // console.log(prevRect)

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

}

export default LabelPlacementAngled;

//////////////////////////////////////////////////////////////////////////////
// Helper Classes
//////////////////////////////////////////////////////////////////////////////
class LabelIsland {

  constructor(labelPlacement, label) {
    this.labelPlacement = labelPlacement;
    this._labels = [];
    if (label) {
      this.addLabel(label);
    }
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

  addLabel(label) {
    this._labels.push(label);
    label._island = this;
  }

  // Find middle label and adjust outward from there.
  // We know that the labels on each side overlaps and so on
  placeLabels() {
    if (!this.single) {
      const centerIndex = Math.floor((this.length-1) / 2);
      this.adjustLabels(centerIndex, 1);
      this.adjustLabels(centerIndex, -1);
    }
  }

  adjustLabels(centerIndex, direction) {
    for (let i = centerIndex+direction, len = this.labels.length; (direction > 0) ? i < len : i >= 0; i+=direction) {
      const label = this.labels[i];
      const labelAttachPt = this.labelPlacement._getNextAttachPt(label, direction);
      const rectOrigin = utils.rectOriginForAttachementPoint(labelAttachPt, label.lineAttachment, label.width, label.height);
      label.rect = new Rect(rectOrigin.x, rectOrigin.y, label.width, label.height);
      // label._attachBp = canvas.bpForPoint(labelAttachPt);
    }
  }

}

