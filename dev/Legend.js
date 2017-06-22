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
      this.name = 'Legend'
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
      return this._viewer
    }

    set viewer(viewer) {
      this._viewer = viewer;
    }

    /**
     * @member {LegendItem} - Get or set the selected swatch legendItem
     */
    get selectedSwatchedItem() {
      return this._selectedSwatchedItem
    }

    set selectedSwatchedItem(value) {
      this._selectedSwatchedItem = value;
    }

    /**
     * @member {LegendItem} - Get or set the highlighted swatch legendItem
     */
    get highlightedSwatchedItem() {
      return this._highlightedSwatchedItem
    }

    set highlightedSwatchedItem(value) {
      this._highlightedSwatchedItem = value;
    }

    // Legend is in Canvas space (need to consider pixel ratio) but colorPicker is not.
    setColorPickerPosition(cp) {
      var margin = 5;
      var pos;
      var viewerRect = this.viewer._container.node().getBoundingClientRect();
      var originX = this.originX / CGV.pixel(1) + viewerRect.left + window.pageXOffset;
      var originY = this.originY / CGV.pixel(1) + viewerRect.top + window.pageYOffset;
      var legendWidth = this.width / CGV.pixel(1);
      if (/-left$/.exec(this.position)) {
        pos = {x: originX + legendWidth + margin, y: originY}
      } else {
        pos = {x: originX - cp.width - margin, y: originY}
      }
      cp.setPosition(pos);
    }

    get swatchPadding() {
      return this.padding / 2
    }

    findLegendItemByName(name) {
      if (!name) { return }
      return this._items.find( (i) => { return name.toLowerCase() == i.name.toLowerCase() });
    }

    findLegendItemOrCreate(name = 'Unknown', color = 'black', decoration = 'arc') {
      var item = this.findLegendItemByName(name);
      if (!item) {
        item = new CGV.LegendItem(this, {
          name: name,
          swatchColor: color,
          decoration: decoration
        });
      }
      return item
    }

    draw() {
      if (!this.visible) { return }
      var ctx = this.ctx;
      this.fillBackground();
      var textX, swatchX;
      ctx.lineWidth = 1;
      ctx.textBaseline = 'top';
      for (var i = 0, len = this._items.length; i < len; i++) {
        var legendItem = this._items[i];
        if (!legendItem.visible) { continue }
        var y = legendItem.textY();
        var legendItemHeight = legendItem.height;
        var drawSwatch = legendItem.drawSwatch;
        var swatchWidth = legendItem.swatchWidth;
        ctx.font = legendItem.font.css;
        ctx.textAlign = legendItem.textAlignment;
        if (drawSwatch) {
          // Swatch border color
          if (legendItem.swatchSelected) {
            ctx.strokeStyle = 'black';
          } else if (legendItem.swatchHighlighted) {
            ctx.strokeStyle = 'grey';
          } else {
            ctx.strokeStyle = this.backgroundColor.rgbaString;
          }
          // Draw box around Swatch depending on state
          var border = CGV.pixel(2)
          var swatchX = legendItem.swatchX();
          ctx.strokeRect(swatchX - border, y - border, swatchWidth + (border * 2), swatchWidth + (border * 2));
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
