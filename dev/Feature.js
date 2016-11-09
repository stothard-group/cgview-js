//////////////////////////////////////////////////////////////////////////////
// Feature
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class Feature {

    constructor(data = {}, display = {}, meta = {}) {
      // this._viewer = viewer;
      this._featureRanges = new CGV.CGArray();
      this._featurePaths = new CGV.CGArray();
      this._color = data.color;

      if (data.featureRanges) {
        var featureRanges
        if (!Array.isArray(data.featureRanges)) {
          featureRanges = [data.featureRanges];
        } else {
          featureRanges = data.featureRanges;
        }
        featureRanges.forEach((featureRangeData) => {
            var featureRange = new CGV.FeatureRange(featureRangeData);
            this.addFeatureRange(featureRange);
        });
      }

      if (data.featurePaths) {
        var featurePaths
        if (!Array.isArray(data.featurePaths)) {
          featurePaths = [data.featurePaths];
        } else {
          featurePaths = data.featurePaths;
        }
        featurePaths.forEach((featurePathData) => {
            var featurePath = new CGV.FeaturePath(featurePathData);
            this.addFeaturePath(featurePath);
        });
      }
    }

    addFeatureRange(featureRange) {
      this._featureRanges.push(featureRange);
      featureRange._feature = this;
    }

    addFeaturePath(featurePath) {
      this._featurePaths.push(featurePath);
      featurePath._feature = this;
    }

    get viewer() {
      return this._featureSlot.viewer
    }

  }

  CGV.Feature = Feature;

})(CGView);
