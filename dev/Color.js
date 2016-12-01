//////////////////////////////////////////////////////////////////////////////
// Color
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class Color {

    /**
     * The Color class is meant to contain colors in a consistant manner as
     * well as the opacity. All colors are stored as RGBA.
     */
    constructor(color, options = {}) {
      this.color = color;
    }

    /**
     * Return the color as an RGBA string.
     */
    get color() {
      return this._color
    }

    /**
     * Set the color using, RGB, RGBA, Hex, etc
     */
    set color(value) {
      this._color = Color.convertToRgba(value, this.opacity);
      this._updateOpacityFromRgba();
    }


    get opacity() {
      return this._opacity || 1
    }

    set opacity(value) {
      this._opacity = value;
      this._updateRgbaOpacity();
    }

    get rgba() {
      return this.color;
    }

    get red() {
      var result = /^rgba\((\d+),\d+,\d+/.exec(this.color);
      return result ? Number(result[1]) : undefined
    }

    get green() {
      var result = /^rgba\(\d+,(\d+),\d+/.exec(this.color);
      return result ? Number(result[1]) : undefined
    }

    get blue() {
      var result = /^rgba\(\d+,\d+,(\d+)/.exec(this.color);
      return result ? Number(result[1]) : undefined
    }

    get hex() {
    }

    get hla() {
    }

    _updateRgbaOpacity() {
      this._color = this._color.replace(/^(rgba\(.*,)([\d\.]+?)(\))/, (m, left, opacity, right) => {
        return left + this.opacity + right;
      });
    }

    _updateOpacityFromRgba() {
      var result = /^rgba.*,([\d\.]+?)\)$/.exec(this.color);
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
    return "rgba(" + red + "," + green + "," + blue + "," + opacity +  ")"
  }

  CGV.Color = Color;

})(CGView);
