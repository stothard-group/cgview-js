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
      }
      console.log(features)
      return features
    }

    extractStartStops(options = {}) {
      var features = new CGV.CGArray();
      var starts = CGV.defaultFor(options.start, 'ATG')
      starts = starts.toUpperCase().split(',').map( (s) => { return s.trim() }).join('|')
      console.log(starts)
      var ranges = this.sequence.findPattern(starts)
      var featureData
      for (var i = 0, len = ranges.length; i < len; i++) {
        var range = ranges[i];
        featureData = {
          type: 'start-codon',
          start: range.start,
          stop: range.stop,
          strand: '1',
          source: 'start-stop-codons',
          extractedFromSequence: true
          // legend: ...
        }
        features.push( new CGV.Feature(this.viewer, featureData) );
      }
      return features
    }




  }

  CGV.SequenceExtractor = SequenceExtractor;

})(CGView);


