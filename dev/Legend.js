//////////////////////////////////////////////////////////////////////////////
// Legend
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {
  /**
   * <br />
   * The *Legend* is a subclass of Caption with the ability to draw swatches beside items.
   * @extends Caption
   */
  class Legend extends CGV.CGObject {

    /**
     * Create a new Legend.
     *
     * @param {Legend} viewer - The parent *Viewer* for the *Legend*.
     * @param {Object} options - Options used to create the legend.
     *
     *  Option                | Default          | Description
     *  ----------------------|-------------------------------------------------
     *  position              | "upper-right"    | Where to draw the legend. One of "upper-left", "upper-center", "upper-right", "middle-left", "middle-center", "middle-right", "lower-left", "lower-center", or "lower-right".
     *  anchor                |                  | Where to anchor the caption box to the position {@link Anchor}
     *  defaultFont           | "SansSerif,plain,8" | A string describing the font. See {@link Font} for details.
     *  defaultFontColor      | "black"          | A string describing the color. See {@link Color} for details.
     *  textAlignment         | "left"           | *left*, *center*, or *right*
     *  backgroundColor       | Viewer backgroundColor | A string describing the color. See {@link Color} for details.
     *
     * @param {Object=} meta - User-defined key:value pairs to add to the legend.
     */
    constructor(viewer, options = {}, meta = {}) {
      super(viewer, options, meta);
      this._items = new CGV.CGArray();
      this.backgroundColor = options.backgroundColor;
      // FIXME: start using defaultFontColor, etc from JSON
      this.defaultFontColor = CGV.defaultFor(options.defaultFontColor, 'black');
      this.textAlignment = CGV.defaultFor(options.textAlignment, 'left');
      this.box = new CGV.Box(viewer, {
        position: CGV.defaultFor(options.position, 'top-right'),
        anchor: CGV.defaultFor(options.anchor, 'middle-center')
      });
      // Setting font will refresh legend and draw
      this.defaultFont = CGV.defaultFor(options.defaultFont, 'sans-serif, plain, 14');

      this.viewer.trigger('legend-update', { attributes: this.toJSON({includeDefaults: true}) });

      if (options.items) {
        this.addItems(options.items);
      }
      // FIXME: should be done whenever an item is added
      this.refresh();
    }

    /**
     * Return the class name as a string.
     * @return {String} - 'Legend'
     */
    toString() {
      return 'Legend';
    }

    get visible() {
      return this._visible;
    }

    set visible(value) {
      // super.visible = value;
      this._visible = value;
      this.viewer.refreshCanvasLayer();
      // this.refresh();
    }

    /**
     * @member {Context} - Get the *Context* for drawing.
     */
    // FIXME: 
    // - if this is slow we could be set when setting "on" (e.g. this._ctx = ...)
    get ctx() {
      // return this._ctx || this.canvas.context('forground');
      const layer = (this.on === 'map') ? 'foreground' : 'canvas';
      return this.canvas.context(layer);
    }
    //
    // /**
    //  * @member {String} - Alias for getting the position. Useful for querying CGArrays.
    //  */
    // get id() {
    //   return this.position;
    // }

    get position() {
      return this.box.position;
    }

    set position(value) {
      this.clear();
      this.box.position = value;
      this.viewer.refreshCanvasLayer();
      // this.refresh();
    }

    get on() {
      return this.box.on;
    }

    set on(value) {
      this.clear();
      this.box.on = value;
      this.refresh();
    }

    get anchor() {
      return this.box.anchor;
    }

    set anchor(value) {
      this.clear();
      this.box.anchor = value;
      this.refresh();
    }

    /**
     * @member {Color} - Get or set the backgroundColor. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
     */
    get backgroundColor() {
      // TODO set to cgview background color if not defined
      return this._backgroundColor;
    }

    set backgroundColor(color) {
      // this._backgroundColor.color = color;
      if (color === undefined) {
        this._backgroundColor = this.viewer.settings.backgroundColor;
      } else if (color.toString() === 'Color') {
        this._backgroundColor = color;
      } else {
        this._backgroundColor = new CGV.Color(color);
      }
      this.refresh();
    }

    /**
     * @member {Font} - Get or set the default font. When setting the font, a string representing the font or a {@link Font} object can be used. For details see {@link Font}.
     */
    get defaultFont() {
      return this._defaultFont;
    }

    set defaultFont(value) {
      if (value.toString() === 'Font') {
        this._defaultFont = value;
      } else {
        this._defaultFont = new CGV.Font(value);
      }

      // Trigger update events for items with default font
      for (let i = 0, len = this._items.length; i < len; i++) {
        const item = this._items[i];
        if (item.usingDefaultFont) {
          item.update({font: undefined});
        }
      }

      this.refresh();
    }

    /**
     * @member {Color} - Get or set the defaultFontColor. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
     */
    get defaultFontColor() {
      // return this._fontColor.rgbaString;
      return this._defaultFontColor;
    }

    set defaultFontColor(value) {
      if (value.toString() === 'Color') {
        this._defaultFontColor = value;
      } else {
        this._defaultFontColor = new CGV.Color(value);
      }

      // Trigger update events for items with default font color
      for (let i = 0, len = this._items.length; i < len; i++) {
        const item = this._items[i];
        if (item.usingDefaultFontColor) {
          item.update({fontColor: undefined});
        }
      }

      this.refresh();
    }

    /**
     * @member {String} - Get or set the text alignment. Possible values are *left*, *center*, or *right*.
     */
    get textAlignment() {
      return this._textAlignment;
    }

    set textAlignment(value) {
      if ( CGV.validate(value, ['left', 'center', 'right']) ) {
        this._textAlignment = value;
      }
      this.refresh();
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

    update(attributes) {
      this.viewer.updateRecords(this, attributes, {
        recordClass: 'Legend',
        validKeys: ['on', 'position', 'anchor', 'defaultFont', 'defaultFontColor', 'textAlignment',  'backgroundColor', 'visible']
      });
      this.viewer.trigger('legend-update', { attributes });
    }

    /**
     * @member {CGArray} - Get the *CaptionItems*
     */
    items(term) {
      return this._items.get(term);
    }

    /**
     * @member {CGArray} - Get the *CaptionItems*
     */
    visibleItems(term) {
      return this._items.filter( i => i.visible ).get(term);
    }

    addItems(itemData = []) {
      itemData = CGV.CGArray.arrayerize(itemData);
      const items = itemData.map( (data) => new CGV.LegendItem(this, data));
      this.viewer.trigger('legendItems-add', items);
      return items;
    }

    removeItems(items) {
      items = CGV.CGArray.arrayerize(items);
      this._items = this._items.filter( i => !items.include(i) );
      this.viewer.clear('canvas');
      this.viewer.refreshCanvasLayer();
      // Remove from Objects
      items.forEach( i => i.deleteFromObjects() );
      this.viewer.trigger('legendItems-remove', items);
    }

    updateItems(itemsOrUpdates, attributes) {
      const { records: items, updates } = this.viewer.updateRecords(itemsOrUpdates, attributes, {
        recordClass: 'LegendItem',
        validKeys: ['name', 'font', 'fontColor', 'drawSwatch',  'swatchColor', 'decoration', 'visible']
      });
      this.viewer.trigger('legendItems-update', { items, attributes, updates });
    }

    moveItem(oldIndex, newIndex) {
      this._items.move(oldIndex, newIndex);
      this.viewer.trigger('legendItems-moved', {oldIndex: oldIndex, newIndex: newIndex});
      this.refresh();
    }

    moveTo(duration) {
      this.position.moveTo(duration);
    }

    /**
     * Recalculates the *Legend* size and position.
     */
    refresh() {
      const box = this.box;
      if (!box) { return; }
      this.clear();

      let height = 0;
      let maxHeight = 0;

      const visibleItems = this.visibleItems();
      for (let i = 0, len = visibleItems.length; i < len; i++) {
        const item = visibleItems[i];
        const itemHeight = item.height;
        height += itemHeight;
        if (i < len - 1) {
          // Add spacing
          height += (itemHeight / 2);
        }
        if (itemHeight > maxHeight) {
          maxHeight = itemHeight;
        }
      }

      box.padding = maxHeight / 2;
      height += box.padding * 2;

      // Calculate Legend Width
      const itemFonts = visibleItems.map( i => i.font.css );
      const itemNames = visibleItems.map( i => i.name );
      const itemWidths = CGV.Font.calculateWidths(this.ctx, itemFonts, itemNames);
      for (let i = 0, len = itemWidths.length; i < len; i++) {
        const item = visibleItems[i];
        if (item.drawSwatch) {
          itemWidths[i] += item.height + (box.padding / 2);
        }
        item._width = itemWidths[i];
      }
      const width = d3.max(itemWidths) + (box.padding * 2);

      box.resize(width, height);

      this.draw();
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
      const originX = this.box.x + viewerRect.left + window.pageXOffset;
      const originY = this.box.y + viewerRect.top + window.pageYOffset;
      const legendWidth = this.width;
      if (/-left$/.exec(this.position)) {
        pos = {x: originX + legendWidth + margin, y: originY};
      } else {
        pos = {x: originX - cp.width - margin, y: originY};
      }
      cp.setPosition(pos);
    }

    get swatchPadding() {
      return this.box.padding / 2;
    }

    fillBackground() {
      const box = this.box;
      this.ctx.fillStyle = this.backgroundColor.rgbaString;
      this.clear();
      this.ctx.fillRect(box.x, box.y, box.width, box.height);
    }

    invertColors() {
      this.update({
        backgroundColor: this.backgroundColor.invert().rgbaString,
        defaultFontColor: this.defaultFontColor.invert().rgbaString
      });
      this.items().each( (i, item) => item.invertColors() );
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
        item = this.addItems({
          name: name,
          swatchColor: color,
          decoration: decoration
        })[0];
      }
      return item;
    }

    // Returns a CGArray of LegendItems that only occur for the supplied features.
    // (i.e. the returned LegendItems are not being used for any features (or plots) not provided.
    // This is useful for determining if LegendItems should be deleted after deleting features.
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

    clear() {
      this.box.clear(this.ctx);
    }

    draw() {
      if (!this.visible) { return; }
      const ctx = this.ctx;

      // Update the box origin if relative to the map
      this.box.refresh();

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

    toJSON(options = {}) {
      const json = {
        name: this.name,
        position: this.position.toJSON(options),
        textAlignment: this.textAlignment,
        defaultFont: this.defaultFont.string,
        defaultFontColor: this.defaultFontColor.rgbaString,
        backgroundColor: this.backgroundColor.rgbaString,
        items: []
      };
      if (this.position.onMap) {
        json.anchor = this.anchor.toJSON(options);
      }
      // Optionally add default values
      if (!this.visible || options.includeDefaults) {
        json.visible = this.visible;
      }
      this.items().each( (i, item) => {
        json.items.push(item.toJSON(options));
      });
      return json;
    }

  }

  CGV.Legend = Legend;
})(CGView);
