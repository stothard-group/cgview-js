
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
//    - bp (center), zoom level, format (circular/linear),
//    - id/name, percentage offset x/y, favorite, shortcut
// - Hitting the shortcut key will move to that bookmark (like numbers in nmrLib app)
// - Default shortcut keys will be numbers 1, 2, 3, ...
// - Bookmarks will have "center" button beside x/y offsets to center on bp.
//    - This just sets the offsets to 0
//    - Offsets of 0 do not need to be saved to json as they will be the default

    /**
     * Bookmarks are saved map locations. Bookmarks store the base pair (bp),
     * the zoomFactor (zoom) and map format (e.g. linear or circular). By default
     * the map backbone at the provided bp will be centered in the middle of the canvas.
     * The bbOffset attribute can be used to move the map backbone away from the center.
     *
     * @param {Viewer} viewer - The viewer
     * @param {Object} options - Options used to create the bookmark
     *
     *  Option                | Default          | Description
     *  ----------------------|-------------------------------------------------
     *  bp                    | Current bp       | Base pair at the center of the canvas. A value of 0 indicates the map is centered.
     *  zoom                  | Current zoomFactor | The zoom factor.
     *  format                | Current Format   | The map format (linear or circular).
     *  name                  | "Bookmark-N"     | Name for the bookmark. By default the name will be "Bookmark-" followed by the number of the bookmark.
     *  bbOffset              | 0                | Distance from center of map to backbone.
     *  favorite              | false            | Is this a favorite bookmark.
     *  shortcut              | N                | Single character shortcut. Pressing this keyboard character will be move the map to this position. Default to N (see Name) up to 9.
     *
     * @param {Object=} meta - User-defined key:value pairs to add to the bookmark.
     */
    // FIXME: How do bookmarks handle position related to contigs???
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


      // const halfRangeWidth = viewer.scale.x.range()[1] / 2;
      // const halfRangeHeight = viewer.scale.y.range()[1] / 2;

      // Offset is the distance from the backbone to the center of the canvas.
      // const offset = viewer.layout.centerOffsetForPoint({x: halfRangeWidth, y: halfRangeHeight})
      // this.offset = viewer.backbone.adjustedCenterOffset - offset;
      // this.offset = viewer.bbOffset;
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

