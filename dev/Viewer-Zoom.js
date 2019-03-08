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

    // Keep track of pan/translate changes
    let panX = 0;
    let panY = 0;

    function zoomstart() {
      self.trigger('zoom-start');
      self.highlighter.hidePopoverBox();
    }

    function zooming() {
      const startTime = new Date().getTime();

      const bp = self.canvas.bpForMouse();

      const dx = d3.event.transform.x - panX;
      const dy = d3.event.transform.y - panY;
      panX = d3.event.transform.x;
      panY = d3.event.transform.y;
      // Only translate of not Zooming
      if (self.zoomFactor === d3.event.transform.k) {
        self.layout.translate(dx, dy);
      }

      self.layout.zoom(d3.event.transform.k, bp);

      self.drawFast();
      self.trigger('zoom');

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
      self.trigger('zoom-end');
      self.drawFull();
    }
  };
})(CGView);


