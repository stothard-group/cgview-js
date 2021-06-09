//////////////////////////////////////////////////////////////////////////////
// Initializing Zooming
//////////////////////////////////////////////////////////////////////////////

import utils from './Utils';

// NOTE: this method is now directly in Viewer
// CGV.Viewer.prototype._updateZoomMax = function() {
//   if (this._zoom) {
//     this._zoom.scaleExtent([this.minZoomFactor, this.maxZoomFactor]);
//   }
// };

export default function initializeZooming(viewer) {
  const zoomMax = viewer.backbone.maxZoomFactor();
  viewer._zoom = d3.zoom()
    .scaleExtent([1, zoomMax])
    .on('start', zoomstart)
    .on('zoom',  zooming)
    .on('end',   zoomend);
  d3.select(viewer.canvas.node('ui')).call(viewer._zoom)
    .on('dblclick.zoom', null);

  // Keep track of pan/translate changes
  let panX = 0;
  let panY = 0;

  function zoomstart() {
    viewer.trigger('zoom-start');
    viewer.highlighter.hidePopoverBox();
  }

  function zooming() {
    const startTime = new Date().getTime();

    const bp = viewer.canvas.bpForMouse();

    const dx = d3.event.transform.x - panX;
    const dy = d3.event.transform.y - panY;
    panX = d3.event.transform.x;
    panY = d3.event.transform.y;
    // Only translate of not Zooming
    if (viewer.zoomFactor === d3.event.transform.k) {
      viewer.layout.translate(dx, dy);
    }

    viewer.layout.zoom(d3.event.transform.k, bp);

    viewer.drawFast();
    viewer.trigger('zoom');

    // DEBUG INFO
    if (viewer.debug) {
      if (viewer.debug.data.time) {
        viewer.debug.data.time.zoom = utils.elapsedTime(startTime);
      }
      if (viewer.debug.data.zoom) {
        viewer.debug.data.zoom.scale = utils.round(viewer._zoomFactor, 1);
      }
    }
  }

  function zoomend() {
    viewer.trigger('zoom-end');
    viewer.drawFull();
  }
};


