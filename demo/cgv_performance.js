class CGVPerformance {

  constructor(cgv, name='My Test', iterations=3) {
    this.cgv = cgv;
    this.name = name;
    this.iterations = iterations;
    this.zoomLevels = [1, 5, 10];
    this.results = {};
    for (const zoomLevel of this.zoomLevels) {
      this.results[zoomLevel] = {
        visibleRange: undefined,
        numFeatures: undefined,
        drawFast: [],
        drawFull: [],
      }
    }
    this.run();
  }

  run() {
    let cgv = this.cgv;
    let layout = cgv.layout;
    let results = this.results;
    for (let iteration = 1; iteration <= this.iterations; iteration++) {
      let p = new Progress();
      for (const zoomLevel of this.zoomLevels) {
        let bp = (zoomLevel == 1) ? 0 : 1;
        cgv.zoomTo(bp, zoomLevel, 0, undefined, function(){
          // Fast
          p.startInterval();
          cgv.drawFast();
          results[zoomLevel].drawFast.push(p.intervalTime());
          // Full (Simulate Full Draw)
          p.startInterval();
          layout.drawMapWithoutSlots();
          layout.drawAllSlots(true);
          layout.drawAllSlots(false);
          results[zoomLevel].drawFull.push(p.intervalTime());
        });
      }
    }
    window.results = results;
  }

  report() {
    const cgv = this.cgv;
    const results = this.results;
    let text = `<pre><strong>${this.name} [${d3.format(',')(cgv.features().length)} features]</strong>\n`;
    text += 'Fast Draw (ms):\n';
    for (const zoomLevel of this.zoomLevels) {
      text += ` - Zoom ${zoomLevel}x: ${results[zoomLevel].drawFast.join(', ')}\n`;
    }
    text += 'Full Draw (ms):\n';
    for (const zoomLevel of this.zoomLevels) {
      text += ` - Zoom ${zoomLevel}x: ${results[zoomLevel].drawFull.join(', ')}\n`;
    }
    return text;
  }

  average(zoomLevel, key) {
    return d3.mean(this.results[zoomLevel][key]);
  }

}

class Progress {

  constructor() {
    this.reset();
  }

  reset() {
    this._startTime = this.currentTime();
    this._intervalStartTime = undefined;
  }

  // Could have names intervals in the future
  startInterval() {
    this._intervalStartTime = this.currentTime();
  }

  removeInterval() {
    this._intervalStartTime = undefined;
  }

  currentTime() {
    return new Date().getTime()
  }

  totalTime() {
    return this.currentTime() - this._startTime;
  }

  intervalTime() {
    return this._intervalStartTime ? (this.currentTime() - this._intervalStartTime) : undefined;
  }

}