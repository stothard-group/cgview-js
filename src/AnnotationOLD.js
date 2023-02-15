//////////////////////////////////////////////////////////////////////////////
// Annotation
//////////////////////////////////////////////////////////////////////////////

import CGObject from './CGObject';
import CGArray from './CGArray';
import Font from './Font';
import Color from './Color';
import NCList from './NCList';
import Rect from './Rect';
import utils from './Utils';

/**
 * Annotation controls the drawing and layout of features labels
 *
 * ### Action and Events
 *
 * Action                                    | Viewer Method                        | Annotation Method   | Event
 * ------------------------------------------|--------------------------------------|---------------------|-----
 * [Update](../docs.html#s.updating-records) | -                                    | [update()](#update) | annotation-update
 * [Read](../docs.html#s.reading-records)    | [annotation](Viewer.html#annotation) | -                   | -
 *
 * <a name="attributes"></a>
 * ### Attributes
 *
 * Attribute                        | Type      | Description
 * ---------------------------------|-----------|------------
 * [font](#font)                    | String    | A string describing the font [Default: 'monospace, plain, 12']. See {@link Font} for details.
 * [color](#color)                  | String   | A string describing the color [Default: undefined]. If the color is undefined, the legend color for the feature will be used. See {@link Color} for details.
 * [onlyDrawFavorites](#onlyDrawFavorites) | Boolean   | Only draw labels for features that are favorited [Default: false]
 * [visible](CGObject.html#visible) | Boolean   | Labels are visible [Default: true]
 * [meta](CGObject.html#meta)       | Object    | [Meta data](tutorial-meta.html) for Annotation
 *
 * ### Examples
 * ```js
 * cgv.annotation.update({
 *   onlyDrawFavorites: true
 * });
 * ```
 *
 * @extends CGObject
 */
class Annotation extends CGObject {

  /**
   * Create the annotation.
   * @param {Viewer} viewer - The viewer
   * @param {Object} options - [Attributes](#attributes) used to create the annotation
   * @param {Object} [meta] - User-defined [Meta data](../tutorials/details-meta-data.html) to add to the annotation.
   */
  constructor(viewer, options = {}, meta = {}) {
    super(viewer, options, meta);
    this._labels = new CGArray();
    this.font = utils.defaultFor(options.font, 'monospace, plain, 12');
    this.labelLineLength = utils.defaultFor(options.labelLineLength, 20);
    this.priorityMax = utils.defaultFor(options.priorityMax, 50);
    this._labelLineMarginInner = 10;
    this._labelLineMarginOuter = 5; // NOT REALLY IMPLEMENTED YET
    this._labelLineWidth = 1;
    this.refresh();
    this._visibleLabels = new CGArray();
    this.color = options.color;
    this.lineCap = 'round';
    this.onlyDrawFavorites = utils.defaultFor(options.onlyDrawFavorites, false);

    this.viewer.trigger('annotation-update', { attributes: this.toJSON({includeDefaults: true}) });

    // this._debug = true;
  }

  /**
   * Return the class name as a string.
   * @return {String} - 'Annotation'
   */
  toString() {
    return 'Annotation';
  }

  /**
   * @member {Color} - Get or set the label color. When setting the color, a
   * string representing the color or a {@link Color} object can be used. For
   * details see {@link Color}.
   */
  get color() {
    return this._color;
  }

  set color(value) {
    if (value === undefined || value.toString() === 'Color') {
      this._color = value;
    } else {
      this._color = new Color(value);
    }
  }

  /**
   * @member {Number} - Get or set the label line length.
   */
  get labelLineLength() {
    return this._labelLineLength;
  }

  set labelLineLength(value) {
    this._labelLineLength = value;
  }

  /**
   * @member {Number} - Get or set the number of priority labels that will be
   * drawn for sure. If they overlap the label will be moved until they no
   * longer overlap. Priority is defined as features that are marked as a
   * "favorite". After favorites, features are sorted by size. For example, if
   * priorityMax is 50 and there are 10 "favorite" features. The favorites will
   * be drawn and then the 40 largest features will be drawn.
   */
  get priorityMax() {
    return this._priorityMax;
  }

  set priorityMax(value) {
    this._priorityMax = value;
  }

  /**
   * @member {Font} - Get or set the font. When setting the font, a string
   * representing the font or a {@link Font} object can be used. For details
   * see {@link Font}.
   */
  get font() {
    return this._font;
  }

  set font(value) {
    if (value.toString() === 'Font') {
      this._font = value;
    } else {
      this._font = new Font(value);
    }
    this.refreshLabelWidths();
    // FIXME: can we use update to do this??
    this._font.on('change', () => this.refreshLabelWidths());
  }

  /**
   * @member {Number} - The number of labels in the set.
   */
  get length() {
    return this._labels.length;
  }

  /**
   * Returns an [CGArray](CGArray.html) of Labels or a single Label.
   * @param {Integer|String|Array} term - See [CGArray.get](CGArray.html#get) for details.
   * @return {CGArray}
   */
  labels(term) {
    return this._labels.get(term);
  }

  /**
   * Add a new label to the set.
   * @param {Label} label - The Label to add to the set.
   */
  addLabel(label) {
    this._labels.push(label);
  }

  /**
   * Remove a label or an array of labels from the set.
   * @param {Label|Array} labels - The Label(s) to remove from the set.
   */
  removeLabels(labels) {
    labels = (labels.toString() === 'CGArray') ? labels : new CGArray(labels);
    this._labels = this._labels.filter( i => !labels.includes(i) );
    this.refresh();
  }

