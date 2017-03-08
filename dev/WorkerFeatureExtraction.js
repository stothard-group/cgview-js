(function(CGV) {

  CGV.WorkerFeatureExtraction = function() {
    onmessage = function(e) {
      var progressState;
      var type = e.data.type;
      console.log('Starting ' + type);
      var featureDataArray = [];
      if (type == 'start_stop_codons') {
        progressState = { startProgress: 0, finalProgress: 50 };
        featureDataArray = extractStartStopCodons(1, e.data, progressState);
        progressState = { startProgress: 50, finalProgress: 100 };
        featureDataArray = featureDataArray.concat( extractStartStopCodons(-1, e.data, progressState) );
      } else if (type == 'orfs') {
        var featureDataArray = extractORFs(e.data);
      }
      // Sort the features by start
      featureDataArray.sort( (a, b) => {
        return a.start - b.start
      });
      // Return results
      postMessage({ messageType: 'complete', featureDataArray: featureDataArray });
      console.log('Done ' + type);
    }
    onerror = function(e) {
      console.error('Oops. Problem with ' + e.data.type);
    }


    extractStartStopCodons = function(strand, options, progressState = {}) {
      var progress = 0;
      var savedProgress = 0;
      var progressIncrement = 1;
      var source = 'start-stop-codons';
      var seq = (strand == 1) ? options.seqString : reverseComplement(options.seqString);
      var startPattern = options.startPattern.toUpperCase().split(',').map( (s) => { return s.trim() }).join('|')
      var stopPattern = options.stopPattern.toUpperCase().split(',').map( (s) => { return s.trim() }).join('|')
      var totalPattern = startPattern + '|' + stopPattern;
      var startPatternArray = startPattern.split('|');
      var stopPatternArray = stopPattern.split('|');

      var re = new RegExp(totalPattern, 'g');
      var match, start, featureData, type;
      var seqLength = seq.length;
      var featureDataArray = [];

      while ( (match = re.exec(seq)) != null) {
        start = (strand == 1) ? (match.index + 1) : (seqLength - match.index - match[0].length + 1);
        if (startPatternArray.indexOf(match[0]) >= 0) {
          type = 'start-codon';
        } else if (stopPatternArray.indexOf(match[0]) >= 0) {
          type = 'stop-codon';
        }

        featureData = {
          type: type,
          start: start,
          stop: start + match[0].length - 1,
          strand: strand,
          source: source,
          extractedFromSequence: true
        }
        featureDataArray.push(featureData);

        // Progress
        progress = Math.round( (strand == 1) ? (start / seqLength * 100) : ( (seqLength - start) / seqLength * 100) );
        if ( (progress > savedProgress) && (progress % progressIncrement == 0) ) {
          savedProgress = progress;
          postProgress(progress, progressState);
        }

        re.lastIndex = match.index + 1;
      }
      return featureDataArray
    }

    postProgress = function(currentProgress, progressState = {}) {
      var startProgress = progressState.startProgress || 0;
      var finalProgress = progressState.finalProgress || 100;
      var progressRange = finalProgress - startProgress;
      var messageProgress = startProgress + (progressRange * currentProgress / 100);
      postMessage({ messageType: 'progress', progress: messageProgress });
      // console.log(messageProgress)
      // console.log(startProgress)
    }

    extractORFs = function(options) {
      var minORFLength = options.minORFLength;
      var seq = options.seqString;
      var seqLength = seq.length;
      var featureDataArray = [];
      var progressState = {startProgress: 0, finalProgress: 25};


      var codonDataArray = extractStartStopCodons(1, options, progressState);
      var progressState = {startProgress: 25, finalProgress: 50};
      codonDataArray = codonDataArray.concat( extractStartStopCodons(-1, options, progressState) );
      var startFeatures = codonDataArray.filter( (f) => { return f.type == 'start-codon' });
      var stopFeatures = codonDataArray.filter( (f) => { return f.type == 'stop-codon' });

      var progressState = {startProgress: 50, finalProgress: 75};
      var startsByRF = featuresByReadingFrame(startFeatures, seqLength, progressState);
      var progressState = {startProgress: 75, finalProgress: 100};
      var stopsByRF = featuresByReadingFrame(stopFeatures, seqLength, progressState);

      featureDataArray =  orfsByStrand(1, startsByRF, stopsByRF, minORFLength, seqLength);
      featureDataArray = featureDataArray.concat( orfsByStrand(-1, startsByRF, stopsByRF, minORFLength, seqLength) );
      return featureDataArray
    }

    orfsByStrand = function(strand, startsByRF, stopsByRF, minORFLength, seqLength, progressState = {}) {
      var progress = progressState.progress || 0;
      var savedProgress = progressState.progress || 0;
      var progressIncrement = progressState.increment || 1;

      var position, orfLength, range, starts, stops;
      var start, stop, stopIndex;
      var type = 'ORF';
      var source = 'orfs';
      var featureDataArray = [];
      var readingFrames = (strand == 1) ? ['rf_plus_1', 'rf_plus_2', 'rf_plus_3'] : ['rf_minus_1', 'rf_minus_2', 'rf_minus_3'];
      for (var rf of readingFrames) {
        position = (strand == 1) ? 1 : seqLength;
        stopIndex = 0;
        starts = startsByRF[rf]; 
        stops = stopsByRF[rf];
        if (strand == -1) {
          // Sort descending by start
          starts.sort( (a,b) => { return b.start - a.start }); 
          stops.sort( (a,b) => { return b.start - a.start });
        }
        for (var i = 0, len_i = starts.length; i < len_i; i++) {
          start = starts[i];
          if ( (strand == 1) && (start.start < position) || (strand == -1) && (start.start > position) ) {
            continue;
          }
          for (var j = stopIndex, len_j = stopsByRF[rf].length; j < len_j; j++) {
            stop = stops[j];
            orfLength = (strand == 1) ? stop.stop - start.start : start.stop - stop.start;
            if (orfLength >= minORFLength) {
              position = (strand == 1) ? stop.stop : stop.start;

              featureData = {
                type: type,
                start: (strand == 1) ? start.start : stop.start,
                stop: (strand == 1) ? stop.stop : start.stop,
                strand: strand,
                source: source,
                extractedFromSequence: true
              }
              featureDataArray.push(featureData);

              // progress = Math.round(start / seqLength * 100);
              // if ( (progress > savedProgress) && (progress % progressIncrement == 0) ) {
              //   savedProgress = progress;
              //   postMessage({ messageType: 'progress', progress: progress });
              // }

              stopIndex = j;
              break;
            } else if (orfLength > 0) {
              position = (strand == 1) ? stop.stop : stop.start;
              stopIndex = j;
              break;
            }
          }
        }
      }
      return featureDataArray
    }

    reverseComplement = function(seq) {
      return complement( seq.split('').reverse().join('') );
    }

    complement = function(seq) {
      var compSeq = ''
      var char, compChar;
      for (var i = 0, len = seq.length; i < len; i++) {
        char = seq.charAt(i);
        switch (char) {
          case 'A':
            compChar = 'T';
            break;
          case 'T':
            compChar = 'A';
            break;
          case 'G':
            compChar = 'C';
            break;
          case 'C':
            compChar = 'G';
        }
        compSeq = compSeq + compChar;
      }
      return compSeq
    }

    featuresByReadingFrame = function(features, seqLength) {
      var featuresByRF = {
        rf_plus_1: [],
        rf_plus_2: [],
        rf_plus_3: [],
        rf_minus_1: [],
        rf_minus_2: [],
        rf_minus_3: []
      };
      var rf, feature;
      for (var i = 0, len = features.length; i < len; i++) {
        feature = features[i];
        if (feature.strand == -1) {
          rf = (seqLength - feature.stop + 1) % 3;
          if (rf == 0) { rf = 3; }
          featuresByRF['rf_minus_' + rf].push(feature);
        } else {
          rf = feature.start % 3;
          if (rf == 0) { rf = 3; }
          featuresByRF['rf_plus_' + rf].push(feature);
        }
      }
      return featuresByRF
    }

  }
})(CGView);

