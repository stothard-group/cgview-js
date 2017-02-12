//////////////////////////////////////////////////////////////////////////////
// Track
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class Track {

    /**
     * Track
     */
    constructor(slot, data = {}, display = {}, meta = {}) {
      this.slot = slot;
      this._strand = CGV.defaultFor(data.strand, 'direct');
      this._features = new CGV.CGArray();
      this._arcPlot;
      this.proportionOfRadius = CGV.defaultFor(data.proportionOfRadius, 0.1)

      this._featureStarts = new CGV.CGArray();

      // if (data.features) {
      //   data.features.forEach((featureData) => {
      //     new CGV.Feature(this, featureData);
      //   });
      //   this.refresh();
      // }

      // if (data.arcPlot) {
      //   new CGV.ArcPlot(this, data.arcPlot);
      // }
    }

    /** * @member {Slot} - Get the *Slot*
     */
    get slot() {
      return this._slot
    }

    set slot(slot) {
      if (this.slot) {
        // TODO: Remove if already attached to Slot
      }
      this._slot = slot;
      slot._tracks.push(this);
    }

    /** * @member {Viewer} - Get the *Viewer*
     */
    get viewer() {
      return this.slot.viewer
    }

    /**
     * @member {Sequence} - Get the sequence.
     */
    get sequence() {
      return this.viewer.sequence
    }

    /**
     * @member {Viewer} - Get or set the slot size with is measured as a 
     * proportion of the backbone radius.
     */
    get proportionOfRadius() {
      return this._proportionOfRadius
    }

    set proportionOfRadius(value) {
      this._proportionOfRadius = value;
    }

    /**
     * @member {Number} - Get the current radius of the track.
     */
    get radius() {
      return this._radius
    }

    /**
     * @member {Number} - Get the current thickness of the track.
     */
    get thickness() {
      return this._thickness
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

    replaceFeatures(features) {
      this._features = features;
      this.refresh();
    }

    /**
     * The number of pixels per basepair along the feature slot circumference.
     * @return {Number}
     */
    pixelsPerBp() {
      return (this.radius * 2 * Math.PI) / this.sequence.length;
    }

    // Refresh needs to be called when new features are added, etc
    // Features need to be sorted by start position
    // NOTE: consider using d3 bisect for inserting new features in the proper sort order
    refresh() {
      // Sort the features by start
      this._features.sort( (a, b) => {
        return a.start - b.start
      });
      // Clear feature starts
      this._featureStarts = new CGV.CGArray();
      for (var i = 0, len = this._features.length; i < len; i++) {
        this._featureStarts.push(this._features[i].start);
      }
      this._largestFeatureLength = this.findLargestFeatureLength();
    }

    /**
     * Get the visible range
     * @member {Range}
     */
    get visibleRange() {
      return this._visibleRange
    }

    get largestFeatureLength() {
      return this._largestFeatureLength
    }

    findLargestFeatureLength() {
      var length = 0;
      for (var i = 0, len = this._features.length; i < len; i++) {
        var nextLength = this._features[i].length;
        if (nextLength > length) {
          length = nextLength
        }
      }
      return length
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

  CGV.Track = Track;

})(CGView);
