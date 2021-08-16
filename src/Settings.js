//////////////////////////////////////////////////////////////////////////////
// Settings
//////////////////////////////////////////////////////////////////////////////

import Color from './Color';
import utils from './Utils';

/**
 * The CGView Settings contain general settings for the viewer.
 *
 * ### Action and Events
 *
 * Action                                  | Viewer Method                    | Settings Method     | Event
 * ----------------------------------------|----------------------------------|---------------------|-----
 * [Update](../docs.html#updating-records) | -                                | [update()](#update) | settings-update
 * [Read](../docs.html#reading-records)    | [settings](Viewer.html#settings) | -                   | -
 *
 * <a name="attributes"></a>
 * ### Attributes
 *
 * Attribute                           | Type      | Description
 * ------------------------------------|-----------|------------
 * [backgroundColor](#backgroundColor) | String    | A string describing the background color of the map [Default: 'white']. See {@link Color} for details.
 * [showShading](#showShading)         | Boolean   | Should a shading effect be drawn on the features [Default: true]
 * [arrowHeadLength](#arrowHeadLength) | Number    | Length of feature arrowheads as a proportion of the feature thickness. From 0 (no arrowhead) to 1 (arrowhead as long on the feature is thick) [Default: 0.3]
 *
 * ### Examples
 *
 */
class Settings {

  /**
   * Initialize Settings.
   * @param {Viewer} viewer - The viewer
   * @param {Object} options - [Attributes](#attributes) used to initialize settings.
   */
  constructor(viewer, options = {}) {
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

  /**
   * Update settings [attributes](#attributes).
   * See [updating records](../docs.html#s.updating-records) for details.
   * @param {Object} attributes - Object describing the properties to change
   */
  update(attributes) {
    this.viewer.updateRecords(this, attributes, {
      recordClass: 'Settings',
      validKeys: ['format', 'backgroundColor', 'showShading', 'arrowHeadLength']
    });
    this.viewer.trigger('settings-update', { attributes });
  }

  /**
   * Returns JSON representing the object
   */
  toJSON() {
    return {
      backgroundColor: this.backgroundColor.rgbaString,
      showShading: this.showShading,
      arrowHeadLength: this.arrowHeadLength
    };
  }

}

export default Settings;


