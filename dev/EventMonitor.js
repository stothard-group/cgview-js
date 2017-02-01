//////////////////////////////////////////////////////////////////////////////
// EventMonitor
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * EventMonitor monitor events on the CGView Canvas and triggers events.
   */
  class EventMonitor {

    constructor(viewer) {
      this._viewer = viewer;

      // Setup Events on the viewer
      var events = new CGV.Events();
      this.events = events;
      // viewer._events = events;
      // viewer.on = events.on;
      // viewer.off = events.off;
      // viewer.trigger = events.trigger;

      this._initializeMousemove();
      this._initializeClick();
      this.events.on('mousemove', (e) => {console.log(e.bp)})
      this.events.on('click', (e) => {console.log(e)})

      this.events.on('mousemove', (e) => {
        // console.log(e.bp);
        // console.log([e.mapX, e.mapY]);
        if (this.debug && this.debug.data.position) {
          this.debug.data.position['xy'] = e.mapX + ', ' + e.mapY;
          this.debug.data.position['bp'] = e.bp;
        }
      });

      this._legendSwatchClick();
      this._legendSwatchMouseOver();

    }

    /**
     * @member {Viewer} - Get the *Viewer*
     */
    get viewer() {
      return this._viewer
    }

    /**
     * @member {Canvas} - Get the *Canvas*
     */
    get canvas() {
      return this.viewer.canvas
    }

    _initializeMousemove() {
      d3.select(this.canvas.canvasNode).on('mousemove.cgv', () => {
        this.events.trigger('mousemove', this._createEvent(d3.event));
      });
    }
    _initializeClick() {
      d3.select(this.canvas.canvasNode).on('click.cgv', () => {
        event = {d3: d3.event, canvasX: d3.event.x, canvasY: d3.event.y}
        this.events.trigger('click', this._createEvent(d3.event));
      });
    }

    _createEvent(d3_event) {
      var scale = this.canvas.scale;
      var canvasX = CGV.pixel(d3_event.offsetX);
      var canvasY = CGV.pixel(d3_event.offsetY);
      var mapX = scale.x.invert(canvasX);
      var mapY = scale.y.invert(canvasY);
      var radius = Math.sqrt( mapX*mapX + mapY*mapY);
      return {
        bp: this.canvas.bpForPoint({x: mapX, y: mapY}),
        radius: radius,
        canvasX: canvasX,
        canvasY: canvasY,
        mapX: mapX,
        mapY: mapY,
        d3: d3.event
      }
    }

    _legendSwatchClick() {
      var viewer = this.viewer;
      this.events.on('click.swatch', (e) => {
        var swatchedLegendItems = viewer.swatchedLegendItems();
        for (var i = 0, len = swatchedLegendItems.length; i < len; i++) {
          if ( swatchedLegendItems[i]._swatchContainsPoint( {x: e.canvasX, y: e.canvasY} ) ) {
            var legendItem = swatchedLegendItems[i];
            // Clear previous selections
            for (var j = 0, len = swatchedLegendItems.length; j < len; j++) {
              swatchedLegendItems[j].swatchSelected = false;
            }
            legendItem.swatchSelected = true;
            var cp = viewer.colorPicker;
            if (!cp.visible) {
              legendItem.legend.setColorPickerPosition(cp);
            }
            cp.onChange = function(color) {
              legendItem.swatchColor = color.rgbaString;
              cgv.draw_fast();
            };
            cp.onClose = function() {
              legendItem.swatchSelected = false;
              cgv.draw_fast();
            };
            cp.setColor(legendItem._swatchColor.rgba);
            cp.open();
            break;
          }
        }
      });
    }

    _legendSwatchMouseOver() {
      var viewer = this.viewer;
      this.events.on('mousemove.swatch', (e) => {
        var swatchedLegendItems = viewer.swatchedLegendItems();
        var _swatchHighlighted = false;
        for (var i = 0, len = swatchedLegendItems.length; i < len; i++) {
          if ( swatchedLegendItems[i]._swatchContainsPoint( {x: e.canvasX, y: e.canvasY} ) ) {
            var legendItem = swatchedLegendItems[i];
            // Clear previous selections
            for (var j = 0, len = swatchedLegendItems.length; j < len; j++) {
              swatchedLegendItems[j].swatchHighlighted = false;
            }
            _swatchHighlighted = true;
            legendItem.swatchHighlighted = true;
            this.canvas.cursor = 'pointer';
            legendItem.legend.draw(this.canvas.ctx);
            break;
          }
        }
        // No swatch selected
        if (!_swatchHighlighted) {
          for (var i = 0, len = swatchedLegendItems.length; i < len; i++) {
            var legendItem = swatchedLegendItems[i];
            if (legendItem.swatchHighlighted) {
              legendItem.swatchHighlighted = false;
              this.canvas.cursor = 'auto';
              legendItem.legend.draw(this.canvas.ctx);
              break;
            }
          }
        }
      });
    }

  }

  CGV.EventMonitor = EventMonitor;

})(CGView);


