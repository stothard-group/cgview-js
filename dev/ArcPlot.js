//////////////////////////////////////////////////////////////////////////////
// ArcPlot
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class ArcPlot {

    /**
     * Draw a plot consisting of arcs
     */
    constructor(featureSlot, data = {}, display = {}, meta = {}) {
      this.featureSlot = featureSlot;
      this._bp = new CGV.CGArray();
      this._proportionOfThickness =  new CGV.CGArray();
      this._color = new CGV.Color( CGV.defaultFor(data.color, 'black') );
      this._colorPositive = data.colorPositive ? new CGV.Color(data.colorPositive) : undefined;
      this._colorNegative = data.colorNegative ? new CGV.Color(data.colorNegative) : undefined;

      if (data.bp) {
        this._bp = new CGV.CGArray(data.bp);
      }
      if (data.proportionOfThickness) {
        this._proportionOfThickness = new CGV.CGArray(data.proportionOfThickness);
      }
    }

    /**
     * @member {FeatureSlot} - Get or set the *FeatureSlot*
     */
    get featureSlot() {
      return this._featureSlot
    }

    set featureSlot(slot) {
      if (this.featureSlot) {
        // TODO: Remove if already attached to FeatureSlot
      }
      this._featureSlot = slot;
      slot._arcPlot = this;
      this._viewer = slot.viewer;
    }

    /**
     * @member {Viewer} - Get the *Viewer*
     */
    get viewer() {
      return this._viewer
    }

    get color() {
      // return this._color || this.featureSlot.color
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

    draw(canvas, slotRadius, slotThickness, fast, range) {
      if (this.colorNegative.rgbaString == this.colorPositive.rgbaString) {
        this._drawPath(canvas, slotRadius, slotThickness, fast, range, this.colorPositive);
      } else {
        this._drawPath(canvas, slotRadius, slotThickness, fast, range, this.colorPositive, 'positive');
        this._drawPath(canvas, slotRadius, slotThickness, fast, range, this.colorNegative, 'negative');
      }
    }

    // To add a fast mode use a step when creating the iadices
    _drawPath(canvas, slotRadius, slotThickness, fast,  range, color, orientation) {
      fast = false
      var ctx = canvas.ctx;
      var scale = canvas.scale;
      var bp = this._bp;
      var prop = this._proportionOfThickness;
      // This is the difference in radial pixels required before a new arc is draw
      // var radialDiff = fast ? 1 : 0.5;
      var radialDiff = 0.5;

      var startBp = range.start;
      var stopBp = range.stop;

      ctx.beginPath();
      ctx.lineWidth = 0.0001;

      var savedR = slotRadius;
      var saved_bp = startBp;
      var currentR;
      var index, currentProp, currentBp;
      // var step = fast ? 2 : 1
      bp.eachFromRange(startBp, stopBp, 1, (i) => {
        currentProp = prop[i];
        currentBp = bp[i];
        currentR = slotRadius + prop[i] * slotThickness;
        // TODO: if going from positive to negative need to save currentR as 0 (slotRadius)
        if ( this._keepPoint(currentProp, orientation) ){
          if ( Math.abs(currentR - savedR) >= radialDiff ){
            canvas.arcPath(currentR, saved_bp, currentBp, false, true);
            savedR = currentR;
            saved_bp = currentBp
          }
        } else {
          savedR = slotRadius;
        }
      });
      canvas.arcPath(savedR, saved_bp, stopBp, false, true);
      var endPoint = canvas.pointFor(stopBp, slotRadius);
      ctx.lineTo(endPoint.x, endPoint.y);
      canvas.arcPath(slotRadius, stopBp, startBp, true, true);
      ctx.fillStyle = color.rgbaString;
      ctx.fill();
    }

    _keepPoint(proportionOfRadius, orientation) {
      if (orientation == undefined) {
        return true
      } else if (orientation == 'positive' && proportionOfRadius > 0) {
        return true
      } else if (orientation == 'negative' && proportionOfRadius < 0 ) {
        return true
      }
      return false
    }

  }


  CGV.ArcPlot = ArcPlot;

})(CGView);
