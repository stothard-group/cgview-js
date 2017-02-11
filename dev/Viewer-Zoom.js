//////////////////////////////////////////////////////////////////////////////
// Initializing Zooming
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  CGV.Viewer.prototype._updateZoomMax = function() {
    if (this._zoom) {
      this._zoom.scaleExtent([0.8, this.backbone.maxZoomFactor()]);
    }
  }

  CGV.Viewer.prototype.initialize_zooming = function() {
    var self = this;
    var zoomMax = this.backbone.maxZoomFactor();
    self._zoom = d3.zoom()
      .scaleExtent([1, zoomMax])
      .on('start', zoomstart)
      .on('zoom',  zooming)
      .on('end',   zoomend);
    d3.select(self.canvas.canvasNode).call(self._zoom)
      .on('dblclick.zoom', null);

    function zoomstart() {
      // self.trigger('zoom-start');
    }

    function zooming() {
      var start_time = new Date().getTime();
      var pos = d3.mouse(self.canvas.canvasNode);
      var mx = self.scale.x.invert(CGV.pixel(pos[0]))
      var my = self.scale.y.invert(CGV.pixel(pos[1]))

      var radius = self.backbone.zoomedRadius;
      var angle = CGV.angleFromPosition(mx, my);

      self._zoomFactor = d3.event.transform.k

      var radiusDiff = radius - self.backbone.zoomedRadius;

      var dx = CGV.pixel(Math.cos(-angle) * radiusDiff);
      var dy = CGV.pixel(Math.sin(-angle) * radiusDiff);

      var domain_x = self.scale.x.domain();
      var domain_y = self.scale.y.domain();

      self.scale.x.domain([domain_x[0] - dx, domain_x[1] - dx])
      self.scale.y.domain([domain_y[0] - dy, domain_y[1] - dy])

      // console.log('Mouse: ', [mx, my]);
      // console.log('radius: ', radius);
      // console.log('Angle: ', angle);
      // console.log('TX: ', [dx, dy]);
      // console.log('rDiff: ', radiusDiff);

      // self.trigger('zoom');
      // self.fast_draw();

      self.draw(true);

      // DEBUG INFO
      if (self.debug) {
        if (self.debug.data.time) {
          self.debug.data.time['zoom'] = CGV.elapsed_time(start_time);
        }
        if (self.debug.data.zoom) {
          self.debug.data.zoom['scale'] = CGV.round(self._zoomFactor, 1);
        }
      }
    }

    function zoomend() {
      // self.svg.style('cursor', 'all-scroll');
      // self.trigger('zoom-end');
      // self.full_draw();
      self.draw();
    }
  }

})(CGView);


