//////////////////////////////////////////////////////////////////////////////
// FeatureSlot
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class FeatureSlot {

    constructor(data = {}, display = {}, meta = {}) {
      // this._viewer = viewer;
      this._strand = CGV.default_for(data.strand, 'direct');
      this._features = new CGV.CGArray();
      this._proportionOfRadius = CGV.default_for(data.proportionOfRadius, 0.1)

      if (data.features) {
        var features
        if (!Array.isArray(data.features)) {
          features = [data.features];
        } else {
          features = data.features
        }
        features.forEach((featureData) => {
          var feature = new CGV.Feature(featureData);
          this.addFeature(feature);
        });
      }
    }

    addFeature(feature) {
      this._features.push(feature);
      feature._featureSlot = this;
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

    length() {
      return this._viewer.sequenceLength;
    }

    visibleRanges(canvas, slotRadius, slotThickness) {
      var ranges = canvas.visibleRangesForRadius(slotRadius);
      if (ranges.length == 2) {
        return ranges
      } else if (ranges.length > 2) {
        return [ ranges[0], ranges[ranges.length -1] ]
      } else {
        return undefined
      }
    }


    // rangeLength(range) {
    //   if (range[1] >= range[0]) {
    //     return range[1] - range[0]
    //   } else {
    //     return this.viewer.sequenceLength + (range[1] - range[0])
    //   } 
    // }
    //
    // largestRange(ranges) {
    //   var largestLength = 0;
    //   var range;
    //   for (var i = i, len = ranges.length; i < len; i++) {
    //     var newLength = rangeLength(ranges[i]);
    //     if (newLength >= largestLength) {
    //       largestLength = newLength;
    //       range = ranges[i];
    //     }
    //   }
    //   return range
    // }
    //
    // visibleRanges(canvas, slotRadius, slotThickness) {
    //   var rangesInner = canvas.visibleRangesForRadius(slotRadius - (slotThickness / 2));
    //   var rangesOuter = canvas.visibleRangesForRadius(slotRadius + (slotThickness / 2));
    //
    //   if (rangesInner.length >= 2 && rangesOuter.length >= 2) {
    //     return this.largestRange([
    //       [rangesInner[0], rangesInner[rangesInner.length -1] ],
    //       [rangesOuter[0], rangesOuter[rangesOuter.length -1] ],
    //       [rangesInner[0], rangesOuter[rangesOuter.length -1] ],
    //       [rangesOuter[0], rangesInner[rangesInner.length -1] ]
    //     ])
    //
    //   } else if (rangesInner.length >= 2) {
    //     return [ rangesInner[0], rangesInner[rangesInner.length -1] ]
    //   } else if (rangesOuter.length >= 2) {
    //     return [ rangesOuter[0], rangesOuter[rangesOuter.length -1] ]
    //   } else {
    //     return undefined
    //   }
    // }

    // TODO: this should be saved until refresh
    largestFeatureLength() {
      var length = 0;
      for (var i = 0, len = this._features.length; i < len; i++) {
        var nextLength = this._features[i].length;
        if (nextLength > length) {
          length = nextLength
        }
      }
      return length
    }

    extractFeaturesByRange(start, stop) {
      var features = [];
      var largestLength = this.largestFeatureLength();
      // The start can not be less than the stop
      start = (largestLength >= (start - stop)) ? stop + 1 : start - largestLength;
      for (var i = 0, len = this._features.length; i < len; i++) {
        if (CGV.withinRange(this._features[i].start, start, stop)) {
          features.push(this._features[i]);
        }
      }
      return features
    }

    draw(canvas, fast, slotRadius, slotThickness) {
      var ranges = this.visibleRanges(canvas, slotRadius, slotThickness)
      var features = ranges ? this.extractFeaturesByRange(ranges[0], ranges[1]) : this._features;
      if (fast && features.length > 500) {
        canvas.drawArc(0, this._viewer.sequenceLength, slotRadius, 'rgba(0,0,200,0.05)', slotThickness);
      } else {
        for (var i = 0, len = features.length; i < len; i++) {
          features[i]._featureRanges.forEach((range) => {
            range.draw(canvas, slotRadius, slotThickness);
          });
          features[i]._featurePaths.forEach((path) => {
            if (ranges) {
              path.draw(canvas, slotRadius, slotThickness, fast, ranges[0], ranges[1]);
            } else {
              path.draw(canvas, slotRadius, slotThickness, fast);
            }
          });
        }
      }
    }
    // draw(canvas, fast, slotRadius, slotThickness) {
    //   this.visibleExtents(canvas, slotRadius, slotThickness)
    //   var features = extractFeaturesByRange();
    //   if (fast && features.length > 500) {
    //     canvas.drawArc(0, this.sequenceLength, slotRadius, 'rgba(0,0,200,0.1)', slotThickness);
    //   } else {
    //     features.forEach((feature) => {
    //       feature._featureRanges.forEach((range) => {
    //         range.draw(canvas, slotRadius, slotThickness);
    //       });
    //       feature._featurePaths.forEach((path) => {
    //         // path.draw(canvas.ctx, canvas.scale, slotRadius, slotThickness);
    //         path.draw(canvas, slotRadius, slotThickness);
    //       });
    //     });
    //   }
    // }
    // draw2(canvas, fast, slotRadius, slotThickness) {
    //   if (fast && this._features.length > 500) {
    //     canvas.drawArc(0, this.sequenceLength, slotRadius, 'rgba(0,0,200,0.1)', slotThickness);
    //   } else {
    //     this._features.forEach((feature) => {
    //       feature._featureRanges.forEach((range) => {
    //         range.draw(canvas, slotRadius, slotThickness);
    //       });
    //       feature._featurePaths.forEach((path) => {
    //         // path.draw(canvas.ctx, canvas.scale, slotRadius, slotThickness);
    //         path.draw(canvas, slotRadius, slotThickness);
    //       });
    //     });
    //   }
    // }

  }

  CGV.FeatureSlot = FeatureSlot;

})(CGView);
