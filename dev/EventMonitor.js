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
      this._initializeBookmarkShortcuts();
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
          this.viewer.debug.data.position.bp = CGV.commaNumber(e.bp);
          this.viewer.debug.data.position.element = e.element && e.element.name;
          this.viewer.debug.data.position.score = e.score;
          this.viewer.debug.draw();
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

    // FIXME: need to be able to turn this off
    // FIXME: there should be an option to turn this off, if it interferes with other program UI
    _initializeBookmarkShortcuts() {
      const ignoredTagsRegex = /^(input|textarea|select|button)$/i;
      document.addEventListener('keypress', (e) => {
        if (ignoredTagsRegex.test(e.target.tagName)) { return; }
        if (e.target.isContentEditable) { return; }
        const bookmark = this.viewer.bookmarkByShortcut(e.key);
        if (bookmark) {
          bookmark.moveTo();
          this.viewer.trigger('bookmarks-shortcut', bookmark);
        }
      });
    }

    _createEvent(d3Event) {
      if (this.viewer.loading) { return {}; }
      const scale = this.viewer.layout.scale;
      const canvasX = d3Event.offsetX;
      const canvasY = d3Event.offsetY;
      const mapX = scale.x.invert(canvasX);
      const mapY = scale.y.invert(canvasY);
      const centerOffset = this.viewer.layout.centerOffsetForPoint({x: canvasX, y: canvasY});
      const slot = this.viewer.layout.slotForCenterOffset(centerOffset);
      const bp = this.canvas.bpForPoint({x: canvasX, y: canvasY});

      const {elementType, element} = this._getElement(slot, bp, centerOffset);

      let score;
      if (elementType === 'plot') {
        score = element.scoreForPosition(bp).toFixed(2)
      } else {
        score = element && element.score;
      }

      return {
        bp: bp,
        centerOffset: centerOffset,
        slot: slot,
        elementType: elementType,
        element: element,
        score: score,
        canvasX: canvasX,
        canvasY: canvasY,
        mapX: mapX,
        mapY: mapY,
        d3: d3.event
      };
    }

    /**
     * Returns an object with the *element* and *elementType* for the given *slot*, *bp*, and *centerOffset*.
     * ElementType can be one of the following: 'plot', 'feature', 'label', 'legendItem', 'captionItem', 'contig', 'backbone'
     * @param {Slot}  slot - the slot for the event.
     * @param {Number}  bp - the bp for the event.
     * @param {Number}  centerOffset - the centerOffset for the event.
     *
     * @returns {Object} Obejct with properties: element and elementType
     */
    _getElement(slot, bp, centerOffset) {
      let elementType, element;
      if (slot) {

        // If mulitple features are returned, let's go with the smallest one
        const features = slot.findFeaturesForBp(bp);
        let feature = features[0];
        for (let i = 0, len = features.length; i < len; i++) {
          const currentFeature = features[i];
          if (currentFeature.length < feature.length) {
            feature = currentFeature;
          }
        }

        if (feature) {
          elementType = 'feature';
          element = feature;
        } else if (slot._plot) {
          elementType = 'plot';
          element = slot._plot;
        }
      } else if (this.viewer.backbone.containsCenterOffset(centerOffset)) {
        const backbone = this.viewer.backbone;
        const sequence = this.viewer.sequence;
        if (sequence.hasMultipleContigs) {
          elementType = 'contig';
          element = sequence.contigForBp(bp);
        } else {
          elementType = 'backbone';
          element = backbone;
        }
      }
      return {elementType: elementType, element: element};
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
              // legendItem.swatchColor = color.rgbaString;
              legendItem.update({swatchColor: color.rgbaString});
              viewer.drawFast();
              // viewer.trigger('legend-swatch-change', legendItem);
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


