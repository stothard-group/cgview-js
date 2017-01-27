//////////////////////////////////////////////////////////////////////////////
// FeatureSlot
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class FeatureSlot {

    /**
     * TEST
     */
    constructor(viewer, data = {}, display = {}, meta = {}) {
      this.viewer = viewer;
      this._strand = CGV.defaultFor(data.strand, 'direct');
      this._features = new CGV.CGArray();
      this._arcPlot;
      this._proportionOfRadius = CGV.defaultFor(data.proportionOfRadius, 0.1)

      this._featureStarts = new CGV.CGArray();

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

    /**
     * @member {Viewer} - Get or set the *Viewer*
     */
    get viewer() {
      return this._viewer
    }

    set viewer(viewer) {
      if (this.viewer) {
        // TODO: Remove if already attached to Viewer
      }
      this._viewer = viewer;
      viewer._featureSlots.push(this);
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

    length() {
      return this.viewer.sequenceLength;
    }

    // visibleRanges(canvas, slotRadius, slotThickness) {
    //   var ranges = canvas.visibleRangesForRadius(slotRadius, slotThickness);
    //   if (ranges.length == 2) {
    //     return ranges
    //   } else if (ranges.length > 2) {
    //     return [ ranges[0], ranges[ranges.length -1] ]
    //   } else {
    //     return undefined
    //   }
    // }

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
      // var ranges = this.visibleRanges(canvas, slotRadius, slotThickness)
      var ranges = canvas.visibleRangeForRadius(slotRadius, slotThickness);
      var start = ranges ? ranges[0] : 1;
      var stop = ranges ? ranges[1] : this.viewer.sequenceLength;
      var featureCount = this._features.length;
      if (this.hasFeatures) {
        var largestLength = this.largestFeatureLength;
        // Case where the largest feature should not be subtracted
        // _____ Visible
        // ----- Not Visbile
        // Do no subtract the largest feature so that the start loops around to before the stop
        // -----Start_____Stop-----
        // In cases where the start is shortly after the stop, make sure that subtracting the largest feature does not put the start before the stop
        // _____Stop-----Start_____
        if (ranges &&
             (largestLength <= (this.viewer.sequenceLength - Math.abs(start - stop))) &&
             (this.viewer.subtractBp(start, stop) > largestLength) ) {
          start = this.viewer.subtractBp(start, largestLength);
          featureCount = this._featureStarts.countFromRange(start, stop);
        }
        if (fast && featureCount > 2000) {
          canvas.drawArc(1, this.viewer.sequenceLength, slotRadius, 'rgba(0,0,200,0.03)', slotThickness);
        } else {
          this._featureStarts.eachFromRange(start, stop, 1, (i) => {
            this._features[i].draw(canvas, slotRadius, slotThickness);
          })
        }
        if (this.viewer.debug && this.viewer.debug.data.n) {
          var index = this.viewer._featureSlots.indexOf(this);
          this.viewer.debug.data.n['slot_' + index] = featureCount;
        }
      } else if (this.hasArcPlot) {
        if (ranges) {
          this._arcPlot.draw(canvas, slotRadius, slotThickness, fast, ranges[0], ranges[1]);
        } else {
          this._arcPlot.draw(canvas, slotRadius, slotThickness, fast);
        }
      }
    }

  }

  CGV.FeatureSlot = FeatureSlot;

})(CGView);
