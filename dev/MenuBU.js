//////////////////////////////////////////////////////////////////////////////
// CGViewer Menu
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  // NOTE: need to explicitly state menu and handle sizes here and not just in CSS
  // in order to work with hidden elements like tabs
  function Menu(viewer) {
    var self = this;
    this.viewer = viewer;
    this.slide_time = 500;
    this._visible = true;
    this.menu = viewer._wrapper.append('div')
      .style('visibility', 'hidden')
      .attr('class', 'cgv-menu')
      .on('click', function() { window.getSelection().removeAllRanges() });

    this.menu_svg = this.menu.append('svg')
      .attr('width', this.width())
      .attr('height', this.height());

    // this.handle = viewer.viewer_wrapper.append('div')
    this.handle = viewer._wrapper.append('div')
      .attr('class', 'cgv-menu-handle')
      .on('click', function() {
        if (self.opened()) {
          self.close();
        } else {
          self.open();
        }
      })
      .on('mouseover', function() { self.handle_mouseover(); })
      .on('mouseout', function() { self.handle_mouseout(); });

    // var handle_width = this.handle.node().offsetWidth;
    // var handle_height = this.handle.node().offsetHeight;
    var handle_width = 40;
    var handle_height = 12;

    this.handle_svg = this.handle.append('svg')
      .attr('width', handle_width)
      .attr('height', handle_height);

    this.stroke_width = 4
    this.handle_data_closed = [ {x: 0, y: 0}, {x: handle_width/2, y: handle_height - this.stroke_width}, {x: handle_width, y: 0} ];
    this.handle_data_opened = [ {x: 0, y: handle_height}, {x: handle_width/2, y: this.stroke_width}, {x: handle_width, y: handle_height} ];

    this.draw();
    // viewer.trigger('domain-change.menu');
    // this.close(0);
  }

  Menu.prototype.visible = function(value) {
    if (arguments.length == 0) return this._visible;
    if (value) {
      this._visible = true;
      this.handle.style('visibility', 'visible');
      this.menu.style('visibility', 'visible');
    } else {
      this._visible = false;
      this.handle.style('visibility', 'hidden');
      this.menu.style('visibility', 'hidden');
    }
  }

  Menu.prototype.opened = function() {
    return (this.menu.style('visibility') == 'visible');
  }

  Menu.prototype.width = function() {
    // return this.menu.node().offsetWidth;
    // return this.menu.node().getBoundingClientRect().width;
    return 300;
  }

  Menu.prototype.height = function() {
    // return this.menu.node().offsetHeight;
    // return this.menu.node().getBoundingClientRect().height;
    return  41;
  }

  Menu.prototype.open = function(duration) {
    duration = CGV.defaultFor(duration, this.slide_time)
    this.menu.style('visibility', 'visible');
    this.menu.transition().duration(duration)
      .style('top', '0px')
      .style('opacity', 1);

    this.handle_path.transition('shape').duration(duration).attr('d', line_function(this.handle_data_opened))
  }

  Menu.prototype.close = function(duration) {
    duration = CGV.defaultFor(duration, this.slide_time)
    this.menu.transition().duration(duration)
      .style('top', '-50px')
      .style('opacity', 0)
      .on('end', function() {
        d3.select(this).style('visibility', 'hidden');
      });

    this.handle_path.transition('shape').duration(duration).attr('d', line_function(this.handle_data_closed))
  }

  Menu.prototype.handle_mouseover = function() {
    this.handle_path.transition('color').duration(200)
      .attr('stroke', 'black');
  }

  Menu.prototype.handle_mouseout = function() {
    this.handle_path.transition().duration(200)
      .attr('stroke', 'grey');
  }

  Menu.prototype.draw = function() {
    var viewer = this.viewer;
    var self = this;
    var timeout;
    var translate_px = 5;
    var mousedown_delay = 4;

    // Handle
    this.handle_path = this.handle_svg.append("path")
      .attr("d", line_function(this.handle_data_closed))
      .attr("stroke", "grey")
      .attr("stroke-width", this.stroke_width)
      .attr("fill", "none");

    // Scroll/Move Buttons
    var left_arrow_data = [ {x: 11, y: 4}, {x: 4, y: 15}, {x: 11, y: 26} ];
    var right_arrow_data = [ {x: 4, y: 4}, {x: 11, y: 15}, {x: 4, y: 26} ];

    var left_arrow = path(this.menu_svg, left_arrow_data);
    var right_arrow = path(this.menu_svg, right_arrow_data);

    this.nav_group = this.menu_svg.append('g');
    this.scroll_left_button = button(this.nav_group, 0, 0, 15, 30, left_arrow);
    this.scroll_right_button = button(this.nav_group, 17, 0, 15, 30, right_arrow);
    this.nav_group.attr('transform', 'translate(' + 7 + ',' + 4 + ')');

    this.scroll_left_button.on('mousedown', function() {
      if (d3.select(this).classed('disabled')) return;
      timeout = scroll_interval(viewer, 'x', translate_px, mousedown_delay);
      return false;
    })

    this.scroll_right_button.on('mousedown', function() {
      if (d3.select(this).classed('disabled')) return;
      timeout = scroll_interval(viewer, 'x', -translate_px, mousedown_delay);
      return false;
    })

    $(document).mouseup(function(){
      if (timeout) {
        clearInterval(timeout);
        viewer.full_draw();
      }
    });

    // Zoom Buttons
    this.zoom_group = this.menu_svg.append('g');
    this.zoom_y_minus_button = button(this.zoom_group, 6, 18, 16, 16, minus_path(this.menu_svg));
    this.zoom_y_plus_button = button(this.zoom_group, 6, 0, 16, 16, plus_path(this.menu_svg));
    this.zoom_x_minus_button = button(this.zoom_group, 25, 9, 16, 16, minus_path(this.menu_svg));
    this.zoom_x_plus_button = button(this.zoom_group, 43, 9, 16, 16, plus_path(this.menu_svg));
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
    help_icon = this.menu_svg.append('text')
      .attr('x', 15)
      .attr('y', 24)
      .attr('font-family', 'sans-serif')
      .attr('font-size', '26px')
      .attr('stroke-width', 1)
      .attr('fill', 'black')
      .attr('class', 'cgv-button-text')
      .style('text-anchor', 'middle' )
      .text('?');
    this.help_button = button(this.menu_svg, 260, 4, 30, 30, help_icon);

    this.help_button.on('click', function() {
      viewer.help.dialog.open();
    })

    // Save/Download Button
    download_group = download_path(this.menu_svg)
      .attr('transform', 'translate(5,7)');

    this.download_button = button(this.menu_svg, 220, 4, 30, 30, download_group);
    // this.download_dialog = new CGV.Dialog(viewer, {
    //   header_text: 'Save Image',
    //   content_text: download_html(viewer),
    //   buttons: {
    //     'Cancel': function() { this.close(); },
    //     'Generate': function() { download_image(viewer, this); }
    //   }, width: 400,
    //   height: 250
    // });
    //
    // this.download_button.on('click', function() {
    //   self.download_dialog.open();
    // })

    // Settings Button
    settings_group = settings_path(this.menu_svg)
      .attr('transform', 'translate(5,5)');

    this.settings_button = button(this.menu_svg, 180, 4, 30, 30, settings_group);

    this.settings_button.on('click', function() {
      viewer.settings.open();
    })

    // CGV Button
    // TODO: add link to CGV website when available
    cgv_icon = this.menu_svg.append('text')
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

  var scroll_interval = function(viewer, axis, translate_px, delay) {
    return setInterval(function() {
      viewer.translate_axis(axis, translate_px);
      viewer.fast_draw();
    }, delay)
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
    // .interpolate("linear");

  var download_html = function(viewer) {
    return   '' +
    '<div class="cgv-alert">Display the viewer image in a new window to download or print. Note that you must allow pop-ups!</div>' +
    '<div><label class="cgv-label">Width</label><div class="cgv-input-group">' + 
    '<input class="cgv-input" id="cgv-save-width" type="text" value="' + viewer.width + '" /><div class="cgv-input-addon">px</div></div></div>' +
    '<div><label class="cgv-label">Height</label><div class="cgv-input-group">' + 
    '<input class="cgv-input" id="cgv-save-height" type="text" value="' + viewer.height + '" /><div class="cgv-input-addon">px</div></div></div>';
  }

  var download_image = function(viewer, dialog) {
    var height = viewer.viewer_wrapper.select('#cgv-save-height').property('value');
    var width = viewer.viewer_wrapper.select('#cgv-save-width').property('value');
    var image = viewer.image(width, height);
    var window_name = 'CGV-Image-' + width + 'x' + height;
    var win = window.open(image, window_name);
    dialog.close();
    setTimeout(function() { win.document.title = window_name }, 100);
  }



  CGV.Menu = Menu;

})(CGView);


