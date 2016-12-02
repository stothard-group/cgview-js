//////////////////////////////////////////////////////////////////////////////
// LegendItem
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class LegendItem {

    constructor(legend, data = {}, display = {}, meta = {}) {
      this.legend = legend;
      this._text = CGV.defaultFor(data.text, '');
      this._drawSwatch = CGV.defaultFor(data.drawSwatch, false);
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

    set legend(legend) {
      if (this.legend) {
        // TODO: Remove if already attached to FeatureSlot
      }
      this._legend = legend;
      legend._legendItems.push(this);
      this._viewer = legend.viewer;
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
     * @member {String} - Get or set the text alignment
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
     * @member {Viewer} - Get the *Viewer*
     */
    get viewer() {
      return this._viewer
    }

    get width() {
      return this._width
    }

    get height() {
      return this._font.height
    }

    /**
     * @member {String} - Get or set the font.
     */
    get font() {
      return this._font.asCss
    }

    set font(value) {
      if (value == undefined) {
        this._font = this.legend._font;
      } else {
        this._font = new CGV.Font(value);
      }
    }

    /**
     * @member {String} - Get or set the fontColor. TODO: reference COLOR class
     */
    get fontColor() {
      // TODO set to cgview font color if not defined
      return this._fontColor.rgbaString
    }

    set fontColor(color) {
      if (color == undefined) {
        this._fontColor = this.legend._fontColor;
      } else {
        this._fontColor = new CGV.Color(color);
      }
    }

    /**
     * @member {String} - Get or set the swatchColor. TODO: reference COLOR class
     */
    get swatchColor() {
      return this._swatchColor.rgbaString
    }

    set swatchColor(color) {
      this._swatchColor.colorString = color;
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


    /**
     * @member {String} - Get or set the swatch opacity.
     */
    get swatchOpacity() {
      return this._swatchColor.opacity
    }

    set swatchOpacity(value) {
      this._swatchColor.opacity = value;
    }

    swatchContainsPoint(pt) {
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
