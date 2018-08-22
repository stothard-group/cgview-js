//////////////////////////////////////////////////////////////////////////////
// CGObject
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  cgvID = 0;

  /**
   * <br />
   * The CGObject is the base class of many CGV Classes. In particular, any class that
   * that is drawn on the map will be a subclass of CGObject (e.g. [Track](Track.html),
   * [Slot](Slot.html), [Feature](Feature.html), [Plot](Plot.html), etc).
   * Any object can be easily returned using the cgvID and [Viewer.objects](Viewer.js.html#objects).
   */
  class CGObject extends CGV.Events {

    /**
     * @param {Viewer} viewer - The viewer object.
     * @param {Object} options - 
     *
     *  Option                | Default          | Description
     *  ----------------------|-------------------------------------------------
     *  visible               | true             | Whether to draw the object or not.
     *
     * @param {Obejct} meta - 
     */
    constructor(viewer, options = {}, meta = {}) {
      super();
      this._viewer = viewer;
      this.meta = CGV.merge(options.meta, meta);
      this.visible = CGV.defaultFor(options.visible, true);
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
      return this._cgvID
    }


    /**
     * @member {Viewer} - Get the viewer.
     */
    get viewer() {
      return this._viewer
    }

    /**
     * @member {Canvas} - Get the canvas.
     */
    get canvas() {
      return this.viewer.canvas
    }

    /**
     * @member {Sequence} - Get the sequence.
     */
    get sequence() {
      return this.viewer.sequence
    }

    /**
     * @member {Boolean} - Get or Set the visibility of this object.
     */
    get visible() {
      return this._visible
    }

    set visible(value) {
      this._visible = value;
    }

    /**
     * @member {Boolean} - Get or Set the meta data of this object.
     */
    get meta() {
      return this._meta
    }

    set meta(value) {
      this._meta = value;
    }

  }

  let generateID = function() {
    return 'cgv-id-' + cgvID++;
  }

  CGV.CGObject = CGObject;

})(CGView);
