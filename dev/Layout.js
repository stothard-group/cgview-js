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
    constructor(viewer, data = {}, display = {}, meta = {}) {
      this._viewer = viewer;
      this._tracks = new CGV.CGArray();
      this._fastMaxFeatures = 1000;

      // Create tracks
      if (data.tracks) {
        data.tracks.forEach((trackData) => {
          new CGV.Track(this, trackData);
        });
      }
      //TODO:
      //console.log the number of features and plots not associated with a track

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

    /**
     * Calculate the backbone radius and slot proportions based on the Viewer size and
     * the number of slots.
     */
    _adjustProportions() {
      var viewer = this.viewer;
      // Maximum ring radius (i.e. the radius of the outermost ring) as a proportion of Viewer size
      var maxOuterProportion = 0.35;
      var maxOuterRadius = maxOuterProportion * viewer.minDimension;
      // Minimum space required at center of map as a proportion of Viewer size
      var minInnerProportion = 0.15;
      var minInnerRadius = minInnerProportion * viewer.minDimension;
      // The maximum amount of space for drawing slots
      var dividerSpace = this.visibleSlots().length * (viewer.slotDivider.thickness + viewer.slotDivider.spacing);
      var slotSpace = maxOuterRadius - minInnerRadius - viewer.backbone.thickness - dividerSpace;
      // Max slotnesses in pixels
      var maxFeatureSlotThickness = 30;
      var maxPlotSlotThickness = 100;
      // The maximum thickness ratio between plot and feature slots. If there is
      // space try to keep the plot thickness this many times thicker than the feature slot thickness.
      var maxPlotToFeatureRatio = 6;
      var nPlotSlots = this.visibleSlots().filter( (t) => { return t.type == 'plot' }).length;
      var nFeatureSlots = this.visibleSlots().filter( (t) => { return t.type == 'feature' }).length;
      // slotSpace = nPlotSlots * plotThickness + nFeatureSlots * featureThickness
      // plotThickness = maxPlotToFeatureRatio * featureThickness
      // Solve:
      var featureThickness = slotSpace / ( (maxPlotToFeatureRatio * nPlotSlots) + nFeatureSlots );
      var plotThickness = maxPlotToFeatureRatio * featureThickness;
      featureThickness = Math.min(featureThickness, maxFeatureSlotThickness);
      plotThickness = Math.min(plotThickness, maxPlotSlotThickness);
      // Determine thickness of outside slots
      var nOutsideSlots = this.visibleSlots().filter( (t) => { return t.outside });
      var outsideThickness = 0;
      nOutsideSlots.forEach( (slot) => {
        if (slot.type == 'feature') {
          outsideThickness += featureThickness;
        } else if (slot.type == 'plot') {
          outsideThickness += plotThickness;
        }
      });
      // Set backbone radius
      var backboneRadius = maxOuterRadius - outsideThickness;
      viewer.backbone.radius = backboneRadius;
      // Update slot thick proportions
      var featureProportionOfRadius = featureThickness / backboneRadius;
      var plotProportionOfRadius = plotThickness / backboneRadius;
      this.visibleSlots().each( (i, slot) => {
        if (slot.type == 'feature') {
          slot.proportionOfRadius = featureProportionOfRadius;
        } else if (slot.type == 'plot') {
          slot.proportionOfRadius = plotProportionOfRadius;
        }
      });
      this.updateLayout(true);
    }

    tracks(term) {
      return this._tracks.get(term)
    }

    slots(term) {
      var slots = new CGV.CGArray();
      for (var i=0, len=this._tracks.length; i < len; i++) {
        slots.merge(this._tracks[i]._slots);
      }
      return slots.get(term);
    }

    visibleSlots(term) {
      var slots = new CGV.CGArray(
        this.slots().filter( (s) => { return s.visible && s.track.visible })
      );
      return slots.get(term);
    }

    slotForRadius(radius) {
      var slots = this.visibleSlots();
      var slot;
      for (var i=0, len=slots.length; i < len; i++) {
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
      this._maxSlotThickness = value;
    }

    drawMapWithoutSlots() {
      var viewer = this.viewer;
      var backbone = viewer.backbone;
      var canvas = this.canvas;
      var startTime = new Date().getTime();

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
      var radiusAdjustment = CGV.pixel(viewer.slotDivider.thickness / 2 + viewer.ruler.spacing);
      viewer.ruler.draw(this.insideRadius - radiusAdjustment, this.outsideRadius + radiusAdjustment);
      // Labels
      if (viewer.annotation.visible) {
        viewer.annotation.draw(this.insideRadius, this.outsideRadius);
      }
      // Progess
      this.drawProgress();
      // Debug
      if (viewer.debug) {
        viewer.debug.data.time['fastDraw'] = CGV.elapsedTime(startTime);
        viewer.debug.draw(canvas.context('ui'));
      }
      if (canvas._testDrawRange) {
        var ctx = canvas.context('captions')
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
      this.drawMapWithoutSlots();
      this.drawAllSlots(true);
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
      var track, slot;
      for (var i = 0, trackLen = this._tracks.length; i < trackLen; i++) {
        track = this._tracks[i];
        if (!track.visible) { continue }
        for (var j = 0, slotLen = track._slots.length; j < slotLen; j++) {
          slot = track._slots[j];
          if (!slot.visible) { continue }
          slot.draw(this.canvas, fast)
        }
      }
    }

    drawSlotWithTimeOut(layout) {
      var slots = layout.visibleSlots();
      var slot = slots[layout._slotIndex];
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
      var viewer = this.viewer;
      if (!force && this._savedZoomFactor == viewer._zoomFactor) {
        return
      } else {
        this._savedZoomFactor = viewer._zoomFactor;
      }
      var backbone = viewer.backbone;
      var backboneThickness = CGV.pixel(backbone.zoomedThickness);
      var slotRadius = CGV.pixel(backbone.zoomedRadius);
      var directRadius = slotRadius + (backboneThickness / 2);
      var reverseRadius = slotRadius - (backboneThickness / 2);
      var spacing = CGV.pixel(viewer.slotDivider.spacing);
      var residualSlotThickness = 0;
      var track, slot;
      viewer.slotDivider.clearRadii();
      this._slotLength = 0;
      for (var i = 0, trackLen = this._tracks.length; i < trackLen; i++) {
        track = this._tracks[i];
        if (!track.visible) { continue }
        // Slots and Dividers
        for (var j = 0, slotLen = track._slots.length; j < slotLen; j++) {
          var slot = track._slots[j];
          if (!slot.visible) { continue }
          this._slotLength++;
          // Calculate Slot dimensions
          // The slotRadius is the radius at the center of the slot
          var slotThickness = this._calculateSlotThickness(slot.proportionOfRadius);
          slot._thickness = slotThickness;
          if (track.position == 'outside' || (track.position == 'both' && slot.isDirect()) ) {
            directRadius += ( (slotThickness / 2) + spacing + residualSlotThickness);
            slotRadius = directRadius;
          } else {
            reverseRadius -= ( (slotThickness / 2) + spacing + residualSlotThickness);
            slotRadius = reverseRadius;
          }

          slot._radius = slotRadius;

          residualSlotThickness = slotThickness / 2;

          // Calculate Divider dimensions
          var dividerThickness = viewer.slotDivider.thickness;
          if (track.position == 'outside' || (track.position == 'both' && slot.isDirect()) ) {
            directRadius += spacing + residualSlotThickness + dividerThickness;
            slotRadius = directRadius;
          } else {
            reverseRadius -= spacing + residualSlotThickness + dividerThickness;
            slotRadius = reverseRadius;
          }
          viewer.slotDivider.addRadius(slotRadius);
          residualSlotThickness = dividerThickness / 2;
        }
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
     *  - The slot thickness is greater than the maximum allowed slot thickness (if it's defined)
     */
    _calculateSlotThickness(proportionOfRadius) {
      var viewer = this.viewer;
      var thickness = CGV.pixel( Math.min(viewer.backbone.zoomedRadius, viewer.maxZoomedRadius()) * proportionOfRadius);
      return (this.maxSlotThickness ? Math.min(thickness, CGV.pixel(this.maxSlotThickness)) : thickness)
    }

    drawProgress() {
      this.canvas.clear('background');
      var track, slot, progress;
      for (var i = 0, trackLen = this._tracks.length; i < trackLen; i++) {
        track = this._tracks[i];
        progress = track.loadProgress;
        for (var j = 0, slotLen = track._slots.length; j < slotLen; j++) {
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
      var json = {tracks: []};
      this.tracks().each( (i, track) => {
        json.tracks.push(track.toJSON());
      });
      return json
    }


  }

  CGV.Layout = Layout;

})(CGView);