  // Called from Viewer.add/removeFeatures() and Sequence.updateContigs(), Viewer.updateFeatures(), Viewer.updateTracks()
  refresh() {
    // Remove labels that are on invisible contigs
    // const labels = this._labels.filter( (l) => l.feature.contig.visible);

    // Remove labels:
    // - on invisible features
    // - with features on invisible contigs
    // - with features on invisible tracks
    const labels = this._labels.filter( (l) => l.feature.visible && l.feature.contig.visible && l.feature.tracks().some( (t) => t.visible ));

    this._availableLabels = labels;
    // Update default Bp for labels
    for (const label of labels) {
      label.bpDefault = label.feature.mapRange.middle;
    }
    this._labelsNCList = new NCList(labels, { circularLength: this.sequence.length, startProperty: 'mapStart', stopProperty: 'mapStop'});
  }

  refreshLabelWidths() {
    const labelFonts = this._labels.map( i => i.font.css );
    const labelTexts = this._labels.map( i => i.name );
    const labelWidths = Font.calculateWidths(this.canvas.context('map'), labelFonts, labelTexts);
    for (let i = 0, len = this._labels.length; i < len; i++) {
      this._labels[i].width = labelWidths[i];
    }
  }

  // Determine basepair position for each label.
  // This will just be the center of the feature,
  // unless the the whole feature is not visible.
  _calculatePositions(labels) {
    labels = labels || this._labels;
    const visibleRange = this._visibleRange;
    let label, feature, containsStart, containsStop;
    let featureLengthDownStream, featureLengthUpStream;
    const sequence = this.sequence;
    for (let i = 0, len = labels.length; i < len; i++) {
      label = labels[i];
      feature = label.feature;
      containsStart = visibleRange.containsMapBp(feature.mapStart);
      containsStop = visibleRange.containsMapBp(feature.mapStop);
      if (containsStart && containsStop) {
        label.bp = label.bpDefault;
        label.lineAttachment = label.lineAttachmentDefault;
        // console.log(label.lineAttachment)
      } else {
        if (containsStart) {
          label.bp = feature.mapRange.getStartPlus( sequence.lengthOfRange(feature.mapStart, visibleRange.stop) / 2 );
        } else if (containsStop) {
          label.bp = feature.mapRange.getStopPlus( -sequence.lengthOfRange(visibleRange.start, feature.mapStop) / 2 );
        } else {
          featureLengthDownStream = sequence.lengthOfRange(visibleRange.stop, feature.mapStop);
          featureLengthUpStream = sequence.lengthOfRange(feature.mapStart, visibleRange.start);
          const halfVisibleRangeLength = visibleRange.length / 2;
          const center = visibleRange.start + halfVisibleRangeLength;
          if (featureLengthUpStream > featureLengthDownStream) {
            label.bp = center + (halfVisibleRangeLength * featureLengthDownStream / (featureLengthDownStream + featureLengthUpStream));
          } else {
            label.bp = center + (halfVisibleRangeLength * featureLengthUpStream / (featureLengthDownStream + featureLengthUpStream));
          }
        }
        // Calculate where the label line should attach to Label.
        // The attachemnt point should be the opposite clock position of the feature.
        // This might need to be recalculated of the label has moved alot
        label.lineAttachment = this.viewer.layout.clockPositionForBp(label.bp, true);
      }
    }
  }

  // Calculates non overlapping rects for priority labels
  // ORIGINAL (Fast)
  _calculatePriorityLabelRectsFast(labels) {
    labels = labels || this._labels;
    const canvas = this.canvas;
    let label, bp, lineLength, overlappingRect;
    const centerOffset = this._outerCenterOffset + this._labelLineMarginInner;
    const placedRects = new CGArray();
    for (let i = 0, len = labels.length; i < len; i++) {
      label = labels[i];
      bp = label.bp;
      lineLength = this.labelLineLength;
      do {
        const outerPt = canvas.pointForBp(bp, centerOffset + lineLength + this._labelLineMarginOuter);
        const rectOrigin = utils.rectOriginForAttachementPoint(outerPt, label.lineAttachment, label.width, label.height);
        label.rect = new Rect(rectOrigin.x, rectOrigin.y, label.width, label.height);
        overlappingRect = label.rect.overlap(placedRects);
        lineLength += label.height;
      } while (overlappingRect);
      placedRects.push(label.rect);
      label.attachementPt = label.rect.ptForClockPosition(label.lineAttachment);
    }
  }

  _calculatePriorityLabelRects(labels) {
    const labelLimit = 20;
    if (!this._fastDraw || labels.length < labelLimit) {
      this._calculatePriorityLabelRectsFull(labels);
    } else {
      // this._calculatePriorityLabelRectsFast(labels);
      this._calculatePriorityLabelRectsFull(labels);
    }

  }

