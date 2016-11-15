//////////////////////////////////////////////////////////////////////////////
// FeaturePath
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class FeaturePath {

    constructor(data = {}, display = {}, meta = {}) {
      // this._viewer = viewer;
      this._bp = CGV.default_for(data.bp, []);
      this._proportionOfThickness = CGV.default_for(data.proportionOfThickness, []);
      this._color = CGV.default_for(data.color, 'black');
      this._colorPositive = data.colorPositive;
      this._colorNegative = data.colorNegative;
    }

    get color() {
      return this._color || 'black'
    }

    get colorPositive() {
      return this._colorPositive || this._color
    }

    get colorNegative() {
      // return this._colorNegative || this._color
      return this._colorNegative || this._color
    }
    draw(ctx, scale, radius, thickness) {
      if (this.colorNegative == this.colorPositive) {
        this._drawPath(ctx, scale, radius, thickness, this.colorPositive);
      } else {
        this._drawPath(ctx, scale, radius, thickness, this.colorPositive, 'positive');
        this._drawPath(ctx, scale, radius, thickness, this.colorNegative, 'negative');
      }
    }

    _drawPath(ctx, scale, radius, thickness, color, position) {
      ctx.beginPath();
      // this.ctx.strokeStyle = color;
      ctx.lineWidth = 0
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
        if ( Math.abs(r - saved_r) >= 1 && this._keepPoint(prop[i], position)){
          ctx.arc(scale.x(0), scale.y(0), r, scale.bp(saved_bp), scale.bp(bp[i]), false);
          saved_r = r;
          saved_bp = bp[i];
        }
      }
      ctx.arc(scale.x(0), scale.y(0), r, scale.bp(bp[bp.length - 1]), scale.bp(this.viewer.sequenceLength), false);
      ctx.arc(scale.x(0), scale.y(0), radius, scale.bp(this.viewer.sequenceLength), scale.bp(0), true);
      ctx.fillStyle = color;
      ctx.fill();
    }

    _keepPoint(proportionOfRadius, position) {
      if (position == undefined) {
        return true
      } else if (position == 'positive' && proportionOfRadius > 0) {
        return true
      } else if (position == 'negative' && proportionOfRadius < 0 ) {
        return true
      }
      return false
    }

    get viewer() {
      return this._feature.viewer
    }
  }


  CGV.FeaturePath = FeaturePath;

})(CGView);
