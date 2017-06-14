//////////////////////////////////////////////////////////////////////////////
// Caption
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * <br />
   * The *Caption* object can be used to add additional annotation to
   * the map. A *Caption* contain one or more [CaptionItem]{@link CaptionItem} elements
   */
  class Caption extends CGV.CGObject {

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
      super(viewer, data, meta);
      this.viewer = viewer;
      this._items = new CGV.CGArray();
      this._position = CGV.defaultFor(data.position, 'upper-left');
      this.name = data.name;
      this.backgroundColor = data.backgroundColor;
      this.font = CGV.defaultFor(data.font, 'SansSerif, plain, 8');
      this.fontColor = CGV.defaultFor(data.fontColor, 'black');
      this.textAlignment = CGV.defaultFor(data.textAlignment, 'left');

      if (data.items) {
        data.items.forEach((itemData) => {
          new CGV[this.toString() + 'Item'](this, itemData);
        });
      }
      // FIXME: should be done whenever an item is added
      this.refresh();
    }

    /**
     * Return the class name as a string.
     * @return {String} - 'Caption'
     */
    toString() {
      return 'Caption';
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

    get visible() {
      return this._visible
    }

    set visible(value) {
      // super.visible = value;
      this._visible = value;
      this.refresh();
    }

    /**
     * @member {Context} - Get the *Context*
     */
    get ctx() {
      return this.canvas.context('captions')
    }

    /**
     * @member {String} - Alias for getting the position. Useful for querying CGArrays.
     */
    get id() {
      return this.position
    }

    /**
     * @member {String} - Get or set the caption postion. One of "upper-left", "upper-center", "upper-right", "middle-left", "middle-center", "middle-right", "lower-left", "lower-center", or "lower-right".
     */
    get position() {
      return this._position
    }

    set position(value) {
      this._position = value;
      this.refresh();
    }

    /**
     * @member {String} - Get or set the caption name.
     */
    get name() {
      return this._name
    }

    set name(value) {
      this._name = value;
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
        this._backgroundColor = this.viewer.settings.backgroundColor;
      } else if (color.toString() == 'Color') {
        this._backgroundColor = color;
      } else {
        this._backgroundColor = new CGV.Color(color);
      }
      this.refresh();
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
      this.refresh();
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
      this.refresh();
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
      this.refresh();
    }

    /**
     * @member {CGArray} - Get the *CaptionItems*
     */
    items(term) {
      return this._items.get(term)
    }

    /**
     * @member {CGArray} - Get the *CaptionItems*
     */
    visibleItems(term) {
      var filtered = this._items.filter( (i) => { return i.visible });
      return new CGV.CGArray(filtered).get(term)
    }

    /**
     * Recalculates the *Caption* size and position as well as the width of the child {@link CaptionItem}s.
     */
    // FIXME: should be called when ever a text or font changes
    refresh() {
      // Calculate height of Caption
      // - height of each item; plus space between items (equal to half item height); plus padding (highest item)
      this.clear();
      this.height = 0;
      var maxHeight = 0;
      if (!this._items) { return }
      var visibleItems = this.visibleItems();
      // for (var i = 0, len = this._items.length; i < len; i++) {
      for (var i = 0, len = visibleItems.length; i < len; i++) {
        var captionItem = visibleItems[i];
        var captionItemHeight = captionItem.height;
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
      var itemFonts = visibleItems.map( (i) => { return i.font.css });
      var itemTexts = visibleItems.map( (i) => { return i.text });
      var itemWidths = CGV.Font.calculateWidths(this.ctx, itemFonts, itemTexts);
      for (var i = 0, len = itemWidths.length; i < len; i++) {
        var item = visibleItems[i];
        // This should only be used for legends
        if (item.drawSwatch) {
          itemWidths[i] += item.height + (this.padding / 2);
        }
        item._width = itemWidths[i];
      }
      this.width = d3.max(itemWidths) + (this.padding * 2);

      this._updateOrigin();
      this.draw();
    }

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

    moveItem(oldIndex, newIndex) {
      this._items.move(oldIndex, newIndex);
      this.refresh();
    }

    clear() {
      this.ctx.clearRect(this.originX, this.originY, this.width, this.height);
    }

    fillBackground() {
      this.ctx.fillStyle = this.backgroundColor.rgbaString;
      this.ctx.fillRect(this.originX, this.originY, this.width, this.height);
    }

    highlight(color = '#FFB') {
      if (!this.visible) { return }
      // var ctx = this.canvas.context('background');
      // ctx.fillStyle = color;
      // ctx.fillRect(this.originX, this.originY, this.width, this.height);
      var ctx = this.canvas.context('ui');
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'black';
      ctx.strokeRect(this.originX, this.originY, this.width, this.height);
    }

    draw() {
      if (!this.visible) { return }
      var ctx = this.ctx;
      this.fillBackground();
      ctx.textBaseline = 'top';
      for (var i = 0, len = this._items.length; i < len; i++) {
        var captionItem = this._items[i];
        if (!captionItem.visible) { continue }
        var captionItemHeight = captionItem.height;
        ctx.font = captionItem.font.css;
        ctx.textAlign = captionItem.textAlignment;
        // Draw Text Label
        ctx.fillStyle = captionItem.fontColor.rgbaString;
        ctx.fillText(captionItem.text, captionItem.textX(), captionItem.textY());
      }
    }

    remove() {
      var viewer = this.viewer;
      viewer._captions = viewer._captions.remove(this);
      viewer.clear('captions');
      viewer.refreshCaptions();
    }

  }

  CGV.Caption = Caption;

})(CGView);