  _calculatePriorityLabelRectsFull(labels) {
    this._debug && console.log('PRIORITY LABELS -----------------------------------------')
    labels = labels || this._labels;
    const canvas = this.canvas;
    let label, bp, lineLength, overlap, prevLabel, overlappingRect;
    const centerOffset = this._outerCenterOffset + this._labelLineMarginInner;
    // const placedRects = new CGArray();
    const placedLabels = new CGArray();

    // Sort labels
    labels.sort( (a, b) => a.bp - b.bp );
    // console.log(labels)

    // length of pixel in bp times the label height
    // Using 20 but this would come from the label height
    // TODO: adjust to proper radius of (right now it's the backbone by default
    const bpAdustIncrement = 1 / this.viewer.layout.pixelsPerBp() / 2;
    // console.log(`BP Adjust Increment: ${bpAdustIncrement}`)

    // let overlap = false;
    let loop_count = 1;
    for (let i = 0, len = labels.length; i < len; i++) {
      label = labels[i];
      label._tbp = label.bp;
      label._lineLength = this.labelLineLength;
      label._angle = 0; // 0: straight; -1: back; 1: forward;
    }

    const maxBpAdjustment = this.sequence.length / 20;
    // const maxBpAdjustment = this.sequence.length / 10;
        // // PAUL
        // //if close to vertical (angle more up/down ie top/bottom of map)
        // if (Math.abs(Math.sin(lineStartRadians)) > 0.70d) {
        //     allowedRadiansDelta = (1.0d / 16.0d) * (2.0d * Math.PI);
        // } else {
        //     allowedRadiansDelta = (1.0d / 10.0d) * (2.0d * Math.PI);
        // }
    // const centerOffset = this._outerCenterOffset + this._labelLineMarginInner;
    // const outerPt = canvas.pointForBp(label.bp, centerOffset + this.labelLineLength + this._labelLineMarginOuter);

    // const labelLineCenterOffsetStart = this._outerCenterOffset + this._labelLineMarginInner;
    // // DOES NOT CHANGE UNLESS POPPED
    // const labelLineCenterOffsetStop = labelLineCenterOffsetStart + this.labelLineLength + this._labelLineMarginOuter);
    // Max BP Adjustment
    // HAS TO BE LAYOUT SPECIFIC
    // const Math.acos(labelLineCenterOffsetStart / labelLineCenterOffsetStop);


    // const rectOrigin = utils.rectOriginForAttachementPoint(outerPt, label.lineAttachment, label.width, label.height);
    // label.rect = new Rect(rectOrigin.x, rectOrigin.y, label.width, label.height);
    // bp = canvas.bpForPoint({x: outerPtX, y: outerPtY});
    // Extract above to method
    // - should return outerPt 
    //
    // Then have method to take outerPt, label and return new rect
      // const rectOrigin = utils.rectOriginForAttachementPoint(outerPt, label.lineAttachment, label.width, label.height);
      // label.rect = new Rect(rectOrigin.x, rectOrigin.y, label.width, label.height);



    // const DO_MAX = 1000;
    // let prevIndex;

    // Place first label
    label = labels[0];
    if (!label) {return}

    // const outerPt = canvas.pointForBp(label.bp, centerOffset + this.labelLineLength + this._labelLineMarginOuter);
    // const rectOrigin = utils.rectOriginForAttachementPoint(outerPt, label.lineAttachment, label.width, label.height);
    // label.rect = new Rect(rectOrigin.x, rectOrigin.y, label.width, label.height);
    // label.attachementPt = label.rect.ptForClockPosition(label.lineAttachment);
    // placedLabels.push(label);

    for (let labelIndex = 0, len = labels.length; labelIndex < len; labelIndex++) {
      const { startIndex, stopIndex } = this._placeIslandLabels(labels, labelIndex, placedLabels);
      labelIndex = stopIndex; // index will increment next loop
    }

    // NOTE: get rid of these attachmentPt lines in the rest of the code. DO IT HERE only
    for (let labelIndex = 0, len = labels.length; labelIndex < len; labelIndex++) {
      const label = labels[labelIndex];
      // label.attachementPt = label.rect.ptForClockPosition(label.lineAttachment);
      if (label.rect) {
        label.attachementPt = label.rect.ptForClockPosition(label.lineAttachment);
      }
    }

  }

  // Island of one has to be straight and marked as so
  // When going back, you can add labels if they IOO.
  // Instead of moving by a bp amount, find the next rantangle that would fit by
  // line height. Would work until near top/bottom. Then actually figure out the
  // next rect whether it top/bottom or left/right. => CRICLE MATH

