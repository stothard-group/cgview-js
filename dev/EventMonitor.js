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
      // var events = new CGV.Events();
      this.events = viewer.events;
      // viewer._events = events;
      // viewer.on = events.on;
      // viewer.off = events.off;
      // viewer.trigger = events.trigger;
      // viewer.events = events;

      this._initializeMousemove();
      this._initializeClick();
      // this.events.on('mousemove', (e) => {console.log(e.bp)})
      this.events.on('click', (e) => {console.log(e)})

      this.events.on('mousemove', (e) => {
        // console.log(e.bp);
        // console.log([e.mapX, e.mapY]);
        if (this.viewer.debug && this.viewer.debug.data.position) {
          this.viewer.debug.data.position['xy'] = Math.round(e.mapX) + ', ' + Math.round(e.mapY);
          this.viewer.debug.data.position['bp'] = e.bp;
          this.viewer.debug.data.position['feature'] = e.feature && e.feature.label.name;
          this.viewer.debug.data.position['score'] = e.score;
          this.canvas.clear('ui');
          this.viewer.debug.draw(this.canvas.context('ui'));
        }
      });

      this._legendSwatchClick();
      this._legendSwatchMouseOver();
      this._highlighterMouseOver();
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
      var viewer = this.viewer;
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

    _createEvent(d3_event) {
      var scale = this.canvas.scale;
      var canvasX = CGV.pixel(d3_event.offsetX);
      var canvasY = CGV.pixel(d3_event.offsetY);
      var mapX = scale.x.invert(canvasX);
      var mapY = scale.y.invert(canvasY);
      var radius = Math.sqrt( mapX*mapX + mapY*mapY);
      var slot = this.viewer.layout.slotForRadius(radius);
      var bp = this.canvas.bpForPoint({x: mapX, y: mapY});
      var feature = slot && slot.findFeaturesForBp(bp)[0];
      var plot = slot && slot._plot;
      var score = plot && plot.scoreForPosition(bp).toFixed(2);
      return {
        bp: bp,
        radius: radius,
        slot: slot,
        feature: feature,
        plot: plot,
        score: score,
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
        var legend = viewer.legend;
        var swatchedLegendItems = legend.visibleItems();
        for (var i = 0, len = swatchedLegendItems.length; i < len; i++) {
          if ( swatchedLegendItems[i]._swatchContainsPoint( {x: e.canvasX, y: e.canvasY} ) ) {
            var legendItem = swatchedLegendItems[i];
            legendItem.swatchSelected = true
            var cp = viewer.colorPicker;
            if (!cp.visible) {
              legend.setColorPickerPosition(cp);
            }
            cp.onChange = function(color) {
              legendItem.swatchColor = color.rgbaString;
              cgv.drawFast();
            };
            cp.onClose = function() {
              legendItem.swatchSelected = false;
              cgv.drawFull();
              legend.draw();
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
        var legend = viewer.legend;
        var swatchedLegendItems = legend.visibleItems();
        var oldHighlightedItem = legend.highlightedSwatchedItem;
        legend.highlightedSwatchedItem = undefined;
        for (var i = 0, len = swatchedLegendItems.length; i < len; i++) {
          if ( swatchedLegendItems[i]._swatchContainsPoint( {x: e.canvasX, y: e.canvasY} ) ) {
            var legendItem = swatchedLegendItems[i];
            legendItem.swatchHighlighted = true
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

    _highlighterMouseOver() {
      var viewer = this.viewer;
      var highlighter = viewer.highlighter;
      this.events.on('mousemove.highlighter', (e) => {
        if (e.feature) {
          e.feature.highlight(e.slot);
        } else if (e.plot) {
          var score = e.plot.scoreForPosition(e.bp);
          if (score) {
            var startIndex = CGV.indexOfValue(e.plot.positions, e.bp, false);
            var start = e.plot.positions[startIndex];
            var stop = e.plot.positions[startIndex + 1] || viewer.sequence.length;
            var baselineRadius = e.slot.radius - (e.slot.thickness / 2) + (e.slot.thickness * e.plot.baseline);
            var scoredRadius = baselineRadius + (score - e.plot.baseline) * e.slot.thickness;
            var thickness = Math.abs(baselineRadius - scoredRadius);
            var radius = Math.min(baselineRadius, scoredRadius) + (thickness / 2);
            var color = (score >= e.plot.baseline) ? e.plot.colorPositive.copy() : e.plot.colorNegative.copy();
            color.highlight();

            viewer.canvas.drawArc('ui', start, stop, radius, color, thickness);
          }

        }
      });
    }

  }

  CGV.EventMonitor = EventMonitor;

})(CGView);


