//////////////////////////////////////////////////////////////////////////////
// Track
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * The Track is used for layout information
   */
  class Track {

    /**
     * Create a new track.
     */
    constructor(layout, data = {}, display = {}, meta = {}) {
      this.layout = layout;
      this._plot;
      this._features = new CGV.CGArray();
      this._slots = new CGV.CGArray();
      this.name = CGV.defaultFor(data.name, 'Unknown')
      this.readingFrame = CGV.defaultFor(data.readingFrame, 'combined')
      this.strand = CGV.defaultFor(data.strand, 'separated')
      this.position = CGV.defaultFor(data.position, 'both')
      this.contents = data.contents
      this.loadProgress = 0;
      this.refresh();
    }

    /** * @member {Viewer} - Get or set the *Viewer*
     */
    get viewer() {
      return this.layout.viewer
    }

    /**
     * @member {String} - Alias for getting the name. Useful for querying CGArrays.
     */
    get id() {
      return this.name
    }

    /**
     * @member {String} - Get or set the *name*.
     */
    get name() {
      return this._name
    }

    set name(value) {
      this._name = value;
    }

    /** * @member {Viewer} - Get or set the *Layout*
     */
    get layout() {
      return this._layout
    }

    set layout(layout) {
      if (this.layout) {
        // TODO: Remove if already attached to layout
      }
      this._layout = layout;
      layout._tracks.push(this);
    }

    /** * @member {Object} - Get or set the *Contents*.
     */
    get contents() {
      return this._contents
    }

    set contents(value) {
      this._contents = value;
      // FIXME: Have validation and removal of extra things.
      if (value.features) {
        this._contentType = 'features';
      } else if (value.plot) {
        this._contentType = 'plot';
      } else {
        this._contentType = undefined;
      }
    }

    /** * @member {String} - Get the *Content Type*.
     */
    get contentType() {
      return this._contentType
    }

    /**
     * @member {Sequence} - Get the sequence.
     */
    get sequence() {
      return this.viewer.sequence
    }

    /**
     * @member {String} - Get or set the strand. Possible values are 'separated' or 'combined'.
     */
    get strand() {
      return this._strand;
    }

    set strand(value) {
      if ( CGV.validate(value, ['separated', 'combined']) ) {
        this._strand = value;
        this.updateSlots();
      }
    }

    /**
     * @member {String} - Get or set the readingFrame. Possible values are 'combined' or 'separated'.
     */
    get readingFrame() {
      return this._readingFrame;
    }

    set readingFrame(value) {
      if (CGV.validate(value, ['separated', 'combined'])) {
        this._readingFrame = value;
        this.updateSlots();
      }
    }

    /**
     * @member {String} - Get or set the position. Possible values are 'inside', 'outside', or 'both'.
     */
    get position() {
      return this._position;
    }

    set position(value) {
      if (CGV.validate(value, ['inside', 'outside', 'both'])) {
        this._position = value;
      }
    }

    /**
     * @member {Number} - Get or set the load progress position (integer between 0 and 100)
     */
    get loadProgress() {
      return this._loadProgress;
    }

    set loadProgress(value) {
      this._loadProgress = value;
    }

    features(term) {
      return this._features.get(term)
    }

    refresh() {
      if (this.contentType == 'features') {
        this.updateFeatures();
      } else if (this.contentType == 'plot') {
        this.updatePlot();
      }
      this.updateSlots();
    }

    updatePlot() {
      if (this.contents.plot.sequence) {
        var sequenceExtractor = this.viewer.sequence.sequenceExtractor;
        if (sequenceExtractor) {
          // This could be the fallback if not able to use workers
          // this._plot = sequenceExtractor.extractPlot(this.contents.plot);
          sequenceExtractor.generatePlot(this, this.contents.plot);
        }
      } else if (this.contents.plot.source) {
        // Plot with particular Source
        this.viewer.plots().find( (plot) => {
          if (plot.source == this.contents.plot.source) {
            this._plot = plot;
          }
        });
      }

    }

    updateFeatures() {
      this._features = new CGV.CGArray();
      if (this.contents.features.sequence) {
        // Features extracted from the  Sequence
        var sequenceExtractor = this.viewer.sequence.sequenceExtractor;
        if (sequenceExtractor) {
          // this._features = sequenceExtractor.extractFeatures(this.contents.features);
          this.extractFeaturesFromSequence()
        } else {
          console.error('No sequence is available to extract features from');
        }

      } else if (this.contents.features.source) {
        // Features with particular Source
        this.viewer.features().each( (i, feature) => {
          if (feature.source == this.contents.features.source) {
            this._features.push(feature);
          }
        });
      } else if (this.contents.features.types) {
        // Features with paricular Type
        var featureTypes = new CGV.CGArray(this.contents.features.types);
        this.viewer.features().each( (i, feature) => {
          if (featureTypes.contains(feature.type)) {
            this._features.push(feature);
          }
        });
      }
    }

    extractFeaturesFromSequence() {
      var featureOptions = this.contents.features;
      var sequenceExtractor = this.viewer.sequence.sequenceExtractor;
      if (sequenceExtractor) {
        sequenceExtractor.generateFeatures(this, this.contents.features);
      }
      // if (featureOptions.sequence == 'start_stop_codons') {
      // } else if (options.sequence == 'orfs') {
      // }
      // setTimeout(() => {
      //   this._features = sequenceExtractor.extractFeatures(this.contents.features);
      //   this.updateFeatureSlots();
      //   this.viewer.drawFull();
      // }, 0);
    }

    // extractFeaturesTimeout() {
    //   var sequenceExtractor = this.viewer.sequence.sequenceExtractor;
    //   this._features = sequenceExtractor.extractFeatures(this.contents.features);
    //   this.updateFeatureSlots();
    //   this.veiwer.draw_full();
    // }

    updateSlots() {
      if (this.contentType == 'features') {
        this.updateFeatureSlots();
      } else if (this.contentType == 'plot') {
        this.updatePlotSlot();
      }
      this.layout._adjustProportions();
    }

    updateFeatureSlots() {
      this._slots = new CGV.CGArray();
      if (this.readingFrame == 'separated') {
        var features = this.sequence.featuresByReadingFrame(this.features());
        // Direct Reading Frames
        for (var rf of [1, 2, 3]) {
          var slot = new CGV.Slot(this, {strand: 'direct'});
          slot.replaceFeatures(features['rf_plus_' + rf]);
        }
        // Revers Reading Frames
        for (var rf of [1, 2, 3]) {
          var slot = new CGV.Slot(this, {strand: 'reverse'});
          slot.replaceFeatures(features['rf_minus_' + rf]);
        }
      } else {
        if (this.strand == 'separated') {
          var features = this.featuresByStrand();
          // Direct Slot
          var slot = new CGV.Slot(this, {strand: 'direct'});
          slot.replaceFeatures(features.direct)
          // Reverse Slot
          var slot = new CGV.Slot(this, {strand: 'reverse'});
          slot.replaceFeatures(features.reverse)
        } else if (this.strand == 'combined') {
          // Combined Slot
          var slot = new CGV.Slot(this, {strand: 'direct'});
          slot.replaceFeatures(this.features());

        }
      }
    }

    featuresByStrand() {
      var features = {};
      features.direct = new CGV.CGArray();
      features.reverse = new CGV.CGArray();
      this.features().each( (i, feature) => {
        if (feature.strand == -1) {
          features.reverse.push(feature);
        } else {
          features.direct.push(feature);
        }
      });
      return features
    }

    updatePlotSlot() {
      this._slots = new CGV.CGArray();
      var slot = new CGV.Slot(this, {type: 'plot'});
      slot._plot = this._plot;
    }

  }

  CGV.Track = Track;

})(CGView);
