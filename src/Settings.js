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
 * [format](#format)                   | String    | The layout format of the map: circular, linear [Default: circular]
 * [backgroundColor](#backgroundColor) | String    | A string describing the background color of the map [Default: 'white']. See {@link Color} for details.
 * [showShading](#showShading)         | Boolean   | Should a shading effect be drawn on the features [Default: true]
 * [arrowHeadLength](#arrowHeadLength) | Number    | Length of feature arrowheads as a proportion of the feature thickness. From 0 (no arrowhead) to 1 (arrowhead as long on the feature is thick) [Default: 0.3]
 * [minArcLength](#minArcLength)       | Number    | Minimum length in pixels to use when drawing arcs. From 0 to 2 pixels [Default: 0]
 * [initialMapThicknessProportion](#initialMapThicknessProportion) | Number  | Proportion of canvas size to use for drawing map tracks at a zoomFactor of 1 [Default: 0.1]
 * [maxMapThicknessProportion](#maxMapThicknessProportion) | Number  | Proportion of canvas size to use for drawing map tracks at max zoom level [Default: 0.5]
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
    // Only set format if provided. Otherwise the defaults in the Viewer constructor are used.
    if (options.format) {
      this.format = options.format;
    }
    this._backgroundColor = new Color( utils.defaultFor(options.backgroundColor, 'white') );
    this._geneticCode = utils.defaultFor(options.geneticCode, 11);
    this.arrowHeadLength = utils.defaultFor(options.arrowHeadLength, 0.3);
    this.minArcLength = utils.defaultFor(options.minArcLength, 0);
    this._showShading = utils.defaultFor(options.showShading, true);
    this.initialMapThicknessProportion = utils.defaultFor(options.initialMapThicknessProportion, 0.1);
    this.maxMapThicknessProportion = utils.defaultFor(options.maxMapThicknessProportion, 0.5);
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
   * @member {Number} - Get or set the genetic code used for translation.
   * This genetic code will be used unless a feature has an overriding genetic code.
   * Default: 11
   */
  get geneticCode() {
    return this._geneticCode || 11;
  }

  set geneticCode(value) {
    this._geneticCode = value;
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
   * @member {Number} - Set or get the minimum arc length. The value must be between 0 and 2 [Default: 0].
   *   Minimum arc length refers to the minimum size (in pixels) an arc will be drawn.
   *   At some scales, small features will have an arc length of a fraction
   *   of a pixel. In these cases, the arcs are hard to see.
   *   A minArcLength of 0 means no adjustments will be made.
   */
  set minArcLength(value) {
    this._minArcLength = utils.constrain(Number(value), 0, 2);
  }

  get minArcLength() {
    return this._minArcLength;
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
   * @member {Boolean} - Get or set the initial width/thickness of the map as a
   * proportion of the canvas dimension (Circular: minDimension; Linear:
   * height). The width will grow/shrink with the zoomFactor (Default: 0.1).
   * This value will be ignored if the
    * [maxMapThicknessProportion](#maxMapThicknessProportion) value is smaller.
   */
  get initialMapThicknessProportion() {
    return this.viewer.layout.initialMapThicknessProportion;
  }

  set initialMapThicknessProportion(value) {
    this.viewer.layout.initialMapThicknessProportion = value;
  }

  /**
   * @member {Boolean} - Get or set the maximum width/thickness of the map as a
   * proportion of the canvas width or height (Default: 0.5).
   */
  get maxMapThicknessProportion() {
    return this.viewer.layout.maxMapThicknessProportion;
  }

  set maxMapThicknessProportion(value) {
    this.viewer.layout.maxMapThicknessProportion = value;
  }

  /**
   * Update settings [attributes](#attributes).
   * See [updating records](../docs.html#s.updating-records) for details.
   * @param {Object} attributes - Object describing the properties to change
   */
  update(attributes) {
    this.viewer.updateRecords(this, attributes, {
      recordClass: 'Settings',
      validKeys: ['format', 'backgroundColor', 'showShading', 'arrowHeadLength','minArcLength', 'geneticCode', 'initialMapThicknessProportion', 'maxMapThicknessProportion']
    });
    this.viewer.trigger('settings-update', { attributes });
  }

  /**
   * Returns JSON representing the object
   */
  toJSON() {
    return {
      format: this.format,
      geneticCode: this.geneticCode,
      backgroundColor: this.backgroundColor.rgbaString,
      showShading: this.showShading,
      arrowHeadLength: this.arrowHeadLength,
      minArcLength: this.minArcLength,
      initialMapThicknessProportion: this.initialMapThicknessProportion,
      maxMapThicknessProportion: this.maxMapThicknessProportion
    };
  }

}

export default Settings;


