//////////////////////////////////////////////////////////////////////////////
// Plot
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class Plot {

    /**
     * Draw a plot consisting of arcs
     */
    constructor(viewer, data = {}, display = {}, meta = {}) {
      this.viewer = viewer;
      this.positions = data.positions;
      this.scores = data.scores;
      this.source = CGV.defaultFor(data.source, '');
      this._baseline = CGV.defaultFor(data.baseline, 0.5);

      if (data.legend) {
        this.legendItem  = data.legend;
      }
      if (data.legendPositive) {
        this.legendItemPositive  = data.legendPositive;
      }
      if (data.legendNegative) {
        this.legendItemNegative  = data.legendNegative;
      }
      var plotID = viewer.plots().indexOf(this) + 1;
      if (!this.legendItemPositive && !this.legendItemNegative) {
        this.legendItem  = 'Plot-' + plotID;
      } else if (!this.legendItemPositive) {
        this.legendItemPositive  = this.legendItemNegative;
      } else if (!this.legendItemNegative) {
        this.legendItemNegative  = this.legendItemPositive;
      }

    }

    /**
     * @member {Viewer} - Get the *Viewer*
     */
    get viewer() {
      return this._viewer
    }

    set viewer(viewer) {
      if (this.viewer) {
        // TODO: Remove if already attached to Viewer
      }
      this._viewer = viewer;
      viewer._plots.push(this);
    }

    /**
     * @member {CGArray} - Get or set the positions (bp) of the plot.
     */
    get positions() {
      return this._positions || new CGV.CGArray()
    }

    set positions(value) {
      if (value) {
        this._positions = new CGV.CGArray(value);
      }
    }

    /**
     * @member {CGArray} - Get or set the scores of the plot. Value should be between 0 and 1.
     */
    get score() {
      return this._score || new CGV.CGArray()
    }

    set score(value) {
      if (value) {
        this._score = new CGV.CGArray(value);
      }
    }

    /**
     * @member {Number} - Get the number of points in the plot
     */
    get length() {
      return this.positions.length
    }

    /**
     * @member {Array|Color} - Return an array of the positive and negativ colors [PositiveColor, NegativeColor].
     */
    get color() {
      return [this.colorPositive, this.colorNegative]
    }

    get colorPositive() {
      return this.legendItemPositive.color
    }

    get colorNegative() {
      return this.legendItemNegative.color
    }

    /**
     * @member {LegendItem} - Set both the legendItemPositive and
     * legendItemNegative to this legendItem. Get an array of the legendItems: [legendItemPositive, legendItemNegative].
     */
    get legendItem() {
      return [this.legendItemPositive, this.legendItemNegative]
    }

    set legendItem(value) {
      this.legendItemPositive = value;
      this.legendItemNegative = value;
    }

    /**
     * @member {LegendItem} - Alias for [legendItem](plot.html#legendItem)
     */
    get legend() {
      return this.legendItem
    }

    set legend(value) {
      this.legendItem = value;
    }

    /**
     * @member {LegendItem} - Get or Set both the LegendItem for the positive portion of the plot (i.e. above
     *   [baseline](Plot.html#baseline).
     */
    get legendItemPositive() {
      return this._legendItemPositive;
    }

    set legendItemPositive(value) {
      // this._legendItemPositive = value;

      if (this.legendItemPositive && value == undefined) { return }
      if (value && value.toString() == 'LegendItem') {
        this._legendItemPositive  = value
      } else {
        this._legendItemPositive  = this.viewer.legend.findLegendItemOrCreate(value);
      }
    }

    /**
     * @member {LegendItem} - Get or Set both the LegendItem for the negative portion of the plot (i.e. below
     *   [baseline](Plot.html#baseline).
     */
    get legendItemNegative() {
      return this._legendItemNegative;
    }

    set legendItemNegative(value) {
      // this._legendItemNegative = value;

      if (this.legendItemNegative && value == undefined) { return }
      if (value && value.toString() == 'LegendItem') {
        this._legendItemNegative  = value
      } else {
        this._legendItemNegative  = this.viewer.legend.findLegendItemOrCreate(value);
      }
    }

    /**
     * @member {LegendItem} - Alias for [legendItemPositive](plot.html#legendItemPositive).
     */
    get legendPositive() {
      return this._legendItemPositive;
    }

    set legendPositive(value) {
      this._legendItemPositive = value;
    }

    /**
     * @member {LegendItem} - Alias for [legendItemNegative](plot.html#legendItemNegative).
     */
    get legendNegative() {
      return this._legendItemNegative;
    }

    set legendNegative(value) {
      this._legendItemNegative = value;
    }

    /**
     * @member {Number} - Get or set the plot baseline. This is a value between 0 and 1 and indicates where
     *  where the baseline will be drawn. By default this is 0.5 (i.e. the center of the slot).
     */
    get baseline() {
      return this._baseline;
    }

    set baseline(value) {
      value = Number(baseline);
      if (value > 1) {
        this._baseline = 1;
      } else if (value < 0) {
        this._baseline = 0;
      } else {
        this._baseline = value;
      }
    }

    scoreForPosition(bp) {
      var index = CGV.indexOfValue(this.positions, bp);
      if (index == 0 && bp < this.positions[index]) {
        return undefined
      } else {
        return this.scores[index]
      }
    }

    draw(canvas, slotRadius, slotThickness, fast, range) {
      // var startTime = new Date().getTime();
      if (this.colorNegative.rgbaString == this.colorPositive.rgbaString) {
        this._drawPath(canvas, slotRadius, slotThickness, fast, range, this.colorPositive);
      } else {
        this._drawPath(canvas, slotRadius, slotThickness, fast, range, this.colorPositive, 'positive');
        this._drawPath(canvas, slotRadius, slotThickness, fast, range, this.colorNegative, 'negative');
      }
      // console.log("Plot Time: '" + CGV.elapsed_time(startTime) );
    }

    // To add a fast mode use a step when creating the indices
    _drawPath(canvas, slotRadius, slotThickness, fast, range, color, orientation) {
      var ctx = canvas.context('map');
      var scale = canvas.scale;
      var positions = this.positions;
      var scores = this.scores;
      // This is the difference in radial pixels required before a new arc is draw
      var radialDiff = fast ? 1 : 0.5;
      // var radialDiff = 0.5;

      var sequenceLength = this.viewer.sequence.length;

      var startIndex = CGV.indexOfValue(positions, range.start, false);
      var stopIndex = CGV.indexOfValue(positions, range.stop, false);
      // Change stopIndex to last position if stop is between 1 and first position
      if (stopIndex == 0 && range.stop < positions[stopIndex]) {
        stopIndex = positions.length - 1;
      }
      var startPosition = startIndex == 0 ? positions[startIndex] : range.start;
      var stopPosition = range.stop;
      // console.log(startPosition + '..' + stopPosition)

      // var startScore = startIndex == 0 ? this.baseline : scores[startIndex];
      var startScore = scores[startIndex];

      startScore = this._keepPoint(startScore, orientation) ? startScore : this.baseline;

      ctx.beginPath();

      // Calculate baseline Radius
      var baselineRadius = slotRadius - (slotThickness / 2) + (slotThickness * this.baseline);

      // Move to the first point
      var startPoint = canvas.pointFor(startPosition, baselineRadius);
      ctx.moveTo(startPoint.x, startPoint.y);

      var savedR = baselineRadius + (startScore - this.baseline) * slotThickness;
      var savedPosition = startPosition;
      var lastScore = startScore;

      var currentR, score, currentPosition;
      var crossingBaseline = false;
      var drawNow = false;
      var step = 1;
      if (fast) {
        // When drawing fast, use a step value scaled to base-2
        var positionsLength = positions.countFromRange(startPosition, stopPosition);
        var maxPositions = 4000;
        var initialStep = positionsLength / maxPositions;
        if (initialStep > 1) {
          step = CGV.base2(initialStep);
        }
      }
      positions.eachFromRange(startPosition, stopPosition, step, (i) => {
        // Handle Origin in middle of range
        if (i == 0 && startIndex != 0) {
          canvas.arcPath('map', savedR, savedPosition, sequenceLength, false, 'lineTo');
          savedPosition = 1;
          savedR = baselineRadius;
        }

        // NOTE: In the future the radialDiff code (see bottom) could be used to improve speed of NON-fast
        // drawing. However, there are a few bugs that need to be worked out
        score = scores[i];
        currentPosition = positions[i];
        canvas.arcPath('map', savedR, savedPosition, currentPosition, false, 'lineTo');
        if ( this._keepPoint(score, orientation) ){
          savedR = baselineRadius + (score - this.baseline) * slotThickness;
        } else {
          savedR = baselineRadius;
        }
        savedPosition = currentPosition;
      });

      // Change stopPosition if between 1 and first position
      if (stopIndex == positions.length - 1 && stopPosition < positions[0]) {
        stopPosition = sequenceLength;
      }
      // Finish drawing plot to stop position
      canvas.arcPath('map', savedR, savedPosition, stopPosition, false, 'lineTo');
      var endPoint = canvas.pointFor(stopPosition, baselineRadius);
      ctx.lineTo(endPoint.x, endPoint.y);
      // Draw plot anticlockwise back to start along baseline
      canvas.arcPath('map', baselineRadius, stopPosition, startPosition, true, 'noMoveTo');
      ctx.fillStyle = color.rgbaString;
      ctx.fill();

      // ctx.strokeStyle = 'black';
      // TODO: draw stroked line for sparse data
      // ctx.lineWidth = 0.05;
      // ctx.strokeStyle = color.rgbaString;
      // ctx.stroke();

    }


    _keepPoint(score, orientation) {
      if (orientation == undefined) {
        return true
      } else if (orientation == 'positive' && score > this.baseline) {
        return true
      } else if (orientation == 'negative' && score < this.baseline ) {
        return true
      }
      return false
    }

  }


  CGV.Plot = Plot;

})(CGView);

