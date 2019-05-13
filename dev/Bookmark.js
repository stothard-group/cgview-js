
//////////////////////////////////////////////////////////////////////////////
// Bookmark
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {
  /**
   * <br />
   * The CGView Bookmark class contains details for a single bookmark.
   */
  class Bookmark extends CGV.CGObject {

// - Each bookmark will have the following attributes:
//    - bp (center), zoom level, layout (circular/linear),
//    - id/name, percentage offset x/y, favorite, shortcut
// - Hitting the shortcut key will move to that bookmark (like numbers in nmrLib app)
// - Default shortcut keys will be numbers 1, 2, 3, ...
// - Bookmarks can be ordered like tracks, etc (that way the user can set the numbers)
// - Bookmarks will have "center" button beside x/y offsets to center on bp.
//    - This just sets the offsets to 0
//    - Offsets of 0 do not need to be saved to json as they will be the default

    /**
     * Create a Bookmark
     *
     * @param {Viewer} viewer - The viewer
     * @param {Object} options - Options used to create the bookmark
     *
     *  Option                | Default          | Description
     *  ----------------------|-------------------------------------------------
     *  bp                    | 0                | Base pair at the center of the canvas. A value of 0 indicates the map is centered.
     *  zoom                  | 1                | The zoom factor.
     *  layout                | "circular"       | The map format (linear or circular).
     *  name                  | "Bookmark-N"     | Name for the bookmark. By default the name will be "Bookmark-" followed by the number of the bookmark.
     *  offsetX               | 0                | Offset X of the map backbone. DETAILS TO COME
     *  offsetY               | 0                | Offset Y of the map backbone. DETAILS TO COME
     *  favorite              | false            | Is this a favorite bookmark.
     *  shortcut              | N                | Single character shortcut. Pressing this keyboard character will be move the map to this position. Default to N (see Name) up to 9.
     *
     * @param {Object=} meta - User-defined key:value pairs to add to the bookmark.
     */
    // FIXME: How do bookmarks handle position related to contigs???
    constructor(viewer, options = {}, meta = {}) {
      super(viewer, options, meta);
      this.viewer = viewer;

      this.bp = CGV.defaultFor(options.bp, 0);
      this.zoom = CGV.defaultFor(options.zoom, 1);
      this.layout = CGV.defaultFor(options.layout, 'circular');
      this.name = CGV.defaultFor(options.name, 'BOOKMARK');
      this.favorite = CGV.defaultFor(options.favorite, false);
      this.shortcut = CGV.defaultFor(options.favorite, '1');
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
     * @member {String} - Get or set the *layout*
     */
    get layout() {
      return this._layout;
    }

    set layout(value) {
      this._layout = value;
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
      this._shortcut = value;
    }


    /**
     * Move and zoom the map to this Bookmarks position.
     */
    goto() {
      this.viewer.zoomTo(this.bp, this.zoom);
    }


    toJSON() {
      const json = {
        name: this.name,
        bp: this.bp,
        zoom: this.zoom,
        layout: this.layout,
        favorite: this.favorite,
        shortcut: this.shortcut
      };
      return json;
    }

  }

  CGV.Bookmark = Bookmark;
})(CGView);

