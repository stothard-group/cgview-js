//////////////////////////////////////////////////////////////////////////////
// Settings
//////////////////////////////////////////////////////////////////////////////

import Color from './Color';
import utils from './Utils';

/**
 * <br />
 * The CGView Settings contain general settings for the viewer.
 */
class Settings {

  /**
   * Create a the Settings
   *
   * @param {Viewer} viewer - The viewer
   * @param {Object} options - Settings values to override the defaults
   * <br />
   *
   * Name         | Type   | Description
   * -------------|--------|------------
   * backgroundColor | Color  | Background [Color](Color.html) of viewer (Default: 'white')
   * arrowHeadLength | Number | Arrow head length as a fraction (0-1) of the slot width (Default: 0.3)
   * showShading     | Boolean | Should arrows and other components be drawn with shading (Default: true)
   */
  constructor(viewer, options = {}, meta = {}) {
    this.viewer = viewer;
    this._backgroundColor = new Color( utils.defaultFor(options.backgroundColor, 'white') );
    this.arrowHeadLength = utils.defaultFor(options.arrowHeadLength, 0.3);
    this._showShading = utils.defaultFor(options.showShading, true);
    this.viewer.trigger('settings-update', {attributes: this.toJSON({includeDefaults: true})});
  }

  /**
   * Return the class name as a string.
   * @return {String} - 'Settings'
   */
  toString() {
    return 'Settings';
  }

  /**
   * @member {String} - Get or set the map format: circular, linear
   */
  get format() {
    return this.viewer.format;
  }

  set format(value) {
    this.viewer.format = value;
  }

  /**
   * @member {Color} - Get or set the backgroundColor. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
   */
  get backgroundColor() {
    return this._backgroundColor;
  }

  set backgroundColor(color) {
    if (color === undefined) {
      this._backgroundColor = new Color('white');
    } else if (color.toString() === 'Color') {
      this._backgroundColor = color;
    } else {
      this._backgroundColor = new Color(color);
    }
    this.viewer.fillBackground();
  }

  /**
   * @member {Number} - Set or get the arrow head length as a fraction of the slot width. The value must be between 0 and 1 [Default: 0.3].
   */
  set arrowHeadLength(value) {
    this._arrowHeadLength = utils.constrain(Number(value), 0, 1);
  }

  get arrowHeadLength() {
    return this._arrowHeadLength;
  }

  /**
   * @member {Boolean} - Get or set whether arrows and other components whould be draw with shading (Default: true).
   */
  get showShading() {
    return this._showShading;
  }

  set showShading(value) {
    this._showShading = value;
    this.viewer.drawFull();
  }

  update(attributes) {
    this.viewer.updateRecords(this, attributes, {
      recordClass: 'Settings',
      validKeys: ['format', 'backgroundColor', 'showShading', 'arrowHeadLength']
    });
    this.viewer.trigger('settings-update', { attributes });
  }


  toJSON() {
    return {
      backgroundColor: this.backgroundColor.rgbaString,
      showShading: this.showShading,
      arrowHeadLength: this.arrowHeadLength
    };
  }

}

export default Settings;


