//////////////////////////////////////////////////////////////////////////////
// Events
//////////////////////////////////////////////////////////////////////////////

/**
 * <br />
 * Events is a system to plug in callbacks to specific events in CGV.
 * Use [on](#on) to add a callback and [off](#off) to remove it.
 * Here are a list of events supported in CGV:
 *
 *  Event               | Description
 *  --------------------|-------------
 *  legend-update       | Called after legend items removed or added
 *  caption-update      | Called after caption items removed or added
 *  track-update        | Called when track is updated
 *  resize              | Called when the Viewer size is changed
 *  font-update         | Called when the font is changed (e.g. size, family, etc)
 *  zoom-start          | Called once before viewer starts zoom animation
 *  zoom                | Called every frame of the zoom animation
 *  zoom-end            | Called after zooming is complete
 *  mousemove           | Called when the mouse moves on the map
 *  click               | Called after the mouse is clicked
 *
 *  track-load-progress-changed: needs better name
 *
 *
 *  NOTE: from JSpectraViewer - May use some of these still
 *  drag-start          | Called once before viewer starts drag animation
 *  drag                | Called every frame of the drag animation
 *  drag-end            | Called after dragging is complete
 *  domain-change       | Called after the viewer domains have changed
 *  selection-add       | Called when an element is added to the selection
 *  selection-remove    | Called after an element is removed from the selection
 *  selection-clear     | Called before the selection is cleared
 *  selection-empty     | Called after the selection becomes empty
 *  highlight-start     | Called when an element is highlighted
 *  highlight-end       | Called when an element is unhighlighted
 *  label-click         | Called when a annotation label is clicked
 */
class Events {

  constructor() {
    this._handlers = {};
  }


  /**
   * Attach a callback function to a specific JSV event.
   * ```js
   * sv = new JSV.SpectraViewer('#my-spectra');
   * sv.on('drag-start', function() { console.log('Dragging has begun!') };
   *
   * // The event can be namespaced for easier removal later
   * sv.on('drag-start.my_plugin', function() { console.log('Dragging has begun!') };
   * ```
   * @param {String} event Name of event. Events can be namespaced.
   * @param {Function} callback Function to call when event is triggered
   */
  on(event, callback) {
    const handlers = this._handlers;
    checkType(event);
    const type = parseEvent(event);
    if ( !handlers[type] ) handlers[type] = [];
    handlers[type].push( new Handler(event, callback) );
  }

  /**
   * Remove a callback function from a specific JSV event. If no __callback__ is provided,
   * then all callbacks for the event will be removed. Namespaced events can and should be used
   * to avoid unintentionally removing callbacks attached by other plugins.
   * ```js
   * // Remove all callbacks attached to the 'drag-start' event.
   * // This includes any namespaced events.
   * sv.off('drag-start');
   *
   * // Remove all callbacks attached to the 'drag-start' event namespaced to 'my_plugin'
   * sv.off('drag-start.my_plugin');
   *
   * // Remove all callbacks attached to any events namespaced to 'my_plugin'
   * sv.off('.my_plugin');
   * ```
   * @param {String} event Name of event. Events can be namespaced.
   * @param {Function} callback Specfic function to remove
   */
  off(event, callback) {
    const handlers = this._handlers;
    checkType(event);
    const type = parseEvent(event);
    const namespace = parseNamespace(event);
    // If no callback is supplied remove all of them
    if (callback === undefined) {
      if (namespace) {
        if (type) {
          handlers[type] = handlers[type].filter( h => h.namespace !== namespace );
        } else {
          Object.keys(handlers).forEach(function(key) {
            handlers[key] = handlers[key].filter( h => h.namespace !== namespace );
          });
        }
      } else {
        handlers[type] = undefined;
      }
    } else {
      // Remove specific callback
      handlers[type] = handlers[type].filter( h => h.callback !== callback );
    }
    this._handlers = handlers;
  }

  /**
   * Trigger a callback function for a specific event.
   * ```js
   * // Triggers all callback functions associated with drag-start
   * sv.trigger('drag-start');
   *
   * // Triggers can also be namespaced
   * sv.trigger('drag-start.my_plugin');
   * ```
   * @param {String} event Name of event. Events can be namespaced.
   * @param {Object} object Object to be passed back to 'on'.
   */
  trigger(event, object) {
    const handlers = this._handlers;
    checkType(event);
    const type = parseEvent(event);
    const namespace = parseNamespace(event);
    if (Array.isArray(handlers[type])) {
      handlers[type].forEach(function(handler) {
        if (namespace) {
          if (handler.namespace === namespace) handler.callback.call(null, object);
        } else {
          handler.callback.call(null, object);
        }
      });
    }
  }

}

/** @ignore */

const checkType = function(type) {
  if (typeof type !== 'string') {
    throw new Error('Type must be a string');
  }
};

const Handler = function(event, callback) {
  this.callback = callback;
  this.eventType = parseEvent(event);
  this.namespace = parseNamespace(event);
};

const parseEvent = function(event) {
  return event.replace(/\..*/, '');
};

const parseNamespace = function(event) {
  const result = event.match(/\.(.*)/);
  return result ? result[1] : undefined;
};

export default Events;


