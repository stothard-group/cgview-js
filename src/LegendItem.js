//////////////////////////////////////////////////////////////////////////////
// LegendItem
//////////////////////////////////////////////////////////////////////////////

import CGObject from './CGObject';
import Color from './Color';
import Font from './Font';
import utils from './Utils';

/**
 * A legendItem is used to add text to a map legend. Individual
 * Features and Plots can be linked to a legendItem, so that the feature
 * or plot color will use the swatchColor of legendItem.
 *
 * ### Action and Events
 *
 * Action                                     | Legend Method                            | LegendItem Method   | Event
 * -------------------------------------------|------------------------------------------|---------------------|-----
 * [Add](../docs.html#adding-records)         | [addItems()](Legend.html#addItems)       | -                   | legendItems-add
 * [Update](../docs.html#updating-records)    | [updateItems()](Legend.html#updateItems) | [update()](#update) | legendItems-update
 * [Remove](../docs.html#removing-records)    | [removeItems()](Legend.html#removeItems) | [remove()](#remove) | legendItems-remove
 * [Reorder](../docs.html#reordering-records) | [moveItem()](Legend.html#moveItem)       | [move()](#move)     | legendItems-reorder
 * [Read](../docs.html#reading-records)       | [items()](Legend.html#items)             | -                   | -
 *
 * <a name="attributes"></a>
 * ### Attributes
 *
 * Attribute                        | Type      | Description
 * ---------------------------------|-----------|------------
 * [name](#name)                    | String    | Name to diplay for legendItem 
 * [font](#font)                    | String    | A string describing the font [Default: 'SansSerif, plain, 8']. See {@link Font} for details.
 * [fontColor](#fontColor)          | String    | A string describing the font color [Default: 'black']. See {@link Color} for details.
 * [decoration](#decoration)        | String    | How the features should be drawn. Choices: 'arc' [Default], 'arrow', 'score', 'none' [Default: 'arc']
 * [swatchColor](#swatchColor)      | String    | A string describing the legendItem display color [Default: 'black']. See {@link Color} for details.
 * [drawSwatch](#drawSwatch)        | Boolean   | Draw the swatch beside the legendItem name [Default: true]
 * [favorite](#favorite)            | Boolean   | LegendItem is a favorite [Default: false]
 * [visible](CGObject.html#visible) | Boolean   | LegendItem is visible [Default: true]
 * [meta](CGObject.html#meta)       | Object    | [Meta data](../tutorials/details-meta-data.html)
 *
 * ### Examples
 *
 * @extends CGObject
 */
class LegendItem extends CGObject {

  /**
   * Create a new legendItem. By default a legendItem will use its parent legend defaultFont, and defaultFontColor.
   * @param {Viewer} viewer - The viewer
   * @param {Object} options - [Attributes](#attributes) used to create the legendItem
   * @param {Object} [meta] - User-defined [Meta data](../tutorials/details-meta-data.html) to add to the legendItem.
   */
  constructor(legend, options = {}, meta = {}) {
    super(legend.viewer, options, meta);
    this.legend = legend;

    this._name = utils.defaultFor(options.name, '');
    this.font = options.font;
    this.fontColor = options.fontColor;
    this._drawSwatch = utils.defaultFor(options.drawSwatch, true);
    this._swatchColor = new Color( utils.defaultFor(options.swatchColor, 'black') );
    this._decoration = utils.defaultFor(options.decoration, 'arc');
    this._initializationComplete = true;
    this.refresh();
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
    return this._legend;
  }

  set legend(legend) {
    legend._items.push(this);
    this._legend = legend;
  }

  get visible() {
    return this._visible;
  }

