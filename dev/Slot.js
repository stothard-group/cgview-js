//////////////////////////////////////////////////////////////////////////////
// Slot
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * The Slot is used for layout information
   */
  class Slot {

    /**
     * Create a new slot.
     */
    constructor(layout, data = {}, display = {}, meta = {}) {
      this.layout = layout;
      this._arcPlot;
      this._features = new CGV.CGArray();
      this._tracks = new CGV.CGArray();
      this.readingFrame = CGV.defaultFor(data.readingFrame, 'combined')
      this.strand = CGV.defaultFor(data.strand, 'separated')
      this.position = CGV.defaultFor(data.position, 'both')
      this.contents = data.contents
      this.refresh();
    }

    /** * @member {Viewer} - Get or set the *Viewer*
     */
    get viewer() {
      return this.layout.viewer
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
      layout._slots.push(this);
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
        this.updateTracks();
      }
    }

    /**
     * @member {String} - Get or set the readingFrame. Possible values are 'combinded' or 'separated'.
     */
    get readingFrame() {
      return this._readingFrame;
    }

    set readingFrame(value) {
      if (CGV.validate(value, ['separated', 'combined'])) {
        this._readingFrame = value;
        this.updateTracks();
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

    features(term) {
      return this._features.get(term)
    }

    refresh() {
      if (this.contentType == 'features') {
        this.updateFeatures();
      } else if (this.contentType == 'plot') {
        this.updatePlot();
      }
      this.updateTracks();
    }

    updatePlot() {
      if (this.contents.plot.sequence) {
        var sequenceExtractor = this.viewer.sequence.sequenceExtractor;
        if (sequenceExtractor) {
          this._arcPlot = sequenceExtractor.extractPlot(this.contents.plot);
        }
      }

    }

    updateFeatures() {
      this._features = new CGV.CGArray();
      if (this.contents.features.sequence) {
        // Features extracted from the  Sequence
        var sequenceExtractor = this.viewer.sequence.sequenceExtractor;
        if (sequenceExtractor) {
          this._features.merge(sequenceExtractor.extractFeatures(this.contents.features));
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

    updateTracks() {
      if (this.contentType == 'features') {
        this.updateFeatureTracks();
      } else if (this.contentType == 'plot') {
        this.updatePlotTrack();
      }
    }

    updateFeatureTracks() {
      this._tracks = new CGV.CGArray();
      if (this.readingFrame == 'separated') {
        // var features = this.featuresByReadingFrame();
        var features = this.sequence.featuresByReadingFrame(this.features());
        // Direct Reading Frames
        for (var rf of [1, 2, 3]) {
          var track = new CGV.Track(this, {strand: 'direct'});
          track.replaceFeatures(features['rf_plus_' + rf]);
        }
        // Revers Reading Frames
        for (var rf of [1, 2, 3]) {
          var track = new CGV.Track(this, {strand: 'reverse'});
          track.replaceFeatures(features['rf_minus_' + rf]);
        }
      } else {
        if (this.strand == 'separated') {
          var features = this.featuresByStrand();
          // Direct Track
          var track = new CGV.Track(this, {strand: 'direct'});
          track.replaceFeatures(features.direct)
          // Reverse Track
          var track = new CGV.Track(this, {strand: 'reverse'});
          track.replaceFeatures(features.reverse)
        } else if (this.strand == 'combined') {
          // Combined Track
          var track = new CGV.Track(this, {strand: 'direct'});
          track.replaceFeatures(this.features());

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

    updatePlotTrack() {
      this._tracks = new CGV.CGArray();
      var track = new CGV.Track(this, {type: 'plot'});
      track._arcPlot = this._arcPlot;
    }


  }

  CGV.Slot = Slot;

})(CGView);
