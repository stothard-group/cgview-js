//////////////////////////////////////////////////////////////////////////////
// Initializing Zooming
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  CGV.Viewer.prototype._updateZoomMax = function() {
    if (this._zoom) {
      this._zoom.scaleExtent([this.minZoomFactor, this.maxZoomFactor]);
    }
  }

  CGV.Viewer.prototype.initializeZooming = function() {
    let self = this;
    let zoomMax = this.backbone.maxZoomFactor();
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
      let start_time = new Date().getTime();
      let pos = d3.mouse(self.canvas.node('ui'));
      let mx = self.scale.x.invert(CGV.pixel(pos[0]))
      let my = self.scale.y.invert(CGV.pixel(pos[1]))

      let radius = self.backbone.zoomedRadius;
      let angle = CGV.angleFromPosition(mx, my);

      self._zoomFactor = d3.event.transform.k

      let radiusDiff = radius - self.backbone.zoomedRadius;

      let dx = CGV.pixel(Math.cos(-angle) * radiusDiff);
      let dy = CGV.pixel(Math.sin(-angle) * radiusDiff);

      let domain_x = self.scale.x.domain();
      let domain_y = self.scale.y.domain();

      self.scale.x.domain([domain_x[0] - dx, domain_x[1] - dx])
      self.scale.y.domain([domain_y[0] - dy, domain_y[1] - dy])

      // console.log('Mouse: ', [mx, my]);
      // console.log('radius: ', radius);
      // console.log('Angle: ', angle);
      // console.log('TX: ', [dx, dy]);
      // console.log('rDiff: ', radiusDiff);

      self.trigger('zoom');

      self.drawFast();

      // DEBUG INFO
      if (self.debug) {
        if (self.debug.data.time) {
          self.debug.data.time['zoom'] = CGV.elapsedTime(start_time);
        }
        if (self.debug.data.zoom) {
          self.debug.data.zoom['scale'] = CGV.round(self._zoomFactor, 1);
        }
      }
    }

    function zoomend() {
      // self.svg.style('cursor', 'all-scroll');
      self.trigger('zoom-end');
      // self.full_draw();
      self.drawFull();
    }
  }

})(CGView);


