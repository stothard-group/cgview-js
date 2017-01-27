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
      this.rulerPadding = CGV.defaultFor(options.rulerPadding, 10);
      this.font = CGV.defaultFor(options.font, 'sans-serif, plain, 10');

      // fontColor
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

    /**
     * Create d3 tickFormat based on the distance between ticks
     * @param {Number} tickStep - Distance between ticks
     * @return {Object}
     */
    _createTickFormatter(tickStep) {
      var tickFormat, tickPrecision;
      if (tickStep <= 50) {
        tickFormat = d3.formatPrefix(',.0', 1);
      } else if (tickStep <= 50e3) {
        tickPrecision = d3.precisionPrefix(tickStep, 1e3)
        tickFormat = d3.formatPrefix('.' + tickPrecision, 1e3);
      } else if (tickStep <= 50e6) {
        tickPrecision = d3.precisionPrefix(tickStep, 1e6)
        tickFormat = d3.formatPrefix('.' + tickPrecision, 1e6);
      }
      return tickFormat
    }

    draw(innerRadius, outerRadius) {
      this.drawForRadius(innerRadius, 'inner');
      this.drawForRadius(outerRadius, 'outer', false);
    }


    drawForRadius(radius, position = 'inner', drawLabels = true) {
      var ctx = this.canvas.ctx;
      var scale = this.canvas.scale;
      var ranges = this.canvas.visibleRangeForRadius(radius);
      var start = ranges ? ranges[0] : 1;
      var stop = ranges ? ranges[1] : this.viewer.sequenceLength;
      var tickLength = (position == 'inner') ? -this.tickLength : this.tickLength;
      ctx.fillStyle = 'black'; // Label Color
      ctx.font = this.font.css;
      ctx.textAlign = 'left';

      // Determine Major ticks and formatting
      // TODO:
      // - find biggest side if crossing zero and use that to find tickStep
      var majorTicks, tickStep
      if (stop > start) {
        majorTicks = new CGV.CGArray( d3.ticks(start, stop, this.tickCount) );
        tickStep = d3.tickStep(start, stop, this.tickCount);
      } else {
        var sequenceLength = this.viewer.sequenceLength;
        // Ratio of the sequence length before 0 to sequence length after zero
        // The number of tick will for each region will depend on this ratio
        var tickCountRatio = (sequenceLength - start) / this.viewer.lengthOfRange(start, stop);
        var ticksBeforeZero = Math.round(this.tickCount * tickCountRatio);
        var ticksAfterZero = Math.round(this.tickCount * (1 - tickCountRatio));
        majorTicks = new CGV.CGArray( d3.ticks(start, sequenceLength, ticksBeforeZero) );
        tickStep = d3.tickStep(start, sequenceLength, ticksBeforeZero);
        majorTicks.merge( d3.ticks(1, stop, ticksAfterZero) );
      }
      // Determine tick formatting
      var tickFormat = this._createTickFormatter(tickStep);
      // Draw Tick for first bp (Origin)
      this.canvas.radiantLine(1, radius, tickLength, this.tickWidth * 2);
      // Draw Major ticks
      majorTicks.each( (i, bp) => {
        this.canvas.radiantLine(bp, radius, tickLength, this.tickWidth);
        if (drawLabels) {
          var label = tickFormat(bp);
          this.drawLabel(bp, label, radius, position);
        }
      });

      // Tick format for labels
      // var tickFormat = scale.bp.tickFormat(this.tickCount * this.viewer.zoomFactor, 's');
      // var majorTicks = new CGV.CGArray(scale.bp.ticks(this.tickCount * this.viewer.zoomFactor))
      // majorTicks.eachFromRange(start, stop, 1, (i, bp) => {
      //   this.canvas.radiantLine(bp, radius, tickLength, this.tickWidth);
      //   if (drawLabels) {
      //     var label = tickFormat(bp);
      //     this.drawLabel(bp, label, radius, position);
      //   }
      // });
      // Draw Minor ticks
      // var minorTicks = new CGV.CGArray(scale.bp.ticks(majorTicks.length * 5))
      // minorTicks.eachFromRange(start, stop, 1, (i, bp) => {
      //   this.canvas.radiantLine(bp, radius, tickLength / 2, this.tickWidth);
      // });
    }

    drawLabel(bp, label, radius, position = 'inner') {
      var scale = this.canvas.scale;
      var ctx = this.canvas.ctx;
      // Put space between number and units
      // var label = label.replace(/([^\d\.]+)/, ' $1bp');
      var label = label.replace(/([km])?$/, ' $1bp');
      // INNER
      var innerPt = this.canvas.pointFor(bp, radius - this.rulerPadding);
      var radians = scale.bp(bp);
      var attachmentPosition = CGV.clockPositionForAngle(radians);
      var labelWidth = this.font.width(ctx, label);
      var labelPt = CGV.rectOriginForAttachementPoint(innerPt, attachmentPosition, labelWidth, this.font.height);
      ctx.fillText(label, labelPt.x, labelPt.y);
    }

  }

  CGV.Ruler = Ruler;

})(CGView);

    // drawForRadius_ORIG(radius, position = 'inner', drawLabels = true) {
    //   var ctx = this.canvas.ctx;
    //   var scale = this.canvas.scale;
    //   var ranges = this.canvas.visibleRangeForRadius(radius);
    //   var start = ranges ? ranges[0] : 1;
    //   var stop = ranges ? ranges[1] : this.viewer.sequenceLength;
    //   var tickLength = (position == 'inner') ? -this.tickLength : this.tickLength;
    //   ctx.fillStyle = 'black'; // Label Color
    //   ctx.font = this.font.css;
    //   ctx.textAlign = 'left';
    //   // Tick format for labels
    //   var tickFormat = scale.bp.tickFormat(this.tickCount * this.viewer.zoomFactor, 's');
    //   // Draw Tick for 1 bp
    //   this.canvas.radiantLine(1, radius, tickLength, this.tickWidth);
    //   // Draw Major ticks
    //   var majorTicks = new CGV.CGArray(scale.bp.ticks(this.tickCount * this.viewer.zoomFactor))
    //   majorTicks.eachFromRange(start, stop, 1, (i, bp) => {
    //     this.canvas.radiantLine(bp, radius, tickLength, this.tickWidth);
    //     if (drawLabels) {
    //       var label = tickFormat(bp);
    //       this.drawLabel(bp, label, radius, position);
    //     }
    //   });
    //   // Draw Minor ticks
    //   var minorTicks = new CGV.CGArray(scale.bp.ticks(majorTicks.length * 5))
    //   minorTicks.eachFromRange(start, stop, 1, (i, bp) => {
    //     this.canvas.radiantLine(bp, radius, tickLength / 2, this.tickWidth);
    //   });
    // }
