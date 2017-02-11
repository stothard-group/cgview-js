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
      this.viewer = viewer;
      this._slots = new CGV.CGArray();

      // Create slots
      // Create tracks
      if (data.slots) {
        data.slots.forEach((slotData) => {
          new CGV.Slot(this, slotData);
        });
        // this.refresh();
      }

    }

    /** * @member {Viewer} - Get or set the *Viewer*
     */
    get viewer() {
      return this._viewer
    }

    set viewer(viewer) {
      if (this.viewer) {
        // TODO: Remove if already attached to Viewer
      }
      this._viewer = viewer;
      viewer._slots.push(this);
    }

    /**
     * @member {Sequence} - Get the sequence.
     */
    get sequence() {
      return this.viewer.sequence
    }



    get strand() {
      return this._strand;
    }

    isDirect() {
      return this.strand == 'direct'
    }

    isReverse() {
      return this.strand == 'reverse'
    }

    get hasFeatures() {
      return this._features.length > 0
    }

    get hasArcPlot() {
      return this._arcPlot
    }

    draw(canvas, fast, slotRadius, slotThickness) {
      var range = canvas.visibleRangeForRadius(slotRadius, slotThickness);
      this._visibleRange = range;
      this._radius = slotRadius;
      this._thickness = slotThickness;
      if (range) {
        var start = range.start;
        var stop = range.stop;
        if (this.hasFeatures) {
          var featureCount = this._features.length;
          var largestLength = this.largestFeatureLength;
          // Case where the largest feature should not be subtracted
          // _____ Visible
          // ----- Not Visbile
          // Do no subtract the largest feature so that the start loops around to before the stop
          // -----Start_____Stop-----
          // In cases where the start is shortly after the stop, make sure that subtracting the largest feature does not put the start before the stop
          // _____Stop-----Start_____
          if ( (largestLength <= (this.sequence.length - Math.abs(start - stop))) &&
               (this.sequence.subtractBp(start, stop) > largestLength) ) {
            start = range.getStartPlus(-largestLength);
            featureCount = this._featureStarts.countFromRange(start, stop);
          }
          if (fast && featureCount > 2000) {
            canvas.drawArc(1, this.sequence.length, slotRadius, 'rgba(0,0,200,0.03)', slotThickness);
          } else {
            this._featureStarts.eachFromRange(start, stop, 1, (i) => {
              this._features[i].draw(canvas, slotRadius, slotThickness, range);
            })
          }
          if (this.viewer.debug && this.viewer.debug.data.n) {
            var index = this.viewer._tracks.indexOf(this);
            this.viewer.debug.data.n['slot_' + index] = featureCount;
          }
        } else if (this.hasArcPlot) {
          this._arcPlot.draw(canvas, slotRadius, slotThickness, fast, range);
        }
      }
    }

  }

  CGV.Layout = Layout;

})(CGView);
