(function(CGV) {

  CGV.WorkerBaseContent = function() {
    onmessage = function(e) {
      console.log('Starting ' + e.data.type);
      calculateBaseContent(e.data);
      console.log('Done ' + e.data.type);

    }
    onerror = function(e) {
      console.error('Oops. Problem with ' + e.data.type);
    }

    calculateBaseContent = function(options) {
      var progress = 0;
      var savedProgress = 0;
      var progressIncrement = 1;
      var positions = [];
      var scores = [];
      var type = options.type;
      var seq = options.seqString;
      var windowSize = options.window;
      var step = options.step;
      var deviation = options.deviation;
      var average = baseCalculation(type, seq);
      // Starting points for min and max
      var min = 1;
      var max = 0;
      var halfWindowSize = windowSize / 2;
      var start, stop;

      // Position marks the middle of the calculated window
      for (var position = 1, len = seq.length; position < len; position += step) {
        // Extract DNA for window and calculate score
        start = subtractBp(seq, position, halfWindowSize);
        stop = addBp(seq, position, halfWindowSize);
        var subSeq = subSequence(seq, start, stop);
        var score = baseCalculation(type, subSeq);

        if (score > max) {
          max = score;
        }
        if (score < min) {
          min = score;
        }

        // The current position marks the middle of the calculated window.
        // Adjust the bp position to mark where the plot changes,
        // NOT the center point of the window.
        // i.e. half way between the current position and the last
        if (position === 1) {
          positions.push(1);
        } else {
          positions.push(position - step/2);
        }
        // positions.push(position);

        scores.push(score);
        progress = Math.round(position / len * 100);
        if ( (progress > savedProgress) && (progress % progressIncrement === 0) ) {
          savedProgress = progress;
          postMessage({ messageType: 'progress', progress: progress });
        }
      }

      // Adjust scores if scaled
      // Min value becomes 0
      // Max value becomes 1
      // Average becomes 0.5
      if (deviation === 'scale') {
        scores = scores.map( (score) => {
          if (score >= average) {
            return scaleValue(score, {min: average, max: max}, {min: 0.5, max: 1});
          } else {
            return scaleValue(score, {min: min, max: average}, {min: 0, max: 0.5});
          }
        });
        min = 0;
        max = 1;
        average = 0.5;
      }
      var baseContent = { positions: positions, scores: scores, min: min, max: max, average: average }
      postMessage({ messageType: 'complete', baseContent: baseContent });
    }

    baseCalculation = function(type, seq) {
      if (type === 'gc-content') {
        return calcGCContent(seq);
      } else if (type === 'gc-skew') {
        return calcGCSkew(seq);
      }
    }

    calcGCContent = function(seq) {
      if (seq.length === 0) { return  0.5 }
      var g = count(seq, 'g');
      var c = count(seq, 'c');
      return ( (g + c) / seq.length )
    }

    calcGCSkew = function(seq) {
      var g = count(seq, 'g');
      var c = count(seq, 'c');
      if ( (g + c) === 0 ) { return 0.5 }
      // Gives value between -1 and 1
      var value = (g - c) / (g + c);
      // Scale to a value between 0 and 1
      return  0.5 + (value / 2);
    }

    count = function(seq, pattern) {
      return (seq.match(new RegExp(pattern, 'gi')) || []).length
    }

    /**
     * Subtract *bpToSubtract* from *position*, taking into account the sequence length
     * @param {Number} position - position (in bp) to subtract from
     * @param {Number} bpToSubtract - number of bp to subtract
     */
    subtractBp = function(seq, position, bpToSubtract) {
      if (bpToSubtract < position) {
        return position - bpToSubtract
      } else {
        return seq.length + position - bpToSubtract
      }
    }

    /**
     * Add *bpToAdd* to *position*, taking into account the sequence length
     * @param {Number} position - position (in bp) to add to
     * @param {Number} bpToAdd - number of bp to add
     */
    addBp = function(seq, position, bpToAdd) {
      if (seq.length >= (bpToAdd + position)) {
        return bpToAdd + position
      } else {
        return position - seq.length + bpToAdd
      }
    }

    subSequence = function(seq, start, stop) {
      var subSeq;
      if (stop < start) {
        subSeq = seq.substr(start - 1) + seq.substr(0, stop);
      } else {
        subSeq = seq.substr(start - 1, (stop - start));
      }
      return subSeq
    }

    /**
     * This function scales a value from the *from* range to the *to* range.
     * To scale from [min,max] to [a,b]:
     *
     *                 (b-a)(x - min)
     *          f(x) = --------------  + a
     *                   max - min
     */
    scaleValue = function(value, from={min: 0, max: 1}, to={min: 0, max: 1}) {
      return (to.max - to.min) * (value - from.min) / (from.max - from.min) + to.min;
    }

  }
})(CGView);

