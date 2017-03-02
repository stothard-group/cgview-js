// myWorker() {
  onmessage = function(e) {
    console.log('message stuff: ' + e.data)
    // Send Message that worker has started
    postMessage('Starting ' + e.data)
    // Do work
    // Send progress
    // Send results
  }

  calculateBaseContent = function(type, options) {
    var length = 100000
    var windowSize = CGV.defaultFor(options.window, getWindowStep(length).window);
    var step = CGV.defaultFor(options.step, getWindowStep(length).step);
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

  getWindowStep = function(length) {
    var windowSize, step;
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
// }
