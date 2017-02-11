//////////////////////////////////////////////////////////////////////////////
// Feature
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class Feature {

    /**
     * A Feature
     */
    constructor(viewer, data = {}, display = {}, meta = {}) {
      // this.slot = slot;
      // this.color = data.color;
      // this._opacity = data.opacity;
      this.viewer = viewer;
      // this._color = new CGV.Color(data.color);
      // this.opacity = parseFloat(data.opacity);
      this.range = new CGV.CGRange(this.viewer.sequence, Number(data.start), Number(data.stop));
      this.label = new CGV.Label(this, {name: data.label} );
      this._radiusAdjustment = Number(data.radiusAdjustment) || 0;
      this._proportionOfThickness = Number(data.proportionOfThickness) || 1;
      // Decoration: arc, clockwise-arrow, counterclockwise-arrow
      this._decoration = CGV.defaultFor(data.decoration, 'arc');
    }

    /**
     * @member {Slot} - Get or set the *Slot*
     */
    get slot() {
      return this._slot
    }

    set slot(slot) {
      if (this.slot) {
        // TODO: Remove if already attached to Slot
      }
      this._slot = slot;
      slot._features.push(this);
    }

    /**
     * @member {Track} - Get or set the *Track*
     */
    get track() {
      return this._track
    }

    set track(track) {
      if (this.track) {
        // TODO: Remove if already attached to Track
      }
      this._track = track;
      track._features.push(this);
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
      viewer._features.push(this);
    }


    /**
     * @member {Range} - Get or set the range of the feature. All ranges
     *   are assumed to be going in a clockwise direction.
     */
    get range() {
      return this._range
    }

    set range(value) {
      this._range = value;
    }
    /**
     * @member {Number} - Get or set the start position of the feature in basepair (bp).
     *   All start and stop positions are assumed to be going in a clockwise direction.
     */
    get start() {
      // return this._start
      return this.range.start
    }

    set start(value) {
      // this._start = value;
      this.range.start = value;
    }

    /**
     * @member {Number} - Get or set the stop position of the feature in basepair (bp).
     *   All start and stop positions are assumed to be going in a clockwise direction.
     */
    get stop() {
      // return this._stop
      return this.range.stop
    }

    set stop(value) {
      // this._stop = value
      this.range.stop = value;
    }

    get length() {
      return this.range.length
    }

    /**
     * @member {String} - Get or set the feature label.
     */
    get label() {
      return this._label
    }

    set label(value) {
      this._label = value;
    }

    /**
     * @member {String} - Get or set the color. Defaults to the *Track* color. TODO: reference COLOR class
     */
    get color() {
      return (this.legendItem) ? this.legendItem.swatchColor : this._color;
    }

    set color(color) {
      if (color.toString() == 'Color') {
        this._color = color;
      } else {
        this._color.setColor(color);
      }
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



    draw(canvas, slotRadius, slotThickness, visibleRange) {
      if (!this.track) return
      if (this.range.overlapsRange(visibleRange)) {
        var start = this.start;
        var stop = this.stop;
        var containsStart = visibleRange.contains(start);
        var containsStop = visibleRange.contains(stop);
        if (!containsStart) {
          start = visibleRange.start - 100;
        }
        if (!containsStop) {
          stop = visibleRange.stop + 100;
        }
        // When zoomed in, if the feature starts in the visible range and wraps around to end
        // in the visible range, the feature should be draw as 2 arcs.
        if ( (this.viewer.zoomFactor > canvas.drawArcsCutoff) &&
             (containsStart && containsStop) &&
             (this.range.overHalfCircle()) ) {

          canvas.drawArc(visibleRange.start - 100, stop,
            this.adjustedRadius(slotRadius, slotThickness),
            this.color.rgbaString, this.adjustedWidth(slotThickness), this.decoration);
          canvas.drawArc(start, visibleRange.stop + 100,
            this.adjustedRadius(slotRadius, slotThickness),
            this.color.rgbaString, this.adjustedWidth(slotThickness), this.decoration);
        } else {
          canvas.drawArc(start, stop,
            this.adjustedRadius(slotRadius, slotThickness),
            this.color.rgbaString, this.adjustedWidth(slotThickness), this.decoration);
        }
      }
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

  }

  CGV.Feature = Feature;

})(CGView);
