//////////////////////////////////////////////////////////////////////////////
// Label Placement Default
//////////////////////////////////////////////////////////////////////////////

import Rect from './Rect';
import CGArray from './CGArray';
import utils from './Utils';

/**
 * LabelPlacementDefault is the default method to find where to place feature
 * [Labels](Label.html) on the map. LabelPlacementDefault is used by
 * [Annotation](Annotation.html) before drawing [feature](Feature.html) names
 * on the map.
 *
 * The default method, only uses straight lines perpendicular to the map and
 * stacks them as necessary to avoid collisions.
 *
 * This class can be extended to provide new ways to place labels.
 *
 * TODO:
 * - How to change method within Annotation and Viewer?
 *   - Annotation can use 2 different classes. One for fast and one for full.
 *   - The default will be to use the same instance of LabelPlacementDefault for both.
 * - What is requires by the class
 *   - array of labels
 *   - access to annotation and viewer object
 *   - some defualt constants: ...
 * - What should class do
 *   - for each label
 *     - add rect
 *     - attchement point?
 *     - bp and tbp????
 *
 * @private
 */
class LabelPlacementDefault {

  /**
   * Create a new label placement instance
   * @param {Annotation} annotation - The CGView annotation object
   * @param {Object} options - ...
   */
  constructor(annotation, options = {}) {
    this._annotation = annotation;
    this._initialLabelLineLength = annotation._labelLineLength;
    this._labelLineMarginInner = annotation._labelLineMarginInner;
    this._labelLineMarginOuter = annotation._labelLineMarginOuter;
  }

  /**
   * @member {Viewer} - Get the *Viewer*
   */
  get viewer() {
    return this.annotation.viewer;
  }

  /**
   * @member {Annotation} - Get the *Annotation*
   */
  get annotation() {
    return this._annotation;
  }

  /**
   * @member {Canvas} - Get the *Canvas*
   */
  get canvas() {
    return this.viewer.canvas;
  }

  /**
   * @member {Number} - Get the initial line length for labels.
   */
  get initialLabelLineLength() {
    return this._initialLabelLineLength;
  }


  /**
   * Return the distance from the map center to where the label rect should be placed.
   * If lineLength is provided it will be included in the calculation, otherwise,
   * the deafult labelLineLength will be used.
   * @param {Number} lineLength - Length of the label line
   * @return {Number} - Distance from map center ot where label rect should be placed.
   */
  rectCenterOffset(lineLength) {
    return this._rectOffsetWithoutLineLength + (lineLength ? lineLength : this.initialLabelLineLength)
  }

  /**
   * Place provided labels.
   *
   * Override this method is subclasses.
   *
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

export default LabelPlacementDefault;

