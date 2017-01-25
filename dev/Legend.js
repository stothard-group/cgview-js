//////////////////////////////////////////////////////////////////////////////
// Legend
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * <br />
   * The *Legend* object can be used to describe a map legend or or add additional annotation to
   * the map. A *Legend* contain one or more [LegendItem]{@link LegendItem} elements
   */
  class Legend {

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
     *  backgroundOpacity     | 1                | A value between 0 and 1.
     *
     * @param {Object=} meta - User-defined key:value pairs to add to the legend.
     */
    constructor(viewer, data = {}, meta = {}) {
      this.viewer = viewer;
      this.meta = CGV.merge(data.meta, meta);
      this.canvas = viewer.canvas;
      this._legendItems = new CGV.CGArray();
      this._position = CGV.defaultFor(data.position, 'upper-right');
      this.backgroundColor = data.backgroundColor;
      this.backgroundOpacity = CGV.defaultFor(data.backgroundOpacity, 1);
      this.font = CGV.defaultFor(data.font, 'SansSerif, plain, 8');
      this._fontColor = new CGV.Color( CGV.defaultFor(data.fontColor, 'black') );
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
      if (this.viewer) {
        // TODO: Remove if already attached to Viewer
      }
      this._viewer = viewer;
      viewer._legends.push(this);
    }

    /**
     * @member {String} - Get or set the legend postion. One of "upper-left", "upper-center", "upper-right", "middle-left", "middle-center", "middle-right", "lower-left", "lower-center", or "lower-right".
     */
    get position() {
      return this._position
    }

    set position(value) {
      this._position = value;
      this._updateOrigin();
    }

    /**
     * @member {Color} - Get or set the backgroundColor. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
     */
    get backgroundColor() {
      // TODO set to cgview background color if not defined
      return this._backgroundColor
    }

    set backgroundColor(color) {
      // this._backgroundColor.color = color;
      if (color == undefined) {
        this._backgroundColor = this.viewer.backgroundColor;
      } else if (color.toString() == 'Color') {
        this._backgroundColor = color;
      } else {
        this._backgroundColor = new CGV.Color(color);
      }
    }

    /**
     * @member {String} - Get or set the opacity.
     */
    get backgroundOpacity() {
      return this._backgroundColor.opacity
    }

    set backgroundOpacity(value) {
      this._backgroundColor.opacity = value;
    }

    /**
     * @member {Font} - Get or set the font. When setting the font, a string representing the font or a {@link Font} object can be used. For details see {@link Font}.
     */
    get font() {
      return this._font
    }

    set font(value) {
      if (value.toString() == 'Font'){
        this._font = value;
      } else {
        this._font = new CGV.Font(value);
      }
    }

    /**
     * @member {Color} - Get or set the fontColor. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
     */
    get fontColor() {
      // TODO set to cgview font color if not defined
      return this._fontColor.rgbaString
    }

    set fontColor(color) {
      this._fontColor.color = color;
    }

    /**
     * @member {String} - Get or set the text alignment. Possible values are *left*, *center*, or *right*.
     */
    get textAlignment() {
      return this._textAlignment
    }

    set textAlignment(value) {
      this._textAlignment = value;
    }

    /**
     * Recalculates the *Legend* size and position as well as the width of the child {@link LegendItem}s.
     */
    refresh() {
      // Calculate height of Legend
      // - height of each item; plus space between items (equal to half item height); plus padding (highest item)
      this.height = 0;
      var maxHeight = 0;
      for (var i = 0, len = this._legendItems.length; i < len; i++) {
        var legendItemHeight = this.viewer.scaleIt(this._legendItems[i].height);
        this.height += legendItemHeight;
        if (i < len - 1) {
          // Add spacing
          this.height += (legendItemHeight / 2);
        }
        if (legendItemHeight > maxHeight) {
          maxHeight = legendItemHeight;
        }
      }
      this.padding = maxHeight / 2;
      this.height += this.padding * 2;

      this.width = 0;
      var itemFonts = this._legendItems.map( (i) => { return i.font.cssScaled(this.viewer.scaleFactor)});
      var itemTexts = this._legendItems.map( (i) => { return i.text});
      var itemWidths = CGV.Font.calculateWidths(this.canvas.ctx, itemFonts, itemTexts);
      // Add swatch width
      for (var i = 0, len = itemWidths.length; i < len; i++) {
        var item = this._legendItems[i];
        if (item.drawSwatch) {
          itemWidths[i] += this.viewer.scaleIt(item.height) + (this.padding / 2);
        }
        item._width = itemWidths[i];
      }
      this.width = d3.max(itemWidths) + (this.padding * 2);

      this._updateOrigin();
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

    _updateOrigin() {
      var margin = CGV.pixel(0);
      var canvasWidth = this.canvas.width;
      var canvasHeight = this.canvas.height;
      var legendWidth = this.width;
      var legendHeight = this.height;

      var position = this.position;
      if (position == 'upper-left') {
        this.originX = margin;
        this.originY = margin;
      } else if (position == 'upper-center') {
        this.originX = (canvasWidth / 2) - (legendWidth / 2);
        this.originY = margin;
      } else if (position == 'upper-right') {
        this.originX = canvasWidth - legendWidth - margin;
        this.originY = margin;
      } else if (position == 'middle-left') {
        this.originX = margin;
        this.originY = (canvasHeight / 2) - (legendHeight / 2);
      } else if (position == 'middle-center') {
        this.originX = (canvasWidth / 2) - (legendWidth / 2);
        this.originY = (canvasHeight / 2) - (legendHeight / 2);
      } else if (position == 'middle-right') {
        this.originX = canvasWidth - legendWidth - margin;
        this.originY = (canvasHeight / 2) - (legendHeight / 2);
      } else if (position == 'lower-left') {
        this.originX = margin;
        this.originY = canvasHeight - legendHeight - margin;
      } else if (position == 'lower-center') {
        this.originX = (canvasWidth / 2) - (legendWidth / 2);
        this.originY = canvasHeight - legendHeight - margin;
      } else if (position == 'lower-right') {
        this.originX = canvasWidth - legendWidth - margin;
        this.originY = canvasHeight - legendHeight - margin;
      }
    }

    draw(ctx) {
      ctx.fillStyle = this.backgroundColor.rgbaString;
      ctx.fillRect(this.originX, this.originY, this.width, this.height);
      ctx.textBaseline = 'top';
      var textX, swatchX;
      var y = this.originY + this.padding;
      for (var i = 0, len = this._legendItems.length; i < len; i++) {
        var legendItem = this._legendItems[i];
        var legendItemHeight = this.viewer.scaleIt(legendItem.height);
        var drawSwatch = legendItem.drawSwatch;
        var swatchWidth = legendItemHeight;
        var swatchPadding = this.padding / 2;
        ctx.font = legendItem.font.cssScaled(this.viewer.scaleFactor);
        ctx.textAlign = legendItem.textAlignment;
        if (drawSwatch) {
          // Find x positions
          if (legendItem.textAlignment == 'left') {
            swatchX = this.originX + this.padding;
            textX = swatchX + swatchWidth + swatchPadding;
          } else if (legendItem.textAlignment == 'center') {
            swatchX = this.originX + this.padding;
            textX = this.originX + (this.width / 2);
          } else if (legendItem.textAlignment == 'right') {
            swatchX = this.originX + this.width - this.padding - swatchWidth;
            textX = swatchX - swatchPadding;
          }
          // Swatch is selected
          if (legendItem.swatchSelected) {
            var border = CGV.pixel(2)
            ctx.strokeStyle = 'black';
            ctx.strokeRect(swatchX - border, y - border, swatchWidth + (border * 2), swatchWidth + (border * 2));
          }
          // Draw Swatch
          ctx.fillStyle = legendItem.swatchColor.rgbaString;
          ctx.fillRect(swatchX, y, swatchWidth, swatchWidth);
          // Draw Text Label
          ctx.fillStyle = legendItem.fontColor.rgbaString;
          ctx.fillText(legendItem.text, textX, y);
        } else {
          // Find x position
          if (legendItem.textAlignment == 'left') {
            textX = this.originX + this.padding;
          } else if (legendItem.textAlignment == 'center') {
            textX = this.originX + (this.width / 2);
          } else if (legendItem.textAlignment == 'right') {
            textX = this.originX + this.width - this.padding;
          }
          // Draw Text Label
          ctx.fillStyle = legendItem.fontColor.rgbaString;
          ctx.fillText(legendItem.text, textX, y);
        }
        y += (legendItemHeight * 1.5);
      }
    }

  }

  CGV.Legend = Legend;

})(CGView);
