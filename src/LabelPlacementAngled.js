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
  }

  /**
   * Place provided labels
   * @param {Array} labels - The labels to place.
   // * @param {Number} rectOffset - Initial distance from the map for label rect placement.
   * @param {Object} options - ...
   */
  placeLabels(labels, outerOffset) {
    const canvas = this.canvas;
    let label, bp, lineLength, overlappingRect;
    this._rectOffsetWithoutLineLength = outerOffset + this._labelLineMarginInner + this._labelLineMarginOuter;

    const placedRects = new CGArray();
    for (let i = 0, len = labels.length; i < len; i++) {
      label = labels[i];
      bp = label.bp;
      lineLength = this.initialLabelLineLength;
      do {
        const outerPt = canvas.pointForBp(bp, this.rectCenterOffset(lineLength));
        const rectOrigin = utils.rectOriginForAttachementPoint(outerPt, label.lineAttachment, label.width, label.height);
        label.rect = new Rect(rectOrigin.x, rectOrigin.y, label.width, label.height);
        overlappingRect = label.rect.overlap(placedRects);
        lineLength += label.height;
      } while (overlappingRect);
      placedRects.push(label.rect);
      label.attachementPt = label.rect.ptForClockPosition(label.lineAttachment);
    }
  }


}

export default LabelPlacementAngled;

