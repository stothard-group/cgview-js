//////////////////////////////////////////////////////////////////////////////
// Feature
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class Feature {

    constructor(data = {}, display = {}, meta = {}) {
      // this._viewer = viewer;

      if (data.featureRanges) {
        data.featureRanges.forEach((featureRangeData) =>
            var featureRange = new CGV.FeatureRanges(featureRangeData);
            this.addFeatureRange(featureRange);
        );
      }
    }

    addFeatureRange(featureRange) {
      this._featureRanges = push(featureRange);
      featureRange._feature = this;
    }

  }

  CGV.Feature = Feature;

})(CGView);