  _placeIslandLabels(labels, startIndex, placedLabels) {
    const canvas = this.canvas;

    const MAX_LOOPS = 100;
    const centerOffset = this._outerCenterOffset + this._labelLineMarginInner;

    // FIX: 
    const rectsToCheck = placedLabels.map( l => l.rect ).filter( i => i);
    const bpAdustIncrement = 1 / this.viewer.layout.pixelsPerBp() / 2;
    // Need to determine from visible range as well
    const maxBpAdjustment = Math.min(
      // (this.sequence.length / 20),
      (this.sequence.length / 50),
      (this._visibleRange.length / 6)
    );
    let totalBpAdjustment;
    let maxBpAdjustmentReached;

    let label, bp, prevLabel, overlap, stopIndex, popRequired;

    for (let labelIndex = startIndex, len = labels.length; labelIndex < len; labelIndex++) {
      popRequired = false;
      label = labels[labelIndex];
      bp = label._tbp; // _tbp will become _attachBp
      prevLabel = labels[labelIndex-1];
      // const prevIndex = (labelIndex === 0) ? len-1 : labelIndex-1;
      // prevLabel = labels[prevIndex];
      const lineLength = this.labelLineLength; // 
      let loop = 0;

      // do {
      //   loop++;
			// 	label._tbp = bp;
      //   // given bp, offset, label; return rect
      //   const outerPt = canvas.pointForBp(bp, centerOffset + lineLength + this._labelLineMarginOuter);
      //   const rectOrigin = utils.rectOriginForAttachementPoint(outerPt, label.lineAttachment, label.width, label.height);
      //   label.rect = new Rect(rectOrigin.x, rectOrigin.y, label.width, label.height);
      //   overlap = prevLabel && prevLabel.rect && label.rect.overlap([prevLabel.rect]);
      //
			// 	bp = bp + bpAdustIncrement;
      //   totalBpAdjustment = Math.abs(label._tbp - label.bp);
      //   maxBpAdjustmentReached = totalBpAdjustment > maxBpAdjustment;
      // } while (loop < MAX_LOOPS && !maxBpAdjustmentReached && (overlap || (prevLabel?._tbp > label._tbp)) );


      // Get normal rect for the label
      // - if it overlaps, find next availabe spot
      // - if no overlap, break from loop

      stopIndex = labelIndex;


      const outerPt = canvas.pointForBp(bp, centerOffset + lineLength + this._labelLineMarginOuter);
      const rectOrigin = utils.rectOriginForAttachementPoint(outerPt, label.lineAttachment, label.width, label.height);
      label.rect = new Rect(rectOrigin.x, rectOrigin.y, label.width, label.height);
			// label._tbp = label.bp;
      overlap = prevLabel && prevLabel.rect && label.rect.overlap([prevLabel.rect]);


			// console.log(overlap)
      if (overlap || (prevLabel?._tbp > label._tbp)) {
        const labelAttathPt = this._getNextAttachPt(label, prevLabel);
        const rectOrigin = utils.rectOriginForAttachementPoint(labelAttathPt, label.lineAttachment, label.width, label.height);
        label.rect = new Rect(rectOrigin.x, rectOrigin.y, label.width, label.height);
        label._tbp = canvas.bpForPoint(labelAttathPt);
        maxBpAdjustmentReached = Math.abs(label._tbp - label.bp) > maxBpAdjustment;
        // If we overlap with prev label, make sure start index is from first prev label

      } else {
        break;
      }

    // Extract above to method
    // - should return outerPt 
    //
    // Then have method to take outerPt, label and return new rect
      // const rectOrigin = utils.rectOriginForAttachementPoint(outerPt, label.lineAttachment, label.width, label.height);
      // label.rect = new Rect(rectOrigin.x, rectOrigin.y, label.width, label.height);


      // Overlaps will occur
      if (loop >= MAX_LOOPS) {
        this._debug && console.log(`Island LOOP MAX Reached: ${label.name}`)
        popRequired = true;
        break;
      }

      if (maxBpAdjustmentReached) {
        this._debug && console.log(`Island BP Adjust MAX Reached: ${label.name}; ${totalBpAdjustment} bp`)
        popRequired = true;
        break;
      }
    }

    // FIX: will need to pop if popRequired???
    // Islands of One should always be straight (no angle)
    if (startIndex === stopIndex) {
      this._debug && console.log(`ISLAND of ONE: ${labels[startIndex]?.name}`)
      console.log(`ISLAND of ONE: ${labels[startIndex]?.name}`)
      return {startIndex, stopIndex};
    }

    // Find Center
    const startLabel = labels[startIndex];
    const stopLabel = labels[stopIndex];
    // console.log(stopLabel, stopIndex)


    // Center is defined as label closest to it's acutally position. Where other labels will
    // BETTER: center is middle index so there is equal labels on either side
    let centerLabelIndex = Math.floor((stopIndex - startIndex) / 2);
    // this._debug && console.log(`ISLAND - Start: ${startLabel?.name}; Stop: ${stopLabel?.name}; Center: ${labels[centerLabelIndex]?.name}`)
    console.log(`ISLAND - Start: ${startLabel?.name}; Stop: ${stopLabel?.name}; Center: ${labels[centerLabelIndex]?.name}`)

    // Back
    this._placeLabelsWithHardBoundary(labels, centerLabelIndex+1, placedLabels, -1);
    // Forward
    // const lastPoppedIndex = this._placeLabelsWithHardBoundary(labels, centerLabelIndex, placedLabels, 1);
    this._placeLabelsWithHardBoundary(labels, centerLabelIndex, placedLabels, 1);

    // FIXME: need to alter stopIndex if new stop is reach in _placeLabelsWithHardBoundary

    return {startIndex, stopIndex};
    // return {startIndex, lastPoppedIndex+1};
  }


  _placeLabelsWithHardBoundary(labels, hardIndex, placedLabels, direction=1) {

    this._debug && console.log(`HARD: ${hardIndex}; DIRECTION: ${direction}`)
    // console.log(`HARD: ${hardIndex}; DIRECTION: ${direction}`)
    const canvas = this.canvas;

    const MAX_LOOPS = 200;
    const centerOffset = this._outerCenterOffset + this._labelLineMarginInner;

    // FIX: 
    const rectsToCheck = placedLabels.map( l => l.rect ).filter( i => i);
    // let labelIndex = hardIndex++;
    const bpAdustIncrement = 1 / this.viewer.layout.pixelsPerBp() / 2;
    // Need to determin from visible range as well
    const maxBpAdjustment = Math.min(
      // (this.sequence.length / 20),
      (this.sequence.length / 50),
      (this._visibleRange.length / 6)
    );
    let totalBpAdjustment;
    let maxBpAdjustmentReached;

    let label, bp, prevLabel, overlap;

    // for (let labelIndex = hardIndex+direction, len = labels.length; labelIndex < len; labelIndex+=direction) {
    for (let labelIndex = hardIndex+direction, len = labels.length; (direction > 0) ? labelIndex < len : labelIndex >= 0; labelIndex+=direction) {
      label = labels[labelIndex];
      // console.log(label, labelIndex)
      // bp = label._tbp; // _tbp will become _attachBp
      bp = label.bp; // _tbp will become _attachBp
      // prevLabel = labels[labelIndex-1];
      prevLabel = labels[labelIndex-direction];
      const lineLength = this.labelLineLength; // 
      let loop = 0;
      let bpOverlap;

      // do {
      //   loop++;
			// 	label._tbp = bp;
      //   const outerPt = canvas.pointForBp(bp, centerOffset + lineLength + this._labelLineMarginOuter);
      //   const rectOrigin = utils.rectOriginForAttachementPoint(outerPt, label.lineAttachment, label.width, label.height);
      //   label.rect = new Rect(rectOrigin.x, rectOrigin.y, label.width, label.height);
      //   overlap = prevLabel && prevLabel.rect && label.rect.overlap([prevLabel.rect]);
      //
      //   // Extract to variable outside of loop
			// 	bp = bp + (direction * bpAdustIncrement);
      //   // console.log(label.bp, bp)
      //   totalBpAdjustment = Math.abs(label._tbp - label.bp);
      //   maxBpAdjustmentReached = totalBpAdjustment > maxBpAdjustment;
      //   // console.log(maxBpAdjustmentReached, totalBpAdjustment, maxBpAdjustment)
      //   // if (overlap) {
      //   //   label._angle = 1;
      //   // }
      //
      //   bpOverlap = (direction > 0) ? (prevLabel._tbp > label._tbp) : (prevLabel._tbp < label._tbp);
      // } while (loop < MAX_LOOPS && !maxBpAdjustmentReached && (overlap || bpOverlap) );

      const labelAttathPt = this._getNextAttachPt(label, prevLabel, direction);
      // console.log(label.name, prevLabel?.name, labelAttathPt.x, labelAttathPt.y)
      const rectOrigin = utils.rectOriginForAttachementPoint(labelAttathPt, label.lineAttachment, label.width, label.height);
      label.rect = new Rect(rectOrigin.x, rectOrigin.y, label.width, label.height);
      label._tbp = canvas.bpForPoint(labelAttathPt);
      maxBpAdjustmentReached = Math.abs(label._tbp - label.bp) > maxBpAdjustment;

      this._debug && console.log(labelIndex, label.name, label.bp, label._tbp)

      // Overlaps will occur
      if (loop >= MAX_LOOPS) {
        this._debug && console.log('LOOP MAX Reached: POP')
        // TEMP: Should pop as well
        const popIndex = hardIndex + direction;
        this._popLabel(labels, popIndex, placedLabels);
        this._placeLabelsWithHardBoundary(labels, popIndex, placedLabels, direction);
        // this._popLabel(labels, labelIndex, placedLabels);
        // this._placeLabelsWithHardBoundary(labels, labelIndex, placedLabels, direction);
        // return labelIndex;
        break;
      }

      if (maxBpAdjustmentReached) {
        this._debug && console.log('MAX ADJUSTMENT Reached: POP')
        const popIndex = hardIndex + direction;
        this._popLabel(labels, popIndex, placedLabels);
        this._placeLabelsWithHardBoundary(labels, popIndex, placedLabels, direction);
        // this._popLabel(labels, labelIndex, placedLabels);
        // this._placeLabelsWithHardBoundary(labels, labelIndex, placedLabels, direction);
        // return labelIndex;
        break;
      }
      label.attachementPt = label.rect.ptForClockPosition(label.lineAttachment);
    }
  }

