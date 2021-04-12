//////////////////////////////////////////////////////////////////////////////
// Track
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {
  /**
   * <br />
   * The Track is used for layout information
   * @extends CGObject
   */
  class Track extends CGV.CGObject {

    /**
     * Create a new track.
     */
    constructor(viewer, data = {}, meta = {}) {
      super(viewer, data, meta);
      this.viewer = viewer;
      this._plot;
      this._features = new CGV.CGArray();
      this._slots = new CGV.CGArray();
      this.name = CGV.defaultFor(data.name, 'Unknown');
      this._contents = new CGV.TrackContents(this, data.contents);
      // this.readingFrame = CGV.defaultFor(data.readingFrame, 'combined');
      // this.strand = CGV.defaultFor(data.strand, 'separated');
      this.separateFeaturesBy = CGV.defaultFor(data.separateFeaturesBy, 'strand');
      this.position = CGV.defaultFor(data.position, 'both');
      // this.dataType = CGV.defaultFor(data.dataType, 'feature');
      // this.dataMethod = CGV.defaultFor(data.dataMethod, 'source');
      // this.dataKeys = data.dataKeys;
      // this.dataOptions = data.dataOptions || {};
      this._thicknessRatio = CGV.defaultFor(data.thicknessRatio, 1);
      this._loadProgress = 0;
      this.refresh();
    }

    /**
     * Return the class name as a string.
     * @return {String} - 'Track'
     */
    toString() {
      return 'Track';
    }

    /**
     * @member {Viewer} - Get the *Viewer*
     */
    get viewer() {
      return this._viewer;
    }

    set viewer(viewer) {
      if (this.viewer) {
        // TODO: Remove if already attached to Viewer
      }
      this._viewer = viewer;
      viewer._tracks.push(this);
    }


    set visible(value) {
      // super.visible = value;
      this._visible = value;
      if (this.layout) {
        this.layout._adjustProportions();
      }
    }

    get visible() {
      // return super.visible
      return this._visible;
    }

    /**
     * @member {String} - Alias for getting the name. Useful for querying CGArrays.
     */
    get id() {
      return this.name;
    }

    /**
     * @member {String} - Get or set the *name*.
     */
    get name() {
      return this._name;
    }

    set name(value) {
      this._name = value;
    }

    /** * @member {Viewer} - Get the *Layout*
     */
    get layout() {
      return this.viewer.layout;
    }

    // set layout(layout) {
    //   if (this.layout) {
    //     // TODO: Remove if already attached to layout
    //   }
    //   this._layout = layout;
    //   layout._tracks.push(this);
    // }

    /** * @member {Object} - Get the *Contents*.
     */
    get contents() {
      return this._contents;
    }

    /**
     * @member {String} - Get or set the *dataType*. Must be one of 'feature' or 'plot' [Default: 'feature']
     */
    get dataType() {
      return this._dataType;
    }

    set dataType(value) {
      if ( CGV.validate(value, ['feature', 'plot']) ) {
        this._dataType = value;
      }
    }

    /** * @member {String} - Alias for *dataType*.
     */
    get type() {
      // return this.dataType;
      return this.contents.type;
    }

    /**
     * @member {String} - Get or set the *dataMethod* attribute. *dataMethod* describes how the features/plot should be extracted.
     *    Options are 'source', 'type', or 'sequence' [Default: 'source']
     */
    get dataMethod() {
      return this._dataMethod;
    }

    set dataMethod(value) {
      if ( CGV.validate(value, ['source', 'type', 'sequence']) ) {
        this._dataMethod = value;
      }
    }

    /**
     * @member {String} - Get or set the *dataKeys* attribute. *dataKeys* describes which features/plot should be extracted. For example,
     *    if *dataMethod* is 'type', and *dataKeys* is 'CDS', then all features with a type of 'CDS' will be used to create the track.
     *    For *dataMethod* of 'sequence', the following values are possible for *dataKeys*: 'orfs', 'start-stop-codons', 'gc-content', 'gc-skew'.
     */
    get dataKeys() {
      return this._dataKeys;
    }

    set dataKeys(value) {
      this._dataKeys = (value === undefined) ? new CGV.CGArray() : new CGV.CGArray(value);
    }

    /** * @member {Object} - Get or set the *dataOptions*. The *dataOptions* are passed to the SequenceExtractor.
     */
    get dataOptions() {
      return this._dataOptions;
    }

    set dataOptions(value) {
      this._dataOptions = value;
    }


    /**
     * @member {String} - Get or set separateFeaturesBy. Possible values are 'none', 'strand', or 'readingFrame'.
     */
    get separateFeaturesBy() {
      return this._separateFeaturesBy;
    }

    set separateFeaturesBy(value) {
      if ( CGV.validate(value, ['none', 'strand', 'readingFrame']) ) {
        this._separateFeaturesBy = value;
        this.updateSlots();
      }
    }

    // /**
    //  * @member {String} - Get or set the readingFrame. Possible values are 'combined' or 'separated'.
    //  */
    // get readingFrame() {
    //   return this._readingFrame;
    // }
    //
    // set readingFrame(value) {
    //   if (CGV.validate(value, ['separated', 'combined'])) {
    //     this._readingFrame = value;
    //     this.updateSlots();
    //   }
    // }

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
     * @member {Plot} - Get the plot associated with this track
     */
    get plot() {
      return this._plot;
    }

    /**
     * @member {Number} - Get or set the load progress position (integer between 0 and 100)
     */
    get loadProgress() {
      return this._loadProgress;
    }

    set loadProgress(value) {
      this._loadProgress = value;
      // this.viewer.trigger('track-load-progress-changed', this);
    }

    /**
     * @member {Number} - Return the number of features or plot points contained in this track.
     */
    get itemCount() {
      if (this.type === 'plot') {
        return (this.plot) ? this.plot.length : 0;
      } else if (this.type === 'feature') {
        return this.features().length;
      } else {
        return 0;
      }
    }

    /**
     * @member {Viewer} - Get or set the track size as a ratio to all other tracks
     */
    get thicknessRatio() {
      return this._thicknessRatio;
    }

    set thicknessRatio(value) {
      this._thicknessRatio = Number(value);
      this.layout._adjustProportions();
    }

    update(attributes) {
      this.viewer.updateTracks(this, attributes);
    }

    remove() {
      this.viewer.removeTracks(this);
    }

    move(newIndex) {
      const currentIndex = this.viewer.tracks().indexOf(this);
      this.viewer.moveTrack(currentIndex, newIndex);
    }


    /**
     * Returns an [CGArray](CGArray.html) of Features or a single Feature from all the features in this track.
     * @param {Integer|String|Array} term - See [CGArray.get](CGArray.html#get) for details.
     * @return {CGArray}
     */
    features(term) {
      return this._features.get(term);
    }

    slots(term) {
      return this._slots.get(term);
    }

    /**
     * Returns an [CGArray](CGArray.html) of Features or a single Feature from all the unique features in this track.
     * Unique features are ones that only appear in this track.
     * @param {Integer|String|Array} term - See [CGArray.get](CGArray.html#get) for details.
     * @return {CGArray}
     */
    uniqueFeatures(term) {
      const features = new CGV.CGArray();
      for (let i = 0, len = this._features.length; i < len; i++) {
        if (this._features[i].tracks().length === 1) {
          features.push(this._features[i]);
        }
      }
      return features.get(term);
    }

    /**
     * Remove a feature or array of features from the track and slots.
     *
     * @param {Feature|Array} features - The Feature(s) to remove.
     */
    removeFeatures(features) {
      features = (features.toString() === 'CGArray') ? features : new CGV.CGArray(features);
      // this._features = new CGV.CGArray(
      //   this._features.filter( (f) => { return !features.includes(f) })
      // );
      this._features = this._features.filter( f => !features.includes(f) );
      this.slots().each( (i, slot) => {
        slot.removeFeatures(features);
      });
      this.viewer.trigger('track-update', this);
    }

    /**
     * Remove the plot from the track and slots.
     */
    removePlot() {
      this._plot = undefined;
      this.slots().each( (i, slot) => {
        slot.removePlot();
      });
      this.viewer.trigger('track-update', this);
    }

    refresh() {
      this._features = new CGV.CGArray();
      this._plot = undefined;
      if (this.contents.from === 'sequence') {
        this.extractFromSequence();
      } else if (this.type === 'feature') {
        this.updateFeatures();
      } else if (this.type === 'plot') {
        this.updatePlot();
      }
      this.updateSlots();
    }

    extractFromSequence() {
      const sequenceExtractor = this.viewer.sequence.sequenceExtractor;
      if (sequenceExtractor) {
        sequenceExtractor.extractTrackData(this, this.contents.extract[0], this.contents.options);
      } else {
        console.error('No sequence is available to extract features/plots from');
      }
    }

    updateFeatures() {
      if (this.contents.from === 'source' || this.contents.from === 'type') {
        this.viewer.features().each( (i, feature) => {
          if (this.contents.extract.includes(feature[this.contents.from]) && feature.contig.visible) {
            this._features.push(feature);
          }
        });
      }
    }

    updatePlot() {
      if (this.contents.from === 'source') {
        // Plot with particular Source
        this.viewer.plots().find( (plot) => {
          if (plot.source === this.contents.extract[0]) {
            this._plot = plot;
          }
        });
      }
    }

    updateSlots() {
      if (this.type === 'feature') {
        this.updateFeatureSlots();
      } else if (this.type === 'plot') {
        this.updatePlotSlot();
      }
      this.layout._adjustProportions();
      // this.viewer.trigger('track-update', this);
    }

    updateFeatureSlots() {
      this._slots = new CGV.CGArray();
      if (this.separateFeaturesBy === 'readingFrame') {
        const features = this.sequence.featuresByReadingFrame(this.features());
        // Direct Reading Frames
        for (const rf of [1, 2, 3]) {
          const slot = new CGV.Slot(this, {strand: 'direct'});
          slot.replaceFeatures(features[`rfPlus${rf}`]);
        }
        // Revers Reading Frames
        for (const rf of [1, 2, 3]) {
          const slot = new CGV.Slot(this, {strand: 'reverse'});
          slot.replaceFeatures(features[`rfMinus${rf}`]);
        }
      } else if (this.separateFeaturesBy === 'strand') {
        const features = this.featuresByStrand();
        // Direct Slot
        let slot = new CGV.Slot(this, {strand: 'direct'});
        slot.replaceFeatures(features.direct);
        // Reverse Slot
        slot = new CGV.Slot(this, {strand: 'reverse'});
        slot.replaceFeatures(features.reverse);
      } else {
        // Combined Slot
        const slot = new CGV.Slot(this, {strand: 'direct'});
        slot.replaceFeatures(this.features());
      }
    }
    // updateFeatureSlots() {
    //   this._slots = new CGV.CGArray();
    //   if (this.readingFrame === 'separated') {
    //     const features = this.sequence.featuresByReadingFrame(this.features());
    //     // Direct Reading Frames
    //     for (const rf of [1, 2, 3]) {
    //       const slot = new CGV.Slot(this, {strand: 'direct'});
    //       slot.replaceFeatures(features[`rfPlus${rf}`]);
    //     }
    //     // Revers Reading Frames
    //     for (const rf of [1, 2, 3]) {
    //       const slot = new CGV.Slot(this, {strand: 'reverse'});
    //       slot.replaceFeatures(features[`rfMinus${rf}`]);
    //     }
    //   } else {
    //     if (this.strand === 'separated') {
    //       const features = this.featuresByStrand();
    //       // Direct Slot
    //       let slot = new CGV.Slot(this, {strand: 'direct'});
    //       slot.replaceFeatures(features.direct);
    //       // Reverse Slot
    //       slot = new CGV.Slot(this, {strand: 'reverse'});
    //       slot.replaceFeatures(features.reverse);
    //     } else if (this.strand === 'combined') {
    //       // Combined Slot
    //       const slot = new CGV.Slot(this, {strand: 'direct'});
    //       slot.replaceFeatures(this.features());
    //     }
    //   }
    // }

    // FIXME: this should become simply (update)
    // update(attributes = {}) {
    //   this.viewer.updateTracks(this, attributes);
    // }
    triggerUpdate() {
      this.viewer.updateTracks(this);
    }

    featuresByStrand() {
      const features = {};
      features.direct = new CGV.CGArray();
      features.reverse = new CGV.CGArray();
      this.features().each( (i, feature) => {
        if (feature.strand === -1) {
          features.reverse.push(feature);
        } else {
          features.direct.push(feature);
        }
      });
      return features;
    }

    updatePlotSlot() {
      this._slots = new CGV.CGArray();
      const slot = new CGV.Slot(this, {type: 'plot'});
      slot._plot = this._plot;
    }

    highlight(color = '#FFB') {
      if (this.visible) {
        this.slots().each( (i, slot) => {
          slot.highlight(color);
        });
      }
    }


    toJSON(options = {}) {
      const json = {
        name: this.name,
        separateFeaturesBy: this.separateFeaturesBy,
        // readingFrame: this.readingFrame,
        // strand: this.strand,
        position: this.position,
        thicknessRatio: this.thicknessRatio,
        contents: this.contents.toJSON(options)
      };
      // Optionally add default values
      if (!this.visible || options.includeDefaults) {
        json.visible = this.visible;
      }
      // This could be a new Track specific toJSON option
      if (options.includeDefaults) {
        json.loadProgress = this.loadProgress;
      }
      return json;
    }

  }

  CGV.Track = Track;
})(CGView);
