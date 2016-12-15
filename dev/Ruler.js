//////////////////////////////////////////////////////////////////////////////
// Ruler
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class Ruler {

    /**
     * The *Ruler* controls and draws the sequence ruler in bp.
     */
    constructor(viewer, options = {}) {
      this.viewer = viewer;
      this.canvas = viewer.canvas;
      this.tickCount = CGV.defaultFor(options.tickCount, 10);
      this.tickWidth = CGV.defaultFor(options.tickWidth, 1);
      this.tickLength = CGV.defaultFor(options.tickLength, 5);
      this.rulerPadding = CGV.defaultFor(options.rulerPadding, 20);

      this.font = 'Sans-Serif, plain, 10'
    }

    get font() {
      return this._font
    }

    set font(value) {
      if (value.toString() == 'Font') {
        this._font = value;
      } else {
        this._font = new CGV.Font(value);
      }
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
      // this.drawForRadius(innerRadius - this.tickLength, 'inner');
      this.drawForRadius(innerRadius, 'inner');
      this.drawForRadius(outerRadius, 'outer', false);
    }

    drawForRadius(radius, position = 'inner', drawLabels = true) {
      var scale = this.canvas.scale;
      var ranges = this.canvas.visibleRangeForRadius(radius);
      var start = ranges ? ranges[0] : 1;
      var stop = ranges ? ranges[1] : this.viewer.sequenceLength;
      var tickLength = (position == 'inner') ? -this.tickLength : this.tickLength;
      this.canvas.ctx.fillStyle = 'black'; // Label Color


      // Tick format for labels
      var tickFormat = scale.bp.tickFormat(this.tickCount * this.viewer.zoomFactor, 's');
      // Draw Tick for 1 bp
      this.canvas.radiantLine(1, radius, tickLength, this.tickWidth);
      // Draw Major ticks
      var majorTicks = new CGV.CGArray(scale.bp.ticks(this.tickCount * this.viewer.zoomFactor))
      majorTicks.eachFromRange(start, stop, 1, (i, bp) => {
        this.canvas.radiantLine(bp, radius, tickLength, this.tickWidth);
        if (drawLabels) {
          var label = tickFormat(bp);
          this.drawLabel(bp, label, radius, position);
        }
      });
      // Draw Minor ticks
      var minorTicks = new CGV.CGArray(scale.bp.ticks(majorTicks.length * 5))
      minorTicks.eachFromRange(start, stop, 1, (i, bp) => {
        this.canvas.radiantLine(bp, radius, tickLength / 2, this.tickWidth);
      });
    }

    drawLabel(bp, label, radius, position = 'inner') {
      var scale = this.canvas.scale;
      var ctx = this.canvas.ctx;
      // Put space between number and units
      var label = label.replace(/([^\d\.]+)/, ' $1bp');
      ctx.font = this.font.css;
      ctx.textAlign = 'center';
      // INNER
      var center = this.canvas.pointFor(bp, radius - this.rulerPadding);
      ctx.fillText(label, center.x, center.y);
    }

  }

  CGV.Ruler = Ruler;

})(CGView);
