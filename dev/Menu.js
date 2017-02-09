//////////////////////////////////////////////////////////////////////////////
// CGViewer Menu
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * Menu
   */
  class Menu {

    // NOTE: need to explicitly state menu and handle sizes here and not just in CSS
    // in order to work with hidden elements like tabs
    /**
     * Create a new menu
     */
    constructor(viewer) {
      this.viewer = viewer;
      this.slideTime = 500;
      // this.available = true;
      this._menu_div = viewer._wrapper.append('div')
        .style('visibility', 'hidden')
        .attr('class', 'cgv-menu')
        .on('click', function() { window.getSelection().removeAllRanges() });
      this._menu_svg = this._menu_div.append('svg')
        .attr('width', this.width)
        .attr('height', this.height);
      this._handle_div = viewer._wrapper.append('div')
        .attr('class', 'cgv-menu-handle')
        .on('click', () => { this.opened ? this.close() : this.open(); })
        .on('mouseover', () => { this._handle_mouseover(); })
        .on('mouseout', () => { this._handle_mouseout(); });

      var handle_width = 40;
      var handle_height = 12;

      this._handle_svg = this._handle_div.append('svg')
        .attr('width', handle_width)
        .attr('height', handle_height);

      this._handle_stroke_width = 4
      this._handle_data_closed = [ {x: 0, y: 0}, {x: handle_width/2, y: handle_height - this._handle_stroke_width}, {x: handle_width, y: 0} ];
      this._handle_data_opened = [ {x: 0, y: handle_height}, {x: handle_width/2, y: this._handle_stroke_width}, {x: handle_width, y: handle_height} ];

      this._draw();
      // viewer.trigger('domain-change.menu');
    }


    //////////////////////////////////////////////////////////////////////////
    // MEMBERS
    //////////////////////////////////////////////////////////////////////////

    /**
     * @member {Number} - Get or set the time it take for the menu to appear and disappear in milliseconds [Default: 500].
     */
    get slideTime() {
      return this._slideTime;
    }

    set slideTime(value) {
      this._slideTime = value;
    }

    /**
     * @member {Boolean} - Get or set the availability of the menu. If false, the menu will not be visible at all.
     */
    get available() {
      return this._available;
    }

    set available(value) {
      if (value) {
        this._available = true;
        this._handle_div.style('visibility', 'visible');
        this._menu_div.style('visibility', 'visible');
      } else {
        this._available = false;
        this._handle_div.style('visibility', 'hidden');
        this._menu_div.style('visibility', 'hidden');
      }
    }

    /**
     * @member {Boolean} - Returns true if the menu is open.
     */
    get opened() {
      return (this._menu_div.style('visibility') == 'visible');
    }

    /**
     * @member {Number} - Returns the width of the menu.
     */
    get width() {
      // return this._menu_div.node().offsetWidth;
      // return this._menu_div.node().getBoundingClientRect().width;
      return 300;
    }

    /**
     * @member {Number} - Returns the height of the menu.
     */
    get height() {
      // return this._menu_div.node().offsetHeight;
      // return this._menu_div.node().getBoundingClientRect().height;
      return  41;
    }

    //////////////////////////////////////////////////////////////////////////
    // METHODS
    //////////////////////////////////////////////////////////////////////////

  /**
   * Opens the menu
   * @param {Number} duration - The duration of the open animation in milliseconds. Defaults to slideTime [Menu.slideTime](Menu.html#slideTime).
   */
    open(duration) {
      duration = CGV.defaultFor(duration, this.slideTime)
      this._menu_div.style('visibility', 'visible');
      this._menu_div.transition().duration(duration)
        .style('top', '0px')
        .style('opacity', 1);

      this._handle_path.transition('shape').duration(duration).attr('d', line_function(this._handle_data_opened))
    }

  /**
   * Closes the menu
   * @param {Number} duration - The duration of the close animation in milliseconds. Defaults to slideTime [Menu.slideTime](Menu.html#slideTime).
   */
    close(duration) {
      duration = CGV.defaultFor(duration, this.slideTime)
      this._menu_div.transition().duration(duration)
        .style('top', '-50px')
        .style('opacity', 0)
        .on('end', function() {
          d3.select(this).style('visibility', 'hidden');
        });

      this._handle_path.transition('shape').duration(duration).attr('d', line_function(this._handle_data_closed))
    }

    _handle_mouseover() {
      this._handle_path.transition('color').duration(200)
        .attr('stroke', 'black');
    }

    _handle_mouseout() {
      this._handle_path.transition().duration(200)
        .attr('stroke', 'grey');
    }

    _draw() {
      var viewer = this.viewer;
      var self = this;
      var timeout;
      var translate_px = 5;
      var mousedown_delay = 4;

      // Handle
      this._handle_path = this._handle_svg.append("path")
        .attr("d", line_function(this._handle_data_closed))
        .attr("stroke", "grey")
        .attr("stroke-width", this._handle_stroke_width)
        .attr("fill", "none");

      // Scroll/Move Buttons
      var left_arrow_data = [ {x: 11, y: 4}, {x: 4, y: 15}, {x: 11, y: 26} ];
      var right_arrow_data = [ {x: 4, y: 4}, {x: 11, y: 15}, {x: 4, y: 26} ];

      var left_arrow = path(this._menu_svg, left_arrow_data);
      var right_arrow = path(this._menu_svg, right_arrow_data);

      this.nav_group = this._menu_svg.append('g');
      this.scroll_left_button = button(this.nav_group, 0, 0, 15, 30, left_arrow);
      this.scroll_right_button = button(this.nav_group, 17, 0, 15, 30, right_arrow);
      this.nav_group.attr('transform', 'translate(' + 7 + ',' + 4 + ')');

      // this.scroll_left_button.on('mousedown', function() {
      //   if (d3.select(this).classed('disabled')) return;
      //   timeout = scroll_interval(viewer, 'x', translate_px, mousedown_delay);
      //   return false;
      // })
      //
      // this.scroll_right_button.on('mousedown', function() {
      //   if (d3.select(this).classed('disabled')) return;
      //   timeout = scroll_interval(viewer, 'x', -translate_px, mousedown_delay);
      //   return false;
      // })

      $(document).mouseup(function(){
        if (timeout) {
          clearInterval(timeout);
          viewer.full_draw();
        }
      });

      // Zoom Buttons
      this.zoom_group = this._menu_svg.append('g');
      this.zoom_y_minus_button = button(this.zoom_group, 6, 18, 16, 16, minus_path(this._menu_svg));
      this.zoom_y_plus_button = button(this.zoom_group, 6, 0, 16, 16, plus_path(this._menu_svg));
      this.zoom_x_minus_button = button(this.zoom_group, 25, 9, 16, 16, minus_path(this._menu_svg));
      this.zoom_x_plus_button = button(this.zoom_group, 43, 9, 16, 16, plus_path(this._menu_svg));
      scale_path(this.zoom_group, 0, 0.5, 5, 34, 0);
      scale_path(this.zoom_group, 25.5, 32, 5, 34, -90);
      this.zoom_group.attr('transform', 'translate(' + 55 + ',' + 2 + ')');

      this.zoom_x_minus_button.on('click', function() {
        if (d3.select(this).classed('disabled')) return;
        var zoom_diff = viewer.scale.x.diff() / 2;
        var new_domains =  [ [viewer.scale.x.min() - zoom_diff, viewer.scale.x.max() + zoom_diff], viewer.scale.y.domain() ];
        viewer.move_to(new_domains)
      })

      this.zoom_x_plus_button.on('click', function() {
        if (d3.select(this).classed('disabled')) return;
        var zoom_diff = viewer.scale.x.diff() / 4;
        var new_domains =  [ [viewer.scale.x.min() + zoom_diff, viewer.scale.x.max() - zoom_diff], viewer.scale.y.domain() ];
        viewer.move_to(new_domains)
      })

      this.zoom_y_minus_button.on('click', function() {
        if (d3.select(this).classed('disabled')) return;
        var zoom_diff = viewer.scale.y.diff() / 2;
        var new_domains =  [ viewer.scale.x.domain(), [viewer.scale.y.min() - zoom_diff, viewer.scale.y.max() + zoom_diff] ];
        viewer.move_to(new_domains)
      })

      this.zoom_y_plus_button.on('click', function() {
        if (d3.select(this).classed('disabled')) return;
        var zoom_diff = viewer.scale.y.diff() / 4;
        var new_domains =  [ viewer.scale.x.domain(), [viewer.scale.y.min() + zoom_diff, viewer.scale.y.max() - zoom_diff] ];
        viewer.move_to(new_domains)
      })

      // // Set button disabled status
      // viewer.on('domain-change.menu', function() {
      //   if (viewer.zoom_x == 1) {
      //     self.zoom_x_minus_button.classed('disabled', true);
      //   } else if (viewer.zoom_x >= viewer.zoom_max) {
      //     self.zoom_x_plus_button.classed('disabled', true);
      //   } else {
      //     self.zoom_x_minus_button.classed('disabled', false);
      //     self.zoom_x_plus_button.classed('disabled', false);
      //   }
      //   if (viewer.zoom_y == 1) {
      //     self.zoom_y_minus_button.classed('disabled', true);
      //   } else if (viewer.zoom_y >= viewer.zoom_max) {
      //     self.zoom_y_plus_button.classed('disabled', true);
      //   } else {
      //     self.zoom_y_minus_button.classed('disabled', false);
      //     self.zoom_y_plus_button.classed('disabled', false);
      //   }
      //   if (viewer.scale.x.min() == viewer.boundary.x.min()) {
      //     self.scroll_right_button.classed('disabled', true);
      //   } else {
      //     self.scroll_right_button.classed('disabled', false);
      //   }
      //   if (viewer.scale.x.max() == viewer.boundary.x.max()) {
      //     self.scroll_left_button.classed('disabled', true);
      //   } else {
      //     self.scroll_left_button.classed('disabled', false);
      //   }
      // });


      // Help Button
      var help_icon = this._menu_svg.append('text')
        .attr('x', 15)
        .attr('y', 24)
        .attr('font-family', 'sans-serif')
        .attr('font-size', '26px')
        .attr('stroke-width', 1)
        .attr('fill', 'black')
        .attr('class', 'cgv-button-text')
        .style('text-anchor', 'middle' )
        .text('?');
      this.help_button = button(this._menu_svg, 260, 4, 30, 30, help_icon);

      this.help_button.on('click', function() {
        viewer.help.dialog.open();
      })

      // Save/Download Button
      var download_group = download_path(this._menu_svg)
        .attr('transform', 'translate(5,7)');

      this.download_button = button(this._menu_svg, 220, 4, 30, 30, download_group);
      this.download_dialog = new CGV.Dialog(viewer, {
        header_text: 'Save Image',
        content_text: download_html(viewer),
        buttons: {
          'Cancel': function() { this.close(); },
          'Generate': function() { download_image(viewer, this); }
        }, width: 400,
        height: 200
      });

      this.download_button.on('click', function() {
        self.download_dialog.open();
      })

      // Settings Button
      var settings_group = settings_path(this._menu_svg)
        .attr('transform', 'translate(5,5)');

      this.settings_button = button(this._menu_svg, 180, 4, 30, 30, settings_group);

      this.settings_button.on('click', function() {
        viewer.settings.open();
      })

      // CGV Button
      // TODO: add link to CGV website when available
      var cgv_icon = this._menu_svg.append('text')
        .attr('x', 149)
        .attr('y', 32)
        .attr('font-family', 'sans-serif')
        .attr('font-size', '16px')
        .attr('font-weight', 'bold')
        .attr('stroke-width', 1)
        .attr('fill', 'grey')
        .attr('class', 'cgv-button-text')
        .style('text-anchor', 'middle' )
        .text('CGV');

    }

    // var scroll_interval = function(viewer, axis, translate_px, delay) {
    //   return setInterval(function() {
    //     viewer.translate_axis(axis, translate_px);
    //     viewer.fast_draw();
    //   }, delay)
    // }

  }
    var path = function(svg, path_data) {
      return svg.append('path')
        .attr('d', line_function(path_data))
        .attr('stroke', 'black')
        // .attr('stroke-linecap', 'round')
        .attr("stroke-width", 3)
        .attr("fill", "none");
    }

    var plus_path = function(svg) {
      var group = svg.append('g');
      group.append('line')
        .attr('x1', 3)
        .attr('y1', 8)
        .attr('x2', 13)
        .attr('y2', 8)
        .attr('stroke-width', 3)
        .attr('stroke', 'black');

      group.append('line')
        .attr('x1', 8)
        .attr('y1', 3)
        .attr('x2', 8)
        .attr('y2', 13)
        .attr('stroke-width', 3)
        .attr('stroke', 'black');

      return group;
    }

    var minus_path = function(svg) {
      return svg.append('line')
        .attr('x1', 3)
        .attr('y1', 8)
        .attr('x2', 13)
        .attr('y2', 8)
        .attr('stroke-width', 3)
        .attr('stroke', 'black');
    }

    var scale_path = function(svg, x, y, width, height, angle) {
      var group = svg.append('g');
      var stroke_width = 1;
      var gap = 2;
      var y1_with_gap = y + gap;
      var y2_with_gap = y + height - gap;
      var head_len = 2;
      var center = x + (width / 2);
      group.append('line').attrs({
        x1: x, y1: y,
        x2: x + width, y2: y,
        'stroke-width': stroke_width
      });
      group.append('line').attrs({
        x1: x, y1: y + height,
        x2: x + width, y2: y + height,
        'stroke-width': stroke_width
      });
      group.append('line').attrs({
        x1: center, y1: y1_with_gap,
        x2: center, y2: y2_with_gap,
        'stroke-width': stroke_width
      });
      group.append('line').attrs({
        x1: center, y1: y1_with_gap,
        x2: center - head_len, y2: y1_with_gap + head_len,
        'stroke-width': stroke_width
      });
      group.append('line').attrs({
        x1: center, y1: y1_with_gap,
        x2: center + head_len, y2: y1_with_gap + head_len,
        'stroke-width': stroke_width
      });
      group.append('line').attrs({
        x1: center, y1: y2_with_gap,
        x2: center - head_len, y2: y2_with_gap - head_len,
        'stroke-width': stroke_width
      });
      group.append('line').attrs({
        x1: center, y1: y2_with_gap,
        x2: center + head_len, y2: y2_with_gap - head_len,
        'stroke-width': stroke_width
      });

      group
        .attr('stroke', 'rgb(150, 150, 150)')
        .attr('transform', 'rotate(' + angle + ',' + x + ',' + y + ')');
      return group;
    }

    var settings_path = function(svg) {
      var group = svg.append('g');
      var stroke_width = 4;
      group.append('circle').attrs({
        cx: 10, cy:10, r: 7,
      }).style('fill', 'rgb(75, 75, 75');
      group.append('line').attrs({
        x1: 10, y1: 1,
        x2: 10, y2: 19,
        'stroke-width': stroke_width
      });
      group.append('line').attrs({
        x1: 1, y1: 10,
        x2: 19, y2: 10,
        'stroke-width': stroke_width
      });
      group.append('line').attrs({
        x1: 3.5, y1: 3.5,
        x2: 16.5, y2: 16.5,
        'stroke-width': stroke_width
      });
      group.append('line').attrs({
        x1: 16.5, y1: 3.5,
        x2: 3.5, y2: 16.5,
        'stroke-width': stroke_width
      });
      group.append('circle').attrs({
        cx: 10, cy:10, r: 3,
      }).style('fill', 'white');

      // group.append('line').attrs({
      //   x1: 10, y1: 3,
      //   x2: 10, y2: 17,
      //   'stroke-width': stroke_width
      // });
      // group.append('line').attrs({
      //   x1: 3, y1: 10,
      //   x2: 17, y2: 10,
      //   'stroke-width': stroke_width
      // });
      // group.append('line').attrs({
      //   x1: 5, y1: 5,
      //   x2: 15, y2: 15,
      //   'stroke-width': stroke_width
      // });
      // group.append('line').attrs({
      //   x1: 15, y1: 5,
      //   x2: 5, y2: 15,
      //   'stroke-width': stroke_width
      // });
      // group.append('circle').attrs({
      //   cx: 10, cy:10, r: 5,
      // }).style('fill', 'rgb(75, 75, 75');
      // group.append('circle').attrs({
      //   cx: 10, cy:10, r: 3,
      // }).style('fill', 'white');

      return group;
    }

    var download_path = function(svg) {
      var group = svg.append('g');
      var stroke_width = 3;
      group.append('line').attrs({
        x1: 10, y1: 0,
        x2: 10, y2: 12,
        'stroke-linecap': 'round',
        'stroke-width': stroke_width
      });
      group.append('line').attrs({
        x1: 6, y1: 7,
        x2: 10, y2: 12,
        'stroke-linecap': 'round',
        'stroke-width': stroke_width
      });
      group.append('line').attrs({
        x1: 14, y1: 7,
        x2: 10, y2: 12,
        'stroke-linecap': 'round',
        'stroke-width': stroke_width
      });
      group.append('line').attrs({
        x1: 2, y1: 16,
        x2: 18, y2: 16,
        'stroke-linecap': 'round',
        'stroke-width': stroke_width
      });

      return group;
    }

    var button = function(svg, x, y, width, height, path_group) {
      var button_group = svg.append('g').attr('class', 'cgv-menu-button');
      button_group.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', width)
        .attr('height', height)
        .attr('rx', 2)
        .attr('ry', 2)
        .style({
          'stroke-width': 1
        });

      var path = path_group.remove();
      button_group.append('g').
        attr('class', 'cgv-button-image').
        append(function() { return path.node(); });

      button_group.attr('transform', 'translate(' + x + '.5,' + y + '.5)')

      return button_group;
    }

    var line_function = d3.line()
      .x(function(d) { return d.x; })
      .y(function(d) { return d.y; });

    var download_html = function(viewer) {
      return   '' +
      '<div class="cgv-alert">Display the viewer image in a new window to download or print. Note that you must allow pop-ups!</div>' +
      // Width AND Height
      // '<div><label class="cgv-label">Width</label><div class="cgv-input-group">' + 
      // '<input class="cgv-input" id="cgv-save-width" type="text" value="' + viewer.width + '" /><div class="cgv-input-addon">px</div></div></div>' +
      // '<div><label class="cgv-label">Height</label><div class="cgv-input-group">' + 
      // '<input class="cgv-input" id="cgv-save-height" type="text" value="' + viewer.height + '" /><div class="cgv-input-addon">px</div></div></div>';
      // Size
      '<div><label class="cgv-label">Size</label><div class="cgv-input-group">' + 
      '<input class="cgv-input" id="cgv-save-width" type="text" value="' + viewer.width + '" /><div class="cgv-input-addon">px</div></div></div>';
    }

    var download_image = function(viewer, dialog) {
      // var height = viewer._wrapper.select('#cgv-save-height').property('value');
      var height = viewer._wrapper.select('#cgv-save-width').property('value');
      var width = viewer._wrapper.select('#cgv-save-width').property('value');
      var image = viewer._io.exportImage(width, height);
      dialog.close();
    }

  CGV.Menu = Menu;

})(CGView);


