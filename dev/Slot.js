//////////////////////////////////////////////////////////////////////////////
// Slot
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * <br />
   * A Slot is a single ring on the Map.
   * @extends CGObject
   */
  class Slot extends CGV.CGObject {

    /**
     * Slot
     */
    constructor(track, data = {}, meta = {}) {
      super(track.viewer, data, meta);
      this.track = track;
      this._strand = CGV.defaultFor(data.strand, 'direct');
      this._features = new CGV.CGArray();
      this._plot;
      this.proportionOfRadius = CGV.defaultFor(data.proportionOfRadius, 0.1)
      this.refresh();
    }

    /**
     * Return the class name as a string.
     * @return {String} - 'Slot'
     */
    toString() {
      return 'Slot';
    }

    /** * @member {Track} - Get the *Track*
     */
    get track() {
      return this._track
    }

    set track(track) {
      if (this.track) {
        // TODO: Remove if already attached to Track
      }
      this._track = track;
      track._slots.push(this);
    }

    /** * @member {String} - Get the Track Type
     */
    get type() {
      return this.track.type
    }

    /** * @member {Layout} - Get the *Layout*
     */
    get layout() {
      return this.track.layout
    }

    /**
     * @member {String} - Get the position of the slot in relation to the backbone
     */
    get position() {
      if (this.track.position === 'both') {
        return (this.isDirect() ? 'outside' : 'inside')
      } else {
        return this.track.position
      }
    }

    /**
     * @member {Boolean} - Is the slot position inside the backbone
     */
    get inside() {
      return this.position === 'inside'
    }

    /**
     * @member {Boolean} - Is the slot position outside the backbone
     */
    get outside() {
      return this.position === 'outside'
    }

    /**
     * @member {Viewer} - Get or set the track size as a proportion of the backbone radius.
     */
    get proportionOfRadius() {
      return this._proportionOfRadius
    }

    set proportionOfRadius(value) {
      this._proportionOfRadius = value;
    }

    /**
     * @member {Viewer} - Get the track size as a ratio to all other tracks
     */
    get thicknessRatio() {
      return this.track.thicknessRatio
    }

    /**
     * @member {Number} - Get the current radius of the slot.
     */
    get radius() {
      return this._radius
    }

    /**
     * @member {Number} - Get the current thickness of the slot.
     */
    get thickness() {
      return this._thickness
    }


    get strand() {
      return this._strand;
    }

    isDirect() {
      return this.strand === 'direct'
    }

    isReverse() {
      return this.strand === 'reverse'
    }

    get hasFeatures() {
      return this._features.length > 0
    }

    get hasPlot() {
      return this._plot
    }

    features(term) {
      return this._features.get(term)
    }

    replaceFeatures(features) {
      this._features = features;
      this.refresh();
    }

    /**
     * The number of pixels per basepair along the feature track circumference.
     * @return {Number}
     */
    pixelsPerBp() {
      return (this.radius * 2 * Math.PI) / this.sequence.length;
    }

    // Refresh needs to be called when new features are added, etc
    refresh() {
      this._featureNCList = new CGV.NCList(this._features, {circularLength: this.sequence.length});
    }

    /**
     * Get the visible range
     * @member {Range}
     */
    get visibleRange() {
      return this._visibleRange
    }

    /**
     * Does the slot contain the given *radius*.
     * @param {Number} radius - The radius.
     * @return {Boolean}
     */
    containsRadius(radius) {
      let halfthickness = this.thickness / 2;
      return (radius >= (this.radius - halfthickness)) && (radius <= (this.radius + halfthickness))
    }

    /**
     * Return the first feature in this slot that contains the given bp.
     * @param {Number} bp - the position in bp to search for.
     * @return {Feature}
     */
    findFeaturesForBp(bp) {
      return this._featureNCList.find(bp);
    }

    findLargestFeatureLength() {
      let length = 0;
      let nextLength;
      for (let i = 0, len = this._features.length; i < len; i++) {
        nextLength = this._features[i].length;
        if (nextLength > length) {
          length = nextLength
        }
      }
      return length
    }

    clear() {
      let range = this._visibleRange;
      if (range) {
        let slotRadius = this.radius;
        let slotThickness = this.thickness;
        let ctx = this.canvas.context('map');
        ctx.globalCompositeOperation = "destination-out"; // The existing content is kept where it doesn't overlap the new shape.
        this.canvas.drawArc('map', range.start, range.stop, slotRadius, 'white', slotThickness);
        ctx.globalCompositeOperation = "source-over"; // Default
      }
    }

    highlight(color='#FFB') {
      let range = this._visibleRange;
      if (range && this.visible) {
        let slotRadius = this.radius;
        let slotThickness = this.thickness;
        this.canvas.drawArc('background', range.start, range.stop, slotRadius, color, slotThickness);
      }
    }

    // draw(canvas, fast, slotRadius, slotThickness) {
    draw(canvas, fast) {
      let slotRadius = this.radius;
      let slotThickness = this.thickness;
      let range = canvas.visibleRangeForRadius(slotRadius, slotThickness);
      this._visibleRange = range;
      if (range) {
        let start = range.start;
        let stop = range.stop;
        if (this.hasFeatures) {
          let featureCount = this._features.length;
          if (!range.isFullCircle()) {
            featureCount = this._featureNCList.count(start, stop);
          }
          let step = 1;
          // Change step if drawing fast and there are too many features
          if (fast && featureCount > this.layout.fastFeaturesPerSlot) {
            // Use a step that is rounded up to the nearest power of 2
            // This combined with eachFromRange altering the start index based on the step
            // means that as we zoom, the visible features remain consistent.
            // e.g. When zooming all the features visible at a step of 16
            // will be visible when the step is 8 and so on.
            let initialStep = Math.ceil(featureCount / this.layout.fastFeaturesPerSlot);
            step = CGV.base2(initialStep);
          }
          let showShading = fast ? false : undefined;
          // When drawing shadows, draw in reverse order to make them look better
          if (this.viewer.settings.showShading && this.isDirect()) { step *= -1 }
          // Draw Features
          this._featureNCList.run(start, stop, step, (feature) => {
            feature.draw('map', slotRadius, slotThickness, range, {showShading: showShading});
          })

          // Debug
          if (this.viewer.debug && this.viewer.debug.data.n) {
            let index = this.viewer._slots.indexOf(this);
            this.viewer.debug.data.n['slot_' + index] = featureCount;
          }
        } else if (this.hasPlot) {
          this._plot.draw(canvas, slotRadius, slotThickness, fast, range);
        }
      }
    }

    drawProgress(progress) {
      let canvas = this.canvas;
      let slotRadius = this.radius;
      let slotThickness = this.thickness;
      let range = this._visibleRange;
      // Draw progress like thickening circle
      if (progress > 0 && progress < 100 && range) {
        let thickness = slotThickness * progress / 100;
        canvas.drawArc('background', range.start, range.stop, slotRadius, '#EAEAEE', thickness, 'arc', false);
      }
    }

    /**
     * Remove a feature or array of features from the slot.
     *
     * @param {Feature|Array} features - The Feature(s) to remove.
     */
    removeFeatures(features) {
      features = (features.toString() === 'CGArray') ? features : new CGV.CGArray(features);
      this._features = new CGV.CGArray(
        this._features.filter( (f) => { return !features.contains(f) })
      );
      this.refresh();
    }

    /**
     * Remove the plot from the slot.
     */
    removePlot() {
      this._plot = undefined;
      this.refresh();
    }


  }

  CGV.Slot = Slot;

})(CGView);
