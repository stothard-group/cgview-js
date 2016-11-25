//////////////////////////////////////////////////////////////////////////////
// Font
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class Font {

    /**
     * The Font class is meant to store fonts in a simple and consistent manner..
     */
    constructor(font, options = {}) {
      this.font = font;
    }

    /**
     * Return the font as canvas usable string.
     */
    get font() {
      return this._font
    }

    /**
     * Set the font using a string with the format: font-family,style,size
     */
    set font(value) {
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

    /**
     * Return the font as canvas usable string.
     */
    get asCss() {
      return this._font
    }

    get family() {
      return this._family || 'arial'
    }

    set family(value) {
      this._family = value;
      this._generateFont();
    }

    get size() {
      return this._size || 12
    }

    set size(value) {
      this._size = CGV.pixel(Number(value));
      this._generateFont();
    }

    get style() {
      return this._style || 'plain'
    }

    set style(value) {
      this._style = value;
      this._generateFont();
    }

    height() {
      return size
    }

    // FIXME: This is going to be slow if used a lot
    width(ctx, text) {
      ctx.font = this.font;
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

  // 
  Font.calculateWidths = function(ctx, fonts, texts) {
    ctx.save();
    var widths = [];
    var map = [];

    for (var i = 0, len = fonts.length; i < len; i++) {
      map.push({
        index: i,
        font: fonts[i],
        text: texts[i]
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
      widths[i] = ctx.measureText(text).width;
    }
    ctx.restore();
    return widths
  }

  CGV.Font = Font;

})(CGView);
