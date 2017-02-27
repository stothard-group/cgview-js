//////////////////////////////////////////////////////////////////////////////
// Legend
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * <br />
   * The *Legend* is a subclass of Legend with the ability to draw swatches beside items.
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
      super(viewer);
      this.meta = CGV.merge(data.meta, meta);
      this._legendItems = new CGV.CGArray();
      this._position = CGV.defaultFor(data.position, 'upper-right');
      this.backgroundColor = data.backgroundColor;
      this.font = CGV.defaultFor(data.font, 'SansSerif, plain, 8');
      this.fontColor = CGV.defaultFor(data.fontColor, 'black');
      this.textAlignment = CGV.defaultFor(data.textAlignment, 'left');

      if (data.legendItems) {
        data.legendItems.forEach((legendItemData) => {
          new CGV.LegendItem(this, legendItemData);
        });
      }
      this.refresh();
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
      return this._legendItems.find( (i) => { return name.toLowerCase() == i.text.toLowerCase() });
    }

    draw(ctx) {
      this.clear();
      // ctx.fillStyle = this.backgroundColor.rgbaString;
      // ctx.fillRect(this.originX, this.originY, this.width, this.height);
      var textX, swatchX;
      var y = this.originY + this.padding;
      ctx.lineWidth = 1;
      ctx.textBaseline = 'top';
      for (var i = 0, len = this._legendItems.length; i < len; i++) {
        var legendItem = this._legendItems[i];
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
        ctx.fillText(legendItem.text, legendItem.textX(), y);
        y += (legendItemHeight * 1.5);
      }
    }

  }

  CGV.Legend = Legend;

})(CGView);
