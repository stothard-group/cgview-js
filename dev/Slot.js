//////////////////////////////////////////////////////////////////////////////
// Slot
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * The Slot is used for layout information
   */
  class Slot {

    /**
     * Create a new slot.
     */
    constructor(viewer, data = {}, display = {}, meta = {}) {
      this.viewer = viewer;
      this._features = new CGV.CGArray();
      this._arcPlot;
      this.readingFrame = CGV.defaultFor(data.readingFrame, 'combined')
      this.strand = CGV.defaultFor(data.strand, 'separated')
      this.position = CGV.defaultFor(data.strand, 'both')

      if (data.features) {
        data.features.forEach((featureData) => {
          new CGV.Feature(this, featureData);
        });
        this.refresh();
      }

      if (data.arcPlot) {
        new CGV.ArcPlot(this, data.arcPlot);
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



    /**
     * @member {String} - Get or set the strand. Possible values are 'separated' or 'combined'.
     */
    get strand() {
      return this._strand;
    }

    set strand(value) {
      if (CGV.validate(value, ['separated', 'combined'])) {
        this._strand = value;
      }
    }

    /**
     * @member {String} - Get or set the readingFrame. Possible values are 'combinded' or 'separated'.
     */
    get readingFrame() {
      return this._readingFrame;
    }

    set readingFrame(value) {
      if (CGV.validate(value, ['separated', 'combined'])) {
        this._readingFrame = value;
      }
    }

    /**
     * @member {String} - Get or set the position. Possible values are 'inside', 'outside', or 'both'.
     */
    get position() {
      return this._position;
    }

    set position(value) {
      if (CGV.validate(value, ['inside', 'outside', 'both'])) {
        this._position = value;
      }
    }


    get hasFeatures() {
      return this._features.length > 0
    }

    get hasArcPlot() {
      return this._arcPlot
    }

    features(term) {
      return this._features.get(term)
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

  CGV.Slot = Slot;

})(CGView);
