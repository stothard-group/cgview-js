//////////////////////////////////////////////////////////////////////////////
// Legend
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class Legend {

    constructor(viewer, data, options = {}) {
      this.viewer = viewer;
      this.canvas = viewer.canvas;
      this._legendItems = new CGV.CGArray();
      this._position = CGV.defaultFor(data.position, 'upper-right');
      this._backgroundColor = new CGV.Color( CGV.defaultFor(data.backgroundColor, 'white') ); //TODO: inherit from cgv
      this.backgroundOpacity = CGV.defaultFor(data.backgroundOpacity, 1);
      this.font = CGV.defaultFor(data.font, 'SansSerif, plain, 8');
      this._fontColor = new CGV.Color( CGV.defaultFor(data.fontColor, 'black') );
      // TODO: text alignment (inherited from legend)
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
     * @member {String} - Get or set the legend postion
     */
    get position() {
      return this._position
    }

    set position(value) {
      this._position = value;
      this._updateOrigin();
    }

    /**
     * @member {String} - Get or set the backgroundColor. TODO: reference COLOR class
     */
    get backgroundColor() {
      // TODO set to cgview background color if not defined
      return this._backgroundColor.rgba
    }

    set backgroundColor(color) {
      this._backgroundColor.color = color;
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
     * @member {String} - Get or set the font.
     */
    get font() {
      return this._font.asCss
    }

    set font(value) {
      this._font = new CGV.Font(value);
    }

    /**
     * @member {String} - Get or set the fontColor. TODO: reference COLOR class
     */
    get fontColor() {
      // TODO set to cgview font color if not defined
      return this._fontColor.rgba
    }

    set fontColor(color) {
      this._fontColor.color = color;
    }

    /**
     * @member {String} - Get or set the text alignment
     */
    get textAlignment() {
      return this._textAlignment
    }

    set textAlignment(value) {
      this._textAlignment = value;
    }

    refresh() {
      // Calculate height of Legend
      // - height of each item; plus space between items (equal to half item height); plus padding (highest item)
      this.height = 0;
      var maxHeight = 0;
      for (var i = 0, len = this._legendItems.length; i < len; i++) {
        var legendItem = this._legendItems[i];
        this.height += legendItem.height;
        if (i < len - 1) {
          // Add spacing
          this.height += (legendItem.height / 2);
        }
        if (legendItem.height > maxHeight) {
          maxHeight = legendItem.height;
        }
      }
      this.padding = maxHeight / 2;
      this.height += this.padding * 2;

      this.width = 0;
      var itemFonts = this._legendItems.map( (i) => { return i.font});
      var itemTexts = this._legendItems.map( (i) => { return i.text});
      var itemWidths = CGV.Font.calculateWidths(this.canvas.ctx, itemFonts, itemTexts);
      // Add swatch width
      for (var i = 0, len = itemWidths.length; i < len; i++) {
        var item = this._legendItems[i];
        if (item.drawSwatch) {
          itemWidths[i] += item.height + (this.padding / 2);
        }
        item._width = itemWidths[i];
      }
      this.width = d3.max(itemWidths) + (this.padding * 2);

      this._updateOrigin();
    }

    _updateOrigin() {
      var margin = CGV.pixel(10);
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
      ctx.fillStyle = this.backgroundColor;
      ctx.fillRect(this.originX, this.originY, this.width, this.height);
      ctx.textBaseline = 'top';
      var textX, swatchX;
      var y = this.originY + this.padding;
      for (var i = 0, len = this._legendItems.length; i < len; i++) {
        var legendItem = this._legendItems[i];
        var drawSwatch = legendItem.drawSwatch;
        var swatchWidth = legendItem.height;
        var swatchPadding = this.padding / 2;
        ctx.font = legendItem.font;
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
          // Draw Swatch
          ctx.fillStyle = legendItem.swatchColor;
          ctx.fillRect(swatchX, y, swatchWidth, swatchWidth);
          // Draw Text Label
          ctx.fillStyle = legendItem.fontColor;
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
          ctx.fillStyle = legendItem.fontColor;
          ctx.fillText(legendItem.text, textX, y);
        }
        y += (legendItem.height * 1.5);
      }
    }

  }

  CGV.Legend = Legend;

})(CGView);
