// FIXME: Use delegate for layout format
//   - move scales to layout
//   - move zoomFactor to layout
//////////////////////////////////////////////////////////////////////////////
// Layout for Circular Maps
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {
  /**
   * <br />
   * The Layout is in control of creating slots from tracks and drawing the map.
   */
  class Layout {

    /**
     * Create a Layout
     */
    constructor(viewer) {
      this._viewer = viewer;

      // this._tracks = new CGV.CGArray();
      this._fastMaxFeatures = 1000;
      // TODO: move to settings
      // this._minSlotThickness = CGV.defaultFor(data.minSlotThickness, 1);
      // this._maxSlotThickness = CGV.defaultFor(data.maxSlotThickness, 50);
      this._minSlotThickness = 1;
      this._maxSlotThickness = 50;

      // this.updateScales();

      // Setup scales
      // this._scale = {};
      // this.updateCartesianScales();

      // // Create tracks
      // if (data.tracks) {
      //   data.tracks.forEach((trackData) => {
      //     new CGV.Track(this, trackData);
      //   });
      // }
      this._adjustProportions();
    }

    toString() {
      return 'Layout';
    }

    /**
     * @member {Viewer} - Get the *Viewer*
     */
    get viewer() {
      return this._viewer;
    }


    /** * @member {Canvas} - Get the *Canvas*
     */
    get canvas() {
      return this.viewer.canvas;
    }

    /** * @member {Number} - Get the canvas width
     */
    get width() {
      return this.canvas.width;
    }

    /** * @member {Number} - Get the canvas height
     */
    get height() {
      return this.canvas.height;
    }

    /** * @member {Sequence} - Get the *Sequence*
     */
    get sequence() {
      return this.viewer.sequence;
    }

    /** * @member {Backbone} - Get the *Backbone*
     */
    get backbone() {
      return this.viewer.backbone;
    }

    /** * @member {Object} - Return the scales...
     */
    get scale() {
      return this.canvas.scale;
      // return this._scale;
    }

    //
    // #<{(|* * @member {Canvas} - Get or set the layout type: linear or circular.
    //  |)}>#
    // get type() {
    //   return this._type;
    // }
    //
    // set type(value) {
    //   this._type = value;
    //   if (value === 'linear') {
    //     this._delegate = new CGV.LayoutLinear(this);
    //   } else if (value === 'circular') {
    //     this._delegate = new CGV.LayoutCircular(this);
    //   } else {
    //     throw 'Layout type must be one of the following: linear, circular';
    //   }
    // }

    /** * @member {Number} - Get the distance from the backbone to the inner/bottom edge of the map.
     */
    get bbInsideOffset() {
      return this._bbInsideOffset;
    }

    /** * @member {Number} - Get the distance from the backbone to the outer/top edge of the map.
     */
    get bbOutsideOffset() {
      return this._bbOutsideOffset;
    }

    /** * @member {Number} - Get an object with stats about slot thickness ratios.
     */
    get slotThicknessRatioStats() {
      return this._slotThicknessRatioStats;
    }

    /** * @member {Number} - Get an object with stats about slot proportion of map thickness.
     */
    get slotProportionStats() {
      return this._slotProportionStats;
    }
    //////////////////////////////////////////////////////////////////////////
    // Methods that must be present in sub classes
    //////////////////////////////////////////////////////////////////////////

    /**
     * @member {String} - Get the layout type
     */
    get type() {
      throw 'Error: "type" must be overridden in subclass';
    }

    updateScales() {
      throw 'Error: "updateScales" must be overridden in subclass';
    }

    zoom(zoomFactor, bp) {
      throw 'Error: "zoom" must be overridden in subclass';
    }

    translate(dx, dy) {
      throw 'Error: "translate" must be overridden in subclass';
    }

    pointFor(bp, centerOffset) {
      throw 'Error: "pointFor" must be overridden in subclass';
    }

    bpForPoint(point) {
      throw 'Error: "bpForPoint" must be overridden in subclass';
    }

    // FIXME: update arguments
    path(layer, radius, startBp, stopBp, anticlockwise = false, startType = 'moveTo') {
      throw 'Error: "path" must be overridden in subclass';
    }

    visibleRangeForCenterOffset(offset, margin = 0) {
      throw 'Error: "visibleRangeForCenterOffset" must be overridden in subclass';
    }

    /**
     * Return the maximum radius to use for calculating slot thickness when zoomed
     * @return {Number}
     */
    maxMapThickness() {
      throw 'Error: "maxMapThickness" must be overridden in subclass';
    }

    /**
     * The number of pixels per basepair along the backbone.
     * @return {Number}
     */
    pixelsPerBp(mapCenterOffset = this.backbone.adjustedCenterOffset) {
      throw 'Error: "pixelsPerBp" must be overridden in subclass';
    }

    // Returns the clock position (1-12) for the supplied bp.
    // For example, the top of the map would be 12, the bottom would be 6 and 
    // the right side of a circular map will be 3. 
    clockPositionForBp(bp, inverse=false) {
      throw 'Error: "clockPositionForBp" must be overridden in subclass';
    }

    //////////////////////////////////////////////////////////////////////////
    // Methods for determining offsets and Drawing
    // FIXME: Organized better
    //////////////////////////////////////////////////////////////////////////

    _updateSlotThicknessRatioStats(slots = this.visibleSlots()) {
      const thicknessRatios = slots.map( s => s.thicknessRatio );
      this._slotThicknessRatioStats = {
        min: d3.min(thicknessRatios),
        max: d3.max(thicknessRatios),
        sum: d3.sum(thicknessRatios)
      };
    }

    _updateSlotProportionStats(slots = this.visibleSlots()) {
      const proportions = slots.map( s => s.proportionOfMap );
      this._slotProportionStats = {
        min: d3.min(proportions),
        max: d3.max(proportions),
        sum: d3.sum(proportions)
      };
    }

    // Returns the space (in pixels) of everything but the slots
    // i.e. dividers, spacing, and backbone
    // Note: the backbone is only included if position is 'both'
    // _nonSlotSpace(slots = this.visibleSlots(), position = 'both') {
    //   const viewer = this.viewer;
    //   const backbone = viewer.backbone;
    //   const slotDivider = viewer.slotDivider;
    //   // const dividerThickness = slotDivider.visible ? slotDivider.thickness : 0;
    //   const dividerThickness = slotDivider.adjustedThickness;
    //   if (position === 'inside') {
    //     slots = slots.filter( slot => slot.inside );
    //   } else if (position === 'outside') {
    //     slots = slots.filter( slot => slot.outside );
    //   }
    //   const nDividers = (dividerThickness === 0) ? 0 : slots.length;
    //   const nSpaces = slots.length + nDividers;
    //   let space = 0;
    //   if (position === 'both') {
    //     // space += backbone.visible ? backbone.thickness : 0;
    //     space += backbone.adjustedThickness;
    //   }
    //   space += (nDividers * dividerThickness) + (nSpaces * slotDivider.adjustedSpacing);
    //   // console.log({
    //   //   nDividers: nDividers,
    //   //   nSpaces: nSpaces,
    //   //   bt: backbone.thickness,
    //   //   dt: dividerThickness,
    //   //   sds: slotDivider.spacing
    //   // })
    //   return space;
    // }

    // position: 'inside', 'outside'
    _trackNonSlotSpace(track, position = 'inside') {
      const dividers = this.viewer.dividers;

      // let slots = track.slots().filter( s =>  s.visible );
      // if (position === 'inside') {
      //   slots = slots.filter( slot => slot.inside );
      // } else if (position === 'outside') {
      //   slots = slots.filter( slot => slot.outside );
      // }
      let slots = track.slots().filter( s =>  s.visible && s[position] );

      let space = 0;
      if (slots.length > 0) {
      // for (let j = 0, slotsLength = slots.length; j < slotsLength; j++) {
        // Add track start and end divider spacing
        space += dividers.track.adjustedSpacing * 2;
        // Add track divider thickness
        space += dividers.track.adjustedThickness;
        // Add slot divider spacing and thickness
        const slotDividerCount = slots.length - 1;
        space += slotDividerCount * ((dividers.slot.adjustedSpacing * 2) + dividers.slot.adjustedThickness);
      }
      return space;
    }

    // Returns the space (in pixels) of everything but the slots
    // i.e. dividers, spacing, and backbone
    // position: 'inside', 'outside', 'both'
    // Note: the backbone is only included if position is 'both'
    _nonSlotSpace(position = 'both') {
      const viewer = this.viewer;

      let space = 0;
      const visibleTracks = this.tracks().filter( t =>  t.visible );
      for (let i = 0, len = visibleTracks.length; i < len; i++) {
        // const track = visibleTracks[i].dividerSpace(position);
        const track = visibleTracks[i];
        if (position === 'both') {
          space += this._trackNonSlotSpace(track, 'inside');
          space += this._trackNonSlotSpace(track, 'outside');
        } else {
          space += this._trackNonSlotSpace(track, position);
        }
      }
      if (position === 'both') {
        space += this.backbone.adjustedThickness;
      }

      return space;
    }

    _findSpace(visibleSlots, spaceType = 'min') {
      visibleSlots = visibleSlots || this.visibleSlots();
      const findMinSpace = (spaceType === 'min');
      const minSlotThickness = this.minSlotThickness;
      const maxSlotThickness = this.maxSlotThickness;
      const minThicknessRatio = this.slotThicknessRatioStats.min;
      const maxThicknessRatio = this.slotThicknessRatioStats.max;
      let space = this._nonSlotSpace(visibleSlots);
      // If the min and max slot thickness range is too small for the min/max thickness ratio,
      // we have to scale the ratios
      const scaleRatios = (minSlotThickness / minThicknessRatio * maxThicknessRatio > maxSlotThickness);
      for (let i = 0, len = visibleSlots.length; i < len; i++) {
        const slot = visibleSlots[i];
        // Add Slot thickness based on thicknessRatio and min/max slot thickness
        if (scaleRatios) {
          space += CGV.scaleValue(slot.thicknessRatio,
            {min: minThicknessRatio, max: maxThicknessRatio},
            {min: minSlotThickness, max: maxSlotThickness});
        } else {
          if (findMinSpace) {
            space += slot.thicknessRatio * minSlotThickness / minThicknessRatio;
          } else {
            space += slot.thicknessRatio * maxSlotThickness / maxThicknessRatio;
          }
        }
      }
      return space;
    }

    _minSpace(visibleSlots) {
      return this._findSpace(visibleSlots, 'min');
    }

    _maxSpace(visibleSlots) {
      return this._findSpace(visibleSlots, 'max');
    }

    /**
     * Calculate the backbone radius and slot proportions based on the Viewer size and
     * the number of slots.
     */
    _adjustProportions() { // NEW
      const viewer = this.viewer;
      if (!viewer._initialized) { return; }
      const backbone = viewer.backbone;
      const visibleSlots = this.visibleSlots();
      this._updateSlotThicknessRatioStats(visibleSlots);
      // Maximum ring radius (i.e. the radius of the outermost ring) as a proportion of Viewer size
      const maxOuterProportion = 0.35;
      const maxOuterRadius = maxOuterProportion * viewer.minDimension;
      // Minimum space required at center of map as a proportion of Viewer size
      const minInnerProportion = 0.15;
      const minInnerRadius = minInnerProportion * viewer.minDimension;
      // The maximum amount of space for drawing slots, backbone, dividers, etc
      const workingSpace = maxOuterRadius - minInnerRadius;
      // Minimum Space required (based on minSlotThickness)
      const minSpace = this._minSpace(visibleSlots);
      // Maximum Space possible (based on maxSlotThickness)
      // let maxSpace = this._maxSpace(visibleSlots);
      // May need to scale slots, backbone, dividers and spacing to fit everything
      const thicknessScaleFactor = Math.min(workingSpace / minSpace, 1);
      // Calculate nonSlotSpace
      const nonSlotSpace = this._nonSlotSpace(visibleSlots) * thicknessScaleFactor;
      const slotSpace = (workingSpace * thicknessScaleFactor) - nonSlotSpace;

      // The sum of the thickness ratios
      const thicknessRatioSum = this.slotThicknessRatioStats.sum;

      // console.log({
      //   workingSpace: workingSpace,
      //   minSpace: minSpace,
      //   thicknessScaleFactor: thicknessScaleFactor,
      //   nonSlotSpace: nonSlotSpace,
      //   slotSpace: slotSpace,
      //   // thicknessRatios: thicknessRatios,
      //   thicknessRatioSum: thicknessRatioSum
      // });

      const outsideSlots = this.visibleSlots().filter( (t) => { return t.outside; });
      let outsideThickness = this._nonSlotSpace(visibleSlots, 'outside');
      outsideSlots.forEach( (slot) => {
        const slotThickness = slotSpace * slot.thicknessRatio / thicknessRatioSum;
        outsideThickness += slotThickness;
      });
      // Set backbone radius
      const backboneRadius = maxOuterRadius - outsideThickness - (backbone.thickness / 2);
      // viewer.backbone.radius = backboneRadius;
      // viewer.backbone.centerOffset = backboneRadius;
      this.updateBackboneOffset(workingSpace, outsideThickness);
      // Update slot thick proportions
      this.visibleSlots().each( (i, slot) => {
        const slotThickness = slotSpace * slot.thicknessRatio / thicknessRatioSum;
        slot.proportionOfRadius = slotThickness / backboneRadius;
      });
      this._updateSlotProportionStats(visibleSlots);

      // NOTE:
      // - Also calculate the maxSpace
      //   - then convert to proportion of radius [maxSpaceProportion]
      //   - then use the min(maxSpaceProportion and calculated proportion [slot.thicknessRation / sum slot.thicknessRatio ]
      //   - then assign proportionOfRadius to each slot
      //     - calculated proportion / the min (from above)
      //     - could use scaler here
      // - or drawing slots, dividers, etc should use layout.scaleFactor when drawing

      this.updateLayout(true);
    }

    tracks(term) {
      // return this._tracks.get(term);
      return this.viewer.tracks(term);
    }

    slots(term) {
      return this.viewer.slots(term);
      // let slots = new CGV.CGArray();
      // for (let i = 0, len = this._tracks.length; i < len; i++) {
      //   slots = slots.concat(this._tracks[i]._slots);
      // }
      // return slots.get(term);
    }

    visibleSlots(term) {
      return this.slots().filter( s => s.visible && s.track.visible ).get(term);
    }

    slotForRadius(radius) {
      const slots = this.visibleSlots();
      let slot;
      for (let i = 0, len = slots.length; i < len; i++) {
        if (slots[i].containsRadius(radius)) {
          slot = slots[i];
          break;
        }
      }
      return slot;
    }

    get slotLength() {
      return this._slotLength || 0;
    }

    get fastMaxFeatures() {
      return this._fastMaxFeatures;
    }

    get fastFeaturesPerSlot() {
      return this._fastFeaturesPerSlot;
    }

    /**
     * Get or set the max slot thickness.
     */
    get maxSlotThickness() {
      return this._maxSlotThickness;
    }

    set maxSlotThickness(value) {
      this._maxSlotThickness = Number(value);
      this._adjustProportions();
    }

    /**
     * Get or set the min slot thickness.
     */
    get minSlotThickness() {
      return this._minSlotThickness;
    }

    set minSlotThickness(value) {
      this._minSlotThickness = Number(value);
      this._adjustProportions();
    }

    drawMapWithoutSlots() {
      const viewer = this.viewer;
      const backbone = viewer.backbone;
      const canvas = this.canvas;
      // let startTime = new Date().getTime();

      viewer.clear('map');
      viewer.clear('ui');

      if (viewer.messenger.visible) {
        viewer.messenger.close();
      }

      // All Text should have base line top
      // FIXME: contexts
      // ctx.textBaseline = 'top';

      // Draw Backbone
      backbone.draw();

      // Recalculate the slot radius and thickness if the zoom level has changed
      this.updateLayout();

      // Divider rings
      // viewer.slotDivider.draw();
      viewer.dividers.draw();
      // Ruler
      // const radiusAdjustment = viewer.slotDivider.visible ? viewer.slotDivider.thickness : 0;
      const radiusAdjustment = viewer.dividers.track.adjustedThickness;
      viewer.ruler.draw(this.bbInsideOffset - radiusAdjustment, this.bbOutsideOffset + radiusAdjustment);
      // Labels
      if (viewer.annotation.visible) {
        viewer.annotation.draw(this.bbInsideOffset, this.bbOutsideOffset);
      }
      // Progess
      this.drawProgress();
      // Debug
      // if (viewer.debug) {
      //   viewer.debug.data.time['fastDraw'] = CGV.elapsedTime(startTime);
      //   viewer.debug.draw(canvas.context('ui'));
      // }
      if (canvas._testDrawRange) {
        const ctx = canvas.context('captions');
        ctx.strokeStyle = 'grey';
        ctx.rect(0, 0, canvas.width, canvas.height);
        ctx.stroke();
      }
      // Slots timout
      this._slotIndex = 0;
      if (this._slotTimeoutID) {
        clearTimeout(this._slotTimeoutID);
        this._slotTimeoutID = undefined;
      }
    }

    drawFast() {
      const startTime = new Date().getTime();
      this.drawMapWithoutSlots();
      this.drawAllSlots(true);
      // Debug
      if (this.viewer.debug) {
        this.viewer.debug.data.time.fastDraw = CGV.elapsedTime(startTime);
        this.viewer.debug.draw(this.canvas.context('ui'));
      }
    }

    drawFull() {
      this.drawMapWithoutSlots();
      this.drawAllSlots(true);
      this._drawFullStartTime = new Date().getTime();
      this.drawSlotWithTimeOut(this);
    }

    drawExport() {
      this.drawMapWithoutSlots();
      this.drawAllSlots(false);
    }

    draw(fast) {
      fast ? this.drawFast() : this.drawFull();
    }

    drawAllSlots(fast) {
      let track, slot;
      // for (let i = 0, trackLen = this._tracks.length; i < trackLen; i++) {
      //   track = this._tracks[i];
      const tracks = this.tracks();
      for (let i = 0, trackLen = tracks.length; i < trackLen; i++) {
        track = tracks[i];
        if (!track.visible) { continue; }
        for (let j = 0, slotLen = track._slots.length; j < slotLen; j++) {
          slot = track._slots[j];
          if (!slot.visible) { continue; }
          slot.draw(this.canvas, fast);
        }
      }
    }

    drawSlotWithTimeOut(layout) {
      const slots = layout.visibleSlots();
      const slot = slots[layout._slotIndex];
      if (!slot) { return; }
      slot.clear();
      slot.draw(layout.canvas);
      layout._slotIndex++;
      if (layout._slotIndex < slots.length) {
        layout._slotTimeoutID = setTimeout(layout.drawSlotWithTimeOut, 0, layout);
      } else {
        if (layout.viewer.debug) {
          layout.viewer.clear('ui');
          layout.viewer.debug.data.time.fullDraw = CGV.elapsedTime(layout._drawFullStartTime);
          layout.viewer.debug.draw(layout.canvas.context('ui'));
        }
        // if (typeof complete === 'function') { complete.call() }
      }
    }

    // #<{(|*
    //  * Updates the radius and thickness of every slot, divider and ruler, only if the zoom level has changed
    //  |)}>#
    // updateLayout(force) {
    //   const viewer = this.viewer;
    //   if (!force && this._savedZoomFactor === viewer._zoomFactor) {
    //     return;
    //   } else {
    //     this._savedZoomFactor = viewer._zoomFactor;
    //   }
    //   const backbone = viewer.backbone;
    //   // const slotDivider = viewer.slotDivider;
    //   const dividers = viewer.dividers;
    //   const backboneThickness = backbone.adjustedThickness;
    //   let slotRadius = backbone.adjustedCenterOffset;
    //   let directRadius = slotRadius + (backboneThickness / 2);
    //   let reverseRadius = slotRadius - (backboneThickness / 2);
    //   const spacing = slotDivider.spacing;
    //   let residualSlotThickness = 0;
    //   let slot;
    //   // slotDivider.clearBbOffsets();
    //   dividers.clearBbOffsets();
    //   const visibleSlots = this.visibleSlots();
    //   this._slotLength = visibleSlots.length;
    //   for (let i = 0, len = visibleSlots.length; i < len; i++) {
    //     slot = visibleSlots[i];
    //     // Slots and Dividers
    //     // Calculate Slot dimensions
    //     // The slotRadius is the radius at the center of the slot
    //     const slotThickness = this._calculateSlotThickness(slot.proportionOfRadius);
    //     slot._thickness = slotThickness;
    //     if (slot.outside) {
    //       directRadius += ( (slotThickness / 2) + spacing + residualSlotThickness);
    //       slotRadius = directRadius;
    //     } else {
    //       reverseRadius -= ( (slotThickness / 2) + spacing + residualSlotThickness);
    //       slotRadius = reverseRadius;
    //     }
    //
    //     slot._radius = slotRadius;
    //
    //     residualSlotThickness = slotThickness / 2;
    //
    //     // Calculate Divider dimensions
    //     const dividerThickness = slotDivider.visible ? slotDivider.thickness : 0;
    //     const spacingAndDividerThickness = (dividerThickness === 0) ? 0 : (dividerThickness + spacing);
    //     if (slot.outside) {
    //       directRadius += residualSlotThickness + spacingAndDividerThickness;
    //       slotRadius = directRadius;
    //     } else {
    //       reverseRadius -= residualSlotThickness + spacingAndDividerThickness;
    //       slotRadius = reverseRadius;
    //     }
    //     // slotDivider.addBbOffset(slotRadius);
    //     dividers.addBbOffset(slotRadius);
    //     residualSlotThickness = dividerThickness / 2;
    //   }
    //   this._fastFeaturesPerSlot = this._fastMaxFeatures / this.slotLength;
    //   this._bbInsideOffset = reverseRadius;
    //   this._bbOutsideOffset = directRadius;
    // }

    // position must be: 'inside' or 'outside'
    _updateLayoutFor(position = 'inside') {
      const viewer = this.viewer;
      const dividers = viewer.dividers;
      // let bbOffset = this.backbone.adjustedThickness / 2;
      let bbOffset = this.backbone.adjustedCenterOffset + this.backbone.adjustedThickness / 2;
      // Distance between slots
      const slotGap = (dividers.slot.adjustedSpacing * 2) + dividers.slot.adjustedThickness;
      const visibleTracks = this.tracks().filter( t =>  t.visible );
      for (let i = 0, tracksLength = visibleTracks.length; i < tracksLength; i++) {
        const track = visibleTracks[i];
        const slots = track.slots().filter( s => s.visible && s[position] );
        if (slots.length > 0) {
          bbOffset += dividers.track.adjustedSpacing;
          for (let j = 0, slotsLength = slots.length; j < slotsLength; j++) {
            const slot = slots[j];
            const slotThickness = this._calculateSlotThickness(slot.proportionOfRadius);
            slot._thickness = slotThickness;
            bbOffset += (slotThickness / 2);
            slot._radius = bbOffset;
            bbOffset += (slotThickness / 2);
            if (j === (slotsLength - 1)) {
              // Last slot for track - Use track divider
              bbOffset += dividers.track.adjustedSpacing;
              dividers.addBbOffset(bbOffset + (dividers.track.adjustedThickness / 2), 'track');
              bbOffset += dividers.track.adjustedThickness;
            } else {
              // More slots for track - Use slot divider
              dividers.addBbOffset(bbOffset + (slotGap / 2), 'slot');
              bbOffset += slotGap;
            }
          }
        }
      }
      // console.log(bbOffset)
      return position === 'outside' ? bbOffset : -bbOffset;
    }

    /**
     * Updates the radius and thickness of every slot, divider and ruler, only if the zoom level has changed
     */
    updateLayout(force) {
      const viewer = this.viewer;
      if (!force && this._savedZoomFactor === viewer._zoomFactor) {
        return;
      } else {
        this._savedZoomFactor = viewer._zoomFactor;
      }
      viewer.dividers.clearBbOffsets();

      this._fastFeaturesPerSlot = this._fastMaxFeatures / this.visibleSlots().length;
      this._bbInsideOffset = this._updateLayoutFor('inside');
      this._bbOutsideOffset = this._updateLayoutFor('outside');
    }

    /**
     * FIXME: update description
     * Slot thickness is based on a proportion of the backbone radius.
     * As the viewer is zoomed the slot radius increases until
     *  - The zoomed radius > the max zoomed radius (~ minimum dimension of the viewer).
     *    Therefore we should always be able to see all the slots in the viewer
     *  - The slot thickness is greater than the maximum allowed slot thickness
     */
    _calculateSlotThickness(proportionOfRadius) {
      const viewer = this.viewer;

      // FIXME: should not be based on adjustedCenterOffset
      // const mapThickness = Math.min(viewer.backbone.adjustedCenterOffset, this.maxMapThickness());
      // TEMP
      const minSize = this.maxMapThickness() / 6 * viewer.zoomFactor;
      const mapThickness = Math.min(minSize, this.maxMapThickness());

      const maxAllowedProportion = this.maxSlotThickness / mapThickness;
      const slotProportionStats = this.slotProportionStats;
      if (slotProportionStats.max > maxAllowedProportion) {
        if (slotProportionStats.min === slotProportionStats.max) {
          proportionOfRadius = maxAllowedProportion;
        } else {
          // SCALE
          // Based on the min and max allowed proportionOf Radii allowed
          const minAllowedProportion = this.minSlotThickness / mapThickness;
          const minMaxRatio = slotProportionStats.max / slotProportionStats.min;
          const minProportionOfRadius = maxAllowedProportion / minMaxRatio;
          const minTo = (minProportionOfRadius < minAllowedProportion) ? minAllowedProportion : minProportionOfRadius;
          proportionOfRadius = CGV.scaleValue(proportionOfRadius,
            {min: slotProportionStats.min, max: slotProportionStats.max},
            {min: minTo, max: maxAllowedProportion});
        }
      }
      return proportionOfRadius * mapThickness;
    }

    // When updating scales because the canvas has been resized, we want to
    // keep the map at the same position in the canvas.
    // Axis must be 'x' or 'y'
    // Used to initialize or resize the circle x/y or linear y scale
    _updateScaleForAxis(axis, dimension) {
      const scale = this.scale;
      // Default Fractions to center the map when the scales have not been defined yet
      let f1 = (axis === 'x') ? -0.5 : 0.5;
      let f2 = (axis === 'x') ? 0.5 : -0.5;
      // Save scale domains to keep tract of translation
      if (scale[axis]) {
        const origDomain = scale[axis].domain();
        const origDimension = Math.abs(origDomain[1] - origDomain[0]);
        f1 = origDomain[0] / origDimension;
        f2 = origDomain[1] / origDimension;
      }
      scale[axis] = d3.scaleLinear()
        .domain([dimension * f1, dimension * f2])
        .range([0, dimension]);
      // console.log(scale[axis].domain())
    }

    drawProgress() {
      this.canvas.clear('background');
      let track, slot, progress;
      // for (let i = 0, trackLen = this._tracks.length; i < trackLen; i++) {
      //   track = this._tracks[i];
      const tracks = this.tracks();
      for (let i = 0, trackLen = tracks.length; i < trackLen; i++) {
        track = tracks[i];
        progress = track.loadProgress;
        for (let j = 0, slotLen = track._slots.length; j < slotLen; j++) {
          slot = track._slots[j];
          slot.drawProgress(progress);
        }
      }
    }
    //
    // moveTrack(oldIndex, newIndex) {
    //   this._tracks.move(oldIndex, newIndex);
    //   this._adjustProportions();
    // }
    //
    // removeTrack(track) {
    //   this._tracks = this._tracks.remove(track);
    //   this._adjustProportions();
    // }
    //
    // toJSON() {
    //   const json = {
    //     minSlotThickness: this.minSlotThickness,
    //     maxSlotThickness: this.maxSlotThickness,
    //     tracks: []
    //   };
    //   this.tracks().each( (i, track) => {
    //     json.tracks.push(track.toJSON());
    //   });
    //   return json;
    // }


  }

  // CGV.LayoutCircular = LayoutCircular;
  CGV.Layout = Layout;
})(CGView);
