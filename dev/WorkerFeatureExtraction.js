(function(CGV) {

  CGV.WorkerFeatureExtraction = function() {
    onmessage = function(e) {
      let progressState;
      let type = e.data.type;
      console.log('Starting ' + type);
      let featureDataArray = [];
      if (type === 'start-stop-codons') {
        progressState = { start: 0, stop: 50 };
        featureDataArray = extractStartStopCodons(1, e.data, progressState);
        progressState = { start: 50, stop: 100 };
        featureDataArray = featureDataArray.concat( extractStartStopCodons(-1, e.data, progressState) );
      } else if (type === 'orfs') {
        let featureDataArray = extractORFs(e.data);
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
      let progress = 0;
      let savedProgress = 0;
      let source = 'start-stop-codons';
      let seq = (strand === 1) ? options.seqString : reverseComplement(options.seqString);
      let startPattern = options.startPattern.toUpperCase().split(',').map( (s) => { return s.trim() }).join('|')
      let stopPattern = options.stopPattern.toUpperCase().split(',').map( (s) => { return s.trim() }).join('|')
      let totalPattern = startPattern + '|' + stopPattern;
      let startPatternArray = startPattern.split('|');
      let stopPatternArray = stopPattern.split('|');

      let re = new RegExp(totalPattern, 'g');
      let match, start, featureData, type;
      let seqLength = seq.length;
      let featureDataArray = [];

      while ( (match = re.exec(seq)) !== null) {
        start = (strand === 1) ? (match.index + 1) : (seqLength - match.index - match[0].length + 1);
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
        progress = Math.round( (strand === 1) ? (start / seqLength * 100) : ( (seqLength - start) / seqLength * 100) );
        savedProgress = postProgress(progress, savedProgress, progressState);

        re.lastIndex = match.index + 1;
      }
      return featureDataArray
    }

    postProgress = function(currentProgress, savedProgress, progressState = {}) {
      let progressStart = progressState.start || 0;
      let progressStop = progressState.stop || 100;
      let progressIncrement = progressState.increment || 1;
      let progressRange = progressStop - progressStart;
      if ( (currentProgress > savedProgress) && (currentProgress % progressIncrement === 0) ) {
        savedProgress = currentProgress;
        let messageProgress = progressStart + (progressRange * currentProgress / 100);
        if (messageProgress % progressIncrement === 0) {
          // console.log(messageProgress)
          postMessage({ messageType: 'progress', progress: messageProgress });
        }
      }
      return savedProgress
    }

    extractORFs = function(options) {
      let minORFLength = options.minORFLength;
      let seq = options.seqString;
      let seqLength = seq.length;
      let featureDataArray = [];
      let progressState = {start: 0, stop: 25};


      let codonDataArray = extractStartStopCodons(1, options, progressState);
      progressState = {start: 25, stop: 50};
      codonDataArray = codonDataArray.concat( extractStartStopCodons(-1, options, progressState) );
      let startFeatures = codonDataArray.filter( (f) => { return f.type === 'start-codon' });
      let stopFeatures = codonDataArray.filter( (f) => { return f.type === 'stop-codon' });

      let startsByRF = featuresByReadingFrame(startFeatures, seqLength);
      let stopsByRF = featuresByReadingFrame(stopFeatures, seqLength);

      progressState = {start: 50, stop: 75};
      featureDataArray =  orfsByStrand(1, startsByRF, stopsByRF, minORFLength, seqLength, progressState);
      progressState = {start: 75, stop: 100};
      featureDataArray = featureDataArray.concat( orfsByStrand(-1, startsByRF, stopsByRF, minORFLength, seqLength, progressState) );
      return featureDataArray
    }

    orfsByStrand = function(strand, startsByRF, stopsByRF, minORFLength, seqLength, progressState = {}) {
      let position, orfLength, range, starts, stops;
      let start, stop, stopIndex;
      let progress, savedProgress;
      let type = 'ORF';
      let source = 'orfs';
      let featureDataArray = [];
      let readingFrames = (strand === 1) ? ['rf_plus_1', 'rf_plus_2', 'rf_plus_3'] : ['rf_minus_1', 'rf_minus_2', 'rf_minus_3'];
      // for (let rf of readingFrames) {
      readingFrames.forEach( function(rf) {
        position = (strand === 1) ? 1 : seqLength;
        stopIndex = 0;
        starts = startsByRF[rf]; 
        stops = stopsByRF[rf];
        progressInitial = 33 * readingFrames.indexOf(rf);
        progress = 0;
        savedProgress = 0;
        if (strand === -1) {
          // Sort descending by start
          starts.sort( (a,b) => { return b.start - a.start }); 
          stops.sort( (a,b) => { return b.start - a.start });
        }
        for (let i = 0, len_i = starts.length; i < len_i; i++) {
          start = starts[i];
          progress = progressInitial + Math.round( i / len_i * 33);
          savedProgress = postProgress(progress, savedProgress, progressState);
          if ( (strand === 1) && (start.start < position) || (strand === -1) && (start.start > position) ) {
            continue;
          }
          for (let j = stopIndex, len_j = stopsByRF[rf].length; j < len_j; j++) {
            stop = stops[j];
            orfLength = (strand === 1) ? stop.stop - start.start : start.stop - stop.start;
            if (orfLength >= minORFLength) {
              position = (strand === 1) ? stop.stop : stop.start;

              featureData = {
                type: type,
                start: (strand === 1) ? start.start : stop.start,
                stop: (strand === 1) ? stop.stop : start.stop,
                strand: strand,
                source: source,
                extractedFromSequence: true
              }
              featureDataArray.push(featureData);

              // progress = Math.round(start / seqLength * 100);
              // if ( (progress > savedProgress) && (progress % progressIncrement === 0) ) {
              //   savedProgress = progress;
              //   postMessage({ messageType: 'progress', progress: progress });
              // }

              stopIndex = j;
              break;
            } else if (orfLength > 0) {
              position = (strand === 1) ? stop.stop : stop.start;
              stopIndex = j;
              break;
            }
          }
        }
      });
      return featureDataArray
    }

    reverseComplement = function(seq) {
      return complement( seq.split('').reverse().join('') );
    }

    complement = function(seq) {
      let compSeq = ''
      let char, compChar;
      for (let i = 0, len = seq.length; i < len; i++) {
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
      let featuresByRF = {
        rf_plus_1: [],
        rf_plus_2: [],
        rf_plus_3: [],
        rf_minus_1: [],
        rf_minus_2: [],
        rf_minus_3: []
      };
      let rf, feature;
      for (let i = 0, len = features.length; i < len; i++) {
        feature = features[i];
        if (feature.strand === -1) {
          rf = (seqLength - feature.stop + 1) % 3;
          if (rf === 0) { rf = 3; }
          featuresByRF['rf_minus_' + rf].push(feature);
        } else {
          rf = feature.start % 3;
          if (rf === 0) { rf = 3; }
          featuresByRF['rf_plus_' + rf].push(feature);
        }
      }
      return featuresByRF
    }

  }
})(CGView);

