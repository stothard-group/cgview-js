//////////////////////////////////////////////////////////////////////////////
// LegendItem
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * <br />
   * A *legendItem* is used to add text to a map *legend*. Individual
   * *Features* and *ArcPlots* can be linked to a *legendItem*, so that the feature
   * or arcPlot color will use the swatchColor of *legendItem*.
   */
  class LegendItem {

    /**
     * Create a new LegendItem. By default a legendItem will use its parent legend font, fontColor and textAlignment.
     *
     * @param {Legend} legend - The parent *Legend* for the *LegendItem*.
     * @param {Object} data - Data used to create the legendItem:
     *
     *  Option                | Default          | Description
     *  ----------------------|-------------------------------------------------
     *  text                  | ""               | Text to display
     *  drawSwatch            | false            | Should a swatch be drawn beside the text
     *  font                  | Legend font      | A string describing the font. See {@link Font} for details.
     *  fontColor             | Legend fontColor | A string describing the color. See {@link Color} for details.
     *  textAlignment         | Legend textAlignment | *left*, *center*, or *right*
     *  swatchColor           | 'black'          | A string describing the color. See {@link Color} for details.
     *  swatchOpacity         | 1                | A value between 0 and 1.
     *
     * @param {Object=} meta - User-defined key:value pairs to add to the legendItem.
     */
    constructor(legend, data = {}, meta = {}) {
      this.legend = legend;
      this.meta = CGV.merge(data.meta, meta);
      this.text = CGV.defaultFor(data.text, '');
      this.drawSwatch = CGV.defaultFor(data.drawSwatch, false);
      this.font = data.font
      this.fontColor = data.fontColor;
      this.textAlignment = data.textAlignment;
      this.drawSwatch = CGV.defaultFor(data.drawSwatch, false);
      this._swatchColor = new CGV.Color( CGV.defaultFor(data.swatchColor, 'black') );
      this.swatchOpacity = CGV.defaultFor(data.swatchOpacity, 1);
    }


    /**
     * @member {Legend} - Get or set the *Legend*
     */
    get legend() {
      return this._legend
    }

    set legend(newLegend) {
      var oldLegend = this.legend;
      this._viewer = newLegend.viewer;
      this._legend = newLegend;
      newLegend._legendItems.push(this);
      if (oldLegend) {
        // Remove from old legend
        oldLegend._legendItems = oldLegend._legendItems.remove(this);
        oldLegend.refresh();
        newLegend.refresh();
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
     * drawn beside the legendItem text.
     */
    get drawSwatch() {
      return this._drawSwatch
    }

    set drawSwatch(value) {
      this._drawSwatch = value;
    }

    /**
     * @member {String} - Get or set the text alignment. Defaults to the parent *Legend* text alignment. Possible values are *left*, *center*, or *right*.
     */
    get textAlignment() {
      return this._textAlignment
    }

    set textAlignment(value) {
      if (value == undefined) {
        this._textAlignment = this.legend.textAlignment;
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

    /**
     * @member {Font} - Get or set the font. When setting the font, a string representing the font or a {@link Font} object can be used. For details see {@link Font}.
     */
    get font() {
      return this._font
    }

    set font(value) {
      if (value == undefined) {
        this._font = this.legend.font;
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
        this._fontColor = this.legend._fontColor;
      } else if (color.toString() == 'Color') {
        this._fontColor = color;
      } else {
        this._fontColor = new CGV.Color(color);
      }
    }

    /**
     * @member {Color} - Get or set the swatchColor. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
     */
    get swatchColor() {
      return this._swatchColor
    }

    set swatchColor(color) {
      if (color.toString() == 'Color') {
        this._swatchColor = color;
      } else {
        this._swatchColor.setColor(color);
      }
    }

    /**
     * @member {String} - Get or set the opacity.
     */
    get swatchOpacity() {
      return this._swatchColor.opacity
    }

    set swatchOpacity(value) {
      this._swatchColor.opacity = value;
    }

    _swatchContainsPoint(pt) {
      var x = this.legend.originX + this.legend.padding;
      var y = this.legend.originY + this.legend.padding;
      for (var i = 0, len = this.legend._legendItems.length; i < len; i++) {
        var item = this.legend._legendItems[i];
        if (item == this) { break }
        y += (item.height * 1.5);
      }

      if (pt.x >= x && pt.x <= x + this.height && pt.y >= y && pt.y <= y + this.height) {
        return true
      }
    }
  }

  CGV.LegendItem = LegendItem;

})(CGView);
