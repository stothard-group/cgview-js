//////////////////////////////////////////////////////////////////////////////
// SequenceExtractor
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * The Extractor creates features or plots based on the sequence
   */
  class SequenceExtractor {

    /**
     * Create a Sequence Extractor
     *
     * @param {Viewer} sequence - The sequence to extract from.
     * @param {Object} options - Options and stuff
     */
    constructor(sequence, options = {}) {
      this.sequence = sequence;
      if (!sequence.seq) {
        throw('Sequence invalid. The sequence must be provided.')
      }
    }

    //////////////////////////////////////////////////////////////////////////
    // MEMBERS
    //////////////////////////////////////////////////////////////////////////

    /**
     * @member {Sequence} - Get or set the sequence.
     */

    get sequence() {
      return this._sequence
    }

    set sequence(value) {
      if (value) {
        this._sequence = value;
      }
    }

    /**
     * @member {String} - Get the seqeunce as a string
     */
    get seqString() {
      return this.sequence.seq
    }

    /**
     * @member {String} - Get the viewer
     */
    get viewer() {
      return this.sequence.viewer
    }

    /**
     * @member {Number} - Get the seqeunce length.
     */
    get length() {
      return this.sequence.length
    }

    //////////////////////////////////////////////////////////////////////////
    // METHODS
    //////////////////////////////////////////////////////////////////////////

    extractFeatures(options = {}) {
      var features = new CGV.CGArray();
      if (options.sequence == 'start_stop_codons') {
        features = this.extractStartStops(options);
      } else if (options.sequence == 'orfs') {
        features = this.extractORFs(options);
      }
      return features
    }

    extractORFs(options = {}) {
      var features = new CGV.CGArray();
      var type = 'ORF'
      var source = 'orfs'
      var minORFLength = CGV.defaultFor(options.minORFLength, 30)
      // Get start features by reading frame
      var startPattern = CGV.defaultFor(options.start, 'ATG')
      var startFeatures = this.createFeaturesFromPattern(startPattern, 'start-codon', 'start-stop-codons');
      var startsByRF = this.sequence.featuresByReadingFrame(startFeatures);
      // Get stop features by reading frame
      var stopPattern = CGV.defaultFor(options.stop, 'TAA,TAG,TGA');
      var stopFeatures = this.createFeaturesFromPattern(stopPattern, 'start-codon', 'start-stop-codons');
      var stopsByRF = this.sequence.featuresByReadingFrame(stopFeatures);
      // Get forward ORFs
      var position, strand, orfLength, range, readingFrames;
      readingFrames = ['rf_plus_1', 'rf_plus_2', 'rf_plus_3'];
      for (var rf of readingFrames) {
        position = 1;
        for (var start of startsByRF[rf]) {
          if (start.start < position) {
            continue;
          }
          for (var stop of stopsByRF[rf]) {
            orfLength = stop.stop - start.start;
            if (orfLength >= minORFLength) {
              position = stop.stop;
              range = new CGV.CGRange(this.sequence, start.start, stop.stop);
              features.push( this.createFeature(range, type, 1, source ) );
              break;
            }
          }
        }
      }
      // Get reverse ORFs
      readingFrames = ['rf_minus_1', 'rf_minus_2', 'rf_minus_3'];
      for (var rf of readingFrames) {
        position = this.sequence.length;
        var startsByRFSorted = startsByRF[rf].order_by('start', true);
        var stopsByRFSorted = stopsByRF[rf].order_by('start', true);
        for (var start of startsByRFSorted) {
          if (start.start > position) {
            continue;
          }
          for (var stop of stopsByRFSorted) {
            orfLength = start.stop - stop.start;
            if (orfLength >= minORFLength) {
              position = stop.start;
              range = new CGV.CGRange(this.sequence, stop.start, start.stop);
              features.push( this.createFeature(range, type, -1, source ) );
              break;
            }
          }
        }
      }
      return features
    }

    extractStartStops(options = {}) {
      var features = new CGV.CGArray();
      // Forward and Reverse Starts
      var startPattern = CGV.defaultFor(options.start, 'ATG')
      features.merge( this.createFeaturesFromPattern(startPattern, 'start-codon', 'start-stop-codons'))
      // Forward and Reverse Stops
      var stopPattern = CGV.defaultFor(options.stop, 'TAA,TAG,TGA');
      features.merge( this.createFeaturesFromPattern(stopPattern, 'stop-codon', 'start-stop-codons'))
      return features
    }

    createFeaturesFromPattern(pattern, type, source) {
      var features = new CGV.CGArray();
      pattern = pattern.toUpperCase().split(',').map( (s) => { return s.trim() }).join('|')
      for (var strand of [1, -1]) {
        var ranges = this.sequence.findPattern(pattern, strand)
        for (var i = 0, len = ranges.length; i < len; i++) {
          features.push( this.createFeature(ranges[i], type, strand, source ) );
        }
      }
      return features.order_by('start')
    }

    createFeature(range, type, strand, source) {
      var featureData = {
        type: type,
        start: range.start,
        stop: range.stop,
        strand: strand,
        source: source,
        extractedFromSequence: true
        // legend: ...
      }
      return new CGV.Feature(this.viewer, featureData)
    }

    extractPlot(options = {}) {
      if (options.sequence == 'gc_content') {
        return this.extractBaseContentPlot(options);
      // } else if (options.sequence == 'g') {
        // features = this.extractORFs(options);
      }
      // return features
    }

    // PLOTS should be bp: [1,23,30,45], score: [0, 0.4, 1]
    // score must be between 0 and 1
    extractBaseContentPlot(options) {
      // FIXME: create method to adjust window and step based on seq length (as default)
      var windowSize = CGV.defaultFor(options.window, 100);
      var step = CGV.defaultFor(options.step, 100);

      var bp = [];
      var scores = [];
      for (var i = windowSize/2, len = this.length; i < len; i += step) {

        // Extract DNA for window
        // Calculate score for window
        var range = new CGV.CGRange(this.sequence, i - windowSize/2, i + windowSize/2);

        var seq = this.sequence.forRange(range);
        var score = CGV.Sequence.calcGCContent(seq);
        bp.push(i);
        scores.push(score);
      }
      var data = { bp: bp, proportionOfThickness: scores };
      console.log(data)
      var plot = new CGV.ArcPlot(this.viewer, data);
      return plot
    }




  }

  CGV.SequenceExtractor = SequenceExtractor;

})(CGView);