  // direction: 1 for forward, -1 for backward
  // prevLabel
  // Returns the attachPt for the next label. The point where the label line attaches to the next label.
  // AttachPt is the point on the rect that the line attaches too
  _getNextAttachPt(label, prevLabel, direction=1) {
    const scale = this.viewer.scale;
    const goingForward = (direction > 0);
    // console.log(goingForward)
    // Distance from the map center to where the label rect will be attached
    // FIXME: offset should be argument (or optional)
    const rectOffset = this._outerCenterOffset + this._labelLineMarginInner + this.labelLineLength + this._labelLineMarginOuter;
    const rectOffsetSquared = rectOffset*rectOffset;
    let outerPtX, outerPtY, mapY, mapX;
    let height = label.height;
    let width = label.width;
    const prevRect = prevLabel?.rect;
    // Return the default point for the label when their is no previous label to compare
    if (!prevRect) {
      // console.log('NO PREV')
      return this.canvas.pointForBp(label.bp, rectOffset);
    }
    // console.log(prevRect)

    // FIXME: NEED TO ADD MARGIN between rects
    switch (label.lineAttachment) {
      case 7:
      case 8:
        outerPtY = goingForward ? (prevRect.bottom + height) : prevRect.bottom;
        // outerPtX = Math.sqrt( (rectOffsetSquared) - (outerPtY*outerPtY) );
        mapY = scale.y.invert(outerPtY);
        mapX = Math.sqrt( (rectOffsetSquared) - (mapY*mapY) );
        outerPtX = scale.x(mapX);
        break;
      case 9:
        // outerPtY = goingForward ? (prevRect.bottom - (height/2)) : (prevRect.top + (height/2));
        // outerPtX = Math.sqrt( (rectOffsetSquared) - (outerPtY*outerPtY) );
        outerPtY = goingForward ? (prevRect.bottom + (height/2)) : (prevRect.top - (height/2));
        mapY = scale.y.invert(outerPtY);
        mapX = Math.sqrt( (rectOffsetSquared) - (mapY*mapY) );
        outerPtX = scale.x(mapX);
        // console.log(outerPtX, outerPtY, rectOffset, (outerPtY*outerPtY))
        break;
      case 10:
      case 11:
        // Same as 7,8
        outerPtY = goingForward ? prevRect.bottom : (prevRect.top + height);
        // outerPtX = Math.sqrt( (rectOffsetSquared) - (outerPtY*outerPtY) );
        mapY = scale.y.invert(outerPtY);
        outerPtX = Math.sqrt( (rectOffsetSquared) - (mapY*mapY) );
        break;
      case 12:
        // Won't work for linear
        outerPtX = goingForward ? (prevRect.left - (width/2)) : (prevRect.right + (width/2));
        // outerPtY = Math.sqrt( (rectOffsetSquared) - (outerPtX*outerPtX) );
        mapX = scale.x.invert(outerPtX);
        // outerPtY = Math.sqrt( (rectOffsetSquared) - (mapX*mapX) );
        mapY = Math.sqrt( (rectOffsetSquared) - (mapX*mapX) );
        outerPtY = scale.x(mapY);
        break;
      case 1:
      case 2:
        outerPtY = goingForward ? (prevRect.top + height) : prevRect.bottom;
        // outerPtX = Math.sqrt( (rectOffsetSquared) - (outerPtY*outerPtY) );
        mapY = scale.y.invert(outerPtY);
        mapX = Math.sqrt( (rectOffsetSquared) - (mapY*mapY) );
        outerPtX = scale.x(mapX);
        break;
      case 3:
        outerPtY = goingForward ? (prevRect.top + (height/2)) : (prevRect.bottom - (height/2));
        // outerPtX = Math.sqrt( (rectOffsetSquared) - (outerPtY*outerPtY) );
        mapY = scale.y.invert(outerPtY);
        mapX = Math.sqrt( (rectOffsetSquared) - (mapY*mapY) );
        outerPtX = scale.x(mapX);
        break;
      case 4:
      case 5:
        outerPtY = goingForward ? prevRect.top : (prevRect.bottom - height);
        // outerPtX = Math.sqrt( (rectOffsetSquared) - (outerPtY*outerPtY) );
        mapY = scale.y.invert(outerPtY);
        mapX = Math.sqrt( (rectOffsetSquared) - (mapY*mapY) );
        outerPtX = scale.x(mapX);
        break;
      case 6:
        // FIXME: Won't work for linear
        outerPtX = goingForward ? (prevRect.right + (width/2)) : (prevRect.left - (width/2));
        // outerPtY = Math.sqrt( (rectOffsetSquared) - (outerPtX*outerPtX) );
        mapX = scale.x.invert(outerPtX);
        // outerPtY = Math.sqrt( (rectOffsetSquared) - (mapX*mapX) );
        mapY = Math.sqrt( (rectOffsetSquared) - (mapX*mapX) );
        outerPtY = scale.x(mapY);
        break;
    }

    // if (outerPtY) {
    //   outerPtX = Math.sqrt( (rectOffsetSquared) - (outerPtY*outerPtY) );
    // } else {
    //   // CIRCLE
    //   outerPtY = Math.sqrt( (rectOffsetSquared) - (outerPtX*outerPtX) );
    //   // LINEAR
    //   // outerPtY = radius;
    // }
    return {x: outerPtX, y: outerPtY};
  }

