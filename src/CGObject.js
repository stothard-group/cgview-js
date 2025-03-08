//////////////////////////////////////////////////////////////////////////////
// CGObject
//////////////////////////////////////////////////////////////////////////////

import utils from './Utils';

// Generate cgvID
let cgvID = 0;
const generateID = function() {
  return `cgv-id-${cgvID++}`;
};

/**
 * The CGObject is the base class of many CGView Classes. In particular, any class
 * that is drawn on the map will be a subclass of CGObject (e.g. [Track](Track.html),
 * [Slot](Slot.html), [Feature](Feature.html), [Plot](Plot.html), etc).
 *
 * Any subclass instances will be given a unique temporary cgvID.
 * This id is not saved to JSON and should not be used across CGView sessions
 * (i.e. don't expect a feature to have the same cgvID if it's loaded in the viewer again).
 * Any object can be easily returned using the cgvID and [Viewer.objects](Viewer.html#objects).
 *
 * Classes that extend CGObject will have access to several commonly accessed viewer objects:
 * - viewer
 * - sequence
 * - canvas
 * - layout
 *
 * <a name="attributes"></a>
 * ### Attributes
 *
 * Attribute           | Type      | Description
 * --------------------|-----------|------------
 * [visible](#visible) | Boolean   | Object is visible [Default: true]
 * [meta](#meta)       | Object    | [Meta data](../tutorials/details-meta-data.html) [Default: {}]
 *
 */
class CGObject {

  /**
   * Create a new CGObject.
   * @param {Viewer} viewer - The viewer
   * @param {Object} options - [Attributes](#attributes) used to create the bookmark
   * @param {Object} [meta] - User-defined [Meta data](../tutorials/details-meta-data.html) to add to the bookmark.
   */
  constructor(viewer, options = {}, meta = {}) {
    // super();
    this._viewer = viewer;
    this.meta = utils.merge(options.meta, meta);
    this.visible = utils.defaultFor(options.visible, true);
    this._cgvID = generateID();
    viewer._objects[this.cgvID] = this;
  }

  /**
   * Return the class name as a string.
   * @return {String} - 'CGObject'
   */
  toString() {
    return 'CGObject';
  }

  get cgvID() {
    return this._cgvID;
  }

  /**
   * @member {Viewer} - Get the viewer.
   */
  get viewer() {
    return this._viewer;
  }

  /**
   * @member {Canvas} - Get the canvas.
   */
  get canvas() {
    return this.viewer.canvas;
  }

  /**
   * @member {Layout} - Get the layout.
   */
  get layout() {
    return this.viewer.layout;
  }

  /**
   * @member {Sequence} - Get the sequence.
   */
  get sequence() {
    return this.viewer.sequence;
  }

  /**
   * @member {Boolean} - Get or Set the visibility of this object.
   */
  get visible() {
    return this._visible;
  }

  set visible(value) {
    this._visible = value;
  }

  /**
   * @member {Boolean} - Get or Set the meta data of this object. See the [meta data](../tutorials/details-meta-data.html) tutorial for details.
   */
  get meta() {
    return this._meta;
  }

  set meta(value) {
    this._meta = value;
  }

  /**
   * Does this obejct have a particular plugin?
   * @param {String} pluginName - The name of the plugin
   * @return {Boolean} - Whether the object has the plugin
   */
  hasPlugin(pluginName) {
    if (this.pluginOptions) {
      const pluginIDs = Object.keys(this.pluginOptions).map(key => key.toLowerCase());
      return pluginIDs.includes(pluginName.toLowerCase());
    }
  }

  /**
   * Get the options for a particular plugin.
   * @param {String} pluginName - The name of the plugin
   * @return {Object} - The options for the plugin or undefined if the plugin is not found
   */
  optionsForPlugin(pluginName) {
    if (this.hasPlugin(pluginName)) {
      return this.pluginOptions[pluginName];
    }
  }


  /**
   * Remove the object from Viewer.objects
   */
  deleteFromObjects() {
    delete this.viewer._objects[this.cgvID];
  }

}

export default CGObject;


