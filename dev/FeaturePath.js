//////////////////////////////////////////////////////////////////////////////
// FeaturePath
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class FeaturePath {

    constructor(data = {}, display = {}, meta = {}) {
      // this._viewer = viewer;
      this._bp = data.bp;
      this._proportionOfThickness = data.proportionOfThickness

      // for (var i = 0; i < length(data.bp); i++) {
      //   this._bp.push(data.bp[])
      // }

    }

    draw(ctx, scale, radius, thickness) {
      ctx.beginPath();
      // this.ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      var bp = this._bp;
      var prop = this._proportionOfThickness;
      // var radius = 200;
      // var height = 20;
      var saved_r = radius;
      var saved_bp = bp[0];
      var r = radius + prop[0] * thickness;
      ctx.arc(scale.x(0), scale.y(0), r, scale.bp(0), scale.bp(bp[0]), false);
      for (var i = 1; i < bp.length; i++) {
        r = radius + prop[i] * thickness;
        if ( Math.abs(r - saved_r) >= 1 ){
          ctx.arc(scale.x(0), scale.y(0), r, scale.bp(saved_bp), scale.bp(bp[i]), false);
          saved_r = r;
          saved_bp = bp[i];
        }
      }
      ctx.arc(scale.x(0), scale.y(0), r, scale.bp(bp[bp.length - 1]), scale.bp(this.viewer.sequenceLength), false);
      ctx.arc(scale.x(0), scale.y(0), radius, scale.bp(this.viewer.sequenceLength), scale.bp(0), true);
      ctx.strokeStyle = 'black'
      ctx.fillStyle = 'black'
      ctx.fill();
      ctx.stroke();
    }

    get viewer() {
      return this._feature.viewer
    }
  }


  CGV.FeaturePath = FeaturePath;

})(CGView);