// NOTE: radialDiff
        // score = scores[i];
        // currentPosition = positions[i];
        // currentR = baselineRadius + (score - this.baseline) * slotThickness;
        //
        // if (drawNow || crossingBaseline) {
        //   canvas.arcPath('map', savedR, savedPosition, currentPosition, false, 'lineTo');
        //   savedPosition = currentPosition;
        //   drawNow = false;
        //   crossingBaseline = false;
        //   if ( this._keepPoint(score, orientation) ) {
        //     savedR = currentR;
        //   } else {
        //     savedR = baselineRadius;
        //   }
        // if (orientation && ( (lastScore - this.baseline) * (score - this.baseline) < 0)) {
        //   crossingBaseline = true;
        // }
        //
        // if ( Math.abs(currentR - savedR) >= radialDiff ){
        //   drawNow = true;
        // }
        // lastScore = score;
// END RadialDiff


        // score = scores[i];
        // currentPosition = positions[i];
        // canvas.arcPath('map', savedR, savedPosition, currentPosition, false, 'lineTo');
        // if ( this._keepPoint(score, orientation) ){
        //   savedR = baselineRadius + (score - this.baseline) * slotThickness;
        // } else {
        //   savedR = baselineRadius;
        // }
        // savedPosition = currentPosition;


    //
        // score = scores[i];
        // currentPosition = positions[i];
        // canvas.arcPath('map', savedR, savedPosition, currentPosition, false, 'lineTo');
        // currentR = baselineRadius + (score - this.baseline) * slotThickness;
        // savedR = currentR;
        // savedPosition = currentPosition;
    //
    //
      // positions.eachFromRange(startPosition, stopPosition, step, (i) => {
        // if (i == 0) {
        //   lastScore = this.baseline;
        //   savedPosition = 1;
        //   savedR = baselineRadius;
        // }
      //   lastScore = score;
      //   score = scores[i];
      //   currentPosition = positions[i];
      //   currentR = baselineRadius + (score - this.baseline) * slotThickness;
      //   // If going from positive to negative need to save currentR as 0 (baselineRadius)
      //   // Easiest way is to check if the sign changes (i.e. multipling last and current score is negative)
      //   if (orientation && ( (lastScore - this.baseline) * (score - this.baseline) < 0)) {
      //     currentR = baselineRadius;
      //     canvas.arcPath('map', currentR, savedPosition, currentPosition, false, true);
      //     savedR = currentR;
      //     savedPosition = currentPosition;
      //   } else if ( this._keepPoint(score, orientation) ){
      //     if ( Math.abs(currentR - savedR) >= radialDiff ){
      //       canvas.arcPath('map', currentR, savedPosition, currentPosition, false, true);
      //       savedR = currentR;
      //       savedPosition = currentPosition
      //     }
      //   } else {
      //     savedR = baselineRadius;
      //   }
      // });
