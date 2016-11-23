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
      this._color = CGV.default_for(data.color, 'black');
      this._colorPositive = data.colorPositive;
      this._colorNegative = data.colorNegative;

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
      return this._color || this.featureSlot.color
    }

    get colorPositive() {
      return this._colorPositive || this._color
    }

    get colorNegative() {
      return this._colorNegative || this._color
    }

    draw(canvas, slotRadius, slotThickness, fast, start, stop) {
      if (this.colorNegative == this.colorPositive) {
        this._drawPath(canvas, slotRadius, slotThickness, fast, start, stop, this.colorPositive);
      } else {
        this._drawPath(canvas, slotRadius, slotThickness, fast, start, stop, this.colorPositive, 'positive');
        this._drawPath(canvas, slotRadius, slotThickness, fast, start, stop, this.colorNegative, 'negative');
      }
      // if (this.colorNegative == this.colorPositive) {
      //   this._drawPath2(canvas, slotRadius, slotThickness, this.colorPositive);
      // } else {
      //   this._drawPath2(canvas, slotRadius, slotThickness,this.colorPositive, 'positive');
      //   this._drawPath2(canvas, slotRadius, slotThickness,this.colorNegative, 'negative');
      // }
    }

    // To add a fast mode use a step when creating the indices
    _drawPath(canvas, slotRadius, slotThickness, fast,  start, stop, color, orientation) {
      fast = false
      var ctx = canvas.ctx;
      var scale = canvas.scale;
      var bp = this._bp;
      var prop = this._proportionOfThickness;
      // This is the difference in radial pixels required before a new arc is draw
      // var radialDiff = fast ? 1 : 0.5;
      var radialDiff = 0.5;

      var startBp = start ? start : 1;
      var stopBp = stop ? stop : this.viewer.sequenceLength;

      ctx.beginPath();
      ctx.lineWidth = 0.0001;
      var centerX = scale.x(0);
      var centerY = scale.y(0);

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
            ctx.arc(centerX, centerY, currentR, scale.bp(saved_bp), scale.bp(currentBp), false);
            savedR = currentR;
            saved_bp = currentBp
          }
        } else {
          savedR = slotRadius;
        }
      });
      ctx.arc(centerX, centerY, savedR, scale.bp(saved_bp), scale.bp(stopBp), false);
      ctx.arc(centerX, centerY, slotRadius, scale.bp(stopBp), scale.bp(startBp), true);
      ctx.fillStyle = color;
      ctx.fill();
    }

    // To add a fast mode use a step when creating the indices
    _drawPath2(canvas, slotRadius, slotThickness, fast,  start, stop, color, orientation) {
      fast = false
      var ctx = canvas.ctx;
      var scale = canvas.scale;
      var bp = this._bp;
      var prop = this._proportionOfThickness;
      // This is the difference in radial pixels required before a new arc is draw
      // var radialDiff = fast ? 1 : 0.5;
      var radialDiff = 0.5;

      // Find position indices that include start and stop bp
      var indices;
      var startBp = start ? start : 1;
      var stopBp = stop ? stop : this.viewer.sequenceLength;
      var startIndex = CGV.indexOfValue(this._bp, startBp, false);
      var stopIndex = CGV.indexOfValue(this._bp, stopBp, true);
      var step = fast ? 2 : 1
      if (stopBp >= startBp) {
        indices = d3.range(startIndex, stopIndex + 1, step);
      } else {
        // Start and stop overlap 1
        indices = d3.range(startIndex, this._bp.length, step);
        indices = indices.concat(d3.range(0, stopIndex + 1, step));
      }

      ctx.beginPath();
      ctx.lineWidth = 0.0001;
      var centerX = scale.x(0);
      var centerY = scale.y(0);

      var savedR = slotRadius;
      var saved_bp = bp[indices[0]];
      var currentR;
      var index, currentProp, currentBp;
      for (var i = 0, len = indices.length; i < len; i++) {
        index = indices[i];
        currentProp = prop[index];
        currentBp = bp[index];
        currentR = slotRadius + prop[index] * slotThickness;
        // TODO: if going from positive to negative need to save currentR as 0 (slotRadius)
        if ( this._keepPoint(currentProp, orientation) ){
          if ( Math.abs(currentR - savedR) >= radialDiff ){
            ctx.arc(centerX, centerY, currentR, scale.bp(saved_bp), scale.bp(currentBp), false);
            savedR = currentR;
            saved_bp = currentBp
          }
        } else {
          savedR = slotRadius;
        }
      }
      ctx.arc(centerX, centerY, savedR, scale.bp(saved_bp), scale.bp(stopBp), false);
      ctx.arc(centerX, centerY, slotRadius, scale.bp(stopBp), scale.bp(startBp), true);
      ctx.fillStyle = color;
      ctx.fill();
    }










    // draw(canvas, slotRadius, slotThickness) {
    //   if (this.colorNegative == this.colorPositive) {
    //     this._drawPath(canvas, slotRadius, slotThickness, this.colorPositive);
    //   } else {
    //     this._drawPath(canvas, slotRadius, slotThickness, this.colorPositive, 'positive');
    //     this._drawPath(canvas, slotRadius, slotThickness, this.colorNegative, 'negative');
    //   }
    // }
    //
    _drawPathOLD(canvas, slotRadius, slotThickness, color, position) {
      var ctx = canvas.ctx
      var scale = canvas.scale
      ctx.beginPath();
      ctx.lineWidth = 0
      var bp = this._bp;
      var prop = this._proportionOfThickness;
      var saved_r = slotRadius;
      var saved_bp = bp[0];
      var centerX = scale.x(0);
      var centerY = scale.y(0);
      var r = slotRadius + prop[0] * slotThickness;
      ctx.arc(centerX, centerY, r, scale.bp(0), scale.bp(bp[0]), false);
      for (var i = 1, len = bp.length; i < len; i++) {
        r = slotRadius + prop[i] * slotThickness;
        if ( Math.abs(r - saved_r) >= 1 && this._keepPoint(prop[i], position)){
          ctx.arc(centerX, centerY, r, scale.bp(saved_bp), scale.bp(bp[i]), false);
          saved_r = r;
          saved_bp = bp[i];
        }
      }
      ctx.arc(centerX, centerY, r, scale.bp(bp[bp.length - 1]), scale.bp(this.viewer.sequenceLength), false);
      ctx.arc(centerX, centerY, slotRadius, scale.bp(this.viewer.sequenceLength), scale.bp(0), true);
      ctx.fillStyle = color;
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
