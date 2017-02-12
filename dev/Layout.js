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
        // Tracks
        for (var i = 0, len = slot._tracks.length; i < len; i++) {
          var track = slot._tracks[i];
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
