//////////////////////////////////////////////////////////////////////////////
// Initializing Zooming
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {
  CGV.Viewer.prototype._updateZoomMax = function() {
    if (this._zoom) {
      this._zoom.scaleExtent([this.minZoomFactor, this.maxZoomFactor]);
    }
  };

  CGV.Viewer.prototype.initializeZooming = function() {
    const self = this;
    const zoomMax = this.backbone.maxZoomFactor();
    self._zoom = d3.zoom()
      .scaleExtent([1, zoomMax])
      .on('start', zoomstart)
      .on('zoom',  zooming)
      .on('end',   zoomend);
    d3.select(self.canvas.node('ui')).call(self._zoom)
      .on('dblclick.zoom', null);

    function zoomstart() {
      self.trigger('zoom-start');
      self.highlighter.hidePopoverBox();
    }

    function zooming() {
      const startTime = new Date().getTime();

      const bp = self.canvas.bpForMouse();

      self.layout.zoom(d3.event.transform.k, bp);

      self.trigger('zoom');

      self.drawFast();

      // DEBUG INFO
      if (self.debug) {
        if (self.debug.data.time) {
          self.debug.data.time.zoom = CGV.elapsedTime(startTime);
        }
        if (self.debug.data.zoom) {
          self.debug.data.zoom.scale = CGV.round(self._zoomFactor, 1);
        }
      }
    }

    function zoomend() {
      // self.svg.style('cursor', 'all-scroll');
      self.trigger('zoom-end');
      // self.full_draw();
      self.drawFull();
    }
  };
})(CGView);


