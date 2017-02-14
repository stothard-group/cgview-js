//////////////////////////////////////////////////////////////////////////////
// CaptionItem
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * <br />
   * A *captionItem* is used to add text to a map *legend*. Individual
   * *Features* and *ArcPlots* can be linked to a *captionItem*, so that the feature
   * or arcPlot color will use the swatchColor of *captionItem*.
   */
  class CaptionItem {

    /**
     * Create a new CaptionItem. By default a captionItem will use its parent legend font, fontColor and textAlignment.
     *
     * @param {Caption} caption - The parent *Caption* for the *CaptionItem*.
     * @param {Object} data - Data used to create the captionItem:
     *
     *  Option                | Default          | Description
     *  ----------------------|-------------------------------------------------
     *  text                  | ""               | Text to display
     *  drawSwatch            | false            | Should a swatch be drawn beside the text
     *  font                  | Caption font      | A string describing the font. See {@link Font} for details.
     *  fontColor             | Caption fontColor | A string describing the color. See {@link Color} for details.
     *  textAlignment         | Caption textAlignment | *left*, *center*, or *right*
     *  swatchColor           | 'black'          | A string describing the color. See {@link Color} for details.
     *  swatchOpacity         | 1                | A value between 0 and 1.
     *
     * @param {Object=} meta - User-defined key:value pairs to add to the captionItem.
     */
    constructor(caption, data = {}, meta = {}) {
      this.caption = caption;
      this.meta = CGV.merge(data.meta, meta);
      this.text = CGV.defaultFor(data.text, '');
      this.font = data.font
      this.fontColor = data.fontColor;
      this.textAlignment = data.textAlignment;
      // this.drawSwatch = CGV.defaultFor(data.drawSwatch, true);
      // this._swatchColor = new CGV.Color( CGV.defaultFor(data.swatchColor, 'black') );
    }


    /**
     * @member {Caption} - Get or set the *Caption*
     */
    get caption() {
      return this._caption
    }

    set caption(newCaption) {
      var oldCaption = this.caption;
      this._viewer = newCaption.viewer;
      this._caption = newCaption;
      newCaption._captionItems.push(this);
      if (oldCaption) {
        // Remove from old caption
        oldCaption._captionItems = oldCaption._legendItems.remove(this);
        oldCaption.refresh();
        newCaption.refresh();
      }
    }

    /**
     * @member {String} - Get or set the text
     */
    get text() {
      return this._text
    }

    set text(text) {
      this._text = text;
    }

    /**
     * @member {Boolean} - Get or set the drawSwatch property. If true a swatch will be
     * drawn beside the captionItem text.
     */
    // get drawSwatch() {
    //   return this._drawSwatch
    // }
    //
    // set drawSwatch(value) {
    //   this._drawSwatch = value;
    // }
    //
    /**
     * @member {String} - Get or set the text alignment. Defaults to the parent *Caption* text alignment. Possible values are *left*, *center*, or *right*.
     */
    get textAlignment() {
      return this._textAlignment
    }

    set textAlignment(value) {
      if (value == undefined) {
        this._textAlignment = this.caption.textAlignment;
      } else {
        this._textAlignment = value;
      }
    }

    /**
     * @member {Viewer} - Get the *Viewer*.
     */
    get viewer() {
      return this._viewer
    }

    /**
     * @member {Number} - Get the width in pixels.
     */
    get width() {
      return this._width
    }

    /**
     * @member {Number} - Get the height in pixels. This will be the same as the font size.
     */
    get height() {
      return this.font.height
    }

    get swatchWidth() {
      return this.height
    }

    /**
     * @member {Font} - Get or set the font. When setting the font, a string representing the font or a {@link Font} object can be used. For details see {@link Font}.
     */
    get font() {
      return this._font
    }

    set font(value) {
      if (value == undefined) {
        this._font = this.caption.font;
      } else if (value.toString() == 'Font') {
        this._font = value;
      } else {
        this._font = new CGV.Font(value);
      }
    }

    /**
     * @member {Color} - Get or set the fontColor. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
     */
    get fontColor() {
      return this._fontColor
    }

    set fontColor(color) {
      if (color == undefined) {
        this._fontColor = this.caption._fontColor;
      } else if (color.toString() == 'Color') {
        this._fontColor = color;
      } else {
        this._fontColor = new CGV.Color(color);
      }
    }

    textX() {
      var caption = this.caption;
      if (this.textAlignment == 'left') {
        return caption.originX + caption.padding;
      } else if (this.textAlignment == 'center') {
        return caption.originX + (caption.width / 2);
      } else if (this.textAlignment == 'right') {
        return caption.originX + caption.width - caption.padding;
      }
    }

    /**
     * @member {Color} - Get or set the swatchColor. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
     */
    // get swatchColor() {
    //   return this._swatchColor
    // }
    //
    // set swatchColor(color) {
    //   if (color.toString() == 'Color') {
    //     this._swatchColor = color;
    //   } else {
    //     this._swatchColor.setColor(color);
    //   }
    // }
    //

    // _swatchContainsPoint(pt) {
    //   var x = this.caption.originX + this.legend.padding;
    //   var y = this.caption.originY + this.legend.padding;
    //   for (var i = 0, len = this.caption._legendItems.length; i < len; i++) {
    //     var item = this.caption._legendItems[i];
    //     if (item == this) { break }
    //     y += (item.height * 1.5);
    //   }
    //
    //   if (pt.x >= x && pt.x <= x + this.height && pt.y >= y && pt.y <= y + this.height) {
    //     return true
    //   }
    // }
  }

  CGV.CaptionItem = CaptionItem;

})(CGView);
