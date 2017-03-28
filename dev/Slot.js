//////////////////////////////////////////////////////////////////////////////
// Slot
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class Slot {

    /**
     * Slot
     */
    constructor(track, data = {}, display = {}, meta = {}) {
      this.track = track;
      this._strand = CGV.defaultFor(data.strand, 'direct');
      this._features = new CGV.CGArray();
      this._plot;
      this.proportionOfRadius = CGV.defaultFor(data.proportionOfRadius, 0.1)
      //TEMP
      if (data.type == 'plot') {
        this.type = 'plot'
      } else {
        this.type = 'feature'
      }


      // this._featureStarts = new CGV.CGArray();

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

    /** * @member {Layout} - Get the *Layout*
     */
    get layout() {
      return this.track.layout
    }


    /** * @member {Viewer} - Get the *Viewer*
     */
    get viewer() {
      return this.track.viewer
    }

    /**
     * @member {Sequence} - Get the sequence.
     */
    get sequence() {
      return this.viewer.sequence
    }

    /**
     * @member {String} - Get the position of the slot in relation to the backbone
     */
    get position() {
      if (this.track.position == 'both') {
        return (this.isDirect() ? 'outside' : 'inside')
      } else {
        return this.track.position
      }
    }

    /**
     * @member {Boolean} - Is the slot position inside the backbone
     */
    get inside() {
      return this.position == 'inside'
    }

    /**
     * @member {Boolean} - Is the slot position outside the backbone
     */
    get outside() {
      return this.position == 'outside'
    }

    /**
     * @member {Viewer} - Get or set the track size with is measured as a 
     * proportion of the backbone radius.
     */
    get proportionOfRadius() {
      return this._proportionOfRadius
    }

    set proportionOfRadius(value) {
      this._proportionOfRadius = value;
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
      return this.strand == 'direct'
    }

    isReverse() {
      return this.strand == 'reverse'
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
    // Features need to be sorted by start position
    // NOTE: consider using d3 bisect for inserting new features in the proper sort order
    refresh() {
      // NOTE: all features should be sorted from json builder or in workers to save time here
      // Sort the features by start
      // this._features.sort( (a, b) => {
      //   return a.start - b.start
      // });
      this._featureNCList = new CGV.NCList(this._features, {circularLength: this.sequence.length});
      // Clear feature starts
      // this._featureStarts = new CGV.CGArray();
      // for (var i = 0, len = this._features.length; i < len; i++) {
      //   this._featureStarts.push(this._features[i].start);
      // }
      // this._largestFeatureLength = this.findLargestFeatureLength();
    }

    /**
     * Get the visible range
     * @member {Range}
     */
    get visibleRange() {
      return this._visibleRange
    }

    // get largestFeatureLength() {
    //   return this._largestFeatureLength
    // }

    /**
     * Does the slot contain the given *radius*.
     * @param {Number} radius - The radius.
     * @return {Boolean}
     */
    containsRadius(radius) {
      var halfthickness = this.thickness / 2;
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
    // findFeatureForBp(bp) {
    //   var start = this.sequence.subtractBp(bp, this.largestFeatureLength);
    //   var feature;
    //   this._featureStarts.eachFromRange(start, bp, 1, (i) => {
    //     if (!feature && this._features[i].range.contains(bp)) {
    //       feature = this._features[i];
    //     }
    //   });
    //   return feature
    // }

    findLargestFeatureLength() {
      var length = 0;
      var nextLength;
      for (var i = 0, len = this._features.length; i < len; i++) {
        nextLength = this._features[i].length;
        if (nextLength > length) {
          length = nextLength
        }
      }
      return length
    }

    clear() {
      var range = this._visibleRange;
      if (range) {
        var slotRadius = this.radius;
        var slotThickness = this.thickness;
        var ctx = this.viewer.canvas.context('map');
        ctx.globalCompositeOperation = "destination-out"; // The existing content is kept where it doesn't overlap the new shape.
        this.viewer.canvas.drawArc('map', range.start, range.stop, slotRadius, 'white', slotThickness);
        ctx.globalCompositeOperation = "source-over"; // Default
      }
    }

    // draw(canvas, fast, slotRadius, slotThickness) {
    draw(canvas, fast) {
      // this._radius = slotRadius;
      // this._thickness = slotThickness;
      var slotRadius = this.radius;
      var slotThickness = this.thickness;
      var range = canvas.visibleRangeForRadius(slotRadius, slotThickness);
      this._visibleRange = range;
      if (range) {
        var start = range.start;
        var stop = range.stop;
        if (this.hasFeatures) {
          var featureCount = this._features.length;
          // var largestLength = this.largestFeatureLength;
          // Case where the largest feature should not be subtracted
          // _____ Visible
          // ----- Not Visbile
          // Do no subtract the largest feature so that the start loops around to before the stop
          // -----Start_____Stop-----
          // In cases where the start is shortly after the stop, make sure that subtracting the largest feature does not put the start before the stop
          // _____Stop-----Start_____
          // if ( (largestLength <= (this.sequence.length - Math.abs(start - stop))) ) {
          //   if (this.sequence.subtractBp(start, stop) <= largestLength) {
          //     start = range.getStopPlus(1);
          //   } else {
          //     start = range.getStartPlus(-largestLength);
          //   }
          //   featureCount = this._featureStarts.countFromRange(start, stop);
          // }
          if (!range.isFullCircle()) {
            featureCount = this._featureNCList.count(start, stop);
          }
          var step = 1;
          // Change step if drawing fast and there are too many features
          if (fast && featureCount > this.layout.fastFeaturesPerSlot) {
            // canvas.drawArc(1, this.sequence.length, slotRadius, 'rgba(0,0,200,0.03)', slotThickness);
            // Use a step that is rounded up to the nearest power of 2
            // This combined with eachFromRange altering the start index based on the step
            // means that as we zoom, the visible features remain consistent.
            // e.g. When zooming all the features visible at a step of 16
            // will be visible when the step is 8 and so on.
            var initialStep = Math.ceil(featureCount / this.layout.fastFeaturesPerSlot);
            step = CGV.base2(initialStep);
          }
          // Draw Features

          // var startTime = new Date().getTime();
          //
          // this._featureStarts.eachFromRange(start, stop, step, (i) => {
          //   this._features[i].draw('map', slotRadius, slotThickness, range);
          // })
          // var time1 = CGV.elapsed_time(startTime);
          // var startTime2 = new Date().getTime();
          this._featureNCList.run(start, stop, step, (feature) => {
            feature.draw('map', slotRadius, slotThickness, range);
          })
          // var time2 = CGV.elapsed_time(startTime2);
          // console.log(time1 + ' -> ' +  time2);

          // Debug
          if (this.viewer.debug && this.viewer.debug.data.n) {
            var index = this.viewer._slots.indexOf(this);
            this.viewer.debug.data.n['slot_' + index] = featureCount;
          }
        } else if (this.hasPlot) {
          this._plot.draw(canvas, slotRadius, slotThickness, fast, range);
        }
      }
    }

    drawProgress(progress) {
      var canvas = this.viewer.canvas;
      var slotRadius = this.radius;
      var slotThickness = this.thickness;
      var range = this._visibleRange;
      // Draw progress like a clock
      // if (progress > 0 && progress < 100) {
      //   var stop = this.sequence.length * progress / 100;
      //   canvas.drawArc('background', 1, stop, slotRadius, '#EAEAEE', slotThickness);
      // }
      // Draw progress like thickening circle
      if (progress > 0 && progress < 100 && range) {
        var thickness = slotThickness * progress / 100;
        canvas.drawArc('background', range.start, range.stop, slotRadius, '#EAEAEE', thickness);
      }
    }


  }

  CGV.Slot = Slot;

})(CGView);
