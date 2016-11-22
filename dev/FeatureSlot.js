//////////////////////////////////////////////////////////////////////////////
// FeatureSlot
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class FeatureSlot {

    constructor(data = {}, display = {}, meta = {}) {
      // this._viewer = viewer;
      this._strand = CGV.default_for(data.strand, 'direct');
      this._features = new CGV.CGArray();
      this._arcPlot;
      this._proportionOfRadius = CGV.default_for(data.proportionOfRadius, 0.1)

      this._featureStarts = new CGV.CGArray();

      if (data.features) {
        data.features.forEach((featureData) => {
          var feature = new CGV.Feature(featureData);
          this.addFeature(feature);
        });
        this.refresh();
      }

      if (data.arcPlot) {
        var arcPlot = new CGV.ArcPlot(data.arcPlot);
        arcPlot._featureSlot = this;
        this._arcPlot = arcPlot;
      }
    }

    addFeature(feature) {
      this._features.push(feature);
      feature._featureSlot = this;
    }

    // Refresh needs to be called when new features are added, etc
    // FeatureRanges need to be sort by start position
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

    get viewer() {
      return this._viewer
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

    length() {
      return this._viewer.sequenceLength;
    }

    visibleRanges(canvas, slotRadius, slotThickness) {
      var ranges = canvas.visibleRangesForRadius(slotRadius, slotThickness);
      if (ranges.length == 2) {
        return ranges
      } else if (ranges.length > 2) {
        return [ ranges[0], ranges[ranges.length -1] ]
      } else {
        return undefined
      }
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
      var ranges = this.visibleRanges(canvas, slotRadius, slotThickness)
      var start = ranges ? ranges[0] : 1;
      var stop = ranges ? ranges[1] : this._viewer.sequenceLength;
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
             (largestLength <= (this._viewer.sequenceLength - Math.abs(start - stop))) &&
             (this.viewer.subtractBp(start, stop) > largestLength) ) {
          start = this.viewer.subtractBp(start, largestLength);
          featureCount = this._featureStarts.countFromRange(start, stop);
        }
        if (fast && featureCount > 2000) {
          canvas.drawArc(1, this._viewer.sequenceLength, slotRadius, 'rgba(0,0,200,0.05)', slotThickness);
        } else {
          this._featureStarts.eachFromRange(start, stop, 1, (i) => {
            this._features[i].draw(canvas, slotRadius, slotThickness);
          })
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
