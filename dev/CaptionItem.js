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
    constructor(parent, data = {}, meta = {}) {
      this.parent = parent;
      this.meta = CGV.merge(data.meta, meta);
      this._text = CGV.defaultFor(data.text, '');
      this.font = data.font
      this.fontColor = data.fontColor;
      this.textAlignment = data.textAlignment;
      this._initializationComplete = true;
      this.refresh();
    }

    /**
     * Return the class name as a string.
     * @return {String} - 'CaptionItem'
     */
    toString() {
      return 'CaptionItem';
    }

    /**
     * @member {Caption} - Get the *Caption*
     */
    get caption() {
      return this._parent
    }

    /**
     * @member {Caption|Legend} - Get or set the *Parent*
     */
    get parent() {
      return this._parent
    }

    /**
     * @member {Caption|Legend} - Get or set the *Parent*
     */
    get parent() {
      return this._parent
    }

    set parent(newParent) {
      var oldParent = this.parent;
      this._viewer = newParent.viewer;
      this._parent = newParent;
      newParent._items.push(this);
      if (oldParent) {
        // Remove from old caption
        oldParent._items = oldParent._items.remove(this);
        oldParent.refresh();
        newParent.refresh();
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
      this.refresh();
    }

    /**
     * @member {String} - Get or set the text alignment. Defaults to the parent *Caption* text alignment. Possible values are *left*, *center*, or *right*.
     */
    get textAlignment() {
      return this._textAlignment
    }

    set textAlignment(value) {
      if (value == undefined) {
        this._textAlignment = this.parent.textAlignment;
      } else {
        this._textAlignment = value;
      }
      this.refresh();
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
        this._font = this.parent.font;
      } else if (value.toString() == 'Font') {
        this._font = value;
      } else {
        this._font = new CGV.Font(value);
      }
      this.refresh();
    }

    /**
     * @member {Color} - Get or set the fontColor. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
     */
    get fontColor() {
      return this._fontColor
    }

    set fontColor(color) {
      if (color == undefined) {
        this._fontColor = this.parent._fontColor;
      } else if (color.toString() == 'Color') {
        this._fontColor = color;
      } else {
        this._fontColor = new CGV.Color(color);
      }
      this.refresh();
    }

    refresh() {
      if (this._initializationComplete) {
        this.parent.refresh();
      }
    }

    textX() {
      var parent = this.parent;
      if (this.textAlignment == 'left') {
        return parent.originX + parent.padding;
      } else if (this.textAlignment == 'center') {
        return parent.originX + (parent.width / 2);
      } else if (this.textAlignment == 'right') {
        return parent.originX + parent.width - parent.padding;
      }
    }

  }

  CGV.CaptionItem = CaptionItem;

})(CGView);
