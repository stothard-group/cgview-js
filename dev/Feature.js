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

    get color() {
      return this._color || (this._featureSlot && this._featureSlot.color) || 'blue';
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

    get start() {
      // TODO: What about paths
      return (this._featureRanges.length > 0) ? this._featureRanges[0].start : 0
    }

    get stop() {
      // TODO: What about paths
      return (this._featureRanges.length > 0) ? this._featureRanges[this._featureRanges.length - 1].stop : 0
    }

    get length() {
      if (this.stop >= this.start) {
        return this.stop - this.start
      } else {
        return this.viewer.sequenceLength + (this.stop - this.start)
      } 
    }

    // get count() {
      // TODO: What about paths
    //   return this._featureRanges.length
    // }

  }

  CGV.Feature = Feature;

})(CGView);
