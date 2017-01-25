//////////////////////////////////////////////////////////////////////////////
// Font
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * <br />
   * The *Font* class stores the font internally as a CSS font string but makes it
   * easy to change individual components of the font. For example, the size can be
   * changed using the [size]{@link Font#size} method. A font consists of 3 components:
   *
   *   Component   | Description
   *   ------------|---------------
   *   *family*    | This can be a generic family (e.g. serif, sans-serif, monospace) or a specific font family (e.g. Times New Roman, Arail, or Courier)
   *   *style*     | One of *plain*, *bold*, *italic*, or *bold-italic*
   *   *size*      | The size of the font in pixels. The size will be adjusted for retina displays.
   *
   */
  class Font {

    /**
     * Create a new *Font*. The *Font* can be created using a string or an object representing the font.
     *
     * @param {(String|Object)} font - If a string is provided, it must have the following format:
     *   family,style,size (e.g. 'serif,plain,12'). If an object is provided, it must have a *family*,
     *   *style* and *size* property (e.g. { family: 'serif', style: 'plain', size: 12 })
     */
    constructor(font) {
      this._rawFont = font;
    }

    /**
     * Return the class name as a string.
     * @return {String} - 'Font'
     */
    toString() {
      return 'Font';
    }

    set _rawFont(font) {
      if (typeof font === 'string' || font instanceof String) {
        this.string = font;
      } else {
        var keys = new CGV.CGArray(Object.keys(font));
        if (keys.contains('family') && keys.contains('style') && keys.contains('size')) {
          this.family = font.family;
          this.style = font.style;
          this.size = font.size;
        } else {
          console.log('Font objects require the following keys: family, style, and size');
        }
      }
    }

    /**
     * @member {String} - Get or set the font using a simple string format: family,style,size (e.g. 'serif,plain,12').
     */
    get string() {
      return this.family + ',' + this.style + ',' + this.size
    }

    set string(value) {
      value = value.replace(/ +/g, '');
      var parts = value.split(',');
      if (parts.length == 3) {
        this.family = parts[0];
        this.style = parts[1];
        this.size = parts[2];
      } else {
        console.log('Font must have 3 parts')
      }
      this._generateFont();
    }

    // /** * Return the font as canvas usable string.
    //  */
    // get font() {
    //   return this._font
    // }
    //
    // /**
    //  * Set the font using a string with the format: font-family,style,size
    //  */
    // set font(value) {
    //   value = value.replace(/ +/g, '');
    //   var parts = value.split(',');
    //   if (parts.length == 3) {
    //     this.family = parts[0];
    //     this.style = parts[1];
    //     this.size = Number(parts[2]);
    //   } else {
    //     console.log('Font must have 3 parts')
    //   }
    //   this._generateFont();
    // }

    /**
     * @member {String} - Return the font as CSS usable string. This is also how the font is stored internally for quick access.
     */
    get css() {
      return this._font
    }

    /**
     * Return the font as a CSS string with the size first scaled by multiplying by the *scale* factor.
     * @param {Number} scale - Scale factor.
     * @return {String} - Return the font as CSS usable string.
     */
    cssScaled(scale) {
      if (scale && scale != 1) {
        return this._styleAsCss() + ' ' + (this.size * scale) + 'px ' + this.family;
      } else {
        return this.css
      }
    }


    /**
     * @member {String} - Get or set the font family. Defaults to *sans-serif*.
     */
    get family() {
      return this._family || 'sans-serif'
    }

    set family(value) {
      this._family = value;
      this._generateFont();
    }

    /**
     * @member {Number} - Get or set the font size. The size is stored as a number and is in pixels.
     * The actual value may be altered when setting it to take into account the pixel
     * ratio of the screen. Defaults to *12*.
     */
    get size() {
      return this._size || CGV.pixel(12)
    }

    set size(value) {
      this._size = CGV.pixel(Number(value));
      this._generateFont();
    }

    /**
     * @member {String} - Get or set the font style. The possible values are *plain*, *bold*, *italic* and
     * *bold-italic*. Defaults to *plain*.
     */
    get style() {
      return this._style || 'plain'
    }

    set style(value) {
      this._style = value;
      this._generateFont();
    }

    /**
     * @member {Number} - Get the font height. This will be the same as the font [size]{@link Font#size}.
     */
    get height() {
      return this.size
    }


    /**
     * Measure the width of the supplied *text* using the *context* and the *Font* settings.
     *
     * @param {Context} context - The canvas context to use to measure the width.
     * @param {String} text - The text to measure.
     * @return {Number} - The width of the *text* in pixels.
     */
    width(ctx, text) {
      ctx.font = this.css;
      return ctx.measureText(text).width
    }

    _styleAsCss() {
      if (this.style == 'plain') {
        return 'normal'
      } else if (this.style == 'bold') {
        return 'bold'
      } else if (this.style == 'italic') {
        return 'italic'
      } else if (this.style == 'bold-italic') {
        return 'italic bold'
      } else {
        return ''
      }
    }

    _generateFont() {
      this._font = this._styleAsCss() + ' ' + this.size + 'px ' + this.family;
    }

  }

  /**
   * Calculate the width of multiple *strings* using the supplied *fonts* and *context*.
   * This method minimizes the number of times the context font is changed to speed up
   * the calculations
   * @function calculateWidths
   * @memberof Font
   * @static
   * @param {Context} ctx - The context to use for measurements.
   * @param {Font[]} fonts - An array of fonts. Must be the same length as *strings*.
   * @param {String[]} strings - An array of strings. Must be the same length as *fonts*.
   * @return {Number[]} - An array of widths.
   */
  Font.calculateWidths = function(ctx, fonts, strings) {
    ctx.save();
    var widths = [];
    var map = [];

    for (var i = 0, len = fonts.length; i < len; i++) {
      map.push({
        index: i,
        font: fonts[i],
        text: strings[i]
      });
    }

    map.sort( (a,b) => {
      return a.font > b.font ? 1 : -1;
    });

    var currentFont = ''
    var font;
    for (var i = 0, len = map.length; i < len; i++) {
      font = map[i].font;
      text = map[i].text;
      if (font != currentFont) {
        ctx.font = font;
        currentFont = font;
      }
      // widths[i] = ctx.measureText(text).width;
      widths[map[i].index] = ctx.measureText(text).width;
    }
    ctx.restore();
    return widths
  }

  CGV.Font = Font;

})(CGView);
