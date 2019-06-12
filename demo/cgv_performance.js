class CGVPerformance {

  constructor(cgv, name = 'My Test', iterations = 3) {
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
        drawFull: []
      };
    }
    this.run();
  }

  run() {
    const cgv = this.cgv;
    const layout = cgv.layout;
    const results = this.results;
    for (let iteration = 1; iteration <= this.iterations; iteration++) {
      const p = new Progress();
      for (const zoomLevel of this.zoomLevels) {
        const bp = (zoomLevel === 1) ? 0 : 1;
        cgv.zoomTo(bp, zoomLevel, {callback: function() {
          console.log('CALLBACK')
          // Visible Range
          results[zoomLevel].visibleRange = `${d3.format(',')(cgv.backbone.visibleRange.length)}`;
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
        }});
      }
    }
    window.results = results;
  }

  report() {
    const cgv = this.cgv;
    const results = this.results;
    let text = `<pre><strong>${this.name} [${d3.format(',')(cgv.features().length)} features]</strong>\n`;
    const padding = Array(7).join(' ');
    const bpPadding = Array(22).join(' ');
    text += this.pad(padding, 'Zoom');
    text += this.pad(padding, 'Fast');
    text += this.pad(padding, 'Full');
    text += this.pad(bpPadding, 'Visible Range (bp)');
    text += '\n';
    for (const zoomLevel of this.zoomLevels) {
      text += this.pad(padding, `${zoomLevel}x`);
      text += this.pad(padding, this.mean(zoomLevel, 'drawFast'));
      text += this.pad(padding, this.mean(zoomLevel, 'drawFull'));
      text += this.pad(bpPadding, results[zoomLevel].visibleRange);
      text += '\n';
    }
    text += '--------------------------------\nDetails:\n';
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

  mean(zoomLevel, key) {
    return Math.round(d3.mean(this.results[zoomLevel][key]));
  }

  pad(pad, str, padRight) {
    if (typeof str === 'undefined') return pad;
    if (padRight) {
      return (str + pad).substring(0, pad.length);
    } else {
      return (pad + str).slice(-pad.length);
    }
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
    return new Date().getTime();
  }

  totalTime() {
    return this.currentTime() - this._startTime;
  }

  intervalTime() {
    return this._intervalStartTime ? (this.currentTime() - this._intervalStartTime) : undefined;
  }

}