  _popLabel(labels, popIndex, placedLabels) {
    this._debug && console.log('POP:', popIndex)
    const canvas = this.canvas;
    const label = labels[popIndex];
    const bp = label.bp;
    const prevLabel = labels[popIndex-1];
    let lineLength = this.labelLineLength;
    const rectsToCheck = placedLabels.map( l => l.rect ).filter( i => i);
    const centerOffset = this._outerCenterOffset + this._labelLineMarginInner;
    let overlappingRect;
    if (prevLabel && prevLabel.rect) {
      rectsToCheck.push(prevLabel.rect);
    }
    do {
      const outerPt = canvas.pointForBp(bp, centerOffset + lineLength + this._labelLineMarginOuter);
      const rectOrigin = utils.rectOriginForAttachementPoint(outerPt, label.lineAttachment, label.width, label.height);
      label.rect = new Rect(rectOrigin.x, rectOrigin.y, label.width, label.height);
      overlappingRect = label.rect.overlap(rectsToCheck);
      lineLength += label.height;
    } while (overlappingRect);
    placedLabels.push(label);
    label.attachementPt = label.rect.ptForClockPosition(label.lineAttachment);
  }


  // -----------------------------------------------------------------------------------------
      // - placedLabels can not be adjusted further
      // First step when an overlap is found
      // - nextLabelToPopIndex: will actually be the start of the label island. Needs better name
      // - take the popindex and push back (angle -1) unless it overlaps the label before it
      // - all labels from the popindex to before current will be adjusted when island start or stop (current) are at max adjustment
      //  - then figure out paper by finding when angle chagnes forward to back.
      //  - Pop it out, then
      //    - Go back and try to bring labels closer
      //    - go forward and bring labels backward.
      //    - now if the forward way reaches limit, go directlry to previous poper +1 and pop
      //    - move forard again (no need to go backward once we've paopped in an island

    // Sub loop starting with hard boundary (e.g. popped label)
    // in: labels, index of starting boundary, direction (forward only to start)
    // out:
    // - start at boundary +1
    // - can it be placed without angle
    //   - yes: call bigger routine with this as starting position
    //          - FOR now: consider it a hard boundary
    //   - no: try to angle
    //     - yes: continue to next label
    //     - no:  limit reached, go back to boundary +1 and pop
    //            - repeat routine with boundary +1 as hard start

