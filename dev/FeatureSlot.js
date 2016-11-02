//////////////////////////////////////////////////////////////////////////////
// FeatureSlot
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class FeatureSlot {

    constructor(data = {}, display = {}, meta = {}) {
      // this._viewer = viewer;
      this._strand = CGV.default_for(data.strand, 'direct');
      this._features = new CGV.CGArray();

      if (data.features) {
        data.features.forEach((featureData) =>
            var feature = new CGV.Feature(featureData);
            this.addFeature(feature);
        );
      }
    }

    addFeature(feature) {
    }

  }

  CGV.FeatureSlot = FeatureSlot;

})(CGView);
