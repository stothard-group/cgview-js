//////////////////////////////////////////////////////////////////////////////
// Layout
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * The Layout is in control of creating tracks/rows from slots.
   */
  class Layout {

    /**
     * Create a Layout
     */
    constructor(viewer, data = {}, display = {}, meta = {}) {
      this._viewer = viewer;
      this._slots = new CGV.CGArray();

      // Create slots
      if (data.slots) {
        data.slots.forEach((slotData) => {
          new CGV.Slot(this, slotData);
        });
      }
      this._adjustProportions();
    }

    /** * @member {Viewer} - Get the *Viewer*
     */
    get viewer() {
      return this._viewer
    }

    // /**
    //  * @member {Sequence} - Get the sequence.
    //  */
    // get sequence() {
    //   return this.viewer.sequence
    // }

    /**
     * Calculate the backbone radius and track proportions based on the Viewer size and
     * the number of tracks.
     */
    _adjustProportions() {
      var viewer = this.viewer;
      // Maximum ring radius (i.e. the radius of the outermost ring) as a proportion of Viewer size
      var maxOuterProportion = 0.4;
      var maxOuterRadius = maxOuterProportion * viewer.minDimension;
      // Minimum space required at center of map as a proportion of Viewer size
      var minInnerProportion = 0.15;
      var minInnerRadius = minInnerProportion * viewer.minDimension;
      // The maximum amount of space for drawing tracks
      var dividerSpace = this.tracks().length * (viewer.trackDivider.thickness + viewer.trackSpacing);
      var trackSpace = maxOuterRadius - minInnerRadius - viewer.backbone.thickness - dividerSpace;
      // Max tracknesses in pixels
      var maxFeatureTrackThickness = 50;
      var maxPlotTrackThickness = 100;
      // The maximum thickness ratio between plot and feature tracks. If there is
      // space try to keep the plot thickness this many times thicker than the feature track thickness.
      var maxPlotToFeatureRatio = 6;
      var nPlotTracks = this.tracks().filter( (t) => { return t.type == 'plot' }).length;
      var nFeatureTracks = this.tracks().filter( (t) => { return t.type == 'feature' }).length;
      // trackSpace = nPlotTracks * plotThickness + nFeatureTracks * featureThickness
      // plotThickness = maxPlotToFeatureRatio * featureThickness
      // Solve:
      var featureThickness = trackSpace / ( (maxPlotToFeatureRatio * nPlotTracks) + nFeatureTracks );
      var plotThickness = maxPlotToFeatureRatio * featureThickness;
      featureThickness = Math.min(featureThickness, maxFeatureTrackThickness);
      plotThickness = Math.min(plotThickness, maxPlotTrackThickness);
      // Determine thickness of outside tracks
      var nOutsideTracks = this.tracks().filter( (t) => { return t.outside });
      var outsideThickness = 0;
      nOutsideTracks.forEach( (track) => {
        if (track.type == 'feature') {
          outsideThickness += featureThickness;
        } else if (track.type == 'plot') {
          outsideThickness += plotThickness;
        }
      });
      // Set backbone radius
      var backboneRadius = maxOuterRadius - outsideThickness;
      viewer.backbone.radius = backboneRadius;
      // Update track thick proportions
      var featureProportionOfRadius = featureThickness / backboneRadius;
      var plotProportionOfRadius = plotThickness / backboneRadius;
      this.tracks().each( (i, track) => {
        if (track.type == 'feature') {
          track.proportionOfRadius = featureProportionOfRadius;
        } else if (track.type == 'plot') {
          track.proportionOfRadius = plotProportionOfRadius;
        }
      });
    }

    slots(term) {
      return this._slots.get(term)
    }

    tracks(term) {
      var tracks = new CGV.CGArray();
      for (var i=0, len=this._slots.length; i < len; i++) {
        tracks.merge(this._slots[i]._tracks);
      }
      return tracks.get(term);
    }

    draw(fast) {
      var viewer = this.viewer;
      var backbone = viewer.backbone;
      var canvas = viewer.canvas;
      var ctx = viewer.ctx;

      var startTime = new Date().getTime();
      viewer.clear();
      var backboneThickness = CGV.pixel(backbone.zoomedThickness);
      var trackRadius = CGV.pixel(backbone.zoomedRadius);
      var directRadius = trackRadius + (backboneThickness / 2);
      var reverseRadius = trackRadius - (backboneThickness / 2);
      var spacing = CGV.pixel(viewer.trackSpacing);
      var visibleRadii = canvas.visibleRadii();

      // All Text should have base line top
      ctx.textBaseline = 'top';

      // Draw Backbone
      backbone.draw();

      var residualTrackThickness = 0;

      var slot, track;
      for (var i = 0, len = this._slots.length; i < len; i++) {
        slot = this._slots[i];
        // Tracks and Dividers
        for (var j = 0, len = slot._tracks.length; j < len; j++) {
          var track = slot._tracks[j];
          // Calculate Track dimensions
          // The trackRadius is the radius at the center of the track
          var trackThickness = this._calculateTrackThickness(track.proportionOfRadius);
          if (slot.position == 'outside' || (slot.position == 'both' && track.isDirect()) ) {
            directRadius += ( (trackThickness / 2) + spacing + residualTrackThickness);
            trackRadius = directRadius;
          } else {
            reverseRadius -= ( (trackThickness / 2) + spacing + residualTrackThickness);
            trackRadius = reverseRadius;
          }
          residualTrackThickness = trackThickness / 2;
          // Draw Track
          track.draw(canvas, fast, trackRadius, trackThickness);

          // Calculate Divider dimensions
          if (viewer.trackDivider.visible) {
            var dividerThickness = viewer.trackDivider.thickness;
            if (slot.position == 'outside' || (slot.position == 'both' && track.isDirect()) ) {
              directRadius += spacing + residualTrackThickness + dividerThickness;
              trackRadius = directRadius;
            } else {
              reverseRadius -= spacing + residualTrackThickness + dividerThickness;
              trackRadius = reverseRadius;
            }
            residualTrackThickness = dividerThickness / 2;
            // Draw Track Divider
            viewer.trackDivider.draw(trackRadius);
          }
        }
      }

      // Ruler
      viewer.ruler.draw(reverseRadius, directRadius);

      // Legends
      for (var i = 0, len = viewer._legends.length; i < len; i++) {
        viewer._legends[i].draw(ctx);
      }

      // Labels
      if (viewer.globalLabel) {
        // viewer.labelSet.draw(reverseRadius, directRadius);
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

    /**
     * Track thickness is based on a proportion of the backbone radius.
     * As the viewer is zoomed the track radius increases until
     *  - The zoomed radius > the max zoomed radius (~ minimum dimension of the viewer).
     *    Therefore the we should always be able to see all the tracks in the viewer
     *  - The track thickness is greater than the maximum allowed track thickness (if it's defined)
     */
    _calculateTrackThickness(proportionOfRadius) {
      var viewer = this.viewer;
      var thickness = CGV.pixel( Math.min(viewer.backbone.zoomedRadius, viewer.maxZoomedRadius()) * proportionOfRadius);
      return (viewer.maxSlotThickness ? Math.min(thickness, CGV.pixel(viewer.maxSlotThickness)) : thickness)
    }

  }

  CGV.Layout = Layout;

})(CGView);