    // Max bp change to for label line to be tangent of circle
    // const radius = centerOffset;
    // // Math.acos(adjacent / hypotenuse)
    // Math.acos(radius / (radius + this.labelLineLength));
    //
    // for (let i = 0, len = labels.length; i < len; i++) {
    //   // console.log("OUT")
    //   label = labels[i];
    //   bp = label._tbp; // _tbp will become _attachBp
    //   prevIndex = (i === 0) ? len-1 : i-1;
    //   prevLabel = labels[prevIndex];
		// 	// console.log(prevLabel)
    //
    //   lineLength = this.labelLineLength;
    //
    //   let do_count = 0
    //   let totalBpAdjustment;
    //   let maxBpAdjustmentNotReached;
    //
    //   do {
		// 		label._tbp = bp;
    //     const outerPt = canvas.pointForBp(bp, centerOffset + lineLength + this._labelLineMarginOuter);
    //     const rectOrigin = utils.rectOriginForAttachementPoint(outerPt, label.lineAttachment, label.width, label.height);
    //     label.rect = new Rect(rectOrigin.x, rectOrigin.y, label.width, label.height);
    //     overlap = prevLabel.rect && label.rect.overlap([prevLabel.rect]);
    //
		// 		bp = bp + bpAdustIncrement;
    //     do_count++;
    //     totalBpAdjustment = Math.abs(label._tbp - label.bp);
    //     maxBpAdjustmentNotReached = totalBpAdjustment < maxBpAdjustment;
    //     if (overlap) {
    //       label._angle = 1;
    //     }
    //
    //   } while (do_count < DO_MAX && maxBpAdjustmentNotReached && (overlap || (prevLabel._tbp > label._tbp)));
    //
    //   if (!overlap && label._angle == 0) {
    //     nextLabelToPopIndex = i;
    //   }
    //
    //   if (!maxBpAdjustmentNotReached) {
    //     label = labels[nextLabelToPopIndex];
    //     if (!label) continue;
    //     // console.log('MAX', label.name, label.bp)
    //     // Need to Pop, comparing against prev label and placed (previously popped labels)
    //     nextLabelToPopIndex++; // check if label exists!
    //
    //     bp = label.bp;
    //
    //     const prevLabel = labels[nextLabelToPopIndex-1];
    //     const rectsToCheck = placedLabels.map( l => l.rect ).filter( i => i);
    //     if (prevLabel && prevLabel.rect) {
    //       rectsToCheck.push(prevLabel.rect);
    //     }
    //     do {
    //       const outerPt = canvas.pointForBp(bp, centerOffset + lineLength + this._labelLineMarginOuter);
    //       const rectOrigin = utils.rectOriginForAttachementPoint(outerPt, label.lineAttachment, label.width, label.height);
    //       label.rect = new Rect(rectOrigin.x, rectOrigin.y, label.width, label.height);
    //       overlappingRect = label.rect.overlap(rectsToCheck);
    //       lineLength += label.height;
    //     } while (overlappingRect);
    //     placedLabels.push(label);
    //   }
    //
    //   label.attachementPt = label.rect.ptForClockPosition(label.lineAttachment);
    // }
      //   if (!maxBpAdjustmentNotReached) {
      //     let l, pl
      //     console.log(i)
      //     for (let j = i; j > 0; j--) {
      //       console.log(i, j)
      //       label = labels[j];
      //       prevLabel = labels[j-1];
      //       if (label.bp+5 >= label._tbp) {
      //         console.log(label)
      //         //pop
      //         lineLength = this.labelLineLength;
      //         bp = label.bp;
      //         console.log(lineLength)
      //         do {
      //           const outerPt = canvas.pointForBp(bp, centerOffset + lineLength + this._labelLineMarginOuter);
      //           const rectOrigin = utils.rectOriginForAttachementPoint(outerPt, label.lineAttachment, label.width, label.height);
      //           label.rect = new Rect(rectOrigin.x, rectOrigin.y, label.width, label.height);
      //           overlappingRect = label.rect.overlap([prevLabel.rect]);
      //           lineLength += label.height;
      //         } while (overlappingRect);
      //         console.log(lineLength)
      //         placedLabels.push(label);
      //
      //         console.log('end')
      //         popped = true
      //
      //         i = j+1;
      //         break;
      //       }
      //     }
      //   }

        // if (popped) {
        //   i = j+1;
        //   break;
        // }


      // const small = Math.min(label._pressureFront, label._pressureBack)
      // const large = Math.max(label._pressureFront, label._pressureBack)
      //
      // const added = small + large;
      //
      // TODO: need to place some labels so that they don't keep expanding in length or angle

      // clockPositionForBp(bp, inverse = false) {



      // const clockPosition = this.layout.clockPositionForBp(label.bp);
      // const topBottom = [6, 12].includes(clockPosition);
      //
      // Each labels compares with previous label (and maybe next one too)
      // Popped or extends labels are PLACED
      // When popping, compare with prev/next label and all PLACED labels

      // if (label._pressureBack > 3 && label._pressureFront > 3) {
      // if ((added > 6 && (small/large) > 0.5) || topBottom ) {
      // // if (true) {
      //   // lineLength += label.height *3;
      //   lineLength += label.height * 1;
      //   label._lineLength = lineLength;
      //   bp = label.bp;
      // } else if (label._pressureBack > label._pressureFront) {
      //   bp = bp + bpAdustIncrement;
      // } else if (label._pressureBack < label._pressureFront) {
      //   bp =  bp - bpAdustIncrement;
      // }

  // Label Spread Plan
  // - keep priorityMax
  //   - if priorityMax is 0, then all will be considered priority
  // - Placing will have to be a iterative process of label bp or line length
  // - label bp changes
  //   - the bp start can change if the feature length is > 1/pixelsPerBp
  //   - if not, the bp end can change
  //
  // - Labels need to be sorted by bp
  // - Go through labels
  // - Check if rect clashes
  // - if not PLACE
  // - if it clashes, iterate through placed labels going backward from current position
  //   - try to place previous label at reduced bp position
  //   - if it clashes, iterate back again
  //   - until it can be placed, then go to next labe
  // - Check 
  // - IDEA:
  //   - each label could have a attribute called pressure
  //     - some factor based on the number of labels before/after that are squeezing the label
  //     - could be 2 factors: back and front pressure
  //   - if the pressure is high the label should extend out and not angle
  //   - The pressure to squeeze (move away from map) should be higher at the top/bottom of the map (Circular)




  // Should be called when
  //  - Labels are added or removed
  //  - Font changes (Annotation or individual label)
  //  - Label name changes
  //  - Zoom level changes
  _calculateLabelRects(labels) {
    labels = labels || this._labels;
    const canvas = this.canvas;
    let label, bp;
    const centerOffset = this._outerCenterOffset + this._labelLineMarginInner;
    for (let i = 0, len = labels.length; i < len; i++) {
      label = labels[i];
      bp = label.bp;
      // let innerPt = canvas.pointForBp(bp, centerOffset);
      const outerPt = canvas.pointForBp(bp, centerOffset + this.labelLineLength + this._labelLineMarginOuter);
      const rectOrigin = utils.rectOriginForAttachementPoint(outerPt, label.lineAttachment, label.width, label.height);
      label.rect = new Rect(rectOrigin.x, rectOrigin.y, label.width, label.height);
      label.attachementPt = label.rect.ptForClockPosition(label.lineAttachment);
    }
  }

  visibleLabels() {
    let labelArray = new CGArray();
    const visibleRange = this._visibleRange;
    if (visibleRange) {
      if (visibleRange.start === 1 && visibleRange.stop === this.sequence.length) {
        // labelArray = this._labels;
        labelArray = this._availableLabels; // Only labels that are on visible contigs;
      } else {
        labelArray = this._labelsNCList.find(visibleRange.start, visibleRange.stop);
      }
    }
    return labelArray;
  }

