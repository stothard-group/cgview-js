//////////////////////////////////////////////////////////////////////////////
// Layout
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * The Layout is in control of creating slots from tracks.
   */
  class Layout {

    /**
     * Create a Layout
     */
    constructor(viewer, data = {}, display = {}, meta = {}) {
      this._viewer = viewer;
      this._tracks = new CGV.CGArray();

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
      var dividerSpace = this.slots().length * (viewer.slotDivider.thickness + viewer.slotSpacing);
      var slotSpace = maxOuterRadius - minInnerRadius - viewer.backbone.thickness - dividerSpace;
      // Max slotnesses in pixels
      var maxFeatureSlotThickness = 30;
      var maxPlotSlotThickness = 100;
      // The maximum thickness ratio between plot and feature slots. If there is
      // space try to keep the plot thickness this many times thicker than the feature slot thickness.
      var maxPlotToFeatureRatio = 6;
      var nPlotSlots = this.slots().filter( (t) => { return t.type == 'plot' }).length;
      var nFeatureSlots = this.slots().filter( (t) => { return t.type == 'feature' }).length;
      // slotSpace = nPlotSlots * plotThickness + nFeatureSlots * featureThickness
      // plotThickness = maxPlotToFeatureRatio * featureThickness
      // Solve:
      var featureThickness = slotSpace / ( (maxPlotToFeatureRatio * nPlotSlots) + nFeatureSlots );
      var plotThickness = maxPlotToFeatureRatio * featureThickness;
      featureThickness = Math.min(featureThickness, maxFeatureSlotThickness);
      plotThickness = Math.min(plotThickness, maxPlotSlotThickness);
      // Determine thickness of outside slots
      var nOutsideSlots = this.slots().filter( (t) => { return t.outside });
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
      this.slots().each( (i, slot) => {
        if (slot.type == 'feature') {
          slot.proportionOfRadius = featureProportionOfRadius;
        } else if (slot.type == 'plot') {
          slot.proportionOfRadius = plotProportionOfRadius;
        }
      });
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

    /*
     * Draw plan:
     * - return if drawTime && drawTime is < 20
     * - set drawTime = 0
     * - slotIndex = 0
     * - clearTimeout
     * - draw backbone
     * - calculate radii for slots and dividers (make additional divider type for map perimeter/inner/outer/
     * - draw dividers and ruler
     * - draw slots
     *     drawInterupt = true
     *     drawSlot
   *         draw slot slotIndex
   *         if last index
   *           drawTime = undefined
   *         else
   *           increase index
   *           set timeOut to drawSlot in 1ms
     *
     */
    draw(fast) {
      var viewer = this.viewer;
      var backbone = viewer.backbone;
      var canvas = viewer.canvas;
      var ctx = viewer.ctx;
      var startTime = new Date().getTime();

      viewer.clear();

      // All Text should have base line top
      ctx.textBaseline = 'top';

      // Draw Backbone
      backbone.draw();

      this.updateLayout();

      // Slots
      this._slotIndex = 0;
      if (this._slotTimeoutID) {
        clearTimeout(this._slotTimeoutID);
        this._slotTimeoutID = undefined;
      }

      if (fast) {
        var track, slot;
        for (var i = 0, trackLen = this._tracks.length; i < trackLen; i++) {
          track = this._tracks[i];
          for (var j = 0, slotLen = track._slots.length; j < slotLen; j++) {
            var slot = track._slots[j];
            slot.draw(canvas, fast)
          }
        }
      } else {
        this.drawSlotWithTimeOut(this);
      }

      // Draw Divider rings
      viewer.slotDivider.draw();
      // Ruler
      viewer.ruler.draw(this.insideRadius, this.outsideRadius);
      // Legend
      viewer.legend.draw(ctx);
      // Captions
      for (var i = 0, len = viewer._captions.length; i < len; i++) {
        viewer._captions[i].draw(ctx);
      }

      // Labels
      if (viewer.globalLabel) {
        viewer.labelSet.draw(this.insideRadius, this.outsideRadius);
      }

      if (viewer.debug) {
        viewer.debug.data.time['draw'] = CGV.elapsed_time(startTime);
        viewer.debug.draw(ctx);
      }

      if (viewer._testDrawRange) {
        ctx.strokeStyle = 'grey';
        ctx.rect(0, 0, canvas.width, canvas.height);
        ctx.stroke();
      }
    }

    drawSlotWithTimeOut(layout) {
      var slot = layout.slots(layout._slotIndex + 1);
      slot.draw(layout.viewer.canvas);
      layout._slotIndex++;
      if (layout._slotIndex < layout.slots().length) {
        layout._slotTimeoutID = setTimeout(layout.drawSlotWithTimeOut, 0, layout);
      }
    }

    /**
     * Updates the radius and thickness of every slot, divider and ruler, only if the zoom level has changed
     */
    updateLayout() {
      var viewer = this.viewer;
      if (this._savedZoomFactor == viewer._zoomFactor) {
        return
      } else {
        this._savedZoomFactor = viewer._zoomFactor;
      }
      var backbone = viewer.backbone;
      var backboneThickness = CGV.pixel(backbone.zoomedThickness);
      var slotRadius = CGV.pixel(backbone.zoomedRadius);
      var directRadius = slotRadius + (backboneThickness / 2);
      var reverseRadius = slotRadius - (backboneThickness / 2);
      var spacing = CGV.pixel(viewer.slotSpacing);
      var residualSlotThickness = 0;
      var track, slot;
      viewer.slotDivider.clearRadii();
      for (var i = 0, trackLen = this._tracks.length; i < trackLen; i++) {
        track = this._tracks[i];
        // Slots and Dividers
        for (var j = 0, slotLen = track._slots.length; j < slotLen; j++) {
          var slot = track._slots[j];
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
          if (viewer.slotDivider.visible) {
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
      }
      this._insideRadius = reverseRadius;
      this._outsideRadius = directRadius;
    }

    /**
     * Slot thickness is based on a proportion of the backbone radius.
     * As the viewer is zoomed the slot radius increases until
     *  - The zoomed radius > the max zoomed radius (~ minimum dimension of the viewer).
     *    Therefore the we should always be able to see all the slots in the viewer
     *  - The slot thickness is greater than the maximum allowed slot thickness (if it's defined)
     */
    _calculateSlotThickness(proportionOfRadius) {
      var viewer = this.viewer;
      var thickness = CGV.pixel( Math.min(viewer.backbone.zoomedRadius, viewer.maxZoomedRadius()) * proportionOfRadius);
      return (viewer.maxSlotThickness ? Math.min(thickness, CGV.pixel(viewer.maxSlotThickness)) : thickness)
    }

  }

  CGV.Layout = Layout;

})(CGView);
