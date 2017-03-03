(function(CGV) {

  CGV.WorkerFeatureExtraction = function() {
    onmessage = function(e) {
      var type = e.data.type;
      console.log('Starting ' + type);
      if (type == 'start_stop_codons') {
        var featureDataArray = extractStartStopCodons(1, e.data);
        featureDataArray = featureDataArray.concat( extractStartStopCodons(-1, e.data) );
        postMessage({ messageType: 'complete', featureDataArray: featureDataArray });
      } else if (type == 'orfs') {
        var featureDataArray = extractORFs(e.data);
        postMessage({ messageType: 'complete', featureDataArray: featureDataArray });
      }
      console.log('Done ' + type);
    }
    onerror = function(e) {
      console.error('Oops. Problem with ' + e.data.type);
    }


    extractStartStopCodons = function(strand, options) {
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
        progress = Math.round(start / seqLength * 100);
        if ( (progress > savedProgress) && (progress % progressIncrement == 0) ) {
          savedProgress = progress;
          postMessage({ messageType: 'progress', progress: progress });
        }
        re.lastIndex = match.index + 1;
      }
      return featureDataArray
    }

    extractORFs = function(options) {
      var progress = 0;
      var savedProgress = 0;
      var progressIncrement = 1;
      var type = 'ORF';
      var source = 'orfs';
      var minORFLength = options.minORFLength;
      var seq = options.seqString;
      var seqLength = seq.length;
      var featureDataArray = [];

      var codonDataArray = extractStartStopCodons(1, options);
      codonDataArray = codonDataArray.concat( extractStartStopCodons(-1, options) );
      var startFeatures = codonDataArray.filter( (f) => { return f.type == 'start-codon' });
      var stopFeatures = codonDataArray.filter( (f) => { return f.type == 'stop-codon' });

      var startsByRF = featuresByReadingFrame(startFeatures, seqLength);
      var stopsByRF = featuresByReadingFrame(stopFeatures, seqLength);

      // Get forward ORFs
      var position, orfLength, range, readingFrames;
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

              featureData = {
                type: type,
                start: start.start,
                stop: stop.stop,
                strand: 1,
                source: source,
                extractedFromSequence: true
              }
              featureDataArray.push(featureData);

              progress = Math.round(start / seqLength * 100);
              if ( (progress > savedProgress) && (progress % progressIncrement == 0) ) {
                savedProgress = progress;
                postMessage({ messageType: 'progress', progress: progress });
              }

              stopIndex = j;
              break;
            } else if (orfLength > 0) {
              position = stop.stop;
              stopIndex = j;
              break;
            }
          }
        }
      }
      // Get reverse ORFs
      // readingFrames = ['rf_minus_1', 'rf_minus_2', 'rf_minus_3'];
      // for (var rf of readingFrames) {
      //   stopIndex = 0;
      //   position = seqLength;
      //   var startsByRFSorted = startsByRF[rf].order_by('start', true);
      //   var stopsByRFSorted = stopsByRF[rf].order_by('start', true);
      //   for (var i = 0, len_i = startsByRF[rf].length; i < len_i; i++) {
      //     start = startsByRF[rf][i];
      //     if (start.start > position) {
      //       continue;
      //     }
      //     for (var j = stopIndex, len_j = stopsByRF[rf].length; j < len_j; j++) {
      //       stop = stopsByRF[rf][j];
      //       orfLength = start.stop - stop.start;
      //       if (orfLength >= minORFLength) {
      //         position = stop.start;
      //         range = new CGV.CGRange(this.sequence, stop.start, start.stop);
      //         features.push( this.createFeature(range, type, -1, source ) );
      //         stopIndex = j;
      //         break;
      //       }
      //     }
      //   }
      // }

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