  // Labels must already be sorted so favorite are first
  _onlyFavoriteLabels(labels) {
    labels = labels || this._labels;
    const nonFavoriteIndex = labels.findIndex( (label) => !label.feature.favorite );
    if (nonFavoriteIndex !== -1) {
      return labels.slice(0, nonFavoriteIndex);
    } else {
      return labels;
    }
  }

  _sortByPriority(labels) {
    labels = labels || this._labels;
    labels.sort( (a, b) => {
      if (b.feature.favorite === a.feature.favorite) {
        return b.feature.length - a.feature.length;
      } else {
        return a.feature.favorite ? -1 : 1;
      }
    });
    return labels;
  }

  /**
   * Invert color
   */
  invertColors() {
    if (this.color) {
      this.update({ color: this.color.invert().rgbaString });
    }
  }

  draw(innerCenterOffset, outerCenterOffset, fast) {
    this._fastDraw = fast;
    // TRY refreshing through addFeatures/remove
    // if (this._labels.length !== this._labelsNCList.length) {
    //   this.refresh();
    // }

    this._visibleRange = this.canvas.visibleRangeForCenterOffset(outerCenterOffset);

    this._innerCenterOffset = innerCenterOffset;
    this._outerCenterOffset = outerCenterOffset;

    // Find Labels that are within the visible range and calculate bounds
    let possibleLabels = this.visibleLabels(outerCenterOffset);

    possibleLabels = this._sortByPriority(possibleLabels);
    if (this.onlyDrawFavorites) {
      possibleLabels = this._onlyFavoriteLabels(possibleLabels);
    }
    this._calculatePositions(possibleLabels);

    const priorityLabels = possibleLabels.slice(0, this.priorityMax);
    const remainingLabels = possibleLabels.slice(this.priorityMax);

    this._calculatePriorityLabelRects(priorityLabels);
    this._calculateLabelRects(remainingLabels);
    // console.log(priorityLabels[0] && priorityLabels[0].rect)

    // Remove overlapping labels
    const labelRects = priorityLabels.map( p => p.rect);
    this._visibleLabels = priorityLabels;
    for (let i = 0, len = remainingLabels.length; i < len; i++) {
      const label = remainingLabels[i];
      if (!label.rect.overlap(labelRects)) {
        this._visibleLabels.push(label);
        labelRects.push(label.rect);
      }
    }

    // Draw nonoverlapping labels
    const canvas = this.canvas;
    const ctx = canvas.context('map');
    let label, rect;
    ctx.font = this.font.css; // TODO: move to loop, but only set if it changes
    ctx.textAlign = 'left';
    // ctx.textBaseline = 'top';
    ctx.textBaseline = 'alphabetic'; // The default baseline works best across canvas and svg
    // Draw label lines first so that label text will draw over them
    for (let i = 0, len = this._visibleLabels.length; i < len; i++) {
      label = this._visibleLabels[i];
      // if (label.name === 'AUI44_00380') {
      // if (label.name === 'AUI44_00145') {
      //   console.log('AT LABEL');
      //   console.log(label.feature.contig.visible)
      //   console.log(label.bp)
      // }
      // FIXME: it would be better to remove invisible labels before calculating position
      // - this works to remove label, but the space is not available for another label
      if (!label.feature.visible) { continue; }
      const color = this.color || label.feature.color;

      // canvas.radiantLine('map', label.bp,
      //   outerCenterOffset + this._labelLineMarginInner,
      //   this.labelLineLength + this._labelLineMarginOuter,
      // this._labelLineWidth, color.rgbaString, this.lineCap);
      const innerPt = canvas.pointForBp(label.bp, outerCenterOffset + this._labelLineMarginInner);
      // console.log(label.attachementPt)
      const outerPt = label.attachementPt;
      ctx.beginPath();
      ctx.moveTo(innerPt.x, innerPt.y);
      ctx.lineTo(outerPt.x, outerPt.y);
      ctx.strokeStyle = color.rgbaString;
      ctx.lineCap = this.lineCap;
      ctx.lineWidth = this._labelLineWidth;
      ctx.stroke();
    }

    // Draw label text
    const backgroundColor = this.viewer.settings.backgroundColor.copy();
    backgroundColor.opacity = 0.75;
    for (let i = 0, len = this._visibleLabels.length; i < len; i++) {
      label = this._visibleLabels[i];
      // FIXME: it would be better to remove invisible labels before calculating position
      // - this works to remove label, but the space is not available for another label
      // NOTE: Has this been fixed????????
      if (!label.feature.visible) { continue; }
      const color = this.color || label.feature.color;

      ctx.fillStyle = backgroundColor.rgbaString;
      rect = label.rect;
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

      ctx.fillStyle = color.rgbaString;
      // ctx.fillText(label.name, label.rect.x, label.rect.y);
      ctx.fillText(label.name, label.rect.x, label.rect.bottom - 1);
    }

    if (this.viewer.debug && this.viewer.debug.data.n) {
      this.viewer.debug.data.n.labels = this._visibleLabels.length;
    }
  }

  /**
   * Update annotation [attributes](#attributes).
   * See [updating records](../docs.html#s.updating-records) for details.
   * @param {Object} attributes - Object describing the properties to change
   */
  update(attributes) {
    this.viewer.updateRecords(this, attributes, {
      recordClass: 'Annotation',
      validKeys: ['color', 'font', 'onlyDrawFavorites', 'visible']
    });
    this.viewer.trigger('annotation-update', { attributes });
  }

  /**
   * Returns JSON representing the object
   */
  toJSON(options = {}) {
    const json = {
      font: this.font.string,
      color: this.color && this.color.rgbaString,
      onlyDrawFavorites: this.onlyDrawFavorites,
      visible: this.visible
    };
    // Optionally add default values
    if (!this.visible || options.includeDefaults) {
      json.visible = this.visible;
    }
    return json;
  }

}


export default Annotation;


