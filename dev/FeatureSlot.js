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

  }

  CGV.FeatureSlot = FeatureSlot;

})(CGView);
