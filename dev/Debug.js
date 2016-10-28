//////////////////////////////////////////////////////////////////////////////
// Debug
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class Debug {

    constructor(options = {}) {
      this._data = {};
      this._sections = CGV.default_for(options.sections, []);
      // Create object for each section
      for (var section of this.sections) {
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
    // var start_time = new Date().getTime();
    // ....code and stuff....
    // if (this.debug) {
    //   this.debug_data.time['draw'] = JSV.elapsed_time(start_time);
    //   this.draw_debug(this.legend.bottom());
    // }
    // 
    // Draws any information in 'data' onto the left side of the viewer
    draw(ctx, x = 10, y = 10) {
      var data = this._data;
      var sections = this._section;

      ctx.font = '12pt Sans-Serif';
      ctx.fillStyle = 'black';
      var line_height = CGV.pixel(18);
      ctx.textAlign = 'left';
      var section_keys = this.debug === true ? Object.keys(data) : this.debug;
      var i = 0;
      sections.forEach(function(section_key) {
        var data_keys = Object.keys(data[section_key]);
        data_keys.forEach(function(data_key) {
          ctx.fillText((section_key + '|' + data_key + ': ' + data[section_key][data_key]), x, y + (line_height * i));
          i += 1;
        });
      })
    }

  }

  CGV.Debug = Debug;

})(CGView);
