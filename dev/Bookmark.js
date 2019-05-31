//////////////////////////////////////////////////////////////////////////////
// Bookmark
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {
  /**
   * <br />
   * Bookmarks are saved map locations. Bookmarks store the base pair (bp),
   * the zoomFactor (zoom) and map format (e.g. linear or circular). By default
   * the map backbone at the provided bp will be centered in the middle of the canvas.
   * The bbOffset attribute can be used to move the map backbone away from the center.
   * Bookmarks can have shortcut key associated with them. If the key is typed, while not
   * in a input field, the map will move to the bookmark position.
   *
   * ```js
   * // Create a new bookmark for the current map postion
   * let bookmark = viewer.addBookmarks();
   * // => Bookmark {name: 'Bookmark-1', bp: 1, zoom: 1, format: 'linear', bbOffset: 0, shortcut: 1}
   * viewer.bookmarks().length;
   * // => 1
   *
   * // Edit the bookmark
   * bookmark.update({name: 'my gene'});
   * // => Bookmark {name: 'my gene', bp: 1, zoom: 1, format: 'linear', bbOffset: 0, shortcut: 1}
   *
   * // Move to the bookmark position
   * bookmark.moveTo()
   *
   * // Remove the bookmark
   * bookmark.remove();
   * viewer.bookmarks().length;
   * // => 0
   * ```
   */
  class Bookmark extends CGV.CGObject {

    // TODO:
    //  - Offsets of 0 do not need to be saved to json as they will be the default
    //  - Bookmarks need to handle contigs. How?

    /**
     * Create a new bookmark. 
     * @param {Viewer} viewer - The viewer
     * @param {Object} options - Options used to create the bookmark
     *
     *  Option                | Default          | Description
     *  ----------------------|------------------|------------------------------
     *  bp                    | Current bp       | Base pair at the center of the canvas. A value of 0 indicates the map is centered.
     *  zoom                  | Current zoomFactor | The zoom factor.
     *  format                | Current Format   | The map format (linear or circular).
     *  name                  | "Bookmark-N"     | Name for the bookmark. By default the name will be "Bookmark-" followed by the number of the bookmark.
     *  bbOffset              | 0                | Distance from center of map to backbone.
     *  favorite              | false            | Is this a favorite bookmark.
     *  shortcut              | N                | Single character shortcut. Pressing this keyboard character will be move the map to this position. Default to N (see Name) up to 9.
     *
     * @param {Object} [meta] - User-defined key:value pairs to add to the bookmark.
     */
    constructor(viewer, options = {}, meta = {}) {
      super(viewer, options, meta);
      this.viewer = viewer;

      this.bp = CGV.defaultFor(options.bp, viewer.canvas.bpForCanvasCenter());
      this.zoom = CGV.defaultFor(options.zoom, viewer.zoomFactor);
      this.format = CGV.defaultFor(options.format, viewer.format);
      this.name = CGV.defaultFor(options.name, this.incrementalName());
      this.favorite = CGV.defaultFor(options.favorite, false);
      this.shortcut = CGV.defaultFor(options.favorite, this.incrementalShortcut());
      this.bbOffset = CGV.defaultFor(options.bbOffset, viewer.bbOffset);
    }

    //////////////////////////////////////////////////////////////////////////
    // MEMBERS
    //////////////////////////////////////////////////////////////////////////

    /**
     * Return the class name as a string.
     * @return {String} - 'Bookmark'
     */
    toString() {
      return 'Bookmark';
    }

    /**
     * @member {Viewer} - Get the *Viewer*
     */
    get viewer() {
      return this._viewer;
    }

    set viewer(viewer) {
      if (this.viewer) {
        // TODO: Remove if already attached to Viewer
      }
      this._viewer = viewer;
      viewer._bookmarks.push(this);
    }

    /**
     * @member {String} - Get or set the *name*
     */
    get name() {
      return this._name;
    }

    set name(value) {
      this._name = value;
    }

    /**
     * @member {Number} - Get or set the *bp*
     */
    get bp() {
      return this._bp;
    }

    set bp(value) {
      this._bp = value;
    }

    /**
     * @member {Number} - Get or set the *zoom*
     */
    get zoom() {
      return this._zoom;
    }

    set zoom(value) {
      this._zoom = value;
    }

    /**
     * @member {String} - Get or set the *format*
     */
    get format() {
      return this._format;
    }

    set format(value) {
      this._format = value;
    }

    /**
     * @member {Boolean} - Get or set the *favorite*
     */
    get favorite() {
      return this._favorite;
    }

    set favorite(value) {
      this._favorite = value;
    }

    /**
     * @member {Character} - Get or set the *shortcut*
     */
    get shortcut() {
      return this._shortcut;
    }

    set shortcut(value) {
      this._shortcut = ([undefined, null, ''].includes(value)) ? undefined : String(value).charAt(0);
    }

    /**
     * Move and zoom the map to this Bookmarks position.
     */
    moveTo(duration = 1000) {
      if (this.viewer.format !== this.format) {
        this.viewer.settings.update({ format: this.format });
      }
      setTimeout( () => {
        this.viewer.zoomTo(this.bp, this.zoom, {duration, bbOffset: this.bbOffset});
      }, 0);
    }

    incrementalName() {
      const currentNames = this.viewer.bookmarks().map( b => b.name);
      return CGV.uniqueId('Bookmark-', currentNames.length, currentNames);
    }

    // TODO: for now shortcuts will only be created automatically up to 9
    incrementalShortcut() {
      const currentShortcuts = this.viewer.bookmarks().map( b => b.shorcut);
      const shortcut = CGV.uniqueId('', currentShortcuts.length, currentShortcuts);
      if (shortcut < 10 && shortcut > 0) { return shortcut}
    }


    toJSON() {
      const json = {
        name: this.name,
        bp: this.bp,
        zoom: this.zoom,
        bbOffset: this.bbOffset,
        format: this.format,
        favorite: this.favorite,
        shortcut: this.shortcut
      };
      return json;
    }

  }

  CGV.Bookmark = Bookmark;
})(CGView);

