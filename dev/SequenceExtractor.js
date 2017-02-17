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
        return this.extractBaseContentPlot('gc_content', options);
      // } else if (options.sequence == 'g') {
        // features = this.extractORFs(options);
      }
      // return features
    }

    // PLOTS should be bp: [1,23,30,45], score: [0, 0.4, 1]
    // score must be between 0 and 1
    extractBaseContentPlot(type, options) {
      if (!CGV.validate(type, ['gc_content'])) { return }
      // FIXME: create method to adjust window and step based on seq length (as default)
      var windowSize = CGV.defaultFor(options.window, 100);
      var step = CGV.defaultFor(options.step, 100);
      var deviation = CGV.defaultFor(options.deviation, 'scale'); // 'scale' or 'average'
      // var deviation = CGV.defaultFor(options.deviation, 'average'); // 'scale' or 'average'

      var baseContent = this.calculateBaseContent(type, options);
      var positions = [];
      var position;

      // The current position marks the middle of the calculated window.
      // Adjust the bp position to mark where the plot changes,
      // NOT the center point of the window.
      // i.e. half way between the current position and the last
      for (var i = 0, len = baseContent.positions.length; i < len; i++) {
        position = baseContent.positions[i];
        if (i == 0) {
          positions.push(1);
        } else {
          positions.push(position - step/2);
        }
      }
      var data = { positions: positions, scores: baseContent.scores, baseline: baseContent.average };
      var plot = new CGV.ArcPlot(this.viewer, data);
      return plot
    }

    calculateBaseContent(type, options) {
      var windowSize = CGV.defaultFor(options.window, 100);
      var step = CGV.defaultFor(options.step, 10);
      var deviation = CGV.defaultFor(options.deviation, 'scale'); // 'scale' or 'average'
      // var deviation = CGV.defaultFor(options.deviation, 'average'); // 'scale' or 'average'

      var positions = [];
      var scores = [];
      var average =  CGV.Sequence.baseCalculation(type, this.seqString);
      // Starting points for min and max
      var min = 1;
      var max = 0;
      var halfWindowSize = windowSize / 2;
      var start, stop;

      // FIXME: not set up for linear sequences
      // position marks the middle of the calculated window
      for (var position = 1, len = this.length; position < len; position += step) {
        // Extract DNA for window and calculate score
        start = this.sequence.subtractBp(position, halfWindowSize);
        stop = this.sequence.addBp(position, halfWindowSize);
        var range = new CGV.CGRange(this.sequence, start, stop);
        var seq = this.sequence.forRange(range);
        var score = CGV.Sequence.baseCalculation(type, seq);

        if (score > max) {
          max = score;
        }
        if (score < min) {
          min = score;
        }

        positions.push(position);
        scores.push(score);
      }

      // Adjust scores if scaled
      // Min value becomes 0
      // Max value becomes 1
      // Average becomes 0.5
      if (deviation == 'scale') {
        scores = scores.map( (score) => {
          if (score >= average) {
            return CGV.scaleValue(score, {min: average, max: max}, {min: 0.5, max: 1});
          } else {
            return CGV.scaleValue(score, {min: min, max: average}, {min: 0, max: 0.5});
          }
        });
        min = 0;
        max = 1;
        average = 0.5;
      }
      return { positions: positions, scores: scores, min: min, max: max, average: average }
    }



  }

  CGV.SequenceExtractor = SequenceExtractor;

})(CGView);


