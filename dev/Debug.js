//////////////////////////////////////////////////////////////////////////////
// Debug
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class Debug {

    constructor(options = {}) {
      this._data = {};
      this._sections = CGV.defaultFor(options.sections, []);
      // Create object for each section
      for (let section of this.sections) {
        this.data[section] = {}
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
    draw(ctx, x = 10, y = 20) {
      x = CGV.pixel(x);
      y = CGV.pixel(y);
      let data = this._data;
      let sections = this._sections;

      ctx.font = CGV.pixel(10) + 'pt Sans-Serif';
      ctx.fillStyle = 'black';
      let line_height = CGV.pixel(18);
      ctx.textAlign = 'left';
      let section_keys = this.debug === true ? Object.keys(data) : this.debug;
      let i = 0;
      sections.forEach(function(section_key) {
        let data_keys = Object.keys(data[section_key]);
        data_keys.forEach(function(data_key) {
          ctx.fillText((section_key + '|' + data_key + ': ' + data[section_key][data_key]), x, y + (line_height * i));
          i += 1;
        });
      })
    }

  }

  CGV.Debug = Debug;

})(CGView);
