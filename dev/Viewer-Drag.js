//////////////////////////////////////////////////////////////////////////////
// Initializing Dragging
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * Initialize Spectra Viewer Dragging.
   */
  CGV.Viewer.prototype.initialize_dragging = function() {
    var self = this;
    self._drag = d3.drag()
      .on('start', dragstart)
      .on('drag',  dragging)
      .on('end',   dragend);
    d3.select(self.canvas.canvasNode).call(self._drag);

    function dragstart() {
      // d3.event.sourceEvent.preventDefault(); // Prevent text cursor
      // self.svg.style('cursor', 'all-scroll');
      d3.select(self.canvas.canvasNode).style('cursor', 'all-scroll');
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
      var dx = CGV.pixel(d3.event.dx);
      var dy = CGV.pixel(d3.event.dy);


      self.scale.x.domain([domain_x[0] - dx, domain_x[1] - dx])
      self.scale.y.domain([domain_y[0] + dy, domain_y[1] + dy])
      self.draw(true);
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
      self.draw()
    }
  }

})(CGView);


