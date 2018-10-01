//////////////////////////////////////////////////////////////////////////////
// EventMonitor
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {
  /**
   * <br />
   * EventMonitor monitor events on the CGView Canvas and triggers events.
   */
  class EventMonitor {

    constructor(viewer) {
      this._viewer = viewer;

      // Setup Events on the viewer
      this.events = viewer.events;

      this._initializeMousemove();
      this._initializeClick();
      // this.events.on('mousemove', (e) => {console.log(e.bp)})
      this.events.on('click', (e) => {console.log(e);});
      // MoveTo On click
      // this.events.on('click', (e) => {
      //   if (e.feature) {
      //     this.viewer.moveTo(e.feature.start, e.feature.stop);
      //   }
      // })

      this.events.on('mousemove', (e) => {
        if (this.viewer.debug && this.viewer.debug.data.position) {
          this.viewer.debug.data.position.xy = `${Math.round(e.mapX)}, ${Math.round(e.mapY)}`;
          this.viewer.debug.data.position.bp = e.bp;
          this.viewer.debug.data.position.feature = e.feature && e.feature.label.name;
          this.viewer.debug.data.position.score = e.score;
          this.canvas.clear('ui');
          this.viewer.debug.draw(this.canvas.context('ui'));
        }
      });

      this._legendSwatchClick();
      this._legendSwatchMouseOver();
      // this._highlighterMouseOver();
    }

    /**
     * @member {Viewer} - Get the *Viewer*
     */
    get viewer() {
      return this._viewer;
    }

    /**
     * @member {Canvas} - Get the *Canvas*
     */
    get canvas() {
      return this.viewer.canvas;
    }

    _initializeMousemove() {
      const viewer = this.viewer;
      d3.select(this.canvas.node('ui')).on('mousemove.cgv', () => {
        viewer.clear('ui');
        this.events.trigger('mousemove', this._createEvent(d3.event));
      });
    }
    _initializeClick() {
      d3.select(this.canvas.node('ui')).on('click.cgv', () => {
        // event = {d3: d3.event, canvasX: d3.event.x, canvasY: d3.event.y}
        this.events.trigger('click', this._createEvent(d3.event));
      });
    }

    _createEvent(d3Event) {
      const scale = this.layout.scale;
      const canvasX = d3Event.offsetX;
      const canvasY = d3Event.offsetY;
      const mapX = scale.x.invert(canvasX);
      const mapY = scale.y.invert(canvasY);
      const centerOffset = this.viewer.layout.centerOffsetForPoint({x: canvasX, y: canvasY});
      const slot = this.viewer.layout.slotForCenterOffset(centerOffset);
      const bp = this.canvas.bpForPoint({x: canvasX, y: canvasY});
      const feature = slot && slot.findFeaturesForBp(bp)[0];
      const plot = slot && slot._plot;
      const score = plot && plot.scoreForPosition(bp).toFixed(2);
      return {
        bp: bp,
        centerOffset: centerOffset,
        slot: slot,
        feature: feature,
        plot: plot,
        score: score,
        canvasX: canvasX,
        canvasY: canvasY,
        mapX: mapX,
        mapY: mapY,
        d3: d3.event
      };
    }

    _legendSwatchClick() {
      const viewer = this.viewer;
      this.events.on('click.swatch', (e) => {
        const legend = viewer.legend;
        const swatchedLegendItems = legend.visibleItems();
        for (let i = 0, len = swatchedLegendItems.length; i < len; i++) {
          if ( swatchedLegendItems[i]._swatchContainsPoint( {x: e.canvasX, y: e.canvasY} ) ) {
            const legendItem = swatchedLegendItems[i];
            legendItem.swatchSelected = true;
            const cp = viewer.colorPicker;
            if (!cp.visible) {
              legend.setColorPickerPosition(cp);
            }
            cp.onChange = function(color) {
              legendItem.swatchColor = color.rgbaString;
              viewer.drawFast();
              viewer.trigger('legend-swatch-change', legendItem);
            };
            cp.onClose = function() {
              legendItem.swatchSelected = false;
              viewer.drawFull();
              legend.draw();
            };
            cp.setColor(legendItem._swatchColor.rgba);
            cp.open(legendItem);
            break;
          }
        }
      });
    }

    _legendSwatchMouseOver() {
      const viewer = this.viewer;
      this.events.on('mousemove.swatch', (e) => {
        const legend = viewer.legend;
        const swatchedLegendItems = legend.visibleItems();
        const oldHighlightedItem = legend.highlightedSwatchedItem;
        legend.highlightedSwatchedItem = undefined;
        for (let i = 0, len = swatchedLegendItems.length; i < len; i++) {
          if ( swatchedLegendItems[i]._swatchContainsPoint( {x: e.canvasX, y: e.canvasY} ) ) {
            const legendItem = swatchedLegendItems[i];
            legendItem.swatchHighlighted = true;
            this.canvas.cursor = 'pointer';
            legend.draw();
            break;
          }
        }
        // No swatch selected
        if (oldHighlightedItem && !legend.highlightedSwatchedItem) {
          this.canvas.cursor = 'auto';
          legend.draw();
        }
      });
    }

  }

  CGV.EventMonitor = EventMonitor;
})(CGView);


