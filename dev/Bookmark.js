//////////////////////////////////////////////////////////////////////////////
// Bookmark
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {
  /**
   * Bookmarks are saved map locations. Bookmarks store the base pair (bp),
   * the zoomFactor (zoom) and map format (e.g. linear or circular). By default
   * the map backbone at the provided bp will be centered in the middle of the canvas.
   * The bbOffset attribute can be used to move the map backbone away from the center.
   * Bookmarks can have shortcut key associated with them. If the key is typed, while not
   * in a input field, the map will move to the bookmark position.
   *
   * ### Action and Events
   *
   * Action                                       | Viewer Method                                    | Bookmark Method                  | Event
   * ---------------------------------------------|--------------------------------------------------|----------------------------------|-----
   * [Add](tutorial-api.html#adding-records)      | [addBookmarks()](Viewer.html#addBookmarks)       | -                                | bookmarks-add
   * [Update](tutorial-api.html#updating-records) | [updateBookmarks()](Viewer.html#updateBookmarks) | [update()](Bookmark.html#update) | bookmarks-update
   * [Remove](tutorial-api.html#removing-records) | [removeBookmarks()](Viewer.html#removeBookmarks) | [remove()](Bookmark.html#remove) | bookmarks-remove
   * [Read](tutorial-api.html#reading-records)    | [bookmarks()](Viewer.html#bookmarks)             | -                                | -
   *
   *<a name="attributes"></a>
   * ### Attributes
   *
   * Attribute                          | Type     | Description
   * -----------------------------------|----------|------------
   * [name](Bookmark.html#name)         | String   | Name of bookmark [Default: "Bookmark-N" where N is the number of the bookmark]
   * [bp](Bookmark.html#bp)             | Number   | Base pair to center the map position [Default: Current bp]
   * [zoom](Bookmark.html#zoom)         | Number   | Zoom factor [Default: Current zoomFactor]
   * [format](Bookmark.html#format)     | String   | Map format [Default: Current map format]
   * [bbOffset](Bookmark.html#bbOffset) | Number   | Distance from the backbone to the center of the canvas [Default: 0]
   * [shortcut](Bookmark.html#shortcut) | String   | Single character shortcut that when pressed moves the map to this position [Default: N (see name) up to 9]
   * [favorite](Bookmark.html#favorite) | Boolean  | Bookmark is a favorite [Default: false]
   * [visible](Bookmark.html#visible)   | Boolean  | Bookmark is visible [Default: true]
   *
   * ### Examples
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
     * @param {Object} options - [Attributes](Bookmark.html#attributes) used to create the bookmark
     * @param {Object} [meta] - User-defined {@tutorial meta} to add to the bookmark.
     */
    constructor(viewer, options = {}, meta = {}) {
      super(viewer, options, meta);
      this.viewer = viewer;

      this.bp = CGV.defaultFor(options.bp, viewer.canvas.bpForCanvasCenter());
      this.zoom = CGV.defaultFor(options.zoom, viewer.zoomFactor);
      this.format = CGV.defaultFor(options.format, viewer.format);
      this.name = CGV.defaultFor(options.name, this.incrementalName());
      this.favorite = CGV.defaultFor(options.favorite, false);
      this.shortcut = CGV.defaultFor(options.shortcut, this.incrementalShortcut());
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

    update(attributes) {
      this.viewer.updateBookmarks(this, attributes);
    }

    /**
     * Remove bookmark...
     */
    remove() {
      this.viewer.removeBookmarks(this);
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
      if (shortcut < 10 && shortcut > 0) { return shortcut; }
    }


    toJSON(options = {}) {
      const json = {
        name: this.name,
        bp: this.bp,
        zoom: this.zoom,
        bbOffset: this.bbOffset,
        format: this.format,
        shortcut: this.shortcut
        // favorite: this.favorite
      };
      if (!this.favorite || options.includeDefaults) {
        json.favorite = this.favorite;
      }
      return json;
    }

  }

  CGV.Bookmark = Bookmark;
})(CGView);

