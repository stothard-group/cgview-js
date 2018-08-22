//////////////////////////////////////////////////////////////////////////////
// Layout
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
    constructor(viewer, data = {}, meta = {}) {
      this._viewer = viewer;
      this._tracks = new CGV.CGArray();
      this._fastMaxFeatures = 1000;
      this._minSlotThickness = CGV.defaultFor(data.minSlotThickness, 1);
      this._maxSlotThickness = CGV.defaultFor(data.maxSlotThickness, 50);

      // Create tracks
      if (data.tracks) {
        data.tracks.forEach((trackData) => {
          new CGV.Track(this, trackData);
        });
      }
      this._adjustProportions();
    }

    /** * @member {Viewer} - Get the *Viewer*
     */
    get viewer() {
      return this._viewer
    }

    /** * @member {Canvas} - Get the *Canvas*
     */
    get canvas() {
      return this.viewer.canvas
    }

    /** * @member {Number} - Get the inside radius
     */
    get insideRadius() {
      return this._insideRadius
    }

    /** * @member {Number} - Get the outside radius
     */
    get outsideRadius() {
      return this._outsideRadius
    }

    /** * @member {Number} - Get an object with stats about slot thickness ratios
     */
    get slotThicknessRatios() {
      return this._slotThicknessRatios
    }

    /** * @member {Number} - Get an object with stats about slot proportion of radii
     */
    get slotProportionOfRadii() {
      return this._slotProportionOfRadii
    }

    _updateSlotThicknessRatios(slots) {
      let thicknessRatios = slots.map( s => s.thicknessRatio );
      this._slotThicknessRatios = {
        min: d3.min(thicknessRatios),
        max: d3.max(thicknessRatios),
        sum: d3.sum(thicknessRatios)
      }
    }

    _updateSlotProportionOfRadii(slots) {
      let proportions = slots.map( s => s.proportionOfRadius );
      this._slotProportionOfRadii = {
        min: d3.min(proportions),
        max: d3.max(proportions),
        sum: d3.sum(proportions)
      }
    }

    // Returns the space (in pixels) of everything but the slots
    // i.e. dividers, spacing, and backbone
    // Note: the bockbone is only included if position is 'both'
    _nonSlotSpace(visibleSlots, position='both') {
      let slots = visibleSlots || this.visibleSlots();
      let viewer = this.viewer;
      let backbone = viewer.backbone;
      let slotDivider = viewer.slotDivider;
      let dividerThickness = slotDivider.visible ? slotDivider.thickness : 0;
      if (position === 'inside') {
        slots = slots.filter( slot => slot.inside );
      } else if (position === 'outside') {
        slots = slots.filter( slot => slot.outside );
      }
      let nDividers = (dividerThickness === 0) ? 0 : slots.length;
      let nSpaces = slots.length + nDividers;
      let space = 0;
      if (position === 'both') {
        space += backbone.visible ? backbone.thickness : 0;
      }
      space += (nDividers * dividerThickness) + (nSpaces * slotDivider.spacing);
      // console.log({
      //   nDividers: nDividers,
      //   nSpaces: nSpaces,
      //   bt: backbone.thickness,
      //   dt: dividerThickness,
      //   sds: slotDivider.spacing
      // })
      return space
    }

    _findSpace(visibleSlots, spaceType='min') {
      visibleSlots = visibleSlots || this.visibleSlots();
      let findMinSpace = (spaceType === 'min');
      let viewer = this.viewer;
      let backbone = viewer.backbone;
      let slotDivider = viewer.slotDivider;
      let minSlotThickness = this.minSlotThickness;
      let maxSlotThickness = this.maxSlotThickness;
      let minThicknessRatio = this.slotThicknessRatios.min;
      let maxThicknessRatio = this.slotThicknessRatios.max;
      let space = this._nonSlotSpace(visibleSlots);
      // If the min and max slot thickness range is too small for the min/max thickness ratio,
      // we have to scale the ratios
      let scaleRatios = (minSlotThickness / minThicknessRatio * maxThicknessRatio > maxSlotThickness);
      for (let i = 0, len = visibleSlots.length; i < len; i++) {
        let slot = visibleSlots[i];
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
      return space
    }

    _minSpace(visibleSlots) {
      return this._findSpace(visibleSlots, 'min')
    }

    _maxSpace(visibleSlots) {
      return this._findSpace(visibleSlots, 'max')
    }

    /**
     * Calculate the backbone radius and slot proportions based on the Viewer size and
     * the number of slots.
     */
    _adjustProportions() { // NEW
      let viewer = this.viewer;
      let slotDivider = viewer.slotDivider;
      let backbone = viewer.backbone;
      let visibleSlots = this.visibleSlots();
      this._updateSlotThicknessRatios(visibleSlots);
      // Maximum ring radius (i.e. the radius of the outermost ring) as a proportion of Viewer size
      let maxOuterProportion = 0.35;
      let maxOuterRadius = maxOuterProportion * viewer.minDimension;
      // Minimum space required at center of map as a proportion of Viewer size
      let minInnerProportion = 0.15;
      let minInnerRadius = minInnerProportion * viewer.minDimension;
      // The maximum amount of space for drawing slots, backbone, dividers, etc
      let workingSpace = maxOuterRadius - minInnerRadius;
      // Minium Space required (based on minSlotThickness)
      let minSpace = this._minSpace(visibleSlots);
      // Maximum Space possible (based on maxSlotThickness)
      // let maxSpace = this._maxSpace(visibleSlots);
      // May need to scale slots, backbone, dividers and spacing to fit everything
      let thicknessScaleFactor = Math.min(workingSpace/minSpace, 1);
      // Calculate nonSlotSpace
      let nonSlotSpace = this._nonSlotSpace(visibleSlots) * thicknessScaleFactor;
      let slotSpace = (workingSpace * thicknessScaleFactor) - nonSlotSpace;

      // The sum of the thickness ratios
      let thicknessRatioSum = this.slotThicknessRatios.sum;

      // console.log({
      //   workingSpace: workingSpace,
      //   minSpace: minSpace,
      //   maxSpace: maxSpace,
      //   thicknessScaleFactor: thicknessScaleFactor,
      //   nonSlotSpace: nonSlotSpace,
      //   slotSpace: slotSpace,
      //   thicknessRatios: thicknessRatios,
      //   thicknessRatioSum: thicknessRatioSum
      // })

      let outsideSlots = this.visibleSlots().filter( (t) => { return t.outside });
      let outsideThickness = this._nonSlotSpace(visibleSlots, 'outside');
      outsideSlots.forEach( (slot) => {
        let slotThickness = slotSpace * slot.thicknessRatio / thicknessRatioSum;
        outsideThickness += slotThickness;
      });
      // Set backbone radius
      let backboneRadius = maxOuterRadius - outsideThickness - (backbone.thickness / 2);
      viewer.backbone.radius = backboneRadius;
      // Update slot thick proportions
      this.visibleSlots().each( (i, slot) => {
        let slotThickness = slotSpace * slot.thicknessRatio / thicknessRatioSum;
        slot.proportionOfRadius = slotThickness / backboneRadius;
      });
      this._updateSlotProportionOfRadii(visibleSlots);

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
      return this._tracks.get(term)
    }

    slots(term) {
      let slots = new CGV.CGArray();
      for (let i=0, len=this._tracks.length; i < len; i++) {
        slots = slots.concat(this._tracks[i]._slots);
      }
      return slots.get(term);
    }

    visibleSlots(term) {
      return this.slots().filter( s => s.visible && s.track.visible ).get(term);
    }

    slotForRadius(radius) {
      let slots = this.visibleSlots();
      let slot;
      for (let i=0, len=slots.length; i < len; i++) {
        if (slots[i].containsRadius(radius)) {
          slot = slots[i];
          break;
        }
      }
      return slot
    }

    get slotLength() {
      return this._slotLength || 0
    }

    get fastMaxFeatures() {
      return this._fastMaxFeatures
    }

    get fastFeaturesPerSlot() {
      return this._fastFeaturesPerSlot
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
      let viewer = this.viewer;
      let backbone = viewer.backbone;
      let canvas = this.canvas;
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
      viewer.slotDivider.draw();
      // Ruler
      let radiusAdjustment = viewer.slotDivider.visible ? CGV.pixel(viewer.slotDivider.thickness) : 0;
      viewer.ruler.draw(this.insideRadius - radiusAdjustment, this.outsideRadius + radiusAdjustment);
      // Labels
      if (viewer.annotation.visible) {
        viewer.annotation.draw(this.insideRadius, this.outsideRadius);
      }
      // Progess
      this.drawProgress();
      // Debug
      // if (viewer.debug) {
      //   viewer.debug.data.time['fastDraw'] = CGV.elapsedTime(startTime);
      //   viewer.debug.draw(canvas.context('ui'));
      // }
      if (canvas._testDrawRange) {
        let ctx = canvas.context('captions')
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
      let startTime = new Date().getTime();
      this.drawMapWithoutSlots();
      this.drawAllSlots(true);
      // Debug
      if (this.viewer.debug) {
        this.viewer.debug.data.time['fastDraw'] = CGV.elapsedTime(startTime);
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
      for (let i = 0, trackLen = this._tracks.length; i < trackLen; i++) {
        track = this._tracks[i];
        if (!track.visible) { continue }
        for (let j = 0, slotLen = track._slots.length; j < slotLen; j++) {
          slot = track._slots[j];
          if (!slot.visible) { continue }
          slot.draw(this.canvas, fast)
        }
      }
    }

    drawSlotWithTimeOut(layout) {
      let slots = layout.visibleSlots();
      let slot = slots[layout._slotIndex];
      if (!slot) { return }
      slot.clear();
      slot.draw(layout.canvas);
      layout._slotIndex++;
      if (layout._slotIndex < slots.length) {
        layout._slotTimeoutID = setTimeout(layout.drawSlotWithTimeOut, 0, layout);
      } else {
        if (layout.viewer.debug) {
          layout.viewer.clear('ui');
          layout.viewer.debug.data.time['fullDraw'] = CGV.elapsedTime(layout._drawFullStartTime);
          layout.viewer.debug.draw(layout.canvas.context('ui'));
        }
        // if (typeof complete === 'function') { complete.call() }
      }
    }

    /**
     * Updates the radius and thickness of every slot, divider and ruler, only if the zoom level has changed
     */
    updateLayout(force) {
      let viewer = this.viewer;
      if (!force && this._savedZoomFactor === viewer._zoomFactor) {
        return
      } else {
        this._savedZoomFactor = viewer._zoomFactor;
      }
      let backbone = viewer.backbone;
      let slotDivider = viewer.slotDivider;
      let backboneThickness = CGV.pixel(backbone.zoomedThickness);
      let slotRadius = CGV.pixel(backbone.zoomedRadius);
      let directRadius = slotRadius + (backboneThickness / 2);
      let reverseRadius = slotRadius - (backboneThickness / 2);
      let spacing = CGV.pixel(slotDivider.spacing);
      let residualSlotThickness = 0;
      let track, slot;
      slotDivider.clearRadii();
      let visibleSlots = this.visibleSlots();
      this._slotLength = visibleSlots.length;
      for (let i = 0, len = visibleSlots.length; i < len; i++) {
        slot = visibleSlots[i];
        // Slots and Dividers
        // Calculate Slot dimensions
        // The slotRadius is the radius at the center of the slot
        let slotThickness = this._calculateSlotThickness(slot.proportionOfRadius);
        slot._thickness = slotThickness;
        if (slot.outside) {
          directRadius += ( (slotThickness / 2) + spacing + residualSlotThickness);
          slotRadius = directRadius;
        } else {
          reverseRadius -= ( (slotThickness / 2) + spacing + residualSlotThickness);
          slotRadius = reverseRadius;
        }

        slot._radius = slotRadius;

        residualSlotThickness = slotThickness / 2;

        // Calculate Divider dimensions
        let dividerThickness = slotDivider.visible ? slotDivider.thickness : 0;
        let spacingAndDividerThickness = (dividerThickness === 0) ? 0 : (dividerThickness + spacing);
        if (slot.outside) {
          directRadius += residualSlotThickness + spacingAndDividerThickness;
          slotRadius = directRadius;
        } else {
          reverseRadius -= residualSlotThickness + spacingAndDividerThickness;
          slotRadius = reverseRadius;
        }
        slotDivider.addRadius(slotRadius);
        residualSlotThickness = dividerThickness / 2;
      }
      this._fastFeaturesPerSlot = this._fastMaxFeatures / this.slotLength;
      this._insideRadius = reverseRadius;
      this._outsideRadius = directRadius;
    }

    /**
     * Slot thickness is based on a proportion of the backbone radius.
     * As the viewer is zoomed the slot radius increases until
     *  - The zoomed radius > the max zoomed radius (~ minimum dimension of the viewer).
     *    Therefore we should always be able to see all the slots in the viewer
     *  - The slot thickness is greater than the maximum allowed slot thickness
     */
    _calculateSlotThickness(proportionOfRadius) {
      let viewer = this.viewer;
      let backboneRadius = Math.min(viewer.backbone.zoomedRadius, viewer.maxZoomedRadius());
      let maxAllowedProportion = this.maxSlotThickness / backboneRadius;
      let slotProportionOfRadii = this.slotProportionOfRadii;
      if (slotProportionOfRadii.max > maxAllowedProportion) {
        if (slotProportionOfRadii.min === slotProportionOfRadii.max) {
          proportionOfRadius = maxAllowedProportion;
        } else {
          // SCALE
          // Based on the min and max allowed proportionOf Radii allowed
          let minAllowedProportion = this.minSlotThickness / backboneRadius;
          let minMaxRatio = slotProportionOfRadii.max / slotProportionOfRadii.min;
          let minProportionOfRadius = maxAllowedProportion / minMaxRatio;
          let minTo = (minProportionOfRadius < minAllowedProportion) ? minAllowedProportion : minProportionOfRadius;
          proportionOfRadius = CGV.scaleValue(proportionOfRadius,
                {min: slotProportionOfRadii.min, max: slotProportionOfRadii.max},
                {min: minTo, max: maxAllowedProportion});
        }
      }
      return CGV.pixel(proportionOfRadius * backboneRadius)
    }

    drawProgress() {
      this.canvas.clear('background');
      let track, slot, progress;
      for (let i = 0, trackLen = this._tracks.length; i < trackLen; i++) {
        track = this._tracks[i];
        progress = track.loadProgress;
        for (let j = 0, slotLen = track._slots.length; j < slotLen; j++) {
          slot = track._slots[j];
          slot.drawProgress(progress);
        }
      }
    }

    moveTrack(oldIndex, newIndex) {
      this._tracks.move(oldIndex, newIndex);
      this._adjustProportions();
    }

    removeTrack(track) {
      this._tracks = this._tracks.remove(track);
      this._adjustProportions();
    }

    toJSON() {
      let json = {
        minSlotThickness: this.minSlotThickness,
        maxSlotThickness: this.maxSlotThickness,
        tracks: []
      };
      this.tracks().each( (i, track) => {
        json.tracks.push(track.toJSON());
      });
      return json
    }


  }

  CGV.Layout = Layout;

})(CGView);
