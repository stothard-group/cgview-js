//////////////////////////////////////////////////////////////////////////////
// Initializing Zooming
//////////////////////////////////////////////////////////////////////////////

import utils from './Utils';
import * as d3 from 'd3';

// NOTE: this method is now directly in Viewer
// CGV.Viewer.prototype._updateZoomMax = function() {
//   if (this._zoom) {
//     this._zoom.scaleExtent([this.minZoomFactor, this.maxZoomFactor]);
//   }
// };

/**
 * Add zoom/drag abilities to the Viewer map
 * @private
 */
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

  function zooming(d3Event) {
    const startTime = new Date().getTime();
    // console.log(d3Event)
    // console.log(viewer.mouse)
    // const bp = viewer.canvas.bpForMouse();
    let bp;
    if (d3Event?.sourceEvent?.offsetX) {
      const sourceEvent = d3Event.sourceEvent;
      bp = viewer.canvas.bpForPoint({x: sourceEvent.offsetX, y: sourceEvent.offsetY});
    } else {
      bp = viewer.canvas.bpForMouse();
    }

    const dx = d3Event.transform.x - panX;
    const dy = d3Event.transform.y - panY;
    panX = d3Event.transform.x;
    panY = d3Event.transform.y;
    // Only translate of not Zooming
    if (viewer.zoomFactor === d3Event.transform.k) {
      viewer.layout.translate(dx, dy);
    }

    viewer.layout.zoom(d3Event.transform.k, bp);

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


