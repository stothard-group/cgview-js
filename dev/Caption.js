//////////////////////////////////////////////////////////////////////////////
// Caption
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * <br />
   * The *Caption* object can be used to add additional annotation to
   * the map. A *Caption* contain one or more [CaptionItem]{@link CaptionItem} elements
   */
  class Caption {

    /**
     * Create a new Caption.
     *
     * @param {Caption} viewer - The parent *Viewer* for the *Caption*.
     * @param {Object} data - Data used to create the caption.
     *
     *  Option                | Default          | Description
     *  ----------------------|-------------------------------------------------
     *  position              | "upper-right"    | Where to draw the caption. One of "upper-left", "upper-center", "upper-right", "middle-left", "middle-center", "middle-right", "lower-left", "lower-center", or "lower-right".
     *  font                  | "SansSerif,plain,8" | A string describing the font. See {@link Font} for details.
     *  fontColor             | "black"          | A string describing the color. See {@link Color} for details.
     *  textAlignment         | "left"           | *left*, *center*, or *right*
     *  backgroundColor        | Viewer backgroundColor | A string describing the color. See {@link Color} for details.
     *
     * @param {Object=} meta - User-defined key:value pairs to add to the caption.
     */
    constructor(viewer, data = {}, meta = {}) {
      this.viewer = viewer;
      this.meta = CGV.merge(data.meta, meta);
      this._captionItems = new CGV.CGArray();
      this._position = CGV.defaultFor(data.position, 'upper-right');
      this.backgroundColor = data.backgroundColor;
      this.font = CGV.defaultFor(data.font, 'SansSerif, plain, 8');
      this.fontColor = CGV.defaultFor(data.fontColor, 'black');
      this.textAlignment = CGV.defaultFor(data.textAlignment, 'left');

      if (data.captionItems) {
        data.captionItems.forEach((captionItemData) => {
          new CGV.CaptionItem(this, captionItemData);
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
      viewer._captions.push(this);
    }

    /**
     * @member {Canvas} - Get the *Canvas*
     */
    get canvas() {
      return this.viewer.canvas
    }

    /**
     * @member {String} - Get or set the caption postion. One of "upper-left", "upper-center", "upper-right", "middle-left", "middle-center", "middle-right", "lower-left", "lower-center", or "lower-right".
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
      return this._fontColor.rgbaString
    }

    set fontColor(value) {
      if (value.toString() == 'Color'){
        this._fontColor = value;
      } else {
        this._fontColor = new CGV.Color(value);
      }
    }

    /**
     * @member {String} - Get or set the text alignment. Possible values are *left*, *center*, or *right*.
     */
    get textAlignment() {
      return this._textAlignment
    }

    set textAlignment(value) {
      if ( CGV.validate(value, ['left', 'center', 'right']) ) {
        this._textAlignment = value;
      }
    }

    /**
     * Recalculates the *Caption* size and position as well as the width of the child {@link CaptionItem}s.
     */
    refresh() {
      // Calculate height of Caption
      // - height of each item; plus space between items (equal to half item height); plus padding (highest item)
      this.height = 0;
      var maxHeight = 0;
      for (var i = 0, len = this._captionItems.length; i < len; i++) {
        var captionItemHeight = this._captionItems[i].height;
        this.height += captionItemHeight;
        if (i < len - 1) {
          // Add spacing
          this.height += (captionItemHeight / 2);
        }
        if (captionItemHeight > maxHeight) {
          maxHeight = captionItemHeight;
        }
      }
      this.padding = maxHeight / 2;
      this.height += this.padding * 2;

      // Calculate Caption Width
      this.width = 0;
      var itemFonts = this._captionItems.map( (i) => { return i.font.css });
      var itemTexts = this._captionItems.map( (i) => { return i.text });
      var itemWidths = CGV.Font.calculateWidths(this.canvas.context('captions'), itemFonts, itemTexts);
      for (var i = 0, len = itemWidths.length; i < len; i++) {
        var item = this._captionItems[i];
        // This should only be used for legends
        if (item.drawSwatch) {
          itemWidths[i] += item.height + (this.padding / 2);
        }
        item._width = itemWidths[i];
      }
      this.width = d3.max(itemWidths) + (this.padding * 2);

      this._updateOrigin();
    }

    // Caption is in Canvas space (need to consider pixel ratio) but colorPicker is not.
    // setColorPickerPosition(cp) {
    //   var margin = 5;
    //   var pos;
    //   var viewerRect = this.viewer._container.node().getBoundingClientRect();
    //   var originX = this.originX / CGV.pixel(1) + viewerRect.left + window.pageXOffset;
    //   var originY = this.originY / CGV.pixel(1) + viewerRect.top + window.pageYOffset;
    //   var captionWidth = this.width / CGV.pixel(1);
    //   if (/-left$/.exec(this.position)) {
    //     pos = {x: originX + captionWidth + margin, y: originY}
    //   } else {
    //     pos = {x: originX - cp.width - margin, y: originY}
    //   }
    //   cp.setPosition(pos);
    // }

    _updateOrigin() {
      var margin = CGV.pixel(0);
      var canvasWidth = this.canvas.width;
      var canvasHeight = this.canvas.height;
      var captionWidth = this.width;
      var captionHeight = this.height;

      var position = this.position;
      if (position == 'upper-left') {
        this.originX = margin;
        this.originY = margin;
      } else if (position == 'upper-center') {
        this.originX = (canvasWidth / 2) - (captionWidth / 2);
        this.originY = margin;
      } else if (position == 'upper-right') {
        this.originX = canvasWidth - captionWidth - margin;
        this.originY = margin;
      } else if (position == 'middle-left') {
        this.originX = margin;
        this.originY = (canvasHeight / 2) - (captionHeight / 2);
      } else if (position == 'middle-center') {
        this.originX = (canvasWidth / 2) - (captionWidth / 2);
        this.originY = (canvasHeight / 2) - (captionHeight / 2);
      } else if (position == 'middle-right') {
        this.originX = canvasWidth - captionWidth - margin;
        this.originY = (canvasHeight / 2) - (captionHeight / 2);
      } else if (position == 'lower-left') {
        this.originX = margin;
        this.originY = canvasHeight - captionHeight - margin;
      } else if (position == 'lower-center') {
        this.originX = (canvasWidth / 2) - (captionWidth / 2);
        this.originY = canvasHeight - captionHeight - margin;
      } else if (position == 'lower-right') {
        this.originX = canvasWidth - captionWidth - margin;
        this.originY = canvasHeight - captionHeight - margin;
      }
    }

    clear() {
      var ctx = this.canvas.context('captions');
      ctx.fillStyle = this.backgroundColor.rgbaString;
      ctx.fillRect(this.originX, this.originY, this.width, this.height);
    }

    draw(ctx) {
      this.clear();
      // var textX, swatchX;
      var y = this.originY + this.padding;
      ctx.textBaseline = 'top';
      for (var i = 0, len = this._captionItems.length; i < len; i++) {
        var captionItem = this._captionItems[i];
        var captionItemHeight = captionItem.height;
        var drawSwatch = captionItem.drawSwatch;
        // var swatchWidth = captionItemHeight;
        // var swatchPadding = this.padding / 2;
        ctx.font = captionItem.font.css;
        ctx.textAlign = captionItem.textAlignment;
        if (drawSwatch) {
        //   // Find x positions
        //   if (captionItem.textAlignment == 'left') {
        //     swatchX = this.originX + this.padding;
        //     textX = swatchX + swatchWidth + swatchPadding;
        //   } else if (captionItem.textAlignment == 'center') {
        //     swatchX = this.originX + this.padding;
        //     textX = this.originX + (this.width / 2);
        //   } else if (captionItem.textAlignment == 'right') {
        //     swatchX = this.originX + this.width - this.padding - swatchWidth;
        //     textX = swatchX - swatchPadding;
        //   }
        //   // Swatch border color
        //   if (captionItem.swatchSelected) {
        //     ctx.strokeStyle = 'black';
        //   } else if (captionItem.swatchHighlighted) {
        //     ctx.strokeStyle = 'grey';
        //   } else {
        //     ctx.strokeStyle = this.backgroundColor.rgbaString;
        //   }
        //   // Draw box around Swatch depending on state
        //   var border = CGV.pixel(2)
        //   ctx.strokeRect(swatchX - border, y - border, swatchWidth + (border * 2), swatchWidth + (border * 2));
        //   // Draw Swatch
        //   ctx.fillStyle = captionItem.swatchColor.rgbaString;
        //   ctx.fillRect(swatchX, y, swatchWidth, swatchWidth);
        //   // Draw Text Label
        //   ctx.fillStyle = captionItem.fontColor.rgbaString;
        //   ctx.fillText(captionItem.text, textX, y);
        } else {
          // Find x position
          // if (captionItem.textAlignment == 'left') {
          //   textX = this.originX + this.padding;
          // } else if (captionItem.textAlignment == 'center') {
          //   textX = this.originX + (this.width / 2);
          // } else if (captionItem.textAlignment == 'right') {
          //   textX = this.originX + this.width - this.padding;
          // }
          // Draw Text Label
          ctx.fillStyle = captionItem.fontColor.rgbaString;
          ctx.fillText(captionItem.text, captionItem.textX(), y);
        }
        y += (captionItemHeight * 1.5);
      }
    }

  }

  CGV.Caption = Caption;

})(CGView);
