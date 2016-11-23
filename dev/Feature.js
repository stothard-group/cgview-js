//////////////////////////////////////////////////////////////////////////////
// Feature
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class Feature {

    /**
     * A Feature
     */
    constructor(featureSlot, data = {}, display = {}, meta = {}) {
      this.featureSlot = featureSlot;
      this.color = data.color;
      this._start = Number(data.start);
      this._stop = Number(data.stop);
      this._radiusAdjustment = Number(data.radiusAdjustment) || 0;
      this._proportionOfThickness = Number(data.proportionOfThickness) || 1;
      this._opacity = data.opacity;
      this._decoration = data.decoration;
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
      slot._features.push(this);
      this._viewer = slot.viewer;
    }

    /**
     * @member {Viewer} - Get the *Viewer*
     */
    get viewer() {
      return this._viewer
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

    /**
     * Get or set the color. Defaults to the *FeatureSlot* color.
     */
    get color() {
      return this._color || this.featureSlot.color
    }

    set color(color) {
      this._color = color;
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

    get length() {
      return this.viewer.lengthOfRange(this.start, this.stop)
    }

  }

  CGV.Feature = Feature;

})(CGView);
