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

      // self.layout.zoomDomains();
      // self._zoomFactor = d3.event.transform.k;

      // NOTE: to get/set d3 zoom level:
      // d3.zoomTransform(cgv.canvas.node('ui')).k


      // const pos = d3.mouse(self.canvas.node('ui'));
      // const mx = self.scale.x.invert(CGV.pixel(pos[0]));
      // const my = self.scale.y.invert(CGV.pixel(pos[1]));
      //
      // const radius = self.backbone.adjustedCenterOffset;
      // const angle = CGV.angleFromPosition(mx, my);
      //
      // self._zoomFactor = d3.event.transform.k;
      //
      // const radiusDiff = radius - self.backbone.adjustedCenterOffset;
      //
      // const dx = CGV.pixel(Math.cos(-angle) * radiusDiff);
      // const dy = CGV.pixel(Math.sin(-angle) * radiusDiff);
      //
      // const domainX = self.scale.x.domain();
      // const domainY = self.scale.y.domain();
      //
      // self.scale.x.domain([domainX[0] - dx, domainX[1] - dx]);
      // self.scale.y.domain([domainY[0] - dy, domainY[1] - dy]);


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


