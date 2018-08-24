//////////////////////////////////////////////////////////////////////////////
// Initializing Dragging
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {
  /**
   * <br />
   * Initialize Spectra Viewer Dragging.
   */
  CGV.Viewer.prototype.initializeDragging = function() {
    const self = this;
    self._drag = d3.drag()
      .on('start', dragstart)
      .on('drag',  dragging)
      .on('end',   dragend);
    d3.select(self.canvas.node('ui')).call(self._drag);

    function dragstart() {
      // d3.event.sourceEvent.preventDefault(); // Prevent text cursor
      // self.svg.style('cursor', 'all-scroll');
      d3.select(self.canvas.node('ui')).style('cursor', 'all-scroll');
      self.highlighter.hidePopoverBox();
      // self.trigger('drag-start');
    }

    function dragging() {
      const startTime = new Date().getTime();
      // // Restore selected peaks
      // // if (self.selection.empty()) self.selection._elements = current_selected_elements;
      // self.translate_axis('x', d3.event.dx);
      // self.translate_axis('y', d3.event.dy);
      const domainX = self.scale.x.domain();
      const domainY = self.scale.y.domain();
      const dx = CGV.pixel(d3.event.dx);
      const dy = CGV.pixel(d3.event.dy);


      self.scale.x.domain([domainX[0] - dx, domainX[1] - dx]);
      self.scale.y.domain([domainY[0] + dy, domainY[1] + dy]);
      self.drawFast();
      // self.draw(true);
      // self.trigger('drag');
      // self.fast_draw();
      //
      // DEBUG INFO
      if (self.debug) {
        self.debug.data.time.drag = CGV.elapsedTime(startTime);
        // self.debug_data.drag['dX'] = CGV.round(d3.event.dx);
        // self.debug_data.drag['dY'] = CGV.round(d3.event.dy);
        // self.debug_data.drag['zX'] = CGV.round(self.zoom_x);
        // self.debug_data.drag['zY'] = CGV.round(self.zoom_y);
      }
    }

    function dragend() {
      // self.trigger('drag-end');
      // self.full_draw();
      // self.draw()
      self.drawFull();
    }
  };
})(CGView);


