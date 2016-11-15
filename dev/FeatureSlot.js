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

    draw(fast, slotRadius, slotThickness) {
      if (fast && slot._features.length > 500) {
        this.draw_arc(0, this.sequenceLength, slotRadius, 'rgba(0,0,200,0.1)', slotThickness);
      } else {
        slot._features.forEach((feature) => {
          feature._featureRanges.forEach((range) => {
            // this.draw_arc(range._start, range._stop, slotRadius, feature._color, slotThickness);
            range.draw(this.ctx, this.scale, slotRadius, slotThickness);
          });
          feature._featurePaths.forEach((path) => {
            path.draw(this.ctx, this.scale, slotRadius, slotThickness);
          });
        });
      }
    }

  }

  CGV.FeatureSlot = FeatureSlot;

})(CGView);
