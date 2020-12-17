//////////////////////////////////////////////////////////////////////////////
// Plot
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {
  class Plot extends CGV.CGObject {

    /**
     * Draw a plot consisting of arcs
     */
    constructor(viewer, data = {}, meta = {}) {
      super(viewer, data, meta);
      this.viewer = viewer;
      this.name = data.name;
      this.positions = CGV.defaultFor(data.positions, []);
      this.scores = CGV.defaultFor(data.scores, []);
      this.type = CGV.defaultFor(data.type, 'line');
      this.source = CGV.defaultFor(data.source, '');
      this.axisMin = CGV.defaultFor(data.axisMin, d3.min([0, this.scoreMin]));
      this.axisMax = CGV.defaultFor(data.axisMax, d3.max([0, this.scoreMax]));
      this.baseline = CGV.defaultFor(data.baseline, 0);

      this.extractedFromSequence = CGV.defaultFor(data.extractedFromSequence, false);

      if (data.legend) {
        this.legendItem  = data.legend;
      }
      if (data.legendPositive) {
        this.legendItemPositive  = data.legendPositive;
      }
      if (data.legendNegative) {
        this.legendItemNegative  = data.legendNegative;
      }
      const plotID = viewer.plots().indexOf(this) + 1;
      if (!this.legendItemPositive && !this.legendItemNegative) {
        this.legendItem  = `Plot-${plotID}`;
      } else if (!this.legendItemPositive) {
        this.legendItemPositive  = this.legendItemNegative;
      } else if (!this.legendItemNegative) {
        this.legendItemNegative  = this.legendItemPositive;
      }
    }

    /**
     * Return the class name as a string.
     * @return {String} - 'Plot'
     */
    toString() {
      return 'Plot';
    }

    /**
     * @member {String} - Get or set the name.
     */
    get name() {
      return this._name;
    }

    set name(value) {
      this._name = value;
    }

    /**
     * @member {type} - Get or set the *type*
     */
    get type() {
      return this._type;
    }

    set type(value) {
      if (!CGV.validate(value, ['line', 'bar'])) { return }
      this._type = value;
    }

    /**
     * @member {Viewer} - Get the *Viewer*
     */
    get viewer() {
      return this._viewer;
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
      return this._positions || new CGV.CGArray();
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
      return this._score || new CGV.CGArray();
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
      return this.positions.length;
    }

    /**
     * @member {Array|Color} - Return an array of the positive and negativ colors [PositiveColor, NegativeColor].
     */
    get color() {
      return [this.colorPositive, this.colorNegative];
    }

    get colorPositive() {
      return this.legendItemPositive.color;
    }

    get colorNegative() {
      return this.legendItemNegative.color;
    }

    /**
     * @member {LegendItem} - Set both the legendItemPositive and
     * legendItemNegative to this legendItem. Get an CGArray of the legendItems: [legendItemPositive, legendItemNegative].
     */
    get legendItem() {
      return new CGV.CGArray([this.legendItemPositive, this.legendItemNegative]);
    }

    set legendItem(value) {
      this.legendItemPositive = value;
      this.legendItemNegative = value;
    }

    /**
     * @member {LegendItem} - Alias for [legendItem](plot.html#legendItem)
     */
    get legend() {
      return this.legendItem;
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
      if (this.legendItemPositive && value === undefined) { return; }
      if (value && value.toString() === 'LegendItem') {
        this._legendItemPositive  = value;
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
      if (this.legendItemNegative && value === undefined) { return; }
      if (value && value.toString() === 'LegendItem') {
        this._legendItemNegative  = value;
      } else {
        this._legendItemNegative  = this.viewer.legend.findLegendItemOrCreate(value);
      }
    }

    /**
     * @member {LegendItem} - Alias for [legendItemPositive](plot.html#legendItemPositive).
     */
    get legendPositive() {
      return this.legendItemPositive;
    }

    set legendPositive(value) {
      this.legendItemPositive = value;
    }

    /**
     * @member {LegendItem} - Alias for [legendItemNegative](plot.html#legendItemNegative).
     */
    get legendNegative() {
      return this.legendItemNegative;
    }

    set legendNegative(value) {
      this.legendItemNegative = value;
    }

    /**
     * @member {Number} - Get or set the plot baseline. This is a value between the axisMin and axisMax
     * and indicates where where the baseline will be drawn. By default this is 0.
     *
     * DELETE OLD - Get or set the plot baseline. This is a value between 0 and 1 and indicates where
     *  where the baseline will be drawn. By default this is 0.5 (i.e. the center of the slot).
     */
    get baseline() {
      return this._baseline;
    }

    set baseline(value) {
      value = Number(value);
      const minAxis = this.axisMin;
      const maxAxis = this.axisMax;
      if (value > maxAxis) {
        this._baseline = maxAxis;
      } else if (value < minAxis) {
        this._baseline = minAxis;
      } else {
        this._baseline = value;
      }
    }

    /**
     * @member {Number} - Get or set the plot minimum axis value. This is a value must be less than
     * or equal to the minimum score.
     */
    get axisMin() {
      return this._axisMin;
    }

    set axisMin(value) {
      value = Number(value);
      const minValue = d3.min([this.scoreMin, this.baseline]);
      this._axisMin = (value > minValue) ? minValue : value;
    }

    /**
     * @member {Number} - Get or set the plot maximum axis value. This is a value must be greater than
     * or equal to the maximum score.
     */
    get axisMax() {
      return this._axisMax;
    }

    set axisMax(value) {
      value = Number(value);
      const maxValue = d3.max([this.scoreMax, this.baseline]);
      this._axisMax = (value < maxValue) ? maxValue : value;
    }

    get scoreMax() {
      return d3.max(this.scores);
    }

    get scoreMin() {
      return d3.min(this.scores);
    }

    get scoreMean() {
      return d3.mean(this.scores);
    }

    get scoreMedian() {
      return d3.median(this.scores);
    }

    /**
     * @member {Boolean} - Get or set the *extractedFromSequence*. This  plot is
     * generated directly from the sequence and does not have to be saved when exported JSON.
     */
    get extractedFromSequence() {
      return this._extractedFromSequence;
    }

    set extractedFromSequence(value) {
      this._extractedFromSequence = value;
    }


    /**
     * Highlights the tracks the plot is on. An optional track can be provided,
     * in which case the plot will only be highlighted on the track.
     * @param {Track} track - Only highlight the feature on this track.
     */
    highlight(track) {
      if (!this.visible) { return; }
      this.canvas.clear('ui');
      if (track && track.plot === this) {
        track.highlight();
      } else {
        this.tracks().each( (i, t) => t.highlight());
      }
    }

    update(attributes) {
      this.viewer.updatePlots(this, attributes);
    }

    tracks(term) {
      const tracks = new CGV.CGArray();
      this.viewer.tracks().each( (i, track) => {
        if (track.plot === this) {
          tracks.push(track);
        }
      });
      return tracks.get(term);
    }

    /**
     * Remove the Plot from the viewer, tracks and slots
     */
    remove() {
      this.viewer.removePlots(this);
    }

    scoreForPosition(bp) {
      const index = CGV.indexOfValue(this.positions, bp);
      if (index === 0 && bp < this.positions[index]) {
        return undefined;
      } else {
        return this.scores[index];
      }
    }


    draw(canvas, slotRadius, slotThickness, fast, range) {
      // let startTime = new Date().getTime();
      if (!this.visible) { return; }
      if (this.colorNegative.rgbaString === this.colorPositive.rgbaString) {
        this._drawPath(canvas, slotRadius, slotThickness, fast, range, this.colorPositive);
      } else {
        this._drawPath(canvas, slotRadius, slotThickness, fast, range, this.colorPositive, 'positive');
        this._drawPath(canvas, slotRadius, slotThickness, fast, range, this.colorNegative, 'negative');
      }
      // console.log("Plot Time: '" + CGV.elapsedTime(startTime) );
    }

    // To add a fast mode use a step when creating the indices
    _drawPath(canvas, slotRadius, slotThickness, fast, range, color, orientation) {
      const ctx = canvas.context('map');
      const positions = this.positions;
      const scores = this.scores;
      // This is the difference in radial pixels required before a new arc is draw
      // const radialDiff = fast ? 1 : 0.5;
      // let radialDiff = 0.5;

      const sequenceLength = this.viewer.sequence.length;

      const startIndex = CGV.indexOfValue(positions, range.start, false);
      let stopIndex = CGV.indexOfValue(positions, range.stop, false);
      // Change stopIndex to last position if stop is between 1 and first position
      if (stopIndex === 0 && range.stop < positions[stopIndex]) {
        stopIndex = positions.length - 1;
      }
      const startPosition = startIndex === 0 ? positions[startIndex] : range.start;
      let stopPosition = range.stop;
      // console.log(startPosition + '..' + stopPosition)

      // let startScore = startIndex === 0 ? this.baseline : scores[startIndex];
      let startScore = scores[startIndex];

      startScore = this._keepPoint(startScore, orientation) ? startScore : this.baseline;

      ctx.beginPath();

      // Calculate baseline Radius
      // const baselineRadius = slotRadius - (slotThickness / 2) + (slotThickness * this.baseline);
      const axisRange = this.axisMax - this.axisMin;
      const baselineRadius = slotRadius - (slotThickness / 2) + (slotThickness * (this.baseline - this.axisMin)/axisRange);

      // Move to the first point
      const startPoint = canvas.pointForBp(startPosition, baselineRadius);
      ctx.moveTo(startPoint.x, startPoint.y);

      let savedR = baselineRadius + ((startScore - this.baseline) * slotThickness);
      let savedPosition = startPosition;

      let score, currentPosition;
      // const crossingBaseline = false;
      // const drawNow = false;
      let step = 1;
      if (fast) {
        // When drawing fast, use a step value scaled to base-2
        const positionsLength = this.countPositionsFromRange(startPosition, stopPosition);
        const maxPositions = 4000;
        const initialStep = positionsLength / maxPositions;
        if (initialStep > 1) {
          step = CGV.base2(initialStep);
        }
      }

      this.positionsFromRange(startPosition, stopPosition, step, (i) => {
        // Handle Origin in middle of range
        if (i === 0 && startIndex !== 0) {
          canvas.path('map', savedR, savedPosition, sequenceLength, false, 'lineTo');
          savedPosition = 1;
          savedR = baselineRadius;
        }

        // NOTE: In the future the radialDiff code (see bottom) could be used to improve speed of NON-fast
        // drawing. However, there are a few bugs that need to be worked out
        score = scores[i];
        currentPosition = positions[i];
        canvas.path('map', savedR, savedPosition, currentPosition, false, 'lineTo');
        if ( this._keepPoint(score, orientation) ) {
          // savedR = baselineRadius + ((score - this.baseline) * slotThickness);
          savedR = baselineRadius + ((score - this.baseline)/axisRange * slotThickness);
          // savedR = baselineRadius + ((((score - axisMin)/axisRange) - this.baseline) * slotThickness);
          // return ((to.max - to.min) * (value - from.min) / (from.max - from.min)) + to.min;
        } else {
          savedR = baselineRadius;
        }
        savedPosition = currentPosition;
      });

      // Change stopPosition if between 1 and first position
      if (stopIndex === positions.length - 1 && stopPosition < positions[0]) {
        stopPosition = sequenceLength;
      }
      // Finish drawing plot to stop position
      canvas.path('map', savedR, savedPosition, stopPosition, false, 'lineTo');
      const endPoint = canvas.pointForBp(stopPosition, baselineRadius);
      ctx.lineTo(endPoint.x, endPoint.y);
      // Draw plot anticlockwise back to start along baseline
      canvas.path('map', baselineRadius, stopPosition, startPosition, true, 'noMoveTo');
      ctx.fillStyle = color.rgbaString;
      ctx.fill();

      // ctx.strokeStyle = 'black';
      // TODO: draw stroked line for sparse data
      // ctx.lineWidth = 0.05;
      // ctx.lineWidth = 1;
      // ctx.strokeStyle = color.rgbaString;
      // ctx.stroke();
    }


    // If the positive and negative legend are the same, the plot is drawn as a single path.
    // If the positive and negative legend are different, two plots are drawn:
    // - one above the baseline (positive)
    // - one below the baseline (negative)
    // This method checks if a point should be kept based on it's score and orientation.
    // If no orientation is provided, a single path will be drawn and all the points are kept.
    _keepPoint(score, orientation) {
      if (orientation === undefined) {
        return true;
      } else if (orientation === 'positive' && score > this.baseline) {
        return true;
      } else if (orientation === 'negative' && score < this.baseline ) {
        return true;
      }
      return false;
    }

    positionsFromRange(startValue, stopValue, step, callback) {
      const positions = this.positions;
      let startIndex = CGV.indexOfValue(positions, startValue, true);
      const stopIndex = CGV.indexOfValue(positions, stopValue, false);
      // This helps reduce the jumpiness of feature drawing with a step
      // The idea is to alter the start index based on the step so the same
      // indices should be returned. i.e. the indices should be divisible by the step.
      if (startIndex > 0 && step > 1) {
        startIndex += step - (startIndex % step);
      }
      if (stopValue >= startValue) {
        // Return if both start and stop are between values in array
        if (positions[startIndex] > stopValue || positions[stopIndex] < startValue) { return; }
        for (let i = startIndex; i <= stopIndex; i += step) {
          callback.call(positions[i], i, positions[i]);
        }
      } else {
        // Skip cases where the the start value is greater than the last value in array
        if (positions[startIndex] >= startValue) {
          for (let i = startIndex, len = positions.length; i < len; i += step) {
            callback.call(positions[i], i, positions[i]);
          }
        }
        // Skip cases where the the stop value is less than the first value in array
        if (positions[stopIndex] <= stopValue) {
          for (let i = 0; i <= stopIndex; i += step) {
            callback.call(positions[i], i, positions[i]);
          }
        }
      }
      return positions;
    }

    countPositionsFromRange(startValue, stopValue) {
      const positions = this.positions;
      let startIndex = CGV.indexOfValue(positions, startValue, true);
      let stopIndex = CGV.indexOfValue(positions, stopValue, false);

      if (startValue > positions[positions.length - 1]) {
        startIndex++;
      }
      if (stopValue < positions[0]) {
        stopIndex--;
      }
      if (stopValue >= startValue) {
        return stopIndex - startIndex + 1;
      } else {
        return (positions.length - startIndex) + stopIndex + 1;
      }
    }

    // Options:
    // - excludeData: if true, the scores and positions are not included
    toJSON(options = {}) {
      const json = {
        name: this.name,
        type: this.type,
        baseline: this.baseline,
        source: this.source,
      };
      if (this.legendPositive === this.legendNegative) {
        json.legend = this.legendPositive.name;
      } else {
        json.legendPositive = this.legendPositive.name;
        json.legendNegative = this.legendNegative.name;
      }
      if ( (this.axisMin !== this.scoreMin) || options.includeDefaults) {
        json.axisMin = this.axisMin;
      }
      if ( (this.axisMax !== this.scoreMax) || options.includeDefaults) {
        json.axisMax = this.axisMax;
      }
      if (!options.excludeData) {
        json.positions = this.positions;
        json.scores = this.scores;
      }
      // Optionally add default values
      // Visible is normally true
      if (!this.visible || options.includeDefaults) {
        json.visible = this.visible;
      }
      // Favorite is normally false
      if (this.favorite || options.includeDefaults) {
        json.favorite = this.favorite;
      }
      return json;
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
// if (i === 0) {
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
