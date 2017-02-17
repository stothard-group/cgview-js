//////////////////////////////////////////////////////////////////////////////
// ArcPlot
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class ArcPlot {

    /**
     * Draw a plot consisting of arcs
     */
    constructor(viewer, data = {}, display = {}, meta = {}) {
      this.viewer = viewer;
      this.positions = data.positions;
      this.scores = data.scores;
      this._color = new CGV.Color( CGV.defaultFor(data.color, 'black') );
      this._colorPositive = data.colorPositive ? new CGV.Color(data.colorPositive) : undefined;
      this._colorNegative = data.colorNegative ? new CGV.Color(data.colorNegative) : undefined;
      this._baseline = CGV.defaultFor(data.baseline, 0.5);
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

    // /**
    //  * @member {Track} - Get or set the *Track*
    //  */
    // get track() {
    //   return this._track
    // }
    //
    // set track(slot) {
    //   if (this.track) {
    //     // TODO: Remove if already attached to Track
    //   }
    //   this._track = slot;
    //   slot._arcPlot = this;
    //   this._viewer = slot.viewer;
    // }

    get color() {
      // return this._color || this.track.color
      return (this.legendItem) ? this.legendItem.swatchColor : this._color;
    }

    get colorPositive() {
      // return this._colorPositive || this._color
      // return (this.legendPositiveItem) ? this.legendItemPositive.swatchColor : this._colorPositive.rgbaString;

      if (this.legendItemPositive) {
        return this.legendItemPositive.swatchColor
      } else if (this._colorPositive) {
        return this._colorPositive
      } else {
        return this.color
      }
    }

    get colorNegative() {
      // return this._colorNegative || this._color
      // return (this.legendNegativeItem) ? this.legendItemNegative.swatchColor : this._colorNegative.rgbaString;
      if (this.legendItemNegative) {
        return this.legendItemNegative.swatchColor
      } else if (this._colorNegative) {
        return this._colorNegative
      } else {
        return this.color
      }
    }

    /**
     * @member {LegendItem} - Get or set the LegendItem. If a LegendItem is associated with this plot,
     *   the LegendItem swatch Color and Opacity will be used for drawing this plot. The swatch settings will
     *   override the color and opacity set for this plot.
     */
    get legendItem() {
      return this._legendItem;
    }

    set legendItem(value) {
      this._legendItem = value;
    }

    get legendItemPositive() {
      return this._legendItemPositive;
    }

    set legendItemPositive(value) {
      this._legendItemPositive = value;
    }

    get legendItemNegative() {
      return this._legendItemNegative;
    }

    set legendItemNegative(value) {
      this._legendItemNegative = value;
    }

    /**
     * @member {Number} - Get or set the plot baseline. This is a value between 0 and 1 and indicates where
     *  where the baseline will be drawn. By default this is 0.5 (i.e. the center of the track).
     */
    get baseline() {
      return this._baseline;
    }

    set baseline(value) {
      if (value > 1) {
        this._baseline = 1;
      } else if (value < 0) {
        this._baseline = 0;
      } else {
        this._baseline = value;
      }
    }

    draw(canvas, slotRadius, slotThickness, fast, range) {
      if (this.colorNegative.rgbaString == this.colorPositive.rgbaString) {
        this._drawPath(canvas, slotRadius, slotThickness, fast, range, this.colorPositive);
      } else {
        this._drawPath(canvas, slotRadius, slotThickness, fast, range, this.colorPositive, 'positive');
        this._drawPath(canvas, slotRadius, slotThickness, fast, range, this.colorNegative, 'negative');
      }
    }

    // To add a fast mode use a step when creating the indices
    _drawPath(canvas, slotRadius, slotThickness, fast,  range, color, orientation) {
      fast = false
      var ctx = canvas.ctx;
      var scale = canvas.scale;
      var positions = this.positions;
      var scores = this.scores;
      // This is the difference in radial pixels required before a new arc is draw
      // var radialDiff = fast ? 1 : 0.5;
      var radialDiff = 0.5;

      var startPosition = range.start;
      var stopPosition = range.stop;

      ctx.beginPath();
      ctx.lineWidth = 0.0001;

      // Calculate baseline Radius
      var baselineRadius = slotRadius - (slotThickness / 2) + (slotThickness * this.baseline);

      var savedR = baselineRadius;
      var savedPosition = startPosition;
      var currentR;
      var index, score, currentPosition, lastScore;
      // var step = fast ? 2 : 1
      positions.eachFromRange(startPosition, stopPosition, 1, (i) => {
        lastScore = score;
        score = scores[i];
        currentPosition = positions[i];
        currentR = baselineRadius + (score - this.baseline) * slotThickness;
        // If going from positive to negative need to save currentR as 0 (baselineRadius)
        if (orientation && (lastScore * score < 0)) {
          currentR = baselineRadius;
          savedR = currentR;
          canvas.arcPath(currentR, savedPosition, currentPosition, false, true);
          savedPosition = currentPosition;
        }
        if ( this._keepPoint(score, orientation) ){
          if ( Math.abs(currentR - savedR) >= radialDiff ){
            canvas.arcPath(currentR, savedPosition, currentPosition, false, true);
            savedR = currentR;
            savedPosition = currentPosition
          }
        } else {
          savedR = baselineRadius;
        }
      });
      canvas.arcPath(savedR, savedPosition, stopPosition, false, true);
      var endPoint = canvas.pointFor(stopPosition, baselineRadius);
      ctx.lineTo(endPoint.x, endPoint.y);
      canvas.arcPath(baselineRadius, stopPosition, startPosition, true, true);
      ctx.fillStyle = color.rgbaString;
      ctx.fill();
    }

    _keepPoint(score, orientation) {
      if (orientation == undefined) {
        return true
      } else if (orientation == 'positive' && score > 0) {
        return true
      } else if (orientation == 'negative' && score < 0 ) {
        return true
      }
      return false
    }

  }


  CGV.ArcPlot = ArcPlot;

})(CGView);
