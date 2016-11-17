//////////////////////////////////////////////////////////////////////////////
// Axis
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  // TODO: should this be called Ruler
  class Axis {

    constructor(canvas, options = {}) {
      this.canvas = canvas;
      this.tickCount = CGV.default_for(options.tickCount, 10);
      this.tickWidth = CGV.default_for(options.tickWidth, 1);
      this.tickLength = CGV.default_for(options.tickLength, 5);
      this.rulerPadding = CGV.default_for(options.rulerPadding, 20);
    }

    get tickCount() {
      return this._tickCount
    }

    set tickCount(count) {
      this._tickCount = count; 
    }

    get tickWidth() {
      return this._tickWidth
    }

    set tickWidth(width) {
      this._tickWidth = CGV.pixel(width);
    }

    get tickLength() {
      return this._tickLength
    }

    set tickLength(length) {
      this._tickLength = CGV.pixel(length);
    }

    get rulerPadding() {
      return this._rulerPadding
    }

    set rulerPadding(padding) {
      this._rulerPadding = CGV.pixel(padding);
    }

    draw(innerRadius, outerRadius) {
      this.drawForRadius(innerRadius - this.tickLength);
      this.drawForRadius(outerRadius, false);
    }

    // drawForRadius(radius) {
    //   var scale = this.canvas.scale;
    //   scale.bp.ticks(this.tickCount).forEach((tick) => {
    //      this.canvas.radiantLine(tick, radius, this.tickLength, this.tickWidth);
    //      this.drawLabel(tick, radius);
    //   });
    // }

    drawForRadius(radius, drawLabels = true) {
      var scale = this.canvas.scale;
      var ticks = scale.bp.ticks(this.tickCount);
      var tickFormat = scale.bp.tickFormat(this.tickCount, 's');
      // Draw Tick for 1 bp
      this.canvas.radiantLine(1, radius, this.tickLength, this.tickWidth);
      ticks.forEach((bp) => {
        this.canvas.radiantLine(bp, radius, this.tickLength, this.tickWidth);
        if (drawLabels) {
          var label = tickFormat(bp);
          this.drawLabel(bp, label, radius);
        }
      });
    }

    drawLabel(bp, label, radius, position = 'inner') {
      var scale = this.canvas.scale;
      var ctx = this.canvas.ctx;
      var label = label.replace(/([^\d\.]+)/, ' $1bp');
      if (bp == 0) {
        label = '';
      }
      // TODO: adjust fonts
      var fontSize = CGV.pixel(10);
      var font = fontSize + 'px Sans-Serif';
      ctx.font = font
      ctx.textAlign = 'center'
      // INNER
      var center = this.canvas.pointFor(bp, radius - this.rulerPadding);
      ctx.fillText(label, center.x, center.y);
    }

  }

  CGV.Axis = Axis;

})(CGView);
