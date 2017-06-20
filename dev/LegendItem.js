//////////////////////////////////////////////////////////////////////////////
// LegendItem
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * <br />
   * A *legendItem* is used to add text to a map *legend*. Individual
   * *Features* and *Plots* can be linked to a *legendItem*, so that the feature
   * or plot color will use the swatchColor of *legendItem*.
   * @extends CaptionItem
   */
  class LegendItem extends CGV.CaptionItem {

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
     *  decoration            | 'arc'            | How the features should be drawn. Choices: 'arc' [Default], 'arrow', 'score', 'none'.
     *
     * @param {Object=} meta - User-defined key:value pairs to add to the legendItem.
     */
    constructor(parent, data = {}, meta = {}) {
      super(parent, data, meta)
      this._drawSwatch = CGV.defaultFor(data.drawSwatch, true);
      this._swatchColor = new CGV.Color( CGV.defaultFor(data.swatchColor, 'black') );
      this._decoration = CGV.defaultFor(data.decoration, 'arc');
      this.refresh();
      this.viewer.trigger('legend-update');
    }

    /**
     * Return the class name as a string.
     * @return {String} - 'LegendItem'
     */
    toString() {
      return 'LegendItem';
    }

    /**
     * @member {Legend} - Get the *Legend*
     */
    get legend() {
      return this._parent
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
      this.refresh();
    }

    get swatchWidth() {
      return this.height
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
      this.refresh();
    }

    /**
     * @member {String} - Get or set the decoration. Choices are *arc* [Default], *arrow*, *score*, *none*.
     */
    get decoration() {
      return this._decoration || 'arc'
    }

    set decoration(value) {
      if ( CGV.validate(value, ['arc', 'arrow', 'none', 'score']) ) {
        this._decoration = value;
      }
    }

    /**
     * @member {Color} - Alias for  [swatchColor](LegendItem.html#swatchColor).
     */
    get color() {
      return this.swatchColor
    }

    set color(color) {
      this.swatchColor = color
    }

    /**
     * @member {Boolean} - Get or set whether this item is selected
     */
    get swatchSelected() {
      return this.legend.selectedSwatchedItem == this
    }

    set swatchSelected(value) {
      if (value) {
        this.legend.selectedSwatchedItem = this;
      } else {
        if (this.legend.selectedSwatchedItem == this) {
          this.legend.selectedSwatchedItem = undefined;
        }
      }
    }

    /**
     * @member {Boolean} - Get or set whether this item is highlighted
     */
    get swatchHighlighted() {
      return this.legend.highlightedSwatchedItem == this
    }

    set swatchHighlighted(value) {
      if (value) {
        this.legend.highlightedSwatchedItem = this;
      } else {
        if (this.legend.highlightedSwatchedItem == this) {
          this.legend.highlightedSwatchedItem = undefined;
        }
      }
    }


    textX() {
      if (this.drawSwatch) {
        var parent = this.parent;
        if (this.textAlignment == 'left') {
          return this.swatchX() + this.swatchWidth + parent.swatchPadding;
        } else if (this.textAlignment == 'center') {
          return parent.originX + (parent.width / 2);
        } else if (this.textAlignment == 'right') {
          return this.swatchX() - parent.swatchPadding;
        }
      } else {
        return super.textX();
      }
    }

    swatchX() {
      var parent = this.parent;
      if (this.textAlignment == 'left') {
        return parent.originX + parent.padding;
      } else if (this.textAlignment == 'center') {
        return parent.originX + parent.padding;
      } else if (this.textAlignment == 'right') {
        return parent.originX + parent.width - parent.padding - this.swatchWidth;
      }
    }


    // FIXME: does not work for swatches aligned right; need swatchY method
    _swatchContainsPoint(pt) {
      var x = this.parent.originX + this.parent.padding;
      var y = this.parent.originY + this.parent.padding;
      var visibleItems = this.parent.visibleItems();
      for (var i = 0, len = visibleItems.length; i < len; i++) {
        var item = visibleItems[i];
        if (item == this) { break }
        y += (item.height * 1.5);
      }

      if (pt.x >= x && pt.x <= x + this.height && pt.y >= y && pt.y <= y + this.height) {
        return true
      }
    }

    features(term) {
      var viewer = this.viewer;
      var _features = new CGV.CGArray( viewer._features.filter( (f) => { return f.legendItem == this } ));
      return _features.get(term);
    }

    plots(term) {
      var viewer = this.viewer;
      var _plots = new CGV.CGArray( viewer._plots.filter( (f) => {
        return (f.legendItem == this || f.legendItemPositive == this || f.legendNegative == this)
      }));
      return _plots.get(term);
    }

    toJSON() {
      var json = super.toJSON();
      json.swatchColor = this.swatchColor.rgbaString;
      json.decoration = this.decoration;
      return json
    }

  }

  CGV.LegendItem = LegendItem;

})(CGView);
