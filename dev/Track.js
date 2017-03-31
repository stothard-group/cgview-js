//////////////////////////////////////////////////////////////////////////////
// Track
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * The Track is used for layout information
   * @extends CGObject
   */
  class Track extends CGV.CGObject {

    /**
     * Create a new track.
     */
    constructor(layout, data = {}, meta = {}) {
      super(layout.viewer, data, meta);
      this.layout = layout;
      this._plot;
      this._features = new CGV.CGArray();
      this._slots = new CGV.CGArray();
      this.name = CGV.defaultFor(data.name, 'Unknown');
      this.readingFrame = CGV.defaultFor(data.readingFrame, 'combined');
      this.strand = CGV.defaultFor(data.strand, 'separated');
      this.position = CGV.defaultFor(data.position, 'both');
      this.contents = data.contents || {};
      this.loadProgress = 0;
      this.refresh();
    }

    /**
     * Return the class name as a string.
     * @return {String} - 'Track'
     */
    toString() {
      return 'Track';
    }

    set visible(value) {
      super.visible = value;
      if (this.layout) {
        this.layout._adjustProportions();
      }
    }

    get visible() {
      return super.visible
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
    }

    /** * @member {String} - Get the *Content Type*.
     */
    get type() {
      return this.contents && this.contents.type
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
        this.updateSlots();
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

    slots(term) {
      return this._slots.get(term)
    }

    refresh() {
      this._features = new CGV.CGArray();
      this._plot = undefined;
      if (this.contents.from == 'sequence') {
        this.extractFromSequence();
      } else if (this.type == 'feature') {
        this.updateFeatures();
      } else if (this.type == 'plot') {
        this.updatePlot();
      }
      this.updateSlots();
    }

    extractFromSequence() {
      var sequenceExtractor = this.viewer.sequence.sequenceExtractor;
      if (sequenceExtractor) {
        sequenceExtractor.extractTrackData(this, this.contents.extract, this.contents.options);
      } else {
        console.error('No sequence is available to extract features/plots from');
      }
    }

    updateFeatures() {
      if (this.contents.from == 'source') {
        // Features with particular Source
        this.viewer.features().each( (i, feature) => {
          if (feature.source == this.contents.extract) {
            this._features.push(feature);
          }
        });
      } else if (this.contents.types) {
        // Features with particular Type
        var featureTypes = new CGV.CGArray(this.contents.featureType);
        this.viewer.features().each( (i, feature) => {
          if (featureTypes.contains(feature.type)) {
            this._features.push(feature);
          }
        });
      }
    }

    updatePlot() {
      if (this.contents.from == 'source') {
        // Plot with particular Source
        this.viewer.plots().find( (plot) => {
          if (plot.source == this.contents.extract) {
            this._plot = plot;
          }
        });
      }
    }

    updateSlots() {
      if (this.type == 'feature') {
        this.updateFeatureSlots();
      } else if (this.type == 'plot') {
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

    highlight(color='#FFFF55') {
      if (this.visible) {
        this.slots().each( (i, slot) => {
          slot.highlight(color);
        });
      }
    }

  }

  CGV.Track = Track;

})(CGView);