  set visible(value) {
    // super.visible = value;
    this._visible = value;
    this.refresh();
  }

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
   * @member {String} - Get the text alignment of the parent *Legend* text alignment. Possible values are *left*, *center*, or *right*.
   */
  get textAlignment() {
    return this.legend.textAlignment;
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
  // get font() {
  //   return this._font;
  // }
  //
  // set font(value) {
  //   if (value === undefined) {
  //     this._font = this.legend.defaultFont;
  //   } else if (value.toString() === 'Font') {
  //     this._font = value;
  //   } else {
  //     this._font = new Font(value);
  //   }
  //   this.refresh();
  // }
  get font() {
    return this._font || this.legend.defaultFont;
  }

  set font(value) {
    if (value === undefined) {
      this._font = undefined;
    } else if (value.toString() === 'Font') {
      this._font = value;
    } else {
      this._font = new Font(value);
    }
    this.refresh();
  }

  get usingDefaultFont() {
    return this.font === this.legend.defaultFont;
  }

  /**
   * @member {Color} - Get or set the fontColor. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
   */
  // get fontColor() {
  //   return this._fontColor;
  // }
  //
  // set fontColor(color) {
  //   if (color === undefined) {
  //     this._fontColor = this.legend.defaultFontColor;
  //   } else if (color.toString() === 'Color') {
  //     this._fontColor = color;
  //   } else {
  //     this._fontColor = new Color(color);
  //   }
  //   this.refresh();
  // }
  get fontColor() {
    return this._fontColor || this.legend.defaultFontColor;
  }

  set fontColor(color) {
    if (color === undefined) {
      // this._fontColor = this.legend.defaultFontColor;
      this._fontColor = undefined;
    } else if (color.toString() === 'Color') {
      this._fontColor = color;
    } else {
      this._fontColor = new Color(color);
    }
    this.refresh();
  }

  get usingDefaultFontColor() {
    return this.fontColor === this.legend.defaultFontColor;
  }

  /**
   * @member {Boolean} - Get or set the drawSwatch property. If true a swatch will be
   * drawn beside the legendItem text.
   */
  get drawSwatch() {
    return this._drawSwatch;
  }

  set drawSwatch(value) {
    this._drawSwatch = value;
    this.refresh();
  }

  get swatchWidth() {
    return this.height;
  }

  /**
   * @member {Color} - Get or set the swatchColor. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
   */
  get swatchColor() {
    return this._swatchColor;
  }

  set swatchColor(color) {
    if (color.toString() === 'Color') {
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
    return this._decoration || 'arc';
  }

  set decoration(value) {
    if ( utils.validate(value, ['arc', 'arrow', 'none', 'score']) ) {
      this._decoration = value;
    }
  }

  /**
   * @member {Color} - Alias for  [swatchColor](LegendItem.html#swatchColor).
   */
  get color() {
    return this.swatchColor;
  }

  set color(color) {
    this.swatchColor = color;
  }

  /**
   * @member {Boolean} - Get or set whether this item is selected
   */
  get swatchSelected() {
    return this.legend.selectedSwatchedItem === this;
  }

  set swatchSelected(value) {
    if (value) {
      this.legend.selectedSwatchedItem = this;
    } else {
      if (this.legend.selectedSwatchedItem === this) {
        this.legend.selectedSwatchedItem = undefined;
      }
    }
  }

  /**
   * @member {Boolean} - Get or set whether this item is highlighted
   */
  get swatchHighlighted() {
    return this.legend.highlightedSwatchedItem === this;
  }

  set swatchHighlighted(value) {
    if (value) {
      this.legend.highlightedSwatchedItem = this;
    } else {
      if (this.legend.highlightedSwatchedItem === this) {
        this.legend.highlightedSwatchedItem = undefined;
      }
    }
  }

  refresh() {
    if (this._initializationComplete) {
      this.legend.refresh();
    }
  }

  textX() {
    const box = this.box;
    const legend = this.legend;
    if (this.textAlignment === 'left') {
      return this.drawSwatch ? (this.swatchX() + this.swatchWidth + legend.swatchPadding) : box.leftPadded;
    } else if (this.textAlignment === 'center') {
      return box.centerX;
    } else if (this.textAlignment === 'right') {
      return this.drawSwatch ? (this.swatchX() - legend.swatchPadding) : box.rightPadded;
    }
  }

  textY() {
    const legend = this.legend;
    // let y = legend.originY + legend.padding;
    let y = legend.box.topPadded;
    const visibleItems = this.legend.visibleItems();
    for (let i = 0, len = visibleItems.length; i < len; i++) {
      const item = visibleItems[i];
      if (item === this) { break; }
      y += (item.height * 1.5);
    }
    return y;
  }


  swatchX() {
    const box = this.legend.box;
    if (this.textAlignment === 'left') {
      return box.leftPadded;
    } else if (this.textAlignment === 'center') {
      return box.leftPadded;
    } else if (this.textAlignment === 'right') {
      return box.rightPadded - this.swatchWidth;
    }
  }

  swatchY() {
    return this.textY();
  }

  _swatchContainsPoint(pt) {
    const x = this.swatchX();
    const y = this.swatchY();
    if (pt.x >= x && pt.x <= x + this.height && pt.y >= y && pt.y <= y + this.height) {
      return true;
    }
  }

  _textContainsPoint(pt) {
    const textX = this.textX();
    const textY = this.textY();
    if (pt.x >= textX && pt.x <= textX + this.width && pt.y >= textY && pt.y <= textY + this.height) {
      return true;
    }
  }

  highlight(color = this.fontColor) {
    if (!this.visible || !this.legend.visible) { return; }
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
    ctx.strokeStyle = color.rgbaString;
    ctx.strokeRect(x, this.textY(), this.width, this.height);
  }

  invertColors() {
    const attributes = {
      swatchColor: this.swatchColor.invert().rgbaString
    };
    if (!this.usingDefaultFontColor) {
      attributes.fontColor = this.fontColor.invert().rgbaString;
    }
    this.update(attributes);
  }

  remove() {
    this.legend.removeItems(this);
  }

  move(newIndex) {
    const currentIndex = this.legend.items().indexOf(this);
    this.legend.moveItem(currentIndex, newIndex);
  }

  /**
   * Update item properties.
   */
  update(attributes) {
    this.legend.updateItems(this, attributes);
  }

  features(term) {
    return this.viewer._features.filter( f => f.legendItem === this ).get(term);
  }

  plots(term) {
    return this.viewer._plots.filter( p => p.legendItem.includes(this) ).get(term);
  }

  toJSON(options = {}) {
    const json = {
      name: this.name,
      // font: this.font.string,
      // fontColor: this.fontColor.rgbaString,
      swatchColor: this.swatchColor.rgbaString,
      decoration: this.decoration
      // visible: this.visible
    };
    // Optionally add default values
    if (!this.visible || options.includeDefaults) {
      json.visible = this.visible;
    }
    if (!this.usingDefaultFontColor || options.includeDefaults) {
      json.fontColor = this.fontColor.rgbaString;
    }
    if (!this.usingDefaultFont || options.includeDefaults) {
      json.font = this.font.string;
    }
    return json;
  }

}

export default LegendItem;

