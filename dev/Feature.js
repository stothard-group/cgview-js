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
      // this.color = data.color;
      // this._opacity = data.opacity;
      this._color = new CGV.Color(data.color);
      this.opacity = data.opacity;
      this._start = Number(data.start);
      this._stop = Number(data.stop);
      this._radiusAdjustment = Number(data.radiusAdjustment) || 0;
      this._proportionOfThickness = Number(data.proportionOfThickness) || 1;
      // Decoration: arc, clockwise-arrow, counterclockwise-arrow
      this._decoration = CGV.defaultFor(data.decoration, 'arc');
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

    /**
     * @member {Number} - Get or set the start position of the feature in basepair (bp).
     *   All start and stop positions are assumed to be going in a clockwise direction.
     */
    get start() {
      return this._start
    }

    set start(bp) {
      this._start = bp;
    }

    /**
     * @member {Number} - Get or set the stop position of the feature in basepair (bp).
     *   All start and stop positions are assumed to be going in a clockwise direction.
     */
    get stop() {
      return this._stop
    }

    set stop(bp) {
      this._stop = bp;
    }

    /**
     * @member {String} - Get or set the color. Defaults to the *FeatureSlot* color. TODO: reference COLOR class
     */
    get color() {
      // return this._color.rgba
      return (this.legendItem) ? this.legendItem.swatchColor : this._color.rgba;
    }

    set color(color) {
      this._color.color = color;
    }

    /**
     * @member {String} - Get or set the opacity. 
     */
    get opacity() {
      // return this._color.opacity
      return (this.legendItem) ? this.legendItem.swatchOpacity : this._color.opacity;
    }

    set opacity(value) {
      this._color.opacity = value;
    }

    /**
     * @member {String} - Get or set the decoration. Choices are *arc* [Default], *clockwise-arrow*, *counterclockwise-arrow*
     */
    get decoration() {
      return this._decoration;
    }

    set decoration(value) {
      this._decoration = value;
    }

    /**
     * @member {LegendItem} - Get or set the LegendItem. If a LegendItem is associated with this feature,
     *   the LegendItem swatch Color and Opacity will be used for drawing this feature. The swatch settings will
     *   override the color and opacity set for this feature.
     */
    get legendItem() {
      return this._legendItem;
    }

    set legendItem(value) {
      this._legendItem = value;
    }



    draw(canvas, slotRadius, slotThickness) {
      canvas.drawArc(this.start, this.stop,
        this.adjustedRadius(slotRadius, slotThickness),
        this.color, this.adjustedWidth(slotThickness), this.decoration);
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
