//////////////////////////////////////////////////////////////////////////////
// Initializing Zooming
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  CGV.SpectraViewer.prototype.initialize_zooming = function() {
    var self = this;
    self._zoom = d3.zoom()
      // .x(d3.scale.linear())
      // .scaleExtent([1, self.zoom_max])
      .on('start', zoomstart)
      .on('zoom',  zooming)
      .on('end',   zoomend);
    d3.select(self.canvas).call(self._zoom);

    function zoomstart() {
      self.set_zoom_axis(zoom_y_key_down);
      self.set_zoom_cursor(zoom_y_key_down);
      // self.trigger('zoom-start');
    }

    function zooming() {
      var start_time = new Date().getTime();

      // Scale axes based on current level
      self.scale_axis(self.zoom_axis, self.zoom_behavior.scale())

      // self.trigger('zoom');
      self.fast_draw();

      // DEBUG INFO
      if (self.debug) {
        self.debug.data.time['zoom'] = CGV.elapsed_time(start_time);
        // self.debug_data.zoom['zX'] = Jself.round(self.zoom_x);
        // self.debug_data.zoom['zY'] = Jself.round(self.zoom_y);
      }
    }

    function zoomend() {
      // self.svg.style('cursor', 'all-scroll');
      // self.trigger('zoom-end');
      // self.full_draw();
    }
  }
  /**
   * Initialize Spectra Viewer Dragging.
   */
  CGV.Viewer.prototype.initialize_dragging = function() {
    var self = this;
    self._drag = d3.drag()
      .on('start', dragstart)
      .on('drag',  dragging)
      .on('end',   dragend);
    d3.select(self.canvas).call(self._drag);

    function dragstart() {
      // d3.event.sourceEvent.preventDefault(); // Prevent text cursor
      // self.svg.style('cursor', 'all-scroll');
      d3.select(self.canvas).style('cursor', 'all-scroll');
      // self.trigger('drag-start');
    }

    function dragging() {
      var start_time = new Date().getTime();
      // // Restore selected peaks
      // // if (self.selection.empty()) self.selection._elements = current_selected_elements;
      // self.translate_axis('x', d3.event.dx);
      // self.translate_axis('y', d3.event.dy);
      domain_x = self.scale.x.domain();
      domain_y = self.scale.y.domain();


      self.scale.x.domain([domain_x[0] - d3.event.dx, domain_x[1] - d3.event.dx])
      self.scale.y.domain([domain_y[0] - d3.event.dy, domain_y[1] - d3.event.dy])
      self.draw();
      // self.trigger('drag');
      // self.fast_draw();
      //
      // DEBUG INFO
      if (self.debug) {
        self.debug.data.time['drag'] = CGV.elapsed_time(start_time);
        // self.debug_data.drag['dX'] = CGV.round(d3.event.dx);
        // self.debug_data.drag['dY'] = CGV.round(d3.event.dy);
        // self.debug_data.drag['zX'] = CGV.round(self.zoom_x);
        // self.debug_data.drag['zY'] = CGV.round(self.zoom_y);
      }
    }

    function dragend() {
      // self.trigger('drag-end');
      // self.full_draw();
    }
  }

})(CGView);


