//////////////////////////////////////////////////////////////////////////////
// Debug
//////////////////////////////////////////////////////////////////////////////

import utils from './Utils';

export default class Debug {

  constructor(viewer, options = {}) {
    this.viewer = viewer;
    this._data = {};
    this._sections = utils.defaultFor(options.sections, []);
    // Create object for each section
    for (const section of this.sections) {
      this.data[section] = {};
    }
  }

  get sections() {
    return this._sections;
  }

  get data() {
    return this._data;
  }


  // // DEBUG INFO EXAMPLE
  // if (this.debug) {
  //   axis = axis.toUpperCase();
  //   this.debug_data.zoom['d' + axis]  = JSV.round(axis_diff);
  //   this.debug_data.zoom['v' + axis]  = JSV.round(value);
  //   this.debug_data.zoom['r' + axis]  = JSV.round(axis_ratio);
  // }
  // Other Example
  // let start_time = new Date().getTime();
  // ....code and stuff....
  // if (this.debug) {
  //   this.debug_data.time['draw'] = JSV.elapsedTime(start_time);
  //   this.draw_debug(this.legend.bottom());
  // }
  //
  // Draws any information in 'data' onto the left side of the viewer
  draw(x = 10, y = 20) {
    const canvas = this.viewer.canvas;
    canvas.clear('debug');
    const ctx = canvas.context('debug');
    const data = this._data;
    const sections = this._sections;

    ctx.font = '10pt Sans-Serif';
    ctx.fillStyle = 'black';
    const lineHeight = 18;
    ctx.textAlign = 'left';
    // const section_keys = this.debug === true ? Object.keys(data) : this.debug;
    let i = 0;
    sections.forEach(function(sectionKey) {
      const dataKeys = Object.keys(data[sectionKey]);
      dataKeys.forEach(function(dataKey) {
        ctx.fillText((`${sectionKey}|${dataKey}: ${data[sectionKey][dataKey]}`), x, y + (lineHeight * i));
        i += 1;
      });
    });
  }

}


