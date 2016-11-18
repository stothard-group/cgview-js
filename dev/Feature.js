//////////////////////////////////////////////////////////////////////////////
// Feature
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class Feature {

    constructor(data = {}, display = {}, meta = {}) {
      // this._viewer = viewer;
      // this._featureRanges = new CGV.CGArray();
      // this._featurePaths = new CGV.CGArray();
      this._color = data.color;
      this._start = Number(data.start);
      this._stop = Number(data.stop);
      this._radiusAdjustment = Number(data.radiusAdjustment) || 0;
      this._proportionOfThickness = Number(data.proportionOfThickness) || 1;
      this._opacity = data.opacity;
      this._decoration = data.decoration;
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

    get color() {
      return this._color || (this._featureSlot && this._featureSlot.color) || 'blue';
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

    get viewer() {
      return this._featureSlot.viewer
    }

    get length() {
      // TODO: use generic method
      if (this.stop >= this.start) {
        return this.stop - this.start
      } else {
        return this.viewer.sequenceLength + (this.stop - this.start)
      } 
    }

  }

  CGV.Feature = Feature;

})(CGView);
