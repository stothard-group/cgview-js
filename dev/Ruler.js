//////////////////////////////////////////////////////////////////////////////
// Ruler
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class Ruler {

    /**
     * The *Ruler* controls and draws the sequence ruler in bp.
     */
    constructor(viewer, options = {}) {
      this._viewer = viewer;
      this.tickCount = CGV.defaultFor(options.tickCount, 10);
      this.tickWidth = CGV.defaultFor(options.tickWidth, 1);
      this.tickLength = CGV.defaultFor(options.tickLength, 5);
      this.rulerPadding = CGV.defaultFor(options.rulerPadding, 10);
      this.font = CGV.defaultFor(options.font, 'sans-serif, plain, 10');
    }

    /**
     * @member {Viewer} - Get the viewer.
     */
    get viewer() {
      return this._viewer
    }

    /**
     * @member {Canvas} - Get the canvas.
     */
    get canvas() {
      return this.viewer.canvas
    }

    /**
     * @member {Sequence} - Get the sequence.
     */
    get sequence() {
      return this.viewer.sequence
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
     * @member {Array} - Get the array of Major Ticks.
     */
    get majorTicks() {
      return this._majorTicks
    }

    /**
     * @member {Number} - Get distance between major tick marks.
     */
    get majorTickStep() {
      return this._majorTickStep
    }

    /**
     * @member {Array} - Get the array of Minor Ticks.
     */
    get minorTicks() {
      return this._minorTicks
    }

    /**
     * @member {Number} - Get distance between minor tick marks.
     */
    get minorTickStep() {
      return this._minorTickStep
    }

    /**
     * @member {Object} - Get the d3 formatter for printing the tick labels
     */
    get tickFormater() {
      return this._tickFormater
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

    // Below the zoomFactorCutoff, all ticks are calculated for the entire map
    // Above the zoomFactorCutoff, ticks are created for the visible range
    _updateTicks(innerRadius, outerRadius) {
      var zoomFactorCutoff = 5;
      var sequenceLength = this.sequence.length;
      var start = 0;
      var stop = 0;
      var majorTicks = new CGV.CGArray();
      var majorTickStep = 0;
      var minorTicks = new CGV.CGArray();
      var minorTickStep = 0;
      var tickCount = this.tickCount;

      // Find start and stop to create ticks
      if (this.viewer.zoomFactor < zoomFactorCutoff) {
        start = 1;
        stop = sequenceLength;
      } else {
        tickCount = Math.ceil(tickCount / 2);
        var innerRange = this.canvas.visibleRangeForRadius(innerRadius);
        var outerRange = this.canvas.visibleRangeForRadius(outerRadius);
        if (innerRange && outerRange) {
          var mergedRange = innerRange.mergeWithRange(outerRange);
          start = mergedRange.start;
          stop = mergedRange.stop;
        } else if (innerRange) {
          start = innerRange.start;
          stop = innerRange.stop;
        } else if (outerRange) {
          start = outerRange.start;
          stop = outerRange.stop;
        }
      }

      // Create Major ticks and tickStep
      if (stop > start) {
        majorTicks.merge( d3.ticks(start, stop, tickCount) );
        majorTickStep = d3.tickStep(start, stop, tickCount);
      } else if (stop < start) {
        // Ratio of the sequence length before 0 to sequence length after zero
        // The number of ticks will for each region will depend on this ratio
        var tickCountRatio = (sequenceLength - start) / this.sequence.lengthOfRange(start, stop);
        var ticksBeforeZero = Math.round(tickCount * tickCountRatio);
        var ticksAfterZero = Math.round(tickCount * (1 - tickCountRatio)) * 2; // Multiply by to for a margin of safety
        if (ticksBeforeZero > 0) {
          majorTicks.merge( d3.ticks(start, sequenceLength, ticksBeforeZero) );
          majorTickStep = Math.round(d3.tickStep(start, sequenceLength, ticksBeforeZero));
          for (var i = 1; i <= ticksAfterZero; i ++) {
            if (majorTickStep * i < start) {
              majorTicks.push( majorTickStep * i );
            }
          }
        } else {
          majorTicks.merge( d3.ticks(1, stop, tickCount) );
          majorTickStep = Math.round(d3.tickStep(1, stop, tickCount));
        }
      }

      // Find Minor ticks
      minorTicks = new CGV.CGArray();
      if ( !(majorTickStep % 5) ) {
        minorTickStep = majorTickStep / 5;
      } else if ( !(majorTickStep % 2) ) {
        minorTickStep = majorTickStep / 2;
      } else {
        minorTickStep = 0;
      }
      if (minorTickStep) {
        if (this.sequence.lengthOfRange(majorTicks[majorTicks.length - 1], majorTicks[0]) <= 3*majorTickStep) {
          start = 0;
          stop = sequenceLength;
        } else {
          start = majorTicks[0] - majorTickStep;
          stop = majorTicks[majorTicks.length - 1] + majorTickStep;
        }
        if (start < stop) {
          for (var tick = start; tick <= stop; tick += minorTickStep) {
            if (tick % majorTickStep) {
              minorTicks.push(tick);
            }
          }
        } else {
          for (var tick = start; tick <= sequenceLength; tick += minorTickStep) {
            if (tick % majorTickStep) {
              minorTicks.push(tick);
            }
          }
          for (var tick = 0; tick <= stop; tick += minorTickStep) {
            if (tick % majorTickStep) {
              minorTicks.push(tick);
            }
          }
        }
      }
      this._majorTicks = majorTicks;
      this._majorTickStep = majorTickStep;
      this._minorTicks = minorTicks;
      this._minorTickStep = minorTickStep;
      this._tickFormater = this._createTickFormatter(majorTickStep);
    }

    draw(innerRadius, outerRadius) {
      this._updateTicks(innerRadius, outerRadius);
      this.drawForRadius(innerRadius, 'inner');
      this.drawForRadius(outerRadius, 'outer', false);
    }


    drawForRadius(radius, position = 'inner', drawLabels = true) {
      var ctx = this.canvas.context('map');
      var scale = this.canvas.scale;
      var tickLength = (position == 'inner') ? -this.tickLength : this.tickLength;
      ctx.fillStyle = 'black'; // Label Color
      ctx.font = this.font.css;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      // Draw Tick for first bp (Origin)
      this.canvas.radiantLine('map', 1, radius, tickLength, this.tickWidth * 2);
      // Draw Major ticks
      this.majorTicks.each( (i, bp) => {
        this.canvas.radiantLine('map', bp, radius, tickLength, this.tickWidth);
        if (drawLabels) {
          var label = this.tickFormater(bp);
          this.drawLabel(bp, label, radius, position);
        }
      });
      // Draw Minor ticks
      this.minorTicks.each( (i, bp) => {
        this.canvas.radiantLine('map', bp, radius, tickLength / 2, this.tickWidth);
      });
    }

    drawLabel(bp, label, radius, position = 'inner') {
      var scale = this.canvas.scale;
      var ctx = this.canvas.context('map');
      // Put space between number and units
      // var label = label.replace(/([^\d\.]+)/, ' $1bp');
      var label = label.replace(/([kM])?$/, ' $1bp');
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
