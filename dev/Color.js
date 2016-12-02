//////////////////////////////////////////////////////////////////////////////
// Color
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class Color {

    /**
     * The Color class is meant to contain colors in a consistant manner as
     * well as the opacity. All colors are stored as RGBA.
     * The colorString can be in these formats: ...
     */
    constructor(colorString, options = {}) {
      this.colorString = colorString;
    }

    /**
     * Return the color as an RGBA string.
     */
    get colorString() {
      return this._rgbaString
    }

    /**
     * Set the color using, RGB, RGBA, Hex, etc String
     */
    set colorString(value) {
      this._rgbaString = Color.convertToRgba(value, this.opacity);
      this._updateOpacityFromRgba();
    }


    get opacity() {
      return (this._opacity == undefined) ? 1 : this._opacity;
    }

    set opacity(value) {
      this._opacity = value;
      this._updateRgbaOpacity();
    }

    get rgbaString() {
      return this._rgbaString;
    }

    get rgbString() {
      return Color.rgbToString(this.rgb);
    }

    get rgb() {
      var result = /^rgba\((\d+),(\d+),(\d+)/.exec(this.rgbaString);
      return result ? { r: Number(result[1]), g: Number(result[2]), b: Number(result[3]) } : undefined
    }

    get rgba() {
      var result = /^rgba\((\d+),(\d+),(\d+),([\d]]+)/.exec(this.rgbaString);
      return result ? { r: Number(result[1]), g: Number(result[2]), b: Number(result[3]), a: Number(result[4]) } : undefined
    }

    set rgba(value) {
      this.colorString = Color.rgbaToString(value);
      this._updateOpacityFromRgba();
    }

    set rgb(value) {
      this.colorString = Color.rgbToString(value);
      this._updateOpacityFromRgba();
    }

    set hsv(value) {
      var rgba = Color.hsv2rgb(value); 
      rgba.a = this.opacity;
      this.rgba = rgba;
    }

    get hsv() {
      return Color.rgb2hsv(this.rgb)
    }

    get hex() {
    }

    get hla() {
    }

    _updateRgbaOpacity() {
      this._rgbaString = this._rgbaString.replace(/^(rgba\(.*,)([\d\.]+?)(\))/, (m, left, opacity, right) => {
        return left + this.opacity + right;
      });
    }

    _updateOpacityFromRgba() {
      var result = /^rgba.*,([\d\.]+?)\)$/.exec(this.rgbaString);
      if (result) {
        this._opacity = Number(result[1]);
      }
    }

  }

  /**
   * Convert a legal color value to RGBA. See http://www.w3schools.com/cssref/css_colors_legal.asp
   * @function hexToRgba
   * @memberof Color
   * @param {String} value - *value* can be a hexidecimal, HSL, RGB, or name.
   * @param {Number} opacity - a number between 0 and 1.
   * @return {String} The color as RGBA.
   * @static
   */
  Color.convertToRgba = function(value, opacity = 1) {
    if ( /^#/.test(value) ) {
      return Color.hexToRgba(value, opacity)
    } else if ( /^rgb\(/.test(value) ) {
      return Color.rgbToRgba(value, opacity)
    } else if ( /^rgba\(/.test(value) ) {
      return value.replace(/ +/g, '')
    } else if ( /^hsl\(/.test(value) ) {
      return Color.hslToRgba(value, opacity)
    } else {
      return Color.nameToRgba(value, opacity)
    }
  }

  /**
   * Convert a named color to RGBA.
   * @function nameToRgba
   * @memberof Color
   * @param {String} name - *name* should be one of the blah blah on website
   * @param {Number} opacity - a number between 0 and 1.
   * @return {String} The color as RGBA.
   * @static
   */
  Color.nameToRgba = function(name, opacity = 1) {
    name = name.toLowerCase();
    if (name == 'white') {
      return Color.rgbToRgba('rgb(255,255,255)', opacity);
    } else if (name == 'black') {
      return Color.rgbToRgba('rgb(0,0,0)', opacity);
    }
  }

  /**
   * Convert an RGB color to RGBA.
   * @function rgbToRgba
   * @memberof Color
   * @param {String} rgb - *rgb* should take the form of 'rgb(red,green,blue)', where red, green and blue are numbers between 0 and 255.
   * @param {Number} opacity - a number between 0 and 1.
   * @return {String} The color as RGBA.
   * @static
   */
  Color.rgbToRgba = function(rgb, opacity = 1) {
    // Remove spaces
    rgb = rgb.replace(/ +/g, '');
    rgb = rgb.replace('rgb', 'rgba');
    return rgb.replace(')', ',' + opacity + ')')
  }

  /**
   * Convert an HSL color to RGBA.
   * @function hslToRgba
   * @memberof Color
   * @param {String} hsl - *hsl* values should be NOT Implemented yet
   * @param {Number} opacity - a number between 0 and 1.
   * @return {String} The color as RGBA.
   * @static
   */
  Color.hslToRgba = function(hsl) {
  }

  /**
   * Convert RGB representation to HSV.
   * r, g, b can be either in <0,1> range or <0,255> range.
   * Credits to http://www.raphaeljs.com
   */
  Color.rgb2hsv = function(rgb) {

    var r = rgb.r;
    var g = rgb.g;
    var b = rgb.b;

    if (r > 1 || g > 1 || b > 1) {
      r /= 255;
      g /= 255;
      b /= 255;
    }

    var H, S, V, C;
    V = Math.max(r, g, b);
    C = V - Math.min(r, g, b);
    H = (C == 0 ? null :
         V == r ? (g - b) / C + (g < b ? 6 : 0) :
         V == g ? (b - r) / C + 2 :
                  (r - g) / C + 4);
    H = (H % 6) * 60;
    S = C == 0 ? 0 : C / V;
    return { h: H, s: S, v: V };
  }

  /**
   * Convert HSV representation to RGB HEX string.
   * Credits to http://www.raphaeljs.com
   */
  Color.hsv2rgb = function(hsv) {
    var R, G, B, X, C;
    var h = (hsv.h % 360) / 60;

    C = hsv.v * hsv.s;
    X = C * (1 - Math.abs(h % 2 - 1));
    R = G = B = hsv.v - C;

    h = ~~h;
    R += [C, X, 0, 0, X, C][h];
    G += [X, C, C, X, 0, 0][h];
    B += [0, 0, X, C, C, X][h];

    var r = Math.floor(R * 255);
    var g = Math.floor(G * 255);
    var b = Math.floor(B * 255);
    return { r: r, g: g, b: b };
  }

  // Adapted from:
  // http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  /**
   * Convert a Hexidecimal color to RGBA.
   * @function hexToRgba
   * @memberof Color
   * @param {String} hex - *hex* can be shorthand (e.g. "03F") or fullform (e.g. "0033FF"), with or without the starting '#'.
   * @param {Number} opacity - a number between 0 and 1.
   * @return {String} The color as RGBA.
   * @static
   */
  Color.hexToRgba = function(hex, opacity) {
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
      return r + r + g + g + b + b;
    });
    // Defaults:
    var red = 0;
    var green = 0;
    var blue = 0;
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      red = parseInt(result[1], 16);
      green = parseInt(result[2], 16);
      blue = parseInt(result[3], 16);
    }
    // return "rgba(" + red + "," + green + "," + blue + "," + opacity +  ")"
    return { r: red, g: green, b: blue, a: opacity }
  }

  Color.rgbaToString = function(rgba) {
    return 'rgba(' + rgba.r + ','+ rgba.g + ','  + rgba.b + ',' + rgba.a + ')'
  }

  Color.rgbToString = function(rgb) {
    return 'rgb(' + rgb.r + ','+ rgb.g + ','  + rgb.b + ')'
  }

  CGV.Color = Color;

})(CGView);
