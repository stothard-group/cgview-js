// Formatting:
//    - No space between description and params
/**
 *
 * ### Action and Events
 *
 * <a name="attributes"></a>
 * ### Attributes
 *
 * ### Examples
 *
 * @extends CGObject
 *
 * ```js
 * // Create a 
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


/**
 * [meta](CGObject.html#meta)       | Object    | [Meta data](../tutorials/details-meta-data.html) for Bookmark
 */

  /**
   * Create a new bookmark.
   * @param {Viewer} viewer - The viewer
   * @param {Object} options - [Attributes](#attributes) used to create the bookmark
   * @param {Object} [meta] - User-defined [Meta data](../tutorials/details-meta-data.html) to add to the bookmark.
   */
