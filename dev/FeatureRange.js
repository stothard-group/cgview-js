//////////////////////////////////////////////////////////////////////////////
// FeatureRange
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class FeatureRange {

    constructor(data = {}, display = {}, meta = {}) {
      // this._viewer = viewer;
      this._start = Number(data.start);
      this._stop = Number(data.stop);
    }

  }

  CGV.FeatureRange = FeatureRange;

})(CGView);
