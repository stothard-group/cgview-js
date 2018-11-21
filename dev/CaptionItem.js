//////////////////////////////////////////////////////////////////////////////
// CaptionItem
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {
  /**
   * <br />
   * A *captionItem* is used to add text to a map *legend*. Individual
   * *Features* and *Plots* can be linked to a *captionItem*, so that the feature
   * or plot color will use the swatchColor of *captionItem*.
   */
  class CaptionItem extends CGV.CGObject {

    /**
     * Create a new CaptionItem. By default a captionItem will use its parent legend font, and fontColor.
     *
     * @param {Caption} caption - The parent *Caption* for the *CaptionItem*.
     * @param {Object} data - Data used to create the captionItem:
     *
     *  Option                | Default          | Description
     *  ----------------------|-------------------------------------------------
     *  name                  | ""               | Text to display
     *  drawSwatch            | false            | Should a swatch be drawn beside the text
     *  font                  | Caption font      | A string describing the font. See {@link Font} for details.
     *  fontColor             | Caption fontColor | A string describing the color. See {@link Color} for details.
     *
     * @param {Object=} meta - User-defined key:value pairs to add to the captionItem.
     */
    constructor(parent, data = {}, meta = {}) {
      super(parent.viewer, data, meta);
      this.parent = parent;
      this.meta = CGV.merge(data.meta, meta);
      this._name = CGV.defaultFor(data.name, '');
      this.font = data.font;
      this.fontColor = data.fontColor;
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
     * @member {String} - Alias for getting the text. Useful for querying CGArrays.
     */
    get id() {
      return this.name;
    }

    /**
     * @member {Caption} - Get the *Caption*
     */
    get caption() {
      return this._parent;
    }

    /**
     * @member {Caption|Legend} - Get or set the *Parent*
     */
    get parent() {
      return this._parent;
    }

    set parent(newParent) {
      const oldParent = this.parent;
      this._parent = newParent;
      newParent._items.push(this);
      if (oldParent) {
        // Remove from old caption
        oldParent._items = oldParent._items.remove(this);
        oldParent.refresh();
        newParent.refresh();
      }
    }

    get visible() {
      return this._visible;
    }

    set visible(value) {
      // super.visible = value;
      this._visible = value;
      this.refresh();
    }


    // /**
    //  * @member {String} - Get or set the text
    //  */
    // get text() {
    //   return this._name
    // }
    //
    // set text(text) {
    //   this._name = text;
    //   this.refresh();
    // }

    /**
     * @member {String} - Alias for text
     */
    get name() {
      return this._name;
    }

    set name(value) {
      this._name = value;
      this.refresh();
    }

    /**
     * @member {String} - Get the text alignment of the parent *Caption* text alignment. Possible values are *left*, *center*, or *right*.
     */
    get textAlignment() {
      return this.parent.textAlignment;
    }

    /**
     * @member {Number} - Get the width in pixels.
     */
    get width() {
      return this._width;
    }

    /**
     * @member {Number} - Get the height in pixels. This will be the same as the font size.
     */
    get height() {
      return this.font.height;
    }

    get swatchWidth() {
      return this.height;
    }

    /**
     * @member {Font} - Get or set the font. When setting the font, a string representing the font or a {@link Font} object can be used. For details see {@link Font}.
     */
    get font() {
      return this._font;
    }

    set font(value) {
      if (value === undefined) {
        this._font = this.parent.font;
      } else if (value.toString() === 'Font') {
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
      return this._fontColor;
    }

    set fontColor(color) {
      if (color === undefined) {
        this._fontColor = this.parent._fontColor;
      } else if (color.toString() === 'Color') {
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
      const parent = this.parent;
      if (this.textAlignment === 'left') {
        return parent.originX + parent.padding;
      } else if (this.textAlignment === 'center') {
        return parent.originX + (parent.width / 2);
      } else if (this.textAlignment === 'right') {
        return parent.originX + parent.width - parent.padding;
      }
    }

    textY() {
      const parent = this.parent;
      let y = parent.originY + parent.padding;
      const visibleItems = this.parent.visibleItems();
      for (let i = 0, len = visibleItems.length; i < len; i++) {
        const item = visibleItems[i];
        if (item === this) { break; }
        y += (item.height * 1.5);
      }
      return y;
    }

    _textContainsPoint(pt) {
      const textX = this.textX();
      const textY = this.textY();
      if (pt.x >= textX && pt.x <= textX + this.width && pt.y >= textY && pt.y <= textY + this.height) {
        return true;
      }
    }

    highlight(color = '#FFB') {
      if (!this.visible || !this.parent.visible) { return; }
      // let ctx = this.canvas.context('background');
      // ctx.fillStyle = color;
      // ctx.fillRect(this.textX(), this.textY(), this.width, this.height);
      const ctx = this.canvas.context('ui');
      let x = this.textX();
      if (this.textAlignment === 'center') {
        x -= (this.width / 2);
      } else if (this.textAlignment === 'right') {
        x -= this.width;
      }
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'black';
      ctx.strokeRect(x, this.textY(), this.width, this.height);
    }

    remove() {
      // const parent = this.parent;
      // parent._items = parent._items.remove(this);
      // this.viewer.clear('captions');
      // this.viewer.refreshCaptions();
      // this.viewer.trigger( `${parent.toString().toLowerCase()}-update`);
      this.parent.removeItems(this);
    }

    /**
     * Update item properties.
     */
    update(attributes) {
      this.parent.updateItems(this, attributes);
    }

    toJSON() {
      return {
        name: this.name,
        font: this.font.string,
        fontColor: this.fontColor.rgbaString,
        visible: this.visible
      };
    }

  }

  CGV.CaptionItem = CaptionItem;
})(CGView);
