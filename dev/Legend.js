//////////////////////////////////////////////////////////////////////////////
// Legend
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {
  /**
   * <br />
   * The *Legend* is a subclass of Caption with the ability to draw swatches beside items.
   * @extends Caption
   */
  class Legend extends CGV.Caption {

    /**
     * Create a new Legend.
     *
     * @param {Legend} viewer - The parent *Viewer* for the *Legend*.
     * @param {Object} data - Data used to create the legend.
     *
     *  Option                | Default          | Description
     *  ----------------------|-------------------------------------------------
     *  position              | "upper-right"    | Where to draw the legend. One of "upper-left", "upper-center", "upper-right", "middle-left", "middle-center", "middle-right", "lower-left", "lower-center", or "lower-right".
     *  font                  | "SansSerif,plain,8" | A string describing the font. See {@link Font} for details.
     *  fontColor             | "black"          | A string describing the color. See {@link Color} for details.
     *  textAlignment         | "left"           | *left*, *center*, or *right*
     *  backgroundColor        | Viewer backgroundColor | A string describing the color. See {@link Color} for details.
     *
     * @param {Object=} meta - User-defined key:value pairs to add to the legend.
     */
    constructor(viewer, data = {}, meta = {}) {
      super(viewer, data, meta);
      this.name = 'Legend';
    }

    /**
     * Return the class name as a string.
     * @return {String} - 'Legend'
     */
    toString() {
      return 'Legend';
    }

    /**
     * @member {Viewer} - Get or set the *Viewer*
     */
    get viewer() {
      return this._viewer;
    }

    set viewer(viewer) {
      this._viewer = viewer;
    }

    /**
     * @member {LegendItem} - Get or set the selected swatch legendItem
     */
    get selectedSwatchedItem() {
      return this._selectedSwatchedItem;
    }

    set selectedSwatchedItem(value) {
      this._selectedSwatchedItem = value;
    }

    /**
     * @member {LegendItem} - Get or set the highlighted swatch legendItem
     */
    get highlightedSwatchedItem() {
      return this._highlightedSwatchedItem;
    }

    set highlightedSwatchedItem(value) {
      this._highlightedSwatchedItem = value;
    }

    // Legend is in Canvas space (need to consider pixel ratio) but colorPicker is not.
    setColorPickerPosition(cp) {
      const margin = 5;
      let pos;
      let viewerRect = {top: 0, left: 0};
      // FIXME: this needs to be improved (also in Highlighter)
      // if (this.viewer._container.style('position') !== 'fixed') {
      //   viewerRect = this.viewer._container.node().getBoundingClientRect();
      // }
      const originX = this.originX + viewerRect.left + window.pageXOffset;
      const originY = this.originY + viewerRect.top + window.pageYOffset;
      const legendWidth = this.width;
      if (/-left$/.exec(this.position)) {
        pos = {x: originX + legendWidth + margin, y: originY};
      } else {
        pos = {x: originX - cp.width - margin, y: originY};
      }
      cp.setPosition(pos);
    }

    get swatchPadding() {
      return this.padding / 2;
    }

    updateItems(items, attributes) {
      const validKeys = ['name', 'drawSwatch', 'font', 'fontColor', 'swatchColor', 'decoration'];
      return this.updateItemsBase(validKeys, items, attributes);
    }

    findLegendItemByName(name) {
      if (!name) { return; }
      return this._items.find( i => name.toLowerCase() === i.name.toLowerCase() );
    }

    findLegendItemOrCreate(name = 'Unknown', color = null, decoration = 'arc') {
      let item = this.findLegendItemByName(name);
      if (!item) {
        if (!color) {
          const currentColors = this._items.map( i => i.swatchColor );
          // color = CGV.Color.getColor(currentColors);
          color = CGV.Color.getColor(currentColors).rgbaString;
        }
        item = new CGV.LegendItem(this, {
          name: name,
          swatchColor: color,
          decoration: decoration
        });
      }
      return item;
    }

    // Returns a CGArray of LegendItems that only occur for the supplied features.
    // (i.e. the returned LegendItems are not being used for any features (or plots) not provided.
    // This is useful for determining of LegendItems should be deleted after deleting features.
    uniqueLegendsItemsFor(options = {}) {
      const selectedFeatures = new Set(options.features || []);
      const selectedPlots = new Set(options.plots || []);
      const uniqueItems = new Set();

      selectedFeatures.forEach( (f) => {
        uniqueItems.add(f.legend);
      });
      selectedPlots.forEach( (p) => {
        uniqueItems.add(p.legendItemPositive);
        uniqueItems.add(p.legendItemNegative);
      });

      const nonSelectedFeatures = new Set();
      this.viewer.features().each( (i, f) => {
        if (!selectedFeatures.has(f)) {
          nonSelectedFeatures.add(f);
        }
      });
      const nonSelectedPlots = new Set();
      this.viewer.plots().each( (i, p) => {
        if (!selectedPlots.has(p)) {
          nonSelectedPlots.add(p);
        }
      });

      nonSelectedFeatures.forEach( (f) => {
        if (uniqueItems.has(f.legend)) {
          uniqueItems.delete(f.legend);
        }
      });
      nonSelectedPlots.forEach( (p) => {
        if (uniqueItems.has(p.legendItemPositive)) {
          uniqueItems.delete(p.legendItemPositive);
        }
        if (uniqueItems.has(p.legendItemNegative)) {
          uniqueItems.delete(p.legendItemNegative);
        }
      });
      return Array.from(uniqueItems);
    }

    draw() {
      if (!this.visible) { return; }
      const ctx = this.ctx;
      this.fillBackground();
      let swatchX;
      ctx.lineWidth = 1;
      ctx.textBaseline = 'top';
      for (let i = 0, len = this._items.length; i < len; i++) {
        const legendItem = this._items[i];
        if (!legendItem.visible) { continue; }
        const y = legendItem.textY();
        const drawSwatch = legendItem.drawSwatch;
        const swatchWidth = legendItem.swatchWidth;
        ctx.font = legendItem.font.css;
        ctx.textAlign = legendItem.textAlignment;
        if (drawSwatch) {
          // Swatch border color
          if (legendItem.swatchSelected) {
            ctx.strokeStyle = 'black';
          } else if (legendItem.swatchHighlighted) {
            ctx.strokeStyle = 'grey';
          }
          // Draw box around Swatch depending on state
          swatchX = legendItem.swatchX();
          if (legendItem.swatchSelected || legendItem.swatchHighlighted) {
            const border = 2;
            ctx.strokeRect(swatchX - border, y - border, swatchWidth + (border * 2), swatchWidth + (border * 2));
          }
          // Draw Swatch
          ctx.fillStyle = legendItem.swatchColor.rgbaString;
          ctx.fillRect(swatchX, y, swatchWidth, swatchWidth);
        }
        // Draw Text Label
        ctx.fillStyle = legendItem.fontColor.rgbaString;
        ctx.fillText(legendItem.name, legendItem.textX(), y);
      }
    }

  }

  CGV.Legend = Legend;
})(CGView);
