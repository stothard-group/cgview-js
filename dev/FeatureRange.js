//////////////////////////////////////////////////////////////////////////////
// FeatureRange
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class FeatureRange {

    constructor(data = {}, display = {}, meta = {}) {
      // this._viewer = viewer;
      this._start = Number(data.start);
      this._stop = Number(data.stop);
      this._radiusAdjustment = Number(data.radiusAdjustment) || 0;
      this._proportionOfThickness = Number(data.proportionOfThickness) || 1;
      this._color = data.color;
    }

    get start() {
      return this._start
    }

    set start(bp) {
      this._start = bp;
    }

    get stop() {
      return this._stop
    }

    set stop(bp) {
      this._stop = bp;
    }

    get feature() {
      return this._feature
    }

    get color() {
      return this._color || (this.feature && this.feature.color) || 'blue';
    }

    draw(canvas, slotRadius, slotThickness) {
      canvas.drawArc(this.start, this.stop,
        this.adjustedRadius(slotRadius, slotThickness),
        this.color, this.adjustedWidth(slotThickness));
    }

    // radius by default would be the center of the slot as provided unless:
    // - _radiusAdjustment is not 0
    // - _proportionOfThickness is not 1
    adjustedRadius(radius, slotThickness) {
      if (this._radiusAdjustment == 0 && this._proportionOfThickness == 1) {
        return radius
      } else if (this._radiusAdjustment == 0) {
        return radius - (slotThickness / 2) + (this._proportionOfThickness * slotThickness / 2)
      } else {
        // TODO:
        return radius
      }
    }

    adjustedWidth(width) {
      return this._proportionOfThickness * width;
    }

    // draw_arc(start, end, radius, color = '#000000', width = 1) {
    //   var scale = this.scale;
    //   var ctx = this.ctx;
    //   this.ctx.beginPath();
    //   this.ctx.strokeStyle = color;
    //   // this.ctx.strokeStyle = 'rgba(0,0,200,0.5)'
    //   this.ctx.lineWidth = width;
    //   // this.ctx.arc(scale.x(0), scale.y(0), CGV.pixel(radius), scale.bp(start), scale.bp(end), false);
    //   this.ctx.arc(scale.x(0), scale.y(0), radius, scale.bp(start), scale.bp(end), false);
    //   this.ctx.stroke();
    // }

  }

  CGV.FeatureRange = FeatureRange;

})(CGView);
