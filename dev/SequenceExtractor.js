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

    // generateFeatures(track, options) {
    //   if (options.sequence == 'start_stop_codons') {
    //     features = this.generateStartStops(options);
    //   } else if (options.sequence == 'orfs') {
    //     features = this.extractORFs(options);
    //   }
    // }
    //

    generateFeatures(track, options) {
      if (!CGV.validate(options.sequence, ['start_stop_codons', 'orfs'])) { return }
      var startTime = new Date().getTime();
      var type = options.sequence;
      var viewer = this.viewer;
      // Start worker
      var url = this.fn2workerURL(CGV.WorkerFeatureExtraction);
      var worker = new Worker(url);
      // Prepare message
      var message = {};
      message.type = type;
      message.startPattern = CGV.defaultFor(options.start, 'ATG');
      message.stopPattern = CGV.defaultFor(options.stop, 'TAA,TAG,TGA');
      message.seqString = this.seqString;
      message.minORFLength = CGV.defaultFor(options.minORFLength, 100);
      worker.postMessage(message);
      worker.onmessage = (e) => {
        var messageType = e.data.messageType;
        if (messageType == 'progress') {
          track.loadProgress = e.data.progress;
          viewer.layout.drawProgress();
        }
        if (messageType == 'complete') {
          track.loadProgress = 100;
          var featureDataArray = e.data.featureDataArray;
          console.log("Features '" + type + "' Worker Time: " + CGV.elapsed_time(startTime) );
          var features = new CGV.CGArray();
          startTime = new Date().getTime();
          var featureData;
          var legends = this.createLegendItems(type);
          var featureType = this.getFeatureType(type); // this will create the feature type
          console.log(type)
          for (var i = 0, len = featureDataArray.length; i < len; i++) {
            featureData = featureDataArray[i];
            featureData.legend = legends[featureData.type];
            features.push( new CGV.Feature(viewer, featureData) );
          }
          console.log("Features '" + type + "' Creation Time: " + CGV.elapsed_time(startTime) );
          startTime = new Date().getTime();
          track._features = features;
          track.updateSlots();
          console.log("Features '" + type + "' Update Time: " + CGV.elapsed_time(startTime) );
          viewer.drawFull();
        }
      }

      worker.onerror = (e) => {
        // do stuff
      }

    }

    createLegendItems(type) {
      var legends = {};
      if (type == 'orfs') {
        legends = {
          'ORF': this.getLegendItem('ORF')
        }
      } else if (type == 'start_stop_codons') {
        legends = {
          'start-codon': this.getLegendItem('start-codon'),
          'stop-codon': this.getLegendItem('stop-codon')
        }
      }
      return legends
    }

    extractORFs(options = {}) {
      this.viewer.flash('Finding ORFs...');
      var startTime = new Date().getTime();
      var features = new CGV.CGArray();
      var type = 'ORF'
      var source = 'orfs'
      var minORFLength = CGV.defaultFor(options.minORFLength, 100)
      // Get start features by reading frame
      var startPattern = CGV.defaultFor(options.start, 'ATG')
      var startFeatures = this.createFeaturesFromPattern(startPattern, 'start-codon', 'start-stop-codons');
      var startsByRF = this.sequence.featuresByReadingFrame(startFeatures);
      // Get stop features by reading frame
      var stopPattern = CGV.defaultFor(options.stop, 'TAA,TAG,TGA');
      var stopFeatures = this.createFeaturesFromPattern(stopPattern, 'start-codon', 'start-stop-codons');
      var stopsByRF = this.sequence.featuresByReadingFrame(stopFeatures);
      // Get forward ORFs
      var position,  orfLength, range, readingFrames;
      readingFrames = ['rf_plus_1', 'rf_plus_2', 'rf_plus_3'];
      var start, stop, stopIndex;
      for (var rf of readingFrames) {
        position = 1;
        stopIndex = 0;
        for (var i = 0, len_i = startsByRF[rf].length; i < len_i; i++) {
          start = startsByRF[rf][i];
          if (start.start < position) {
            continue;
          }
          for (var j = stopIndex, len_j = stopsByRF[rf].length; j < len_j; j++) {
            stop = stopsByRF[rf][j];
            orfLength = stop.stop - start.start;
            if (orfLength >= minORFLength) {
              position = stop.stop;
              range = new CGV.CGRange(this.sequence, start.start, stop.stop);
              features.push( this.createFeature(range, type, 1, source ) );
              stopIndex = j;
              break;
            }
          }
        }
      }
      // Get reverse ORFs
      readingFrames = ['rf_minus_1', 'rf_minus_2', 'rf_minus_3'];
      for (var rf of readingFrames) {
        stopIndex = 0;
        position = this.sequence.length;
        var startsByRFSorted = startsByRF[rf].order_by('start', true);
        var stopsByRFSorted = stopsByRF[rf].order_by('start', true);
        for (var i = 0, len_i = startsByRF[rf].length; i < len_i; i++) {
          start = startsByRF[rf][i];
          if (start.start > position) {
            continue;
          }
          for (var j = stopIndex, len_j = stopsByRF[rf].length; j < len_j; j++) {
            stop = stopsByRF[rf][j];
            orfLength = start.stop - stop.start;
            if (orfLength >= minORFLength) {
              position = stop.start;
              range = new CGV.CGRange(this.sequence, stop.start, start.stop);
              features.push( this.createFeature(range, type, -1, source ) );
              stopIndex = j;
              break;
            }
          }
        }
      }
      console.log('ORF Extraction Time: ' + CGV.elapsed_time(startTime) );
      return features
    }

    extractStartStops(options = {}) {
      this.viewer.flash('Finding Start/Stop Codons...');
      var startTime = new Date().getTime();
      // Forward and Reverse Starts
      var startPattern = CGV.defaultFor(options.start, 'ATG')
      var features = this.createFeaturesFromPattern(startPattern, 'start-codon', 'start-stop-codons');
      // Forward and Reverse Stops
      var stopPattern = CGV.defaultFor(options.stop, 'TAA,TAG,TGA');
      features.merge( this.createFeaturesFromPattern(stopPattern, 'stop-codon', 'start-stop-codons'))
      console.log('Start/Stop Extraction Time: ' + CGV.elapsed_time(startTime) );
      return features
    }

    createFeaturesFromPattern(pattern, type, source) {
      var features = new CGV.CGArray();
      pattern = pattern.toUpperCase().split(',').map( (s) => { return s.trim() }).join('|')
      for (var strand of [1, -1]) {
        // var startTime = new Date().getTime();
        var ranges = this.sequence.findPattern(pattern, strand)
        // console.log("Find Pattern '" + pattern + "' Strand " + strand + " Time: " + CGV.elapsed_time(startTime) );
        // var startTime = new Date().getTime();
        for (var i = 0, len = ranges.length; i < len; i++) {
          features.push( this.createFeature(ranges[i], type, strand, source ) );
        }
        // console.log("Features for Pattern '" + pattern + "' Strand " + strand + " Time: " + CGV.elapsed_time(startTime) );
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
      }
      featureData.legend = this.getLegendItem(type).text;
      return new CGV.Feature(this.viewer, featureData)
    }

    getFeatureType(type) {
      var viewer = this.viewer;
      var featureType;
      switch (type) {
        case 'start_stop_codons':
          featureType = viewer.findFeatureTypeOrCreate('Codon', 'arc');
          break;
        case 'orfs':
          featureType = viewer.findFeatureTypeOrCreate('ORF', 'arrow');
          break;
        default:
          featureType = viewer.findFeatureTypeOrCreate('Unknown', 'arc');
      }
      return featureType 
    }

    getLegendItem(type, sign) {
      var legend = this.viewer.legend;
      var item;
      switch (type) {
        case 'start-codon':
          item = legend.findLegendItemOrCreate('Start', 'blue');
          break;
        case 'stop-codon':
          item = legend.findLegendItemOrCreate('Stop', 'red');
          break;
        case 'ORF':
          item = legend.findLegendItemOrCreate('ORF', 'green');
          break;
        case 'gc_content':
          item = legend.findLegendItemOrCreate('GC Content', 'black');
          break;
        case 'gc_skew':
          var color = (sign == '+') ? 'rgb(0,153,0)' : 'rgb(153,0,153)';
          var name = (sign == '+') ? 'GC Skew+' : 'GC Skew-';
          item = legend.findLegendItemOrCreate(name, color);
          break;
        default:
          item = legend.findLegendItemOrCreate('Unknown', 'grey');
      }
      return item 
    }


    fn2workerURL(fn) {
      var blob = new Blob(['('+fn.toString()+')()'], {type: 'application/javascript'})
      return URL.createObjectURL(blob)
    }


    generatePlot(track, options = {}) {
      if (!CGV.validate(options.sequence, ['gc_content', 'gc_skew'])) { return }
      var startTime = new Date().getTime();
      var type = options.sequence;
      var viewer = this.viewer;
      // Start worker
      var url = this.fn2workerURL(CGV.WorkerBaseContent);
      var worker = new Worker(url);
      // Prepare message
      var message = {};
      message.type = type;
      message.window = CGV.defaultFor(options.window, this.getWindowStep().window);
      var step = CGV.defaultFor(options.step, this.getWindowStep().step);
      message.step = step
      message.deviation = CGV.defaultFor(options.deviation, 'scale'); // 'scale' or 'average'
      message.seqString = this.seqString;
      worker.postMessage(message);
      worker.onmessage = (e) => {
        var messageType = e.data.messageType;
        if (messageType == 'progress') {
          track.loadProgress = e.data.progress;
          viewer.layout.drawProgress();
        }
        if (messageType == 'complete') {
          var baseContent = e.data.baseContent;
          var data = { positions: baseContent.positions, scores: baseContent.scores, baseline: baseContent.average };
          data.legendPositive = this.getLegendItem(type, '+').text;
          data.legendNegative = this.getLegendItem(type, '-').text;

          var plot = new CGV.Plot(viewer, data);
          track._plot = plot;
          track.updateSlots();
          console.log("Plot '" + type + "' Worker Time: " + CGV.elapsed_time(startTime) );
          viewer.drawFull();
        }
      }

      worker.onerror = (e) => {
        // do stuff
      }

    }

    // extractPlot(options = {}) {
    //   if (options.sequence == 'gc_content') {
    //     return this.extractBaseContentPlot('gc_content', options);
    //   } else if (options.sequence == 'gc_skew') {
    //     return this.extractBaseContentPlot('gc_skew', options);
    //   }
    // }
    //
    // // PLOTS should be bp: [1,23,30,45], score: [0, 0.4, 1]
    // // score must be between 0 and 1
    // extractBaseContentPlot(type, options = {}) {
    //   var startTime = new Date().getTime();
    //   if (!CGV.validate(type, ['gc_content', 'gc_skew'])) { return }
    //   this.viewer.flash("Creating '" + type + "' Plot...");
    //
    //
    //   options.window = CGV.defaultFor(options.window, this.getWindowStep().window);
    //   options.step = CGV.defaultFor(options.step, this.getWindowStep().step);
    //   var step = options.step
    //   var deviation = CGV.defaultFor(options.deviation, 'scale'); // 'scale' or 'average'
    //   // var deviation = CGV.defaultFor(options.deviation, 'average'); // 'scale' or 'average'
    //
    //   var baseContent = this.calculateBaseContent(type, options);
    //   var positions = [];
    //   var position;
    //
    //   // The current position marks the middle of the calculated window.
    //   // Adjust the bp position to mark where the plot changes,
    //   // NOT the center point of the window.
    //   // i.e. half way between the current position and the last
    //   for (var i = 0, len = baseContent.positions.length; i < len; i++) {
    //     position = baseContent.positions[i];
    //     if (i == 0) {
    //       positions.push(1);
    //     } else {
    //       positions.push(position - step/2);
    //     }
    //   }
    //   var data = { positions: positions, scores: baseContent.scores, baseline: baseContent.average };
    //   data.legendPositive = this.getLegendItem(type, '+').text;
    //   data.legendNegative = this.getLegendItem(type, '-').text;
    //
    //   var plot = new CGV.Plot(this.viewer, data);
    //   console.log("Plot '" + type + "' Extraction Time: " + CGV.elapsed_time(startTime) );
    //   return plot
    // }


    // calculateBaseContent(type, options) {
    //   var windowSize = CGV.defaultFor(options.window, this.getWindowStep().window);
    //   var step = CGV.defaultFor(options.step, this.getWindowStep().step);
    //   var deviation = CGV.defaultFor(options.deviation, 'scale'); // 'scale' or 'average'
    //   // var deviation = CGV.defaultFor(options.deviation, 'average'); // 'scale' or 'average'
    //
    //   var positions = [];
    //   var scores = [];
    //   var average =  CGV.Sequence.baseCalculation(type, this.seqString);
    //   // Starting points for min and max
    //   var min = 1;
    //   var max = 0;
    //   var halfWindowSize = windowSize / 2;
    //   var start, stop;
    //
    //   // FIXME: not set up for linear sequences
    //   // position marks the middle of the calculated window
    //   for (var position = 1, len = this.length; position < len; position += step) {
    //     // Extract DNA for window and calculate score
    //     start = this.sequence.subtractBp(position, halfWindowSize);
    //     stop = this.sequence.addBp(position, halfWindowSize);
    //     var range = new CGV.CGRange(this.sequence, start, stop);
    //     var seq = this.sequence.forRange(range);
    //     var score = CGV.Sequence.baseCalculation(type, seq);
    //
    //     if (score > max) {
    //       max = score;
    //     }
    //     if (score < min) {
    //       min = score;
    //     }
    //
    //     positions.push(position);
    //     scores.push(score);
    //   }
    //
    //   // Adjust scores if scaled
    //   // Min value becomes 0
    //   // Max value becomes 1
    //   // Average becomes 0.5
    //   if (deviation == 'scale') {
    //     scores = scores.map( (score) => {
    //       if (score >= average) {
    //         return CGV.scaleValue(score, {min: average, max: max}, {min: 0.5, max: 1});
    //       } else {
    //         return CGV.scaleValue(score, {min: min, max: average}, {min: 0, max: 0.5});
    //       }
    //     });
    //     min = 0;
    //     max = 1;
    //     average = 0.5;
    //   }
    //   return { positions: positions, scores: scores, min: min, max: max, average: average }
    // }


    getWindowStep() {
      var windowSize, step;
      var length = this.length;
      if (length < 1e3 ) {
        windowSize = 10;
        step = 1;
      } else if (length < 1e4) {
        windowSize = 50;
        step = 1;
      } else if (length < 1e5) {
        windowSize = 500;
        step = 1;
      } else if (length < 1e6) {
        windowSize = 1000;
        step = 10;
      } else if (length < 1e7) {
        windowSize = 10000;
        step = 100;
      }
      return { step: step, window: windowSize }
    }


  }

  CGV.SequenceExtractor = SequenceExtractor;

})(CGView);


