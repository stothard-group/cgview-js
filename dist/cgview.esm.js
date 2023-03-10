// +-------------------------------------------------------+
// |             _____________    ___                      |
// |            / ____/ ____/ |  / (_)__ _      __         |
// |           / /   / / __ | | / / / _ \ | /| / /         |
// |          / /___/ /_/ / | |/ / /  __/ |/ |/ /          |
// |          \____/\____/  |___/_/\___/|__/|__/           |
// +-------------------------------------------------------+

import * as d3 from 'd3';

var version = "1.4.1";

//////////////////////////////////////////////////////////////////////////////
// CGArray
//////////////////////////////////////////////////////////////////////////////

/**
 * CGArray is essentially an array for holding CGV Objects. Any method
 * that works on an Array will also work on a CGArray.
 *
 * If a single array is provided it will be converted to an CGArray.
 * If mulitple elements are provided, they will be added to the new CGArray.
 *
 * ### Examples
 * ```js
 * const a1 = new CGArray(1, 2, 3);
 * => CGArray [1,2,3]
 *
 * const a2 = new CGArray([1,2,3])
 * => CGArray [1,2,3]
 * ```
 */
class CGArray extends Array {

  constructor(...items) {
    let elements = items;
    if ( (items.length === 1) && (Array.isArray(items[0])) ) {
      elements = items[0];
    }
    if (elements.length === 1) {
      super();
      this.push(elements[0]);
    } else if (elements.length > 20000) {
      // Note: 50,000 was too large, so we're trying 40,000
      // Note: 40,000 was too large (on Chrome), so now we're trying 30,000 - 2022-02-22
      // Note: 30,000 was too large (on Chrome), so now we're trying 20,000 - 2022-05-03
      super();
      for (let i = 0, len = elements.length; i < len; i++) {
        this.push(elements[i]);
      }
    } else {
      super(...elements);
    }
  }

  /**
 * Return the string 'CGArray'
 * @return {String}
 */
  toString() {
    return 'CGArray';
  }

  /**
 * Returns true if the CGArray is not empty.
 * @return {Boolean}
 */
  present() {
    return this.length > 0;
  }

  /**
 * Return true if the CGArray is empty.
 * @return {Boolean}
 */
  empty() {
    return this.length === 0;
  }

  /**
 * Returns new CGArray with element removed
 * @return {CGArray}
 */
  remove(element) {
    return this.filter( i => i !== element );
  }

  /**
   * Return the first element of the CGArray or "undefined" if the array is empty
   * @return {Element|or|undefined}
   */
  get first() {
    return this[0];
  }

  /**
   * Return the last element of the CGArray or "undefined" if the array is empty
   * @return {Element|or|undefined}
   */
  get last() {
    return this[this.length - 1];
  }

  // FIXME: return an CGArray with a single element of 0 when it should be empty
  // FIXME: Using Polyfill for now
  // filter(selector) {
    // return new CGV.CGArray(Array.prototype.filter(selector));
  // }

  filter(func, thisArg) {
    if ( ! ((typeof func === 'Function' || typeof func === 'function') && this) )
      throw new TypeError();

    let len = this.length >>> 0,
        res = new Array(len), // preallocate array
        t = this, c = 0, i = -1;
    if (thisArg === undefined){
      while (++i !== len){
        // checks to see if the key was set
        if (i in this){
          if (func(t[i], i, t)){
            res[c++] = t[i];
          }
        }
      }
    } else {
      while (++i !== len){
        // checks to see if the key was set
        if (i in this){
          if (func.call(thisArg, t[i], i, t)){
            res[c++] = t[i];
          }
        }
      }
    }

    res.length = c; // shrink down array to proper size
    return new CGArray(res);
  }

  /**
   * @private
   */
  // FIXME: return an CGArray with a single element of 0 when it should be empty
  // FIXME: Using Polyfill for now
  // https://github.com/jonathantneal/array-flat-polyfill/blob/master/src/flat.js
  flat() {
    var self = this;
    var depth = isNaN(arguments[0]) ? 1 : Number(arguments[0]);
    return depth ? Array.prototype.reduce.call(this, function (acc, cur) {
      if (Array.isArray(cur)) {
        acc.push.apply(acc, self.flat.call(cur, depth - 1));
      } else {
        acc.push(cur);
      }

      return acc;
    }, []) : Array.prototype.slice.call(this);
  }

  /**
   * @private
   */
  map(...rest) {
    return (this.length === 0) ? this : super.map(...rest);
  }

  /**
   * Move the an item from oldIndex to newIndex.
   * @param {Number} oldIndex - index of element to move
   * @param {Number} newIndex - move element to this index
   */
  move(oldIndex, newIndex) {
    if (newIndex >= this.length) {
      let k = newIndex - this.length;
      while ((k--) + 1) {
        this.push(undefined);
      }
    }
    this.splice(newIndex, 0, this.splice(oldIndex, 1)[0]);
    return this;
  }

  /**
   * Retrieve subset of CGArray or an individual element from CGArray depending on term provided.
   * To find elements by cgvID use [Viewer.objects](Viewer.html#objects) instead.
   * Term      | Returns
   * ----------|----------------
   * undefined | Full CGArray
   * Ingeter   | The element at the index (base-1)
   * String    | First element with an 'name' property same as string or undefined
   * Array     | CGArray with elements with matching 'name' property
   *
   * @param {Integer|String|Array} term - The values returned depend on the term (see above table).
   * @return {CGArray|or|Element}
   */
  get(term) {
    if (term === undefined) {
      return this;
    } else if (Number.isInteger(term)) {
      return this[term - 1];
    } else if (typeof term === 'string') {
      return this.filter( element => element.name && element.name.toLowerCase() === term.toLowerCase() )[0];
    } else if (Array.isArray(term)) {
      return this.filter( element => term.some( name => element.name === name ) );
    } else {
      return new CGArray();
    }
  }

  /**
   * Return new CGArray with no duplicated values.
   * @return {CGArray}
   */
  unique() {
  // return new CGArray(this.filter( onlyUnique ));
    return CGArray.from(new Set(this));
  }

  /**
   * Change one or more properties of each element of the CGArray.
   * ```javascript
   * my_cgarray.attr(property, value)
   * my_cgarray.attr( {property1: value1, property2: value2} )
   * ```
   *
   * @param {Property|Value} attributes A property name and the new value.
   * @param {Object}     attributes An object properties and their new values.
   * @return {CGArray}
   */
  attr(attributes) {
    if ( (arguments.length === 1) && (typeof attributes === 'object') ) {
      const keys = Object.keys(attributes);
      const keyLen = keys.length;
      for (let i = 0, len = this.length; i < len; i++) {
        for (let j = 0; j < keyLen; j++) {
          this[i][keys[j]] = attributes[keys[j]];
        }
      }
    } else if (arguments.length === 2) {
      for (let i = 0, len = this.length; i < len; i++) {
        this[i][arguments[0]] = arguments[1];
      }
    } else if (attributes !== undefined) {
      throw new Error('attr(): must be 2 arguments or a single object');
    }
    return this;
  }

  /**
  * iterates through each element of the cgarray and run the callback.
  * In the callback _this_ will refer to the element.
  * ```javascript
  * .each(function(index, element))
  * ```
  *
  * Note: This is slower then a _forEach_ or a _for loop_ directly on the set.
  * @param {Function} callback Callback run on each element of CGArray.
  *   The callback will be called with 2 parameters: the index of the element
  *   and the element itself.
  * @return {CGArray}
  */
  // NOTE: it may feel better if this was (item, index) not (index, item)
  each(callback) {
    for (let i = 0, len = this.length; i < len; i++) {
      callback.call(this[i], i, this[i]);
    }
    return this;
  }

  /**
   * Return the CGArray as an Array
   * @return {Array}
   * @private
   */
  asArray() {
    return Array.from(this);
  }

  /**
   * Returns the object incased as a CGArray. If it's already a CGArray, it is returned untouched.
   * Helpfull to handle method parameters that can submit a single object or a CGArray of objects.
   * @param {Object} object
   *
   * @return {CGArray}
   */
  static arrayerize (object) {
    return (object.toString() === 'CGArray') ? object : new CGArray(object);
  }

  /** @ignore */

  /**
 * Sorts the CGArray by the provided property name.
 * @param {String} property Property to order each element set by [default: 'center']
 * @param {Boolean} descending Order in descending order (default: false)
 * @return {CGArray}
 */
  // orderBy(property, descending) {
  //   // Sort by function call
  //   if (this.length > 0) {
  //
  //     if (typeof this[0][property] === 'function'){
  //       this.sort(function(a,b) {
  //         if (a[property]() > b[property]()) {
  //           return 1;
  //         } else if (a[property]() < b[property]()) {
  //           return -1;
  //         } else {
  //           return 0;
  //         }
  //       })
  //     } else {
  //     // Sort by property
  //       this.sort(function(a,b) {
  //         if (a[property] > b[property]) {
  //           return 1;
  //         } else if (a[property] < b[property]) {
  //           return -1;
  //         } else {
  //           return 0;
  //         }
  //       })
  //     }
  //   }
  //   if (descending) this.reverse();
  //   return this;
  // }


}

//////////////////////////////////////////////////////////////////////////////

const utils = {};

// utils.log = function(msg, level) {
//   console.log(msg);
// };

/**
 * Return the _defaultValue_ if _value_ is undefined
 * @param {Object} value         Returned if it is defined
 * @param {Object} defaultValue Returned if _value_ is undefined
 * @return {Object}
 */
utils.defaultFor = function(value, defaultValue) {
  return (value === undefined) ? defaultValue : value;
};

/**
 * Return true if the value is one of the validOptions.
 * WARNING: do not use on speed sensitive actions as it can be slower than dong a simple array.includes(value)
 *
 * @param {Object} value - Value or an array of values to validate
 * @param {Array} validOptions - Array of valid options
 * @return {Boolean}
 */
utils.validate = function(values, validOptions) {
  values = CGArray.arrayerize(values);
  const invalidValues = values.filter(function(i) {return validOptions.indexOf(i) < 0;});
  if (invalidValues.length === 0) {
    return true;
  } else {
    console.error(`The value(s) '${invalidValues.join(',')}' is/are not one of the following valid options: ${validOptions.join(', ')}`);
    return false;
  }
  // if (validOptions.indexOf(value) !== -1) {
  //   return true;
  // } else {
  //   console.error(`The value '${value}' is not one of the following: ${validOptions.join(', ')}`);
  //   return false;
  // }
};

/**
 * Converts the value to a boolean. The following values will be false,
 * all other values will be true: 'false', 'False', false, undefined.
 *
 * @param {Object} value - Value to convert to boolean.
 * @return {Boolean}
 */
utils.booleanify = function(value) {
  if (value === 'false' || value === 'False' || value === undefined || value === false) {
    return false;
  } else {
    return true;
  }
};

utils.capitalize = function(string) {
  return string.replace(/^\w/, c => c.toUpperCase());
};

// Returns the pixel ratio of the canvas. Typical displays will have a pixel
// ratio of 1, while retina displays will have a pixel ration of 2.
utils.getPixelRatio = function(canvas) {
  const context = canvas.getContext('2d');
  //  query the various pixel ratios
  const devicePixelRatio = window.devicePixelRatio || 1;

  const backingStoreRatio = context.webkitBackingStorePixelRatio ||
    context.mozBackingStorePixelRatio ||
    context.msBackingStorePixelRatio ||
    context.oBackingStorePixelRatio ||
    context.backingStorePixelRatio || 1;

  return devicePixelRatio / backingStoreRatio;
};

utils.scaleResolution = function(canvas, ratio) {
  // upscale the canvas if the two ratios don't match
  if (ratio !== 1) {
    const oldWidth  = canvas.width;
    const oldHeight = canvas.height;

    canvas.width  = oldWidth  * ratio;
    canvas.height = oldHeight * ratio;

    canvas.style.width  = `${oldWidth}px`;
    canvas.style.height = `${oldHeight}px`;

    // Scale/Normalize the canvas coordinate system
    canvas.getContext('2d').scale(ratio, ratio);
  }
};

utils.elapsedTime = function(oldTime) {
  const elapsed = (new Date().getTime()) - oldTime;
  return `${elapsed} ms`;
};

// Circle Quadrants and Angles in Radians
//        3/2π
//       -----
//     / 3 | 4 \
//  π|---------| 0
//     \ 2 | 1 /
//       -----
//        1/2π
// Note:
//   - For CGView, quadrant 4 has both x and y as positive
//   - Quandrant 4 has minus angles to match up with the bp scale
//   - The center of the circle is always (0,0)
utils.angleFromPosition = function(x, y) {
  let angle = 1 / 2 * Math.PI;
  if (x !== 0) {
    angle = Math.atan(Math.abs(y / x));
  }
  if (y >= 0 && x >= 0) {
    // quadrant 4
    // angle = 2*Math.PI - angle;
    angle = 0 - angle;
  } else if (y < 0 && x >= 0) ; else if (y < 0 && x < 0) {
    // quandrant 2
    angle = Math.PI - angle;
  } else if (y >= 0 && x < 0) {
    // quandrant 3
    angle = Math.PI + angle;
  }
  return angle;
};

/**
 * Calculate the hour hand clock position for the supplied angle where:
 *   3/2π -> 12 o'clock
 *   0    -> 3 o'clock
 *   1/2π -> 6 o'clock
 *   π    -> 9 o'clock
 *
 * @param {Number} radians - The angle in radians
 * @return {Number}
 */
utils.clockPositionForAngle = function(radians) {
  let clockPostion = Math.round( (radians + (Math.PI / 2)) * (6 / Math.PI) );
  if (clockPostion > 12) {
    clockPostion -= 12;
  } else if (clockPostion < 1) {
    clockPostion += 12;
  }
  return clockPostion;
};

/**
 * Calculate the origin for a Rect with *width* and *length* that connects
 * to a *point* at a specific *clockPosition*.
 *
 * @param {Object} point - The point that connects to the Rect. Consists of an x and y attribute
 * @param {Number} clockPosition - Where on the Rect the point connects to in clock coordinates. An integer between 1 and 12.
 * @param {Number} width - The width of the Rect
 * @param {Number} height - The height of the Rect
 * @return {Object} - The origin for the Rect consisting of an x and y attribute
 */
utils.rectOriginForAttachementPoint = function(point, clockPosition, width, height) {
  let x, y;
  switch (clockPosition) {
  case 1:
    // x = point.x - (width * 3 / 4);
    // y = point.y;
    // break;
  case 2:
    x = point.x - width;
    y = point.y;
    break;
  case 3:
    x = point.x - width;
    y = point.y - (height / 2);
    break;
  case 4:
  case 5:
    x = point.x - width;
    y = point.y - height;
    break;
    // case 5:
    //   x = point.x - (width * 3 / 4);
    //   y = point.y - height;
    //   break;
  case 6:
    x = point.x - (width / 2);
    y = point.y - height;
    break;
  case 7:
    // x = point.x - (width / 4);
    // y = point.y - height;
    // break;
  case 8:
    x = point.x;
    y = point.y - height;
    break;
  case 9:
    x = point.x;
    y = point.y - (height / 2);
    break;
  case 10:
  case 11:
    x = point.x;
    y = point.y;
    break;
    // case 11:
    //   x = point.x - (width / 4);
    //   y = point.y;
    //   break;
  case 12:
    x = point.x - (width / 2);
    y = point.y;
  }
  return {x: x, y: y};
};

/**
 * Rounds the number use d3.format.
 * @param {Number} value Number to round
 * @param {Integer} places Number of decimal places to round [Default: 2]
 * @return {Number}
 */
utils.round = function(value, places) {
  places = places || 2;
  // return d3.round(value, places);
  return Number(value.toFixed(places));
};

/**
 * Format number by grouping thousands with a comma.
 * @param {Number} value Number to format
 *
 * @return {String}
 */
utils.commaNumber = function(value) {
  const format = d3.format(',');
  return format(value);
};

// a and b should be arrays of equal length
utils.dotProduct = function(a, b) {
  let value = 0;
  for (let i = 0, len = a.length; i < len; i++) {
    value += a[i] * b[i];
  }
  return value;
};

utils.pointsAdd = function(a, b) {
  const value =  [0, 0];
  value[0] = a[0] + b[0];
  value[1] = a[1] + b[1];
  return value;
};

utils.pointsSubtract = function(a, b) {
  const value = [0, 0];
  value[0] = a[0] - b[0];
  value[1] = a[1] - b[1];
  return value;
};

// Using code from:
// http://stackoverflow.com/questions/1073336/circle-line-segment-collision-detection-algorithm
utils.circleAnglesFromIntersectingLine = function(radius, x1, y1, x2, y2) {
  // Direction vector of line segment, from start to end
  const d = utils.pointsSubtract([x2, y2], [x1, y1]);
  // Vector from center of circle to line segment start
  // Center of circle is alwas [0,0]
  const f = [x1, y1];

  // t2 * (d DOT d) + 2t*( f DOT d ) + ( f DOT f - r2 ) = 0
  const a = utils.dotProduct(d, d);
  const b = 2 * utils.dotProduct(f, d);
  const c = utils.dotProduct(f, f) - (radius * radius);

  let discriminant = (b * b) - (4 * a * c);

  const angles = {};
  if (discriminant >= 0) {
    discriminant = Math.sqrt(discriminant);
    const t1 = (-b - discriminant) / (2 * a);
    const t2 = (-b + discriminant) / (2 * a);
    if (t1 >= 0 && t1 <= 1) {
      const px = x1 + (t1 * (x2 - x1));
      const py = y1 + (t1 * (y2 - y1));
      // angles.push(utils.angleFromPosition(px, py))
      angles.t1 = utils.angleFromPosition(px, py);
    }
    if (t2 >= 0 && t2 <= 1) {
      const px = x1 + (t2 * (x2 - x1));
      const py = y1 + (t2 * (y2 - y1));
      // angles.push(utils.angleFromPosition(px, py))
      angles.t2 = utils.angleFromPosition(px, py);
    }
  }
  return angles;
};


// Return 2 or more angles that intersect with rectangle defined by xy, height, and width
// Center of circle is always (0,0)
utils.circleAnglesFromIntersectingRect = function(radius, x, y, width, height) {
  let angles = [];
  // Top
  angles.push(utils.circleAnglesFromIntersectingLine(radius, x, y, x + width, y));
  // Right
  angles.push(utils.circleAnglesFromIntersectingLine(radius, x + width, y, x + width, y - height));
  // Bottom
  angles.push(utils.circleAnglesFromIntersectingLine(radius, x + width, y - height, x, y - height));
  // Left
  angles.push(utils.circleAnglesFromIntersectingLine(radius, x, y - height, x, y));
  angles = angles.filter( a => Object.keys(a).length > 0 );
  if (angles.length > 0) {
    // Resort the angles
    // T1 and T2 are what percent along a line that intersect with the circle
    // T1 is closest to the line start
    // Essentially, with the ways the lines of the rect have been set up
    // T2 is always a start angle and T1 is always an end angle.
    // So if the very first angle is a T1 we want to move it to the end of the list of angles
    const firstKeys = Object.keys(angles[0]);
    if (firstKeys.length === 1 && firstKeys[0] === 't1') {
      angles.push(angles.shift());
    }
    if (firstKeys.length === 2) {
      angles.push({t1: angles[0].t1});
      angles[0].t1 = undefined;
    }
    angles = angles.map( (a) => {
      const r = [];
      if (a.t1 !== undefined) {
        r.push(a.t1);
      }
      if (a.t2 !== undefined) {
        r.push(a.t2);
      }
      return r;
    });
    // angles = [].concat.apply([], angles);
    angles = [].concat(...angles);
  }

  return angles;
};


/**
 * Binary search to find the index of data where data[index] equals _searchValue_.
 * If no element equals value, the returned index will be the upper or lower [default]
 * index that surrounds the value.
 *
 * @param {Array} data Array of numbers. Must be sorted from lowest to highest.
 * @param {Number} searchValue The value to search for.
 * @param {Boolean} upper Only used if no element equals the _searchValue_
 *
 *    - _true_: return index to right of value
 *    - _false_: return index to left of value [default]
 *
 * @return {Number}
 */
utils.indexOfValue = function(data, searchValue, upper) {
  let minIndex = 0;
  let maxIndex = data.length - 1;
  let currentIndex, currentValue;
  if (data[minIndex] >= searchValue) return minIndex;
  if (data[maxIndex] <= searchValue) return maxIndex;

  while (maxIndex - minIndex > 1) {
    currentIndex = (minIndex + maxIndex) / 2 | 0;
    // currentIndex = (minIndex + maxIndex) >>> 1 | 0;
    currentValue = data[currentIndex];
    if (currentValue < searchValue) {
      minIndex = currentIndex;
    } else if (currentValue > searchValue) {
      maxIndex = currentIndex;
    } else {
      return currentIndex;
    }
  }
  return (upper ? maxIndex : minIndex);
};


/**
 * Return true of nubmer a and b have opposite signs
 */
utils.oppositeSigns = function(a, b) {
  return (a * b) < 0;
};

/**
 * Return the next largest base 2 value for the given number
 */
utils.base2 = function(value) {
  return Math.pow(2, Math.ceil(Math.log(value) / Math.log(2)));
};

/**
 * Contain the value between the min and max values
 * @param {Number} value - Number to constrain
 * @param {Number} min - If the value is less than min, min will be returned
 * @param {Number} max - If the value is greater than max, max will be returned
 * @return {Number}
 */
utils.constrain = function(value, min, max) {
  return Math.max( Math.min(max, value), min);
};

/**
 * Merges top level properties of each supplied object.
 * ```javascript
 * utils.merge({a:1, b:1}, {b:2, c:2}, {c:3, d:3});
 * //=> {a: 1, b: 2, c: 3, d: 3}
 * ```
 * If a non object is provided, it is ignored. This can be useful if
 * merging function arguments that may be undefined.
 * @param {Object} object_1,object_2,..,object_n Objects to merge
 * @return {Object}
 */
utils.merge = function(...args) {
  const data = {};
  let object, keys, key;
  for (let iArg = 0, argLen = arguments.length; iArg < argLen; iArg++) {
    object = args[iArg];
    if (typeof object === 'object') {
      keys = Object.keys(object);
      for (let iKey = 0, keyLen = keys.length; iKey < keyLen; iKey++) {
        key = keys[iKey];
        data[key] = object[key];
      }
    }
  }
  return data;
};


/**
 * This function scales a value from the *from* range to the *to* range.
 * To scale from [min,max] to [a,b]:
 *
 *                 (b-a)(x - min)
 *          f(x) = --------------  + a
 *                   max - min
 */
utils.scaleValue = function(value, from = {min: 0, max: 1}, to = {min: 0, max: 1}) {
  return ((to.max - to.min) * (value - from.min) / (from.max - from.min)) + to.min;
};


/**
 * Returns a string id using the _name_ and _start_ while
 * making sure the id is not in _currentIds_.
 * ```javascript
 * JSV.uniqueName('CDS', ['RNA', 'CDS']);
 * //=> 'CDS-2'
 * ```
 * @param {String} name - Name to check
 * @param {Array} allNames - Array of all names to compare against
 * @return {String}
 */
utils.uniqueName = function(name, allNames) {
  if (allNames.includes(name)) {
    return utils.uniqueId(`${name}-`, 2, allNames);
  } else {
    return name;
  }
};

/**
 * Returns a string id using the _idBase_ and _start_ while
 * making sure the id is not in _currentIds_.
 * ```javascript
 * JSV.uniqueId('spectra_', 1, ['spectra_1', 'spectra_2']);
 * //=> 'spectra_3'
 * ```
 * @param {String} idBase - Base of ids
 * @param {Integer} start - Integer to start trying to creat ids with
 * @param {Array} currentIds - Array of current ids
 * @return {String}
 */
utils.uniqueId = function(idBase, start, currentIds) {
  let id;
  do {
    id = idBase + start;
    start++;
  } while (currentIds.indexOf(id) > -1);
  return id;
};

/**
 * Create a random hex string
 *
 * https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
 */
utils.randomHexString = function(len) {
  let text = '';
  const possible = 'abcdef0123456789';
  for (let i = 0; i < len; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};


/**
 * Returns the offset for an element by looking at the parent positioned elements.
 * Also takes into account the scroll offset for each parent.
 *
 * Reference: https://stackoverflow.com/questions/442404/retrieve-the-position-x-y-of-an-html-element
 */
utils.getOffset = function(el) {
  let _x = 0;
  let _y = 0;
  while ( el && !isNaN( el.offsetLeft ) && !isNaN( el.offsetTop ) ) {
    _x += el.offsetLeft - el.scrollLeft;
    _y += el.offsetTop - el.scrollTop;
    el = el.offsetParent;
  }
  return { top: _y, left: _x };
};

/**
 * Convience function to determine if an object is a number.
 * @param {Object} n The object to check
 * @return {Boolean}
 */
utils.isNumeric = function (n) {
  return isFinite(n) && parseFloat(n) === n;
};

// COLORS
// http://krazydad.com/tutorials/makecolors.php
utils.colors = function(len, center, width, alpha, freq1, freq2, freq3,
  phase1, phase2, phase3) {
  const colors = [];
  if (len === undefined)      len    = 50;
  if (center === undefined)   center = 200;
  if (width === undefined)    width  = 30;
  if (alpha === undefined)    alpha  = 1;
  if (freq1 === undefined)    freq1  = 2.4;
  if (freq2 === undefined)    freq2  = 2.4;
  if (freq3 === undefined)    freq3  = 2.4;
  if (phase1 === undefined)   phase1 = 0;
  if (phase2 === undefined)   phase2 = 2;
  if (phase3 === undefined)   phase3 = 4;

  for (let i = 0; i < len; ++i) {
    const red   = Math.round(Math.sin( ((freq1 * i) + phase1) * width) + center );
    const green = Math.round(Math.sin( ((freq2 * i) + phase2) * width) + center );
    const blue  = Math.round(Math.sin( ((freq3 * i) + phase3) * width) + center );
    colors.push(`rgba(${red},${green},${blue},${alpha})`);
  }
  return colors;
};

utils.testColors = function(colors) {
  colors.forEach(function(color) {
    document.write( `<font style="color:${color}">&#9608;</font>`);
  });
  document.write( '<br/>');
};


// utils.testSearch = function(length) {
//   const pattern = /ATG/igm;
//   const indices = [];
//   let seq = '';
//   const possible = 'ATCG';
//
//   console.log('Making Sequence...');
//   for (let i = 0; i < length; i++ ) {
//     seq += possible.charAt(Math.floor(Math.random() * possible.length));
//   }
//   window.seq = seq;
//   console.log('Finding Pattern...');
//   const startTime = new Date().getTime();
//   let match;
//   while ( (match = pattern.exec(seq)) !== null) {
//     indices.push(match.index);
//   }
//   console.log(`ATGs found: ${indices.length}`);
//   console.log(`Time: ${utils.elapsedTime(startTime)}`);
// };

//////////////////////////////////////////////////////////////////////////////

/**
 * A Position gives a precise location on the canvas or map. Map-based
 * positions move with the map while cavas-based-position do not.
 *
 * ### Canvas-based positions
 *
 * Positions on the canvas are described using [position names](#position-names)
 * or x/yPercents.
 *
 * <a name="position-names"></a>
 * ### Position Names
 *
 * String           | xPercent | yPercent
 * -----------------|----------|---------
 * top-left         | 0        | 0
 * top-center       | 50       | 0
 * top-right        | 100      | 0
 * middle-left      | 0        | 50
 * middle-center    | 50       | 50
 * middle-right     | 100      | 50
 * bottom-left      | 0        | 100
 * bottom-center    | 50       | 100
 * bottom-right     | 100      | 100
 *
 * Canvas-based position examples:
 * - value: { xPercent: 50, yPercent: 40 }
 * - value: 'top-left'
 *
 * ### Map-based positions
 * 
 * Map-based positions are described with an object containing lengthPercent
 * and mapOffset values.
 *
 * - lengthPercent: Number between 0 and 100 (%) indicating the position as a percentage of the the map length.
 * - mapOffset: pixel distance from the map
 *    - values above 0: add to outside edge of map
 *    - values below 0: substract from inside edge of map
 *
 * Map-based position examples:
 * - value: { lengthPercent: 23, mapOffset: 10 }
 */

// Note: A better name may be Location over Position
//
// - value: { lengthPercent: 23, bbOffsetPercent: 10 }     // NOT IMPLEMENTED
// - value: { contig: 'contig-1', bp: 100, mapOffset: 10 } // NOT IMPLEMENTED
//
//
//  Order of priority for value:
//  Value                           | Assumes On |
//  --------------------------------|------------|------------
//  "top-left"                      | Canvas     |
//  {xPercent, yPercent,...}        | Canvas     |
//  {lengthPercent,...}             | Map        |
//  {contig, bp,...} //NOT IMPLEMENTED               | Map        |
//  {bp,...}         //NOT IMPLEMENTED               | Map        |
//
//  For offsets on the map: mapOffset > bbOffsetPercent > default [mapOffset: 20]
//
//  Positions create a point in canvas space based on the supplied values.
//  The position (on the map) can be updated by calling refresh, if the map pans or zooms.
//  The type of position can be changed by altering the position properties:
//     - on: map, canvas
//     - offsetType: backbone, map // NOT IMPLEMENTED
//     - value:
//        - 'top-left'
//        - {bp: 1, contig: 'c-1'}
//        - {lengthPercent: 23, mapOffset: 23}
//        - {xPercent: 20, yPercent: 30}
//
// mapOffset values are the pixel distance from the map:
//   -  >=0: Add to outside edge of map
//   -   <0: Subtract from inside edge of map
//
// bbOffsetPercent values are the percentage distance from the backbone
// to the outside/upper edge or the inside/botom edge of the map:
//   -    0: center of backbone
//   -  100: outside edge of map
//   - -100: inside edge of map
class Position {

  /**
   * Creating a Position. The default value for Position will be 'middle-center'.
   *
   * @param {String|Object} value - A string describing the position or
   *   an object. The object properties will depend on the position type.
   *   NOTE: see examples above. 
   *   <br /><br />
   *   Examples:
   *   - value: { lengthPercent: 23, mapOffset: 10 }
   *   - value: { xPercent: 50, yPercent: 40 }
   *   - value: 'top-left'
   */
  //   - value: { lengthPercent: 23, bbOffsetPercent: 10 } // NOT IMPLEMENTED
  //   - value: { contig: 'contig-1', bp: 100, mapOffset: 10 } // NOT IMPLEMENTED
  constructor(viewer, value) {
    this._viewer = viewer;
    this.value = value;
  }

  /**
   * Return the class name as a string.
   * @return {String} - 'Position'
   */
  toString() {
    return 'Position';
  }

  //////////////////////////////////////////////////////////////////////////
  // STATIC CLASSS METHODS
  //////////////////////////////////////////////////////////////////////////

  static get names() {
    return ['top-left', 'top-center', 'top-right', 'middle-left', 'middle-center', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right'];
  }

  static percentsFromName(name) {
    const [yString, xString] = name.split('-');
    let xPercent, yPercent;

    if (yString === 'top') {
      yPercent = 0;
    } else if (yString === 'middle') {
      yPercent = 50;
    } else if (yString === 'bottom') {
      yPercent = 100;
    }

    if (xString === 'left') {
      xPercent = 0;
    } else if (xString === 'center') {
      xPercent = 50;
    } else if (xString === 'right') {
      xPercent = 100;
    }

    return { xPercent, yPercent };
  }

  static nameFromPercents(xPercent, yPercent) {
    const allowedPercents = [0, 50, 100];
    if (allowedPercents.includes(xPercent) && allowedPercents.includes(yPercent)) {
      let name = '';
      // yPercent Percent
      if (yPercent === 0) {
        name += 'top';
      } else if (yPercent === 50) {
        name += 'middle';
      } else if (yPercent === 100) {
        name += 'bottom';
      }
      // xPercent Percent
      if (xPercent === 0) {
        name += '-left';
      } else if (xPercent === 50) {
        name += '-center';
      } else if (xPercent === 100) {
        name += '-right';
      }
      return name;
    }
  }

  //////////////////////////////////////////////////////////////////////////
  // MEMBERS
  //////////////////////////////////////////////////////////////////////////

  get viewer() {
    return this._viewer;
  }

  get canvas() {
    return this.viewer.canvas;
  }

  /**
   * @member {Number} - Get the x value for the position.
   */
  get x() {
    return this._x;
  }

  /**
   * @member {Number} - Get the y value for the position.
   */
  get y() {
    return this._y;
  }

  /**
   * @member {Point} - Get the x/y values for the position as a point.
   */
  get point() {
    return {x: this.x, y: this.y};
  }

  get value() {
    return this._value;
  }

  set value(value) {
    return this._processValue(value);
  }

  get type() {
    return this._type;
  }

  get name() {
    return (Position.names.includes(this.value) && this.value) || Position.nameFromPercents(this.xPercent, this.yPercent);
  }

  get xPercent() {
    return this._xPercent;
  }

  get yPercent() {
    return this._yPercent;
  }

  /**
   * Get or set where this position is relative to. Values: 'canvas' or 'map'.
   */
  get on() {
    return this._on;
  }

  set on(value) {
    if (value === 'map') {
      this.convertToOnMap();
    } else if (value === 'canvas') {
      this.convertToOnCanvas();
    }
  }

  get onMap() {
    return this.on === 'map';
  }

  get onCanvas() {
    return this.on === 'canvas';
  }

  get offsetType() {
    return this._offsetType;
  }

  get offsetPositive() {
    if (this.onMap) {
      const { bbOffsetPercent, mapOffset } = this.value;
      const offset = (this.offsetType === 'map') ? mapOffset : bbOffsetPercent;
      return offset >= 0;
    }
    return undefined;
  }

  // Constrains value between min and max. Also rounds to decimals.
  formatNumber(number, min = 0, max = 100, decimals = 1) {
    return utils.round( utils.constrain(number, min, max), decimals );
  }

  _processValue(value) {
    if (typeof value === 'string') {
      this._value = utils.validate(value, Position.names) ? value : 'middle-center';
      this._on = 'canvas';
      this._type = 'name';
    } else if (typeof value === 'object') {
      const keys = Object.keys(value);
      if (keys.includes('xPercent') && keys.includes('yPercent')) {
        const {xPercent, yPercent} = value;
        this._xPercent = this.formatNumber(xPercent);
        this._yPercent = this.formatNumber(yPercent);
        this._value = {xPercent: this.xPercent, yPercent: this.yPercent};
        this._on = 'canvas';
        this._type = 'percent';
      } else if (keys.includes('lengthPercent')) {
        const {lengthPercent} = value;
        this._value = {lengthPercent: this.formatNumber(lengthPercent, 0, 100, 6)};
        this._on = 'map';
        this._type = 'percent';
      } else if (keys.includes('bp')) ;
      // Add offset value
      if (this.onMap) {
        const {mapOffset, bbOffsetPercent} = value;
        if (utils.isNumeric(mapOffset)) {
          this._offsetType = 'map';
          // this._value.mapOffset = Number(mapOffset);
          this._value.mapOffset = Math.round(mapOffset);
        } else if (utils.isNumeric(bbOffsetPercent)) {
          this._offsetType = 'backbone';
          // this._value.bbOffsetPercent = utils.constrain(bbOffsetPercent, -100, 100);
          this._value.bbOffsetPercent = this.formatNumber(bbOffsetPercent, -100, 100, 0);
        } else {
          this._offsetType = 'map';
          this._value.mapOffset = 20;
        }
      }
    }
    this.refresh();
  }

  // Create position point
  refresh() {
    let origin;

    if (this.onCanvas) {
      if (this.type === 'name') {
        origin = this._originFromName(this.value);
      } else if (this.type === 'percent') {
        origin = this._originFromCanvasPercents(this.value);
      }
    } else if (this.onMap) {
      if (this.type === 'percent') {
        origin = this._originFromMapPercent(this.value);
      }
      // TODO: get origin from BP
    }

    this._x = origin.x;
    this._y = origin.y;
  }


  _originFromName(name) {
    const { xPercent, yPercent } = Position.percentsFromName(name);

    this._xPercent = xPercent;
    this._yPercent = yPercent;

    return this._originFromCanvasPercents({xPercent, yPercent});
  }

  _originFromCanvasPercents({xPercent, yPercent}) {
    const x = this.canvas.width * xPercent / 100;
    const y = this.canvas.height * yPercent / 100;

    return {x, y};
  }

  _originFromMapPercent(value = this.value) {
    let point;
    if (value.lengthPercent === 50 && value.mapOffset === 0) {
      // Special case to center caption in the middle of the map
      // point = this.canvas.pointForBp(0,0);
      point = this.viewer.layout.centerCaptionPoint();
    } else {
      const bp = this.viewer.sequence.length * value.lengthPercent / 100;
      const centerOffset = this.centerOffset(value);
      point = this.canvas.pointForBp(bp, centerOffset);
    }
    return point;
  }

  centerOffset(value = this.value) {
    const {bbOffsetPercent, mapOffset} = value;
    const layout = this.viewer.layout;
    let centerOffset;
    if (this.offsetType === 'backbone') {
      centerOffset = layout.centerOffsetForBBOffsetPercent(bbOffsetPercent);
    } else {
      centerOffset = layout.centerOffsetForMapOffset(mapOffset);
    }
    return centerOffset;
  }

  convertToOnMap() {
    if (this.onMap) { return this; }
    const viewer = this.viewer;
    const canvas = this.canvas;
    const layout = viewer.layout;

    const point = this.point;
    const bp = canvas.bpForPoint(point);
    const lengthPercent = this.formatNumber(bp / viewer.sequence.length * 100);

    const ptOffset = layout.centerOffsetForPoint(point);
    const bbCenterOffset = viewer.backbone.adjustedCenterOffset;

    let mapOffset, bbOffsetPercent;
    if (ptOffset >= layout.centerOutsideOffset) {
      // Outside Map
      mapOffset = ptOffset - layout.centerOutsideOffset;
      this.value = {lengthPercent, mapOffset};
    } else if (ptOffset <= layout.centerInsideOffset) {
      // Inside Map
      mapOffset = ptOffset - layout.centerInsideOffset;
      this.value = {lengthPercent, mapOffset};
    } else if (ptOffset >= bbCenterOffset) {
      // Outside Backbone
      bbOffsetPercent = (ptOffset - bbCenterOffset) / layout.bbOutsideOffset * 100;
      this.value = {lengthPercent, bbOffsetPercent};
    } else if (ptOffset < bbCenterOffset) {
      // Inside Backbone
      bbOffsetPercent = (bbCenterOffset - ptOffset) / layout.bbInsideOffset * 100;
      this.value = {lengthPercent, bbOffsetPercent};
    }

    return this;
  }

  convertToOnCanvas() {
    if (this.onCanvas) { return this; }
    const viewer = this.viewer;
    const canvas = this.canvas;
    const value = this.value;
    const centerOffset = this.centerOffset(value);
    const bp = viewer.sequence.length * value.lengthPercent / 100;
    const point = canvas.pointForBp(bp, centerOffset);

    this.value = {
      xPercent: this.formatNumber(point.x / viewer.width * 100),
      yPercent: this.formatNumber(point.y / viewer.height * 100)
    };
    return this;
  }

  moveTo(duration) {
    if (this.onMap) {
      const bp = this.viewer.sequence.length * this.value.lengthPercent / 100;
      const bbOffset = this.viewer.backbone.adjustedCenterOffset - this.centerOffset();
      this.viewer.moveTo(bp, null, {duration, bbOffset});
    }
  }

  toJSON(options = {}) {
    return this.value;
  }

}

//////////////////////////////////////////////////////////////////////////////

/**
 * An Anchor is a point on a box/rect that can be described in words ('top-left')
 * or as x/y percents where 0 is the top/left and 100 is the bottom/right.
 * Anchors are typically used to describe the focal point on a box or where to
 * draw an attachemnt line.
 *
 * <a name="anchor-names"></a>
 * ### Anchor Names
 *
 * String           | xPercent | yPercent
 * -----------------|----------|---------
 * top-left         | 0        | 0
 * top-center       | 50       | 0
 * top-right        | 100      | 0
 * middle-left      | 0        | 50
 * middle-center    | 50       | 50
 * middle-right     | 100      | 50
 * bottom-left      | 0        | 100
 * bottom-center    | 50       | 100
 * bottom-right     | 100      | 100
 */
class Anchor {

  /**
   * Creating an Anchor. The default value for Anchor will be 'top-left' ({xPercent: 0, yPercent: 0}).
   * @param {String|Object} value - A string describing the position or
   *   an object with 2 properties: xPercent, yPercent.
   *   The percent values should be between 0 (top/left) and 100 (bottom/right).
   *   Percents below 0 will become 0 and values abouve 100 will become 100.
   *   See the [Anchor Names](#anchor-names) table for possible string values and their corresponding
   *   x/y Percents.
   */
  constructor(value) {
    if (typeof value === 'string') {
      if (value === 'auto') {
        this.auto = true;
      } else {
        this.name = value;
      }
    } else if (typeof value === 'object') {
      this.xPercent = utils.defaultFor(Number(value.xPercent), 50);
      this.yPercent = utils.defaultFor(Number(value.yPercent), 50);
    } else {
      this.xPercent = 50;
      this.yPercent = 50;
    }
  }

  /**
   * Return the class name as a string.
   * @return {String} - 'Anchor'
   */
  toString() {
    return 'Anchor';
  }

  //////////////////////////////////////////////////////////////////////////
  // MEMBERS
  //////////////////////////////////////////////////////////////////////////

  get auto() {
    return this._auto;
  }

  set auto(value) {
    this._auto = Boolean(value);
  }

  /**
   * @member {Number} - Get or set the xPercent. The value will be constrained between 0 and 100.
   */
  get xPercent() {
    return this._xPercent;
  }

  set xPercent(value) {
    this._xPercent = Math.round(utils.constrain(value, 0, 100));
    this._name = Position.nameFromPercents(this.xPercent, this.yPercent);
  }

  /**
   * @member {Number} - Get or set the yPercent. The value will be constrained between 0 and 100.
   */
  get yPercent() {
    return this._yPercent;
  }

  set yPercent(value) {
    this._yPercent = Math.round(utils.constrain(value, 0, 100));
    this._name = Position.nameFromPercents(this.xPercent, this.yPercent);
  }

  /**
   * @member {String} - Get or set the anchor name. If a string can not
   * describe the anchor, _undefined_ will be returned.
   */
  get name() {
    // return this._nameFromPercents();
    return this._name;
  }

  set name(value) {
    if (value && utils.validate(value, Position.names)) {
      this._name = value;
      this._updatePercentsFromName(value);
    }
  }

  // Should only be called from set name so the string is validated first.
  _updatePercentsFromName(name) {
    const { xPercent, yPercent } = Position.percentsFromName(name);

    this._xPercent = xPercent;
    this._yPercent = yPercent;
  }

  autoUpdateForPosition(position) {
    if (this.auto) {
      if (position.onCanvas) {
        this.xPercent = position.xPercent;
        this.yPercent = position.yPercent;
      } else if (position.onMap) {
        const format = position.viewer.format;
        const offsetPositive = position.offsetPositive;
        const lengthPercent = position.value.lengthPercent;
        if (format === 'linear') {
          this.yPercent = offsetPositive ? 100 : 0;
          this.xPercent = lengthPercent;
        } else if (format === 'circular') {
          if (lengthPercent <= 7) {
            this.xPercent = (lengthPercent + 7) / 14 * 100;
            this.yPercent = 100;
          } else if (lengthPercent > 7 && lengthPercent < 43) {
            this.xPercent = 0;
            this.yPercent = (lengthPercent - 7) / 36 * 100;
          } else if (lengthPercent >= 43 && lengthPercent <= 57) {
            this.xPercent = (lengthPercent - 43) / 14 * 100;
            this.yPercent = 0;
          } else if (lengthPercent > 57 && lengthPercent < 93) {
            this.xPercent = 100;
            this.yPercent = (lengthPercent - 57) / 36 * 100;
          } else if (lengthPercent >= 93) {
            this.xPercent = (lengthPercent - 93) / 14 * 100;
            this.yPercent = 100;
          }
        }
      }
    }
  }

  /**
   * Returns JSON representing this anchor, either as a name or an object with
   * xPercent and yPercent properties.
   */
  toJSON() {
    if (this.auto) {
      return 'auto';
    } else if (this.name) {
      return this.name;
    } else {
      return {
        xPercent: this.xPercent,
        yPercent: this.yPercent
      };
    }
  }

}

//////////////////////////////////////////////////////////////////////////////

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
   * Remove the object from Viewer.objects
   */
  deleteFromObjects() {
    delete this.viewer._objects[this.cgvID];
  }

}

//////////////////////////////////////////////////////////////////////////////
// CGview Rect
//////////////////////////////////////////////////////////////////////////////

/**
 * A Rect consists of an x and y point (the upper-left corner) and
 * a width and height.
 */
class Rect {

  /**
   * A Rect
   *
   * @param {Number} x - X coordinate of the Rect origin
   * @param {Number} y - Y coordinate of the Rect origin
   * @param {Number} width - Width of the rectangle
   * @param {Number} height - Height of the rectangle
   */
  constructor(x, y, width, height, label) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    // TESTING
    // this._pressureBack = 0;
    // this._pressureFront = 0;
    this._label = label;
  }

  /**
   * @member {Number} - Get or set the width.
   */
  get width() {
    return this._width;
  }

  set width(value) {
    this._width = value;
  }

  /**
   * @member {Number} - Get or set the height.
   */
  get height() {
    return this._height;
  }

  set height(value) {
    this._height = value;
  }

  /**
   * @member {Number} - Get or set the x position of the origin.
   */
  get x() {
    return this._x;
  }

  set x(value) {
    this._x = value;
  }

  /**
   * @member {Number} - Get or set the y position of the origin.
   */
  get y() {
    return this._y;
  }

  set y(value) {
    this._y = value;
  }

  /**
   * @member {Number} - Get bottom of the Rect
   */
  get bottom() {
    return this.y + this.height;
  }

  /**
   * @member {Number} - Get top of the Rect. Same as Y.
   */
  get top() {
    return this.y;
  }

  /**
   * @member {Number} - Get left of the Rect. Same as X.
   */
  get left() {
    return this.x;
  }

  /**
   * @member {Number} - Get right of the Rect
   */
  get right() {
    return this.x + this.width;
  }

  /**
   * Check if any of the Rect overlaps with any Rects in the array.
   * If there is an overlap the first overlapping Rect is returned.
   * @param {Array} rectArray - Array of Rects
   * @return {Boolean}
   */
  overlap(rectArray) {
    // Gap between labels
    const widthGap = 4;
    const r1 = this;
    let overlap = false;
    for (let i = 0, len = rectArray.length; i < len; i++) {
      const r2 = rectArray[i];
      if (r1.x <= r2.right && r2.x <= (r1.right + widthGap) && r1.y <= r2.bottom && r2.y <= r1.bottom) {
        overlap = r2;
        break;
      } else {
        overlap = false;
      }
    }
    return overlap;
  }

  /**
   * Check if the Rect conains the point
   * @param {Number} x - X coordinate of the point
   * @param {Number} y - Y coordinate of the point
   * @return {Boolean}
   */
  containsPt(x, y) {
    return ( x >= this.x && x <= (this.x + this.width) && y >= this.y && y <= (this.y + this.height) );
  }

  /**
   * Return the point for the provided clock position (i.e. 1-12)
   * @param {Number} clockPosition - Hour hand clock position (i.e. a number between 1 and 12)
   * @private
   */
  ptForClockPosition(clockPosition) {
    let x, y;
    switch (clockPosition) {
    case 1:
    case 2:
      x = this.x + this.width;
      y = this.y;
      break;
    case 3:
      x = this.x + this.width;
      y = this.y + (this.height / 2);
      break;
    case 4:
    case 5:
      x = this.x + this.width;
      y = this.y + this.height;
      break;
    case 6:
      x = this.x + (this.width / 2);
      y = this.y + this.height;
      break;
    case 7:
    case 8:
      x = this.x;
      y = this.y + this.height;
      break;
    case 9:
      x = this.x;
      y = this.y + (this.height / 2);
      break;
    case 10:
    case 11:
      x = this.x;
      y = this.y;
      break;
    case 12:
      x = this.x + (this.width / 2);
      y = this.y;
    }
    return {x: x, y: y};
  }

}

//////////////////////////////////////////////////////////////////////////////

/**
 * LabelPlacementDefault is the default method to find where to place feature
 * [Labels](Label.html) on the map. LabelPlacementDefault is used by
 * [Annotation](Annotation.html) before drawing [feature](Feature.html) names
 * on the map.
 *
 * The default method, only uses straight lines perpendicular to the map and
 * stacks them as necessary to avoid collisions.
 *
 * This class can be extended to provide new ways to place labels.
 *
 * TODO:
 * - What is requires by the class
 *   - array of labels
 *   - access to annotation and viewer object
 *   - some default constants: ...
 * - What should class do
 *   - have placeLabels medthod that take an aray of labels to place
 *   - for each label
 *     - add rect
 *     - attchement point
 *
 * @private
 */
class LabelPlacementDefault {

  /**
   * Create a new label placement instance
   * @param {Annotation} annotation - The CGView annotation object
   * @param {Object} options - ...
   */
  constructor(annotation, options = {}) {
    this._annotation = annotation;
    this._initialLabelLineLength = annotation._labelLineLength;
    this._labelLineMarginInner = annotation._labelLineMarginInner;
    this._labelLineMarginOuter = annotation._labelLineMarginOuter;
  }

  //////////////////////////////////////////////////////////////////////////
  // Methods / Properties proved to sub classes
  //////////////////////////////////////////////////////////////////////////

  /**
   * @member {Viewer} - Get the *Viewer*
   */
  get viewer() {
    return this.annotation.viewer;
  }

  /**
   * @member {Annotation} - Get the *Annotation*
   */
  get annotation() {
    return this._annotation;
  }

  /**
   * @member {Canvas} - Get the *Canvas*
   */
  get canvas() {
    return this.viewer.canvas;
  }

  /**
   * @member {Number} - Get the initial line length for labels.
   */
  get initialLabelLineLength() {
    return this._initialLabelLineLength;
  }

  /**
   * Return the distance from the map center to where the label rect should be placed.
   * If lineLength is provided it will be included in the calculation, otherwise,
   * the default labelLineLength will be used.
   * @param {Number} lineLength - Length of the label line
   * @return {Number} - Distance from map center ot where label rect should be placed.
   */
  rectCenterOffset(lineLength=this.initialLabelLineLength) {
    return this._rectOffsetWithoutLineLength + lineLength;
  }


  //////////////////////////////////////////////////////////////////////////
  // Required Method to override in subclasses
  //////////////////////////////////////////////////////////////////////////

  /**
   * Place provided labels.
   *
   * Override this method is subclasses.
   *
   * @param {Array} labels - The labels to place.
   // * @param {Number} rectOffset - Initial distance from the map for label rect placement.
   * @param {Object} options - ...
   */
  placeLabels(labels, outerOffset) {
    const canvas = this.canvas;
    let label, bp, lineLength, overlappingRect;
    this._rectOffsetWithoutLineLength = outerOffset + this._labelLineMarginInner + this._labelLineMarginOuter;

    const placedRects = new CGArray();
    for (let i = 0, len = labels.length; i < len; i++) {
      label = labels[i];
      bp = label.bp;
      lineLength = this.initialLabelLineLength;
      do {
        const outerPt = canvas.pointForBp(bp, this.rectCenterOffset(lineLength));
        const rectOrigin = utils.rectOriginForAttachementPoint(outerPt, label.lineAttachment, label.width, label.height);
        label.rect = new Rect(rectOrigin.x, rectOrigin.y, label.width, label.height);
        overlappingRect = label.rect.overlap(placedRects);
        lineLength += label.height;
      } while (overlappingRect);
      placedRects.push(label.rect);
      label.attachementPt = label.rect.ptForClockPosition(label.lineAttachment);
    }
  }


}

//////////////////////////////////////////////////////////////////////////////



// NEXT
// - When finding backwardBoundary (or forwardBoundary), we haven't added any margin
//   - AND we're using .bp to find distance with prev label (it should be attachBp)
// - Label lines crossing in islands can occur if the next label pops less then previous label
// - When checking if we've merged with the first island or not (make sure to re-place the first island) as it may have a new boundary with the last island
// - Instead of keeping track of all placed rects lets do it island by island
//   - We can also compare against just the previous islands rects as well
//
// - Add margin to boundary between islands. It only has to be label.height (x1.5) for now
//
// - Island should know if it has a boundary from an other island
//  - if so, adjust boundary labels to not clash
//
// DEFINITIONS:
// Island:
// - Group of labels that overlap and are placed together as a group
// - Starts off with groups of labels where each label overlaps the previous label (when placed normally)
// Boundary Labels:
// - The first and last label in an island
// - These labels should not clash with the next/previous island boundary labels
// Popped Labels:
// - Labels that can not be placed normally or angled without increasing the angle too much
// - Popped labels increase their line length until they don't clash with any other labels (in their island or the previous one)
// Label Properties:
// - label.bp is where the label line will be on the map side
// - label._attachBp is where the label line will be on the label side

// IMPROVEMENTS:
// - use sequence.lengthOfRange(start, stop) for ORIGIN issues
// - add sequence and sequence length properties to LabelIsland class
// - change attachement to attachment!!!! (in utils and everywhere it's called

// Issues:
// - When labels can't be placed the max angle is applied to the island edges
//   and labels are placed inward but thi scan cuase the large islands to be be
//   at extreme angles

// Notes:
// - If needed we can sort by island size. Place bigger islands first (or other way around)

/**
 *
 * Testing have labels angled way (fanned out) from each other
 *
 * @extends LabelPlacementDefault
 * @private
 */
class LabelPlacementAngled extends LabelPlacementDefault {

  /**
   * Create a new label placement instance
   * @param {Annotation} annotation - The CGView annotation object
   * @param {Object} options - ...
   */
  constructor(annotation, options = {}) {
    super(annotation, options);
    // this._debug = false;
    // this._debug = true;

    // Debuging labels
    // - add what to log when a label is clicked
    this.viewer.on('click', (e) => {
      if (e.elementType === 'label') {
        const label = e.element;
        console.log(`${label.name}: BP:${label.bp}, aBP:${label._attachBp}, D:${label._direction}, P:${label._popped}`);
        console.log(label._island);
        console.log(label);
      }
    });
  }

  /**
   * Place provided labels
   * @param {Array} labels - The labels to place.
   * @param {Number} outerOffset - Initial distance from the map for label rect placement (not including line length)
   * @param {Object} options - ...
   */
  placeLabels(labels, outerOffset) {
    this._debug && console.log('LABELS -----------------------------------------');
    const canvas = this.canvas;
    let label;
    this._rectOffsetWithoutLineLength = outerOffset + this._labelLineMarginInner + this._labelLineMarginOuter;

    const bpPerPixel = 1 / canvas.pixelsPerBp(this.rectCenterOffset());
    this._boundaryMargin = (labels[0]?.height * bpPerPixel / 2);

    // Sort labels by bp position
    labels.sort( (a, b) => a.bp - b.bp );

    // The approximate bp adjustment for the label ine to reach the given angle (Degrees)
    // const maxLineAngle = 45;
    const maxLineAngle = 80;
    this.maxBpAdjustment = this.maxBpAdjustForAngle(maxLineAngle);
    // Reduce angle for 6/12 attachments (maybe by half)

    // Reset label properties
    for (let i = 0, len = labels.length; i < len; i++) {
      label = labels[i];
      label._attachBp = label.bp;
      label._direction = 0; // 0: straight; -1: back; 1: forward;
      label._popped = false;
      label._placementIndex = i;
      // FIXME: assuming circle for now
      label._next = (i === len-1) ? labels[0] : labels[i+1];
      label._prev = (i === 0) ? labels[labels.length-1] : labels[i-1];

      // Default Rect for label
      const outerPt = canvas.pointForBp(label.bp, this.rectCenterOffset());
      const rectOrigin = utils.rectOriginForAttachementPoint(outerPt, label.lineAttachment, label.width, label.height);
      label._defaultRect = new Rect(rectOrigin.x, rectOrigin.y, label.width, label.height);
      label.rect = label._defaultRect;

      // Default maxBp Adjustment
      // Top/bottom labels will have half the max adjust
      label._maxBpAdjustment = [6,12].includes(label.lineAttachment) ? this.maxBpAdjustment / 2 : this.maxBpAdjustment;
    }

    // Find Initial Islands
    let islands = this.findIslands(labels);

    // Next step
    // - Find extent of islands based on angle of label line and position on map
    // - Find next attahcment point and check if it extends to far
    // - If it does then find maximum angle for last label in island and
    //
    // - HERE NOW
    //
    // - Island
    //  - method to get bp and attachp bp limits based on last labels
    //  - if extents reached, the island can no longer grow
    //   NEXT place labels inward from both sides until you reach the middle
    //  - keep list of labels not paced (need to be popped)
    //  - and method for length of popped labels

    // Place island labels
    // INITIAL PLACEMENT
    for (let islandIndex = 0, len = islands.length; islandIndex < len; islandIndex++) {
      const island = islands[islandIndex];
      island.placeLabels();
    }
    // MERGE ISALNDS
    // console.log('BEFORE', islands.length)
    islands = LabelIsland.mergeIslands(this, islands);
    // console.log('AFTER', islands.length)
    // TODO: FINAL PLACEMENT (with better management of placed rects)
    // for (let islandIndex = 0, len = islands.length; islandIndex < len; islandIndex++) {
    //   const island = islands[islandIndex];
    //   island.placeLabels();
    // }

    // Goes through each label and if it overlaps any previous label, the line length in increased
    // TODO:
    //  - this using the default line length and increases it
    //  - We may wwant to store the currently used line length in the label
    this.finalLabelAdjust(labels);

    for (let labelIndex = 0, len = labels.length; labelIndex < len; labelIndex++) {
      const label = labels[labelIndex];
      if (label.rect) {
        label.attachementPt = label.rect.ptForClockPosition(label.lineAttachment);
      }
    }
  }

  // Initial pass for finding islands using the default rect for each label
  // - Islands occur when a label overlaps the next label which overlaps the next label and so on.
  findIslands(labels=[]) {
    let label, prevLabel;
    const islands = [];
    if (labels.length === 0) return islands;
    let  island = new LabelIsland(this, labels[0]);
    for (let labelIndex = 1, len = labels.length; labelIndex < len; labelIndex++) {
      label = labels[labelIndex];
      prevLabel = this._prevLabel(label);
      if (label._defaultRect.overlap([prevLabel._defaultRect])) {
        island.addLabels(label);
      } else {
        islands.push(island);
        island = new LabelIsland(this, label);
      }
    }
    // Add last island
    islands.push(island);
    // FIXME: if last label and first label overlap, the first and last islands must be merged
    return islands;
  }

  _nextLabel(label, direction=1) {
    return (direction >= 0) ? label._next : label._prev;
  }
  _prevLabel(label, direction=1) {
    return (direction >= 0) ? label._prev : label._next;
  }

  // Direction: 1 for forward, -1 for backward
  // Returns the attachPt for the next label. The point where the label line attaches to the next label.
  // AttachPt is the point on the rect that the line attaches to
  // Only works when the label overlaps with previous label
  // FIXME: ADD MARGIN between rects
  // Coordinates:
  // - outerPtX/Y are on the canvas coordinates and refer to where on the label, the label line will attach.
  // - mapX/Y are on the map coordinates
  // Note the sign for map coordinates.
  // - when getting the sqrt of attachPt for 1,2,3,4,5: mapX is negative.
  // - when getting the sqrt of attachPt for 7,8,9,10,11: mapX is positive.
  _getNextAttachPt(label, direction=1) {
    const margin = 2;
    const scale = this.viewer.scale;
    const goingForward = (direction > 0);
    // Distance from the map center to where the label rect will be attached
    const rectOffset = this.rectCenterOffset();
    const rectOffsetSquared = rectOffset*rectOffset;
    let outerPtX, outerPtY, mapY, mapX;
    let height = label.height;
    let width = label.width;
    const prevRect = this._prevLabel(label, direction)?.rect;
    // Return the default point for the label when their is no previous label to compare
    if (!prevRect) {
      return this.canvas.pointForBp(label.bp, rectOffset);
    }
    // FIXME: it would be better of layout specific code could be in the Layout class
    const isLinear = this.viewer.format === 'linear';

    // Label Line Attachment Sites
    //  10,11       12       1,2
    //      \_______|_______/
    //   9 -|_______________|- 3
    //      /       |       \
    //  8,7         6        5,4
    switch (label.lineAttachment) {
      case 7:
      case 8:
        outerPtY = goingForward ? (prevRect.bottom + height + margin) : (prevRect.top - margin);
        mapY = scale.y.invert(outerPtY);
        mapX = Math.sqrt( (rectOffsetSquared) - (mapY*mapY) );
        outerPtX = scale.x(mapX);
        break;
      case 9:
        outerPtY = goingForward ? (prevRect.bottom + (height/2) + margin) : (prevRect.top - (height/2) - margin);
        mapY = scale.y.invert(outerPtY);
        mapX = Math.sqrt( (rectOffsetSquared) - (mapY*mapY) );
        outerPtX = scale.x(mapX);
        break;
      case 10:
      case 11:
        outerPtY = goingForward ? (prevRect.bottom + margin) : (prevRect.top - height - margin);
        mapY = scale.y.invert(outerPtY);
        mapX = Math.sqrt( (rectOffsetSquared) - (mapY*mapY) );
        outerPtX = scale.x(mapX);
        break;
      case 12:
        // FIXME: Won't work for linear (if we ever have labels on the bottom of the map)
        // - see case 6 below
        outerPtX = goingForward ? (prevRect.left - (width/2) - margin) : (prevRect.right + (width/2) + margin);
        mapX = scale.x.invert(outerPtX);
        mapY = -Math.sqrt( (rectOffsetSquared) - (mapX*mapX) );
        outerPtY = scale.y(mapY);
        break;
      case 1:
      case 2:
        outerPtY = goingForward ? (prevRect.top - height - margin) : (prevRect.bottom + margin);
        mapY = scale.y.invert(outerPtY);
        mapX = -Math.sqrt( (rectOffsetSquared) - (mapY*mapY) );
        outerPtX = scale.x(mapX);
        break;
      case 3:
        outerPtY = goingForward ? (prevRect.top - (height/2) - margin) : (prevRect.bottom + (height/2) + margin);
        mapY = scale.y.invert(outerPtY);
        mapX = -Math.sqrt( (rectOffsetSquared) - (mapY*mapY) );
        outerPtX = scale.x(mapX);
        break;
      case 4:
      case 5:
        outerPtY = goingForward ? (prevRect.top - margin) : (prevRect.bottom + height + margin);
        mapY = scale.y.invert(outerPtY);
        mapX = -Math.sqrt( (rectOffsetSquared) - (mapY*mapY) );
        outerPtX = scale.x(mapX);
        break;
      case 6:
        // FIXME: Won't work for linear
        outerPtX = goingForward ? (prevRect.right + (width/2) + margin) : (prevRect.left - (width/2) - margin);
        if (isLinear) {
          outerPtY = prevRect.top;
        } else {
          mapX = scale.x.invert(outerPtX);
          mapY = Math.sqrt( (rectOffsetSquared) - (mapX*mapX) );
          outerPtY = scale.y(mapY);
        }
        break;
    }
    return {x: outerPtX, y: outerPtY};
  }

  /**
   * Approximate bp change between label line start (label.bp) and end (label._attachBp)
   * for the given angle in degrees.
   * Most accurate as the circle approaches looking like a line
   *                      bp
   *                      |  x - xDistance is top line from bp to attachBp
   *                      +----+ - attachBp
   *                      |   /
   *    labelLineLength - |  /
   *                      | /
   *                      v - angle
   * @param {Number} degrees - Label line angle
   */
  maxBpAdjustForAngle(degrees) {
    this.rectCenterOffset();
    // The distance (with no angle) from line start to line end
    const distanceBpToAttachBp = this.initialLabelLineLength;
    const radians = degrees * Math.PI/180;
    // Find out xDistance for angle
    const xDistance = distanceBpToAttachBp * Math.tan(radians);
    // Convert to bp difference
    const startPt = this.canvas.pointForBp(1, this.rectCenterOffset());
    startPt.x += xDistance;
    const bpDiff = this.canvas.bpForPoint(startPt);
    this._debug && console.log(`BP Diff for angle ${degrees}°: ${bpDiff}`);
    return bpDiff
  }

  // Basically the same as the Default lable placement
  // - except we are using ._attachBp instead of .bp
  finalLabelAdjust(labels) {
    const canvas = this.canvas;
    let label, bp, lineLength, overlappingRect;

    const placedRects = new CGArray();
    for (let i = 0, len = labels.length; i < len; i++) {
      label = labels[i];
      bp = label._attachBp;
      lineLength = this.initialLabelLineLength;
      do {
        const outerPt = canvas.pointForBp(bp, this.rectCenterOffset(lineLength));
        const rectOrigin = utils.rectOriginForAttachementPoint(outerPt, label.lineAttachment, label.width, label.height);
        label.rect = new Rect(rectOrigin.x, rectOrigin.y, label.width, label.height);
        overlappingRect = label.rect.overlap(placedRects);
        lineLength += label.height;
      } while (overlappingRect);
      placedRects.push(label.rect);
      label.attachementPt = label.rect.ptForClockPosition(label.lineAttachment);
    }

  }

}

//////////////////////////////////////////////////////////////////////////////
// Helper Classes
//////////////////////////////////////////////////////////////////////////////
class LabelIsland {

  constructor(labelPlacement, labels) {
    this.labelPlacement = labelPlacement;
    this._labels = [];
    this.canvas = labelPlacement.canvas;
    this.viewer = labelPlacement.viewer;
    this._placedRects = [];
    this.addLabels(labels);
  }


  static mergeIslands(labelPlacement, islands) {
    const sequence = labelPlacement.viewer.sequence;
    // place labels of curent isalnd and next island
    // do they clash
    // yes - merge and re-place island and try to merge again
    //  no - continue on

    // No need to merge if there is only one island
    if (islands.length <=1) {
      return islands;
    }

    // Need to go through island iteratively until there are no more merges
    // Everytime we merge we have to start again
    let mergeOccurred, mergedIslands;
    let tempIslands = islands;
    let tempIsland;
    let labelsToMerge = islands[0]?.labels;
    // The max loop cound will be the length of the original islands
    let loopCount = 0;
    do {
      mergeOccurred = false;
      mergedIslands = [];
      loopCount++;

      for (let islandIndex = 0, len = tempIslands.length; islandIndex < len; islandIndex++) {
        // if (tempIslands?.length === 1) {
        //   console.log('TEMP = 1')
        //   // break out of FOR and DO loop
        //   break;
        // }
        // const island = tempIsland || mergedIslands[islandIndex];
        const island = tempIslands[islandIndex];
        const nextIsland = (islandIndex >= (len-1)) ? tempIslands[0] : tempIslands[islandIndex + 1];

        island.placeLabels(); // FIXME: don't need to place if didn't merge last time (since these are the same as the last loops nextIsland)
        nextIsland.placeLabels();

        // Same island. No need to merge.
        if (nextIsland === island) {
          // console.log('SAME ISLAND')
          break;
        }

        if (island.clash(nextIsland)) {
          if (island.canMergeWith(nextIsland)) {
            labelsToMerge = island.labels.concat(nextIsland.labels);
            tempIsland = new LabelIsland(labelPlacement, labelsToMerge);

            // Add previous boundary to newly merged island
            tempIsland.startBoundaryBp = island.startBoundaryBp;

            // Deal with last island merging with first island
            if (island === tempIslands[len-1]) {
              mergedIslands[0] = tempIsland;
              tempIsland.placeLabels();
              // FIXME: I think we may still need to go through do loop again
              // mergeOccurred = false;
              // Breaks out of DO loop (because mergeOccurred is not set to true)
              break;
            }

            mergedIslands.push(tempIsland);

            // Add remaining islands to merged for next iteration
            // FIXME:
            if (tempIslands[islandIndex+2]) {
              mergedIslands = mergedIslands.concat(tempIslands.slice(islandIndex+2));
            }
            tempIslands = mergedIslands;
            mergeOccurred = true;
            break; // Out of for loop
          } else {

            // Overlap but can't merge
            // Add boundaries betwen the 2 islands
            // TODO: add margin
            // - This could become an island method: centerBpBetweenIslands or something
            // - NEED to take into account circle FIXORIGIN. fixed?
            // const boundaryBp = island.lastLabel.bp + ((nextIsland.firstLabel.bp - island.lastLabel.bp) / 2);
            let bpDistanceBetweenIslands = nextIsland.firstLabel.bp - island.lastLabel.bp;
            if (bpDistanceBetweenIslands < 0) {
              bpDistanceBetweenIslands += sequence.length;
            }
            // FIXME: this can be larger the sequence length
            island.lastLabel.bp + (bpDistanceBetweenIslands / 2);
            let boundaryDistance = bpDistanceBetweenIslands / 2;
            // const bpPerPixel = 1 / labelPlacement.canvas.pixelsPerBp(labelPlacement.rectCenterOffset());
            // const boundaryMargin = (island.lastLabel.height * bpPerPixel / 2);
            // boundaryDistance -= boundaryMargin;
            boundaryDistance -= labelPlacement._boundaryMargin;
            // Don't let distance be les than 0 or the then label line will go in the opposite direction
            boundaryDistance = (boundaryDistance < 0) ? 0 : boundaryDistance;

            // Center boundary has to be adjusted to fit label text
            // const bpPerPixel = 1 / labelPlacement.canvas.pixelsPerBp(labelPlacement.rectCenterOffset());
            // const boundarMargin = (island.lastLabel.height * bpPerPixel / 2);
            // boundaryBp = (boundaryBp < 0) ? 0 : boundaryBp;

            // FIXME
            // - the subtract/add of boundary margin has to deal with
            //   - origin

            // console.log('NO MERGE', boundaryBp)
            island.stopBoundaryBp = sequence.addBp(island.lastLabel.bp, boundaryDistance);
            nextIsland.startBoundaryBp = sequence.subtractBp(nextIsland.firstLabel.bp, boundaryDistance);
            // island.stopBoundaryBp = boundaryBp - boundarMargin;
            // nextIsland.startBoundaryBp = boundaryBp + boundarMargin;
            // island.stopBoundaryBp = boundaryBp;
            // nextIsland.startBoundaryBp = boundaryBp;
            // Re-place current island. Next island will be placed on next iteration.
            island.placeLabels();
          }
        } else {
          mergedIslands.push(island);
        }
      }
    } while (mergeOccurred && loopCount < islands.length);
    return mergedIslands;
  }
    // for (let islandIndex = 0, len = islands.length; islandIndex < len; islandIndex++) {
    //   const island = tempIsland || islands[islandIndex];
    //   const nextIsland = (islandIndex >= (len-1)) ? (mergedIslands[0] || islands[0]) : islands[islandIndex + 1];
    //
    //   island.placeLabels(); // FIXME: don't need to place if didn't merge last time (since these are the same as the last loops nextIsland)
    //   nextIsland.placeLabels();
    //
    //   if (island.clash(nextIsland)) {
    //     labelsToMerge = labelsToMerge.concat(nextIsland.labels);
    //     tempIsland = new LabelIsland(labelPlacement, labelsToMerge);
    //   } else {
    //     mergedIslands.push(new LabelIsland(labelPlacement, labelsToMerge));
    //     labelsToMerge = nextIsland.labels;
    //     tempIsland = null;
    //   }
    // }

  get labels() {
    return this._labels;
  }

  get length() {
    return this.labels.length;
  }

  get single() {
    return this.labels.length === 1;
  }

  get firstLabel() {
    return this.labels[0];
  }

  get lastLabel() {
    return this.labels[this.labels.length-1];
  }

  get placedRects() {
    return this._placedRects;
  }

  // Add a label or an array of labels
  addLabels(labels) {
    if (labels) {
      if (Array.isArray(labels)) {
        // Labels is an array of labels
        this._labels = this._labels.concat(labels);
        for (const label of labels) {
          label._island = this;
        }
      } else {
        // Labels is a single label
        this._labels.push(labels);
        labels._island = this;
      }
    }
  }

  // Find middle label and adjust outward from there.
  // We know that the labels on each side overlaps and so on
  placeLabels() {
    let forwardMaxAngleReached, backwardMaxAngleReached;
    if (!this.single) {
      // Basic placement
      const centerIndex = Math.floor((this.length-1) / 2);
      forwardMaxAngleReached = this.adjustLabels(centerIndex, 1);
      backwardMaxAngleReached = this.adjustLabels(centerIndex, -1);
    }
    // Not enough room, find labels to pop
    if (forwardMaxAngleReached || backwardMaxAngleReached) {
      // TODO: pop labels!!!!!
      // Place labels with max angle until labels overlap again
      this.placeWithMaxAngle();
      // Place remaining labels as popped
      this.placePoppedLabels();
    }
    this._placedRects = this.labels.map(l => l.rect);
  }

  adjustLabels(centerIndex, direction) {
    const canvas = this.canvas;
    for (let i = centerIndex+direction, len = this.labels.length; (direction > 0) ? i < len : i >= 0; i+=direction) {
      const label = this.labels[i];
      let labelAttachPt = this.labelPlacement._getNextAttachPt(label, direction);
      // Before getting rect, check if line angle is too large
      let attachBp = canvas.bpForPoint(labelAttachPt);
      // This may be different for different labels based on clock position
      // const maxBpAdjustment = [6,12].includes(label.lineAttachment) ?
      //   this.labelPlacement.maxBpAdjustment / 2 :
      //   this.labelPlacement.maxBpAdjustment;

      // TODO: if label/island has a boundary use it
      if (direction > 0) {
        if (attachBp > this.stopBoundaryBp) {
          // console.log('BOUNDARY-stop')
          return true;
        }
      } else if (direction < 0) {
        if (attachBp < this.startBoundaryBp) {
          // console.log('BOUNDARY-start')
          return true;
        }
      }

      // If max bp adjustemnt is reached, return so labels can be placed from the outside inward
      if (isNaN(attachBp) || Math.abs(attachBp - label.bp) > label._maxBpAdjustment) {
        return true;
      }
      // TODO: MERGING ISLANDS
      // - check if we overlap with next island
      // - decide whether to merge or not

      this.adjustLabelWithAttachPt(label, labelAttachPt);
    }
  }

  // Set the first and last label to their maximum angle and place labels
  // inwards from there until the labels overlap. Return the overlapping
  // labels and the remaining unplaced labels.
  // FIXME: if any labels pop, label lines have to be angled way from popped labels
  placeWithMaxAngle() {
    this.canvas;
    let forwardIndex, backwardIndex, backLabel, frontLabel, middleLabel;
    this.adjustLabelToMaxAngle(this.firstLabel, -1);
    this.adjustLabelToMaxAngle(this.lastLabel, 1);
    for (let i = 1, len = this.labels.length; i < len; i++) {
      forwardIndex = i;
      backwardIndex = len - 1 - i;
      if (forwardIndex > backwardIndex) {
        // Reached the middle
        // console.log('MIDDLE', forwardIndex, backwardIndex)
        return;
      } else if (forwardIndex === backwardIndex) {
        middleLabel = this.labels[backwardIndex];
        this.adjustLabelToNextAttachPt(middleLabel, 1);
        const compareLabel = frontLabel || this.lastLabel;
        if (this.labelsClash(middleLabel, compareLabel)) {
          this.poppedStartIndex = forwardIndex;
          this.poppedStopIndex = backwardIndex;
          // this.poppedStartIndex = this.adjustPopIndex(forwardIndex, -1);
          // this.poppedStopIndex = this.adjustPopIndex(backwardIndex, 1);
        }
        return;
      }
      backLabel = this.labels[forwardIndex];
      frontLabel = this.labels[backwardIndex];
      this.adjustLabelToNextAttachPt(backLabel, 1);
      this.adjustLabelToNextAttachPt(frontLabel, -1);
      if (this.labelsClash(backLabel, frontLabel)) {
        // Return the current label indices as the limits of popping labels
        // console.log('Pop Indices Before', forwardIndex, backwardIndex);
        this.poppedStartIndex = this.adjustPopIndex(forwardIndex, -1);
        this.poppedStopIndex = this.adjustPopIndex(backwardIndex, 1);
        // this.poppedStartIndex = forwardIndex;
        // this.poppedStopIndex = backwardIndex;
        // console.log('Pop Indices After', this.poppedStartIndex, this.poppedStopIndex);
        return;
      }
    }
  }

  // Need to adjust pop indices to add any labels whose label line is angled towards island middle
  adjustPopIndex(index, direction) {
    // console.log('INITIAL', index)
    let newIndex = index;
    for (let i = index+direction, len = this.labels.length; (direction > 0) ? i < len : i >= 0; i+=direction) {
      const label = this.labels[i];
      if (label._direction == direction) {
        // return newIndex;
        break;
      }
      newIndex = i;
    }
    // console.log('NEW', newIndex)
    return newIndex;
  }


  // Take the labels that should be popped (ie, labels that don't have space to be right beside map)
  // and place them by equaling apart (based on distance from pre to post popped label attchBp)
  // and increasing line length until there are no clashes with other popped labels
  // - Get bp from label before popped and label after popped (may need to adjust)
  // - This is the bp range
  // - Divide bp range by number of popped labels then start from one end (or both?)
  // - This is the popped bp shift
  // - Place each lable by incrementing the bp shift and extend line until it doesn't clash
  placePoppedLabels() {
    if (this.poppedStartIndex === undefined || this.poppedStopIndex === undefined) return;
    let label, bp, lineLength, overlappingRect;
    const sequenceLength = this.viewer.sequence.length;
    // console.log('LENGTH BEFORE', this.labels.length)

    // Add non-popped labels from this island to rectsToCheck
    let rectsToCheck = this.labels.filter( (label,i) => (i < this.poppedStartIndex || i > this.poppedStopIndex) ).map(l => l.rect);


    // FIXME: previous island may not exist in linear
    const prevIsland = this.firstLabel?._prev?._island;
    if (prevIsland) {
      rectsToCheck = rectsToCheck.concat(prevIsland.placedRects);
    }
    // Get labels before and after popped. Or use the the poppedIndex of there are no more labels
    const prePoppedIndex = Math.max(this.poppedStartIndex-1, 0);
    const postPoppedIndex = Math.min(this.poppedStopIndex+1, this.labels.length-1);
    // console.log(this.poppedStartIndex, prePoppedIndex, this.labels)
    // console.log(this.poppedStartIndex, this.poppedStopIndex);
    const startBp = this.labels[prePoppedIndex]._attachBp;
    const stopBp = this.labels[postPoppedIndex]._attachBp;
    // Check if we are crossing the origin
    let bpDistance = (startBp > stopBp) ? (sequenceLength - startBp + stopBp) : stopBp - startBp; 
    const bpIncrement = bpDistance / (this.poppedStopIndex - this.poppedStartIndex + 2);
    let poppedNumber = 1;
    for (let i = this.poppedStartIndex; i <= this.poppedStopIndex; i++) {
      label = this.labels[i];
      // bp = label.bp;
      bp = startBp + (bpIncrement * poppedNumber);
      lineLength = this.labelPlacement.initialLabelLineLength;
      label._popped = true;
      do {
        const outerPt = this.canvas.pointForBp(bp, this.labelPlacement.rectCenterOffset(lineLength));
        this.adjustLabelWithAttachPt(label, outerPt);
        overlappingRect = label.rect.overlap(rectsToCheck);
        lineLength += label.height;
      } while (overlappingRect);
      rectsToCheck.push(label.rect);
      poppedNumber++;
    }
    // console.log('LENGTH AFTER', this.labels.length)
  }
  // Place popped labels only by line length
  // placePoppedLabels() {
  //   let label, bp, lineLength, overlappingRect;
  //   const placedRects = [];
  //   for (let i = this.poppedStartIndex; i <= this.poppedStopIndex; i++) {
  //     label = this.labels[i];
  //     bp = label.bp;
  //     lineLength = this.labelPlacement.initialLabelLineLength;
  //     do {
  //       const outerPt = this.canvas.pointForBp(bp, this.labelPlacement.rectCenterOffset(lineLength));
  //       this.adjustLabelWithAttachPt(label, outerPt);
  //       // FIXME: need label rect of island and more??
  //       overlappingRect = label.rect.overlap(placedRects);
  //       lineLength += label.height;
  //     } while (overlappingRect);
  //     placedRects.push(label.rect);
  //   }
  // }

  // Adjust label to the next closest position from the previous label
  adjustLabelToNextAttachPt(label, direction) {
    let labelAttachPt = this.labelPlacement._getNextAttachPt(label, direction);
    this.adjustLabelWithAttachPt(label, labelAttachPt);
  }

  // Adjust label, to the given attachment point
  adjustLabelWithAttachPt(label, labelAttachPt) {
    const rectOrigin = utils.rectOriginForAttachementPoint(labelAttachPt, label.lineAttachment, label.width, label.height);
    label.rect = new Rect(rectOrigin.x, rectOrigin.y, label.width, label.height);
    label._attachBp = this.canvas.bpForPoint(labelAttachPt);

    // FIXME: circle FIXORIGIN issue. fixed?
    // - NOPE: doesn't work if attachBp and bp are on opposite sides of the origin
    const bpDiff = label.bp - label._attachBp;
    if (bpDiff > 0) {
      label._direction = -1;
    } else if (bpDiff < 0 ) {
      label._direction = 1;
    } else {
      label._direction = 0;
    }
    const sequenceHalfLength = this.viewer.sequence.length / 2;
    if (Math.abs(bpDiff) > sequenceHalfLength ) {
      // crosses origin
      // console.log('CROSS ORIGIN')
      label._direction *= -1;
    }
    // if (label._attachBp < label.bp) {
    //   label._direction = -1;
    // } else if (label._attachBp > label.bp) {
    //   label._direction = 1;
    // } else {
    //   label._direction = 0;
    // }
  }

  // The forward boundary of the island. Based on the following:
  // - the max angle a boundary label can go
  // - the next island's first label
  // - if merging with the next island could not occur then the boundary is in between the islands
  // - need to consider
  //   - linear/circular maps and the origin
  //   - Is there a next island?
  forwardBoundary() {
    if (this.stopBoundaryBp) return this.stopBoundaryBp;
    const lastLabel = this.lastLabel;
    const nextLabel = lastLabel._next;
    const sequenceLength = this.viewer.sequence.length;
    let distance;
    if (nextLabel?.bp < lastLabel.bp) {
      // Cross origin
      distance = sequenceLength - lastLabel.bp + nextLabel.bp;
    } else if (nextLabel) {
      distance = nextLabel.bp - lastLabel.bp;
    }
    // TODO: this should be extracted elsewhere
    // Adjust distance to give space between islands
    // Use label height converted to bp
    // const bpPerPixel = 1 / this.canvas.pixelsPerBp(this.labelPlacement.rectCenterOffset());
    // console.log('bp/px', bpPerPixel)
    // distance -= (lastLabel.height * bpPerPixel / 2);
    // distance -= (lastLabel.height * bpPerPixel * 4);
    // distance = (distance < 0) ? 0 : distance;

    distance = (distance > lastLabel._maxBpAdjustment) ? lastLabel._maxBpAdjustment : distance;
    return lastLabel.bp + distance;
  }
  backwardBoundary() {
    if (this.startBoundaryBp) return this.startBoundaryBp;
    const firstLabel = this.firstLabel;
    const prevLabel = this.firstLabel._prev;
    const sequenceLength = this.viewer.sequence.length;
    let distance;
    // if (prevLabel?.bp > firstLabel.bp) {
    if (prevLabel?._attachBp > firstLabel.bp) {
      // Cross origin
      // FIXME: should use attachBp here as well for prevLabel
      distance = sequenceLength - prevLabel.bp + firstLabel.bp;
    } else if (prevLabel) {
      // distance = firstLabel.bp - prevLabel.bp;
      distance = firstLabel.bp - prevLabel._attachBp - this.labelPlacement._boundaryMargin;
    }
    // Adjust distance to give space between islands
    // Use label height
    // distance -= (firstLabel.height/2);
    // const bpPerPixel = 1 / this.canvas.pixelsPerBp(this.labelPlacement.rectCenterOffset());
    // distance -= (firstLabel.height * bpPerPixel / 2);
    // distance = (distance < 0) ? 0 : distance;

    distance = (distance > firstLabel._maxBpAdjustment) ? firstLabel._maxBpAdjustment : distance;
    // console.log('After maxBp adjust distance', distance)
    return firstLabel.bp - distance;
  }

  // Adjust label, so that is label line is at the maximum allowed angle
  // Boundaries are either set by islands that tried to merge and couldn't: boundary half way between them
  // Or it's just the next/prev label bp (for now)
  // // should be MaxBoundary?
  adjustLabelToMaxAngle(label, direction) {
    // const maxBpAdjustment = this.labelPlacement.maxBpAdjustment;
    const maxBpAdjustment = label._maxBpAdjustment;
    label.bp + (direction * maxBpAdjustment);
    let newBp;
    if (direction > 0) {
      // boundary = this.stopBoundaryBp || this.lastLabel._next.bp;
      // newBp = (maxBp > boundary) ? boundary : maxBp;
      newBp = this.forwardBoundary();
    } else if (direction < 0) {
      // boundary = this.startBoundaryBp || this.firstLabel._prev.bp;
      // newBp = (maxBp < boundary) ? boundary : maxBp;
      newBp = this.backwardBoundary();
    }
    // const labelAttachPt = this.canvas.pointForBp(label.bp + (direction * maxBpAdjustment), this.labelPlacement.rectCenterOffset());
    const labelAttachPt = this.canvas.pointForBp(newBp, this.labelPlacement.rectCenterOffset());
    this.adjustLabelWithAttachPt(label, labelAttachPt);
  }

  // Looking Forward
  clash(island) {
    const didClash =  this.labelsClash(this.lastLabel, island.firstLabel);
    // console.log(`CLASH: ${!!didClash}, ${this.length}-${island.length}, ${this.lastLabel.name} - ${island.firstLabel.name}`);
    return didClash;

    // return this.labelsClash(this.lastLabel, island.firstLabel);
  }

  labelsClash(label1, label2) {
    const sequence = this.labelPlacement.viewer.sequence;
    const rectsOverlap = label1.rect.overlap([label2.rect]);
    // The following does not work for crossing the origin
    // const linesCross = (label1.bp < label2.bp) ? (label1._attachBp > label2._attachBp) : (label1._attachBp < label2._attachBp);

    // If the attachBp diff and bp diff are of opposite signs then the lines cross
    // NOTE: this is the effectively the same as above
    // const linesCross = ((label2.bp - label1.bp) / (label2._attachBp - label1._attachBp)) < 0 ;

    // TEMP FIX
    // FIXME
    const bpDistance = sequence.lengthOfRange(label1.bp, label2.bp);
    const attachDistnace = sequence.lengthOfRange(label1._attachBp, label2._attachBp);
    const linesCross = (bpDistance < (sequence.length / 2)) && (attachDistnace > (sequence.length / 2));

    return (rectsOverlap || linesCross);
  }

  // Max island range is based on labe._maxBpAdjustment of island boundaries
  canMergeWith(island) {
    // May need to merge first and test size
    const rangeFactor = 1;
    const maxBpRangeAllowed = rangeFactor * (this.firstLabel._maxBpAdjustment + island.lastLabel._maxBpAdjustment);
    // Approximate range if islands were merged. Not exact because we haven't re-placed labels after a merge.
    // FIXME: over FIXORIGIN - fixed?
    let mergedIslandRange = island.lastLabel._attachBp - this.firstLabel._attachBp;
    if (mergedIslandRange < 0) {
      // over the origin
      mergedIslandRange += this.viewer.sequence.length;
    }
    // console.log(`${this.firstLabel.name}: ${this.firstLabel._attachBp}; ${island.lastLabel.name}: ${island.lastLabel._attachBp}`);
    // console.log('CAN?-', mergedIslandRange, maxBpRangeAllowed, mergedIslandRange <= maxBpRangeAllowed)
    return mergedIslandRange <= maxBpRangeAllowed;
  }

  // merge(island) {
  //   this._labels = this._labels.concat(island.labels);
  //   // TODO: may need to resort but maybe not if we only go forward
  // }

}

// CONSIDER doing this for nonpopped labels on the island edge
  // // Adjust the lineAttahcment point based on the direction of the label
  // // - angled forward: add 1 to the clock position of the attachment
  // // - angled backward: subtract 1 to the clock position of the attachment
  // _adjustLinAttachment(label, direction) {
  //   let newLineAttacment = label.lineAttachment;
  //   newLineAttacment+= direction;
  //   if (newLineAttacment > 12) {
  //     newLineAttacment = 1;
  //   } else if (newLineAttacment < 1) {
  //     newLineAttacment = 12;
  //   }
  //   label.lineAttachment = newLineAttacment;
  // }

//////////////////////////////////////////////////////////////////////////////
// Events
//////////////////////////////////////////////////////////////////////////////

/**
 * Events is a system to plug in callbacks to specific events in CGView.
 * Use [on](#on) to add a callback and [off](#off) to remove it.
 *
 * See individual [record types](../docs.html#s.details-by-record-type) for a list of event names.
 *
 * Here are a list of additional events supported in CGView:
 *
 * Event             | Description
 * ------------------|-----------------------------------------------------
 * cgv-load-json     | Called when [IO.loadJSON()](IO.html#loadJSON) is executed
 * mousemove         | Called when mouse moves on the Viewer. Returns [event-like object](EventMonitor.html)
 * click             | Called when mouse clicks on the Viewer. Returns [event-like object](EventMonitor.html)
 * zoom-start        | Called once before the viewer is zoomed or moved
 * zoom              | Called every frame of the zoom or move
 * zoom-end          | Called once after the viewer is zoomed or moved
 * click             | Called when a click occurs in the viewer
 * mousemove         | Calleed when the mouse moves in the viewer
 * bookmarks-shortcut | Called when a bookmark shortcut key is clicked
 */
class Events {

  /**
   * Creats holder for events.
   * Accessible via [Viewer.events](Viewer.html#events).
   */
  constructor() {
    this._handlers = {};
  }

  /**
   * Attach a callback function to a specific CGView event.
   * Accessible via [Viewer.on()](Viewer.html#on).
   *
   * ```js
   * cgv = new CGV.Viewer('#my-viewer');
   * cgv.on('zoom-start', function() { console.log('Zooming has begun!') };
   *
   * // The event can be namespaced for easier removal later
   * cgv.on('zoom-start.my_plugin', function() { console.log('Zooming has begun!') };
   * ```
   *
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
   * Remove a callback function from a specific CGView event. If no callback is provided,
   * then all callbacks for the event will be removed. Namespaced events can and should be used
   * to avoid unintentionally removing callbacks attached by other plugins.
   * Accessible via [Viewer.off()](Viewer.html#off).
   *
   * ```js
   * // Remove all callbacks attached to the 'drag-start' event.
   * // This includes any namespaced events.
   * cgv.off('zoom-start');
   *
   * // Remove all callbacks attached to the 'drag-start' event namespaced to 'my_plugin'
   * cgv.off('zoom-start.my_plugin');
   *
   * // Remove all callbacks attached to any events namespaced to 'my_plugin'
   * cgv.off('.my_plugin');
   * ```
   *
   * @param {String} event -  Name of event. Events can be namespaced.
   * @param {Function} callback - Specfic function to remove
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
   * Accessible via [Viewer.trigger()](Viewer.html#trigger).
   *
   * ```js
   * // Triggers all callback functions associated with zoom-start
   * cgv.trigger('zoom-start');
   *
   * // Triggers can also be namespaced
   * cgv.trigger('zoom-start.my_plugin');
   * ```
   *
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

//////////////////////////////////////////////////////////////////////////////

/**
 * The *Font* class stores the font internally as a CSS font string but makes it
 * easy to change individual components of the font. For example, the size can be
 * changed using the [size]{@link Font#size} method. A font consists of 3 components:
 *
 *   Component   | Description
 *   ------------|---------------
 *   *family*    | This can be a generic family (e.g. serif, sans-serif, monospace) or a specific font family (e.g. Times New Roman, Arial, or Courier)
 *   *style*     | One of *plain*, *bold*, *italic*, or *bold-italic*
 *   *size*      | The size of the font in pixels. The size will be adjusted for retina displays.
 *
 */
// See _generateFont() below for where Events is used
class Font extends Events  {
// class Font {

  /**
   * Create a new *Font*. The *Font* can be created using a string or an object representing the font.
   *
   * @param {(String|Object)} font - If a string is provided, it must have the following format:
   *   family,style,size (e.g. 'serif,plain,12'). If an object is provided, it must have a *family*,
   *   *style* and *size* property (e.g. { family: 'serif', style: 'plain', size: 12 })
   */
  constructor(font) {
    super();
    this._rawFont = font;
  }

  /**
   * Return the class name as a string.
   * @return {String} - 'Font'
   */
  toString() {
    return 'Font';
  }

  set _rawFont(font) {
    if (typeof font === 'string' || font instanceof String) {
      this.string = font;
    } else {
      const keys = Object.keys(font);
      if (keys.includes('family') && keys.includes('style') && keys.includes('size')) {
        this._family = font.family;
        this._style = font.style;
        this._size = Number(font.size);
        this._generateFont();
      } else {
        console.log('Font objects require the following keys: family, style, and size');
      }
    }
  }

  /**
   * @member {String} - Get or set the font using a simple string format: family,style,size (e.g. 'serif,plain,12').
   */
  get string() {
    return `${this.family},${this.style},${this.size}`;
  }

  set string(value) {
    value = value.replace(/ +/g, '');
    const parts = value.split(',');
    if (parts.length === 3) {
      this._family = parts[0];
      this._style = parts[1];
      this._size = Number(parts[2]);
    } else {
      console.log('Font must have 3 parts');
    }
    this._generateFont();
  }

  /**
   * @member {String} - Return the font as CSS usable string. This is also how the font is stored internally for quick access.
   */
  get css() {
    return this._font;
  }

  /**
   * Return the font as a CSS string with the size first scaled by multiplying by the *scale* factor.
   * @param {Number} scale - Scale factor.
   * @return {String} - Return the font as CSS usable string.
   * @private
   */
  cssScaled(scale) {
    if (scale && scale !== 1) {
      return `${this._styleAsCss()} ${this.size * scale}px ${this.family}`;
    } else {
      return this.css;
    }
  }


  /**
   * @member {String} - Get or set the font family. Defaults to *sans-serif*.
   */
  get family() {
    return this._family || 'sans-serif';
  }

  set family(value) {
    this._family = value;
    this._generateFont();
  }

  /**
   * @member {Number} - Get or set the font size. The size is stored as a number and is in pixels.
   * The actual value may be altered when setting it to take into account the pixel
   * ratio of the screen. Defaults to *12*.
   */
  get size() {
    // return this._size || CGV.pixel(12)
    return this._size || 12;
  }

  set size(value) {
    // this._size = CGV.pixel(Number(value));
    this._size = Number(value);
    this._generateFont();
  }

  /**
   * @member {String} - Get or set the font style. The possible values are *plain*, *bold*, *italic* and
   * *bold-italic*. Defaults to *plain*.
   */
  get style() {
    return this._style || 'plain';
  }

  set style(value) {
    this._style = value;
    this._generateFont();
  }

  /**
   * @member {Boolean} - Get or set the font boldness.
   */
  get bold() {
    return ( this.style === 'bold' || this.style === 'bold-italic');
  }

  set bold(value) {
    if (value) {
      if (this.style === 'plain') {
        this.style = 'bold';
      } else if (this.style === 'italic') {
        this.style = 'bold-italic';
      }
    } else {
      if (this.style === 'bold') {
        this.style = 'plain';
      } else if (this.style === 'bold-italic') {
        this.style = 'italic';
      }
    }
  }

  /**
   * @member {Boolean} - Get or set the font italics.
   */
  get italic() {
    return ( this.style === 'italic' || this.style === 'bold-italic');
  }

  set italic(value) {
    if (value) {
      if (this.style === 'plain') {
        this.style = 'italic';
      } else if (this.style === 'bold') {
        this.style = 'bold-italic';
      }
    } else {
      if (this.style === 'italic') {
        this.style = 'plain';
      } else if (this.style === 'bold-italic') {
        this.style = 'bold';
      }
    }
  }

  /**
   * @member {Number} - Get the font height. This will be the same as the font [size]{@link Font#size}.
   */
  get height() {
    return this.size;
  }


  /**
   * Measure the width of the supplied *text* using the *context* and the *Font* settings.
   *
   * @param {Context} context - The canvas context to use to measure the width.
   * @param {String} text - The text to measure.
   * @return {Number} - The width of the *text* in pixels.
   */
  width(ctx, text) {
    ctx.font = this.css;
    return ctx.measureText(text).width;
  }

  copy() {
    return new Font(this.string);
  }

  _styleAsCss() {
    if (this.style === 'plain') {
      return 'normal';
    } else if (this.style === 'bold') {
      return 'bold';
    } else if (this.style === 'italic') {
      return 'italic';
    } else if (this.style === 'bold-italic') {
      return 'italic bold';
    } else {
      return '';
    }
  }

  _generateFont() {
    this._font = `${this._styleAsCss()} ${this.size}px ${this.family}`;
    // Is this needed OR can we use the various update events...
    // Currently used by Annotation to update the font widths if any aspect of the font changes
    this.trigger('change', this);
  }

}

/**
 * Calculate the width of multiple *strings* using the supplied *fonts* and *context*.
 * This method minimizes the number of times the context font is changed to speed up
 * the calculations
 * @function calculateWidths
 * @memberof Font
 * @static
 * @param {Context} ctx - The context to use for measurements.
 * @param {Font[]} fonts - An array of fonts. Must be the same length as *strings*.
 * @param {String[]} strings - An array of strings. Must be the same length as *fonts*.
 * @return {Number[]} - An array of widths.
 * @private
 */
Font.calculateWidths = function(ctx, fonts, strings) {
  ctx.save();
  const widths = [];
  const map = [];

  for (let i = 0, len = fonts.length; i < len; i++) {
    map.push({
      index: i,
      font: fonts[i],
      text: strings[i]
    });
  }

  map.sort( (a, b) => {
    return a.font > b.font ? 1 : -1;
  });

  let currentFont = '';
  let font, text;
  for (let i = 0, len = map.length; i < len; i++) {
    font = map[i].font;
    text = map[i].text;
    if (font !== currentFont) {
      ctx.font = font;
      currentFont = font;
    }
    // widths[i] = ctx.measureText(text).width;
    widths[map[i].index] = ctx.measureText(text).width;
  }
  ctx.restore();
  return widths;
};

//////////////////////////////////////////////////////////////////////////////

/**
 * The Color class is meant to represent a color and opacity in a consistant manner
 * Colors are stored internally as an RGBA string (CSS/Canvas compatible) for quick access.
 * The color can be provided or generated in the following formats:
 *
 * ### String
 *
 * Type    | Example
 * --------|--------
 * RGB     | 'rgb(100, 100, 240)'
 * RGBA    | 'rgba(100, 100, 240, 0.5)'
 * HEX     | '#FF8833' or '#F83'
 * Name    | 'black' (Browser supported color names [List](http://www.w3schools.com/colors/colors_names.asp))
 * HSL     | not implemented yet
 * HSLA    | not implemented yet
 *
 *
 * ### Object
 *
 * Type    | Example
 * --------|--------
 * RGB     | {r: 100, g: 100, b: 100}
 * RGBA    | {r: 100, g: 100, b: 100, a: 0.5}
 * HSV     | {h:240, s: 50, v: 30}
 *
 * To set the color using any of the above formats, use the [setColor]{@link Color#setColor} method.
 */
class Color {

  /**
   * Create a Color using a string or object as described above.
   * @param {(String|Object)} color - A color string or object.
   */
  constructor(color) {
    this.setColor(color);
  }

  /**
   * Return the class name as a string.
   * @return {String} - 'Color'
   */
  toString() {
    return 'Color';
  }

  /**
   * Set the color using a color string (e.g RGB, RGBA, Hex, HLA) or a color object (e.g. RGB, RGBA, HSV)
   * as described above.
   * @param {(String|Object)} - A color string or object
   */
  setColor(color) {
    if (typeof color === 'string' || color instanceof String) {
      this._string = color;
    } else if (color.toString() === 'Color') {
      this._string = color.rgbaString;
    } else {
      const keys = Object.keys(color);
      if (keys.includes('h') && keys.includes('s') && keys.includes('v')) {
        this.hsv = color;
      } else if (keys.includes('r') && keys.includes('g') && keys.includes('b') && keys.includes('a')) {
        this.rgba = color;
      } else if (keys.includes('r') && keys.includes('g') && keys.includes('b')) {
        this.rgb = color;
      }
    }
  }

  /**
   * Set the color using, RGB, RGBA, Hex, etc String
   * @private
   */
  set _string(value) {
    const rgba = Color.string2rgba(value, this.opacity);
    this._rgbaString = Color.rgba2String(rgba);
    this._updateOpacityFromRgba();
  }


  /**
   * @member {Number} - Get or set the opacity (alpha) of the color.
   */
  get opacity() {
    return (this._opacity === undefined) ? 1 : this._opacity;
  }

  set opacity(value) {
    this._opacity = Color._validateOpacity(value);
    this._updateRgbaOpacity();
  }

  /**
   * @member {String} - Return the color as an RGBA string.
   */
  get rgbaString() {
    return this._rgbaString;
  }

  /**
   * @member {String} - Return the color as an RGB string.
   */
  get rgbString() {
    return Color.rgb2String(this.rgb);
  }

  /**
   * @member {Object} - Get or set the color using a RGB object.
   */
  get rgb() {
    const result = /^rgba\((\d+),(\d+),(\d+)/.exec(this.rgbaString);
    return result ? { r: Number(result[1]), g: Number(result[2]), b: Number(result[3]) } : undefined;
  }

  set rgb(value) {
    this._string = Color.rgb2String(value);
    this._updateOpacityFromRgba();
  }

  /**
   * @member {Object} - Get or set the color using a RGBA object.
   */
  get rgba() {
    const result = /^rgba\((\d+),(\d+),(\d+),([\d.]+)/.exec(this.rgbaString);
    return result ? { r: Number(result[1]), g: Number(result[2]), b: Number(result[3]), a: Number(result[4]) } : undefined;
  }

  set rgba(value) {
    this._string = Color.rgba2String(value);
    this._updateOpacityFromRgba();
  }

  /**
   * @member {Object} - Get or set the color using a HSV object.
   */
  get hsv() {
    return Color.rgb2hsv(this.rgb);
  }

  set hsv(value) {
    const rgba = Color.hsv2rgb(value);
    rgba.a = this.opacity;
    this.rgba = rgba;
  }

  /**
   * NIY
   * @private
   */
  get hex() {
  }

  /**
   * @member {Object} - Get or set the color using a HSL object.
   * @private
   */
  get hsl() {
    return Color.rgb2hsl(this.rgb);
  }

  set hsl(value) {
    const rgba = Color.hsl2rgb(value);
    rgba.a = this.opacity;
    this.rgba = rgba;
  }

  /**
   * Returns a copy of this color object
   */
  copy() {
    return new Color(this.rgbaString);
  }

  /**
   * Returns true if this color has the same value as the provided color
   * @param {Color} color - This color to compare with
   * @param {Boolean} ignoreAlpha - Should opacity be considered in the comparison
   */
  equals(color, ignoreAlpha = false) {
    const rgb1 = this.rgba;
    const rgb2 = color.rgba;
    if (ignoreAlpha) {
      return (rgb1.r === rgb2.r) && (rgb1.g === rgb2.g) && (rgb1.b === rgb2.b);
    } else {
      return (rgb1.r === rgb2.r) && (rgb1.g === rgb2.g) && (rgb1.b === rgb2.b) && (rgb1.a === rgb2.a);
    }
  }

  /**
   * Tests if this color in the provided array of colors
   * @param {Array} colors - List of colors for the comparison
   * @param {Boolean} ignoreAlpha - Should opacity be considered in the comparison
   * @private
   */
  inArray(colors, ignoreAlpha) {
    let present = false;
    for (const color of colors) {
      if (this.equals(color, ignoreAlpha)) {
        present = true;
        break;
      }
    }
    return present;
  }

  /**
   * Alters the color. Useful for highlighting.
   * @param {Number} colorAdjustment - Amount to change the color by
   * @private
   */
  highlight(colorAdjustment = 0.25) {
    const hsv = this.hsv;
    hsv.v += (hsv.v < 0.5) ? colorAdjustment : -colorAdjustment;
    this.hsv = hsv;
  }

  /**
   * Lightens the color.
   * @param {Number} fraction - Amount to lighten the color by
   * @private
   */
  lighten(fraction) {
    const hsl = this.hsl;
    hsl.l += utils.constrain(fraction, 0, 1);
    hsl.l = Math.min(hsl.l, 1);
    this.hsl = hsl;
    return this;
  }

  /**
   * Darkens the color.
   * @param {Number} fraction - Amount to darken the color by
   * @private
   */
  darken(fraction) {
    const hsl = this.hsl;
    hsl.l -= utils.constrain(fraction, 0, 1);
    hsl.l = Math.max(hsl.l, 0);
    this.hsl = hsl;
    return this;
  }

  /**
   * Inverts the color
   */
  invert() {
    const rgb = this.rgb;
    this.rgb = {
      r: 255 - rgb.r,
      g: 255 - rgb.g,
      b: 255 - rgb.b
    };
    return this;
  }


  /**
   * Update the internal RGBA String using the current opacity property.
   * @private
   */
  _updateRgbaOpacity() {
    this._rgbaString = this._rgbaString.replace(/^(rgba\(.*,)([\d.]+?)(\))/, (m, left, opacity, right) => {
      return left + this.opacity + right;
    });
  }

  /**
   * Update the the opacity property using the value in the internal RGBA string
   * @private
   */
  _updateOpacityFromRgba() {
    const result = /^rgba.*,([\d.]+?)\)$/.exec(this.rgbaString);
    if (result) {
      this._opacity = Color._validateOpacity(result[1]);
    }
  }

}

/**
 * Convert a legal color string to RGBA. See http://www.w3schools.com/cssref/css_colors_legal.asp
 * @function string2rgba
 * @memberof Color
 * @param {String} value - *value* can be a hexidecimal, HSL, RGB, RGBA, or a color name.
 * @param {Number} opacity - a number between 0 and 1.
 * @return {String} The color as an RGBA object.
 * @static
 * @private
 */
Color.string2rgba = function(value, opacity = 1) {
  if ( /^#/.test(value) ) {
    return Color.hexString2rgba(value, opacity);
  } else if ( /^rgb\(/.test(value) ) {
    return Color.rgbString2rgba(value, opacity);
  } else if ( /^rgba\(/.test(value) ) {
    return Color.rgbaString2rgba(value, opacity);
  } else if ( /^hsl\(/.test(value) ) {
    return Color.hslStringToRgba(value, opacity);
  } else {
    const hex = Color.name2HexString(value);
    return Color.hexString2rgba(hex, opacity);
  }
};

/**
 * Validate that the opacity is between 0 and 1.
 * @private
 */
Color._validateOpacity = function(value) {
  value = Number(value);
  if (isNaN(value)) {
    value = 1;
  } else if (value > 1) {
    value = 1;
  } else if (value < 0) {
    value = 0;
  }
  return value;
};

/**
 * Validate that the RGBA color components are between 0 and 255. Also validate the opacity.
 * @private
 */
Color._validateRgba = function(value) {
  return {
    r: Color._validateRgbNumber(value.r),
    g: Color._validateRgbNumber(value.g),
    b: Color._validateRgbNumber(value.b),
    a: Color._validateOpacity(value.a)
  };
};

/**
 * Validate that the number is between 0 and 255.
 * @private
 */
Color._validateRgbNumber = function(value) {
  value = Number(value);
  if (isNaN(value)) {
    value = 0;
  } else if (value > 255) {
    value = 255;
  } else if (value < 0) {
    value =  0;
  }
  return value;
};

/**
 * Convert an RGB string to an RGBA object
 * @function rgbString2rgba
 * @memberof Color
 * @param {String} rgbString - *rgbString* should take the form of 'rgb(red,green,blue)', where red, green and blue are numbers between 0 and 255.
 * @param {Number} opacity - a number between 0 and 1.
 * @return {String} The color as an RGBA object.
 * @static
 * @private
 */
Color.rgbString2rgba = function(rgbString, opacity = 1) {
  rgbString = rgbString.replace(/ +/g, '');
  const result = /^rgb\((\d+),(\d+),(\d+)\)/.exec(rgbString);
  return result ? { r: Number(result[1]), g: Number(result[2]), b: Number(result[3]), a: opacity } : undefined;
};

/**
 * Convert an RGBA String color to RGBA.
 * @function rgbString2rgba
 * @memberof Color
 * @param {String} rgbaString - *rgbaString* should take the form of 'rgb(red,green,blue, alpha)', where red, green and blue are numbers between 0 and 255.
 * @return {String} The color as RGBA.
 * @static
 * @private
 */
Color.rgbaString2rgba = function(rgbaString) {
  rgbaString = rgbaString.replace(/ +/g, '');
  const result = /^rgba\((\d+),(\d+),(\d+),([\d.]+)\)/.exec(rgbaString);
  return result ? { r: Number(result[1]), g: Number(result[2]), b: Number(result[3]), a: Number(result[4]) } : undefined;
};

/**
 * Convert an HSL color to RGBA.
 * @function hslToRgba
 * @memberof Color
 * @param {String} hsl - *hsl*  NOT Implemented yet
 * @param {Number} opacity - a number between 0 and 1.
 * @return {String} The color as RGBA.
 * @static
 * @private
 */
Color.hslStringToRgba = function(hsl) {
  console.log('NOT IMPLEMENTED');
};

/**
 * Convert a RGB object to an HSV object.
 * r, g, b can be either in <0,1> range or <0,255> range.
 * Credits to http://www.raphaeljs.com
 * @private
 */
Color.rgb2hsv = function(rgb) {
  let r = rgb.r;
  let g = rgb.g;
  let b = rgb.b;

  if (r > 1 || g > 1 || b > 1) {
    r /= 255;
    g /= 255;
    b /= 255;
  }

  let H, S, V, C;
  V = Math.max(r, g, b);
  C = V - Math.min(r, g, b);
  H = (C === 0 ? null :
    V === r ? (g - b) / C + (g < b ? 6 : 0) :
      V === g ? (b - r) / C + 2 :
        (r - g) / C + 4);
  H = (H % 6) * 60;
  S = C === 0 ? 0 : C / V;
  return { h: H, s: S, v: V };
};

/**
 * Convert an HSV object to RGB HEX string.
 * Credits to http://www.raphaeljs.com
 * @private
 */
Color.hsv2rgb = function(hsv) {
  let R, G, B, X, C;
  let h = (hsv.h % 360) / 60;

  C = hsv.v * hsv.s;
  X = C * (1 - Math.abs(h % 2 - 1));
  R = G = B = hsv.v - C;

  h = ~~h;
  R += [C, X, 0, 0, X, C][h];
  G += [X, C, C, X, 0, 0][h];
  B += [0, 0, X, C, C, X][h];

  const r = Math.floor(R * 255);
  const g = Math.floor(G * 255);
  const b = Math.floor(B * 255);
  return { r: r, g: g, b: b };
};

/**
 * Convert a Hexidecimal color string to an RGBA object.
 * Credited to http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
 * @function hex2rgba
 * @memberof Color
 * @param {String} hex - *hex* can be shorthand (e.g. "03F") or fullform (e.g. "0033FF"), with or without the starting '#'.
 * @param {Number} opacity - a number between 0 and 1.
 * @return {String} The color as an RGBA object.
 * @static
 * @private
 */
Color.hexString2rgba = function(hex, opacity = 1) {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, function(m, r, g, b) {
    return r + r + g + g + b + b;
  });
  // Defaults:
  let red = 0;
  let green = 0;
  let blue = 0;
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    red = parseInt(result[1], 16);
    green = parseInt(result[2], 16);
    blue = parseInt(result[3], 16);
  }
  return { r: red, g: green, b: blue, a: opacity };
};

/**
 * Credited: https://gist.github.com/mjackson/5311256
 * Converts an RGB color value to HSL. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns h, s, and l in the set [0, 1].
 *
 * @param   Number  r       The red color value
 * @param   Number  g       The green color value
 * @param   Number  b       The blue color value
 * @return  Array           The HSL representation
 * @private
 */
Color.rgb2hsl = function(rgb) {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
    case r: h = (g - b) / d + (g < b ? 6 : 0); break;
    case g: h = (b - r) / d + 2; break;
    case b: h = (r - g) / d + 4; break;
    }

    h /= 6;
  }

  // return [ h, s, l ];
  return { h: h, s: s, l: l };
};

/**
 * Credited: https://gist.github.com/mjackson/5311256
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 * @param   Number  h       The hue
 * @param   Number  s       The saturation
 * @param   Number  l       The lightness
 * @return  Array           The RGB representation
 * @private
 */
Color.hsl2rgb = function(hsl) {
  const h = hsl.h;
  const s = hsl.s;
  const l = hsl.l;
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    function hue2rgb(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  r = Math.floor(r * 255);
  g = Math.floor(g * 255);
  b = Math.floor(b * 255);

  return { r: r, g: g, b: b };
};

/**
 * Convert a RGBA object to a RGBA string
 * @function rgba2String
 * @memberof Color
 * @param {Object} rgba - RGBA object
 * @return {String} - RGBA String
 * @static
 * @private
 */
Color.rgba2String = function(rgba) {
  rgba = Color._validateRgba(rgba);
  return `rgba(${rgba.r},${rgba.g},${rgba.b},${rgba.a})`;
};

/**
 * Convert a RGB object to a RGB string
 * @function rgb2String
 * @memberof Color
 * @param {Object} rgb - RGB object
 * @return {String} - RGB String
 * @static
 * @private
 */
Color.rgb2String = function(rgb) {
  return `rgb(${rgb.r},${rgb.g},${rgb.b})`;
};


/**
 * Convert a named color to RGBA.
 * @function name2HexString
 * @memberof Color
 * @param {String} name - *name* should be one of the ~150 browser supported color names [List](http://www.w3schools.com/colors/colors_names.asp))
 * @return {String} The color as a Hex string.
 * @static
 * @private
 */
Color.name2HexString = function(name) {
  name = name.toLowerCase();
  const hex = Color.names()[name];
  if (hex) {
    return hex;
  } else {
    console.log('Name not found! Defaulting to Black');
    return '#000000';
  }
};


/**
 * Returns a color with RGB values centered around *center* and upto *width* away from the center.
 * If *notColors* is provided, the method makes sure not to return one of those colors.
 * Internally getColor creates an array of colors double the size of *notColors* plus 1 and then checks
 * the color from array starting at the index of *notColors* length (ie if *colors* is an array of 4,
 * the methods creates an array of 9 colors and starts at color number 5). This prevents always returning
 * the first few colors, if they are being changed by the user.
 * @private
 */
Color.getColor = function(notColors = [], center = 128, width = 127, alpha = 1) {
  const colors = [];
  const len = (notColors.length * 2) + 1;
  const freq1  = 2.4;
  const freq2  = 2.4;
  const freq3  = 2.4;
  const phase1 = 0;
  const phase2 = 2;
  const phase3 = 4;
  // Generate Colors
  for (let i = 0; i < len; ++i) {
    const red   = Math.round(Math.sin(freq1 * i + phase1) * width + center);
    const green = Math.round(Math.sin(freq2 * i + phase2) * width + center);
    const blue  = Math.round(Math.sin(freq3 * i + phase3) * width + center);
    colors.push(new Color(`rgba(${red}, ${green}, ${blue}, ${alpha})`));
  }
  // Check that is color has not been used before
  let colorIndex = notColors.length;
  if (colorIndex > 0) {
    for (; colorIndex < colors.length; colorIndex++) {
      const color = colors[colorIndex];
      if (!color.inArray(notColors)) {
        break;
      }
    }
  }
  return colors[colorIndex];
};

/**
 * Return a object of color names and their HEX values
 */
Color.names = function() {
  return {
    aliceblue: '#f0f8ff',
    antiquewhite: '#faebd7',
    aqua: '#00ffff',
    aquamarine: '#7fffd4',
    azure: '#f0ffff',
    beige: '#f5f5dc',
    bisque: '#ffe4c4',
    black: '#000000',
    blanchedalmond: '#ffebcd',
    blue: '#0000ff',
    blueviolet: '#8a2be2',
    brown: '#a52a2a',
    burlywood: '#deb887',
    cadetblue: '#5f9ea0',
    chartreuse: '#7fff00',
    chocolate: '#d2691e',
    coral: '#ff7f50',
    cornflowerblue: '#6495ed',
    cornsilk: '#fff8dc',
    crimson: '#dc143c',
    cyan: '#00ffff',
    darkblue: '#00008b',
    darkcyan: '#008b8b',
    darkgoldenrod: '#b8860b',
    darkgray: '#a9a9a9',
    darkgrey: '#a9a9a9',
    darkgreen: '#006400',
    darkkhaki: '#bdb76b',
    darkmagenta: '#8b008b',
    darkolivegreen: '#556b2f',
    darkorange: '#ff8c00',
    darkorchid: '#9932cc',
    darkred: '#8b0000',
    darksalmon: '#e9967a',
    darkseagreen: '#8fbc8f',
    darkslateblue: '#483d8b',
    darkslategray: '#2f4f4f',
    darkslategrey: '#2f4f4f',
    darkturquoise: '#00ced1',
    darkviolet: '#9400d3',
    deeppink: '#ff1493',
    deepskyblue: '#00bfff',
    dimgray: '#696969',
    dimgrey: '#696969',
    dodgerblue: '#1e90ff',
    firebrick: '#b22222',
    floralwhite: '#fffaf0',
    forestgreen: '#228b22',
    fuchsia: '#ff00ff',
    gainsboro: '#dcdcdc',
    ghostwhite: '#f8f8ff',
    gold: '#ffd700',
    goldenrod: '#daa520',
    gray: '#808080',
    grey: '#808080',
    green: '#008000',
    greenyellow: '#adff2f',
    honeydew: '#f0fff0',
    hotpink: '#ff69b4',
    indianred: '#cd5c5c',
    indigo: '#4b0082',
    ivory: '#fffff0',
    khaki: '#f0e68c',
    lavender: '#e6e6fa',
    lavenderblush: '#fff0f5',
    lawngreen: '#7cfc00',
    lemonchiffon: '#fffacd',
    lightblue: '#add8e6',
    lightcoral: '#f08080',
    lightcyan: '#e0ffff',
    lightgoldenrodyellow: '#fafad2',
    lightgray: '#d3d3d3',
    lightgrey: '#d3d3d3',
    lightgreen: '#90ee90',
    lightpink: '#ffb6c1',
    lightsalmon: '#ffa07a',
    lightseagreen: '#20b2aa',
    lightskyblue: '#87cefa',
    lightslategray: '#778899',
    lightslategrey: '#778899',
    lightsteelblue: '#b0c4de',
    lightyellow: '#ffffe0',
    lime: '#00ff00',
    limegreen: '#32cd32',
    linen: '#faf0e6',
    magenta: '#ff00ff',
    maroon: '#800000',
    mediumaquamarine: '#66cdaa',
    mediumblue: '#0000cd',
    mediumorchid: '#ba55d3',
    mediumpurple: '#9370db',
    mediumseagreen: '#3cb371',
    mediumslateblue: '#7b68ee',
    mediumspringgreen: '#00fa9a',
    mediumturquoise: '#48d1cc',
    mediumvioletred: '#c71585',
    midnightblue: '#191970',
    mintcream: '#f5fffa',
    mistyrose: '#ffe4e1',
    moccasin: '#ffe4b5',
    navajowhite: '#ffdead',
    navy: '#000080',
    oldlace: '#fdf5e6',
    olive: '#808000',
    olivedrab: '#6b8e23',
    orange: '#ffa500',
    orangered: '#ff4500',
    orchid: '#da70d6',
    palegoldenrod: '#eee8aa',
    palegreen: '#98fb98',
    paleturquoise: '#afeeee',
    palevioletred: '#db7093',
    papayawhip: '#ffefd5',
    peachpuff: '#ffdab9',
    peru: '#cd853f',
    pink: '#ffc0cb',
    plum: '#dda0dd',
    powderblue: '#b0e0e6',
    purple: '#800080',
    rebeccapurple: '#663399',
    red: '#ff0000',
    rosybrown: '#bc8f8f',
    royalblue: '#4169e1',
    saddlebrown: '#8b4513',
    salmon: '#fa8072',
    sandybrown: '#f4a460',
    seagreen: '#2e8b57',
    seashell: '#fff5ee',
    sienna: '#a0522d',
    silver: '#c0c0c0',
    skyblue: '#87ceeb',
    slateblue: '#6a5acd',
    slategray: '#708090',
    slategrey: '#708090',
    snow: '#fffafa',
    springgreen: '#00ff7f',
    steelblue: '#4682b4',
    tan: '#d2b48c',
    teal: '#008080',
    thistle: '#d8bfd8',
    tomato: '#ff6347',
    turquoise: '#40e0d0',
    violet: '#ee82ee',
    wheat: '#f5deb3',
    white: '#ffffff',
    whitesmoke: '#f5f5f5',
    yellow: '#ffff00',
    yellowgreen: '#9acd32'
  };
};

//////////////////////////////////////////////////////////////////////////////
// NCList
//////////////////////////////////////////////////////////////////////////////

/**
 * The NCList is a container for intervals that allows fast searching of overlaping regions.
 *
 * - Nested Containment List (NCList): A new algorithm for accelerating
 * - interval query of genome alignment and interval databases.
 * - Alekseyenko, A., and Lee, C. (2007).
 * - Bioinformatics, doi:10.1093/bioinformatics/btl647
 * - https://academic.oup.com/bioinformatics/article/23/11/1386/199545/Nested-Containment-List-NCList-a-new-algorithm-for
 * - Code adapted from
 *   https://searchcode.com/codesearch/view/17093141
 */
class NCList {

  /**
   * Each interval should have a start and stop property.
   * @param {Array} intervals - Array of Intervals used to create the NCList.
   * @param {Object} options -
   * @return {NCList}
   * @private
   */
  constructor(intervals = [], options = {}) {
    this.intervals = [];
    this.circularLength = options.circularLength;
    this.startProperty = options.startProperty || 'start';
    this.stopProperty = options.stopProperty || 'stop';
    this.fill(intervals);
  }

  /**
   * @member {Number} - The number of intervals in the NCList
   */
  get length() {
    return this._length;
  }


  /**
   * Splits intervals that span the Origin of cicular sequences
   */
  _normalize(intervals) {
    let interval;
    const nomalizedIntervals = [];
    for (let i = 0, len = intervals.length; i < len; i++) {
      interval = intervals[i];
      // if (interval.start <= interval.stop) {
      if (interval[this.startProperty] <= interval[this.stopProperty]) {
        nomalizedIntervals.push( {interval: interval, index: i});
      } else {
        nomalizedIntervals.push({
          interval: interval,
          index: i,
          // start: interval.start,
          // start: this.start(interval),
          // stop: this.circularLength,
          [this.startProperty]: this.start(interval),
          [this.stopProperty]: this.circularLength,
          crossesOrigin: true
        });
        nomalizedIntervals.push({
          interval: interval,
          index: i,
          // start: 1,
          // stop: this.end(interval),
          [this.startProperty]: 1,
          [this.stopProperty]: this.end(interval),
          crossesOrigin: true
        });
      }
    }
    return nomalizedIntervals;
  }

  /**
   * Fils the NCList with the given intervals
   * @param {Array} intervals - Array of intervals
   */
  fill(intervals) {
    this._length = intervals.length;
    if (intervals.length === 0) {
      this.topList = [];
      return;
    }
    // const start = this.start;
    // const end = this.end;
    const sublist = this.sublist;

    intervals = this._normalize(intervals);
    this.intervals = intervals;

    // Sort by overlap
    // intervals.sort(function(a, b) {
    intervals.sort( (a, b) => {
      if (this.start(a) !== this.start(b)) return this.start(a) - this.start(b);
      else return this.end(b) - this.end(a);
    });
    const sublistStack = [];
    let curList = [];
    this.topList = curList;
    curList.push(intervals[0]);
    if (intervals.length === 1) return;
    let curInterval, topSublist;
    for (let i = 1, len = intervals.length; i < len; i++) {
      curInterval = intervals[i];
      // if this interval is contained in the previous interval,
      if (this.end(curInterval) < this.end(intervals[i - 1])) {
        // create a new sublist starting with this interval
        sublistStack.push(curList);
        curList = new Array(curInterval);
        sublist(intervals[i - 1], curList);
      } else {
        // find the right sublist for this interval
        while (true) {
          if (0 === sublistStack.length) {
            curList.push(curInterval);
            break;
          } else {
            topSublist = sublistStack[sublistStack.length - 1];
            if (this.end(topSublist[topSublist.length - 1])
                        > this.end(curInterval)) {
              // curList is the first (deepest) sublist that
              // curInterval fits into
              curList.push(curInterval);
              break;
            } else {
              curList = sublistStack.pop();
            }
          }
        }
      }
    }
  }

  /**
   * Method to retrieve the stop coordinate of the interval
   */
  end(interval) {
    // return interval.stop || interval.interval.stop;
    // return interval.stop || interval.interval[this.stopProperty];
    return interval[this.stopProperty] || interval.interval[this.stopProperty];
  }

  /**
   * Method to retrieve the start coordinate of the interval
   */
  start(interval) {
    // return interval.start || interval.interval.start;
    // return interval.start || interval.interval[this.startProperty];
    return interval[this.startProperty] || interval.interval[this.startProperty];
  }

  /**
   * Method to set the sublist for the given interval.
   */
  sublist(interval, list) {
    interval.sublist = list;
  }

  _run(start, stop = start, step = 1, callback = function() {}, list = this.topList) {
    let skip;
    const len = list.length;
    let i, direction;
    if (step > 0) {
      direction = 1;
      i = this._binarySearch(list, start, true, 'end');
    } else if (step < 0) {
      direction = -1;
      i = this._binarySearch(list, stop, false, 'start');
    }
    while (i >= 0 && i < len &&
      ( (direction === 1) ? (this.start(list[i]) <= stop) : (this.end(list[i]) >= start) ) ) {
      skip = false;
      if (list[i].crossesOrigin) {
        if (this._runIntervalsCrossingOrigin.indexOf(list[i].interval) !== -1) {
          skip = true;
        } else {
          this._runIntervalsCrossingOrigin.push(list[i].interval);
        }
      }

      if (!skip && list[i].index % step === 0) {
        callback.call(list[i].interval, list[i].interval);
      }
      if (list[i].sublist) {
        this._run(start, stop, step, callback, list[i].sublist);
      }
      i += direction;
    }
  }

  /*
   * Run the callback for each interval that overlaps with the given range.
   * @param {Number} start - Start position of the range
   * @param {Number} stop - Stop position of the range [Default: same as start]
   * @param {Number} step - Skip intervals by increasing the step [Default: 1]
   */
  run(start, stop = start, step = 1, callback = function() {}) {
    this._runIntervalsCrossingOrigin = [];
    if (this.circularLength && stop < start) {
      this._run(start, this.circularLength, step,  callback);
      this._run(1, stop, step,  callback);
    } else {
      this._run(start, stop, step, callback);
    }
  }

  /*
   * Count the number of intervals that overlaps with the given range.
   * @param {Number} start - Start position of the range
   * @param {Number} stop - Stop position of the range [Default: same as start]
   * @param {Number} step - Skip intervals by increasing the step [Default: 1]
   * @return {Number}
   */
  count(start, stop, step) {
    let count = 0;
    this.run(start, stop, step, () => {
      count++;
    });
    return count;
  }

  /*
   * Return intervals that overlaps with the given range.
   * @param {Number} start - Start position of the range
   * @param {Number} stop - Stop position of the range [Default: same as start]
   * @param {Number} step - Skip intervals by increasing the step [Default: 1]
   * @return {Array}
   */
  find(start, stop, step) {
    const overlaps = [];
    this.run(start, stop, step, (i) => {
      overlaps.push(i);
    });
    return overlaps;
  }


  _binarySearch(data, searchValue, upper, getter) {
    let minIndex = -1;
    let maxIndex = data.length;
    let currentIndex, currentValue;

    while (maxIndex - minIndex > 1) {
      currentIndex = (minIndex + maxIndex) / 2 | 0;
      currentValue = this[getter](data[currentIndex]);
      if (currentValue < searchValue) {
        minIndex = currentIndex;
      } else if (currentValue > searchValue) {
        maxIndex = currentIndex;
      } else {
        return currentIndex;
      }
    }
    return (upper ? maxIndex : minIndex);
  }


  /*
   * Test that the correct intervals are returned especially for circular sequences
   */
  static test() {
    function testInterval(nc, start, stop, expected) {
      const result = nc.find(start, stop).map( n => n.name ).sort().join(', ');
      expected = expected.sort().join(', ');
      let testOut = `${start}..${stop}: ${expected} - `;
      testOut += (result === expected) ? 'Pass' : `${'FAIL' + ' - '}${result}`;
      console.log(testOut);
    }

    const intervals = [
      {name: 'A', start: 1, stop: 20},
      {name: 'B', start: 10, stop: 15},
      {name: 'C', start: 10, stop: 20},
      {name: 'D', start: 15, stop: 30},
      {name: 'E', start: 20, stop: 30},
      {name: 'F', start: 20, stop: 50},
      {name: 'G', start: 80, stop: 100},
      {name: 'H', start: 90, stop: 95},
      {name: 'I', start: 90, stop: 5},
      {name: 'J', start: 95, stop: 15},
      {name: 'K', start: 95, stop: 2},
      {name: 'L', start: 92, stop: 50}
    ];
    const nc = new NCList(intervals, { circularLength: 100 });

    testInterval(nc, 10, 20, ['A', 'B', 'C', 'D', 'E', 'F', 'J', 'L']);
    testInterval(nc, 40, 85, ['F', 'G', 'L']);
    testInterval(nc, 40, 95, ['F', 'G', 'H', 'I', 'J', 'K', 'L']);
    testInterval(nc, 95, 10, ['A', 'B', 'C', 'G', 'H', 'I', 'J', 'K', 'L']);

    return nc;
  }

  static testMapStarts() {
    function testInterval(nc, start, stop, expected) {
      const result = nc.find(start, stop).map( n => n.name ).sort().join(', ');
      expected = expected.sort().join(', ');
      let testOut = `${start}..${stop}: ${expected} - `;
      testOut += (result === expected) ? 'Pass' : `${'FAIL' + ' - '}${result}`;
      console.log(testOut);
    }

    const intervals = [
      {name: 'A', mapStart: 10, mapStop: 10},
      {name: 'B', mapStart: 20, mapStop: 21},
      {name: 'C', mapStart: 950, mapStop: 5},
    ];
    // const nc = new NCList(intervals, { circularLength: 1000 });
    const nc = new NCList(intervals, { circularLength: 1000, startProperty: 'mapStart', stopProperty: 'mapStop'});

    testInterval(nc, 900, 200, ['A', 'B', 'C']);

    return nc;
  }
  static testMapStarts2() {
    function testInterval(nc, start, stop, expected) {
      const result = nc.find(start, stop).map( n => n.name ).sort().join(', ');
      expected = expected.sort().join(', ');
      let testOut = `${start}..${stop}: ${expected} - `;
      testOut += (result === expected) ? 'Pass' : `${'FAIL' + ' - '}${result}`;
      console.log(testOut);
    }

    const intervals = [
      {name: 'A', start: 10, stop: 10},
      {name: 'B', start: 20, stop: 21},
      {name: 'C', start: 950, stop: 5},
    ];
    // const nc = new NCList(intervals, { circularLength: 1000 });
    const nc = new NCList(intervals, { circularLength: 1000, startProperty: 'start', stopProperty: 'stop'});

    testInterval(nc, 900, 200, ['A', 'B', 'C']);

    return nc;
  }

}

//////////////////////////////////////////////////////////////////////////////

/**
 * Annotation controls the drawing and layout of features labels
 *
 * ### Action and Events
 *
 * Action                                    | Viewer Method                        | Annotation Method   | Event
 * ------------------------------------------|--------------------------------------|---------------------|-----
 * [Update](../docs.html#s.updating-records) | -                                    | [update()](#update) | annotation-update
 * [Read](../docs.html#s.reading-records)    | [annotation](Viewer.html#annotation) | -                   | -
 *
 * <a name="attributes"></a>
 * ### Attributes
 *
 * Attribute                        | Type      | Description
 * ---------------------------------|-----------|------------
 * [font](#font)                    | String    | A string describing the font [Default: 'monospace, plain, 12']. See {@link Font} for details.
 * [color](#color)                  | String   | A string describing the color [Default: undefined]. If the color is undefined, the legend color for the feature will be used. See {@link Color} for details.
 * [onlyDrawFavorites](#onlyDrawFavorites) | Boolean   | Only draw labels for features that are favorited [Default: false]
 * [visible](CGObject.html#visible) | Boolean   | Labels are visible [Default: true]
 * [meta](CGObject.html#meta)       | Object    | [Meta data](tutorial-meta.html) for Annotation
 *
 * ### Examples
 * ```js
 * // Only draw labels for features that have been marked as a favorite
 * cgv.annotation.update({
 *   onlyDrawFavorites: true
 * });
 *
 * // Changing the label placement from the default to angled (for both fast and full draw)
 * cgv.annotation.labelPlacement = 'angled'
 *
 * // Changing the label placement so that fast draw uses the default labels and full draw uses the angled labels
 * cgv.annotation.labelPlacementFast = 'default'
 * cgv.annotation.labelPlacementFull = 'angled'
 * ```
 *
 * @extends CGObject
 */
class Annotation extends CGObject {

  /**
   * Create the annotation.
   * @param {Viewer} viewer - The viewer
   * @param {Object} options - [Attributes](#attributes) used to create the annotation
   * @param {Object} [meta] - User-defined [Meta data](../tutorials/details-meta-data.html) to add to the annotation.
   */
  constructor(viewer, options = {}, meta = {}) {
    super(viewer, options, meta);
    this._labels = new CGArray();
    this.font = utils.defaultFor(options.font, 'monospace, plain, 12');
    this.labelLineLength = utils.defaultFor(options.labelLineLength, 20);
    this.priorityMax = utils.defaultFor(options.priorityMax, 50);
    this._labelLineMarginInner = 10;
    this._labelLineMarginOuter = 5; // NOT REALLY IMPLEMENTED YET
    this._labelLineWidth = 1;
    this.refresh();
    this._visibleLabels = new CGArray();
    this.color = options.color;
    this.lineCap = 'round';
    this.onlyDrawFavorites = utils.defaultFor(options.onlyDrawFavorites, false);

    this.labelPlacement = 'default';
    // this.labelPlacementFast = 'default';
    // this.labelPlacementFull = 'angled'

    this.viewer.trigger('annotation-update', { attributes: this.toJSON({includeDefaults: true}) });

    // this._debug = true;
  }

  /**
   * Return the class name as a string.
   * @return {String} - 'Annotation'
   */
  toString() {
    return 'Annotation';
  }

  /**
   * @member {Color} - Get or set the label color. When setting the color, a
   * string representing the color or a {@link Color} object can be used. For
   * details see {@link Color}.
   */
  get color() {
    return this._color;
  }

  set color(value) {
    if (value === undefined || value.toString() === 'Color') {
      this._color = value;
    } else {
      this._color = new Color(value);
    }
  }

  /**
   * @member {Number} - Get or set the label line length.
   */
  get labelLineLength() {
    return this._labelLineLength;
  }

  set labelLineLength(value) {
    this._labelLineLength = value;
  }

  /**
   * @member {Number} - Get or set the number of priority labels that will be
   * drawn for sure. If they overlap the label will be moved until they no
   * longer overlap. Priority is defined as features that are marked as a
   * "favorite". After favorites, features are sorted by size. For example, if
   * priorityMax is 50 and there are 10 "favorite" features. The favorites will
   * be drawn and then the 40 largest features will be drawn.
   */
  get priorityMax() {
    return this._priorityMax;
  }

  set priorityMax(value) {
    this._priorityMax = value;
  }

  /**
   * @member {Font} - Get or set the font. When setting the font, a string
   * representing the font or a {@link Font} object can be used. For details
   * see {@link Font}.
   */
  get font() {
    return this._font;
  }

  set font(value) {
    if (value.toString() === 'Font') {
      this._font = value;
    } else {
      this._font = new Font(value);
    }
    this.refreshLabelWidths();
    // FIXME: can we use update to do this??
    this._font.on('change', () => this.refreshLabelWidths());
  }

  /**
   * @member {Number} - The number of labels in the set.
   */
  get length() {
    return this._labels.length;
  }

  /**
   * @member {LabelPlacement} - Set the label placement instance for both fast and full drawing.
   * Value can be one of the following: 'default', 'angled', or a custom LabelPlacement class.
   */
  set labelPlacement(value) {
    const labelPlacement = this._initialializeLabelPlacement(value);
    this._labelPlacementFast = labelPlacement;
    this._labelPlacementFull = labelPlacement;
  }

  /**
   * @member {LabelPlacement} - Get or set the label placement instance for fast drawing.
   * Values for setting can be one of the following: 'default', 'angled', or a custom LabelPlacement class.
   */
  get labelPlacementFast() {
    return this._labelPlacementFast;
  }

  set labelPlacementFast(value) {
    this._labelPlacementFast = this._initialializeLabelPlacement(value);
  }

  /**
   * @member {LabelPlacement} - Get or set the label placement instance for full drawing.
   * Values for setting can be one of the following: 'default', 'angled', or a custom LabelPlacement class.
   */
  get labelPlacementFull() {
    return this._labelPlacementFull;
  }

  set labelPlacementFull(value) {
    this._labelPlacementFull = this._initialializeLabelPlacement(value);
  }

  _initialializeLabelPlacement(nameOrClass) {
    if (typeof nameOrClass === 'string') {
      switch (nameOrClass) {
        case 'default': return new LabelPlacementDefault(this);
        case 'angled': return new LabelPlacementAngled(this);
        default: throw new Error(`Label Placement name '${nameOrClass}' unknown. Use one of 'default', 'angled'`);
      }
    } else {
      // Use provided custom LabelPlacement class
      // TODO: document making custom class and perhaps checking here that required methods are available in provided class
      return new nameOrClass(this);
    }
  }

  /**
   * Returns an [CGArray](CGArray.html) of Labels or a single Label.
   * @param {Integer|String|Array} term - See [CGArray.get](CGArray.html#get) for details.
   * @return {CGArray}
   */
  labels(term) {
    return this._labels.get(term);
  }

  /**
   * Add a new label to the set.
   * @param {Label} label - The Label to add to the set.
   */
  addLabel(label) {
    this._labels.push(label);
  }

  /**
   * Remove a label or an array of labels from the set.
   * @param {Label|Array} labels - The Label(s) to remove from the set.
   */
  removeLabels(labels) {
    labels = (labels.toString() === 'CGArray') ? labels : new CGArray(labels);
    this._labels = this._labels.filter( i => !labels.includes(i) );
    this.refresh();
  }

  // Called from Viewer.add/removeFeatures() and Sequence.updateContigs(), Viewer.updateFeatures(), Viewer.updateTracks()
  refresh() {
    // Remove labels that are on invisible contigs
    // const labels = this._labels.filter( (l) => l.feature.contig.visible);

    // Remove labels:
    // - on invisible features
    // - with features on invisible contigs
    // - with features on invisible tracks
    const labels = this._labels.filter( (l) => l.feature.visible && l.feature.contig.visible && l.feature.tracks().some( (t) => t.visible ));

    this._availableLabels = labels;
    // Update default Bp for labels
    for (const label of labels) {
      label.bpDefault = label.feature.mapRange.middle;
    }
    this._labelsNCList = new NCList(labels, { circularLength: this.sequence.length, startProperty: 'mapStart', stopProperty: 'mapStop'});
  }

  refreshLabelWidths() {
    const labelFonts = this._labels.map( i => i.font.css );
    const labelTexts = this._labels.map( i => i.name );
    const labelWidths = Font.calculateWidths(this.canvas.context('map'), labelFonts, labelTexts);
    for (let i = 0, len = this._labels.length; i < len; i++) {
      this._labels[i].width = labelWidths[i];
    }
  }

  // Determine basepair position for each label.
  // This will just be the center of the feature,
  // unless the the whole feature is not visible.
  _calculatePositions(labels) {
    labels = labels || this._labels;
    const visibleRange = this._visibleRange;
    let label, feature, containsStart, containsStop;
    let featureLengthDownStream, featureLengthUpStream;
    const sequence = this.sequence;
    for (let i = 0, len = labels.length; i < len; i++) {
      label = labels[i];
      feature = label.feature;
      containsStart = visibleRange.containsMapBp(feature.mapStart);
      containsStop = visibleRange.containsMapBp(feature.mapStop);
      if (containsStart && containsStop) {
        label.bp = label.bpDefault;
        label.lineAttachment = label.lineAttachmentDefault;
        // console.log(label.lineAttachment)
      } else {
        if (containsStart) {
          label.bp = feature.mapRange.getStartPlus( sequence.lengthOfRange(feature.mapStart, visibleRange.stop) / 2 );
        } else if (containsStop) {
          label.bp = feature.mapRange.getStopPlus( -sequence.lengthOfRange(visibleRange.start, feature.mapStop) / 2 );
        } else {
          featureLengthDownStream = sequence.lengthOfRange(visibleRange.stop, feature.mapStop);
          featureLengthUpStream = sequence.lengthOfRange(feature.mapStart, visibleRange.start);
          const halfVisibleRangeLength = visibleRange.length / 2;
          const center = visibleRange.start + halfVisibleRangeLength;
          if (featureLengthUpStream > featureLengthDownStream) {
            label.bp = center + (halfVisibleRangeLength * featureLengthDownStream / (featureLengthDownStream + featureLengthUpStream));
          } else {
            label.bp = center + (halfVisibleRangeLength * featureLengthUpStream / (featureLengthDownStream + featureLengthUpStream));
          }
        }
        // Calculate where the label line should attach to Label.
        // The attachemnt point should be the opposite clock position of the feature.
        // This might need to be recalculated of the label has moved alot
        label.lineAttachment = this.viewer.layout.clockPositionForBp(label.bp, true);
      }
    }
  }

  // Calculates non overlapping rects for priority labels
  // ORIGINAL (Fast)
  _calculatePriorityLabelRectsFast(labels) {
    labels = labels || this._labels;
    const canvas = this.canvas;
    let label, bp, lineLength, overlappingRect;
    const centerOffset = this._outerCenterOffset + this._labelLineMarginInner;
    const placedRects = new CGArray();
    for (let i = 0, len = labels.length; i < len; i++) {
      label = labels[i];
      bp = label.bp;
      lineLength = this.labelLineLength;
      do {
        const outerPt = canvas.pointForBp(bp, centerOffset + lineLength + this._labelLineMarginOuter);
        const rectOrigin = utils.rectOriginForAttachementPoint(outerPt, label.lineAttachment, label.width, label.height);
        label.rect = new Rect(rectOrigin.x, rectOrigin.y, label.width, label.height);
        overlappingRect = label.rect.overlap(placedRects);
        lineLength += label.height;
      } while (overlappingRect);
      placedRects.push(label.rect);
      label.attachementPt = label.rect.ptForClockPosition(label.lineAttachment);
    }
  }

  _calculatePriorityLabelRects(labels) {
    const labelLimit = 20;
    if (!this._fastDraw || labels.length < labelLimit) {
      this.labelPlacementFull.placeLabels(labels, this._outerCenterOffset);
    } else {
      this.labelPlacementFast.placeLabels(labels, this._outerCenterOffset);
    }
  }


  // Should be called when
  //  - Labels are added or removed
  //  - Font changes (Annotation or individual label)
  //  - Label name changes
  //  - Zoom level changes
  _calculateLabelRects(labels) {
    labels = labels || this._labels;
    const canvas = this.canvas;
    let label, bp;
    const centerOffset = this._outerCenterOffset + this._labelLineMarginInner;
    for (let i = 0, len = labels.length; i < len; i++) {
      label = labels[i];
      bp = label.bp;
      // let innerPt = canvas.pointForBp(bp, centerOffset);
      const outerPt = canvas.pointForBp(bp, centerOffset + this.labelLineLength + this._labelLineMarginOuter);
      const rectOrigin = utils.rectOriginForAttachementPoint(outerPt, label.lineAttachment, label.width, label.height);
      label.rect = new Rect(rectOrigin.x, rectOrigin.y, label.width, label.height);
      label.attachementPt = label.rect.ptForClockPosition(label.lineAttachment);
    }
  }

  visibleLabels() {
    let labelArray = new CGArray();
    const visibleRange = this._visibleRange;
    if (visibleRange) {
      if (visibleRange.start === 1 && visibleRange.stop === this.sequence.length) {
        // labelArray = this._labels;
        labelArray = this._availableLabels; // Only labels that are on visible contigs;
      } else {
        labelArray = this._labelsNCList.find(visibleRange.start, visibleRange.stop);
      }
    }
    return labelArray;
  }

  // Labels must already be sorted so favorite are first
  _onlyFavoriteLabels(labels) {
    labels = labels || this._labels;
    const nonFavoriteIndex = labels.findIndex( (label) => !label.feature.favorite );
    if (nonFavoriteIndex !== -1) {
      return labels.slice(0, nonFavoriteIndex);
    } else {
      return labels;
    }
  }

  _sortByPriority(labels) {
    labels = labels || this._labels;
    labels.sort( (a, b) => {
      if (b.feature.favorite === a.feature.favorite) {
        return b.feature.length - a.feature.length;
      } else {
        return a.feature.favorite ? -1 : 1;
      }
    });
    return labels;
  }

  /**
   * Invert color
   */
  invertColors() {
    if (this.color) {
      this.update({ color: this.color.invert().rgbaString });
    }
  }

  drawLabelLine(label, ctx, lineWidth) {
    const innerPt = this.canvas.pointForBp(label.bp, this._outerCenterOffset + this._labelLineMarginInner);
    const outerPt = label.attachementPt;
    const color = this.color || label.feature.color;
    ctx.beginPath();
    ctx.moveTo(innerPt.x, innerPt.y);
    ctx.lineTo(outerPt.x, outerPt.y);
    ctx.strokeStyle = color.rgbaString;
    ctx.lineCap = this.lineCap;
    ctx.lineWidth = lineWidth || this._labelLineWidth;
    ctx.stroke();
  }

  draw(innerCenterOffset, outerCenterOffset, fast) {
    this._fastDraw = fast;
    // TRY refreshing through addFeatures/remove
    // if (this._labels.length !== this._labelsNCList.length) {
    //   this.refresh();
    // }

    this._visibleRange = this.canvas.visibleRangeForCenterOffset(outerCenterOffset);

    this._innerCenterOffset = innerCenterOffset;
    this._outerCenterOffset = outerCenterOffset;

    // Find Labels that are within the visible range and calculate bounds
    let possibleLabels = this.visibleLabels(outerCenterOffset);

    possibleLabels = this._sortByPriority(possibleLabels);
    if (this.onlyDrawFavorites) {
      possibleLabels = this._onlyFavoriteLabels(possibleLabels);
    }
    this._calculatePositions(possibleLabels);

    const priorityLabels = possibleLabels.slice(0, this.priorityMax);
    const remainingLabels = possibleLabels.slice(this.priorityMax);

    this._calculatePriorityLabelRects(priorityLabels);
    this._calculateLabelRects(remainingLabels);
    // console.log(priorityLabels[0] && priorityLabels[0].rect)

    // Remove overlapping labels
    const labelRects = priorityLabels.map( p => p.rect);
    this._visibleLabels = priorityLabels;
    for (let i = 0, len = remainingLabels.length; i < len; i++) {
      const label = remainingLabels[i];
      if (!label.rect.overlap(labelRects)) {
        this._visibleLabels.push(label);
        labelRects.push(label.rect);
      }
    }

    // Draw nonoverlapping labels
    const canvas = this.canvas;
    const ctx = canvas.context('map');
    let label, rect;
    ctx.font = this.font.css; // TODO: move to loop, but only set if it changes
    ctx.textAlign = 'left';
    // ctx.textBaseline = 'top';
    ctx.textBaseline = 'alphabetic'; // The default baseline works best across canvas and svg
    // Draw label lines first so that label text will draw over them
    for (let i = 0, len = this._visibleLabels.length; i < len; i++) {
      label = this._visibleLabels[i];
      // FIXME: it would be better to remove invisible labels before calculating position
      // - this works to remove label, but the space is not available for another label
      if (!label.feature.visible) { continue; }
      this.color || label.feature.color;

      this.drawLabelLine(label, ctx);
    }

    // Draw label text
    const backgroundColor = this.viewer.settings.backgroundColor.copy();
    backgroundColor.opacity = 0.75;
    for (let i = 0, len = this._visibleLabels.length; i < len; i++) {
      label = this._visibleLabels[i];
      // FIXME: it would be better to remove invisible labels before calculating position
      // - this works to remove label, but the space is not available for another label
      // NOTE: Has this been fixed????????
      if (!label.feature.visible) { continue; }
      const color = this.color || label.feature.color;

      ctx.fillStyle = backgroundColor.rgbaString;
      rect = label.rect;
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

      ctx.fillStyle = color.rgbaString;
      // ctx.fillText(label.name, label.rect.x, label.rect.y);
      ctx.fillText(label.name, label.rect.x, label.rect.bottom - 1);
    }

    if (this.viewer.debug && this.viewer.debug.data.n) {
      this.viewer.debug.data.n.labels = this._visibleLabels.length;
    }
  }

  /**
   * Update annotation [attributes](#attributes).
   * See [updating records](../docs.html#s.updating-records) for details.
   * @param {Object} attributes - Object describing the properties to change
   */
  update(attributes) {
    this.viewer.updateRecords(this, attributes, {
      recordClass: 'Annotation',
      validKeys: ['color', 'font', 'onlyDrawFavorites', 'visible']
    });
    this.viewer.trigger('annotation-update', { attributes });
  }

  /**
   * Returns JSON representing the object
   */
  toJSON(options = {}) {
    const json = {
      font: this.font.string,
      color: this.color && this.color.rgbaString,
      onlyDrawFavorites: this.onlyDrawFavorites,
      visible: this.visible
    };
    // Optionally add default values
    if (!this.visible || options.includeDefaults) {
      json.visible = this.visible;
    }
    return json;
  }

}

//////////////////////////////////////////////////////////////////////////////

/**
 * The CGView Backbone represents the sequence of the map. When zoomed in far
 * enough the sequence will be shown on the backbone. If contigs are present,
 * they will be represented as arcs or arrows on the backbone.
 *
 * ### Action and Events
 *
 * Action                                    | Viewer Method                   | Backbone Method      | Event
 * ------------------------------------------|--------------------------------- |---------------------|-----
 * [Update](../docs.html#s.updating-records) | -                                | [update()](#update) | backbone-update
 * [Read](../docs.html#s.reading-records)    | [backbone](Viewer.html#backbone) | -                   | -
 *
 * <a name="attributes"></a>
 * ### Attributes
 *
 * Attribute                         | Type      | Description
 * ----------------------------------|-----------|------------
 * [thickness](#thickness)           | Number    | Thickness of backbone [Default: 5]
 * [color](#color)                   | String    | A string describing the main backbone color [Default: 'grey']. See {@link Color} for details.
 * [colorAlternate](#alternateColor) | String    | A string describing the alternate color used for contigs [Default: 'rgb(200,200,200)']. See {@link Color} for details.
 * [decoration](#decoration)         | String    | How the bakcbone should be drawn. Choices: 'arc', 'arrow' [Default: arc for single contig, arrow for muliple contigs]
 * [visible](CGObject.html#visible)  | Boolean   | Backbone is visible [Default: true]
 * [meta](CGObject.html#meta)        | Object    | [Meta data](../tutorials/details-meta-data.html)
 *
 * ### Examples
 * ```js
 * cgv.backbone.update({
 *   thickness: 20
 * });
 *
 * @extends CGObject
 */
class Backbone extends CGObject {

  /**
   * Create the Backbone.
   * @param {Viewer} viewer - The viewer
   * @param {Object} options - [Attributes](#attributes) used to create the backbone
   * @param {Object} [meta] - User-defined [Meta data](../tutorials/details-meta-data.html) to add to the backbone.
   */
  constructor(viewer, options = {}, meta = {}) {
    super(viewer, options, meta);
    this.color = utils.defaultFor(options.color, 'grey');
    this.colorAlternate = utils.defaultFor(options.colorAlternate, 'rgb(200,200,200)');
    this.thickness = utils.defaultFor(options.thickness, 5);
    this._bpThicknessAddition = 0;
    // Default decoration is arrow for multiple contigs and arc for single contig
    const defaultDecoration = this.sequence.hasMultipleContigs ? 'arrow' : 'arc';
    this.decoration = utils.defaultFor(options.decoration, defaultDecoration);

    this.viewer.trigger('backbone-update', { attributes: this.toJSON({includeDefaults: true}) });
  }

  /**
   * Return the class name as a string.
   * @return {String} - 'Backbone'
   */
  toString() {
    return 'Backbone';
  }


  get visible() {
    return this._visible;
  }

  set visible(value) {
    this._visible = value;
    this.viewer._initialized && this.refreshThickness();
    // FIXME:
    this.viewer.layout && this.viewer.layout._adjustProportions();
  }

  /**
   * @member {Color} - Get or set the backbone color. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
   */
  get color() {
    return this._color;
  }

  set color(value) {
    if (value.toString() === 'Color') {
      this._color = value;
    } else {
      this._color = new Color(value);
    }
  }

  /**
   * @member {Color} - Get or set the backbone alternate color. This color is used when contigs are present. 
   *    The first contigs will be use *color*, the second will use *colorAlternate*, the third will use *color* and so on. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
   */
  get colorAlternate() {
    return this._colorAlternate;
  }

  set colorAlternate(value) {
    if (value.toString() === 'Color') {
      this._colorAlternate = value;
    } else {
      this._colorAlternate = new Color(value);
    }
  }

  /**
   * @member {String} - Get or set the decoration for the backbone contigs: 'arrow' or 'arc'
   */
  get decoration() {
    return this._decoration;
  }

  set decoration(value) {
    this._decoration = value;
  }

  /**
   * @member {Number} - Get or set the backbone centerOffset. This is the unzoomed centerOffset.
   */
  set centerOffset(value) {
    if (utils.isNumeric(value)) {
      this._centerOffset = value;
      // FIXME: zoommax will be based on map thickness, instead of backbone radius
      this.viewer._updateZoomMax();
    }
  }

  get centerOffset() {
    return this._centerOffset;
  }

  /**
   * @member {Number} - Get the zoomed backbone radius. This is the radius * zoomFacter
   */
  get adjustedCenterOffset() {
    return this.layout.adjustedBackboneCenterOffset(this.centerOffset);
  }

  /**
   * @member {Number} - Get or set the backbone thickness. This is the unzoomed thickness.
   */
  set thickness(value) {
    if (utils.isNumeric(value)) {
      this._thickness = Number(value);
      // FIXME:
      this.viewer.layout && this.viewer.layout._adjustProportions();
    }
  }

  get thickness() {
    return this.visible ? this._thickness : 0;
  }

  /**
   * @member {Number} - Get the zoomed backbone thickness.
   */
  // get zoomedThickness() {
    // NOTE: Can not divide by centerOffset
  //   return (Math.min(this.adjustedCenterOffset, this.viewer.maxZoomedRadius()) * (this.thickness / this.centerOffset)) + (this.bpThicknessAddition / CGV.pixel(1));
  // }

  /**
   * @member {Number} - Get the backbone thickness adjusted for visibility, zoom level and space for the sequence.
   */
  get adjustedThickness() {
    if (!this.visible) { return 0; }
    // FIXME: need to calculate the max zoom level for changing backbone thickness
    //        - should depend on the zoomFactor to at which pont the map thickness is at the maximum?
    //        - Used to depend on the maxZoomedRadius which was set to minDimension
    //        - for now set to 4
    return (Math.min(this.viewer.zoomFactor, 4) * this.thickness) + this.bpThicknessAddition;
  }

  /**
   * @member {Number} - Maximum thickness the backbone should become to allow viewing of the sequence
   */
  get maxThickness() {
    // return Math.max(this.thickness, this.sequence.thickness)
    return Math.max(this.adjustedThickness, this.sequence.thickness);
  }

  /**
   * Get the factor used to increase backbone thickness when approaching the ability to see the sequence.
   * @member {number}
   */
  get bpThicknessAddition() {
    return this._bpThicknessAddition;
  }

  /**
   * The visible range
   * @member {Range}
   */
  get visibleRange() {
    return this._visibleRange;
  }

  // Return the pixelLength of the backbone at a zoom level of 1
  get pixelLength() {
    return this.layout.pixelsPerBp(this.adjustedCenterOffset) / this.viewer.zoomFactor * this.sequence.length;
  }

  /**
   * Does the backbone contain the given *centerOffset*.
   * @param {Number} offset - The centerOffset.
   * @return {Boolean}
   */
  containsCenterOffset(offset) {
    const halfthickness = this.adjustedThickness / 2;
    const adjustedCenterOffset = this.adjustedCenterOffset;
    return (offset >= (adjustedCenterOffset - halfthickness)) && (offset <= (adjustedCenterOffset + halfthickness));
  }

  /**
   * The maximum zoom factor to get the correct spacing between basepairs.
   * @return {Number}
   */
  maxZoomFactor() {
    return (this.sequence.length * (this.sequence.bpSpacing + (this.sequence.bpMargin * 2))) / this.pixelLength;
  }

  /**
   * The number of pixels per basepair along the backbone circumference.
   * @return {Number}
   */
  pixelsPerBp() {
    return this.layout.pixelsPerBp();
  }

  directionalDecorationForContig(contig) {
    if (this.decoration === 'arrow') {
      return contig.orientation === '+' ? 'clockwise-arrow' : 'counterclockwise-arrow';
    } else {
      return this.decoration;
    }
  }

  invertColors() {
    this.update({
      color: this.color.invert().rgbaString,
      colorAlternate: this.colorAlternate.invert().rgbaString
    });
  }

  draw() {
    this._visibleRange = this.canvas.visibleRangeForCenterOffset( this.adjustedCenterOffset, 100);
    if (this.visibleRange && this.visible) {
      this.refreshThickness();

      if (this.sequence.hasMultipleContigs) {
        const contigs = this.sequence.contigsForMapRange(this.visibleRange);
        for (let i = 0, len = contigs.length; i < len; i++) {
          const contig = contigs[i];
          // Postions:
          // Large arcs (ie contigs) car drawn wrong when zoomed in (Safari)
          // So the start/stop should be adjusted to the visible range
          let start = this.sequence.bpForContig(contig);
          if (start < this.visibleRange.start && !this.visibleRange.isWrapped()) {
            start = this.visibleRange.start;
          }
          let stop = this.sequence.bpForContig(contig, contig.length);
          if (stop > this.visibleRange.stop && !this.visibleRange.isWrapped()) {
            stop = this.visibleRange.stop;
          }
          let color = (contig.index % 2 === 0) ? this.color : this.colorAlternate;
          if (contig.color) {
            color = contig.color;
          }
          this.viewer.canvas.drawElement('map', start, stop, this.adjustedCenterOffset, color.rgbaString, this.adjustedThickness, this.directionalDecorationForContig(contig));
        }
      } else {
        if (this.visibleRange.isWrapped() && this.decoration === 'arrow') {
          this.viewer.canvas.drawElement('map', this.visibleRange.start, this.sequence.length, this.adjustedCenterOffset, this.color.rgbaString, this.adjustedThickness, this.directionalDecorationForContig(this.sequence.mapContig));
          this.viewer.canvas.drawElement('map', 1, this.visibleRange.stop, this.adjustedCenterOffset, this.color.rgbaString, this.adjustedThickness, this.directionalDecorationForContig(this.sequence.mapContig));
        } else {
          this.viewer.canvas.drawElement('map', this.visibleRange.start, this.visibleRange.stop, this.adjustedCenterOffset, this.color.rgbaString, this.adjustedThickness, this.directionalDecorationForContig(this.sequence.mapContig));
        }
      }

      if (this.pixelsPerBp() > 1) {
        this.sequence.draw();
      }
    }
  }

  refreshThickness() {
    const pixelsPerBp = this.pixelsPerBp();
    if (pixelsPerBp > 1 && this.visible) {
      // const zoomedThicknessWithoutAddition = Math.min(this.adjustedCenterOffset, this.viewer.maxZoomedRadius()) * (this.thickness / this.centerOffset);
      // FIXME: see adjustedThickness for note. Use 4 for now.
      const zoomedThicknessWithoutAddition = Math.min(this.viewer.zoomFactor, 4) * this.thickness;
      const addition = pixelsPerBp * 2;
      if ( (zoomedThicknessWithoutAddition + addition ) >= this.maxThickness) {
        this._bpThicknessAddition = this.maxThickness - zoomedThicknessWithoutAddition;
      } else {
        this._bpThicknessAddition = addition;
      }
    } else {
      this._bpThicknessAddition = 0;
    }
  }

  /**
   * Update backbone [attributes](#attributes).
   * See [updating records](../docs.html#s.updating-records) for details.
   * @param {Object} attributes - Object describing the properties to change
   */
  update(attributes) {
    this.viewer.updateRecords(this, attributes, {
      recordClass: 'Backbone',
      validKeys: ['color', 'colorAlternate', 'thickness', 'decoration', 'visible']
    });
    this.viewer.trigger('backbone-update', { attributes });
  }

  /**
   * Returns JSON representing the object
   */
  toJSON(options = {}) {
    const json = {
      color: this.color.rgbaString,
      colorAlternate: this.colorAlternate.rgbaString,
      thickness: this._thickness,
      decoration: this.decoration
    };
    // Optionally add default values
    if (!this.visible || options.includeDefaults) {
      json.visible = this.visible;
    }
    return json;
  }

}

//////////////////////////////////////////////////////////////////////////////

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
 * Action                                    | Viewer Method                                    | Bookmark Method     | Event
 * ------------------------------------------|--------------------------------------------------|---------------------|-----
 * [Add](../docs.html#s.adding-records)      | [addBookmarks()](Viewer.html#addBookmarks)       | -                   | bookmarks-add
 * [Update](../docs.html#s.updating-records) | [updateBookmarks()](Viewer.html#updateBookmarks) | [update()](#update) | bookmarks-update
 * [Remove](../docs.html#s.removing-records) | [removeBookmarks()](Viewer.html#removeBookmarks) | [remove()](#remove) | bookmarks-remove
 * [Read](../docs.html#s.reading-records)    | [bookmarks()](Viewer.html#bookmarks)             | -                   | -
 *
 * <a name="attributes"></a>
 * ### Attributes
 *
 * Attribute                        | Type      | Description
 * ---------------------------------|-----------|------------
 * [name](#name)                    | String    | Name of bookmark [Default: "Bookmark-N" where N is the number of the bookmark]
 * [bp](#bp)                        | Number    | Base pair to center the map position [Default: Current bp]
 * [zoom](#zoom)                    | Number    | Zoom factor [Default: Current zoomFactor]
 * [format](#format)                | String    | Map format [Default: Current map format]
 * [bbOffset](#bbOffset)            | Number    | Distance from the backbone to the center of the canvas [Default: 0]
 * [shortcut](#shortcut)            | Character | Single character shortcut that when pressed moves the map to this position [Default: N (see name) up to 9]
 * [favorite](#favorite)            | Boolean   | Bookmark is a favorite [Default: false]
 * [meta](CGObject.html#meta)       | Object    | [Meta data](../tutorials/details-meta-data.html) for Bookmark
 *
 * ### Examples
 * ```js
 * // Create a new bookmark for the current map postion
 * let bookmark = cgv.addBookmarks();
 * // => Bookmark {name: 'Bookmark-1', bp: 1, zoom: 1, format: 'linear', bbOffset: 0, shortcut: 1}
 * cgv.bookmarks().length;
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
 * cgv.bookmarks().length;
 * // => 0
 * ```
 *
 * @extends CGObject
 */
class Bookmark extends CGObject {

  // TODO:
  //  - Offsets of 0 do not need to be saved to json as they will be the default

  /**
   * Create a new bookmark.
   * @param {Viewer} viewer - The viewer
   * @param {Object} options - [Attributes](#attributes) used to create the bookmark
   * @param {Object} [meta] - User-defined [Meta data](../tutorials/details-meta-data.html) to add to the bookmark.
   */
  constructor(viewer, options = {}, meta = {}) {
    super(viewer, options, meta);
    this.viewer = viewer;

    this.bp = utils.defaultFor(options.bp, viewer.canvas.bpForCanvasCenter());
    this.zoom = utils.defaultFor(options.zoom, viewer.zoomFactor);
    this.format = utils.defaultFor(options.format, viewer.format);
    this.name = utils.defaultFor(options.name, this.incrementalName());
    this.favorite = utils.defaultFor(options.favorite, false);
    this.shortcut = utils.defaultFor(options.shortcut, this.incrementalShortcut());
    this.bbOffset = utils.defaultFor(options.bbOffset, viewer.bbOffset);
  }

  //////////////////////////////////////////////////////////////////////////
  // MEMBERS
  //////////////////////////////////////////////////////////////////////////

  /**
   * Return the class name as a string.
   * @return {String} 'Bookmark'
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
    if (this.viewer) ;
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
   * @member {Number} - Get or set the basepair position for the bookmark.
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
   * Update bookmark [attributes](#attributes).
   * See [updating records](../docs.html#s.updating-records) for details.
   * @param {Object} attributes - Object describing the properties to change
   */
  update(attributes) {
    this.viewer.updateBookmarks(this, attributes);
  }

  /**
   * Remove bookmark.
   * See [removing records](../docs.html#s.removing-records) for details.
   */
  remove() {
    this.viewer.removeBookmarks(this);
  }

  /**
   * Move and zoom the map to this Bookmarks position.
   * @param {Number} duration - length of time for the animation
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
    return utils.uniqueId('Bookmark-', currentNames.length, currentNames);
  }

  // TODO: for now shortcuts will only be created automatically up to 9
  incrementalShortcut() {
    const currentShortcuts = this.viewer.bookmarks().map( b => b.shorcut);
    const shortcut = utils.uniqueId('', currentShortcuts.length, currentShortcuts);
    if (shortcut < 10 && shortcut > 0) { return shortcut; }
  }


  /**
   * Returns JSON representing the object
   */
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

//////////////////////////////////////////////////////////////////////////////

/**
 * A Box consists of an x and y point (the top-left corner) and
 * a width and height. The Box position can be relative to the
 * canvas where the position stays static or to the map in which
 * case the position moves with the map.
 *
 * <a name="attributes"></a>
 * ### Attributes
 *
 * Attribute             | Type          | Description
 * ----------------------|---------------|------------
 * [width](#width)       | Number        | Width of box (Default: 100)
 * [height](#height)     | Number        | Height of box (Default: 100)
 * [padding](#padding)   | Number        | Sets paddedX and paddedY values (Default: 0)
 * [position](#position) | String\|Object | Where to place the box. See {@link Position} for details.
 * [anchor](#anchor)     | String\|Object | Where the position should be anchored to the box.
 * [color](#color)       | String\|Color  | A string describing the color. See {@link Color} for details. (DOESN'T DO ANYTHING YET)
 *
 * Position:
 * If the position is on (i.e. relativeTo) the 'canvas', the box will be in a static position
 * and will not move as the map is panned. String values (e.g. top-right, bottom-middle, etc)
 * position the box appropriately. An object with xPercent and yPercent values between
 * 0 and 100 will position the box along the x and y axes starting from the top-left.
 * The string values are associated with specific offsets. For example,
 *   - top-left = {xPercent: 0, yPercent: 0}
 *   - middle-center = {xPercent: 50, yPercent: 50}
 *   - bottom-right = {xPercent: 100, yPercent: 100}
 *
 * If position is on (i.e. relativeTo) the 'map', the box will move with the map as it's panned.
 * The position will consist of
 *   - lengthPercent: 0 - start of map; 50 - middle of map; 100 - end of map
 *   - mapOffset or bbOffsetPercent: distance from the backbone
 *
 * ### Examples
 *
 */
class Box {

  /**
   * Create a Box.
   * @param {Viewer} viewer - The viewer this box will be associated with.
   * @param {Object} options - [Attributes](#attributes) used to create the box.
   */
  constructor(viewer, options = {}) {
    this._viewer = viewer;
    this._width = utils.defaultFor(options.width, 100);
    this._height = utils.defaultFor(options.height, 100);
    this.anchor = options.anchor;
    // Set position after anchor. If position is on canvas, the anchor will be updated.
    this.position = utils.defaultFor(options.position, 'middle-center');
    this.padding = utils.defaultFor(options.padding, 0);
    this.color = utils.defaultFor(options.color, 'white');
  }

  /**
   * Return the class name as a string.
   * @return {String} - 'Box'
   */
  toString() {
    return 'Box';
  }

  get viewer() {
    return this._viewer;
  }

  get canvas() {
    return this.viewer.canvas;
  }

  /**
   * Alias for [Position on](Position.html#on). Values: 'map', 'campus'.
   */
  get on() {
    return this.position.on;
  }

  set on(value) {
    this.position.on = value;
    // this._adjustAnchor(); // Only needed when onCanvas, which is called when the position is set
    if (this.position.onMap) {
      // To keep the box in the same position when changing to onMap, the auto anchor has to be turned off.
      this.anchor.auto = false;
    } else if (this.position.onCanvas) {
      // To keep the box in the same position when changing to onCanvas, the position must be adjusted.
      // Adjust Position
      this.position = {
        xPercent: this.x / (this.viewer.width - this.width) * 100,
        yPercent: this.y / (this.viewer.height - this.height) * 100
      };
    }
  }

  /**
   * @member {String} - Get or set the postion. String values include: "top-left", "top-center", "top-right", "middle-left", "middle-center", "middle-right", "bottom-left", "bottom-center", or "bottom-right".
   */
  get position() {
    return this._position;
  }

  set position(value) {
    this._position = new Position(this.viewer, value);
    this._adjustAnchor();
    this.refresh(true);
  }

  /**
   * @member {String|Object} - Get or set the anchor.
   */
  get anchor() {
    return this._anchor;
  }

  set anchor(value) {
    if (this.position && this.position.onCanvas) { return; }
    this._anchor = new Anchor(value);
    this.position && this.refresh(true);
  }

  /**
   * @member {Number} - Get or set the width.
   */
  get width() {
    return this._width;
  }

  set width(value) {
    this._width = value;
    this.refresh(true);
  }

  /**
   * @member {Number} - Get or set the height.
   */
  get height() {
    return this._height;
  }

  set height(value) {
    this._height = value;
    this.refresh(true);
  }

  /**
   * @member {Number} - Get the x position of the origin.
   */
  get x() {
    return this._x;
  }

  /**
   * @member {Number} - Get the y position of the origin.
   */
  get y() {
    return this._y;
  }

  /**
   * @member {Number} - Get or set the padding. This will be added to x and y when accessed via paddedX and paddedY.
   */
  get padding() {
    return this._padding;
  }

  set padding(value) {
    this._padding = value;
  }

  /**
   * @member {Number} - Get the x position of the origin plus padding.
   */
  get paddedX() {
    return this.x + this.padding;
  }

  /**
   * @member {Number} - Get the y position of the origin plus padding.
   */
  get paddedY() {
    return this.y + this.padding;
  }

  /**
   * @member {Number} - Get bottom of the Box
   */
  get bottom() {
    return this.y + this.height;
  }

  /**
   * @member {Number} - Get bottom of the Box minus padding
   */
  get bottomPadded() {
    return this.bottom - this.padding;
  }

  /**
   * @member {Number} - Get top of the Box. Same as Y.
   */
  get top() {
    return this.y;
  }

  /**
   * @member {Number} - Get top of the Box plus padding.
   */
  get topPadded() {
    return this.top + this.padding;
  }

  /**
   * @member {Number} - Get left of the Box. Same as X.
   */
  get left() {
    return this.x;
  }

  /**
   * @member {Number} - Get left of the Box plus padding.
   */
  get leftPadded() {
    return this.left + this.padding;
  }

  /**
   * @member {Number} - Get right of the Box.
   */
  get right() {
    return this.x + this.width;
  }

  /**
   * @member {Number} - Get right of the Box minus padding.
   */
  get rightPadded() {
    return this.right - this.padding;
  }

  /**
   * @member {Number} - Get the center x of the box.
   */
  get centerX() {
    return this.x + (this.width / 2);
  }

  /**
   * @member {Number} - Get the center y of the box.
   */
  get centerY() {
    return this.y + (this.height / 2);
  }

  resize(width, height) {
    this._width = width;
    this._height = height;
    this.refresh(true);
  }

  /**
   * Check if the Box conains the point
   *
   * @param {Number} x - X coordinate of the point
   * @param {Number} y - Y coordinate of the point
   * @return {Boolean}
   */
  containsPt(x, y) {
    return ( x >= this.x && x <= (this.x + this.width) && y >= this.y && y <= (this.y + this.height) );
  }

  _adjustAnchor() {
    if (this.position.onCanvas) {
      this.anchor.xPercent = this.position.xPercent;
      this.anchor.yPercent = this.position.yPercent;
      this.anchor.auto = true;
    }
  }

  refresh(force = false) {
    if (!force && this.on === 'canvas') { return; }
    this.position.refresh();
    if (this.anchor.auto) {
      this.anchor.autoUpdateForPosition(this.position);
    }
    this._x = this.position.x - (this.width * this.anchor.xPercent / 100);
    this._y = this.position.y - (this.height * this.anchor.yPercent / 100);
  }

  /**
   * Clear the rect area described by this box using the provided context.
   * @param {Context}  ctx - Context used to clear the rect.
   */
  clear(ctx) {
    // Added margin of 1 to remove thin lines of previous background that were not being removed
    ctx.clearRect(this.x - 1, this.y - 1, this.width + 2, this.height + 2);
  }

}

//////////////////////////////////////////////////////////////////////////////


/**
 * The canvas object controls the map layers and has methods for drawing and erasing on the layers.
 * Each layer is an HTML canvas element.
 *
 * <a name="layers"></a>
 * ### Layers
 *
 * Layer             | Description
 * ------------------|---------------
 * background        | for drawing behind the map
 * map               | main layer, where the map is drawn
 * foreground         | for drawing in front of the map (e.g. map based captions)
 * canvas            | layer for traning static components (e.g. canvas based captions and legend)
 * debug             | layer to draw debug information
 * ui                | layer for capturing interactions
 */
class Canvas {


  /**
   * Create the Canvas object.
   * @param {Viewer} viewer - The viewer
   * @param {d3Element} container - D3 Element where canvas layers will be added
   * @param {Object} options - Possible properties: width [Default: 600], height [Default: 600]
   */
  constructor(viewer, container, options = {}) {
    this._viewer = viewer;
    this.width = utils.defaultFor(options.width, 600);
    this.height = utils.defaultFor(options.height, 600);

    // Create layers
    this.determinePixelRatio(container);
    this._layerNames = ['background', 'map', 'foreground', 'canvas', 'debug', 'ui'];
    this._layers = this.createLayers(container, this._layerNames, this._width, this._height);

    // This value is used to restrict the draw range for testing (see _testDrawRange)
    this._drawRange = 0.4;
  }

  /**
   * @member {Number} - Get the pixel ratio for the canvas.
   */
  get pixelRatio() {
    return this._pixelRatio;
  }

  /**
   * Determines the pixel ratio for the provided d3 element.
   * @param {d3Element} container - D3 Element
   * @private
   */
  determinePixelRatio(container) {
    const testNode = container.append('canvas')
      .style('position',  'absolute')
      .style('top',  0)
      .style('left',  0)
      .attr('width', this._width)
      .attr('height', this._height).node();
    // Check for canvas support
    if (testNode.getContext) {
      // Get pixel ratio and upscale canvas depending on screen resolution
      // http://www.html5rocks.com/en/tutorials/canvas/hidpi/
      this._pixelRatio = utils.getPixelRatio(testNode);
    } else {
      container.html('<h3>CGView requires Canvas, which is not supported by this browser.</h3>');
    }
    d3.select(testNode).remove();
  }

  /**
   * Creates a layer for each element in layerNames.
   * @param {d3Element} container - D3 Element
   * @param {Array} layerNames - Array of layer names
   * @param {Number} width - Width of each layer
   * @param {Number} height - Height of each layer
   * @param {Boolean} scaleLayer - Sclaes the layers basedon the pixel ratio [Default: true]
   * @private
   */
  createLayers(container, layerNames, width, height, scaleLayers = true) {
    const layers = {};

    for (let i = 0, len = layerNames.length; i < len; i++) {
      const layerName = layerNames[i];
      const zIndex = (i + 1) * 10;
      const node = container.append('canvas')
        .classed('cgv-layer', true)
        .classed(`cgv-layer-${layerName}`, true)
        .style('z-index',  zIndex)
        .attr('width', width)
        .attr('height', height).node();

      if (scaleLayers) {
        utils.scaleResolution(node, this.pixelRatio);
      }

      // Set viewer context
      const ctx = node.getContext('2d');

      // Consider this to help make linear horizontal lines cleaner
      // ctx.translate(0.5, 0.5);

      layers[layerName] = { ctx: ctx, node: node };
    }
    return layers;
  }

  /**
   * Resize all layers to a new width and height.
   * @param {Number} width - New width for each layer
   * @param {Number} height - New height for each layer
   */
  resize(width, height) {
    this.width = width;
    this.height = height;
    for (const layerName of this.layerNames) {
      const layerNode = this.layers(layerName).node;
      // Note, here the width/height will take into account the pixelRatio
      layerNode.width = this.width;
      layerNode.height = this.height;
      // Note, here the width/height will be the same as viewer (no pixel ratio)
      layerNode.style.width = `${width}px`;
      layerNode.style.height = `${height}px`;

      utils.scaleResolution(layerNode, this.pixelRatio);
    }
    this.layout.updateScales();
  }

  /**
   * @member {Viewer} - Get the viewer.
   */
  get viewer() {
    return this._viewer;
  }

  /**
   * @member {Layout} - Get the layout.
   */
  get layout() {
    return this.viewer.layout;
  }

  /**
   * @member {Array} - Get the names of the layers.
   */
  get layerNames() {
    return this._layerNames;
  }

  /**
   * @member {Sequence} - Get the sequence.
   */
  get sequence() {
    return this.viewer.sequence;
  }

  /**
   * @member {Number} - Get the width of the canvas. Changing this value will not resize the layers. Use [resize](#resize) instead.
   */
  get width() {
    return this._width;
  }

  set width(width) {
    this._width = width;
  }

  /**
   * @member {Number} - Get the width of the canvas. Changing this value will not resize the layers. Use [resize](#resize) instead.
   */
  get height() {
    return this._height;
  }

  set height(height) {
    this._height = height;
  }

  /**
   * @member {String} - Get or set the cursor style for the mouse when it's on the canvas.
   */
  get cursor() {
    return d3.select(this.node('ui')).style('cursor');
  }

  set cursor(value) {
    d3.select(this.node('ui')).style('cursor', value);
  }

  /**
   * Clear the viewer canvas.
   * @param {String} layerName - Name of layer to clear [Default: 'map']. A special value of 'all' will clear all the layers.
   */
  clear(layerName = 'map') {
    if (layerName === 'all') {
      for (let i = 0, len = this.layerNames.length; i < len; i++) {
        this.clear(this.layerNames[i]);
      }
    } else if (layerName === 'background') {
      const ctx = this.context('background');
      ctx.clearRect(0, 0, this.width, this.height);
      ctx.fillStyle = this.viewer.settings.backgroundColor.rgbaString;
      ctx.fillRect(0, 0, this.width, this.height);
    } else {
      // this.context(layerName).clearRect(0, 0, this.width, this.height);
      if (this._testDrawRange) {
        this.context(layerName).clearRect(0, 0, this.width / this._drawRange, this.height / this._drawRange);
      } else {
        this.context(layerName).clearRect(0, 0, this.width, this.height);
      }
    }
  }

  /**
   * Draws an arc or arrow on the map.
   * @param {String} layer - Name of layer to draw element on
   * @param {Number} start - Start position (bp) of element
   * @param {Number} stop - Stop position (bp) of element
   * @param {Number} centerOffset - Distance form center of map to draw element
   * @param {Color} color - A string describing the color. {@link Color} for details.
   * @param {Number} width - Width of element
   * @param {String} decoration - How the element should be drawn. Values: 'arc', 'clockwise-arrow', 'counterclockwise-arrow', 'none'
   * @param {Boolean} showShading - Should the elment be drawn with shading [Default: value from settings [showShading](Settings.html#showShading)]
   * @private
   */
  // Decoration: arc, clockwise-arrow, counterclockwise-arrow, none
  //
  // - clockwise-arrow (drawn clockwise from arcStartBp; direction = 1):
  //
  //       arcStartBp (feature start)      arcStopBp
  //              |                        |
  //              --------------------------  arrowTipBp
  //              |                          \|
  //              |                           x - arrowTipPt (feature stop)
  //              |                          /
  //              -------------------------x
  //                                       |
  //                                       innerArcStartPt
  //
  // - counterclockwise-arrow (drawn counterclockwise from arcStartBp; direction = -1):
  //
  //                     arcStopBp                      arcStartBp (feature stop)
  //                            |                        |
  //                arrowTipBp   -------------------------
  //                         | /                         |
  //            arrowTipPt - x                           |
  //       (feature start)    \                          |
  //                            x-------------------------
  //                            |
  //                            innerArcStartPt
  //
  // If the zoomFactor gets too large, the arc drawing becomes unstable.
  // (ie the arc wiggle in the map as zooming)
  // So when the zoomFactor is large, switch to drawing lines ([path](#path) handles this).
  drawElement(layer, start, stop, centerOffset, color = '#000000', width = 1, decoration = 'arc', showShading) {
    if (decoration === 'none') { return; }
    const ctx = this.context(layer);
    const settings = this.viewer.settings;
    const shadowFraction = 0.10;
    const shadowColorDiff = 0.15;
    ctx.lineCap = 'butt';
    // ctx.lineJoin = 'round';
    showShading = (showShading === undefined) ? settings.showShading : showShading;

    // When drawing elements (arcs or arrows), the element should be offset by
    // half a bp on each side. This will allow single base features to be
    // drawn. It also reduces ambiguity for where features start/stop.
    // For example, if the start and stop is 10, the feature will be drwan from
    // 9.5 to 10.5.
    start -= 0.5;
    stop += 0.5;

    if (decoration === 'arc') {

      // Adjust feature start and stop based on minimum arc length.
      // Minimum arc length refers to the minimum size (in pixels) an arc will be drawn.
      // At some scales, small features will have an arc length of a fraction
      // of a pixel. In these cases, the arcs are hard to see.
      // A minArcLength of 0 means no adjustments will be made.
      const minArcLengthPixels = settings.minArcLength;
      const featureLengthBp = this.sequence.lengthOfRange(start, stop);
      const minArcLengthBp = minArcLengthPixels / this.pixelsPerBp(centerOffset);
      if ( featureLengthBp < minArcLengthBp ) {
        const middleBP = start + ( featureLengthBp / 2 );
        start = middleBP - (minArcLengthBp / 2);
        stop = middleBP + (minArcLengthBp / 2);
      }

      if (showShading) {
        const shadowWidth = width * shadowFraction;
        // Main Arc
        const mainWidth = width - (2 * shadowWidth);
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = mainWidth;
        this.path(layer, centerOffset, start, stop);
        ctx.stroke();

        const shadowOffsetDiff = (mainWidth / 2) + (shadowWidth / 2);
        ctx.lineWidth = shadowWidth;
        // Highlight
        ctx.beginPath();
        ctx.strokeStyle = new Color(color).lighten(shadowColorDiff).rgbaString;
        this.path(layer, centerOffset + shadowOffsetDiff, start, stop);
        ctx.stroke();

        // Shadow
        ctx.beginPath();
        ctx.strokeStyle = new Color(color).darken(shadowColorDiff).rgbaString;
        this.path(layer, centerOffset - shadowOffsetDiff, start, stop);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        this.path(layer, centerOffset, start, stop);
        ctx.stroke();
      }
    }

    // Looks like we're drawing an arrow
    if (decoration === 'clockwise-arrow' || decoration === 'counterclockwise-arrow') {
      // Determine Arrowhead length
      // Using width which changes according zoom factor upto a point
      const arrowHeadLengthPixels = width * settings.arrowHeadLength;
      const arrowHeadLengthBp = arrowHeadLengthPixels / this.pixelsPerBp(centerOffset);

      // If arrow head length is longer than feature length, adjust start and stop
      const featureLength = this.sequence.lengthOfRange(start, stop);
      if ( featureLength < arrowHeadLengthBp ) {
        const middleBP = start + ( featureLength / 2 );
        // Originally, the feature was adjusted to be the arrow head length.
        // However, this caused an issue with SVG drawing because the arc part of
        // the arrow would essentially be 0 bp. Drawing an arc of length 0 caused weird artifacts.
        // So here we add an additional 0.1 bp to the adjusted length.
        const adjustedFeatureHalfLength = (arrowHeadLengthBp + 0.1) / 2;
        start = middleBP - adjustedFeatureHalfLength;
        stop = middleBP + adjustedFeatureHalfLength;
      }

      // Set up drawing direction
      const arcStartBp = (decoration === 'clockwise-arrow') ? start : stop;
      const arrowTipBp = (decoration === 'clockwise-arrow') ? stop : start;
      const direction = (decoration === 'clockwise-arrow') ? 1 : -1;

      // Calculate important points
      const halfWidth = width / 2;
      const arcStopBp = arrowTipBp - (direction * arrowHeadLengthBp);
      const arrowTipPt = this.pointForBp(arrowTipBp, centerOffset);
      const innerArcStartPt = this.pointForBp(arcStopBp, centerOffset - halfWidth);

      if (showShading) {
        const halfMainWidth =  width * (0.5 - shadowFraction);
        const shadowPt = this.pointForBp(arcStopBp, centerOffset - halfMainWidth);

        // Main Arrow
        ctx.beginPath();
        ctx.fillStyle = color;
        this.path(layer, centerOffset + halfMainWidth, arcStartBp, arcStopBp, direction === -1);
        ctx.lineTo(arrowTipPt.x, arrowTipPt.y);
        ctx.lineTo(shadowPt.x, shadowPt.y);
        this.path(layer, centerOffset - halfMainWidth, arcStopBp, arcStartBp, direction === 1, 'noMoveTo');
        ctx.closePath();
        ctx.fill();

        // Highlight
        const highlightPt = this.pointForBp(arcStopBp, centerOffset + halfMainWidth);
        ctx.beginPath();
        ctx.fillStyle = new Color(color).lighten(shadowColorDiff).rgbaString;
        this.path(layer, centerOffset + halfWidth, arcStartBp, arcStopBp, direction === -1);
        ctx.lineTo(arrowTipPt.x, arrowTipPt.y);
        ctx.lineTo(highlightPt.x, highlightPt.y);
        this.path(layer, centerOffset + halfMainWidth, arcStopBp, arcStartBp, direction === 1, 'noMoveTo');
        ctx.closePath();
        ctx.fill();

        // Shadow
        ctx.beginPath();
        ctx.fillStyle = new Color(color).darken(shadowColorDiff).rgbaString;
        this.path(layer, centerOffset - halfWidth, arcStartBp, arcStopBp, direction === -1);
        ctx.lineTo(arrowTipPt.x, arrowTipPt.y);
        ctx.lineTo(shadowPt.x, shadowPt.y);
        this.path(layer, centerOffset - halfMainWidth, arcStopBp, arcStartBp, direction === 1, 'noMoveTo');
        ctx.closePath();
        ctx.fill();
      } else {
        // Draw arc with arrow head
        ctx.beginPath();
        ctx.fillStyle = color;
        this.path(layer, centerOffset + halfWidth, arcStartBp, arcStopBp, direction === -1);
        ctx.lineTo(arrowTipPt.x, arrowTipPt.y);
        ctx.lineTo(innerArcStartPt.x, innerArcStartPt.y);
        this.path(layer, centerOffset - halfWidth, arcStopBp, arcStartBp, direction === 1, 'noMoveTo');
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  /**
   * This method adds a path to the canvas and uses the underlying Layout for the actual drawing.
   * For circular layouts the path is usually an arc, however, if the zoomFactor is very large,
   * the arc is added as a straight line.
   * @param {String} layer - Name of layer to draw the path on
   * @param {Number} centerOffset - Distance form center of map to draw path
   * @param {Number} startBp - Start position (bp) of path
   * @param {Number} stopBp - Stop position (bp) of path
   * @param {Boolean} anticlockwise - Should the elment be drawn in an anticlockwise direction
   * @param {String} startType - How the path should be started. Allowed values:
   * <br /><br />
   *  - moveTo:  *moveTo* start; *lineTo* stop
   *  - lineTo: *lineTo* start; *lineTo* stop
   *  - noMoveTo:  ingore start; *lineTo* stop
   * @private
   */
  // FIXME: try calling layout.path with object parameters and compare speed
  // e.g. path({layer: 'map', offset = radius, etc})
  path(layer, centerOffset, startBp, stopBp, anticlockwise = false, startType = 'moveTo') {
    this.layout.path(layer, centerOffset, startBp, stopBp, anticlockwise, startType);
  }

  /**
   * Draw a line radiating from the map at a particular basepair position.
   * @param {String} layer - Name of layer to draw the path on
   * @param {Number} bp - Basepair position of the line
   * @param {Number} centerOffset - Distance form center of map to start the line
   * @param {Number} length - Length of line
   * @param {Color} color - A string describing the color. {@link Color} for details.
   * @param {String} cap - The stroke linecap for the starting and ending points for the line. Values: 'butt', 'square', 'round'
   * @private
   */
  radiantLine(layer, bp, centerOffset, length, lineWidth = 1, color = 'black', cap = 'butt') {
    const innerPt = this.pointForBp(bp, centerOffset);
    const outerPt = this.pointForBp(bp, centerOffset + length);
    const ctx = this.context(layer);

    ctx.beginPath();
    ctx.moveTo(innerPt.x, innerPt.y);
    ctx.lineTo(outerPt.x, outerPt.y);
    ctx.strokeStyle = color;

    ctx.lineCap = cap;

    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }


  /**
   * Alias for Layout [pointForBp](Layout.html#pointForBp)
   * @private
   */
  pointForBp(bp, centerOffset) {
    return this.layout.pointForBp(bp, centerOffset);
  }

  /**
   * Returns the bp for the current mouse position on the canvas
   * @private
   */
  bpForMouse() {
    // const pos = d3.mouse(this.node('ui'));
    // return this.bpForPoint({x: pos[0], y: pos[1]});
    const event = this.viewer.mouse;
    if (event) {
      return this.bpForPoint({x: event.canvasX, y: event.canvasY});
    }
  }

  /**
   * Returns the bp for the center of the canvas.
   * @private
   */
  bpForCanvasCenter() {
    return this.bpForPoint({x: this.width / 2, y: this.height / 2});
  }

  /**
   * Alias for Layout [bpForPoint](Layout.html#bpForPoint)
   * FIXME: this should be removed and everywhere should call layout method
   * @private
   */
  bpForPoint(point) {
    return this.layout.bpForPoint(point);
  }


  /**
   * Alias for Layout [visibleRangeForCenterOffset](Layout.html#visibleRangeForCenterOffset)
   * @private
   */
  visibleRangeForCenterOffset(centerOffset, margin = 0) {
    return this.layout.visibleRangeForCenterOffset(centerOffset, margin);
  }

  /**
   * At the current zoom level, how many pixels are there per basepair.
   * @param {Number} centerOffset - Distance from map center to calculate. This
   * makes no difference for linear maps.
   * @private
   */
  pixelsPerBp(centerOffset = this.viewer.backbone.adjustedCenterOffset) {
    return this.layout.pixelsPerBp(centerOffset);
  }

  /**
   * Returns the layer with the specified name (defaults to map layer)
   * @param {String} layer - Name of layer to return
   * @private
   */
  layers(layer='map') {
    if (this._layerNames.includes(layer)) {
      return this._layers[layer];
    } else {
      console.error('Returning map layer by default');
      return this._layers.map;
    }
  }

  /**
   * Returns the context for the specified layer (defaults to map layer)
   * @param {String} layer - Name of layer to return context
   * @private
   */
  context(layer) {
    if (this._layerNames.includes(layer)) {
      return this.layers(layer).ctx;
    } else {
      console.error('Returning map layer by default');
      return this.layers('map').ctx;
    }
  }

  /**
   * Return the node for the specified layer (defaults to map layer)
   * @param {String} layer - Name of layer to return node element
   * @private
   */
  node(layer) {
    if (this._layerNames.includes(layer)) {
      return this.layers(layer).node;
    } else {
      console.error('Returning map layer by default');
      return this.layers('map').node;
    }
  }

  /**
   * This test method reduces the canvas width and height so
   * you can see how the features are reduced (not drawn) as
   * you move the map out of the visible range.
   * @member {Boolean}
   * @private
   */
  get _testDrawRange() {
    return this.__testDrawRange;
  }

  set _testDrawRange(value) {
    this.__testDrawRange = value;
    if (value) {
      // Change canvas dimensions
      this.width = this.width * this._drawRange;
      this.height = this.height * this._drawRange;
      // Draw Rect around test area
      const ctx = this.context('canvas');
      ctx.strokeStyle = 'grey';
      ctx.rect(0, 0, this.width, this.height);
      ctx.stroke();
      // ctx.translate(100, 100);
    } else {
      // Return canvas dimensions to normal
      this.width = this.width / this._drawRange;
      this.height = this.height / this._drawRange;
      // Clear rect around test area
      const ctx = this.context('canvas');
      ctx.clearRect(0, 0, this.width, this.height);
    }
    this.viewer.drawFull();
  }


}

//////////////////////////////////////////////////////////////////////////////

/**
 * Captions are used to add additional annotation to the map.
 *
 * ### Action and Events
 *
 * Action                                     | Viewer Method                                  | Caption Method       | Event
 * -------------------------------------------|------------------------------------------------|----------------------|-----
 * [Add](../docs.html#adding-records)         | [addCaptions()](Viewer.html#addCaptions)       | -                    | captions-add
 * [Update](../docs.html#updating-records)    | [updateCaptions()](Viewer.html#updateCaptions) | [update()](#update)  | captions-update
 * [Remove](../docs.html#removing-records)    | [removeCaptions()](Viewer.html#removeCaptions) | [remove()](C#remove) | captions-remove
 * [Reorder](../docs.html#reordering-records) | [moveCaption()](Viewer.html#moveCaption)       | [move()](#move)      | captions-reorder
 * [Read](../docs.html#reading-records)       | [captions()](Viewer.html#captions)             | -                    | -
 *
 * <a name="attributes"></a>
 * ### Attributes
 *
 * Attribute                        | Type      | Description
 * ---------------------------------|-----------|------------
 * [name](#name)                    | String    | Text of the caption
 * [position](#position)            | String\|Object | Where to draw the caption [Default: 'middle-center']. See {@link Position} for details.
 * [anchor](#anchor)                | String\|Object | Where to anchor the caption box to the position [Default: 'middle-center']. See {@link Anchor} for details.
 * [font](#font)                    | String    | A string describing the font [Default: 'SansSerif, plain, 8']. See {@link Font} for details.
 * [fontColor](#fontColor)          | String    | A string describing the color [Default: 'black']. See {@link Color} for details.
 * [textAlignment](#textAlignment)  | String    | Alignment of caption text: *left*, *center*, or *right* [Default: 'left']
 * [backgroundColor](#font)         | String    | A string describing the background color of the caption [Default: 'white']. See {@link Color} for details.
 * [on](#on)<sup>ic</sup>           | String    | Place the caption relative to the 'canvas' or 'map' [Default: 'canvas']
 * [visible](CGObject.html#visible) | Boolean   | Caption is visible [Default: true]
 * [meta](CGObject.html#meta)       | Object    | [Meta data](tutorial-meta.html) for Caption
 * 
 * <sup>ic</sup> Ignored on Caption creation
 *
 * ### Examples
 *
 * @extends CGObject
 */
class Caption extends CGObject {

  /**
   * Create a new Caption.
   * @param {Viewer} viewer - The viewer.
   * @param {Object} options - [Attributes](#attributes) used to create the caption.
   * @param {Object} [meta] - User-defined [Meta data](../tutorials/details-meta-data.html) to add to the caption.
   */
  constructor(viewer, options = {}, meta = {}) {
    super(viewer, options, meta);
    this.viewer = viewer;
    this._name = utils.defaultFor(options.name, '');
    this.backgroundColor = options.backgroundColor;
    // this.backgroundColor = 'black';
    this.fontColor = utils.defaultFor(options.fontColor, 'black');
    this.textAlignment = utils.defaultFor(options.textAlignment, 'left');
    this.box = new Box(viewer, {
      position: utils.defaultFor(options.position, 'middle-center'),
      anchor: utils.defaultFor(options.anchor, 'middle-center')
    });
    // Setting font will refresh the caption and draw
    this.font = utils.defaultFor(options.font, 'sans-serif, plain, 8');
    // FIXME: go through caption initialization and reduce to calles to Refresh (we only need one)
  }

  /**
   * Return the class name as a string.
   * @return {String} - 'Caption'
   */
  toString() {
    return 'Caption';
  }

  /**
   * @member {Viewer} - Get or set the *Viewer*
   */
  get viewer() {
    return this._viewer;
  }

  set viewer(viewer) {
    this._viewer = viewer;
    viewer._captions.push(this);
  }

  get visible() {
    return this._visible;
  }

  set visible(value) {
    // super.visible = value;
    this._visible = value;
    this.viewer.refreshCanvasLayer();
    // this.viewer ? this.viewer.refreshCanvasLayer() : this.refresh();
    // this.refresh();
  }

  /**
   * @member {String} - Get or set where the caption will be relative to. Values: 'map', 'canvas'
   */
  get on() {
    return this.box.on;
  }

  set on(value) {
    this.clear();
    this.box.on = value;
    this.refresh();
  }

  /**
   * @member {String} - Get or set the caption [anchor](Anchor.html) position. 
   */
  get anchor() {
    return this.box.anchor;
  }

  set anchor(value) {
    this.clear();
    this.box.anchor = value;
    this.refresh();
  }

  /**
   * @member {Boolean} - Returns true if the caption is positioned on the map
   */
  get onMap() {
    return this.position.onMap;
  }

  /**
   * @member {Boolean} - Returns true if the caption is positioned on the canvas
   */
  get onCanvas() {
    return this.position.onCanvas;
  }

  /**
   * @member {Context} - Get the Context for drawing.
   * @private
   */
  get ctx() {
    const layer = (this.onMap) ? 'foreground' : 'canvas';
    return this.canvas.context(layer);
  }

  /**
   * @member {String} - Get or set the caption [position](Position.html). 
   */
  get position() {
    return this.box.position;
  }

  set position(value) {
    this.clear();
    this.box.position = value;
    // this.refresh();
    this.viewer.refreshCanvasLayer();
    // FIXME: need to update anchor 
  }

  /**
   * @member {Color} - Get or set the backgroundColor. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
   */
  get backgroundColor() {
    return this._backgroundColor;
  }

  set backgroundColor(color) {
    // this._backgroundColor.color = color;
    if (color === undefined) {
      this._backgroundColor = this.viewer.settings.backgroundColor;
    } else if (color.toString() === 'Color') {
      this._backgroundColor = color;
    } else {
      this._backgroundColor = new Color(color);
    }
    this.refresh();
  }

  /**
   * @member {Font} - Get or set the font. When setting the font, a string representing the font or a {@link Font} object can be used. For details see {@link Font}.
   */
  get font() {
    return this._font;
  }

  set font(value) {
    if (value.toString() === 'Font') {
      this._font = value;
    } else {
      this._font = new Font(value);
    }
    this.refresh();
  }

  /**
   * @member {Color} - Get or set the fontColor. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
   */
  get fontColor() {
    // return this._fontColor.rgbaString;
    return this._fontColor;
  }

  set fontColor(value) {
    if (value.toString() === 'Color') {
      this._fontColor = value;
    } else {
      this._fontColor = new Color(value);
    }
    this.refresh();
  }

  /**
   * @member {String} - Get or set the text alignment. Possible values are *left*, *center*, or *right*.
   */
  get textAlignment() {
    return this._textAlignment;
  }

  set textAlignment(value) {
    if ( utils.validate(value, ['left', 'center', 'right']) ) {
      this._textAlignment = value;
    }
    this.refresh();
  }

  /**
   * @member {String} - Get or set the text shown for this caption.
   */
  get name() {
    return this._name || '';
  }

  set name(value) {
    this._name = value;
    this.refresh();
  }

  /**
   * @member {String} - Get the name split into an array of lines.
   * @private
   */
  get lines() {
    return this.name.split('\n');
  }

  /**
   * Update caption [attributes](#attributes).
   * See [updating records](../docs.html#s.updating-records) for details.
   * @param {Object} attributes - Object describing the properties to change
   */
  update(attributes) {
    this.viewer.updateCaptions(this, attributes);
  }

  /**
   * Move the map to center the caption. Only works with caption positioned on
   * the map (not the canvas).
   * @param {Number} duration - Duration of move animation
   */
  moveTo(duration=1000) {
    this.position.moveTo(duration);
  }

  /**
   * Recalculates the *Caption* size and position.
   * @private
   */
  refresh() {
    const box = this.box;
    if (!box) { return; }
    this.clear();

    // Padding is half line height/font size
    box.padding = this.font.size / 2;

    // Calculate Caption Width
    const lines = this.lines;
    const fonts = lines.map( () => this.font.css );
    const itemWidths = Font.calculateWidths(this.ctx, fonts, lines);
    const width = d3.max(itemWidths) + (box.padding * 2);

    // Calculate height of Caption
    // - height of each line; plus padding between line; plus padding;
    const lineHeight = this.font.size + box.padding;
    const height = (lineHeight * lines.length) + box.padding;

    box.resize(width, height);

    this.draw();
  }

  /**
   * Fill the background of the caption with the background color.
   * @private
   */
  fillBackground() {
    const box = this.box;
    this.ctx.fillStyle = this.backgroundColor.rgbaString;
    box.clear(this.ctx);
    this.ctx.fillRect(box.x, box.y, box.width, box.height);
  }

  /**
   * Invert the colors of the caption (i.e. backgroundColor and fontColor).
   */
  invertColors() {
    this.update({
      backgroundColor: this.backgroundColor.invert().rgbaString,
      fontColor: this.fontColor.invert().rgbaString
    });
  }

  /**
   * Highlight the caption by drawing a box around it.
   * @param {Color} color - Color of the highlighting outline
   */
  highlight(color = this.fontColor) {
    if (!this.visible) { return; }
    // let ctx = this.canvas.context('background');
    // ctx.fillStyle = color;
    // ctx.fillRect(this.originX, this.originY, this.width, this.height);
    const ctx = this.canvas.context('ui');
    ctx.lineWidth = 1;
    ctx.strokeStyle = color.rgbaString;
    const box = this.box;
    ctx.strokeRect(box.x, box.y, box.width, box.height);

  }

  /**
   * Returns the x position for drawing the caption text. Depnds on the textAlignment.
   * @private
   */
  textX() {
    const box = this.box;
    if (this.textAlignment === 'left') {
      return box.leftPadded;
    } else if (this.textAlignment === 'center') {
      return box.centerX;
    } else if (this.textAlignment === 'right') {
      return box.rightPadded;
    }
  }

  /**
   * Clear the box containing this caption.
   */
  clear() {
    this.box.clear(this.ctx);
  }

  /**
   * Draw the caption
   */
  draw() {
    if (!this.visible) { return; }
    const ctx = this.ctx;
    const box = this.box;

    // Update the box origin if relative to the map
    box.refresh();

    this.fillBackground();
    // ctx.textBaseline = 'top';
    ctx.textBaseline = 'alphabetic'; // The default baseline works best across canvas and svg
    ctx.font = this.font.css;
    ctx.textAlign = this.textAlignment;
    // Draw Text Label
    ctx.fillStyle = this.fontColor.rgbaString;
    // ctx.fillText(this.name, box.paddedX, box.paddedY);

    const lineHeight = (box.height - box.padding) / this.lines.length;
    // let lineY = box.paddedY;
    let lineY = box.y + lineHeight;
    for (let i = 0, len = this.lines.length; i < len; i++) {
      ctx.fillText(this.lines[i], this.textX(), lineY);
      lineY += lineHeight;
    }
  }


  /**
   * Remove caption
   */
  remove() {
    // const viewer = this.viewer;
    // viewer._captions = viewer._captions.remove(this);
    // viewer.clear('canvas');
    // viewer.refreshCanvasLayer();
    this.viewer.removeCaptions(this);
  }


  /**
   * Move this caption to a new index in the array of Viewer captions.
   * @param {Number} newIndex - New index for this caption (0-based)
   */
  move(newIndex) {
    const currentIndex = this.viewer.captions().indexOf(this);
    this.viewer.moveCaption(currentIndex, newIndex);
  }


  /**
   * Returns JSON representing the object
   */
  toJSON(options = {}) {
    const json = {
      name: this.name,
      position: this.position.toJSON(options),
      textAlignment: this.textAlignment,
      font: this.font.string,
      fontColor: this.fontColor.rgbaString,
      backgroundColor: this.backgroundColor.rgbaString,
      // visible: this.visible
    };
    if (this.position.onMap) {
      json.anchor = this.anchor.toJSON();
    }
    // Optionally add default values
    if (!this.visible || options.includeDefaults) {
      json.visible = this.visible;
    }
    return json;
  }

}

//////////////////////////////////////////////////////////////////////////////

/**
 * A CGRange contains a start and stop position (in base pair) on a sequence contig.
 * Ranges are always in a clockise direction.
 * The start is always less than the stop position with following exception.
 * Since the genomes are circular, if the genome contains a single contig
 * (i.e., Sequence.hasMultipleContigs is false) it's possibe for the range to
 * loop around (i.e., that stop can be less than the start).
 *
 * ### Ranges and Map Coordinates
 *
 * Range start and stop positions are in relation to the contig the range is
 * on. To get the positions in relation to the entire map, use
 * [mapStart](#mapStart) and [mapStop](#mapStop).
 *
 */
class CGRange {

  /**
   * Create a CGRange
   *
   * @param {Sequence} contig - The contig that contains the range. The contig provides the contig length
   * @param {Number} start - The start position.
   * @param {Number} stop - The stop position.
   */
  constructor(contig, start, stop) {
    this._contig = contig;
    this.start = start;
    this.stop = stop;
  }

  /**
   * @member {Sequence} - Get the sequence.
   */
  get contig() {
    return this._contig;
  }

  /**
   * @member {Sequence} - Get the sequence.
   */
  get sequence() {
    return this.contig.sequence;
  }

  // /**
  //  * @member {Number} - Get the sequence length
  //  */
  // get sequenceLength() {
  //   return this.sequence.length;
  // }

  /**
   * @member {Number} - Get or set the range start. Start must be less than
   * Stop unless the contig represents the entire map, in which case,
   * wrapping is allowed. The value will be constrained between the 1 and the
   * contig length.
   */
  get start() {
    return this._start;
  }

  set start(value) {
    // this._start = Number(value);
    // this._start = CGV.constrain(value, 1, this.stop || this.contig.length);
    const stop = this.isWrappingAllowed ? this.contig.length : (this.stop || this.contig.length);
    this._start = utils.constrain(value, 1, stop);
  }

  /**
   * @member {Number} - Get or set the range stop. Stop must be greater than
   * Start unless the contig represents the entire map, in which case,
   * wrapping is allowed. The value will be constrained between the 1 and the
   * contig length.
   */
  get stop() {
    return this._stop;
  }

  set stop(value) {
    // this._stop = Number(value);
    // this._stop = CGV.constrain(value, this.start || 1, this.contig.length);
    const start = this.isWrappingAllowed ? 1 : (this.start || 1);
    this._stop = utils.constrain(value, start, this.contig.length);
  }

  /**
   * @member {Number} - Get or set the range start using the entire map coordinates.
   */
  get mapStart() {
    // return this._start;
    return this.start + this.contig.lengthOffset;
  }

  set mapStart(value) {
    // this._start = Number(value);
    this.start = value - this.contig.lengthOffset;
  }

  /**
   * @member {Number} - Get or set the range stop using the entire map coordinates.
   */
  get mapStop() {
    // return this._stop;
    return this.stop + this.contig.lengthOffset;
  }

  set mapStop(value) {
    // this._stop = Number(value);
    this.stop = value - this.contig.lengthOffset;
  }

  // Should this return "this" if 
  get onMap() {
    return new CGRange(this.sequence.mapContig, this.mapStart, this.mapStop);
  }

  /**
   * @member {Number} - Get the length of the range.
   */
  get length() {
    if (this.stop >= this.start) {
      return this.stop - this.start + 1;
    } else {
      return this.contig.length + (this.stop - this.start) + 1;
    }
  }

  /**
   * @member {Number} - Get the middle of the range.
   */
  get middle() {
    // Subtract 0.5 from the start like we do in Canvas.drawElement
    // So the middle of a 1 bp range will be itself.
    const _middle = this.start - 0.5 + (this.length / 2);
    if (_middle > this.contig.length) {
      return (_middle - this.contig.length);
    } else {
      return _middle;
    }
  }

  /**
   * Return true if the range length is over half the length of the
   * sequence length
   * @return {Boolean}
   */
  overHalfMapLength() {
    return this.length > (this.sequence.length / 2);
  }

  /**
   * Convert the *value* to be between the 1 and the contig length.
   * Values will be constrained to the contig unless the Map Sequence only contains a single contig,
   * in which case, values bigger or smaller than the sequence length will be wrappeed around.
   * For example, if sequence length is 1000 and _value_ is 1200,
   * a value of 200 will be returned.
   * @param {Number} value - The number to normalize.
   * @return {Number}
   */
  normalize(value) {
    if (this.sequence.hasMultipleContigs) {
      // Multiple Contigs. Values are constrained between one and contig length.
      return utils.constrain(value, 1, this.contig.length);
    } else {
      // Single Contig. Wrapping possible.
      let rotations;
      if (value > this.sequenceLength) {
        rotations = Math.floor(value / this.sequenceLength);
        return (value - (this.sequenceLength * rotations) );
      } else if (value < 1) {
        rotations = Math.ceil(Math.abs(value / this.sequenceLength));
        return (this.sequenceLength * rotations) + value;
      } else {
        return value;
      }
    }
  }

  /**
   * Return the *start* of the range plus the *value*.
   * @param {Number} - Number to add.
   * @return {Number}
   */
  getStartPlus(value) {
    return this.normalize(this.start + value);
  }

  /**
   * Return the *stop* of the range plus the *value*.
   * @param {Number} - Number to add.
   * @return {Number}
   */
  getStopPlus(value) {
    return this.normalize(this.stop + value);
  }

  /**
   * Return true if the range length is the same as the map sequence length
   * @return {Boolean}
   */
  isMapLength() {
    return (this.length === this.sequence.length);
  }

  /**
   * Return true if the contig length is the same as the sequence length.
   * If so, then the range can wrap around (i.e., that stop position can be less than the start).
   * @return {Boolean}
   * @private
   */
  isWrappingAllowed() {
    // return (!this.sequence.hasMultipleContigs && this.contig.length === this.sequence.length);
    return (this.contig === this.sequence.mapContig);
  }

  /**
   * Return true if the range wraps around the end of the contig (ie. the stop is less than the start position)
   * @return {Boolean}
   */
  isWrapped() {
    return (this.stop < this.start);
  }

  /**
   * Return true if the *position* in inside the range using map coordinates.
   * @param {Number} position - The position to check if it's in the range.
   * @return {Boolean}
   */
  containsMapBp(position) {
    if (this.stop >= this.start) {
      // Typical Range
      return (position >= this.mapStart && position <= this.mapStop);
    } else {
      // Range spans origin
      return (position >= this.mapStart || position <= this.mapStop);
    }
  }

  /**
   * Returns a copy of the Range.
   * @return {Range}
   */
  copy() {
    return new CGRange(this.contig, this.start, this.stop);
  }

  /**
   * Returns true if the range overlaps with *range2*.
   * @param {Range} range2 - The range with which to test overlap.
   * @return {Boolwan}
   */
  overlapsMapRange(range2) {
    // return (this.contains(range2.start) || this.contains(range2.stop) || range2.contains(this.start));
    return (this.containsMapBp(range2.mapStart) || this.containsMapBp(range2.mapStop) || range2.containsMapBp(this.mapStart));
  }

  /**
   * Merge with the supplied range to give the biggest possible range.
   * This may produce unexpected results of the ranges do not overlap.
   * Both ranges must be on the same contig. If not, the CGRange calling
   * this method will be returned.
   * @param {Range} range2 - The range to merge with.
   * @return {Range}
   */
  // NOTE:
  // - ONLY used in Ruler.updateTicks to merge innerRange with outerRange
  mergeWithRange(range2) {
    if (range2.contig !== this.contig) {
      return this;
    }
    const range1 = this;
    const range3 = new CGRange(this.contig, range1.start, range2.stop);
    const range4 = new CGRange(this.contig, range2.start, range1.stop);
    const ranges = [range1, range2, range3, range4];
    let greatestLength = 0;
    let rangeLength, longestRange;
    for (let i = 0, len = ranges.length; i < len; i++) {
      rangeLength = ranges[i].length;
      if (rangeLength > greatestLength) {
        greatestLength = rangeLength;
        longestRange = ranges[i];
      }
    }
    return longestRange;
  }

}

//////////////////////////////////////////////////////////////////////////////
// CodonTable and CodonTables
//////////////////////////////////////////////////////////////////////////////

/**
 * Holder for CodonTables.
 * This class will be populated with each [CodonTable](CodonTable.html) as it's required.
 *
 * ### Examples:
 * ```js
 * // Initially this class will have no
 * const codonTables = new CodonTables();
 * codonTables.tables;
 * // => {}
 *
 * Tables are accessed via byID
 * codonTables.byID(1)
 * // => CodonTable {name: 'Standard', ...}
 *
 * // This will also add the table to tables:
 * codonTables.tables;
 * // => { 1: {name: 'Standard', ...} }
 * ```
 */
class CodonTables {

  /**
   * Create an empty container to lazy load codon tables as needed
   */
  constructor() {
    this._tables = {};
  }

  /**
   * Return the current tables
   */
  get tables() {
    return this._tables;
  }

  /**
   * Return the table for provided code
   * @param {Number|String} id - ID of the Codon Table (e.g. 1, '1')
   */
  byID(id) {
    const availableIDs = CodonTable.availableGeneticCodeIDs;
    const idString = id.toString();
    let table;
    if (this.tables[idString]) {
      table = this.tables[idString];
    } else if (availableIDs.includes(idString)) {
      table = new CodonTable(idString);
      this.tables[idString] = table;
    } else {
      console.error(`Unknown Codon Table ID: '${id}'`);
    }
    return table;
  }

  /**
   * Returns object with table codes as the keys and the values as the table names
   * ```js
   * codonTables.names()
   * // => {1: 'Standard', 2: 'Vertebrate Mitochondrial', ...}
   * ```
   */
  names() {
    const codes = {};
    const ids = Object.keys(CodonTable.definitions);
    ids.map( id => codes[id] = CodonTable.definitions[id].name);
    return codes
  }

  /**
   * Translate a sequence
   * @param {String} seq - The sequence to translate
   * @param {Number} geneticCodeID - The genetic code ID (e.g. 1)
   * @param {Number} startCodon - Position (bp) of the first codon
   */
  translate(seq, geneticCodeID, startCodon=1) {
    const table = this.byID(geneticCodeID);
    if (table) {
      return table.translate(seq, startCodon);
    }
  }
}

/**
 * This class contains all the codon table definitions and has the ability to translate
 * DNA seqeunces to protein.
 */
class CodonTable {

  /**
   * Create a new codon table
   * @param {Number} geneticCodeID - ID for the genetic code (e.g. 1 for 'Standard' code)
   */
  constructor(geneticCodeID) {
    this._codons = this.generateCodons();
    this._geneticCodeID = geneticCodeID && geneticCodeID.toString();
    this._generateTable();
  }

  /**
   * Return the class name as a string.
   * @return {String} - 'CodonTable'
   */
  toString() {
    return 'CodonTable';
  }

  /**
   * Return array of all the available genetic code IDs
   */
  static get availableGeneticCodeIDs() {
    return Object.keys(CodonTable.definitions);
  }

  /**
   * Return a list of the 64 codons, sorted in the following order: T, C, A, G
   */
  get codons() {
    return this._codons;
  }

  /**
   * Return the genetic code for this codon table
   */
  get geneticCodeID() {
    return this._geneticCodeID;
  }

  /**
   * Return the name for this codon table
   */
  get name() {
    return this._name;
  }

  /**
   * Return the table for this codon table
   */
  get table() {
    return this._table;
  }

  /**
   * Return the start codons for this codon table
   */
  get starts() {
    return this._starts;
  }

  /**
   * Return the stop codons for this codon table
   */
  get stops() {
    return this._stops;
  }

  /**
   * Creates the table for this codon table
   * @private
   */
  _generateTable() {
    const codeID = this.geneticCodeID;
    if (CodonTable.availableGeneticCodeIDs.includes(codeID)) {
      const definition = CodonTable.definitions[codeID];
      // Name
      this._name = definition.name;
      // Table, starts, stops
      const table = {};
      const starts = [];
      const stops = [];
      for (const [i, codon] of this.codons.entries()) {
        table[codon] = definition.aa[i];
        if (definition.starts[i] === 'M') {
          starts.push(codon);
        }
        if (definition.aa[i] === '*') {
          stops.push(codon);
        }
      }
      this._table = table;
      this._starts = starts;
      this._stops = stops;
    } else {
      console.error(`Unknown Codon Table ID: '${codeID}'`);
    }
  }

  /**
   * Generate the codons using the nucleotides sorted by: T, C, A, G
   * @private
   */
  generateCodons() {
    // Base1 = TTTTTTTTTTTTTTTTCCCCCCCCCCCCCCCCAAAAAAAAAAAAAAAAGGGGGGGGGGGGGGGG
    // Base2 = TTTTCCCCAAAAGGGGTTTTCCCCAAAAGGGGTTTTCCCCAAAAGGGGTTTTCCCCAAAAGGGG
    // Base3 = TCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAG
    const bases = ['T', 'C', 'A', 'G'];
    const codons = [];
    for (const b1 of bases) {
      for (const b2 of bases) {
        for (const b3 of bases) {
          codons.push(`${b1}${b2}${b3}`);
        }
      }
    }
    return codons;
  }

  /**
   * Returns all the available codon table definitions
   */
  static get definitions() {
    //   Base1 = TTTTTTTTTTTTTTTTCCCCCCCCCCCCCCCCAAAAAAAAAAAAAAAAGGGGGGGGGGGGGGGG
    //   Base2 = TTTTCCCCAAAAGGGGTTTTCCCCAAAAGGGGTTTTCCCCAAAAGGGGTTTTCCCCAAAAGGGG
    //   Base3 = TCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAG
    const definitions = {
      1: {
        name:   'Standard',
        aa:     'FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG',
        starts: '---M---------------M---------------M----------------------------',
      },
      2: {
        name:   'Vertebrate Mitochondrial',
        aa:     'FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIMMTTTTNNKKSS**VVVVAAAADDEEGGGG',
        starts: '--------------------------------MMMM---------------M------------',
      },
      3: {
        name:   'Yeast Mitochondrial',
        aa:     'FFLLSSSSYY**CCWWTTTTPPPPHHQQRRRRIIMMTTTTNNKKSSRRVVVVAAAADDEEGGGG',
        starts: '----------------------------------MM----------------------------',
      },
      4: {
        name:   'Mold, Protozoan, Coelenterate Mitochondrial and Mycoplasma/Spiroplasma',
        aa:     'FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG',
        starts: '--MM---------------M------------MMMM---------------M------------',
      },
      5: {
        name:   'Invertebrate Mitochondrial',
        aa:     'FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIMMTTTTNNKKSSSSVVVVAAAADDEEGGGG',
        starts: '---M----------------------------MMMM---------------M------------',
      },
      6: {
        name:   'Ciliate, Dasycladacean and Hexamita Nuclear',
        aa:     'FFLLSSSSYYQQCC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG',
        starts: '-----------------------------------M----------------------------',
      },
      9: {
        name:   'Echinoderm and Flatworm Mitochondrial',
        aa:     'FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIIMTTTTNNNKSSSSVVVVAAAADDEEGGGG',
        starts: '-----------------------------------M---------------M------------',
      },
      10: {
        name:   'Euplotid Nuclear',
        aa:     'FFLLSSSSYY**CCCWLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG',
        starts: '-----------------------------------M----------------------------',
      },
      11: {
        name:   'Bacterial and Plant Plastid',
        aa:     'FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG',
        starts: '---M---------------M------------MMMM---------------M------------',
      },
      12: {
        name:   'Alternative Yeast Nuclear',
        aa:     'FFLLSSSSYY**CC*WLLLSPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG',
        starts: '-------------------M---------------M----------------------------',
      },
      13: {
        name:   'Ascidian Mitochondrial',
        aa:     'FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIMMTTTTNNKKSSGGVVVVAAAADDEEGGGG',
        starts: '---M------------------------------MM---------------M------------',
      },
      14: {
        name:   'Alternative Flatworm Mitochondrial',
        aa:     'FFLLSSSSYYY*CCWWLLLLPPPPHHQQRRRRIIIMTTTTNNNKSSSSVVVVAAAADDEEGGGG',
        starts: '-----------------------------------M----------------------------',
      },
      15: {
        name:   'Blepharisma Nuclear',
        aa:     'FFLLSSSSYY*QCC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG',
        starts: '-----------------------------------M----------------------------',
      },
      16: {
        name:   'Chlorophycean Mitochondrial',
        aa:     'FFLLSSSSYY*LCC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG',
        starts: '-----------------------------------M----------------------------',
      },
      21: {
        name:   'Trematode Mitochondrial',
        aa:     'FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIMMTTTTNNNKSSSSVVVVAAAADDEEGGGG',
        starts: '-----------------------------------M---------------M------------',
      },
      22: {
        name:   'Scenedesmus obliquus mitochondrial',
        aa:     'FFLLSS*SYY*LCC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG',
        starts: '-----------------------------------M----------------------------',
      },
      23: {
        name:   'Thraustochytrium Mitochondrial',
        aa:     'FF*LSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG',
        starts: '--------------------------------M--M---------------M------------',
      },
    };
    return definitions;
  }

  /**
   * Translate a sequence using this codon table
   * @param {String} seq - The sequence to translate
   * @param {Number} startCodon - Position (bp) of the first codon
   */
  translate(rawSeq, codonStart=1) {
    const codonSize = 3;
    const seq = rawSeq.toUpperCase();
    let index = -1 + codonStart;
    let codon = seq.slice(index, index + codonSize);
    let translated = '';
    while (codon.length === codonSize) {
      translated += this.table[codon] || 'X';
      index += codonSize;
      codon = seq.slice(index, index + codonSize);
    }
    return translated;
  }

}

// ColorPicker

/**
 * @private
 */
class ColorPicker {


  /**
   * The ColorPicker is based on the [Flexi Color Picker](http://www.daviddurman.com/flexi-color-picker).
   * Color is stored internally as HSV, as well as a Color object.
   * @private
   */
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this._object = options.object;
    this.container = d3.select(`#${containerId}`).node();
    this._width = utils.defaultFor(options.width, 100);
    this._height = utils.defaultFor(options.height, 100);

    this._color = new Color( utils.defaultFor(options.colorString, 'rgba(255,0,0,1)') );
    this.hsv = this._color.hsv;
    this.opacity = this._color.opacity;

    this.onChange = options.onChange;
    this.onClose = options.onClose;

    this.container.innerHTML = this._colorpickerHTMLSnippet();
    d3.select(this.container).classed('cp-dialog', true);
    this.dialogElement = this.container.getElementsByClassName('cp-dialog')[0];
    this.slideElement = this.container.getElementsByClassName('cp-color-slider')[0];
    this.pickerElement = this.container.getElementsByClassName('cp-color-picker')[0];
    this.alphaElement = this.container.getElementsByClassName('cp-alpha-slider')[0];
    this.slideIndicator = this.container.getElementsByClassName('cp-color-slider-indicator')[0];
    this.pickerIndicator = this.container.getElementsByClassName('cp-color-picker-indicator')[0];
    this.pickerIndicatorRect1 = this.container.getElementsByClassName('cp-picker-indicator-rect-1')[0];
    this.alphaIndicator = this.container.getElementsByClassName('cp-alpha-slider-indicator')[0];
    this.currentColorIndicator = this.container.getElementsByClassName('cp-color-current')[0];
    this.originalColorIndicator = this.container.getElementsByClassName('cp-color-original')[0];
    this.doneButton = this.container.getElementsByClassName('cp-done-button')[0];
    this._configureView();

    // Prevent the indicators from getting in the way of mouse events
    // this.slideIndicator.style.pointerEvents = 'none';
    // this.pickerIndicator.style.pointerEvents = 'none';
    // this.alphaIndicator.style.pointerEvents = 'none';

    // D3Event will be passed the the listerners as first argument
    d3.select(this.slideElement).on('mousedown.click', this.slideListener());
    d3.select(this.pickerElement).on('mousedown.click', this.pickerListener());
    d3.select(this.alphaElement).on('mousedown.click', this.alphaListener());
    d3.select(this.originalColorIndicator).on('mousedown.click', this.originalColorListener());
    d3.select(this.doneButton).on('mousedown.click', this.doneListener());

    this.enableDragging(this, this.slideElement, this.slideListener());
    this.enableDragging(this, this.pickerElement, this.pickerListener());
    this.enableDragging(this, this.alphaElement, this.alphaListener());
    this.enableDragging(this, this.container, this.dialogListener());

    this.enableDragging(this, this.slideIndicator, this.slideListener());
    this.enableDragging(this, this.pickerIndicator, this.pickerListener());
    this.enableDragging(this, this.alphaIndicator, this.alphaListener());


    this.setColor(this._color);

    d3.select(this.container).style('visibility', 'hidden');
  }

  get color() {
    return this._color;
  }

  /**
   * Get or set the object currently associated with the color picker
   * @private
   */
  get object() {
    return this._object;
  }

  set object(value) {
    this._object = value;
  }

  updateColor() {
    this._color.hsv = this.hsv;
    this._color.opacity = this.opacity;
    this.updateIndicators();
    const pickerRgbString = Color.rgb2String( Color.hsv2rgb( {h: this.hsv.h, s: 1, v: 1} ) );
    this.pickerElement.style.backgroundColor = pickerRgbString;
    this.pickerIndicatorRect1.style.backgroundColor = this.color.rgbString;
    this.slideIndicator.style.backgroundColor = pickerRgbString;
    d3.select(this.alphaElement).selectAll('stop').attr('stop-color', this.color.rgbString);
    this.currentColorIndicator.style.backgroundColor = this.color.rgbaString;
    this.onChange && this.onChange(this.color);
  }

  setColor(value) {
    this._color.setColor(value);
    this.hsv = this._color.hsv;
    this.opacity = Number(this._color.opacity.toFixed(2));
    this.originalColorIndicator.style.backgroundColor = this._color.rgbaString;
    this.updateColor();
  }

  updateIndicators() {
    const hsv = this.hsv;
    const slideY = hsv.h * this.slideElement.offsetHeight / 360;
    const pickerHeight = this.pickerElement.offsetHeight;
    const pickerX = hsv.s * this.pickerElement.offsetWidth;
    const pickerY = pickerHeight - (hsv.v * pickerHeight);
    const alphaX = this.alphaElement.offsetWidth * this.opacity;

    const pickerIndicator = this.pickerIndicator;
    const slideIndicator = this.slideIndicator;
    const alphaIndicator = this.alphaIndicator;
    slideIndicator.style.top = `${slideY - (slideIndicator.offsetHeight / 2)}px`;
    pickerIndicator.style.top = `${pickerY - (pickerIndicator.offsetHeight / 2)}px`;
    pickerIndicator.style.left = `${pickerX - (pickerIndicator.offsetWidth / 2)}px`;
    alphaIndicator.style.left = `${alphaX - (alphaIndicator.offsetWidth / 2)}px`;
  }

  setPosition(pos) {
    this.container.style.left = `${pos.x}px`;
    this.container.style.top = `${pos.y}px`;
  }

  get width() {
    return this.container.offsetWidth;
  }

  get height() {
    return this.container.offsetHeight;
  }

  _colorpickerHTMLSnippet() {
    return [
      '<div class="cp-color-picker-wrapper">',
      '<div class="cp-color-picker"></div>',
      // '<div class="cp-color-picker-indicator"></div>',
      '<div class="cp-color-picker-indicator">',
      '<div class="cp-picker-indicator-rect-1"></div>',
      '<div class="cp-picker-indicator-rect-2"></div>',
      '</div>',
      '</div>',
      '<div class="cp-color-slider-wrapper">',
      '<div class="cp-color-slider"></div>',
      // '<div class="cp-color-slider-indicator"></div>',
      '<div class="cp-color-slider-indicator">',
      '<div class="cp-color-indicator-rect-1"></div>',
      '<div class="cp-color-indicator-rect-2"></div>',
      '</div>',
      '</div>',
      '<div class="cp-alpha-slider-wrapper">',
      '<div class="cp-alpha-slider"></div>',
      // '<div class="cp-alpha-slider-indicator"></div>',
      '<div class="cp-alpha-slider-indicator">',
      '<div class="cp-alpha-indicator-rect-1"></div>',
      '<div class="cp-alpha-indicator-rect-2"></div>',
      '</div>',
      '</div>',
      '<div class="cp-dialog-footer">',
      '<div class="cp-footer-color-section">',
      '<div class="cp-color-original"></div>',
      '<div class="cp-color-current"></div>',
      '</div>',
      '<div class="cp-footer-button-section">',
      '<button class="cp-done-button">Done</button>',
      '</div>',
      '</div>'

    ].join('');
  }

  /**
   * Create slide, picker, and alpha markup
   * The container ID is used to make unique ids for the SVG defs
   * @private
   */
  _configureView() {
    const containerId = this.containerId;
    const slide = $el('svg', { xmlns: 'http://www.w3.org/2000/svg', version: '1.1', width: '20px', height: '100px' },
      [
        $el('defs', {},
          $el('linearGradient', { id: `${containerId}-gradient-hsv`, x1: '0%', y1: '100%', x2: '0%', y2: '0%'},
            [
              $el('stop', { offset: '0%', 'stop-color': '#FF0000', 'stop-opacity': '1' }),
              $el('stop', { offset: '13%', 'stop-color': '#FF00FF', 'stop-opacity': '1' }),
              $el('stop', { offset: '25%', 'stop-color': '#8000FF', 'stop-opacity': '1' }),
              $el('stop', { offset: '38%', 'stop-color': '#0040FF', 'stop-opacity': '1' }),
              $el('stop', { offset: '50%', 'stop-color': '#00FFFF', 'stop-opacity': '1' }),
              $el('stop', { offset: '63%', 'stop-color': '#00FF40', 'stop-opacity': '1' }),
              $el('stop', { offset: '75%', 'stop-color': '#0BED00', 'stop-opacity': '1' }),
              $el('stop', { offset: '88%', 'stop-color': '#FFFF00', 'stop-opacity': '1' }),
              $el('stop', { offset: '100%', 'stop-color': '#FF0000', 'stop-opacity': '1' })
            ]
          )
        ),
        $el('rect', { x: '0', y: '0', width: '20px', height: '100px', rx: '2px', fill: `url(#${containerId}-gradient-hsv)`})
      ]
    );

    const picker = $el('svg', { xmlns: 'http://www.w3.org/2000/svg', version: '1.1', width: '100px', height: '100px' },
      [
        $el('defs', {},
          [
            $el('linearGradient', { id: `${containerId}-gradient-black`, x1: '0%', y1: '100%', x2: '0%', y2: '0%'},
              [
                $el('stop', { offset: '0%', 'stop-color': '#000000', 'stop-opacity': '1' }),
                $el('stop', { offset: '100%', 'stop-color': '#CC9A81', 'stop-opacity': '0' })
              ]
            ),
            $el('linearGradient', { id: `${containerId}-gradient-white`, x1: '0%', y1: '100%', x2: '100%', y2: '100%'},
              [
                $el('stop', { offset: '0%', 'stop-color': '#FFFFFF', 'stop-opacity': '1' }),
                $el('stop', { offset: '100%', 'stop-color': '#CC9A81', 'stop-opacity': '0' })
              ]
            )
          ]
        ),
        $el('rect', { x: '0', y: '0', width: '100px', height: '100px', rx: '2px', fill: `url(#${containerId}-gradient-white)`}),
        $el('rect', { x: '0', y: '0', width: '100px', height: '100px', rx: '2px', fill: `url(#${containerId}-gradient-black)`})
      ]
    );

    const alpha = $el('svg', { xmlns: 'http://www.w3.org/2000/svg', version: '1.1', width: '127px', height: '10px', style: 'position: absolute;' },
      [
        $el('defs', {},
          [
            $el('linearGradient', { id: `${containerId}-alpha-gradient` },
              [
                $el('stop', { offset: '0%', 'stop-color': '#FFFFFF', 'stop-opacity': '0' }),
                $el('stop', { offset: '100%', 'stop-color': '#FFFFFF', 'stop-opacity': '1' })
              ]
            ),
            $el('pattern', { id: `${containerId}-alpha-squares`, x: '0', y: '0', width: '10px', height: '10px', patternUnits: 'userSpaceOnUse' },
              [
                $el('rect', { x: '0', y: '0', width: '10px', height: '10px', fill: 'white'}),
                $el('rect', { x: '0', y: '0', width: '5px', height: '5px', fill: 'lightgray'}),
                $el('rect', { x: '5px', y: '5px', width: '5px', height: '5px', fill: 'lightgray'})
              ]
            )
          ]
        ),
        $el('rect', { x: '0', y: '0', width: '127px', height: '10px', rx: '2px', fill: `url(#${containerId}-alpha-squares)`}),
        $el('rect', { x: '0', y: '0', width: '127px', height: '10px', rx: '2px', fill: `url(#${containerId}-alpha-gradient)`})
      ]
    );

    this.slideElement.appendChild(slide);
    this.pickerElement.appendChild(picker);
    this.alphaElement.appendChild(alpha);
  }



  /**
  * Enable drag&drop color selection.
  * @param {object} ctx ColorPicker instance.
  * @param {DOMElement} element HSV slide element or HSV picker element.
  * @param {Function} listener Function that will be called whenever mouse is dragged over the element with event object as argument.
   * @private
  */
  enableDragging(ctx, element, listener) {
    d3.select(element).on('mousedown', function(d3EventMouseDown) {
      d3EventMouseDown.preventDefault();
      d3EventMouseDown.stopPropagation();
      const mouseStart = mousePosition(element, d3EventMouseDown);
      d3.select(document).on('mousemove.colordrag', function(d3EventMouseMove) {
        if (document.selection) {
          document.selection.empty();
        } else {
          window.getSelection().removeAllRanges();
        }
        listener(d3EventMouseMove, mouseStart);
      });
      d3.select(document).on('mouseup', function() {
        d3.select(document).on('mousemove.colordrag', null);
      });
    });
  }

  /**
   * Return click event handler for the slider.
   * Sets picker background color and calls ctx.callback if provided.
   * @private
   */
  slideListener() {
    const cp = this;
    const slideElement = cp.slideElement;
    return function(d3Event, mouseStart) {
      const mouse = mousePosition(slideElement, d3Event);
      cp.hsv.h = mouse.y / slideElement.offsetHeight * 360;// + cp.hueOffset;
      // Hack to fix indicator bug
      if (cp.hsv.h >= 359) { cp.hsv.h = 359;}
      cp.updateColor();
    };
  }

  /**
   * Return click event handler for the picker.
   * Calls ctx.callback if provided.
   * @private
   */
  pickerListener() {
    const cp = this;
    const pickerElement = cp.pickerElement;
    return function(d3Event, mouseStart) {
      const width = pickerElement.offsetWidth;
      const height = pickerElement.offsetHeight;
      const mouse = mousePosition(pickerElement, d3Event);
      cp.hsv.s = mouse.x / width;
      cp.hsv.v = (height - mouse.y) / height;
      cp.updateColor();
    };
  }

  /**
   * Return click event handler for the alpha.
   * Sets alpha background color and calls ctx.callback if provided.
   * @private
   */
  alphaListener() {
    const cp = this;
    const alphaElement = cp.alphaElement;
    return function(d3Event, mouseStart) {
      const mouse = mousePosition(alphaElement, d3Event);
      const opacity =  mouse.x / alphaElement.offsetWidth;
      cp.opacity = Number(opacity.toFixed(2));
      cp.updateColor();
    };
  }

  /**
   * Return click event handler for the dialog.
   * @private
   */
  dialogListener() {
    const cp = this;
    const container = cp.container;
    return function(d3Event, mouseStart) {
      const parentOffset = utils.getOffset(container.offsetParent);
      const offsetX = parentOffset.left;
      const offsetY = parentOffset.top;
      container.style.left = `${d3Event.pageX - offsetX - mouseStart.x}px`;
      container.style.top = `${d3Event.pageY - offsetY - mouseStart.y}px`;
    };
  }


  /**
   * Return click event handler for the original color.
   * @private
   */
  originalColorListener() {
    const cp = this;
    return function() {
      cp.setColor(cp.originalColorIndicator.style.backgroundColor);
    };
  }

  /**
   * Return click event handler for the done button.
   * @private
   */
  doneListener() {
    const cp = this;
    return function() {
      cp.onChange = undefined;
      cp.close();
    };
  }

  get visible() {
    return d3.select(this.container).style('visibility') === 'visible';
  }

  set visible(value) {
    value ? this.open() : this.close();
  }

  open(object) {
    if (object) { this.object = object; }
    const box = d3.select(this.container);
    box.style('visibility', 'visible');
    box.transition().duration(200)
      .style('opacity', 1);
    return this;
  }

  close() {
    d3.select(this.container).transition().duration(200)
      .style('opacity', 0)
      .on('end', function() {
        d3.select(this).style('visibility', 'hidden');
      });
    this.onClose && this.onClose();
    this.onClose = undefined;
    return this;
  }

}

/**
 * Create SVG element.
 * @private
 */
function $el(el, attrs, children) {
  el = document.createElementNS('http://www.w3.org/2000/svg', el);
  for (const key in attrs) el.setAttribute(key, attrs[key]);
  if (Object.prototype.toString.call(children) !== '[object Array]') children = [children];
  const len = (children[0] && children.length) || 0;
  for (let i = 0; i < len; i++) el.appendChild(children[i]);
  return el;
}

/**
 * Return mouse position relative to the element el.
 * @private
 */
function mousePosition(element, d3Event) {
  const width = element.offsetWidth;
  const height = element.offsetHeight;

  const pos = d3.pointer(d3Event, element);

  const mouse = {x: pos[0], y: pos[1]};
  if (mouse.x > width) {
    mouse.x = width;
  } else if (mouse.x < 0) {
    mouse.x = 0;
  }
  if (mouse.y > height) {
    mouse.y = height;
  } else if (mouse.y < 0) {
    mouse.y = 0;
  }
  return mouse;
}

/**
 * Worker to extract features from the sequence (e.g. orfs, start-stop codons)
 * The progress is calculated for the entire sequence and we keep track of the
 * progressState as we find features for each contig.
 */
function WorkerFeatureExtraction() {
  onmessage = function(e) {
    const featureDataArray = processSequence(e.data);
    // let progressState;
    // const type = e.data.type;
    // console.log(`Starting ${type}`);
    // let featureDataArray = [];
    // if (type === 'start-stop-codons') {
    //   progressState = { start: 0, stop: 50 };
    //   featureDataArray = extractStartStopCodons(1, e.data, progressState);
    //   progressState = { start: 50, stop: 100 };
    //   featureDataArray = featureDataArray.concat( extractStartStopCodons(-1, e.data, progressState) );
    // } else if (type === 'orfs') {
    //   featureDataArray = extractORFs(e.data);
    // }
    // // Sort the features by start
    // featureDataArray.sort( (a, b) => {
    //   return a.start - b.start;
    // });

    // Return results
    postMessage({ messageType: 'complete', featureDataArray: featureDataArray });
    close();
    // console.log(`Done ${e.data.type}`);
  };
  onerror = function(e) {
    console.error(`Oops. Problem with ${e.data.type}`);
  };

  const processSequence = function(data) {
    let progressState;
    const type = data.type;
    const seqType = data.seqType;
    const seqData = data.seqData;
    const seqTotalLength = data.seqTotalLength;
    const options = data.options;
    console.log(`Starting ${type}`);
    let featureDataArray = [];
    let seqLengthCompleted = 0;
    let progressStart = 0;


    let seq, progressForStep, progressStop;
    for (var i = 0, len = seqData.length; i < len; i++) {
      seq = seqData[i].seq;

      // Percentage of sequence processed in this iteration.
      progressForStep = seq.length / seqTotalLength * 100;
      progressStart = seqLengthCompleted / seqTotalLength * 100;
      progressStop = progressStart + progressForStep;
      // console.log(progressForStep)

      if (seqType === 'contigs') {
        options.contigID = seqData[i].name;
      }
      if (type === 'start-stop-codons') {
        progressState = { start: progressStart, stop: progressStart + (progressForStep / 2)};
        featureDataArray = featureDataArray.concat( extractStartStopCodons(seq, 1, options, progressState) );
        progressState = { start: progressState.stop, stop: progressStop };
        featureDataArray = featureDataArray.concat( extractStartStopCodons(seq, -1, options, progressState) );
      } else if (type === 'orfs') {
        progressState = { start: progressStart, stop: progressStop};
        featureDataArray = featureDataArray.concat( extractORFs(seq, options, progressState) );
      }
      // console.log( `${i}: ${(new Date().getTime()) - testStartTime} ms`);

      // Sort the features by start
      // FIXME: this needs to be done contig by contig. Do we need to sort??
      // featureDataArray.sort( (a, b) => {
      //   return a.start - b.start;
      // });
      seqLengthCompleted += seq.length;
    }
    return featureDataArray;
  };

  const extractStartStopCodons = function(seq, strand, options, progressState = {}) {
    let progress = 0;
    let savedProgress = 0;
    const source = 'start-stop-codons';
    seq = (strand === 1) ? seq : reverseComplement(seq);
    const startPattern = options.startPattern.toUpperCase().split(',').map( s => s.trim() ).join('|');
    const stopPattern = options.stopPattern.toUpperCase().split(',').map( s => s.trim() ).join('|');
    const totalPattern = `${startPattern}|${stopPattern}`;
    const startPatternArray = startPattern.split('|');
    const stopPatternArray = stopPattern.split('|');

    const re = new RegExp(totalPattern, 'g');
    let match, start, featureData, type;
    const seqLength = seq.length;
    const featureDataArray = [];

    while ( (match = re.exec(seq)) !== null) {
      start = (strand === 1) ? (match.index + 1) : (seqLength - match.index - match[0].length + 1);
      if (startPatternArray.indexOf(match[0]) >= 0) {
        type = 'start-codon';
      } else if (stopPatternArray.indexOf(match[0]) >= 0) {
        type = 'stop-codon';
      }

      featureData = {
        type: type,
        start: start,
        stop: start + match[0].length - 1,
        strand: strand,
        source: source,
        contig: options.contigID,
        extractedFromSequence: true
      };
      featureDataArray.push(featureData);

      // Progress
      progress = Math.round( (strand === 1) ? (start / seqLength * 100) : ( (seqLength - start) / seqLength * 100) );
      savedProgress = postProgress(progress, savedProgress, progressState);

      re.lastIndex = match.index + 1;
    }
    return featureDataArray;
  };

  const postProgress = function(currentProgress, savedProgress, progressState = {}) {
    const progressStart = Math.round(progressState.start || 0);
    const progressStop = Math.round(progressState.stop || 100);
    const progressIncrement = progressState.increment || 1;
    const progressRange = progressStop - progressStart;
    if ( (currentProgress > savedProgress) && (currentProgress % progressIncrement === 0) ) {
      const oldMessageProgress = progressStart + (progressRange * savedProgress / 100);
      savedProgress = currentProgress;
      const messageProgress = progressStart + (progressRange * currentProgress / 100);
      if (messageProgress > oldMessageProgress && messageProgress % progressIncrement === 0) {
        postMessage({ messageType: 'progress', progress: messageProgress });
      }
    }
    return savedProgress;
  };

  const extractORFs = function(seq, options, progressState = {}) {
    options.minORFLength;
    const seqLength = seq.length;
    let featureDataArray = [];

    const progressStart = progressState.start || 0;
    const progressStop = progressState.stop || 100;
    const progressRange = progressStop - progressStart;
    const progressPortion = progressRange / 4;

    // progressState = {start: 0, stop: 25};
    progressState = {start: progressStart, stop: progressStart + progressPortion};
    let codonDataArray = extractStartStopCodons(seq, 1, options, progressState);
    // progressState = {start: 25, stop: 50};
    progressState = {start: progressState.stop, stop: progressStart + progressPortion * 2};
    codonDataArray = codonDataArray.concat( extractStartStopCodons(seq, -1, options, progressState) );
    const startFeatures = codonDataArray.filter( f => f.type === 'start-codon' );
    const stopFeatures = codonDataArray.filter( f => f.type === 'stop-codon' );

    const startsByRF = featuresByReadingFrame(startFeatures, seqLength);
    const stopsByRF = featuresByReadingFrame(stopFeatures, seqLength);

    // progressState = {start: 50, stop: 75};
    progressState = {start: progressState.stop, stop: progressStart + progressPortion * 3};
    featureDataArray =  orfsByStrand(1, startsByRF, stopsByRF, seqLength, options, progressState);
    // progressState = {start: 75, stop: 100};
    progressState = {start: progressState.stop, stop: progressStop};
    featureDataArray = featureDataArray.concat( orfsByStrand(-1, startsByRF, stopsByRF, seqLength, options, progressState) );
    return featureDataArray;
  };

  const orfsByStrand = function(strand, startsByRF, stopsByRF, seqLength, options= {}, progressState = {}) {
    let position, orfLength, starts, stops;
    let start, stop, stopIndex, featureData;
    let progress, savedProgress;
    const minORFLength = options.minORFLength || 100;
    const type = 'ORF';
    const source = 'orfs';
    const featureDataArray = [];
    const readingFrames = (strand === 1) ? ['rfPlus1', 'rfPlus2', 'rfPlus3'] : ['rfMinus1', 'rfMinus2', 'rfMinus3'];
    // for (let rf of readingFrames) {
    readingFrames.forEach( function(rf) {
      position = (strand === 1) ? 1 : seqLength;
      stopIndex = 0;
      starts = startsByRF[rf];
      stops = stopsByRF[rf];
      const progressInitial = 33 * readingFrames.indexOf(rf);
      progress = 0;
      savedProgress = 0;
      if (strand === -1) {
        // Sort descending by start
        starts.sort( (a, b) => b.start - a.start );
        stops.sort( (a, b) => b.start - a.start );
      }
      for (let i = 0, iLen = starts.length; i < iLen; i++) {
        start = starts[i];
        progress = progressInitial + Math.round( i / iLen * 33);
        savedProgress = postProgress(progress, savedProgress, progressState);
        if ( ((strand === 1) && (start.start < position)) || ((strand === -1) && (start.start > position)) ) {
          continue;
        }
        for (let j = stopIndex, jLen = stopsByRF[rf].length; j < jLen; j++) {
          stop = stops[j];
          orfLength = (strand === 1) ? stop.stop - start.start : start.stop - stop.start;
          // ORF length is measure in codons
          if (orfLength >= (minORFLength * 3)) {
            position = (strand === 1) ? stop.stop : stop.start;

            featureData = {
              type: type,
              start: (strand === 1) ? start.start : stop.start,
              stop: (strand === 1) ? stop.stop : start.stop,
              strand: strand,
              source: source,
              contig: options.contigID,
              extractedFromSequence: true
            };
            featureDataArray.push(featureData);

            // progress = Math.round(start / seqLength * 100);
            // if ( (progress > savedProgress) && (progress % progressIncrement === 0) ) {
            //   savedProgress = progress;
            //   postMessage({ messageType: 'progress', progress: progress });
            // }

            stopIndex = j;
            break;
          } else if (orfLength > 0) {
            position = (strand === 1) ? stop.stop : stop.start;
            stopIndex = j;
            break;
          }
        }
      }
    });
    return featureDataArray;
  };

  const reverseComplement = function(seq) {
    return complement( seq.split('').reverse().join('') );
  };

  const complement = function(seq) {
    let compSeq = '';
    let char, compChar;
    for (let i = 0, len = seq.length; i < len; i++) {
      char = seq.charAt(i);
      switch (char) {
      case 'A':
        compChar = 'T';
        break;
      case 'T':
        compChar = 'A';
        break;
      case 'G':
        compChar = 'C';
        break;
      case 'C':
        compChar = 'G';
      }
      compSeq = compSeq + compChar;
    }
    return compSeq;
  };

  const featuresByReadingFrame = function(features, seqLength) {
    const featuresByRF = {
      rfPlus1: [],
      rfPlus2: [],
      rfPlus3: [],
      rfMinus1: [],
      rfMinus2: [],
      rfMinus3: []
    };
    let rf, feature;
    for (let i = 0, len = features.length; i < len; i++) {
      feature = features[i];
      if (feature.strand === -1) {
        rf = (seqLength - feature.stop + 1) % 3;
        if (rf === 0) { rf = 3; }
        featuresByRF[`rfMinus${rf}`].push(feature);
      } else {
        rf = feature.start % 3;
        if (rf === 0) { rf = 3; }
        featuresByRF[`rfPlus${rf}`].push(feature);
      }
    }
    return featuresByRF;
  };
}

/**
 * Worker to extract plot data from the sequence (e.g. gc-content, gc-skew)
 */
function WorkerBaseContent() {
  onmessage = function(e) {
    console.log(`Starting ${e.data.type}`);
    calculateBaseContent(e.data);
    console.log(`Done ${e.data.type}`);
  };
  onerror = function(e) {
    console.error(`Oops. Problem with ${e.data.type}`);
  };

  const calculateBaseContent = function(data) {
    let progress = 0;
    let savedProgress = 0;
    const progressIncrement = 5;
    const positions = [];
    let scores = [];
    const type = data.type;
    const seq = data.seqData[0].seq;
    const options = data.options;
    const windowSize = options.window;
    const step = options.step;
    const deviation = options.deviation;
    let average = baseCalculation(type, seq);
    // Starting points for min and max
    let min = 1;
    let max = 0;
    const halfWindowSize = windowSize / 2;
    let start, stop;

    // Position marks the middle of the calculated window
    for (let position = 1, len = seq.length; position < len; position += step) {
      // Extract DNA for window and calculate score
      start = subtractBp(seq, position, halfWindowSize);
      stop = addBp(seq, position, halfWindowSize);
      const subSeq = subSequence(seq, start, stop);
      const score = baseCalculation(type, subSeq);

      if (score > max) {
        max = score;
      }
      if (score < min) {
        min = score;
      }

      // The current position marks the middle of the calculated window.
      // Adjust the bp position to mark where the plot changes,
      // NOT the center point of the window.
      // i.e. half way between the current position and the last
      if (position === 1) {
        positions.push(1);
      } else {
        positions.push(position - (step / 2));
      }
      // positions.push(position);

      scores.push(score);
      progress = Math.round(position / len * 100);
      if ( (progress > savedProgress) && (progress % progressIncrement === 0) ) {
        savedProgress = progress;
        postMessage({ messageType: 'progress', progress: progress });
      }
    }

    // Adjust scores if scaled
    // Min value becomes 0
    // Max value becomes 1
    // Average becomes 0.5
    if (deviation === 'scale') {
      scores = scores.map( (score) => {
        if (score >= average) {
          return scaleValue(score, {min: average, max: max}, {min: 0.5, max: 1});
        } else {
          return scaleValue(score, {min: min, max: average}, {min: 0, max: 0.5});
        }
      });
      min = 0;
      max = 1;
      average = 0.5;
    }
    const baseContent = { positions: positions, scores: scores, min: min, max: max, average: average };
    postMessage({ messageType: 'complete', baseContent: baseContent });
  };

  const baseCalculation = function(type, seq) {
    if (type === 'gc-content') {
      return calcGCContent(seq);
    } else if (type === 'gc-skew') {
      return calcGCSkew(seq);
    }
  };

  const calcGCContent = function(seq) {
    if (seq.length === 0) { return  0.5; }
    const g = count(seq, 'g');
    const c = count(seq, 'c');
    return ( (g + c) / seq.length );
  };

  const calcGCSkew = function(seq) {
    const g = count(seq, 'g');
    const c = count(seq, 'c');
    if ( (g + c) === 0 ) { return 0.5; }
    // Gives value between -1 and 1
    const value = (g - c) / (g + c);
    // Scale to a value between 0 and 1
    return  0.5 + (value / 2);
  };

  const count = function(seq, pattern) {
    return (seq.match(new RegExp(pattern, 'gi')) || []).length;
  };

  /**
   * Subtract *bpToSubtract* from *position*, taking into account the sequence length
   * @param {Number} position - position (in bp) to subtract from
   * @param {Number} bpToSubtract - number of bp to subtract
   */
  const subtractBp = function(seq, position, bpToSubtract) {
    if (bpToSubtract < position) {
      return position - bpToSubtract;
    } else {
      return seq.length + position - bpToSubtract;
    }
  };

  /**
   * Add *bpToAdd* to *position*, taking into account the sequence length
   * @param {Number} position - position (in bp) to add to
   * @param {Number} bpToAdd - number of bp to add
   */
  const addBp = function(seq, position, bpToAdd) {
    if (seq.length >= (bpToAdd + position)) {
      return bpToAdd + position;
    } else {
      return position - seq.length + bpToAdd;
    }
  };

  const subSequence = function(seq, start, stop) {
    let subSeq;
    if (stop < start) {
      // subSeq = seq.substr(start - 1) + seq.substr(0, stop);
      subSeq = seq.substring(start - 1) + seq.substring(0, stop);
    } else {
      // subSeq = seq.substr(start - 1, (stop - start));
      subSeq = seq.substring(start - 1, stop);
    }
    return subSeq;
  };

  /**
   * This function scales a value from the *from* range to the *to* range.
   * To scale from [min,max] to [a,b]:
   *
   *                 (b-a)(x - min)
   *          f(x) = --------------  + a
   *                   max - min
   */
  const scaleValue = function(value, from = {min: 0, max: 1}, to = {min: 0, max: 1}) {
    return ((to.max - to.min) * (value - from.min) / (from.max - from.min)) + to.min;
  };
}

//////////////////////////////////////////////////////////////////////////////

/**
 * The Extractor creates features or plots based on the sequence
 */
class SequenceExtractor {

  /**
   * Create a Sequence Extractor
   * @param {Viewer} sequence - The sequence to extract from.
   * @param {Object} options - Options and stuff
   * @private
   */
  constructor(sequence, options = {}) {
    this.sequence = sequence;
    if (!sequence.seq) {
      throw ('Sequence invalid. The sequence must be provided.');
    }
  }

  //////////////////////////////////////////////////////////////////////////
  // MEMBERS
  //////////////////////////////////////////////////////////////////////////

  /**
   * @member {Sequence} - Get or set the sequence.
   */

  get sequence() {
    return this._sequence;
  }

  set sequence(value) {
    if (value) {
      this._sequence = value;
    }
  }

  /**
   * @member {String} - Get the seqeunce as a string
   */
  // get seqString() {
  //   return this.sequence.seq;
  // }

  /**
   * @member {String} - Get the viewer
   */
  get viewer() {
    return this.sequence.viewer;
  }

  /**
   * @member {Number} - Get the seqeunce length.
   */
  get length() {
    return this.sequence.length;
  }

  //////////////////////////////////////////////////////////////////////////
  // METHODS
  //////////////////////////////////////////////////////////////////////////

  fn2workerURL(fn) {
    const blob = new Blob([`(${fn.toString()})()`], {type: 'application/javascript'});
    return URL.createObjectURL(blob);
  }

  sequenceInput(concatenate = false) {
    let type, data;
    if (this.sequence.hasMultipleContigs && !concatenate) {
      type = 'contigs';
      data = this.sequence.contigs().map( c => c.toJSON() );
    } else {
      type = 'sequence';
      data = [ { seq: this.sequence.seq } ];
    }
    return {type: type, data: data};
  }

  extractTrackData(track, extractType, options = {}) {
    if (!utils.validate(extractType, ['start-stop-codons', 'orfs', 'gc-skew', 'gc-content'])) { return; }
    switch (extractType) {
    case 'start-stop-codons':
    case 'orfs':
      track.dataType = 'feature';
      this.generateFeatures(track, extractType, options);
      break;
    case 'gc-skew':
    case 'gc-content':
      track.dataType = 'plot';
      this.generatePlot(track, extractType, options);
      break;
    }
  }

  generateFeatures(track, extractType, options = {}) {
    if (!utils.validate(extractType, ['start-stop-codons', 'orfs'])) { return; }
    let startTime = new Date().getTime();
    const viewer = this.viewer;
    // Start worker
    const url = this.fn2workerURL(WorkerFeatureExtraction);
    const worker = new Worker(url);
    // Sequence data
    const seqInput = this.sequenceInput();
    // Prepare message
    const message = {
      type: extractType,
      // seqString: this.seqString,
      seqType: seqInput.type,
      seqData: seqInput.data,
      seqTotalLength: this.sequence.length,
      options: {
        // startPattern: utils.defaultFor(options.start, 'ATG'),
        // stopPattern: utils.defaultFor(options.stop, 'TAA,TAG,TGA'),
        // These are start/stop codons for Genetic Code Table 11
        startPattern: utils.defaultFor(options.start, 'ATG, TTG, CTG, ATT, ATC, ATA, GTG'),
        stopPattern: utils.defaultFor(options.stop, 'TAA,TAG,TGA'),
        minORFLength: utils.defaultFor(options.minORFLength, 100)
      }
    };
    worker.postMessage(message);
    worker.onmessage = (e) => {
      const messageType = e.data.messageType;
      if (messageType === 'progress') {
        // track.loadProgress = e.data.progress;
        track.update({loadProgress: e.data.progress});

        viewer.layout.drawProgress();
      }
      if (messageType === 'complete') {
        // track.loadProgress = 100;
        track.update({loadProgress: 100});
        const featureDataArray = e.data.featureDataArray;
        console.log(`Features '${extractType}' Worker Time: ${utils.elapsedTime(startTime)}` );
        startTime = new Date().getTime();
        const legends = this.createLegendItems(extractType);
        console.log(extractType);
        for (let i = 0, len = featureDataArray.length; i < len; i++) {
          featureDataArray[i].legend = legends[featureDataArray[i].type];
        }
        const features = viewer.addFeatures(featureDataArray);

        console.log(`Features '${extractType}' Creation Time: ${utils.elapsedTime(startTime)}` );
        startTime = new Date().getTime();
        track._features = features;
        track.updateSlots();
        track.triggerUpdate();
        console.log(`Features '${extractType}' Update Time: ${utils.elapsedTime(startTime)}` );
        viewer.drawFull();
      }
    };

    worker.onerror = (e) => {
      // do stuff
    };
  }


  generatePlot(track, extractType, options = {}) {
    if (!utils.validate(extractType, ['gc-content', 'gc-skew'])) { return; }
    const startTime = new Date().getTime();
    // let extractType = options.sequence;
    const viewer = this.viewer;
    // Start worker
    const url = this.fn2workerURL(WorkerBaseContent);
    const worker = new Worker(url);
    // Sequence data
    // FIXME: concatenate set to true; should come from the user
    const seqInput = this.sequenceInput(true);
    // Prepare message
    const message = {
      type: extractType,
      // seqString: this.seqString
      seqType: seqInput.type,
      seqData: seqInput.data,
      seqTotalLength: this.sequence.length,
      options: {
        window: utils.defaultFor(options.window, this.getWindowStep().window),
        step: utils.defaultFor(options.step, this.getWindowStep().step),
        deviation: utils.defaultFor(options.deviation, 'scale') // 'scale' or 'average
      }
    };
    worker.postMessage(message);
    worker.onmessage = (e) => {
      const messageType = e.data.messageType;
      if (messageType === 'progress') {
        // track.loadProgress = e.data.progress;
        track.update({loadProgress: e.data.progress});
        viewer.layout.drawProgress();
      }
      if (messageType === 'complete') {
        // track.loadProgress = 100;
        track.update({loadProgress: 100});
        const baseContent = e.data.baseContent;
        const data = { positions: baseContent.positions, scores: baseContent.scores, baseline: baseContent.average };
        data.legendPositive = this.getLegendItem(extractType, '+').name;
        data.legendNegative = this.getLegendItem(extractType, '-').name;
        data.name = extractType;
        data.extractedFromSequence = true;

        // const plot = new CGV.Plot(viewer, data);
        const plots = viewer.addPlots(data);
        track._plot = plots[0];
        track.updateSlots();
        track.triggerUpdate();
        console.log(`Plot '${extractType}' Worker Time: ${utils.elapsedTime(startTime)}` );
        viewer.drawFull();
      }
    };

    worker.onerror = (e) => {
      // do stuff
    };
  }

  createLegendItems(extractType) {
    let legends = {};
    if (extractType === 'orfs') {
      legends = {
        'ORF': this.getLegendItem('ORF')
      };
    } else if (extractType === 'start-stop-codons') {
      legends = {
        'start-codon': this.getLegendItem('start-codon'),
        'stop-codon': this.getLegendItem('stop-codon')
      };
    }
    return legends;
  }

  getLegendItem(extractType, sign) {
    const legend = this.viewer.legend;
    let item;
    switch (extractType) {
    case 'start-codon':
      item = legend.findLegendItemOrCreate('Start', 'blue', 'arc');
      break;
    case 'stop-codon':
      item = legend.findLegendItemOrCreate('Stop', 'red', 'arc');
      break;
    case 'ORF':
      item = legend.findLegendItemOrCreate('ORF', 'green', 'arc');
      break;
    case 'gc-content':
      const color = this.viewer.settings.backgroundColor.copy().invert();
      item = legend.findLegendItemOrCreate('GC Content', color);
      break;
    case 'gc-skew': {
      const color = (sign === '+') ? 'rgb(0,153,0)' : 'rgb(153,0,153)';
      const name = (sign === '+') ? 'GC Skew+' : 'GC Skew-';
      item = legend.findLegendItemOrCreate(name, color);
      break;
    }
    default:
      item = legend.findLegendItemOrCreate('Unknown', 'grey');
    }
    return item;
  }

  getWindowStep() {
    let windowSize, step;
    const length = this.length;
    if (length < 1e3 ) {
      windowSize = 10;
      step = 1;
    } else if (length < 1e4) {
      windowSize = 50;
      step = 1;
    } else if (length < 1e5) {
      windowSize = 500;
      step = 1;
    } else if (length < 1e6) {
      windowSize = 1000;
      step = 10;
    } else if (length < 1e7) {
      windowSize = 10000;
      step = 100;
    } else if (length < 1e8) {
      windowSize = 50000;
      step = 1000;
    }
    return { step: step, window: windowSize };
  }

}


// extractFeatures(options = {}) {
//   let features = new CGV.CGArray();
//   if (options.sequence === 'start-stop-codons') {
//     features = this.extractStartStops(options);
//   } else if (options.sequence === 'orfs') {
//     features = this.extractORFs(options);
//   }
//   return features
// }

// generateFeatures(track, options) {
//   if (options.sequence === 'start-stop-codons') {
//     features = this.generateStartStops(options);
//   } else if (options.sequence === 'orfs') {
//     features = this.extractORFs(options);
//   }
// }
//
//
// extractPlot(options = {}) {
//   if (options.sequence === 'gc-content') {
//     return this.extractBaseContentPlot('gc-content', options);
//   } else if (options.sequence === 'gc-skew') {
//     return this.extractBaseContentPlot('gc-skew', options);
//   }
// }
//
// // PLOTS should be bp: [1,23,30,45], score: [0, 0.4, 1]
// // score must be between 0 and 1
// extractBaseContentPlot(type, options = {}) {
//   let startTime = new Date().getTime();
//   if (!CGV.validate(type, ['gc-content', 'gc-skew'])) { return }
//   this.viewer.flash("Creating '" + type + "' Plot...");
//
//
//   options.window = CGV.defaultFor(options.window, this.getWindowStep().window);
//   options.step = CGV.defaultFor(options.step, this.getWindowStep().step);
//   let step = options.step
//   let deviation = CGV.defaultFor(options.deviation, 'scale'); // 'scale' or 'average'
//   // let deviation = CGV.defaultFor(options.deviation, 'average'); // 'scale' or 'average'
//
//   let baseContent = this.calculateBaseContent(type, options);
//   let positions = [];
//   let position;
//
//   // The current position marks the middle of the calculated window.
//   // Adjust the bp position to mark where the plot changes,
//   // NOT the center point of the window.
//   // i.e. half way between the current position and the last
//   for (let i = 0, len = baseContent.positions.length; i < len; i++) {
//     position = baseContent.positions[i];
//     if (i === 0) {
//       positions.push(1);
//     } else {
//       positions.push(position - step/2);
//     }
//   }
//   let data = { positions: positions, scores: baseContent.scores, baseline: baseContent.average };
//   data.legendPositive = this.getLegendItem(type, '+').text;
//   data.legendNegative = this.getLegendItem(type, '-').text;
//
//   let plot = new CGV.Plot(this.viewer, data);
//   console.log("Plot '" + type + "' Extraction Time: " + CGV.elapsedTime(startTime) );
//   return plot
// }


// calculateBaseContent(type, options) {
//   let windowSize = CGV.defaultFor(options.window, this.getWindowStep().window);
//   let step = CGV.defaultFor(options.step, this.getWindowStep().step);
//   let deviation = CGV.defaultFor(options.deviation, 'scale'); // 'scale' or 'average'
//   // let deviation = CGV.defaultFor(options.deviation, 'average'); // 'scale' or 'average'
//
//   let positions = [];
//   let scores = [];
//   let average =  CGV.Sequence.baseCalculation(type, this.seqString);
//   // Starting points for min and max
//   let min = 1;
//   let max = 0;
//   let halfWindowSize = windowSize / 2;
//   let start, stop;
//
//   // FIXME: not set up for linear sequences
//   // position marks the middle of the calculated window
//   for (let position = 1, len = this.length; position < len; position += step) {
//     // Extract DNA for window and calculate score
//     start = this.sequence.subtractBp(position, halfWindowSize);
//     stop = this.sequence.addBp(position, halfWindowSize);
//     let range = new CGV.CGRange(this.sequence, start, stop);
//     let seq = this.sequence.forRange(range);
//     let score = CGV.Sequence.baseCalculation(type, seq);
//
//     if (score > max) {
//       max = score;
//     }
//     if (score < min) {
//       min = score;
//     }
//
//     positions.push(position);
//     scores.push(score);
//   }
//
//   // Adjust scores if scaled
//   // Min value becomes 0
//   // Max value becomes 1
//   // Average becomes 0.5
//   if (deviation === 'scale') {
//     scores = scores.map( (score) => {
//       if (score >= average) {
//         return CGV.scaleValue(score, {min: average, max: max}, {min: 0.5, max: 1});
//       } else {
//         return CGV.scaleValue(score, {min: min, max: average}, {min: 0, max: 0.5});
//       }
//     });
//     min = 0;
//     max = 1;
//     average = 0.5;
//   }
//   return { positions: positions, scores: scores, min: min, max: max, average: average }
// }
// extractORFs(options = {}) {
//   this.viewer.flash('Finding ORFs...');
//   let startTime = new Date().getTime();
//   let features = new CGV.CGArray();
//   let type = 'ORF'
//   let source = 'orfs'
//   let minORFLength = CGV.defaultFor(options.minORFLength, 100)
//   // Get start features by reading frame
//   let startPattern = CGV.defaultFor(options.start, 'ATG')
//   let startFeatures = this.createFeaturesFromPattern(startPattern, 'start-codon', 'start-stop-codons');
//   let startsByRF = this.sequence.featuresByReadingFrame(startFeatures);
//   // Get stop features by reading frame
//   let stopPattern = CGV.defaultFor(options.stop, 'TAA,TAG,TGA');
//   let stopFeatures = this.createFeaturesFromPattern(stopPattern, 'start-codon', 'start-stop-codons');
//   let stopsByRF = this.sequence.featuresByReadingFrame(stopFeatures);
//   // Get forward ORFs
//   let position,  orfLength, range, readingFrames;
//   readingFrames = ['rfPlus1', 'rfPlus2', 'rfPlus3'];
//   let start, stop, stopIndex;
//   for (let rf of readingFrames) {
//     position = 1;
//     stopIndex = 0;
//     for (let i = 0, len_i = startsByRF[rf].length; i < len_i; i++) {
//       start = startsByRF[rf][i];
//       if (start.start < position) {
//         continue;
//       }
//       for (let j = stopIndex, len_j = stopsByRF[rf].length; j < len_j; j++) {
//         stop = stopsByRF[rf][j];
//         orfLength = stop.stop - start.start;
//         if (orfLength >= minORFLength) {
//           position = stop.stop;
//           range = new CGV.CGRange(this.sequence, start.start, stop.stop);
//           features.push( this.createFeature(range, type, 1, source ) );
//           stopIndex = j;
//           break;
//         }
//       }
//     }
//   }
//   // Get reverse ORFs
//   readingFrames = ['rfMinus1', 'rfMinus2', 'rfMinus3'];
//   for (let rf of readingFrames) {
//     stopIndex = 0;
//     position = this.sequence.length;
//     let startsByRFSorted = startsByRF[rf].order_by('start', true);
//     let stopsByRFSorted = stopsByRF[rf].order_by('start', true);
//     for (let i = 0, len_i = startsByRF[rf].length; i < len_i; i++) {
//       start = startsByRF[rf][i];
//       if (start.start > position) {
//         continue;
//       }
//       for (let j = stopIndex, len_j = stopsByRF[rf].length; j < len_j; j++) {
//         stop = stopsByRF[rf][j];
//         orfLength = start.stop - stop.start;
//         if (orfLength >= minORFLength) {
//           position = stop.start;
//           range = new CGV.CGRange(this.sequence, stop.start, start.stop);
//           features.push( this.createFeature(range, type, -1, source ) );
//           stopIndex = j;
//           break;
//         }
//       }
//     }
//   }
//   console.log('ORF Extraction Time: ' + CGV.elapsedTime(startTime) );
//   return features
// }
// extractStartStops(options = {}) {
//   this.viewer.flash('Finding Start/Stop Codons...');
//   let startTime = new Date().getTime();
//   // Forward and Reverse Starts
//   let startPattern = CGV.defaultFor(options.start, 'ATG')
//   let features = this.createFeaturesFromPattern(startPattern, 'start-codon', 'start-stop-codons');
//   // Forward and Reverse Stops
//   let stopPattern = CGV.defaultFor(options.stop, 'TAA,TAG,TGA');
//   features.merge( this.createFeaturesFromPattern(stopPattern, 'stop-codon', 'start-stop-codons'))
//   console.log('Start/Stop Extraction Time: ' + CGV.elapsedTime(startTime) );
//   return features
// }
//
// createFeaturesFromPattern(pattern, type, source) {
//   let features = new CGV.CGArray();
//   pattern = pattern.toUpperCase().split(',').map( (s) => { return s.trim() }).join('|')
//   for (let strand of [1, -1]) {
//     // let startTime = new Date().getTime();
//     let ranges = this.sequence.findPattern(pattern, strand)
//     // console.log("Find Pattern '" + pattern + "' Strand " + strand + " Time: " + CGV.elapsedTime(startTime) );
//     // let startTime = new Date().getTime();
//     for (let i = 0, len = ranges.length; i < len; i++) {
//       features.push( this.createFeature(ranges[i], type, strand, source ) );
//     }
//     // console.log("Features for Pattern '" + pattern + "' Strand " + strand + " Time: " + CGV.elapsedTime(startTime) );
//   }
//   return features.order_by('start')
// }
// createFeature(range, type, strand, source) {
//   let featureData = {
//     type: type,
//     start: range.start,
//     stop: range.stop,
//     strand: strand,
//     source: source,
//     extractedFromSequence: true
//   }
//   featureData.legend = this.getLegendItem(type).text;
//   return new CGV.Feature(this.viewer, featureData)
// }

//////////////////////////////////////////////////////////////////////////////

/**
 * The CGView Sequence represents the sequence that makes up the map.
 *
 * ### Sequence Length
 * The essential proptery of the Sequence is the length. The length must be
 * known in order to draw a map of the correct size. There are 3 ways to set
 * the Sequence length on map creation.
 * - seq: provide the sequence. The length will be set directly from the sequence.
 * - length: provide the sequence length without sequence
 * - contigs: an array of contigs. Each contig must then include its length or sequence.
 *
 * The seq and length propteries are read only and cannot be changed unless a new
 * map is loaded (see [IO.loadJSON](IO.html#loadJson). With contigs, the updateContigs and
 * moveContigs methods can be used to change the name, orienation, visbility and
 * order, however, the seq and length property of each contig is still read only.
 *
 * ### Sequence Coordinates:
 * CGView uses two coordinate systems: Contig space and map space. For features
 * and plot, positions are relative to contigs. However, when drawing we use
 * positions relative to the entire map.
 *
 * ### Action and Events
 *
 * Action                                  | Viewer Method                    | Sequence Method     | Event
 * ----------------------------------------|----------------------------------|---------------------|-----
 * [Update](../docs.html#updating-records) | -                                | [update()](#update) | sequence-update
 * [Read](../docs.html#reading-records)    | [sequence](Viewer.html#sequence) | -                   | -
 *
 * <a name="attributes"></a>
 * ### Attributes
 *
 * Attribute                        | Type      | Description
 * ---------------------------------|-----------|------------
 * [name](#name)                    | String    | Sequence name. [TODO]
 * [seq](#seq)<sup>iu</sup>         | String    | The map sequence.
 * [length](#length)<sup>iu</sup>   | Number    | The length of the sequence. This is ignored if a seq is provided. [Default: 1000]
 * [contigs](#contigs)<sup>iu</sup> | Array     | Array of contigs. Contigs are ignored if a seq is provided.
 * [font](#font)                    | String    | A string describing the font [Default: 'SansSerif, plain, 14']. See {@link Font} for details.
 * [color](#color)                  | String    | A string describing the sequence color [Default: 'black']. See {@link Color} for details.
 * [visible](CGObject.html#visible) | Boolean   | Sequence sequence is visible when zoomed in enough [Default: true]
 * [meta](CGObject.html#meta)       | Object    | [Meta data](../tutorials/details-meta-data.html)
 * 
 * <sup>iu</sup> Ignored on Sequence update
 *
 * ### Examples
 *
 * @extends CGObject
 */
 // TODO: Add Image of map with contigs. Show contig/map space
class Sequence extends CGObject {

  /**
   * Create a Sequence
   * @param {Viewer} viewer - The viewer
   * @param {Object} options - [Attributes](#attributes) used to create the sequence
   * @param {Object} [meta] - User-defined [Meta data](../tutorials/details-meta-data.html) to add to the sequence
   *
   */
  // Implementation notes:
  //   - Internally contigs are always used. If 'seq' is provided, it will be converted to a single contig.
  //   - All the contigs are concatenated into a single contig called mapContig.
  //     -  Sequence.seq === Sequence.mapContig.seq
  //   - If there is only one contig then Sequence.mapContig === Sequence.contigs(1)
  //   - Make note in update/updateContig methods that if only one contig is provided (or the sequence seq), they are treated the same internally. Therefore, if the contig name is changed, so is the sequence name.
  //   - Note for toJSON: will output single contigs as attributes of the sequence (so no contigs property)
  constructor(viewer, options = {}, meta = {}) {
    super(viewer, options, meta);
    this._viewer = viewer;
    this.bpMargin = 2;
    this.color = utils.defaultFor(options.color, 'black');
    this.font = utils.defaultFor(options.font, 'sans-serif, plain, 14');

    this._contigs = new CGArray();

    this.createMapContig(options);

    this.viewer.trigger('sequence-update', { attributes: this.toJSON({includeDefaults: true}) });
  }

  //////////////////////////////////////////////////////////////////////////
  // STATIC CLASSS METHODS
  //////////////////////////////////////////////////////////////////////////
  /**
   * Common method for extracting sequence based on a range
   * range can be a CGRange or any object with a start and stop attribute.
   * @param {String} seq - The sequence as a string
   * @param {Range} range - Range to extract seqence for
   * @param {Boolean} revComp - If true, the returned sequence will be the reverse compliment
   * @return {String}
   * @private
   */
  static forRange(seq, range, revComp=false) {
    const start = range && range.start;
    const stop = range && range.stop;
    if (!seq || !start || !stop) {return;}
    let extract = '';
    if (stop < start) {
      // Range wraps around
      extract = seq.substring(start - 1) + seq.substring(0, stop);
    } else {
      extract = seq.substring(start - 1, stop);
    }
    if (revComp) {
      extract = Sequence.reverseComplement(extract);
    }
    return extract;
  }

  // TODO: Take into account lower case letters
  /**
   * Return the Complement the sequence
   * @return {String} - 'Sequence'
   * @static
   */
  static complement(seq) {
    let compSeq = '';
    let char, compChar;
    for (let i = 0, len = seq.length; i < len; i++) {
      char = seq.charAt(i);
      switch (char) {
      case 'A':
        compChar = 'T';
        break;
      case 'T':
        compChar = 'A';
        break;
      case 'G':
        compChar = 'C';
        break;
      case 'C':
        compChar = 'G';
        break;
      case 'U':
        compChar = 'A';
        break;
      case 'Y':
        compChar = 'R';
        break;
      case 'S':
        compChar = 'S';
        break;
      case 'W':
        compChar = 'W';
        break;
      case 'K':
        compChar = 'M';
        break;
      case 'M':
        compChar = 'K';
        break;
      case 'B':
        compChar = 'V';
        break;
      case 'D':
        compChar = 'H';
        break;
      case 'H':
        compChar = 'D';
        break;
      case 'V':
        compChar = 'B';
        break;
      case 'N':
        compChar = 'N';
        break;
      }
      compSeq = compSeq + compChar;
    }
    return compSeq;
  }

  static baseCalculation(type, seq) {
    if (type === 'gc-content') {
      return Sequence.calcGCContent(seq);
    } else if (type === 'gc-skew') {
      return Sequence.calcGCSkew(seq);
    }
  }

  static calcGCContent(seq) {
    if (seq.length === 0) { return  0.5; }
    const g = Sequence.count(seq, 'g');
    const c = Sequence.count(seq, 'c');
    return ( (g + c) / seq.length );
  }

  static calcGCSkew(seq) {
    const g = Sequence.count(seq, 'g');
    const c = Sequence.count(seq, 'c');
    if ( (g + c) === 0 ) { return 0.5; }
    // Gives value between -1 and 1
    const value = (g - c) / (g + c);
    // Scale to a value between 0 and 1
    return  0.5 + (value / 2);
  }

  static reverseComplement(seq) {
    return Sequence.complement( seq.split('').reverse().join('') );
  }

  static count(seq, pattern) {
    return (seq.match(new RegExp(pattern, 'gi')) || []).length;
  }

  /**
   * Create a random sequence of the specified length
   * @param {Number} length - The length of the sequence to create
   * @return {String}
   */
  static random(length) {
    let seq = '';
    let num;
    for (let i = 0; i < length; i++) {
      num = Math.floor(Math.random() * 4);
      switch (num % 4) {
      case 0:
        seq += 'A';
        break;
      case 1:
        seq += 'T';
        break;
      case 2:
        seq += 'G';
        break;
      case 3:
        seq += 'C';
      }
    }
    return seq;
  }

  reverseComplement() {
    return Sequence.reverseComplement(this.seq);
  }

  count(pattern) {
    return Sequence.count(this.seq, pattern);
  }

  //////////////////////////////////////////////////////////////////////////
  // MEMBERS
  //////////////////////////////////////////////////////////////////////////

  /**
   * Return the class name as a string.
   * @return {String} - 'Sequence'
   */
  toString() {
    return 'Sequence';
  }

  /**
   * @member {String} - Get or set the seqeunce.
   */
  get seq() {
    // return this._seq;
    return this.mapContig.seq;
  }

  // set seq(value) {
  //   this._seq = value;
  //   if (this._seq) {
  //     this._seq = this._seq.toUpperCase();
  //     this._length = value.length;
  //     this._updateScale();
  //     this._sequenceExtractor = new SequenceExtractor(this);
  //   } else {
  //     this._sequenceExtractor = undefined;
  //   }
  // }

  /**
   * @member {Contig} - This is used internally to represent the entire map sequence.
   *   It is generated by the supplied seq or the concatenation of all the contigs.
   *   The Sequence.seq (or length) is the same as Sequence.mapContig.seq (or length).
   */
  get mapContig() {
    return this._mapContig;
  }

  /**
   * @member {Number} - Get the SeqeunceExtractor. Only available if the *seq* property is set.
   * @private
   */
  get sequenceExtractor() {
    return this._sequenceExtractor;
  }

  /**
   * @member {Number} - Get or set the seqeunce length. If the *seq* property is set, the length can not be adjusted.
   */
  get length() {
    // return this._length;
    return this.mapContig.length;
  }

  // set length(value) {
  //   if (value) {
  //     if (!this.seq) {
  //       this._length = Number(value);
  //       this._updateScale();
  //     } else {
  //       console.error('Can not change the sequence length if *seq* is set.');
  //     }
  //   }
  // }

  _updateScale() {
    // this.viewer.layout.updateBPScale(this.length);
    this.viewer.layout.updateScales();
    // this.canvas.scale.bp = d3.scaleLinear()
    //   .domain([1, this.length])
    //   .range([-1 / 2 * Math.PI, 3 / 2 * Math.PI]);
    // this.viewer._updateZoomMax();
    // console.log(this.canvas.scale)
  }

  /**
   * @member {Color} - Get or set the backbone color. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
   */
  get color() {
    return this._color;
  }

  set color(value) {
    if (value.toString() === 'Color') {
      this._color = value;
    } else {
      this._color = new Color(value);
    }
  }

  /**
   * @member {Font} - Get or set sequence font. When setting the font, a string representing the font or a {@link Font} object can be used. For details see {@link Font}.
   */
  get font() {
    return this._font;
  }

  set font(value) {
    if (value.toString() === 'Font') {
      this._font = value;
    } else {
      this._font = new Font(value);
    }
    this.bpSpacing = this.font.size;
  }

  /**
   * @member {Number} - Get or set the basepair spacing.
   * @private
   */
  get bpSpacing() {
    return this._bpSpacing;
  }

  set bpSpacing(value) {
    this._bpSpacing = value;
    this.viewer._updateZoomMax();
  }

  /**
   * @member {Number} - Get or set the margin around sequence letters.
   * @private
   */
  get bpMargin() {
    return this._bpMargin;
  }

  set bpMargin(value) {
    this._bpMargin = value;
  }

  /**
   * @member {Number} - Get the thick required to draw the sequence. Based on bpMargin and bpSpacing.
   * @private
   */
  get thickness() {
    return (this.bpSpacing * 2) + (this.bpMargin * 8);
  }

  get isLinear() {
    return false;
  }

  get isCircular() {
    return true;
  }

  /**
   * @member {Boolean} - Return true of a sequence is available. Returns false if there is only a length.
   */
  get hasSeq() {
    return typeof this.seq === 'string';
  }

  /**
   * @member {Boolean} - Return true if the sequence consists of muliple contigs.
   */
  get hasMultipleContigs() {
    return this._contigs.length > 1;
  }


  // loadContigs(contigs) {
  //   // Create contigs
  //   for (const contigData of contigs) {
  //     const contig = new Contig(this, contigData);
  //     this._contigs.push(contig);
  //   }
  //   this.updateFromContigs();
  // }

  /**
   * Add one or more [contigs](Contig.html) (see [attributes](Contig.html#attributes)).
   * See [adding records](../docs.html#s.adding-records) for details.
   * @param {Object|Array} data - Object or array of objects describing the contigs
   * @return {CGArray<Contig>} CGArray of added contigs
   */
  addContigs(contigData = []) {
    contigData = CGArray.arrayerize(contigData);
    const contigs = contigData.map( (data) => {
      const contig = new Contig(this, data);
      this._contigs.push(contig);
      return contig;
    });
    this.updateMapContig();
    this.viewer.trigger('contigs-add', contigs);
    // this.updateFromContigs();
    return contigs;
    // Check for sequence or length
    // Can probably just add the sequence or length, instead of calling updateFromContigs
    // Update Plots
    // this.updateFromContigs()
  }

  /**
   * Remove contigs.
   * See [removing records](../docs.html#s.removing-records) for details.
   * Notes:
   * - Removing contigs, will remove the features associated with the contig
   * - This will only work with contigs in Sequence.contigs(). It will not remove the mapContig.
   * - Will not remove last contig. If removing all contigs, the last contig will not be removed.
   * @param {Contig|Array} contigs - Contig or a array of contigs to remove
   */
  // TODO: deal with plots
  removeContigs(contigs) {
    contigs = CGArray.arrayerize(contigs).slice();
    // Do not remove last contig
    if (contigs.length === this._contigs.length) {
      const lastContig = contigs.pop();
      console.error('The last contig can not be removed. Keeping:', lastContig);
    }
    if (contigs.length > 0) {
      // First remove features
      const features = contigs.map( c => c.features() ).flat();
      this.viewer.removeFeatures(features);
      // Remove contigs
      this._contigs = this._contigs.filter( c => !contigs.includes(c) );
      // Remove from Objects
      contigs.forEach( c => c.deleteFromObjects() );
      this.updateMapContig();
    }

    this.viewer.trigger('contigs-remove', contigs);
  }

  /**
   * Update [attributes](Contig.html#attributes) for one or more contigs.
   * See [updating records](../docs.html#s.updating-records) for details.
   * @param {Contig|Array|Object} contigsOrUpdates - Contig, array of contigs or object describing updates
   * @param {Object} attributes - Object describing the properties to change
   */
  updateContigs(contigsOrUpdates, attributes) {
    const { records: contigs, updates } = this.viewer.updateRecords(contigsOrUpdates, attributes, {
      recordClass: 'Contig',
      validKeys: ['name', 'orientation', 'color', 'visible']
    });

    // FIXME: this should only update if orientation, order or visible changes
    this.updateMapContig();
    // TRYING THIS OUT
    for (const track of this.viewer.tracks()) {
      track.refresh();
    }
    this.viewer.annotation.refresh();
    // FIXME: Only trigger contigs if visibiliy changes
    this.viewer.trigger('tracks-update', { tracks: this.viewer.tracks() });
    // TODO: refresh sequence, features, etc
    this.viewer.trigger('contigs-update', { contigs, attributes, updates });
  }

  /**
   * Move a contig from one index to a new one
   * @param {Number} oldIndex - Index of contig to move (0-based)
   * @param {Number} newIndex - New index for the contig (0-based)
   */
  moveContig(oldIndex, newIndex) {
    this._contigs.move(oldIndex, newIndex);
    // FIXME: UPDATE OFFSET AND RANGES
    // FIXME: UPDATE Sequence Plot Extractors
    this.updateMapContig();

    // TRYING THIS OUT
    for (const track of this.viewer.tracks()) {
      track.refresh();
    }
    this.viewer.annotation.refresh();

    this.viewer.trigger('contigs-moved', {oldIndex: oldIndex, newIndex: newIndex});

    // Calling contigs-update as well.
    // Because each contig between oldIndex and newIndex will have there order/index changed
    const contigs = [];
    const start = Math.min(oldIndex, newIndex);
    const len = Math.max(oldIndex, newIndex);
    for (let i = start; i <= len; i++) {
      contigs.push(this._contigs[i]);
    }
    this.viewer.trigger('contigs-update', { contigs, attributes: {} });
  }


  // Order of importance:
  // 1) seq
  // 2) contigs
  //   a) seq
  //   b) length
  // 3) length
  // 4) Default: length 1000 bp
  createMapContig(data) {
    if (data.seq) {
      // this._mapContig = new Contig(this, data);
      this.addContigs([{seq: data.seq}]);
    } else if (data.contigs) {
      this.addContigs(data.contigs);
    } else if (data.length) {
      this.addContigs([{length: data.length}]);
    } else {
      // console.error('A "seq", "contigs", or "length" must be provided');
      this.addContigs([{length: 1000}]);
    }
  }

  updateMapContig() {
    if (this._contigs.length === 1) {
      this._mapContig = this._contigs[0];
      this._mapContig._index = 1;
      this._mapContig._updateLengthOffset(0);
    } else {
      // Concatenate contigs
      // The contigs can't have a mixture of sequence and length
      // Check first contig to see if it contains a sequence or length
      const useSeq = this._contigs[0].hasSeq;
      let seq = '';
      let length = 0;
      for (let i = 0, len = this._contigs.length; i < len; i++) {
        const contig = this._contigs[i];
        contig._index = i + 1;
        if (!contig.visible) {continue;}

        contig._updateLengthOffset(length);

        if (useSeq) {
          if (contig.hasSeq) {
            seq += contig.seq;
            length += contig.seq.length;
          } else {
            console.error(`Expecting Sequence but Contig '${contig.name}' has no sequence !`);
          }
        } else {
          if (contig.length) {
            length += contig.length;
          } else {
            console.error(`Expecting Length but Contig '${contig.name}' has no length!`);
          }
        }
      }
      const oldMapContig = this.mapContig;
      // Create new mapContig
      const data = (useSeq) ? {seq} : {length};
      this._mapContig = new Contig(this, data);
      // Move features from previous mapContig to new mapContig
      if (oldMapContig) {
        oldMapContig.features().forEach( f => f.contig = this.mapContig  );
        oldMapContig.deleteFromObjects();
      }
    }
    this._sequenceExtractor = (this.hasSeq) ? new SequenceExtractor(this) : undefined;
    this._updateScale();
  }

  // updateFromContigs() {
  //   if (this._contigs.length === 0) {
  //     this.seq = '';
  //     return;
  //   }
  //   // Check first contig to see if it contains a sequence or length
  //   const useSeq = this._contigs[0].hasSeq;
  //   let seq = '';
  //   let length = 0;
  //   for (let i = 0, len = this._contigs.length; i < len; i++) {
  //     const contig = this._contigs[i];
  //     contig._index = i + 1;
  //     contig._updateLengthBefore(length);
  //
  //     if (useSeq) {
  //       if (contig.hasSeq) {
  //         seq += contig.seq;
  //         length += contig.seq.length;
  //       } else {
  //         console.error(`Expecting Sequence but Contig ${this.name} [${this.id}] has no sequence !`)
  //       }
  //     } else {
  //       if (contig.length) {
  //         length += contig.length;
  //       } else {
  //         console.error(`Expecting Length but Contig ${this.name} [${this.id}] has no length!`)
  //       }
  //     }
  //   }
  //   // Create sequence
  //   if (useSeq) {
  //     this.seq = seq;
  //   } else {
  //     this.length = length;
  //   }
  // }

  /**
   * Returns a [CGArray](CGArray.html) of contigs or a single contig.
   * See [reading records](../docs.html#s.reading-records) for details.
   * @param {Integer|String|Array} term - See [CGArray.get](CGArray.html#get) for details.
   * @return {Contig|CGArray}
   */
  contigs(term) {
    return this._contigs.get(term);
  }

  /**
   * Returns all the visible contigs that overlap the given range using map coordinates.
   * @param {CGRange} range - Range to find overlapping contigs.
   * @return {CGArray} CGArray of Contigs
   * @private
   */
  contigsForMapRange(range) {
    const contigs = new CGArray();
    for (let i = 1, len = this.sequence.contigs().length; i <= len; i++) {
      const contig = this.sequence.contigs(i);
      if (contig.visible && range.overlapsMapRange(contig.mapRange)) {
        contigs.push(contig);
      }
    }
    return contigs;
  }

  /**
   * Return the map bp position given a local *bp* on the given *contig*.
   * @param {Contig} contig - Contig object
   * @param {Number} bp - bp position on the contig
   * @return {Number} map position.
   * @private
   */
  bpForContig(contig, bp = 1) {
    return contig.mapStart + bp - 1;
  }

  /**
   * Return the contig for the given map bp.
   * @return {Contig}
   * @private
   */
  contigForBp(bp) {
    // FIXME: could be sped up with a binary search
    if (this.hasMultipleContigs) {
      for (let i = 0, len = this._contigs.length; i < len; i++) {
        if (bp <= this._contigs[i].lengthOffset) {
          return this._contigs[i - 1];
        }
      }
      // Must be in last contig
      return this._contigs[this._contigs.length - 1];
    }
  }

  /**
   * Create FASTA string for the sequence.
   * @param {String} id - ID line for FASTA (i.e. text after '>'). Only used if there is one contig or concatenateContigs is true.
   * @param {Object} options - Options: concatenateContigs
   */
  // id is not used if there are multiple contigs and we are not concatenating them
  asFasta(id, options = {}) {
    const concatenate = options.concatenateContigs;
    if (concatenate || !this.hasMultipleContigs) {
      const name = id || this.contigs(1).name;
      return `>${name}\n${this.seq}`;
    } else {
      let fasta = '';
      for (const contig of this._contigs) {
        fasta += `${contig.asFasta()}\n`;
      }
      return fasta;
    }
  }

  lengthOfRange(start, stop) {
    if (stop >= start) {
      return stop - start;
    } else {
      return this.length + (stop - start);
    }
  }

  /**
   * Subtract *bpToSubtract* from *position*, taking into account the sequence length
   * @param {Number} position - position (in bp) to subtract from
   * @param {Number} bpToSubtract - number of bp to subtract
   * @private
   */
  subtractBp(position, bpToSubtract) {
    if (bpToSubtract < position) {
      return position - bpToSubtract;
    } else {
      return this.length + position - bpToSubtract;
    }
  }

  /**
   * Add *bpToAdd* to *position*, taking into account the sequence length
   * @param {Number} position - position (in bp) to add to
   * @param {Number} bpToAdd - number of bp to add
   * @private
   */
  addBp(position, bpToAdd) {
    if (this.length >= (bpToAdd + position)) {
      return bpToAdd + position;
    } else {
      return position - this.length + bpToAdd;
    }
  }

  /**
   * Constrains the supplied *bp* to be between 1 and the sequence length.
   *  - If the bp is less than 1: 1 is returned.
   *  - If greater than the sequence length: sequence length is returned.
   *  - Otherwise the supplied bp is returned.
   * @param {Number} bp - position (in bp)
   * @private
   */
  constrain(bp) {
    return utils.constrain(bp, 1, this.length);
  }

  /**
   * Return the sequence for the *range*
   *
   * @param {Range} range - the range for which to return the sequence
   * @param {Boolean} revComp - If true return the reverse complement sequence
   * @return {String}
   */
  forRange(range, revComp) {
    let seq;
    if (this.seq) {
      seq = Sequence.forRange(this.seq, range, revComp);
      // if (range.isWrapped()) {
      //   // seq = this.seq.substr(range.start - 1) + this.seq.substr(0, range.stop);
      //   seq = this.seq.substring(range.start - 1) + this.seq.substring(0, range.stop);
      // } else {
      //   // seq = this.seq.substr(range.start - 1, range.length + 1);
      //   seq = this.seq.substring(range.start - 1, range.stop);
      // }
    } else {
      // FIXME: For now return fake sequence
      seq = this._fakeSequenceForRange(range);
    }
    return seq;
  }

  // FAKE method to get sequence
  _fakeSequenceForRange(range) {
    let seq = '';
    let bp = range.start;
    for (let i = 0, len = range.length; i < len; i++) {
      switch (bp % 4) {
      case 0:
        seq += 'A';
        break;
      case 1:
        seq += 'T';
        break;
      case 2:
        seq += 'G';
        break;
      case 3:
        seq += 'C';
      }
      bp++;
    }
    return seq;
  }

  /**
   * Returns an array of Ranges where the pattern was located. The pattern can be a RegEx or a String.
   * This method will return overlapping matches.
   * @param {String} pattern - RegEx or String Pattern to search for.
   * @return {Array)
   * @private
   */
  findPattern(pattern, strand = 1) {
    const re = new RegExp(pattern, 'g');
    const ranges = [];
    let match, start;
    const seq = (strand === 1) ? this.seq : this.reverseComplement();
    while ( (match = re.exec(seq)) !== null) {
      start = (strand === 1) ? (match.index + 1) : (this.length - match.index - match[0].length + 1);
      ranges.push( new CGRange(this.mapContig, start, start + match[0].length - 1 ) );
      re.lastIndex = match.index + 1;
    }
    return ranges;
  }


  featuresByReadingFrame(features) {
    const featuresByRF = {
      rfPlus1: new CGArray(),
      rfPlus2: new CGArray(),
      rfPlus3: new CGArray(),
      rfMinus1: new CGArray(),
      rfMinus2: new CGArray(),
      rfMinus3: new CGArray()
    };
    let rf;
    features.each( (i, feature) => {
      if (feature.strand === -1) {
        rf = (this.length - feature.stop + 1) % 3;
        if (rf === 0) { rf = 3; }
        featuresByRF[`rfMinus${rf}`].push(feature);
      } else {
        rf = feature.start % 3;
        if (rf === 0) { rf = 3; }
        featuresByRF[`rfPlus${rf}`].push(feature);
      }
    });
    return featuresByRF;
  }

  _emptySequence(length) {
    // ES6
    // return '•'.repeat(length);
    return Array(length + 1).join('•');
  }

  draw() {
    if (!this.visible) { return; }
    const ctx = this.canvas.context('map');
    const backbone = this.viewer.backbone;
    const pixelsPerBp = backbone.pixelsPerBp();
    const seqZoomFactor = 0.25; // The scale at which the sequence will first appear.
    if (pixelsPerBp < (this.bpSpacing - this.bpMargin) * seqZoomFactor) { return; }

    const scaleFactor = Math.min(1, pixelsPerBp / (this.bpSpacing - this.bpMargin));

    const centerOffset = backbone.adjustedCenterOffset;
    const range = backbone.visibleRange;
    let seq, complement;
    if (range) {
      if (this.seq) {
        seq = this.forRange(range);
        complement = Sequence.complement(seq);
      } else {
        seq = this._emptySequence(range.length);
        complement = this._emptySequence(range.length);
      }
      let bp = range.start;
      ctx.save();
      ctx.fillStyle = this.color.rgbaString;
      ctx.font = this.font.cssScaled(scaleFactor);
      ctx.textAlign = 'center';
      // ctx.textBaseline = 'middle';
      ctx.textBaseline = 'alphabetic'; // The default baseline works best across canvas and svg
      const yOffset = (this.font.height * scaleFactor / 2) - 1;
      // Distance from the center of the backbone to place sequence text
      const centerOffsetDiff = ((this.bpSpacing / 2) + this.bpMargin) * scaleFactor;
      for (let i = 0, len = range.length; i < len; i++) {
        let origin = this.canvas.pointForBp(bp, centerOffset + centerOffsetDiff);
        // if (i == 0) { console.log(bp, origin)}
        // ctx.fillText(seq[i], origin.x, origin.y);
        ctx.fillText(seq[i], origin.x, origin.y + yOffset);
        origin = this.canvas.pointForBp(bp, centerOffset - centerOffsetDiff);
        // ctx.fillText(complement[i], origin.x, origin.y);
        ctx.fillText(complement[i], origin.x, origin.y + yOffset);
        bp++;
      }
      ctx.restore();
    }
  }

  invertColors() {
    this.update({
      color: this.color.invert().rgbaString
    });
  }

  /**
   * Update sequence [attributes](#attributes).
   * See [updating records](../docs.html#s.updating-records) for details.
   * @param {Object} attributes - Object describing the properties to change
   */
  update(attributes) {
    this.viewer.updateRecords(this, attributes, {
      recordClass: 'Sequence',
      validKeys: ['color', 'font', 'visible']
    });
    this.viewer.trigger('sequence-update', { attributes });
  }

  /**
   * Returns JSON representing the object
   */
  toJSON(options = {}) {
    const json = {
      font: this.font.string,
      color: this.color.rgbString,
      contigs: this._contigs.map( c => c.toJSON(options) )
    };
    // Optionally add default values
    if (!this.visible || options.includeDefaults) {
      json.visible = this.visible;
    }
    return json;
  }

}


// testRF(features) {
//   let startTime, rf;
//   startTime = new Date().getTime();
//   let rf1 = this.featuresByReadingFrame(features);
//   console.log("READING FRAME Normal Creation Time: " + CGV.elapsedTime(startTime) );
//   // SETUP
//   features.each( (i, feature) => {
//     if (feature.strand === -1) {
//       rf = (this.length - feature.stop + 1) % 3;
//       if (rf === 0) { rf = 3; }
//       feature.rf = rf;
//     } else {
//       rf = feature.start % 3;
//       if (rf === 0) { rf = 3; }
//       feature.rf = rf;
//     }
//   });
//   startTime = new Date().getTime();
//   let rf2 = {
//     rfPlus1: new CGV.CGArray( features.filter( (f) => { return f.rf === 1  && f.strand === 1})),
//     rfPlus2: new CGV.CGArray( features.filter( (f) => { return f.rf === 2  && f.strand === 1})),
//     rfPlus3: new CGV.CGArray( features.filter( (f) => { return f.rf === 3  && f.strand === 1})),
//     rfMinus1: new CGV.CGArray( features.filter( (f) => { return f.rf === 1  && f.strand === -1})),
//     rfMinus2: new CGV.CGArray( features.filter( (f) => { return f.rf === 2  && f.strand === -1})),
//     rfMinus3: new CGV.CGArray( features.filter( (f) => { return f.rf === 3  && f.strand === -1}))
//   };
//   console.log("READING FRAME NEW Creation Time: " + CGV.elapsedTime(startTime) );
//   return rf2;
// }

//////////////////////////////////////////////////////////////////////////////

/**
 * The Contig class contains details for a single contig.
 *
 * ### Action and Events
 *
 * Action                                     | Sequence Method                                | Contig Method       | Event
 * -------------------------------------------|------------------------------------------------|---------------------|-----
 * [Add](../docs.html#adding-records)         | [addContigs()](Sequence.html#addContigs)       | -                   | contigs-add
 * [Update](../docs.html#updating-records)    | [updateContigs()](Sequence.html#updateContigs) | [update()](#update) | contigs-update
 * [Remove](../docs.html#removing-records)    | [removeContigs()](Sequence.html#removeContigs) | [remove()](#remove) | contigs-remove
 * [Reorder](../docs.html#reordering-records) | [moveContig()](Sequence.html#moveContig)       | [move()](#move)     | contigs-reorder
 * [Read](../docs.html#reading-records)       | [contigs()](Sequence.html#contigs)             | -                   | -
 *
 * <a name="attributes"></a>
 * ### Attributes
 *
 * Attribute                        | Type      | Description
 * ---------------------------------|-----------|------------
 * [name](#name)                    | String    | Contig name.
 * [seq](#seq)<sup>iu</sup>         | String    | The contig sequence.
 * [length](#length)<sup>iu</sup>   | Number    | The length of the sequence. This is ignored if a seq is provided.
 * [orientation](#orientation)      | String    | '+' for forward orientation and '-' for the reverse.
 * [color](#color)                  | Color     | A string describing the color [Default: 'black']. See {@link Color} for details.
 * [visible](CGObject.html#visible) | Boolean   | Contig is visible [Default: true].
 * [meta](CGObject.html#meta)       | Object    | [Meta data](../tutorials/details-meta-data.html)
 * 
 * <sup>iu</sup> Ignored on Contig update
 *
 * @extends CGObject
 */
class Contig extends CGObject {

  /**
   * Create a Contig
   * @param {Viewer} viewer - The viewer
   * @param {Object} options - [Attributes](#attributes) used to create the contig
   * @param {Object} [meta] - User-defined [Meta data](../tutorials/details-meta-data.html) to add to the contig
   */
  constructor(sequence, options = {}, meta = {}) {
    super(sequence.viewer, options, meta);
    this._sequence = sequence;
    this._viewer = sequence.viewer;

    // this.id = utils.defaultFor(options.id, this.cgvID);
    // this.name = utils.defaultFor(options.name, this.id);
    this.name = utils.defaultFor(options.name, '');
    this.orientation = utils.defaultFor(options.orientation, '+');
    this.seq = options.seq;
    this.color = options.color;
    this._features = new CGArray();
    this._updateLengthOffset(0);

    if (!this.seq) {
      this.length = options.length;
    }
    if (!this.length) {
      console.error(`Contig '${this.name}'  has no sequence or length set!`);
    }

  }

  //////////////////////////////////////////////////////////////////////////
  // STATIC
  //////////////////////////////////////////////////////////////////////////

  /**
   * Removes supplied features from their contigs
   * @private
   */
  static removeFeatures(features) {
    features = CGArray.arrayerize(features);
    if (features.length === 0) { return }
    const viewer = features[0].viewer;
    const contigMap = {};
    for (const feature of features) {
      const cgvID = feature.contig && feature.contig.cgvID;
      if (cgvID) {
        contigMap[cgvID] ? contigMap[cgvID].push(feature) : contigMap[cgvID] = [feature];
      }
    }
    const cgvIDs = Object.keys(contigMap);
    for (const cgvID of cgvIDs) {
      const contig = viewer.objects(cgvID);
      contig._features = contig._features.filter ( f => !contigMap[cgvID].includes(f) );
    }
  }

  //////////////////////////////////////////////////////////////////////////
  // MEMBERS
  //////////////////////////////////////////////////////////////////////////

  /**
   * Return the class name as a string.
   * @return {String} - 'Contig'
   */
  toString() {
    return 'Contig';
  }

  /**
   * @member {String} - Get the sequence.
   */
  get sequence() {
    return this._sequence;
  }

  // /**
  //  * @member {String} - Get or set the contig ID. Must be unique for all contigs
  //  */
  // get id() {
  //   return this._id;
  // }
  //
  // set id(value) {
  //   // TODO: Check if id is unique
  //   this._id = value;
  // }

  /**
   * @member {String} - Get or set the contig name.
   * When setting a name, if it's not unique it will be appended with a number.
   * For example, if 'my_name' already exists, it will be changed to 'my_name-2'.
   */
  get name() {
    return this._name;
  }

  set name(value) {
    // this._name = value;
    const valueString = `${value}`;
    const allNames = this.sequence._contigs.map( i => i.name);
    this._name = utils.uniqueName(valueString, allNames);
    if (this._name !== valueString) {
      console.log(`Contig with name '${valueString}' already exists, using name '${this._name}' instead.`);
    }
  }

  /**
   * @member {Number} - Returns true if this contig is the mapContig
   */
  get isMapContig() {
    return (this.sequence.mapContig === this);
  }

  /**
   * @member {Number} - Get the contig index (base-1) in relation to all the other contigs.
   */
  get index() {
    return this._index;
  }

  /**
   * @member {String} - Get or set the contig orientation. Value must be '+' or '-'.
   *   Flipping the orienation will reverse complement the contig sequence and
   *   adjust all the features on this contig.
   */
  get orientation() {
    return this._orientation;
  }

  set orientation(value) {
    const validKeys = ['-', '+'];
    if (!utils.validate(value, validKeys)) { return; }
    if (this._orientation && (value !== this._orientation)) {
      this.reverseFeatureOrientations();
    }
    if (this.seq) {
      this.seq = this.reverseComplement();
    }
    this._orientation = value;
    // FIXME: reverse complement the sequence
  }

  /**
   * @member {String} - Get or set the seqeunce.
   */
  get seq() {
    return this._seq;
  }

  set seq(value) {
    this._seq = value;
    if (this._seq) {
      this._seq = this._seq.toUpperCase();
      this._length = value.length;
      // TODO: check if features still fit, if the length is reduced
    }
  }

  /**
   * @member {Number} - Get or set the sequence length. If the *seq* property is set, the length can not be adjusted.
   */
  get length() {
    return this._length;
  }

  set length(value) {
    if (value) {
      if (!this.seq) {
        this._length = Number(value);
        this.sequence._updateScale();
        // TODO: check if features still fit, if the length is reduced
      } else {
        console.error('Can not change the sequence length if *seq* is set.');
      }
    }
  }

  /**
   * @member {Number} - Get the length of all the contigs before this one.
   */
  get lengthOffset() {
    return this._lengthOffset;
  }

  /**
   * @member {Color} - Get or set the color. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
   */
  get color() {
    return this._color;
  }

  set color(color) {
    if (color === undefined) {
      this._color = undefined;
    } else if (color.toString() === 'Color') {
      this._color = color;
    } else {
      this._color = new Color(color);
    }
  }

  /**
   * @member {CGRange} - Get the range of the contig in relation to the entire map.
   *   The range start is the total length of the contigs before this one plus 1.
   *   The range stop is the total length of the contigs before this one plus this contigs length.
   */
  get mapRange() {
    // FIXME: this need to be stored better
    // return this._mapRange;
    return new CGRange(this.sequence.mapContig, this.lengthOffset + 1, this.lengthOffset + this.length);
  }

  /**
   * @member {Number} - Get the start position (bp) of the contig in relation to the entire map.
   *   The start is the total length of the contigs before this one plus 1.
   */
  get mapStart() {
    return this.mapRange.start;
  }

  /**
   * @member {Number} - Get the stop position (bp) of the contig in relation to the entire map.
   *   The stop is the total length of the contigs before this one plus this contigs length.
   */
  get mapStop() {
    return this.mapRange.stop;
  }

  /**
   * Updates the lengthOffset for this contig and also update the mapRange.
   * @param {length} - Total length of all the contigs before this one.
   * @private
   */
  _updateLengthOffset(length) {
    this._lengthOffset = length;
    // this._mapRange = new CGV.CGRange(this.sequence.mapContig, length + 1, length + this.length);
  }

  /**
   * Reverse complement the sequence of this contig
   */
  reverseComplement() {
    return Sequence.reverseComplement(this.seq);
  }

  /**
   * Update contig [attributes](#attributes).
   * See [updating records](../docs.html#s.updating-records) for details.
   * @param {Object} attributes - Object describing the properties to change
   */
  update(attributes) {
    this.sequence.updateContigs(this, attributes);
  }

  /**
   * @member {Boolean} - Return true of this contig has a sequence
   */
  get hasSeq() {
    return typeof this.seq === 'string';
  }

  /**
   * Returns an [CGArray](CGArray.html) of Features or a single Feature from all the features on this Contig.
   * @param {Integer|String|Array} term - See [CGArray.get](CGArray.html#get) for details.
   * @return {CGArray}
   */
  features(term) {
    return this._features.get(term);
  }

  /**
   * Remove the Contig from the Sequence
   */
  remove() {
    this.sequence.removeContigs(this);
  }

  /**
   * Move this contig to a new index in the array of Sequence contigs.
   * @param {Number} newIndex - New index for this caption (0-based)
   */
  move(newIndex) {
    const currentIndex = this.sequence.contigs().indexOf(this);
    this.sequence.moveContig(currentIndex, newIndex);
  }

  /**
   * Zoom and pan map to show the contig
   * @param {Number} duration - Length of animation
   * @param {Object} ease - The d3 animation ease [Default: d3.easeCubic]
   */
  moveTo(duration, ease) {
    if (this.mapRange.isMapLength()) {
      this.viewer.reset(duration, ease);
    } else {
      const buffer = Math.ceil(this.length * 0.05);
      const start = this.sequence.subtractBp(this.mapStart, buffer);
      const stop = this.sequence.addBp(this.mapStop, buffer);
      this.viewer.moveTo(start, stop, {duration, ease});
    }
  }

  /**
   * Reverse the orientations of the features on this contig
   * @private
   */
  reverseFeatureOrientations() {
    const updates = {};
    for (let i = 0, len = this._features.length; i < len; i++) {
      const feature = this._features[i];
      updates[feature.cgvID] = {
        start: this.length - feature.stop + 1,
        stop: this.length - feature.start + 1,
        strand: -(feature.strand)
      };
    }
    this.viewer.updateFeatures(updates);
  }

  /**
   * Return the sequence for a range on this contig
   * @param {Range} range - The range of the sequence
   * @param {Boolean} revComp - If true, returns the reverse complement sequence
   * @private
   */
  forRange(range, revComp) {
    return Sequence.forRange(this.seq, range, revComp);
  }

  /**
   * Returns sequence of this contig in fasta format
   */
  asFasta() {
    return `>${this.name}\n${this.seq}`;
  }

  /**
   * Highlight the contig.
   * @param {Color} color - Color of the highlight
   * @private
   */
  highlight(color) {
    const backbone = this.viewer.backbone;
    this.viewer.canvas;
    backbone.visibleRange;
    let highlightColor;
    if (color) {
      highlightColor = new Color(color);
    } else {
      let origColor = (this.index % 2 === 0) ? backbone.color : backbone.colorAlternate;
      if (this.color) {
        origColor = this.color;
      }
      highlightColor = origColor.copy();
      highlightColor.highlight();
    }
    if (this.visible) {
      const start = this.sequence.bpForContig(this);
      const stop = this.sequence.bpForContig(this, this.length);
      this.viewer.canvas.drawElement('ui', start, stop, backbone.adjustedCenterOffset, highlightColor.rgbaString, backbone.adjustedThickness, backbone.directionalDecorationForContig(this));
    }
  }

  /**
   * Returns JSON representing the object
   */
  toJSON(options = {}) {
    const json = {
      // id: this.id,
      name: this.name,
      orientation: this.orientation,
      length: this.length,
      color: this.color && this.color.rgbaString,
      // visible: this.visible
    };
    if (this.hasSeq) {
      json.seq = this.seq;
    }
    // Optionally add default values
    // Visible is normally true
    if (!this.visible || options.includeDefaults) {
      json.visible = this.visible;
    }
    return json;
  }

}

//////////////////////////////////////////////////////////////////////////////

/**
 * The debug class draws helpful info to the canvas.
 * Sections:
 *  - time: time for drawing
 *  - zoom: zoom and drag info
 *  - position: position of mouse, etc
 *  - n: number of features in slots, etc
 * @private
 */
class Debug {

  constructor(viewer, options = {}) {
    this.viewer = viewer;
    this._data = {};
    this._sections = utils.defaultFor(options.sections, []);
    // Create object for each section
    for (const section of this.sections) {
      this.data[section] = {};
    }
  }

  get sections() {
    return this._sections;
  }

  get data() {
    return this._data;
  }


  // // DEBUG INFO EXAMPLE
  // if (this.debug) {
  //   axis = axis.toUpperCase();
  //   this.debug_data.zoom['d' + axis]  = JSV.round(axis_diff);
  //   this.debug_data.zoom['v' + axis]  = JSV.round(value);
  //   this.debug_data.zoom['r' + axis]  = JSV.round(axis_ratio);
  // }
  // Other Example
  // let start_time = new Date().getTime();
  // ....code and stuff....
  // if (this.debug) {
  //   this.debug_data.time['draw'] = JSV.elapsedTime(start_time);
  //   this.draw_debug(this.legend.bottom());
  // }
  //
  // Draws any information in 'data' onto the left side of the viewer
  draw(x = 10, y = 20) {
    const canvas = this.viewer.canvas;
    canvas.clear('debug');
    const ctx = canvas.context('debug');
    const data = this._data;
    const sections = this._sections;

    ctx.font = '10pt Sans-Serif';
    const color = this.viewer.settings.backgroundColor.copy();

    ctx.fillStyle = color.invert().rgbaString;
    const lineHeight = 18;
    ctx.textAlign = 'left';
    // const section_keys = this.debug === true ? Object.keys(data) : this.debug;
    let i = 0;
    sections.forEach(function(sectionKey) {
      const dataKeys = Object.keys(data[sectionKey]);
      dataKeys.forEach(function(dataKey) {
        ctx.fillText((`${sectionKey}|${dataKey}: ${data[sectionKey][dataKey]}`), x, y + (lineHeight * i));
        i += 1;
      });
    });
  }

}

//////////////////////////////////////////////////////////////////////////////

/**
 * A divider is the line and spacing that separate tracks and slot.
 *
 * There are two type of dividers: slot and track. They are accessed from the
 * viewer [dividers](Dividers.html) object:
 * - cgv.dividers.track - controlls spacing/lines between tracks.
 * - cgv.dividers.slot - controls spacing/lines betweens slots within a track.
 *
 * If either track or slot has their mirror set to true, then both dividers will be treated as the same.
 * In addition, if only settings for one of the dividers is provided on Viewer creation, then it will be mirrored.
 *
 * ### Action and Events
 *
 * Action                                  | Viewer Method                    | Divider Method      | Event
 * ----------------------------------------|----------------------------------|---------------------|-----
 * [Update](../docs.html#updating-records) | -                                | [update()](#update) | divider-update
 * [Read](../docs.html#reading-records)    | [dividers](Viewer.html#dividers) | -                   | -
 *
 * <a name="attributes"></a>
 * ### Attributes
 *
 * Attribute                        | Type      | Description
 * ---------------------------------|-----------|------------
 * [color](#color)                  | String    | A string describing the color [Default: 'black']. See {@link Color} for details.
 * [thickness](#thickness)          | Number    | Thickness of divider [Default: 1]
 * [spacing](#spacing)              | Number    | Spacing between divider and track/slot content [Default: 1]
 * [mirror](#mirror)<sup>ic</sup>   | Boolean   | If true, the other dividers will use the same settings as this divider.
 * [visible](CGObject.html#visible) | Boolean   | Dividers are visible [Default: true]
 * [meta](CGObject.html#meta)       | Object    | [Meta data](../tutorials/details-meta-data.html) for divider
 * 
 * <sup>ic</sup> Ignored on Record creation
 *
 * ### Examples
 *
 * @extends CGObject
 */
class Divider extends CGObject {

  /**
   * Create a divider
   * @param {Viewer} viewer - The viewer
   * @param {String} name - The name for the divider. One of: track, slot, or mirrored.
   * @param {Object} options - [Attributes](#attributes) used to create the divider
   * @param {Object} [meta] - User-defined [Meta data](../tutorials/details-meta-data.html) to add to the divider
   */
  constructor(viewer, name, options = {}, meta = {}) {
    super(viewer, options, meta);
    this.color = utils.defaultFor(options.color, 'grey');
    this._thickness = utils.defaultFor(options.thickness, 1);
    this._spacing = utils.defaultFor(options.spacing, 1);
    this._name = name;
    this._bbOffsets = new CGArray();
    this.viewer.trigger('divider-update', { divider: this, attributes: this.toJSON({includeDefaults: true}) });
  }

  /**
   * Return the class name as a string.
   * @return {String} - 'Divider'
   */
  toString() {
    return 'Divider';
  }

  /**
   * Return name of divider (e.g. 'track' or 'slot')
   */
  get name() {
    return this._name;
  }

  /**
   * @member {Boolean} - Get or Set the visibility of this object.
   */
  get visible() {
    return this._visible;
  }

  set visible(value) {
    this._visible = value;
    this.viewer.layout && this.viewer.layout._adjustProportions();
  }

  /**
   * @member {Color} - Get or set the divider color. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
   */
  get color() {
    return this._color;
  }

  set color(value) {
    if (value.toString() === 'Color') {
      this._color = value;
    } else {
      this._color = new Color(value);
    }
  }

  /**
   * @member {Number} - Set or get the divider thickness. This is the unzoomed thickness.
   */
  set thickness(value) {
    if (value !== undefined) {
      // this._thickness = Math.round(value);
      this._thickness = value;
      this.viewer.layout._adjustProportions();
    }
  }

  get thickness() {
    return this._thickness;
  }

  /**
   * @member {Number} - Get the divider thickness adjusted for visibility and zoom level.
   */
  get adjustedThickness() {
    if (!this.visible) { return 0; }
    return (this.viewer.zoomFactor < 1) ? (this._thickness * this.viewer.zoomFactor) : this._thickness;
  }

  /**
   * @member {Number} - Set or get the divider spacing.
   */
  set spacing(value) {
    if (value !== undefined) {
      this._spacing = Math.round(value);
      this.viewer.layout._adjustProportions();
    }
  }

  get spacing() {
    return this._spacing;
  }

  /**
   * @member {Number} - Get the divider spacing adjusted for zoom level. Even if the divider
   * is not visible, there can still be spacing between the slots/tracks.
   */
  get adjustedSpacing() {
    return (this.viewer.zoomFactor < 1) ? (this._spacing * this.viewer.zoomFactor) : this._spacing;
  }

  /**
   * @member {Boolean} - Get or set the mirroring for this divider.
   * When setting to true, the other divider will be mirrored to this one.
   */
  get mirror() {
    return this.viewer.dividers.dividersMirrored;
  }

  set mirror(value) {
    this._mirror = value;
    if (value === true) {
      // Mirror other divider to this one
      this.viewer.dividers.mirrorDivider(this);
    } else {
      // Turns off mirroring
      this.viewer.dividers.mirrorDivider();
    }
  }

  /**
   * Update divider [attributes](#attributes).
   * See [updating records](../docs.html#s.updating-records) for details.
   * @param {Object} attributes - Object describing the properties to change
   */
  update(attributes) {
    const { records: dividers, updates } = this.viewer.updateRecords(this, attributes, {
      recordClass: 'Divider',
      validKeys: ['visible', 'color', 'thickness', 'spacing', 'mirror']
    });
    this.viewer.trigger('divider-update', { divider: this, attributes, updates });
  }

  toJSON() {
    return {
      visible: this.visible,
      color: this.color.rgbaString,
      thickness: this.thickness,
      spacing: this.spacing
    };
  }

}

//////////////////////////////////////////////////////////////////////////////

/**
 * Dividers is a container for the track and slot [divider](Divider.html).
 * They are accessed from the viewer object (e.g. cgv):
 * - cgv.dividers.track - controls spacing/lines between tracks.
 * - cgv.dividers.slot - controls spacing/lines betweens slots within a track.
 *
 * <a name="attributes"></a>
 * ### Attributes
 *
 *  Option                        | Description
 *  ------------------------------|----------------------------
 *  [track](#track)               |  [Divider attributes](Divider.html#attributes) for tracks
 *  [slot](#slot)                 |  [Divider attributes](Divider.html#attributes) for slots
 */
class Dividers {

  /**
   * Create the dividers container
   * @param {Viewer} viewer - The viewer that contains the dividers
   * @param {Object} options - [Attributes](#attributes) used to create the dividers. Passed on slot and track divider.
   * @param {Object} [meta] - User-defined [Meta data](../tutorials/details-meta-data.html) to add to the dividers
   */
  constructor(viewer, options = {}, meta = {}) {
    this.viewer = viewer;

    const keys = Object.keys(options);
    // Both track and slot data is provided
    if (keys.includes('slot') && keys.includes('track')) {
      this._slot = new Divider(viewer, 'slot', options.slot);
      this._track = new Divider(viewer, 'track', options.track);
    } else {
      // Only one of track or slot data is provided. Mirro data.
      if (keys.includes('slot')) {
        this._slot = new Divider(viewer, 'mirrored', options.slot);
        this._track = this.slot;
      } else if (keys.includes('track')) {
        this._track = new Divider(viewer, 'mirrored', options.track);
        this._slot = this.track;
      } else {
        // Neither track or slot data is provided. Create default slot and mirror.
        this._slot = new Divider(viewer, 'mirrored');
        this._track = this.slot;
      }
    }

    this.clearBbOffsets();
    // this.viewer.trigger('settings-update', {attributes: this.toJSON({includeDefaults: true})});
  }

  /**
   * Return the class name as a string.
   * @return {String} - 'Dividers'
   */
  toString() {
    return 'Dividers';
  }

  /**
   * Returns the track divider
   */
  get track() {
    return this._track;
  }

  /**
   * Returns the slot divider
   */
  get slot() {
    return this._slot;
  }

  /**
   * Returns true if the slot and track divider are mirrored
   */
  get dividersMirrored() {
    return this.slot === this.track;
  }

  /**
   * If a dividier is provided, the other divider will be mirroed to the provide one.
   * If no divider is provided, the dividers will no longer be mirrored.
   * @private
   */
  mirrorDivider(divider) {
    if (divider) {
      // Mirror other divider to the one provided
      if (this.slot === divider) {
        this._track = this.slot;
      } else {
        this._slot = this.track;
      }
      this.slot._name = 'mirrored';
    } else {
      // Turn off mirroring
      this._track = new Divider(this.viewer, 'track', this.slot.toJSON());
      this.slot._name = 'slot';
    }

  }

  /**
   * @member {Number} - Returns a CGArray where each element is an object with 2 properties: distance, type. The 'distance' is the divider distance from the backbone. The 'type' is the divider type (e.g. 'slot' or 'track').
   * @private
   */
  get bbOffsets() {
    return this._bbOffsets;
  }

  /**
   * @private
   */
  clearBbOffsets() {
    this._bbOffsets = new CGArray();
  }

  /**
   * @private
   */
  addBbOffset(bbOffset, type) {
    if (['track', 'slot'].includes(type)) {
      this._bbOffsets.push({distance: bbOffset, type: type});
    } else {
      throw 'Divider bbOffset type must be one of "slot" or "track"';
    }
  }

  /**
   * Invert colors of the dividers
   */
  invertColors() {
    if (this.track.mirror) {
      this.track.update({ color: this.track.color.invert().rgbaString });
    } else {
      this.track.update({ color: this.track.color.invert().rgbaString });
      this.slot.update({ color: this.slot.color.invert().rgbaString });
    }
  }

  /**
   * Draw the dividers
   * @private
   */
  draw() {
    const canvas = this.viewer.canvas;
    const backboneOffset = this.viewer.backbone.adjustedCenterOffset;
    // if (!this.visible || this.thickness === 0) { return; }
    for (let i = 0, len = this._bbOffsets.length; i < len; i++) {
      const bbOffset = this._bbOffsets[i];
      if (!this[bbOffset.type].visible) { continue; } 
      const centerOffset = backboneOffset + bbOffset.distance;
      const visibleRange = canvas.visibleRangeForCenterOffset(centerOffset, 100);
      if (visibleRange) {
        canvas.drawElement('map', visibleRange.start, visibleRange.stop, centerOffset, this[bbOffset.type].color.rgbaString, this[bbOffset.type].adjustedThickness);
      }
    }
  }

  /**
   * Returns JSON representing the object
   */
  toJSON(options = {}) {
    if (this.slot === this.track) {
      return {
        slot: this._slot.toJSON(options),
      };
    } else {
      return {
        track: this._track.toJSON(options),
        slot: this._slot.toJSON(options),
      };
    }
  }

}

//////////////////////////////////////////////////////////////////////////////

/**
 * EventMonitor sets up mouse click and movement event handlers on the CGView canvas.
 *
 * CGView event contents (based on mouse position):
 *
 * Property   | Description
 * -----------|-----------------------------------------------
 *  bp        | Base pair
 *  centerOffset | Distance from center of the map. For a circular map, this is the radius, while for a linear map, it's the distance from the backbone.
 *  elementType | One of: 'legendItem', 'caption', 'feature', 'plot', 'backbone', 'contig', 'label', or undefined
 *  element   | The element (e.g, a feature), if there is one.
 *  slot      | Slot (if there is one). Track can be accessed from the slot (<em>slot.track</em>).
 *  score     | Score for element (e.g. feature, plot), if available.
 *  canvasX   | Position on the canvas X axis, where the origin is the top-left. See [scales](../tutorials/details-map-scales.html) for details.
 *  canvasY   | Position on the canvas Y axis, where the origin is the top-left. See [scales](../tutorials/details-map-scales.html) for details.
 *  mapX      | Position on the map domain X axis, where the origin is the center of the map. See [scales](../tutorials/details-map-scales.html) for details.
 *  mapY      | Position on the map domain Y axis, where the origin is the center of the map. See [scales](../tutorials/details-map-scales.html) for details.
 *  d3        | The d3 event object.
 *
 * ### Examples
 * ```js
 * // Log the feature name when clicked
 * cgv.on('click', (event) => {
 *   if (event.elementType === 'feature') {
 *     console.log(`Feature '${event.element.name}' was clicked`);
 *   }
 * });
 *
 * // Log the base pair position of the mouse as it moves
 * cgv.on('mousemove', (event) => {
 *   console.log(`BP: ${event.bp}`);
 * });
 * ```
 */
class EventMonitor {

  /**
   * Adds event handlers for mouse clicks and movement
   */
  // NOTE: - a mouse property will be updated with every mouse move
  //       - This will be aliased to Viewer.mouse
  //       - Eventually add to API but for now private
  constructor(viewer) {
    this._viewer = viewer;

    // Setup Events on the viewer
    this.events = viewer.events;

    this._initializeMousemove();
    this._initializeClick();
    this._initializeBookmarkShortcuts();
    // this.events.on('mousemove', (e) => {console.log(e.bp)})
    // this.events.on('click', (e) => {console.log(e);});
    // MoveTo On click
    // this.events.on('click', (e) => {
    //   if (e.feature) {
    //     this.viewer.moveTo(e.feature.start, e.feature.stop);
    //   }
    // })

    this.events.on('mousemove', (e) => {
      if (this.viewer.debug && this.viewer.debug.data.position) {
        this.viewer.debug.data.position.xy = `${Math.round(e.mapX)}, ${Math.round(e.mapY)}`;
        this.viewer.debug.data.position.bp = utils.commaNumber(e.bp);
        this.viewer.debug.data.position.element = e.element && e.element.name;
        this.viewer.debug.data.position.score = e.score;
        this.viewer.debug.draw();
      }
    });

    this._legendSwatchClick();
    this._legendSwatchMouseOver();
    // this._highlighterMouseOver();
  }

  /**
   * @member {Viewer} - Get the *Viewer*
   */
  get viewer() {
    return this._viewer;
  }

  /**
   * @member {Canvas} - Get the *Canvas*
   */
  get canvas() {
    return this.viewer.canvas;
  }

  /**
   * @member {Object} - Get the last mouse position on canvas
   * @private
   */
  get mouse() {
    return this._mouse;
  }

  /**
   * Initialize mouse move events under 'cgv' namespace.
   * @private
   */
  _initializeMousemove() {
    const viewer = this.viewer;
    d3.select(this.canvas.node('ui')).on('mousemove.cgv', (d3Event) => {
      const event = this._createEvent(d3Event);
      this._mouse = event;
      viewer.clear('ui');
      this.events.trigger('mousemove', event);
      // this.events.trigger('mousemove', this._createEvent(d3Event));
    });
  }

  /**
   * Initialize clicks events under 'cgv' namespace.
   * @private
   */
  _initializeClick() {
    d3.select(this.canvas.node('ui')).on('click.cgv', (d3Event) => {
      // If the canvas is clicked, stop any animations
      this.viewer.stopAnimate();
      this.events.trigger('click', this._createEvent(d3Event));
    });
  }

  // FIXME: need to be able to turn this off
  // FIXME: there should be an option to turn this off, if it interferes with other program UI
  _initializeBookmarkShortcuts() {
    const ignoredTagsRegex = /^(input|textarea|select|button)$/i;
    document.addEventListener('keypress', (e) => {
      if (ignoredTagsRegex.test(e.target.tagName)) { return; }
      if (e.target.isContentEditable) { return; }
      const bookmark = this.viewer.bookmarkByShortcut(e.key);
      if (bookmark) {
        bookmark.moveTo();
        this.viewer.trigger('bookmarks-shortcut', bookmark);
      }
    });
  }

  /**
   * Create an event object that will be return on mouse clicks and movement
   * @param {Object} d3Event - a d3 event object
   * @private
   */
  _createEvent(d3Event) {
    if (this.viewer.loading) { return {}; }
    const scale = this.viewer.layout.scale;
    const canvasX = d3Event.offsetX;
    const canvasY = d3Event.offsetY;
    const mapX = scale.x.invert(canvasX);
    const mapY = scale.y.invert(canvasY);
    const centerOffset = this.viewer.layout.centerOffsetForPoint({x: canvasX, y: canvasY});
    const slot = this.viewer.layout.slotForCenterOffset(centerOffset);
    const bp = this.canvas.bpForPoint({x: canvasX, y: canvasY});

    const {elementType, element} = this._getElement(slot, bp, centerOffset, canvasX, canvasY);

    let score;
    if (elementType === 'plot') {
      score = element.scoreForPosition(bp).toFixed(2);
    } else {
      score = element && element.score;
    }

    return {
      bp: bp,
      centerOffset: centerOffset,
      slot: slot,
      elementType: elementType,
      element: element,
      score: score,
      canvasX: canvasX,
      canvasY: canvasY,
      mapX: mapX,
      mapY: mapY,
      d3: d3Event
    };
  }

  /**
   * Returns an object with the *element* and *elementType* for the given *slot*, *bp*, and *centerOffset*.
   * ElementType can be one of the following: 'plot', 'feature', 'label', 'legendItem', 'captionItem', 'contig', 'backbone'
   * @param {Slot}  slot - the slot for the event.
   * @param {Number}  bp - the bp for the event.
   * @param {Number}  centerOffset - the centerOffset for the event.
   *
   * @returns {Object} Obejct with properties: element and elementType
   * @private
   */
  _getElement(slot, bp, centerOffset, canvasX, canvasY) {
    let elementType, element;

    // Check Legend
    const legend = this.viewer.legend;
    if (legend.visible && legend.box.containsPt(canvasX, canvasY)) {
      for (let i = 0, len = legend.items().length; i < len; i++) {
        const item = legend.items()[i];
        if (item._textContainsPoint({x: canvasX, y: canvasY})) {
          elementType = 'legendItem';
          element = item;
        }
      }
    }

    // Check Captions
    if (!elementType) {
      const captions = this.viewer.captions();
      for (let i = 0, len = captions.length; i < len; i++) {
        const caption = captions[i];
        if (caption.visible && caption.box.containsPt(canvasX, canvasY)) {
          elementType = 'caption';
          element = caption;
        }
      }
    }

    // Check for feature or plot
    if (!elementType && slot) {
      // If mulitple features are returned, go with the smallest one
      const features = slot.findFeaturesForBp(bp);
      let feature;
      for (let i = 0, len = features.length; i < len; i++) {
        const currentFeature = features[i];
        if (currentFeature.visible) {
          if (!feature || (currentFeature.length < feature.length)) {
            feature = currentFeature;
          }
        }
      }
      if (feature && feature.visible) {
        elementType = 'feature';
        element = feature;
      } else if (slot._plot) {
        elementType = 'plot';
        element = slot._plot;
      }
    }

    // Check for Backbone or Contig
    if (!elementType && this.viewer.backbone.visible && this.viewer.backbone.containsCenterOffset(centerOffset)) {
      const backbone = this.viewer.backbone;
      const sequence = this.viewer.sequence;
      if (sequence.hasMultipleContigs) {
        elementType = 'contig';
        element = sequence.contigForBp(bp);
      } else {
        elementType = 'backbone';
        element = backbone;
      }
    }

    // Check for Labels
    if (!elementType && this.viewer.annotation.visible) {
      const labels = this.viewer.annotation._visibleLabels;
      for (let i = 0, len = labels.length; i < len; i++) {
        const label = labels[i];
        if (label.rect.containsPt(canvasX, canvasY) && label.feature.visible) {
          elementType = 'label';
          element = label;
        }
      }
    }

    return {elementType, element};
  }

  _legendSwatchClick() {
    const viewer = this.viewer;
    this.events.on('click.swatch', (e) => {
      const legend = viewer.legend;
      if (!legend.visible) return;
      const swatchedLegendItems = legend.visibleItems();
      for (let i = 0, len = swatchedLegendItems.length; i < len; i++) {
        if ( swatchedLegendItems[i]._swatchContainsPoint( {x: e.canvasX, y: e.canvasY} ) ) {
          const legendItem = swatchedLegendItems[i];
          legendItem.swatchSelected = true;
          const cp = viewer.colorPicker;
          if (!cp.visible) {
            legend.setColorPickerPosition(cp);
          }
          cp.onChange = function(color) {
            // legendItem.swatchColor = color.rgbaString;
            legendItem.update({swatchColor: color.rgbaString});
            viewer.drawFast();
            // viewer.trigger('legend-swatch-change', legendItem);
          };
          cp.onClose = function() {
            legendItem.swatchSelected = false;
            viewer.drawFull();
            legend.draw();
          };
          cp.setColor(legendItem._swatchColor.rgba);
          cp.open(legendItem);
          break;
        }
      }
    });
  }

  _legendSwatchMouseOver() {
    const viewer = this.viewer;
    this.events.on('mousemove.swatch', (e) => {
      const legend = viewer.legend;
      if (!legend.visible) return;
      const swatchedLegendItems = legend.visibleItems();
      const oldHighlightedItem = legend.highlightedSwatchedItem;
      legend.highlightedSwatchedItem = undefined;
      for (let i = 0, len = swatchedLegendItems.length; i < len; i++) {
        if ( swatchedLegendItems[i]._swatchContainsPoint( {x: e.canvasX, y: e.canvasY} ) ) {
          const legendItem = swatchedLegendItems[i];
          legendItem.swatchHighlighted = true;
          this.canvas.cursor = 'pointer';
          legend.draw();
          break;
        }
      }
      // No swatch selected
      if (oldHighlightedItem && !legend.highlightedSwatchedItem) {
        this.canvas.cursor = 'auto';
        legend.draw();
      }
    });
  }

}

//////////////////////////////////////////////////////////////////////////////

/**
 * Labels are used by [Annotation](Annotation.html) to control drawing
 * [feature](Feature.html) names on the map.
 * @private
 */
class Label {

  /**
   * Create a new label
   * @param {Feature} feature - Feature this label is associated with
   * @param {Object} options - ...
   */
  constructor(feature, options = {}) {
    this._feature = feature;
    this.name = options.name;
    // Minus 0.5 since features are drawn from start-0.5 to stop+0.5
    this.bp = this.feature.mapStart - 0.5 + (this.feature.length / 2);
    this.bpDefault = this.bp;

    // this.lineAttachmentDefault = this.viewer.layout.clockPositionForBp(this.bp);
  }

  /**
   * @member {String} - Get or set the label name.
   */
  get name() {
    return this._name;
  }

  set name(value) {
    if (value === undefined || value === '') {
      this.width = 0;
      // Label was in Annotation, so remove it
      if (!(this._name === '' || this._name === undefined)) {
        this.annotation.removeLabels(this);
      }
      this._name = '';
    } else {
      // Label was not in Annotation, so add it
      if (this._name === '' || this._name === undefined) {
        this.annotation.addLabel(this);
      }
      this._name = value;
      this.width = this.font.width(this.viewer.canvas.context('map'), this._name);
    }
  }

  /**
   * @member {Rect} - Get or set the label bounding rect.
   */
  get rect() {
    return this._rect;
  }

  set rect(value) {
    this._rect = value;
  }

  /**
   * @member {Number} - Get or set the label width.
   */
  get width() {
    return this._width;
  }

  set width(value) {
    this._width = value;
  }


  /**
   * @member {Number} - Get the label height which is based on the font size.
   */
  get height() {
    return this.font.height;
  }

  /**
   * @member {Point} - Get or set the label origin. The upper-left corner of the label rect.
   */
  // get origin() {
  //   return this._origin
  // }
  //
  // set origin(value) {
  //   this._origin = value;
  // }

  /**
   * @member {Number} - Get the default attachment point
   */
  get lineAttachmentDefault() {
    // FIXME: This may be slow. Consider calculating when ever the scales change???
    return this.viewer.layout.clockPositionForBp(this.bp, true);
  }

  /**
   * @member {Number} - Get or set the label attachment point. This number represents where on the label
   *                    the label lines attaches in term of a hand on a clock. (e.g. 12 would be top middle of label)
   */
  get lineAttachment() {
    return this._lineAttachment || this.lineAttachmentDefault;
  }

  set lineAttachment(value) {
    this._lineAttachment = value;
  }

  /**
   * @member {Font} - Get or set the font. When setting the font, a string representing the font or a {@link Font} object can be used. For details see {@link Font}.
   */
  get font() {
    return this._font || this.annotation.font;
  }

  set font(value) {
    if (value === undefined) {
      this._font = this.annotation.font;
    } else if (value.toString() === 'Font') {
      this._font = value;
    } else {
      this._font = new Font(value);
    }
  }

  /**
   * @member {Viewer} - Get the *Viewer*
   */
  get viewer() {
    return this.feature.viewer;
  }

  /**
   * @member {Annotation} - Get the *Annotation*
   */
  get annotation() {
    return this.viewer.annotation;
  }

  /**
   * @member {Feature} - Get the Feature
   */
  get feature() {
    return this._feature;
  }

  /**
   * @member {Number} - Get the mapStart position of the feature
   */
  get mapStart() {
    return this.feature.mapStart;
  }

  /**
   * @member {Number} - Get the mapStop position of the feature
   */
  get mapStop() {
    return this.feature.mapStop;
  }

  /**
   * Highlgith this label
   */
  // highlight() {
  //   const canvas = this.viewer.canvas;
  //   canvas.clear('ui');
  //   const color = this.annotation.color || this.feature.color;
  //   const ctx = canvas.context('ui');
  //   const rect = this.rect;
  //   ctx.strokeStyle = color.rgbaString;
  //   ctx.lineWidth = 1;
  //   const padding = 2;
  //   ctx.strokeRect(rect.x - padding , rect.y - padding, rect.width + (2*padding), rect.height + (2*padding) );
  // }
  hightlight() {
    this.feature.hightlight();
    // this._highlight();
  }
  // Called from feature.highlight()
  _highlight() {
    if (!this.rect) { return; }
    if (!this.annotation._visibleLabels.includes(this)) { return; }

    const canvas = this.viewer.canvas;
    // canvas.clear('ui');
    const color = this.annotation.color || this.feature.color;
    const ctx = canvas.context('ui');
    const rect = this.rect;
    ctx.strokeStyle = color.rgbaString;
    ctx.lineWidth = 1;
    const padding = 2;

    // Rectangle Outline
    // ctx.strokeRect(rect.x - padding , rect.y - padding, rect.width + (2*padding), rect.height + (2*padding) );

    // Rounded Rectangle Outline
    const corner = this.height / 4;
    ctx.beginPath();
    ctx.roundRect(rect.x - padding , rect.y - padding, rect.width + (2*padding), rect.height + (2*padding), [corner] );
    ctx.stroke();

    // Label Line
    this.annotation.drawLabelLine(this, ctx, 1.5);
  }

}

//////////////////////////////////////////////////////////////////////////////

/**
 * A Feature is a region on the map with a start and stop position.
 *
 * ### Action and Events
 *
 * Action                                  | Viewer Method                                  | Feature Method      | Event
 * ----------------------------------------|------------------------------------------------|---------------------|-----
 * [Add](../docs.html#adding-records)      | [addFeatures()](Viewer.html#addFeatures)       | -                   | features-add
 * [Update](../docs.html#updating-records) | [updateFeatures()](Viewer.html#updateFeatures) | [update()](#update) | features-update
 * [Remove](../docs.html#removing-records) | [removeFeatures()](Viewer.html#removeFeatures) | [remove()](#remove) | features-remove
 * [Read](../docs.html#reading-records)    | [features()](Viewer.html#features)             | -                   | -
 *
 * <a name="attributes"></a>
 * ### Attributes
 *
 * Attribute                        | Type     | Description
 * ---------------------------------|----------|------------
 * [name](#name)                    | String   | Name of feature
 * [type](#type)                    | String   | Feature type (e.g. CDS, rRNA, etc)
 * [legend](#legend)                | String\|LegendItem | Name of legendItem or the legendItem itself
 * [source](#source)                | String   | Source of the feature
 * [tags](#tags)                    | String\|Array | A single string or an array of strings associated with the feature as tags
 * [contig](#contig)                | String\|Contig | Name of contig or the contig itself
 * [start](#start)<sup>rc</sup>     | Number   | Start base pair on the contig
 * [stop](#stop)<sup>rc</sup>       | Number   | Stop base pair on the contig
 * [mapStart](#mapStart)<sup>ic</sup> | Number   | Start base pair on the map (converted to contig position)
 * [mapStop](#mapStop)<sup>ic</sup> | Number   | Stop base pair on the map (converted to contig position)
 * [strand](#strand)                | String   | Strand the features is on [Default: 1]
 * [score](#score)                  | Number   | Score associated with the feature
 * [favorite](#favorite)            | Boolean  | Feature is a favorite [Default: false]
 * [visible](CGObject.html#visible) | Boolean  | Feature is visible [Default: true]
 * [meta](CGObject.html#meta)       | Object   | [Meta data](../tutorials/details-meta-data.html) for Feature
 * 
 * <sup>rc</sup> Required on Feature creation
 * <sup>ic</sup> Ignored on Record creation
 *
 * Implementation notes:
 *   - The feature range is the range on the contig
 *   - Feature.mapRange is the range on the Sequence.mapContig
 *   - If there is only one contig in the map, then Feature.mapRange === Feature.range
 *   - Feature.start/stop are positions on the contig
 *   - Feature mapStart/mapStop are position on Sequence.mapContig
 *   - If no contig is provided, the default contig will be Sequence.mapContig
 *     - Whenever mapContig is updated/regenerated the feature will be moved to the new mapContig
 *     - Features on the mapContig are able to span contigs
 *     - If contigs are rearranged, a mapContig feature will stay at the same position (start/stop)
 *
 * @extends CGObject
 */
class Feature extends CGObject {

  /**
   * Create a new feature.
   * @param {Viewer} viewer - The viewer
   * @param {Object} options - [Attributes](#attributes) used to create the feature
   * @param {Object} [meta] - User-defined [Meta data](../tutorials/details-meta-data.html) to add to the feature.
   */
  constructor(viewer, data = {}, meta = {}) {
    super(viewer, data, meta);
    this.viewer = viewer;
    this.type = utils.defaultFor(data.type, '');
    this.source = utils.defaultFor(data.source, '');
    this.tags = data.tags;
    this.favorite = utils.defaultFor(data.favorite, false);
    // this.contig = data.contig || viewer.sequence.mapContig;
    this.contig = data.contig;
    // this.range = new CGV.CGRange(this.viewer.sequence, Number(data.start), Number(data.stop));
    this.updateRanges(data.start, data.stop);
    this.strand = utils.defaultFor(data.strand, 1);
    this.score = utils.defaultFor(data.score, 1);
    this.codonStart = data.codonStart;
    this.geneticCode = data.geneticCode;
    this.label = new Label(this, {name: data.name} );
    this._centerOffsetAdjustment = Number(data.centerOffsetAdjustment) || 0;
    this._proportionOfThickness = Number(data.proportionOfThickness) || 1;

    this.extractedFromSequence = utils.defaultFor(data.extractedFromSequence, false);

    this.legendItem  = data.legend;
  }

  /**
   * Return the class name as a string.
   * @return {String} - 'Feature'
   */
  toString() {
    return 'Feature';
  }

  /**
   * @member {type} - Get or set the *type*
   */
  get type() {
    return this._type;
  }

  set type(value) {
    this._type = value;
  }

  /**
   * @member {tag} - Get or set the *tags*
   */
  get tags() {
    return this._tags;
  }

  set tags(value) {
    this._tags = (value == undefined || value === '') ? new CGArray() : new CGArray(value);
  }

  /**
   * @member {String} - Get or set the name via the [Label](Label.html).
   */
  get name() {
    return this.label && this.label.name;
  }

  set name(value) {
    if (this.label) {
      this.label.name = value;
    } else {
      this.label = new Label(this, {name: value} );
    }
  }

  /**
   * @member {String} - Get or set the Codon start (Default: 1)
   */
  get codonStart() {
    return this._codonStart || 1;
  }

  set codonStart(value) {
    this._codonStart = value;
  }

  /**
   * @member {String} - Get or set the Genetic code used for translation. If no genetic code is set, the default for the map will be used.
   */
  get geneticCode() {
    return this._geneticCode;
  }

  set geneticCode(value) {
    this._geneticCode = value;
  }

  /**
   * @member {Boolean} - Get or set the *extractedFromSequence*. If true, this feature was
   * generated directly from the sequence and will not be saved when exporting to JSON.
   */
  get extractedFromSequence() {
    return this._extractedFromSequence;
  }

  set extractedFromSequence(value) {
    this._extractedFromSequence = value;
  }

  /**
   * @member {Viewer} - Get the *Viewer*
   */
  get viewer() {
    return this._viewer;
  }

  set viewer(viewer) {
    if (this.viewer) ;
    this._viewer = viewer;
    viewer._features.push(this);
  }

  get strand() {
    return this._strand;
  }

  set strand(value) {
    if (value === '-' || Number(value) === -1) {
      this._strand = -1;
    } else {
      this._strand = 1;
    }
  }

  /**
   * @member {Number} - Get the *Score*
   */
  get score() {
    return this._score;
  }

  set score(value) {
    if (Number.isNaN(Number(value))) { return; }
    this._score = utils.constrain(Number(value), 0, 1);
  }

  isDirect() {
    return this.strand === 1;
  }

  isReverse() {
    return this.strand === -1;
  }

  /**
   * @member {Range} - Get or set the range of the feature. All ranges
   *   are assumed to be going in a clockwise direction.
   */
  get range() {
    return this._range;
  }

  set range(value) {
    this._range = value;
  }

  /**
   * @member {Range} - Get or set the range of the feature with respect to its contig.
   *   All ranges are assumed to be going in a clockwise direction.
   */
  get mapRange() {
    return this.range.onMap;
  }

  /**
   * @member {Number} - Get or set the start position of the feature in basepair (bp).
   *   All start and stop positions are assumed to be going in a clockwise direction.
   *   This position is relative to the contig the feature is on. If there is only one
   *   contig, this value will be the same as mapStart.
   */
  get start() {
    return this.range.start;
  }

  set start(value) {
    this.range.start = value;
  }

  /**
   * @member {Number} - Get or set the stop position of the feature in basepair (bp).
   *   All start and stop positions are assumed to be going in a clockwise direction.
   *   This position is relative to the contig the feature is on. If there is only one
   *   contig, this value will be the same as mapStop.
   */
  get stop() {
    return this.range.stop;
  }

  set stop(value) {
    this.range.stop = value;
  }

  /**
   * @member {Number} - Get or set the start position of the feature in basepair (bp).
   *   All start and stop positions are assumed to be going in a clockwise direction.
   */
  get mapStart() {
    return this.range.mapStart;
  }

  set mapStart(value) {
    this.range.mapStart = value;
  }

  /**
   * @member {Number} - Get or set the stop position of the feature in basepair (bp).
   *   All start and stop positions are assumed to be going in a clockwise direction.
   */
  get mapStop() {
    return this.range.mapStop;
  }

  set mapStop(value) {
    this.range.mapStop = value;
  }

  get length() {
    return this.range.length;
  }

  /**
   * @member {String} - Get or set the feature label.
   */
  get label() {
    return this._label;
  }

  set label(value) {
    this._label = value;
  }

  /**
   * @member {String} - Get or set the feature as a favorite.
   */
  get favorite() {
    return Boolean(this._favorite);
  }

  set favorite(value) {
    this._favorite = value;
  }

  /**
   * @member {String} - Get or set the color. TODO: reference COLOR class
   */
  get color() {
    // return (this.legendItem) ? this.legendItem.swatchColor : this._color;
    return this.legendItem.swatchColor;
  }

  /**
   * @member {String} - Get the decoration.
   */
  get decoration() {
    // return (this.legendItem && this.legendItem.decoration || 'arc')
    return (this.legendItem.decoration || 'arc');
  }

  get directionalDecoration() {
    if (this.decoration === 'arrow') {
      return this.strand === 1 ? 'clockwise-arrow' : 'counterclockwise-arrow';
    } else if (this.decoration === 'score') {
      return 'arc';
    } else {
      return this.decoration;
    }
  }

  /**
   * @member {LegendItem} - Get or set the LegendItem. The LegendItem can be set with a LegendItem object
   *   or with the name of a legenedItem.
   */
  get legendItem() {
    return this._legendItem;
  }

  set legendItem(value) {
    if (this.legendItem && value === undefined) { return; }
    if (value && value.toString() === 'LegendItem') {
      this._legendItem  = value;
    } else {
      this._legendItem  = this.viewer.legend.findLegendItemOrCreate(value);
    }
  }

  /**
   * @member {LegendItem} - Alias for [legendItem](Feature.html#legendItem).
   */
  get legend() {
    return this.legendItem;
  }

  set legend(value) {
    this.legendItem = value;
  }

  /**
   * @member {Contig} - Get or set the Contig. The Contig can be set with a Contig object
   *   or with the name of a Contig.
   */
  get contig() {
    return this._contig;
  }

  set contig(value) {
    const oldContig = this._contig;
    let newContig;
    if (value === undefined || value === this.sequence.mapContig) {
      // this._contig = undefined;
      newContig = this.sequence.mapContig;
    } else if (value && value.toString() === 'Contig') {
      // this._contig  = value;
      newContig = value;
    } else {
      const contig = this.viewer.sequence.contigs(value);
      // const contig = this.viewer.sequence.contigs().filter( c => c.id && c.id.toLowerCase() === value.toLowerCase() )[0];
      if (contig) {
        // this._contig  = contig;
        newContig = contig;
      } else {
        console.error(`Feature '${this.name}' could not find contig '${value}'`);
      }
    }
    if (oldContig !== newContig) {
      // Add feature to new Contig
      if (newContig) {
        newContig._features.push(this);
      }
      // Remove feature from old Contig
      if (oldContig) {
        Contig.removeFeatures(this);
      }
    }
    // Must be done after calling Contig.removeFeatures()
    this._contig = newContig;
    if (oldContig) {
      // FIXME: adjust start/stop if the new contig is shorter than old contig
      // and the position needs to be constrained. Try to keep the same length.
      if (newContig.isMapContig) {
        this.updateRanges(this.mapStart, this.mapStop);
      } else {
        this.updateRanges(this.start, this.stop);
      }
    }
  }

  /**
   * Moves the feature, if it's on the mapContig, to the appropriate contig
   * based on the start position. This may truncate the feature if it does not 
   * fit completely
   * @private
   */
  moveToContig() {
    if (this.contig.isMapContig) {
      const contig = this.sequence.contigForBp(this.start);
      const start = this.start - contig.lengthOffset;
      const stop = this.stop - contig.lengthOffset;
      this.update({contig, start, stop});
    }
  }

  /**
   * Moves the feature, if it's on the mapContig, to the appropriate contig
   * based on the start position. This may truncate the feature if it does not 
   * fit completely
   * @private
   */
  moveToMapContig() {
    if (!this.contig.isMapContig) {
      this.contig = undefined;
    }
  }

  /**
   * Update feature [attributes](#attributes).
   * See [updating records](../docs.html#s.updating-records) for details.
   * @param {Object} attributes - Object describing the properties to change
   */
  update(attributes) {
    this.viewer.updateFeatures(this, attributes);
  }

  /**
   * Updates the feature range using the given *start* and *stop* positions.
   * If the feature is on a contig, the positions should be in relation to the contig.
   * @param {Number} start - Start position (bp).
   * @param {Number} stop - Stop position (bp).
   * @private
   */
  // updateRanges(start, stop) {
  //   start = Number(start);
  //   stop = Number(stop);
  //   const sequence = this.sequence;
  //   let globalStart = start;
  //   let globalStop = stop;
  //   if (this.contig) {
  //     // Create range as global bp position and
  //     // contigRange as given start/stop positions
  //     globalStart = sequence.bpForContig(this.contig, start);
  //     globalStop = sequence.bpForContig(this.contig, stop);
  //     this.contigRange = new CGV.CGRange(sequence, start, stop);
  //   }
  //   this.range = new CGV.CGRange(sequence, globalStart, globalStop);
  // }
  updateRanges(start, stop) {
    start = Number(start);
    stop = Number(stop);
    const contig = this.contig || this.sequence.mapContig;
    this.range = new CGRange(contig, start, stop);
  }

  draw(layer, slotCenterOffset, slotThickness, visibleRange, options = {}) {
    if (!this.visible) { return; }
    if (this.mapRange.overlapsMapRange(visibleRange)) {
      const canvas = this.canvas;
      let start = this.mapStart;
      let stop = this.mapStop;
      const containsStart = visibleRange.containsMapBp(start);
      const containsStop = visibleRange.containsMapBp(stop);
      const color = options.color || this.color;
      const showShading = options.showShading;
      if (!containsStart) {
        // start = visibleRange.start - 100;
        start = Math.max(1, visibleRange.start - 100);
      }
      if (!containsStop) {
        // stop = visibleRange.stop + 100;
        stop = Math.min(this.sequence.length, visibleRange.stop + 100);
      }

      // When zoomed in, if the feature starts in the visible range and wraps around to end
      // in the visible range, the feature should be drawn as 2 arcs.
      // const zoomedSplitFeature = containsStart && containsStop && (this.viewer.zoomFactor > 1000) && this.range.overlapsMapRange();
      const zoomedSplitFeature = containsStart && containsStop && (this.viewer.zoomFactor > 1000) && this.range.isWrapped();
      //  When the feature wraps the origin on a linear map and both the start and stop
      //  can be seen, draw as 2 elements.
      const unzoomedSplitLinearFeature = containsStart && containsStop && this.range.isWrapped() && (this.viewer.format === 'linear');

      if (zoomedSplitFeature || unzoomedSplitLinearFeature) {
        const visibleStart = Math.max((visibleRange.start - 100), 1); // Do not draw off the edge of linear maps
        const visibleStop = Math.min((visibleRange.stop + 100), this.sequence.length); // Do not draw off the edge of linear maps
        canvas.drawElement(layer, visibleStart, stop,
          this.adjustedCenterOffset(slotCenterOffset, slotThickness),
          color.rgbaString, this.adjustedWidth(slotThickness), this.directionalDecoration, showShading);
        canvas.drawElement(layer, start, visibleStop,
          this.adjustedCenterOffset(slotCenterOffset, slotThickness),
          color.rgbaString, this.adjustedWidth(slotThickness), this.directionalDecoration, showShading);
      } else {
        canvas.drawElement(layer, start, stop,
          this.adjustedCenterOffset(slotCenterOffset, slotThickness),
          color.rgbaString, this.adjustedWidth(slotThickness), this.directionalDecoration, showShading);
      }
    }
  }

  /**
   * Highlights the feature on every slot it is visible. An optional slot can be provided,
   * in which case the feature will only be highlighted on the slot.
   * @param {Slot} slot - Only highlight the feature on this slot.
   */
  highlight(slot) {
    if (!this.visible) { return; }
    this.canvas.clear('ui');

    this.label._highlight();


    const color = this.color.copy();
    color.highlight();
    if (slot && slot.features().includes(this)) {
      this.draw('ui', slot.centerOffset, slot.thickness, slot.visibleRange, {color: color});
    } else {
      this.viewer.slots().each( (i, slot) => {
        if (slot.features().includes(this)) {
          this.draw('ui', slot.centerOffset, slot.thickness, slot.visibleRange, {color: color});
        }
      });
    }
  }

  // TODO: Not using _centerOffsetAdjustment yet
  // centerOffset by default would be the center of the slot as provided unless:
  // - _centerOffsetAdjustment is not 0
  // - _proportionOfThickness is not 1
  // - legend decoration is score
  adjustedCenterOffset(centerOffset, slotThickness) {
    if (this.legendItem.decoration === 'score') {
      // FIXME: does not take into account proportionOfThickness and centerOffsetAdjustment for now
      return centerOffset - (slotThickness / 2) + (this.score * slotThickness / 2);
    } else {
      if (this._centerOffsetAdjustment === 0 && this._proportionOfThickness === 1) {
        return centerOffset;
      } else if (this._centerOffsetAdjustment === 0) {
        return centerOffset - (slotThickness / 2) + (this._proportionOfThickness * slotThickness / 2);
      } else {
        return centerOffset;
      }
    }
  }

  adjustedWidth(width) {
    if (this.legendItem.decoration === 'score') {
      return this.score * width;
    } else {
      return this._proportionOfThickness * width;
    }
  }

  /**
   * Return an array of the tracks that contain this feature
   * FIXME: this will not return the tracks for features on tracks with 'from' = 'sequence'
   *        - is this a problem??
   */
  tracks(term) {
    const tracks = new CGArray();
    this.viewer.tracks().each( (i, track) => {
      if (track.type === 'feature') {
        if ( (track.dataMethod === 'source' && track.dataKeys.includes(this.source)) ||
             (track.dataMethod === 'type' && track.dataKeys.includes(this.type)) ||
             (track.dataMethod === 'tag' && track.dataKeys.some( k => this.tags.includes(k))) ||
             (track.dataMethod === 'sequence' && this.extractedFromSequence && track.features().includes(this)) ) {
          tracks.push(track);
        }
      }
    });
    return tracks.get(term);
  }

  /**
   * Return an array of the slots that contain this feature
   */
  slots(term) {
    const slots = new CGArray();
    this.tracks().each( (i, track) => {
      track.slots().each( (j, slot) => {
        if (slot.features().includes(this)) {
          slots.push(slot);
        }
      });
    });
    return slots.get(term);
  }

  /**
   * Remove the feature from the viewer, tracks and slots
   */
  remove() {
    this.viewer.removeFeatures(this);
  }

  /**
   * Zoom and pan map to show the feature
   *
   * @param {Number} duration - Length of animation
   * @param {Object} ease - The d3 animation ease [Default: d3.easeCubic]
   */
  moveTo(duration, ease) {
    const buffer = Math.ceil(this.length * 0.05);
    const start = this.sequence.subtractBp(this.mapStart, buffer);
    const stop = this.sequence.addBp(this.mapStop, buffer);
    this.viewer.moveTo(start, stop, {duration, ease});
  }

  // Update tracks, slots, etc associated with feature.
  // Or add feature to tracks and refresh them, if this is a new feature.
  // Don't refresh if bulkImport is true
  //
  refresh() {
    // this.bulkImport = false;
    // Get tracks currently associated with this feature.
    // And find any new tracks that may now need to be associated with this feature
    // (e.g. if the feature source changed, it may now belong to a different track)
    this.viewer.tracks().each( (i, track) => {
      if ( track.features().includes(this) ||
           (track.dataMethod === 'source' && track.dataKeys.includes(this.source) ) ) {
        track.refresh();
      }
    });
  }

  /**
   * Translate the sequence of this feature.
   *
   * The source of the genetic code used for translation uses the following precedence:
   * geneticCode (provided to translate method) > geneticCode (of Feature) > geneticCode (of Viewer)
   *
   * @param {Number} geneticCode - Number indicating the genetic code to use for the translation. This will override the any genetic code set for the feature or Viewer.
   * @return {String} - Amino acid sequence
   */
  translate(geneticCode) {
    const code = geneticCode || this.geneticCode || this.viewer.geneticCode;
    const table = this.viewer.codonTables.byID(code);
    return table && table.translate(this.seq, this.start_codon);
  }

  /**
   * Returns the DNA sequence for the feature.
   *
   * @return {String} - DNA sequence of feature.
   */
  get seq() {
    return this.contig.forRange(this.range, this.isReverse());
  }

  toJSON(options = {}) {
    const json = {
      name: this.name,
      type: this.type,
      start: this.start,
      stop: this.stop,
      strand: this.strand,
      source: this.source,
      legend: this.legend.name
      // score: this.score,
      // visible: this.visible,
      // favorite: this.favorite
    };
    if (this.codonStart && this.codonStart != 1) {
      json.codonStart = this.codonStart;
    }
    if (this.geneticCode && this.geneticCode != this.viewer.geneticCode) {
      json.geneticCode = this.geneticCode;
    }
    if (this.sequence.hasMultipleContigs && !this.contig.isMapContig) {
      // json.contig = this.contig.id;
      json.contig = this.contig.name;
    }
    // Tags
    if (this.tags !== undefined) {
      json.tags = (this.tags.length === 1) ? this.tags[0] : [...this.tags];
    }
    // Optionally add default values
    // Visible is normally true
    if (!this.visible || options.includeDefaults) {
      json.visible = this.visible;
    }
    // Score is normally undefined (which defaults to 1)
    if ((this.score !== undefined && this.score !== 1) || options.includeDefaults) {
      json.score = this.score;
    }
    // Favorite is normally false
    if (this.favorite || options.includeDefaults) {
      json.favorite = this.favorite;
    }
    // Meta Data (TODO: add an option to exclude this)
    if (Object.keys(this.meta).length > 0) {
      json.meta = this.meta;
    }
    return json;
  }

}

//////////////////////////////////////////////////////////////////////////////

// FIXME: There are 2 clasess here

/**
 * The Highlighter object controls highlighting and popovers of features,
 * plots and other elements on the Viewer when the mouse hovers over them.
 *
 * <a name="attributes"></a>
 * ### Attributes
 *
 *  Option                        | Default                    | Description
 *  ------------------------------|----------------------------|--------------------------
 *  [feature](#feature)           | {@link HighlighterElement} | Describes the highlightling options for features
 *  [plot](#plot)                 | {@link HighlighterElement} | Describes the highlightling options for plots
 *  [contig](#plot)               | {@link HighlighterElement} | Describes the highlightling options for contigs
 *  [backbone](#plot)             | {@link HighlighterElement} | Describes the highlightling options for the backbone
 *  [showMetaData](#showMetaData) | true                       | Should meta data be shown in popovers
 *
 * @extends CGObject
 */
class Highlighter extends CGObject {

  /**
   * Create a Highlighter
   * @param {Viewer} viewer - The viewer
   * @param {Object} options - [Attributes](#attributes) used to create the highlighter.
   */
  constructor(viewer, options = {}, meta = {}) {
    super(viewer, options, meta);
    this._viewer = viewer;
    this.showMetaData = utils.defaultFor(options.showMetaData, true);
    // this.popoverBox = viewer._container.append('div').attr('class', 'cgv-highlighter-popover-box').style('visibility', 'hidden');
    this.popoverBox = viewer._wrapper.append('div').attr('class', 'cgv-highlighter-popover-box').style('visibility', 'hidden');
    this._feature = new HighlighterElement('feature', options.feature);
    this._plot = new HighlighterElement('plot', options.plot);
    this._contig = new HighlighterElement('contig', options.contig);
    this._backbone = new HighlighterElement('backbone', options.contig);
    this.initializeEvents();

    // Set up position constants (Distance from mouse pointer to top-left of popup)
    this._offsetLeft = 8;
    this._offsetTop = -18;
  }

  /**
   * @member {Viewer} - Get the viewer.
   */
  get viewer() {
    return this._viewer;
  }

  /**
   * @member {HighlighterElement} - Get the feature HighlighterElement
   */
  get feature() {
    return this._feature;
  }

  /**
   * @member {HighlighterElement} - Get the plot HighlighterElement
   */
  get plot() {
    return this._plot;
  }

  /**
   * @member {HighlighterElement} - Get the contig HighlighterElement
   */
  get contig() {
    return this._contig;
  }

  /**
   * @member {HighlighterElement} - Get the backbone HighlighterElement
   */
  get backbone() {
    return this._backbone;
  }

  position(e) {
    const originX = e.canvasX + this._offsetLeft;
    const originY = e.canvasY + this._offsetTop;
    return { x: originX,  y: originY};
  }

  initializeEvents() {
    this.viewer.off('.cgv-highlighter');
    this.viewer.on('mousemove.cgv-highlighter', (e) => {
      this.mouseOver(e);
      // if (e.feature) {
      //   this.mouseOver('feature', e);
      // } else if (e.plot) {
      //   this.mouseOver('plot', e);
      // } else {
      //   this.hidePopoverBox();
      // }
    });
  }

  // mouseOver(type, e) {
  mouseOver(e) {
    const type = e.elementType;
    if (!type || !this[type]) {
      this.hidePopoverBox();
      return;
    }
    if (this[type].highlighting) {
      this[`highlight${utils.capitalize(type)}`](e);
    }
    if (this[type].popovers && this.visible) {
      const position = this.position(e);
      const html = (this[type].popoverContents && this[type].popoverContents(e)) || this[`${type}PopoverContentsDefault`](e);
      this.showPopoverBox({position: position, html: html});
    } else {
      this.hidePopoverBox();
    }
  }

  getTrackDiv(e) {
    let trackDiv = '';
    if (e.slot) {
      const track = e.slot.track;
      let direction = '';
      if (track.type === 'feature' && track.separateFeaturesBy !== 'none') {
        direction = e.slot.isDirect() ? '(+)' : '(-)';
      }
      trackDiv = `<div class='track-data'>Track: ${track.name} ${direction}</div>`;
    }
    return trackDiv;
  }

  getPositionDiv(e) {
    const bp = utils.commaNumber(e.bp);
    let div = `<div class='track-data'>Map: ${bp} bp</div>`;
    if (e.elementType === 'contig') {
      const contig = e.element;
      console.log(contig);
      const contigBp = utils.commaNumber(e.bp - contig.lengthOffset);
      div = `<div class='track-data'>Contig: ${contigBp} bp</div>` + div;
    }
    return div;
  }

  featurePopoverContentsDefault(e) {
    const feature = e.element;
    // return `<div style='margin: 0 5px; font-size: 14px'>${feature.type}: ${feature.name}</div>`;
    const keys = Object.keys(feature.meta);
    let metaDivs = '';
    if (this.showMetaData && keys.length > 0) {
      metaDivs = keys.map( k => `<div class='meta-data'><span class='meta-data-key'>${k}</span>: <span class='meta-data-value'>${feature.meta[k]}</span></div>`).join('');
      metaDivs = `<div class='meta-data-container'>${metaDivs}</div>`;
    }
    if (e.slot) {
      const track = e.slot.track;
      `<div class='track-data'>Track: ${track.name}</div>`;
    }
    return (`
      <div style='margin: 0 5px; font-size: 14px'>
        <div>${feature.type}: ${feature.name}<div>
        ${metaDivs}
        ${this.getTrackDiv(e)}
      </div>
    `);
  }

  plotPopoverContentsDefault(e) {
    const plot = e.element;
    const score = plot.scoreForPosition(e.bp);
    return (`
      <div style='margin: 0 5px; font-size: 14px'>
        <div>Score: ${score.toFixed(2)}</div>
        ${this.getTrackDiv(e)}
      </div>
    `);
  }

  backbonePopoverContentsDefault(e) {
    const length = utils.commaNumber(this.sequence.length);
    // return `<div style='margin: 0 5px; font-size: 14px'>Backbone: ${length} bp</div>`;
    return (`
      <div style='margin: 0 5px; font-size: 14px'>
        <div>Backbone: ${length} bp</div>
        ${this.getPositionDiv(e)}
      </div>
    `);
  }

  contigPopoverContentsDefault(e) {
    const contig = e.element;
    const length = utils.commaNumber(contig.length);
    // return `<div style='margin: 0 5px; font-size: 14px'>Contig ${contig.index}/${this.sequence.contigs().length} [${length} bp]: ${contig.name}</div>`;
    return (`
      <div style='margin: 0 5px; font-size: 14px'>
        <div>Contig ${contig.index}/${this.sequence.contigs().length} [${length} bp]: ${contig.name}</div>
        ${this.getPositionDiv(e)}
      </div>
    `);
  }

  highlightFeature(e) {
    e.element.highlight(e.slot);
  }

  highlightPlot(e) {
    const viewer = this.viewer;
    const plot = e.element;
    const score = plot.scoreForPosition(e.bp);
    if (score) {
      const startIndex = utils.indexOfValue(plot.positions, e.bp, false);
      const start = plot.positions[startIndex];
      const stop = plot.positions[startIndex + 1] || viewer.sequence.length;
      const baselineCenterOffset = e.slot.centerOffset - (e.slot.thickness / 2) + (e.slot.thickness * plot.baseline);
      const scoredCenterOffset = baselineCenterOffset + ((score - plot.baseline) * e.slot.thickness);
      const thickness = Math.abs(baselineCenterOffset - scoredCenterOffset);
      const centerOffset = Math.min(baselineCenterOffset, scoredCenterOffset) + (thickness / 2);
      const color = (score >= plot.baseline) ? plot.colorPositive.copy() : plot.colorNegative.copy();
      color.highlight();

      viewer.canvas.drawElement('ui', start, stop, centerOffset, color.rgbaString, thickness);
    }
  }

  highlightBackbone(e) {
    // e.element.highlight(e.slot);
  }

  highlightContig(e) {
    // e.element.highlight(e.slot);
  }

  hidePopoverBox() {
    this.popoverBox.style('visibility', 'hidden');
  }

  showPopoverBox(options = {}) {
    if (options.html) {
      this.popoverBox.html(options.html);
    }
    if (options.position) {
      this.popoverBox
        .style('left', `${options.position.x}px`)
        .style('top', `${options.position.y}px`);
    }
    this.popoverBox.style('visibility', 'visible');
  }

  toJSON() {
    return {
      visible: this.visible
    };
  }

}


//////////////////////////////////////////////////////////////////////////////
// Highlighter Element
//////////////////////////////////////////////////////////////////////////////
/**
 * A HighlighterElement indicates whether highlighting and popovers should appear.
 *
 * <a name="attributes"></a>
 * ### Attributes
 *
 *  Option                              | Default     | Description
 *  ------------------------------------|-------------|-----------------------------------
 *  [highlighting](#highlighting)       | true        | Highlight a element when the mouse is over it
 *  [popovers](#popovers)               | true        | Show a popover for the element when the mouse is over it
 *  [popoverContents](#popoverContents) | undefined   | Function to create html for the popover
 *
 */
class HighlighterElement {

  /**
   * Create a HighlighterElement
   * @param {String} type - The element type: 'feature', 'plot', 'contig', 'backbone'.
   * @param {Object} options - [Attributes](#attributes) used to create the highlighter element.
   */
  constructor(type, options = {}) {
    this.type = type;
    this.highlighting = utils.defaultFor(options.highlighting, true);
    this.popovers = utils.defaultFor(options.popovers, true);
    this.popoverContents = options.popoverContents;
  }

  /**
   * @member {String} - Get or set the type (e.g. 'feature', 'plot', 'contig', 'backbone')
   */
  get type() {
    return this._type;
  }

  set type(value) {
    this._type = value;
  }

  /**
   * @member {Boolean} - Get or set whether highlighting should occur
   */
  get highlighting() {
    return this._highlighting;
  }

  set highlighting(value) {
    this._highlighting = value;
  }

  /**
   * @member {Boolean} - Get or set whether popovers should occur
   */
  get popover() {
    return this._popover;
  }

  set popover(value) {
    this._popover = value;
  }

  /**
   * @member {Function} - Get or set the function to call to produce HTML for the popover.
   * The provided function will be called with one argument: an [event-like object](EventMonitor.html).
   */
  get popoverContents() {
    return this._popoverContents;
  }

  set popoverContents(value) {
    this._popoverContents = value;
  }

}

//////////////////////////////////////////////////////////////////////////////

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
    this.minArcLength = utils.defaultFor(options.minArcLength, 1);
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

//////////////////////////////////////////////////////////////////////////////

/**
 * The Ruler controls and draws the sequence ruler in bp.
 *
 * ### Action and Events
 *
 * Action                                  | Viewer Method              | Ruler Method        | Event
 * ----------------------------------------|----------------------------|---------------------|-----
 * [Update](../docs.html#updating-records) | -                          | [update()](#update) | ruler-update
 * [Read](../docs.html#reading-records)    | [ruler](Viewer.html#ruler) | -                   | -
 *
 * <a name="attributes"></a>
 * ### Attributes
 *
 * Attribute                        | Type      | Description
 * ---------------------------------|-----------|------------
 * [font](#font)                    | String    | A string describing the font [Default: 'sans-serif, plain, 10']. See {@link Font} for details.
 * [color](#color)                  | String    | A string describing the color [Default: 'black']. See {@link Color} for details.
 * [visible](CGObject.html#visible) | Boolean   | Rulers are visible [Default: true]
 * [meta](CGObject.html#meta)       | Object    | [Meta data](../tutorials/details-meta-data.html) for ruler
 *
 * ### Examples
 *
 * @extends CGObject
 */
class Ruler extends CGObject {

  /**
   * Create a new ruler
   * @param {Viewer} viewer - The viewer
   * @param {Object} options - [Attributes](#attributes) used to create the ruler
   * @param {Object} [meta] - User-defined [Meta data](../tutorials/details-meta-data.html) to add to the ruler.
   */
  constructor(viewer, options = {}, meta = {}) {
    super(viewer, options, meta);
    this.tickCount = utils.defaultFor(options.tickCount, 10);
    this.tickWidth = utils.defaultFor(options.tickWidth, 1);
    this.tickLength = utils.defaultFor(options.tickLength, 4);
    this.rulerPadding = utils.defaultFor(options.rulerPadding, 10);
    this.spacing = utils.defaultFor(options.spacing, 2);
    this.font = utils.defaultFor(options.font, 'sans-serif, plain, 10');
    this.color = new Color( utils.defaultFor(options.color, 'black') );
    this.lineCap = 'round';

    this.viewer.trigger('ruler-update', { attributes: this.toJSON({includeDefaults: true}) });
  }

  /**
   * Return the class name as a string.
   * @return {String} - 'Ruler'
   */
  toString() {
    return 'Ruler';
  }

  /**
   * @member {Font} - Get or set the font. When setting the font, a string representing the font or a {@link Font} object can be used. For details see {@link Font}.
   */
  get font() {
    return this._font;
  }

  set font(value) {
    if (value.toString() === 'Font') {
      this._font = value;
    } else {
      this._font = new Font(value);
    }
  }

  /**
   * @member {Color} - Get or set the Color. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
   */
  get color() {
    return this._color;
  }

  set color(color) {
    if (color.toString() === 'Color') {
      this._color = color;
    } else {
      this._color.setColor(color);
    }
  }

  get tickCount() {
    return this._tickCount;
  }

  set tickCount(count) {
    this._tickCount = count;
  }

  get tickWidth() {
    return this._tickWidth;
  }

  set tickWidth(width) {
    this._tickWidth = width;
  }

  get tickLength() {
    return this._tickLength;
  }

  set tickLength(length) {
    this._tickLength = length;
  }

  get rulerPadding() {
    return this._rulerPadding;
  }

  set rulerPadding(padding) {
    this._rulerPadding = padding;
  }

  // Distance between divider and tick marks
  get spacing() {
    return this._spacing;
  }

  set spacing(value) {
    this._spacing = value;
  }

  /**
   * @member {Array} - Get the array of Major Ticks.
   */
  get majorTicks() {
    return this._majorTicks;
  }

  /**
   * @member {Number} - Get distance between major tick marks.
   */
  get majorTickStep() {
    return this._majorTickStep;
  }

  /**
   * @member {Array} - Get the array of Minor Ticks.
   */
  get minorTicks() {
    return this._minorTicks;
  }

  /**
   * @member {Number} - Get distance between minor tick marks.
   */
  get minorTickStep() {
    return this._minorTickStep;
  }

  /**
   * @member {Object} - Get the d3 formatter for printing the tick labels
   */
  get tickFormater() {
    return this._tickFormater;
  }

  /**
   * Create d3 tickFormat based on the distance between ticks
   * @param {Number} tickStep - Distance between ticks
   * @return {Object}
   * @private
   */
  _createTickFormatter(tickStep) {
    let tickFormat, tickPrecision;
    if (tickStep <= 50) {
      tickFormat = d3.formatPrefix(',.0', 1);
    } else if (tickStep <= 50e3) {
      tickPrecision = d3.precisionPrefix(tickStep, 1e3);
      tickFormat = d3.formatPrefix(`.${tickPrecision}`, 1e3);
    } else if (tickStep <= 50e6) {
      tickPrecision = d3.precisionPrefix(tickStep, 1e6);
      tickFormat = d3.formatPrefix(`.${tickPrecision}`, 1e6);
    }
    return tickFormat;
  }

  // Below the zoomFactorCutoff, all ticks are calculated for the entire map
  // Above the zoomFactorCutoff, ticks are created for the visible range
  _updateTicks(innerCenterOffset, outerCenterOffset) {
    const zoomFactorCutoff = 5;
    const sequenceLength = this.sequence.length;
    let start = 0;
    let stop = 0;
    let majorTicks = [];
    let majorTickStep = 0;
    let minorTicks = [];
    let minorTickStep = 0;
    let tickCount = this.tickCount;

    // Find start and stop to create ticks
    if (this.viewer.zoomFactor < zoomFactorCutoff) {
      start = 1;
      stop = sequenceLength;
    } else {
      tickCount = Math.ceil(tickCount / 2);
      const innerRange = this.canvas.visibleRangeForCenterOffset(innerCenterOffset);
      const outerRange = this.canvas.visibleRangeForCenterOffset(outerCenterOffset);
      if (innerRange && outerRange) {
        const mergedRange = innerRange.mergeWithRange(outerRange);
        start = mergedRange.start;
        stop = mergedRange.stop;
      } else if (innerRange) {
        start = innerRange.start;
        stop = innerRange.stop;
      } else if (outerRange) {
        start = outerRange.start;
        stop = outerRange.stop;
      }
    }

    // Create Major ticks and tickStep
    if (stop > start) {
      majorTicks = majorTicks.concat( d3.ticks(start, stop, tickCount) );
      majorTickStep = d3.tickStep(start, stop, tickCount);
    } else if (stop < start) {
      // Ratio of the sequence length before 0 to sequence length after zero
      // The number of ticks will for each region will depend on this ratio
      const tickCountRatio = (sequenceLength - start) / this.sequence.lengthOfRange(start, stop);
      const ticksBeforeZero = Math.round(tickCount * tickCountRatio);
      const ticksAfterZero = Math.round(tickCount * (1 - tickCountRatio)) * 2; // Multiply by 2 for a margin of safety
      if (ticksBeforeZero > 0) {
        majorTicks = majorTicks.concat( d3.ticks(start, sequenceLength, ticksBeforeZero) );
        majorTickStep = Math.round(d3.tickStep(start, sequenceLength, ticksBeforeZero));
        for (let i = 1; i <= ticksAfterZero; i ++) {
          if (majorTickStep * i < start) {
            majorTicks.push( majorTickStep * i );
          }
        }
      } else {
        majorTicks = majorTicks.concat( d3.ticks(1, stop, tickCount) );
        majorTickStep = Math.round(d3.tickStep(1, stop, tickCount));
      }
    }

    // Find Minor ticks
    minorTicks = [];
    if ( !(majorTickStep % 5) ) {
      minorTickStep = majorTickStep / 5;
    } else if ( !(majorTickStep % 2) ) {
      minorTickStep = majorTickStep / 2;
    } else {
      minorTickStep = 0;
    }
    if (minorTickStep) {
      if (this.sequence.lengthOfRange(majorTicks[majorTicks.length - 1], majorTicks[0]) <= 3 * majorTickStep) {
        start = 0;
        stop = sequenceLength;
      } else {
        start = majorTicks[0] - majorTickStep;
        stop = majorTicks[majorTicks.length - 1] + majorTickStep;
      }
      if (start < stop) {
        for (let tick = start; tick <= stop; tick += minorTickStep) {
          if (tick % majorTickStep) {
            minorTicks.push(tick);
          }
        }
      } else {
        for (let tick = start; tick <= sequenceLength; tick += minorTickStep) {
          if (tick % majorTickStep) {
            minorTicks.push(tick);
          }
        }
        for (let tick = 0; tick <= stop; tick += minorTickStep) {
          if (tick % majorTickStep) {
            minorTicks.push(tick);
          }
        }
      }
    }
    this._majorTicks = majorTicks;
    this._majorTickStep = majorTickStep;
    this._minorTicks = minorTicks;
    this._minorTickStep = minorTickStep;
    this._tickFormater = this._createTickFormatter(majorTickStep);
  }

  draw(innerCenterOffset, outerCenterOffset) {
    if (this.visible) {
      innerCenterOffset -= this.spacing;
      outerCenterOffset += this.spacing;
      this._updateTicks(innerCenterOffset, outerCenterOffset);
      this.drawForCenterOffset(innerCenterOffset, 'inner');
      this.drawForCenterOffset(outerCenterOffset, 'outer', false);
    }
  }


  drawForCenterOffset(centerOffset, position = 'inner', drawLabels = true) {
    const ctx = this.canvas.context('map');
    const tickLength = (position === 'inner') ? -this.tickLength : this.tickLength;
    // ctx.fillStyle = 'black'; // Label Color
    ctx.fillStyle = this.color.rgbaString; // Label Color
    ctx.font = this.font.css;
    ctx.textAlign = 'left';
    // ctx.textBaseline = 'top';
    ctx.textBaseline = 'alphabetic'; // The default baseline works best across canvas and svg
    // Draw Tick for first bp (Origin)
    this.canvas.radiantLine('map', 1, centerOffset, tickLength, this.tickWidth * 2, this.color.rgbaString, this.lineCap);
    // Draw Major ticks
    this.majorTicks.forEach( (bp) => {
      this.canvas.radiantLine('map', bp, centerOffset, tickLength, this.tickWidth, this.color.rgbaString, this.lineCap);
      if (drawLabels) {
        const label = this.tickFormater(bp);
        this.drawLabel(bp, label, centerOffset, position);
      }
    });
    // Draw Minor ticks
    for (const bp of this.minorTicks) {
      if (bp > this.sequence.length) { break; }
      this.canvas.radiantLine('map', bp, centerOffset, tickLength / 2, this.tickWidth, this.color.rgbaString, this.lineCap);
    }
  }

  drawLabel(bp, label, centerOffset, position = 'inner') {
    const ctx = this.canvas.context('map');
    // Put space between number and units
    label = label.replace(/([kM])?$/, ' $1bp');
    // INNER
    const innerPt = this.canvas.pointForBp(bp, centerOffset - this.rulerPadding);
    const attachmentPosition = this.layout.clockPositionForBp(bp);
    const labelWidth = this.font.width(ctx, label);
    const labelPt = utils.rectOriginForAttachementPoint(innerPt, attachmentPosition, labelWidth, this.font.height);
    // ctx.fillText(label, labelPt.x, labelPt.y);
    ctx.fillText(label, labelPt.x, labelPt.y + this.font.height);
  }

  invertColors() {
    this.update({
      color: this.color.invert().rgbaString
    });
  }

  /**
   * Update ruler [attributes](#attributes).
   * See [updating records](../docs.html#s.updating-records) for details.
   * @param {Object} attributes - Object describing the properties to change
   */
  update(attributes) {
    this.viewer.updateRecords(this, attributes, {
      recordClass: 'Ruler',
      validKeys: ['color', 'font', 'visible']
    });
    this.viewer.trigger('ruler-update', { attributes });
  }

  /**
   * Returns JSON representing the object
   */
  toJSON(options = {}) {
    const json = {
      font: this.font.string,
      color: this.color.rgbaString,
      // visible: this.visible
    };
    // Optionally add default values
    if (!this.visible || options.includeDefaults) {
      json.visible = this.visible;
    }
    return json;
  }

}

//////////////////////////////////////////////////////////////////////////////

/**
 * A legendItem is used to add text to a map legend. Individual
 * Features and Plots can be linked to a legendItem, so that the feature
 * or plot color will use the swatchColor of legendItem.
 *
 * ### Action and Events
 *
 * Action                                     | Legend Method                            | LegendItem Method   | Event
 * -------------------------------------------|------------------------------------------|---------------------|-----
 * [Add](../docs.html#adding-records)         | [addItems()](Legend.html#addItems)       | -                   | legendItems-add
 * [Update](../docs.html#updating-records)    | [updateItems()](Legend.html#updateItems) | [update()](#update) | legendItems-update
 * [Remove](../docs.html#removing-records)    | [removeItems()](Legend.html#removeItems) | [remove()](#remove) | legendItems-remove
 * [Reorder](../docs.html#reordering-records) | [moveItem()](Legend.html#moveItem)       | [move()](#move)     | legendItems-reorder
 * [Read](../docs.html#reading-records)       | [items()](Legend.html#items)             | -                   | -
 *
 * <a name="attributes"></a>
 * ### Attributes
 *
 * Attribute                        | Type      | Description
 * ---------------------------------|-----------|------------
 * [name](#name)                    | String    | Name to diplay for legendItem 
 * [font](#font)                    | String    | A string describing the font [Default: 'SansSerif, plain, 8']. See {@link Font} for details.
 * [fontColor](#fontColor)          | String    | A string describing the font color [Default: 'black']. See {@link Color} for details.
 * [decoration](#decoration)        | String    | How the features should be drawn. Choices: 'arc' [Default], 'arrow', 'score', 'none' [Default: 'arc']
 * [swatchColor](#swatchColor)      | String    | A string describing the legendItem display color [Default: 'black']. See {@link Color} for details.
 * [drawSwatch](#drawSwatch)        | Boolean   | Draw the swatch beside the legendItem name [Default: true]
 * [favorite](#favorite)            | Boolean   | LegendItem is a favorite [Default: false]
 * [visible](CGObject.html#visible) | Boolean   | LegendItem is visible [Default: true]
 * [meta](CGObject.html#meta)       | Object    | [Meta data](../tutorials/details-meta-data.html)
 *
 * ### Examples
 *
 * @extends CGObject
 */
class LegendItem extends CGObject {

  /**
   * Create a new legendItem. By default a legendItem will use its parent legend defaultFont, and defaultFontColor.
   * @param {Viewer} viewer - The viewer
   * @param {Object} options - [Attributes](#attributes) used to create the legendItem
   * @param {Object} [meta] - User-defined [Meta data](../tutorials/details-meta-data.html) to add to the legendItem.
   */
  constructor(legend, options = {}, meta = {}) {
    super(legend.viewer, options, meta);
    this.legend = legend;

    this.name = utils.defaultFor(options.name, '');
    this.font = options.font;
    this.fontColor = options.fontColor;
    this._drawSwatch = utils.defaultFor(options.drawSwatch, true);
    this._swatchColor = new Color( utils.defaultFor(options.swatchColor, 'black') );
    this._decoration = utils.defaultFor(options.decoration, 'arc');
    this._initializationComplete = true;
    this.refresh();
  }

  /**
   * Return the class name as a string.
   * @return {String} - 'LegendItem'
   */
  toString() {
    return 'LegendItem';
  }

  /**
   * @member {Legend} - Get the *Legend*
   */
  get legend() {
    return this._legend;
  }

  set legend(legend) {
    legend._items.push(this);
    this._legend = legend;
  }

  get visible() {
    return this._visible;
  }

  set visible(value) {
    // super.visible = value;
    this._visible = value;
    this.refresh();
  }

  /**
   * @member {String} - Get or set the name. The name is the text shown for the legendItem.
   * When setting a name, if it's not unique it will be appended with a number.
   * For example, if 'my_name' already exists, it will be changed to 'my_name-2'.
   */
  get name() {
    return this._name;
  }

  set name(value) {
    const valueString = `${value}`;
    const allNames = this.legend._items.map( i => i.name);
    this._name = utils.uniqueName(valueString, allNames);
    if (this._name !== valueString) {
      console.log(`LegendItem with name '${valueString}' already exists, using name '${this._name}' instead.`);
    }
    this.refresh();
  }

  /**
   * @member {String} - Get the text alignment of the parent *Legend* text alignment. Possible values are *left*, *center*, or *right*.
   * @private
   */
  get textAlignment() {
    return this.legend.textAlignment;
  }

  /**
   * @member {Number} - Get the width in pixels.
   */
  get width() {
    return this._width;
  }

  /**
   * @member {Number} - Get the height in pixels. This will be the same as the font size.
   */
  get height() {
    return this.font.height;
  }

  /**
   * @member {Font} - Get or set the font. When setting the font, a string representing the font or a {@link Font} object can be used. For details see {@link Font}.
   */
  // get font() {
  //   return this._font;
  // }
  //
  // set font(value) {
  //   if (value === undefined) {
  //     this._font = this.legend.defaultFont;
  //   } else if (value.toString() === 'Font') {
  //     this._font = value;
  //   } else {
  //     this._font = new Font(value);
  //   }
  //   this.refresh();
  // }
  get font() {
    return this._font || this.legend.defaultFont;
  }

  set font(value) {
    if (value === undefined) {
      this._font = undefined;
    } else if (value.toString() === 'Font') {
      this._font = value;
    } else {
      this._font = new Font(value);
    }
    this.refresh();
  }

  /**
   * @member {Boolean} - Returns true if using the default legend font
   */
  get usingDefaultFont() {
    return this.font === this.legend.defaultFont;
  }

  /**
   * @member {Color} - Get or set the fontColor. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
   */
  // get fontColor() {
  //   return this._fontColor;
  // }
  //
  // set fontColor(color) {
  //   if (color === undefined) {
  //     this._fontColor = this.legend.defaultFontColor;
  //   } else if (color.toString() === 'Color') {
  //     this._fontColor = color;
  //   } else {
  //     this._fontColor = new Color(color);
  //   }
  //   this.refresh();
  // }
  get fontColor() {
    return this._fontColor || this.legend.defaultFontColor;
  }

  set fontColor(color) {
    if (color === undefined) {
      // this._fontColor = this.legend.defaultFontColor;
      this._fontColor = undefined;
    } else if (color.toString() === 'Color') {
      this._fontColor = color;
    } else {
      this._fontColor = new Color(color);
    }
    this.refresh();
  }

  get usingDefaultFontColor() {
    return this.fontColor === this.legend.defaultFontColor;
  }

  /**
   * @member {Boolean} - Get or set the drawSwatch property. If true a swatch will be
   * drawn beside the legendItem text.
   */
  get drawSwatch() {
    return this._drawSwatch;
  }

  set drawSwatch(value) {
    this._drawSwatch = value;
    this.refresh();
  }

  /**
   * @member {Number} - Get the swatch width (same as legendItem height).
   */
  get swatchWidth() {
    return this.height;
  }

  /**
   * @member {Color} - Get or set the swatchColor. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
   */
  get swatchColor() {
    return this._swatchColor;
  }

  set swatchColor(color) {
    if (color.toString() === 'Color') {
      this._swatchColor = color;
    } else {
      this._swatchColor.setColor(color);
    }
    this.refresh();
  }

  /**
   * @member {String} - Get or set the decoration. Choices are *arc* [Default], *arrow*, *score*, *none*.
   */
  get decoration() {
    return this._decoration || 'arc';
  }

  set decoration(value) {
    if ( utils.validate(value, ['arc', 'arrow', 'none', 'score']) ) {
      this._decoration = value;
    }
  }

  /**
   * @member {Color} - Alias for  [swatchColor](LegendItem.html#swatchColor).
   * @private
   */
  get color() {
    return this.swatchColor;
  }

  set color(color) {
    this.swatchColor = color;
  }

  /**
   * @member {Boolean} - Get or set whether this item is selected
   * @private
   */
  get swatchSelected() {
    return this.legend.selectedSwatchedItem === this;
  }

  set swatchSelected(value) {
    if (value) {
      this.legend.selectedSwatchedItem = this;
    } else {
      if (this.legend.selectedSwatchedItem === this) {
        this.legend.selectedSwatchedItem = undefined;
      }
    }
  }

  /**
   * @member {Boolean} - Get or set whether this item is highlighted
   * @private
   */
  get swatchHighlighted() {
    return this.legend.highlightedSwatchedItem === this;
  }

  set swatchHighlighted(value) {
    if (value) {
      this.legend.highlightedSwatchedItem = this;
    } else {
      if (this.legend.highlightedSwatchedItem === this) {
        this.legend.highlightedSwatchedItem = undefined;
      }
    }
  }

  /**
   * Refresh parent legend
   * @private
   */
  refresh() {
    if (this._initializationComplete) {
      this.legend.refresh();
    }
  }

  /**
   * Returns the text x position
   * @private
   */
  textX() {
    const box = this.box;
    const legend = this.legend;
    if (this.textAlignment === 'left') {
      return this.drawSwatch ? (this.swatchX() + this.swatchWidth + legend.swatchPadding) : box.leftPadded;
    } else if (this.textAlignment === 'center') {
      return box.centerX;
    } else if (this.textAlignment === 'right') {
      return this.drawSwatch ? (this.swatchX() - legend.swatchPadding) : box.rightPadded;
    }
  }

  /**
   * Returns the text y position
   * @private
   */
  textY() {
    const legend = this.legend;
    // let y = legend.originY + legend.padding;
    let y = legend.box.topPadded;
    const visibleItems = this.legend.visibleItems();
    for (let i = 0, len = visibleItems.length; i < len; i++) {
      const item = visibleItems[i];
      if (item === this) { break; }
      y += (item.height * 1.5);
    }
    return y;
  }


  /**
   * Returns the swatch x position
   * @private
   */
  swatchX() {
    const box = this.legend.box;
    if (this.textAlignment === 'left') {
      return box.leftPadded;
    } else if (this.textAlignment === 'center') {
      return box.leftPadded;
    } else if (this.textAlignment === 'right') {
      return box.rightPadded - this.swatchWidth;
    }
  }

  /**
   * Returns the swatch y position
   * @private
   */
  swatchY() {
    return this.textY();
  }

  /**
   * Returns true if the swatch contains the provided point
   * @private
   */
  _swatchContainsPoint(pt) {
    const x = this.swatchX();
    const y = this.swatchY();
    if (pt.x >= x && pt.x <= x + this.height && pt.y >= y && pt.y <= y + this.height) {
      return true;
    }
  }

  /**
   * Returns true if the text contains the provided point
   * @private
   */
  _textContainsPoint(pt) {
    const textX = this.textX();
    const textY = this.textY();
    if (pt.x >= textX && pt.x <= textX + this.width && pt.y >= textY && pt.y <= textY + this.height) {
      return true;
    }
  }

  /**
   * Highlight this legendItem
   * @param {Color} color - Color for the highlight
   */
  highlight(color = this.fontColor) {
    if (!this.visible || !this.legend.visible) { return; }
    // let ctx = this.canvas.context('background');
    // ctx.fillStyle = color;
    // ctx.fillRect(this.textX(), this.textY(), this.width, this.height);
    const ctx = this.canvas.context('ui');
    let x = this.textX();
    if (this.textAlignment === 'center') {
      x -= (this.width / 2);
    } else if (this.textAlignment === 'right') {
      x -= this.width;
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = color.rgbaString;
    ctx.strokeRect(x, this.textY(), this.width, this.height);
  }

  /**
   * Invert the swatch color
   */
  invertColors() {
    const attributes = {
      swatchColor: this.swatchColor.invert().rgbaString
    };
    if (!this.usingDefaultFontColor) {
      attributes.fontColor = this.fontColor.invert().rgbaString;
    }
    this.update(attributes);
  }

  /**
   * Remove legendItem
   */
  remove() {
    this.legend.removeItems(this);
  }

  /**
   * Move this legendItem to a new index in the array of Legend legendItems.
   * @param {Number} newIndex - New index for this caption (0-based)
   */
  move(newIndex) {
    const currentIndex = this.legend.items().indexOf(this);
    this.legend.moveItem(currentIndex, newIndex);
  }

  /**
   * Update legendItem [attributes](#attributes).
   * See [updating records](../docs.html#s.updating-records) for details.
   * @param {Object} attributes - Object describing the properties to change
   */
  update(attributes) {
    this.legend.updateItems(this, attributes);
  }

  /**
   * Returns the features that have this legendItem
   * @param {Integer|String|Array} term - See [CGArray.get](CGArray.html#get) for details.
   * @return {Feature|CGArray}
   */
  features(term) {
    return this.viewer._features.filter( f => f.legendItem === this ).get(term);
  }

  /**
   * Returns the plots that have this legendItem
   * @param {Integer|String|Array} term - See [CGArray.get](CGArray.html#get) for details.
   * @return {Feature|CGArray}
   */
  plots(term) {
    return this.viewer._plots.filter( p => p.legendItem.includes(this) ).get(term);
  }

  /**
   * Returns JSON representing the object
   */
  toJSON(options = {}) {
    const json = {
      name: this.name,
      // font: this.font.string,
      // fontColor: this.fontColor.rgbaString,
      swatchColor: this.swatchColor.rgbaString,
      decoration: this.decoration
      // visible: this.visible
    };
    // Optionally add default values
    if (!this.visible || options.includeDefaults) {
      json.visible = this.visible;
    }
    if (!this.usingDefaultFontColor || options.includeDefaults) {
      json.fontColor = this.fontColor.rgbaString;
    }
    if (!this.usingDefaultFont || options.includeDefaults) {
      json.font = this.font.string;
    }
    return json;
  }

}

//////////////////////////////////////////////////////////////////////////////

/**
 * The Legend contains the [legendItems](LegendItem.html) for the maps and can be placed anywhere on the canvas or map.
 *
 * ### Action and Events
 *
 * Action                                  | Viewer Method                | Legend Method                  | Event
 * ----------------------------------------|------------------------------|--------------------------------|-----
 * [Update](../docs.html#updating-records) | -                            | [update()](Legend.html#update) | legends-update
 * [Read](../docs.html#reading-records)    | [legend](Viewer.html#legend) | -                              | -
 *
 * <a name="attributes"></a>
 * ### Attributes
 *
 * Attribute                          | Type      | Description
 * -----------------------------------|-----------|------------
 * [position](#position)              | String\|Object | Where to draw the legend [Default: 'top-right']. See {@link Position} for details.
 * [anchor](#anchor)                  | String\|Object | Where to anchor the legend box to the position [Default: 'auto']. See {@link Anchor} for details.
 * [defaultFont](#defaultFont)        | String    | A string describing the default font [Default: 'SansSerif, plain, 8']. See {@link Font} for details.
 * [defaultFontColor](#defaultFontColor) | String    | A string describing the default font color [Default: 'black']. See {@link Color} for details.
 * [textAlignment](#textAlignment)    | String    | Alignment of legend text: *left*, *center*, or *right* [Default: 'left']
 * [backgroundColor](#font)           | String    | A string describing the background color of the legend [Default: 'white']. See {@link Color} for details.
 * [on](#on)<sup>ic</sup>             | String    | Place the legend relative to the 'canvas' or 'map' [Default: 'canvas']
 * [items](#items)<sup>iu</sup>       | Array     | Array of legend item data.
 * [visible](CGObject.html#visible)   | Boolean   | Legend is visible [Default: true]
 * [meta](CGObject.html#meta)         | Object    | [Meta data](../tutorials/details-meta-data.html)
 * 
 * <sup>ic</sup> Ignored on Legend creation
 * <sup>iu</sup> Ignored on Legend update
 *
 * ### Examples
 *
 * @extends CGObject
 */
class Legend extends CGObject {

  /**
   * Create a new Legend.
   * @param {Viewer} viewer - The viewer
   * @param {Object} options - [Attributes](#attributes) used to create the legend
   * @param {Object} [meta] - User-defined [Meta data](../tutorials/details-meta-data.html) to add to the legend.
   */
  constructor(viewer, options = {}, meta = {}) {
    super(viewer, options, meta);
    this._items = new CGArray();
    this.backgroundColor = options.backgroundColor;
    // FIXME: start using defaultFontColor, etc from JSON
    this.defaultFontColor = utils.defaultFor(options.defaultFontColor, 'black');
    this.textAlignment = utils.defaultFor(options.textAlignment, 'left');
    this.box = new Box(viewer, {
      position: utils.defaultFor(options.position, 'top-right'),
      anchor: utils.defaultFor(options.anchor, 'middle-center')
    });
    // Setting font will refresh legend and draw
    this.defaultFont = utils.defaultFor(options.defaultFont, 'sans-serif, plain, 14');

    this.viewer.trigger('legend-update', { attributes: this.toJSON({includeDefaults: true}) });

    if (options.items) {
      this.addItems(options.items);
    }
    // FIXME: should be done whenever an item is added
    this.refresh();
  }

  /**
   * Return the class name as a string.
   * @return {String} - 'Legend'
   */
  toString() {
    return 'Legend';
  }

  get visible() {
    return this._visible;
  }

  set visible(value) {
    // super.visible = value;
    this._visible = value;
    this.viewer.refreshCanvasLayer();
    // this.refresh();
  }

  /**
   * @member {Context} - Get the *Context* for drawing.
   * @private
   */
  // FIXME: 
  // - if this is slow we could be set when setting "on" (e.g. this._ctx = ...)
  get ctx() {
    // return this._ctx || this.canvas.context('forground');
    const layer = (this.on === 'map') ? 'foreground' : 'canvas';
    return this.canvas.context(layer);
  }
  //
  // /**
  //  * @member {String} - Alias for getting the position. Useful for querying CGArrays.
  //  */
  // get id() {
  //   return this.position;
  // }

  /**
   * @member {Position} - Get or set the position
   */
  get position() {
    return this.box.position;
  }

  set position(value) {
    this.clear();
    this.box.position = value;
    this.viewer.refreshCanvasLayer();
    // this.refresh();
  }

  /**
   * @member {String} - Get or set where the legend should be position: 'canvas', 'map'
   */
  get on() {
    return this.box.on;
  }

  set on(value) {
    this.clear();
    this.box.on = value;
    this.refresh();
  }

  /**
   * @member {Anchor} - Get or set legend anchor
   */
  get anchor() {
    return this.box.anchor;
  }

  set anchor(value) {
    this.clear();
    this.box.anchor = value;
    this.refresh();
  }

  /**
   * @member {Color} - Get or set the backgroundColor. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
   */
  get backgroundColor() {
    // TODO set to cgview background color if not defined
    return this._backgroundColor;
  }

  set backgroundColor(color) {
    // this._backgroundColor.color = color;
    if (color === undefined) {
      this._backgroundColor = this.viewer.settings.backgroundColor;
    } else if (color.toString() === 'Color') {
      this._backgroundColor = color;
    } else {
      this._backgroundColor = new Color(color);
    }
    this.refresh();
  }

  /**
   * @member {Font} - Get or set the default font. When setting the font, a string representing the font or a {@link Font} object can be used. For details see {@link Font}.
   */
  get defaultFont() {
    return this._defaultFont;
  }

  set defaultFont(value) {
    if (value.toString() === 'Font') {
      this._defaultFont = value;
    } else {
      this._defaultFont = new Font(value);
    }

    // Trigger update events for items with default font
    for (let i = 0, len = this._items.length; i < len; i++) {
      const item = this._items[i];
      if (item.usingDefaultFont) {
        item.update({font: undefined});
      }
    }

    this.refresh();
  }

  /**
   * @member {Color} - Get or set the defaultFontColor. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
   */
  get defaultFontColor() {
    // return this._fontColor.rgbaString;
    return this._defaultFontColor;
  }

  set defaultFontColor(value) {
    if (value.toString() === 'Color') {
      this._defaultFontColor = value;
    } else {
      this._defaultFontColor = new Color(value);
    }

    // Trigger update events for items with default font color
    for (let i = 0, len = this._items.length; i < len; i++) {
      const item = this._items[i];
      if (item.usingDefaultFontColor) {
        item.update({fontColor: undefined});
      }
    }

    this.refresh();
  }

  /**
   * @member {String} - Get or set the text alignment. Possible values are *left*, *center*, or *right*.
   */
  get textAlignment() {
    return this._textAlignment;
  }

  set textAlignment(value) {
    if ( utils.validate(value, ['left', 'center', 'right']) ) {
      this._textAlignment = value;
    }
    this.refresh();
  }

  /**
   * @member {LegendItem} - Get or set the selected swatch legendItem
   * @private
   */
  get selectedSwatchedItem() {
    return this._selectedSwatchedItem;
  }

  set selectedSwatchedItem(value) {
    this._selectedSwatchedItem = value;
  }

  /**
   * @member {LegendItem} - Get or set the highlighted swatch legendItem
   * @private
   */
  get highlightedSwatchedItem() {
    return this._highlightedSwatchedItem;
  }

  set highlightedSwatchedItem(value) {
    this._highlightedSwatchedItem = value;
  }

  /**
   * Update legend [attributes](#attributes).
   * See [updating records](../docs.html#s.updating-records) for details.
   * @param {Object} attributes - Object describing the properties to change
   */
  update(attributes) {
    this.viewer.updateRecords(this, attributes, {
      recordClass: 'Legend',
      validKeys: ['on', 'position', 'anchor', 'defaultFont', 'defaultFontColor', 'textAlignment',  'backgroundColor', 'visible']
    });
    this.viewer.trigger('legend-update', { attributes });
  }

  /**
   * @member {CGArray} - Get the 
   */
  /**
   * Returns a [CGArray](CGArray.html) of legendItems or a single legendItem.
   * See [reading records](../docs.html#s.reading-records) for details.
   * @param {Integer|String|Array} term - See [CGArray.get](CGArray.html#get) for details.
   * @return {LegendItem|CGArray}
   */
  items(term) {
    return this._items.get(term);
  }

  /**
   * @member {CGArray} - Get the vidible legendItems
   * @private
   */
  visibleItems(term) {
    return this._items.filter( i => i.visible ).get(term);
  }

  /**
   * Add one or more [legendItems](LegendItem.html) (see [attributes](LegendItem.html#attributes)).
   * See [adding records](../docs.html#s.adding-records) for details
   * @param {Object|Array} data - Object or array of objects describing the legendItems
   * @return {CGArray<LegendItem>} CGArray of added legendItems
   */
  addItems(itemData = []) {
    itemData = CGArray.arrayerize(itemData);
    const items = itemData.map( (data) => new LegendItem(this, data));
    this.viewer.trigger('legendItems-add', items);
    return items;
  }

  /**
   * Remove legendItems.
   * See [removing records](../docs.html#s.removing-records) for details
   * @param {LegendItem|Array} items - legendItem or a array of legendItems to remove
   */
  removeItems(items) {
    items = CGArray.arrayerize(items);
    this._items = this._items.filter( i => !items.includes(i) );
    this.viewer.clear('canvas');
    this.viewer.refreshCanvasLayer();
    // Remove from Objects
    items.forEach( i => i.deleteFromObjects() );
    this.viewer.trigger('legendItems-remove', items);
  }

  /**
   * Update [attributes](LegendItem.html#attributes) for one or more legendItems.
   * See [updating records](../docs.html#s.updating-records) for details.
   * @param {LegendItem|Array|Object} itemsOrUpdates - legendItem, array of legendItems or object describing updates
   * @param {Object} attributes - Object describing the properties to change
   */
  updateItems(itemsOrUpdates, attributes) {
    const { records: items, updates } = this.viewer.updateRecords(itemsOrUpdates, attributes, {
      recordClass: 'LegendItem',
      validKeys: ['name', 'font', 'fontColor', 'drawSwatch',  'swatchColor', 'decoration', 'visible']
    });
    this.viewer.trigger('legendItems-update', { items, attributes, updates });
  }

  /**
   * Move a legendItem from one index to a new one
   * @param {Number} oldIndex - Index of legendItem to move (0-based)
   * @param {Number} newIndex - New index for the legendItem (0-based)
   */
  moveItem(oldIndex, newIndex) {
    this._items.move(oldIndex, newIndex);
    this.viewer.trigger('legendItems-moved', {oldIndex: oldIndex, newIndex: newIndex});
    this.refresh();
  }

  /**
   * Move to the Legend position (if it's position on the map)
   * @param {Number} duration - Duration of the animation
   */
  moveTo(duration) {
    this.position.moveTo(duration);
  }

  /**
   * Recalculates the *Legend* size and position.
   * @private
   */
  refresh() {
    const box = this.box;
    if (!box) { return; }
    this.clear();

    let height = 0;
    let maxHeight = 0;

    const visibleItems = this.visibleItems();
    for (let i = 0, len = visibleItems.length; i < len; i++) {
      const item = visibleItems[i];
      const itemHeight = item.height;
      height += itemHeight;
      if (i < len - 1) {
        // Add spacing
        height += (itemHeight / 2);
      }
      if (itemHeight > maxHeight) {
        maxHeight = itemHeight;
      }
    }

    box.padding = maxHeight / 2;
    height += box.padding * 2;

    // Calculate Legend Width
    const itemFonts = visibleItems.map( i => i.font.css );
    const itemNames = visibleItems.map( i => i.name );
    const itemWidths = Font.calculateWidths(this.ctx, itemFonts, itemNames);
    for (let i = 0, len = itemWidths.length; i < len; i++) {
      const item = visibleItems[i];
      if (item.drawSwatch) {
        itemWidths[i] += item.height + (box.padding / 2);
      }
      item._width = itemWidths[i];
    }
    const width = d3.max(itemWidths) + (box.padding * 2);

    box.resize(width, height);

    this.draw();
  }

  /**
   * Sets the position of the [ColorPicker](ColorPicker.html).
   * @private
   */
  setColorPickerPosition(cp) {
    const margin = 5;
    const originX = this.box.x;
    const originY = this.box.y;

    // Default: left of legend and aligned with top
    let pos = {x: originX - cp.width - margin, y: originY + margin};

    const legendWidth = this.box.width;
    this.box.height;
    if (originX < cp.width) {
      pos.x = originX + legendWidth + margin;
    }
    if ( (this.viewer.height - originY) < cp.height) {
      pos.y = this.box.bottom - cp.height - margin;
    }

    cp.setPosition(pos);
  }

  /**
   * @member {Number} - Get the swatch padding
   * @private
   */
  get swatchPadding() {
    return this.box.padding / 2;
  }

  /**
   * Fills the legend background color
   * @private
   */
  fillBackground() {
    const box = this.box;
    this.ctx.fillStyle = this.backgroundColor.rgbaString;
    this.clear();
    this.ctx.fillRect(box.x, box.y, box.width, box.height);
  }

  /**
   * Invert colors of all legendItems
   */
  invertColors() {
    this.update({
      backgroundColor: this.backgroundColor.invert().rgbaString,
      defaultFontColor: this.defaultFontColor.invert().rgbaString
    });
    this.items().each( (i, item) => item.invertColors() );
  }

  /**
   * Find the legendItem with the provided name or return undefined.
   * @param {String} name - Name of legendItem
   * @return {LegendItem} Returns undefined if not found
   */
  findLegendItemByName(name) {
    if (typeof name !== 'string') { return; }
    // console.log(name)
    return this._items.find( i => name.toLowerCase() === i.name.toLowerCase() );
  }

  /**
   * Find the legendItem with the provided name or create a new legendItem.
   * @param {String} name - Name of legendItem
   * @param {Color} color - Use this color if creating a new legendItem
   * @param {String} decoration - Use this decoration if creating a new legendItem
   * @return {LegendItem}
   *
   */
  findLegendItemOrCreate(name = 'Unknown', color = null, decoration = 'arc') {
    let item = this.findLegendItemByName(name);
    if (!item) {
      const obj = this.viewer.objects(name);
      if (obj && obj.toString() === 'LegendItem') {
        item = obj;
      }
    }
    if (!item) {
      if (!color) {
        const currentColors = this._items.map( i => i.swatchColor );
        // color = Color.getColor(currentColors);
        color = Color.getColor(currentColors).rgbaString;
      }
      item = this.addItems({
        name: name,
        swatchColor: color,
        decoration: decoration
      })[0];
    }
    return item;
  }

  /**
   * Returns a CGArray of LegendItems that only occur for the supplied features.
   * (i.e. the returned LegendItems are not being used for any features (or plots) not provided.
   * This is useful for determining if LegendItems should be deleted after deleting features.
   * @private
   */
  uniqueLegendsItemsFor(options = {}) {
    const selectedFeatures = new Set(options.features || []);
    const selectedPlots = new Set(options.plots || []);
    const uniqueItems = new Set();

    selectedFeatures.forEach( (f) => {
      uniqueItems.add(f.legend);
    });
    selectedPlots.forEach( (p) => {
      uniqueItems.add(p.legendItemPositive);
      uniqueItems.add(p.legendItemNegative);
    });

    const nonSelectedFeatures = new Set();
    this.viewer.features().each( (i, f) => {
      if (!selectedFeatures.has(f)) {
        nonSelectedFeatures.add(f);
      }
    });
    const nonSelectedPlots = new Set();
    this.viewer.plots().each( (i, p) => {
      if (!selectedPlots.has(p)) {
        nonSelectedPlots.add(p);
      }
    });

    nonSelectedFeatures.forEach( (f) => {
      if (uniqueItems.has(f.legend)) {
        uniqueItems.delete(f.legend);
      }
    });
    nonSelectedPlots.forEach( (p) => {
      if (uniqueItems.has(p.legendItemPositive)) {
        uniqueItems.delete(p.legendItemPositive);
      }
      if (uniqueItems.has(p.legendItemNegative)) {
        uniqueItems.delete(p.legendItemNegative);
      }
    });
    return Array.from(uniqueItems);
  }

  /**
   * Clear the box containing the legend
   */
  clear() {
    this.box.clear(this.ctx);
  }

  /**
   * Draw the legend
   * @private
   */
  draw() {
    if (!this.visible) { return; }
    const ctx = this.ctx;

    // Update the box origin if relative to the map
    this.box.refresh();

    this.fillBackground();
    let swatchX;
    ctx.lineWidth = 1;
    // ctx.textBaseline = 'top';
    ctx.textBaseline = 'alphabetic'; // The default baseline works best across canvas and svg
    for (let i = 0, len = this._items.length; i < len; i++) {
      const legendItem = this._items[i];
      if (!legendItem.visible) { continue; }
      const y = legendItem.textY();
      const drawSwatch = legendItem.drawSwatch;
      const swatchWidth = legendItem.swatchWidth;
      ctx.font = legendItem.font.css;
      ctx.textAlign = legendItem.textAlignment;
      if (drawSwatch) {
        // Swatch border color
        if (legendItem.swatchSelected) {
          ctx.strokeStyle = 'black';
        } else if (legendItem.swatchHighlighted) {
          ctx.strokeStyle = 'grey';
        }
        // Draw box around Swatch depending on state
        swatchX = legendItem.swatchX();
        if (legendItem.swatchSelected || legendItem.swatchHighlighted) {
          const border = 2;
          ctx.strokeRect(swatchX - border, y - border, swatchWidth + (border * 2), swatchWidth + (border * 2));
        }
        // Draw Swatch
        ctx.fillStyle = legendItem.swatchColor.rgbaString;
        ctx.fillRect(swatchX, y, swatchWidth, swatchWidth);
      }
      // Draw Text Label
      ctx.fillStyle = legendItem.fontColor.rgbaString;
      // ctx.fillText(legendItem.name, legendItem.textX(), y);
      ctx.fillText(legendItem.name, legendItem.textX(), y + legendItem.height - 1);
    }
  }

  /**
   * Returns JSON representing the object
   */
  toJSON(options = {}) {
    const json = {
      name: this.name,
      position: this.position.toJSON(options),
      textAlignment: this.textAlignment,
      defaultFont: this.defaultFont.string,
      defaultFontColor: this.defaultFontColor.rgbaString,
      backgroundColor: this.backgroundColor.rgbaString,
      items: []
    };
    if (this.position.onMap) {
      json.anchor = this.anchor.toJSON(options);
    }
    // Optionally add default values
    if (!this.visible || options.includeDefaults) {
      json.visible = this.visible;
    }
    this.items().each( (i, item) => {
      json.items.push(item.toJSON(options));
    });
    return json;
  }

}

//////////////////////////////////////////////////////////////////////////////

class IO {

  /**
   * Interface for reading and writing data to and from CGView
   * @param {Viewer} viewer - Viewer
   */
  constructor(viewer) {
    this._viewer = viewer;
  }

  /**
   * @member {Viewer} - Get the viewer.
   */
  get viewer() {
    return this._viewer;
  }

  /**
   * @member {Number} - Get or set the ability to drag-n-drop JSON files on to viewer
   * @private
   */
  get allowDragAndDrop() {
    return this._allowDragAndDrop;
  }

  set allowDragAndDrop(value) {
    this._allowDragAndDrop = value;
    if (value) {
      this.io.initializeDragAndDrop();
    }
  }

  /**
   * Format the date from created and updated JSON attributes.
   * @param {Date} d - Date to format
   * @private
   */
  formatDate(d) {
    // return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`
    const timeformat = d3.timeFormat('%Y-%m-%d %H:%M:%S');
    return timeformat(d);
  }

  /**
   * Return the CGView map as a JSON object. The JSON can later be loaded using [loadJSON](#loadJSON).
   * See the [JSON page](../json.html) for details on the JSON structure.
   */
  toJSON(options = {}) {
    const v = this.viewer;
    const jsonInfo = v._jsonInfo || {};

    const json = {
      cgview: {
        version: version,
        created: jsonInfo.created || this.formatDate(new Date()),
        updated: this.formatDate(new Date()),
        id: v.id,
        name: v.name,
        format: v.format,
        // geneticCode: v.geneticCode,
        settings: v.settings.toJSON(options),
        backbone: v.backbone.toJSON(options),
        ruler: v.ruler.toJSON(options),
        annotation: v.annotation.toJSON(options),
        dividers: v.dividers.toJSON(options),
        highlighter: v.highlighter.toJSON(options),
        captions: [],
        legend: v.legend.toJSON(options),
        sequence: v.sequence.toJSON(options),
        features: [],
        plots: [],
        bookmarks: [],
        tracks: []
      }
    };
    v.captions().each( (i, caption) => {
      json.cgview.captions.push(caption.toJSON(options));
    });
    v.features().each( (i, feature) => {
      // Only export features that were not extracted from the sequence.
      if (!feature.extractedFromSequence ||
          feature.tracks().filter( t => t.dataMethod !== 'sequence' ).length > 0) {
        json.cgview.features.push(feature.toJSON(options));
      }
    });
    v.plots().each( (i, plot) => {
      // Only export plots that were not extracted from the sequence.
      if (!plot.extractedFromSequence ||
          plot.tracks().filter( t => t.dataMethod !== 'sequence' ).length > 0) {
        json.cgview.plots.push(plot.toJSON(options));
      }
    });
    v.bookmarks().each( (i, bookmark) => {
      json.cgview.bookmarks.push(bookmark.toJSON(options));
    });
    v.tracks().each( (i, track) => {
      json.cgview.tracks.push(track.toJSON(options));
    });
    return json;
  }

  /**
   * Load data from object literal or JSON string ([Format details](../json.html)).
   * The map data must be contained within a top level "cgview" property.
   * Removes any previous viewer data and overrides options that are already set.
   * @param {Object} data - JSON string or Object Literal
   */
  loadJSON(json) {
    try {
      this._loadJSON(json);
    } catch (error) {
      const msg = `Loading Error: ${error}`;
      console.log(msg);
      const canvas = this.viewer.canvas;
      canvas.clear('debug');
      const ctx = canvas.context('debug');
      ctx.fillText(msg, 5, 15);
    }
  }

  _loadJSON(json) {

    let data = json;
    if (typeof json === 'string') {
      data = JSON.parse(json);
    }

    data = this.updateJSON(data);

    data = data && data.cgview;

    if (!data) {
      throw new Error("No 'cgview' property found in JSON.");
    }

    const viewer = this._viewer;
    viewer.clear('all');

    // Reset objects
    viewer._objects = {};

    viewer.trigger('cgv-json-load', data); // would 'io-load' be a better name?
    // In events this should mention how everything is reset (e.g. tracks, features, etc)

    // Viewer attributes
    viewer.update({
      id: data.id,
      name: data.name,
      // geneticCode: data.geneticCode,
    });

    viewer._jsonInfo = {
      version: data.version,
      created: data.created
    };

    // Reset arrays
    viewer._features = new CGArray();
    viewer._tracks = new CGArray();
    viewer._plots = new CGArray();
    viewer._captions = new CGArray();
    viewer._bookmarks = new CGArray();

    viewer._loading = true;

    // Load Sequence
    viewer._sequence = new Sequence(viewer, data.sequence);
    // Load Settings
    // const settings = data.settings || {};
    // General Settings
    viewer._settings = new Settings(viewer, data.settings);
    // Ruler
    viewer._ruler = new Ruler(viewer, data.ruler);
    // Backbone
    viewer._backbone = new Backbone(viewer, data.backbone);
    // Annotation
    viewer._annotation = new Annotation(viewer, data.annotation);
    // Slot Dividers
    // viewer.slotDivider = new Divider(viewer, settings.dividers.slot);
    viewer._dividers = new Dividers(viewer, data.dividers);
    // Highlighter
    viewer._highlighter = new Highlighter(viewer, data.highlighter);

    // Load Bookmarks
    if (data.bookmarks) {
      viewer.addBookmarks(data.bookmarks);
    }

    // Load Captions
    if (data.captions) {
      viewer.addCaptions(data.captions);
    }

    // Load Legend
    viewer._legend = new Legend(viewer, data.legend);

    // Create features
    if (data.features) {
      viewer.addFeatures(data.features);
    }

    // Create plots
    if (data.plots) {
      viewer.addPlots(data.plots);
      // data.plots.forEach((plotData) => {
      //   new Plot(viewer, plotData);
      // });
    }

    // Create tracks
    if (data.tracks) {
      viewer.addTracks(data.tracks);
    }
    // Refresh Annotations
    viewer.annotation.refresh();

    viewer._loading = false;
    viewer.update({dataHasChanged: false});

    // Load Layout
    // viewer._layout = new Layout(viewer, data.layout);
    viewer.format = utils.defaultFor(data.format, 'circular');
    viewer.zoomTo(0, 1, {duration: 0});
  }

  /**
   * Update old CGView JSON formats to the current version.
   * The map data must be contained within a top level "cgview" property.
   * @param {Object} data - Object Literal
   */
  updateJSON(data) {
    data = data && data.cgview;

    if (!data) {
      throw new Error("No 'cgview' property found in JSON.");
    }

    const version = data.version;
    console.log(`Loading map JSON version: '${version}'`);

    let major;
    const result = version.match(/^(\d+)\.(\d+)/);
    if (result) {
      major = Number(result[1]);
      Number(result[2]);
    } else {
      throw new Error(`Can not read cgview version '${version}'`);
    }
    // console.log('major', major)
    // console.log('minor', minor)

    switch (true) {
      case (version === '0.1'):
        data = this._updateVersion_0_1(data);
        break;
      case (version === '0.2'):
        data = this._updateVersion_0_2(data);
        break;
      case (version === '1.0.0'):
        data = this._updateVersion_1_0(data);
        break;
      case (major === 1):
        console.log('No need to convert.');
        break;
      default:
        throw new Error(`Unknown cgview version '${version}'`);
    }
    return {cgview: data};
  }

  // This version is all over the place so concentrate on tracks
  // Version 0.2 started on 2018-08-22
  _updateVersion_0_2(data) {
    // Tracks
    const tracks = data.layout && data.layout.tracks || data.tracks;
    for (const track of tracks) {
      if (track.readingFrame === 'separated') {
        track.separateFeaturesBy = 'readingFrame';
      } else if (track.strand === 'separated') {
        track.separateFeaturesBy = 'strand';
      } else {
        track.separateFeaturesBy = 'none';
      }
      track.dataType = track.contents && track.contents.type || track.dataType;
      track.dataMethod = track.contents && track.contents.from || track.dataMethod;
      track.dataKeys = track.contents && track.contents.extract || track.dataKeys;
    }
    data.tracks = tracks;
    // Version
    data.version = '1.1.0';
    console.log(`Update JSON to version '${data.version}'`);
    return data;
  }

  _updateVersion_0_1(data) {
    const positionMap = {
      'lower-left': 'bottom-left',
      'lower-center': 'bottom-center',
      'lower-right': 'bottom-right',
      'upper-left': 'top-left',
      'upper-center': 'top-center',
      'upper-right': 'top-right',
    };
    // Captions
    const captions = data.captions;
    if (captions) {
      for (const caption of captions) {
        caption.position = positionMap[caption.position] || caption.position;
        caption.font = caption.items[0].font || caption.font;
        caption.fontColor = caption.items[0].fontColor || caption.fontColor;
        caption.name = caption.items.map(i => i.name).join('\n');
      }
    }
    // Legend
    const legend = data.legend;
    legend.position = positionMap[legend.position] || legend.position;
    legend.defaultFont = legend.font;
    // Tracks
    const tracks = data.layout.tracks || [];
    for (const track of tracks) {
      if (track.readingFrame === 'separated') {
        track.separateFeaturesBy = 'readingFrame';
      } else if (track.strand === 'separated') {
        track.separateFeaturesBy = 'strand';
      } else {
        track.separateFeaturesBy = 'none';
      }
      track.dataType = track.contents.type;
      track.dataMethod = track.contents.from;
      track.dataKeys = track.contents.extract;
    }
    data.tracks = tracks;
    // From Settings
    data.annotaion = data.settings.annotaion;
    data.backbone = data.settings.backbone;
    data.dividers = data.settings.dividers;
    data.ruler = data.settings.ruler;
    data.settings = data.settings.general;
    // Plots aren't saved properly on CGView Server so we can ignore
    // Version
    data.version = '1.1.0';
    console.log(`Update JSON to version '${data.version}'`);
    return data;
  }

  _updateVersion_1_0(data) {
    // Contigs are the only chagne for this version
    const contigs = data.sequence && data.sequence.contigs;
    if (contigs) {
      for (const contig of contigs) {
        contig.name = contig.id;
      }
    }
    // Version
    data.version = '1.1.0';
    console.log(`Update JSON to version '${data.version}'`);
    return data;
  }

  /**
   * Download the currently visible map as a PNG image.
   * @param {Number} width - Width of image
   * @param {Number} height - Height of image
   * @param {String} filename - Name to save image file as
   */
  downloadImage(width, height, filename = 'image.png') {
    const viewer = this._viewer;
    const canvas = viewer.canvas;
    width = width || viewer.width;
    height = height || viewer.height;

    // Save current settings
    // let origContext = canvas.ctx;
    const origLayers = canvas._layers;
    const debug = viewer.debug;
    viewer.debug = false;

    // Create new layers and add export layer
    const layerNames = canvas.layerNames.concat(['export']);
    const tempLayers = canvas.createLayers(d3.select('body'), layerNames, width, height, false);

    // Calculate scaling factor
    const minNewDimension = d3.min([width, height]);
    const scaleFactor = minNewDimension / viewer.minDimension;

    // Scale context of layers, excluding the 'export' layer
    for (const name of canvas.layerNames) {
      tempLayers[name].ctx.scale(scaleFactor, scaleFactor);
    }
    canvas._layers = tempLayers;

   // tempLayers.map.ctx = new C2S(1000, 1000); 

    // Draw map on to new layers
    viewer.drawExport();
    viewer.fillBackground();
    // Legend
    viewer.legend.draw();
    // Captions
    for (let i = 0, len = viewer._captions.length; i < len; i++) {
      viewer._captions[i].draw();
    }

    // Copy drawing layers to export layer
    const exportContext = tempLayers.export.ctx;
    exportContext.drawImage(tempLayers.background.node, 0, 0);
    exportContext.drawImage(tempLayers.map.node, 0, 0);
    exportContext.drawImage(tempLayers.foreground.node, 0, 0);
    exportContext.drawImage(tempLayers.canvas.node, 0, 0);

    // Generate image from export layer
    // let image = tempLayers['export'].node.toDataURL();
    tempLayers.export.node.toBlob( (blob) => { this.download(blob, filename, 'image/png');} );
    // console.log(tempLayers.map.ctx.getSerializedSvg(true));

    // Restore original layers and settings
    canvas._layers = origLayers;
    viewer.debug = debug;

    // Delete temp canvas layers
    for (const name of layerNames) {
      d3.select(tempLayers[name].node).remove();
    }
  }

  /**
   * Return the currently visible map as a SVG string.
   * Requires SVGCanvas external dependency:
   * https://github.com/zenozeng/svgcanvas
   */
  getSVG() {
    const SVGContext = this.viewer.externals.SVGContext;
    if (!SVGContext) {
      console.error('SVGContext is not set. This should be set to svgcanvas.Context from https://github.com/zenozeng/svgcanvas');
      return;
    }
    const viewer = this._viewer;
    const canvas = viewer.canvas;
    const width = viewer.width;
    const height = viewer.height;

    // Save current settings
    const origLayers = canvas._layers;
    const debug = viewer.debug;
    viewer.debug = false;

    // Create new layers and add export layer
    // const layerNames = canvas.layerNames.concat(['export']);
    const layerNames = canvas.layerNames;
    const tempLayers = canvas.createLayers(d3.select('body'), layerNames, width, height, false);
    canvas._layers = tempLayers;

    const svgContext = new SVGContext(width, height); 
    tempLayers.map.ctx = svgContext;
    tempLayers.foreground.ctx = svgContext;
    tempLayers.canvas.ctx = svgContext;

    // Override the clearRect method as it's not required for SVG drawing.
    // Otherwise, an additional SVG rect will be drawn obscuring the background.
    svgContext.clearRect = () => {};

    // Manually Draw background here
    svgContext.fillStyle = viewer.settings.backgroundColor.rgbaString;
    svgContext.fillRect(0, 0, width, height);

    // Draw map on to new layers
    viewer.drawExport();
    // Legend
    viewer.legend.draw();
    // Captions
    for (let i = 0, len = viewer._captions.length; i < len; i++) {
      viewer._captions[i].draw();
    }
    // Create SVG
    const svg = tempLayers.map.ctx.getSerializedSvg();

    // Restore original layers and settings
    canvas._layers = origLayers;
    viewer.debug = debug;

    // Delete temp canvas layers
    for (const name of layerNames) {
      d3.select(tempLayers[name].node).remove();
    }

    return svg;
  }
  /**
   * Download the currently visible map as a SVG image.
   * Requires SVGContext external dependency:
   * https://github.com/zenozeng/svgcanvas
   * @param {String} filename - Name to save image file as
   */
  downloadSVG(filename = 'image.svg') {
    const svg = this.getSVG();
    if (svg) {
    this.download(svg, filename, 'image/svg+xml');
    }
  }

  /**
   * Download the map sequence in FASTA format.
   * @param {String} fastaId - ID line for FASTA (i.e. text after '>')
   * @param {String} filename - Name for saved file
   * @param {Object} options - Options for FASTA (see [Sequence.asFasta](Sequence.html#asFasta))
   */
  downloadFasta(fastaId, filename = 'sequence.fa', options = {}) {
    const fasta = this.viewer.sequence.asFasta(fastaId, options);
    this.download(fasta, filename, 'text/plain');
  }

  /**
   * Download the map as a JSON object
   * @param {String} filename - Name for saved file
   * @param {Object} options - Options passed to toJSON
   */
  downloadJSON(filename = 'cgview.json', options = {}) {
    const json = this.viewer.io.toJSON(options);
    this.download(JSON.stringify(json), filename, 'text/json');
  }

  // https://stackoverflow.com/questions/13405129/javascript-create-and-save-file
  /**
   * Download data to a file
   * @param {Object} data - Data to download
   * @param {String} filename - Name for saved file
   * @param {String} type - Mime type for the file
   * @private
   */
  download(data, filename, type = 'text/plain') {
    const file = new Blob([data], {type: type});
    if (window.navigator.msSaveOrOpenBlob) {
      // IE10+
      window.navigator.msSaveOrOpenBlob(file, filename);
    } else {
      // Others
      const a = document.createElement('a');
      const	url = URL.createObjectURL(file);
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(function() {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 0);
    }
  }

  /**
   * Initialize Viewer Drag-n-Drop.
   * TODO: Check if this works still
   * @private
   */
  initializeDragAndDrop() {
    const viewer = this.viewer;
    const canvas = viewer.canvas;
    d3.select(canvas.node('ui')).on('dragleave.dragndrop', (d3Event) => {
      d3Event.preventDefault();
      d3Event.stopPropagation();
      viewer.drawFull();
    });

    d3.select(canvas.node('ui')).on('dragover.dragndrop', (d3Event) => {
      d3Event.preventDefault();
      d3Event.stopPropagation();
    });

    d3.select(canvas.node('ui')).on('drop.dragndrop', (d3Event) => {
      d3Event.preventDefault();
      d3Event.stopPropagation();
      viewer.drawFull();
      const file = d3Event.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = function() {
        const jsonObj = reader.result;
        try {
          const jsonParsed = JSON.parse(jsonObj);
          // sv.trigger('drop');
          viewer.io.loadJSON(jsonParsed.cgview);
          viewer.drawFull();
        } catch (e) {
          // sv.draw();
          // sv.flash('Could not read file: ' + e.message);
        }
      };
      reader.readAsText(file);
    });
  }

}

//////////////////////////////////////////////////////////////////////////////

/**
 * This Layout is in control of handling and drawing the map as a circle
 */
class LayoutCircular {

  /**
   * Create a Layout
   * @private
   */
  constructor(layout) {
    this._layout = layout;
  }

  toString() {
    return 'LayoutCircular';
  }

  // Convenience properties
  get layout() { return this._layout; }
  get viewer() { return this.layout.viewer; }
  get canvas() { return this.layout.canvas; }
  get backbone() { return this.layout.backbone; }
  get sequence() { return this.layout.sequence; }
  get scale() { return this.layout.scale; }
  get width() { return this.layout.width; }
  get height() { return this.layout.height; }

  get type() {
    return 'circular';
  }

  //////////////////////////////////////////////////////////////////////////
  // Required Delegate Methods
  //////////////////////////////////////////////////////////////////////////

  // Return point on Canvas.
  // centerOffset is the radius for circular maps
  pointForBp(bp, centerOffset = this.backbone.adjustedCenterOffset) {
    const radians = this.scale.bp(bp);
    const x = this.scale.x(0) + (centerOffset * Math.cos(radians));
    const y = this.scale.y(0) + (centerOffset * Math.sin(radians));
    return {x: x, y: y};
  }

  bpForPoint(point) {
    const mapX = this.scale.x.invert(point.x);
    const mapY = this.scale.y.invert(point.y);
    return Math.round( this.scale.bp.invert( utils.angleFromPosition(mapX, mapY) ) );
  }


  centerOffsetForPoint(point) {
    // return Math.sqrt( (point.x * point.x) + (point.y * point.y) );
    const mapX = this.scale.x.invert(point.x);
    const mapY = this.scale.y.invert(point.y);
    return Math.sqrt( (mapX * mapX) + (mapY * mapY) );
  }

  // Return the X and Y domains for a bp and zoomFactor
  // Offset: Distances of map center from backbone
  //   0: backbone centered
  //   Minus: backbone moved down from canvas center
  //   Positive: backbone move up from canvas center
  domainsFor(bp, zoomFactor = this.viewer.zoomFactor, bbOffset = 0) {
    const halfRangeWidth = this.scale.x.range()[1] / 2;
    const halfRangeHeight = this.scale.y.range()[1] / 2;

    const centerOffset = (this.backbone.centerOffset * zoomFactor) - bbOffset;
    const centerPt = this._mapPointForBp(bp, centerOffset);

    const x = bp ? centerPt.x : 0;
    const y = bp ? centerPt.y : 0;

    return [ x - halfRangeWidth, x + halfRangeWidth, y + halfRangeHeight, y - halfRangeHeight];
  }

  // Zoom Factor does not affect circular bp scale so we only need
  // to set this once on initialization
  // Note that since the domain will be from 1 to length,
  // the range goes from the top of the circle to 1 bp less
  // than the top of the circle.
  adjustBpScaleRange(initialize = false) {
    if (initialize) {
      const radiansPerBp = (2 * Math.PI) / this.sequence.length;
      const rangeStart = -1 / 2 * Math.PI;
      const rangeStop = (3 / 2 * Math.PI) - radiansPerBp;
      this.scale.bp.range([rangeStart, rangeStop]);
    }
  }


  // TODO if undefined, see if centerOffset is visible
  visibleRangeForCenterOffset(centerOffset, margin = 0) {
    const ranges = this._visibleRangesForRadius(centerOffset, margin);
    if (ranges.length === 2) {
      return new CGRange(this.sequence.mapContig, ranges[0], ranges[1]);
    } else if (ranges.length > 2) {
      return new CGRange(this.sequence.mapContig, ranges[0], ranges[ranges.length - 1]);
    } else if ( (centerOffset - margin) > this._maximumVisibleRadius() ) {
      return undefined;
    } else if ( (centerOffset + margin) < this._minimumVisibleRadius() ) {
      return undefined;
    } else {
      return new CGRange(this.sequence.mapContig, 1, this.sequence.length);
    }
    // } else {
    //   return undefined
    // }
  }

  maxMapThickness() {
    // return this.viewer.minDimension / 2;
    return this.viewer.minDimension * this.layout._maxMapThicknessProportion;
  }

  pixelsPerBp(centerOffset = this.backbone.adjustedCenterOffset) {
    return (centerOffset * 2 * Math.PI) / this.sequence.length;
  }

  clockPositionForBp(bp, inverse = false) {
    const radians = this.scale.bp(bp);
    return utils.clockPositionForAngle( inverse ? (radians + Math.PI) : radians );
  }

  zoomFactorForLength(bpLength) {
    // Use viewer width as estimation arc length
    const arcLength = this.viewer.width;
    const zoomedRadius = arcLength / (bpLength / this.sequence.length * Math.PI * 2);
    return zoomedRadius / this.backbone.centerOffset;
  }

  initialWorkingSpace() {
    // return 0.25 * this.viewer.minDimension;
    return this.viewer.minDimension * this.layout._initialMapThicknessProportion;
  }

  // Calculate the backbone centerOffset (radius) so that the map is centered between the
  // circle center and the edge of the canvas (minDimension)
  updateInitialBackboneCenterOffset(insideThickness, outsideThickness) {
    // midRadius is the point between the circle center and the edge of the canvas
    // on the minDimension.
    const midRadius = this.viewer.minDimension * 0.25;
    // Minimum extra space inside of map
    const insideBuffer = 40; 
    // The mid radius has to have enough space for the inside thickness
    const adjustedMidRadius = Math.max(midRadius, insideThickness + insideBuffer);
    this.backbone.centerOffset = adjustedMidRadius - ((outsideThickness - insideThickness) / 2);
  }

  adjustedBackboneCenterOffset(centerOffset) {
    return centerOffset * this.viewer._zoomFactor;
  }

  path(layer, centerOffset, startBp, stopBp, anticlockwise = false, startType = 'moveTo') {
    // FIXME: change canvas to this where appropriate
    const canvas = this.canvas;
    const ctx = canvas.context(layer);
    const scale = this.scale;

    // Features less than 1000th the length of the sequence are drawn as straight lines
    const rangeLength = anticlockwise ? canvas.sequence.lengthOfRange(stopBp, startBp) : canvas.sequence.lengthOfRange(startBp, stopBp);
    if ( rangeLength < (canvas.sequence.length / 1000)) {
      const p2 = this.pointForBp(stopBp, centerOffset);
      if (startType === 'lineTo') {
        const p1 = this.pointForBp(startBp, centerOffset);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
      } else if (startType === 'moveTo') {
        const p1 = this.pointForBp(startBp, centerOffset);
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
      } else if (startType === 'noMoveTo') {
        ctx.lineTo(p2.x, p2.y);
      }
    } else {
      // ctx.arc(scale.x(0), scale.y(0), centerOffset, scale.bp(startBp), scale.bp(stopBp), anticlockwise);

      // console.log(startBp, stopBp)
      // console.log(scale.bp(startBp))
      // console.log(scale.bp(stopBp))

      // This code is required to draw SVG images correctly
      // SVG can not handle arcs drawn as circles
      // So for arcs that are close to becoming full circles, 
      // they are split into 2 arcs
      if ( (rangeLength / canvas.sequence.length) > 0.95) {
        const startRads = scale.bp(startBp);
        const stopRads = scale.bp(stopBp);
        let midRads = startRads + ((stopRads - startRads) / 2);
        // 1 bp of cushion is given to prevent calling this when start and stop are the same
        // but floating point issues cause one to be larger than the other
        if ( (startBp > (stopBp+1) && !anticlockwise) || (startBp < (stopBp-1) && anticlockwise) ) {
          // Mid point is on opposite side of circle
          midRads += Math.PI;
        }
        ctx.arc(scale.x(0), scale.y(0), centerOffset, startRads, midRads, anticlockwise);
        ctx.arc(scale.x(0), scale.y(0), centerOffset, midRads, stopRads, anticlockwise);
      } else {
        ctx.arc(scale.x(0), scale.y(0), centerOffset, scale.bp(startBp), scale.bp(stopBp), anticlockwise);
      }

    }
  }

  centerCaptionPoint() {
    return this.pointForBp(0, 0);
  }

  //////////////////////////////////////////////////////////////////////////
  // Helper Methods
  //////////////////////////////////////////////////////////////////////////

  // Return map point (map NOT canvas coordinates) for given bp and centerOffset.
  // centerOffset is the radius for circular maps
  _mapPointForBp(bp, centerOffset = this.backbone.adjustedCenterOffset) {
    const radians = this.scale.bp(bp);
    const x = centerOffset * Math.cos(radians);
    const y = -centerOffset * Math.sin(radians);
    return {x: x, y: y};
  }

  _centerVisible() {
    const x = this.scale.x(0);
    const y = this.scale.y(0);
    return (x >= 0 &&
            x <= this.width &&
            y >= 0 &&
            y <= this.height);
  }

  /**
   * Return the distance between the circle center and the farthest corner of the canvas
   */
  _maximumVisibleRadius() {
    // Maximum distance on x axis between circle center and the canvas 0 or width
    const maxX = Math.max( Math.abs(this.scale.x.invert(0)), Math.abs(this.scale.x.invert(this.width)) );
    // Maximum distance on y axis between circle center and the canvas 0 or height
    const maxY = Math.max( Math.abs(this.scale.y.invert(0)), Math.abs(this.scale.y.invert(this.height)) );
    // Return the hypotenuse
    return Math.sqrt( (maxX * maxX) + (maxY * maxY) );
  }

  _minimumVisibleRadius() {
    if (this._centerVisible()) {
      // Center is visible so the minimum radius has to be 0
      return 0;
    } else if ( utils.oppositeSigns(this.scale.x.invert(0), this.scale.x.invert(this.width)) ) {
      // The canvas straddles 0 on the x axis, so the minimum radius is the distance to the closest horizontal line
      return Math.min( Math.abs(this.scale.y.invert(0)), Math.abs(this.scale.y.invert(this.height)));
    } else if ( utils.oppositeSigns(this.scale.y.invert(0), this.scale.y.invert(this.height)) ) {
      // The canvas straddles 0 on the y axis, so the minimum radius is the distance to the closest vertical line
      return Math.min( Math.abs(this.scale.x.invert(0)), Math.abs(this.scale.x.invert(this.width)));
    } else {
      // Closest corner of the canvas
      // Minimum distance on x axis between circle center and the canvas 0 or width
      const minX = Math.min( Math.abs(this.scale.x.invert(0)), Math.abs(this.scale.x.invert(this.width)) );
      // Minimum distance on y axis between circle center and the canvas 0 or height
      const minY = Math.min( Math.abs(this.scale.y.invert(0)), Math.abs(this.scale.y.invert(this.height)) );
      // Return the hypotenuse
      return Math.sqrt( (minX * minX) + (minY * minY) );
    }
  }

  _visibleRangesForRadius(radius, margin = 0) {
    const angles = utils.circleAnglesFromIntersectingRect(radius,
      this.scale.x.invert(0 - margin),
      this.scale.y.invert(0 - margin),
      this.width + (margin * 2),
      this.height + (margin * 2)
    );
    return angles.map( a => Math.round(this.scale.bp.invert(a)) );
  }

}

//////////////////////////////////////////////////////////////////////////////

/**
 * This Layout is in control of handling and drawing the map as a line
 */
class LayoutLinear {

  /**
   * Create a Layout
   * @private
   */
  constructor(layout) {
    this._layout = layout;
  }

  toString() {
    return 'LayoutLinear';
  }

  // Convenience properties
  get layout() { return this._layout; }
  get viewer() { return this.layout.viewer; }
  get canvas() { return this.layout.canvas; }
  get backbone() { return this.layout.backbone; }
  get sequence() { return this.layout.sequence; }
  get scale() { return this.layout.scale; }
  get width() { return this.layout.width; }
  get height() { return this.layout.height; }

  get type() {
    return 'linear';
  }

  //////////////////////////////////////////////////////////////////////////
  // Required Delegate Methods
  //////////////////////////////////////////////////////////////////////////

  pointForBp(bp, centerOffset = this.backbone.adjustedCenterOffset) {
    const x = this.scale.x(this.scale.bp(bp));
    const y = this.scale.y(centerOffset);
    return {x: x, y: y};
  }

  // NOTE: only the X coordinate of the point is required
  bpForPoint(point) {
    const mapX = this.scale.x.invert(point.x);
    return Math.round( this.scale.bp.invert( mapX) );
  }

  centerOffsetForPoint(point) {
    // return point.y;
    return this.scale.y.invert(point.y);
  }

  // Return the X and Y domains for a bp and zoomFactor
  // Offset: Distances of map center from backbone
  //   0: backbone centered
  //   Minus: backbone moved down from canvas center
  //   Positive: backbone move up from canvas center
  domainsFor(bp, zoomFactor = this.viewer.zoomFactor, bbOffset = 0) {
    const halfRangeWidth = this.scale.x.range()[1] / 2;
    const halfRangeHeight = this.scale.y.range()[1] / 2;

    // _mapPointForBp requires the bp scale be first altered for the zoom level
    const origScaleBp = this.scale.bp.copy();

    const rangeHalfWidth2 = this.canvas.width * zoomFactor / 2;
    this.scale.bp.range([-rangeHalfWidth2, rangeHalfWidth2]);

    const centerPt = this._mapPointForBp(bp, (this.backbone.centerOffset - bbOffset));
    // Return to the original scale
    this.scale.bp = origScaleBp;
    const x = bp ? centerPt.x : 0;
    const y = bp ? centerPt.y : 0;

    return [ x - halfRangeWidth, x + halfRangeWidth, y + halfRangeHeight, y - halfRangeHeight];
  }

  // Does not need the initial argument
  adjustBpScaleRange() {
    const rangeHalfWidth = this.canvas.width * this.viewer.zoomFactor / 2;
    this.scale.bp.range([-rangeHalfWidth, rangeHalfWidth]);
  }

  // TODO if undefined, see if centerOffset is visible
  visibleRangeForCenterOffset(centerOffset, margin = 0) {
    const domainX = this.scale.x.domain();
    const start = Math.floor(this.scale.bp.invert(domainX[0] - margin));
    const end = Math.ceil(this.scale.bp.invert(domainX[1] + margin));
    return new CGRange(this.sequence.mapContig,
      Math.max(start, 1),
      Math.min(end, this.sequence.length));
  }

  maxMapThickness() {
    // return this.viewer.height / 2;
    return this.viewer.height * this.layout._maxMapThicknessProportion;
  }

  // For linear maps the pixels per bp is independent of the centerOffset
  pixelsPerBp(centerOffset = this.backbone.adjustedCenterOffset) {
    const scaleBp = this.scale.bp;
    const range = scaleBp.range();
    return  (range[1] - range[0]) / (scaleBp.invert(range[1]) - scaleBp.invert(range[0]));
  }

  clockPositionForBp(bp, inverse = false) {
    return inverse ? 6 : 12;
  }

  zoomFactorForLength(bpLength) {
    return this.sequence.length / bpLength;
  }

  initialWorkingSpace() {
    // return 0.25 * this.viewer.minDimension;
    return this.viewer.minDimension * this.layout._initialMapThicknessProportion;
  }

  // The backbone will be the center of the map
  updateInitialBackboneCenterOffset(insideThickness, outsideThickness) {
    this.backbone.centerOffset = 0;
  }

  adjustedBackboneCenterOffset(centerOffset) {
    return centerOffset;
  }

  path(layer, centerOffset, startBp, stopBp, anticlockwise = false, startType = 'moveTo') {
    const canvas = this.canvas;
    const ctx = canvas.context(layer);

    // FIXME: have option to round points (could use for divider lines)
    const p2 = this.pointForBp(stopBp, centerOffset);
    if (startType === 'lineTo') {
      const p1 = this.pointForBp(startBp, centerOffset);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
    } else if (startType === 'moveTo') {
      const p1 = this.pointForBp(startBp, centerOffset);
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
    } else if (startType === 'noMoveTo') {
      ctx.lineTo(p2.x, p2.y);
    }
  }

  centerCaptionPoint() {
    const bp = this.sequence.length / 2;
    // FIXME: this should be calculated based on the thickness of the slots
    return this.pointForBp(bp , -200);
  }

  //////////////////////////////////////////////////////////////////////////
  // Helper Methods
  //////////////////////////////////////////////////////////////////////////

  // Return map point (map NOT canvas coordinates) for given bp and centerOffset.
  // centerOffset is the distance from the backbone.
  _mapPointForBp(bp, centerOffset = this.backbone.adjustedCenterOffset) {
    const x = this.scale.bp(bp);
    const y = centerOffset;
    return {x: x, y: y};
  }


}

// FIXME: Use delegate for layout format

// NOTES:
//  - _adjustProportions is called when components: dividers, backbone, tracks/slots
//      - change in number, visibility or thickness
//      - layout format changes
//      - max/min slot thickness change
//      - initial/max map thickness proportion
//  - updateLayout is called when
//      - proportions are updated
//      - every draw loop only if the zoom level has changed

  /**
   * Layout controls how everything is draw on the map.
   * It also determines the best size for the tracks so they fit on the map.
   * See [Map Scales](../tutorials/details-map-scales.html) for details on
   * circular and linear layouts.
   */
class Layout {

  /**
   * Create a the Layout
   */
  constructor(viewer) {
    this._viewer = viewer;

    // _fastMaxFeatures is the maximum number of features allowed to be drawn in fast mode.
    this._fastMaxFeatures = 1000;
    // FIXME: move to settings
    // this._minSlotThickness = CGV.defaultFor(data.minSlotThickness, 1);
    // this._maxSlotThickness = CGV.defaultFor(data.maxSlotThickness, 50);
    this._minSlotThickness = 1;
    this._maxSlotThickness = 50;
    // Default values. These will be overridden by the values in Settings.
    this._maxMapThicknessProportion = 0.5;
    this._initialMapThicknessProportion = 0.1;

    // Setup scales
    this._scale = {};

    this._adjustProportions();
  }

  toString() {
    return 'Layout';
  }

  // FIXME: make all these convience properties like in the delegates
  //  - this will clear up the documentation and reduce the lines of unexciting code
  /**
   * @member {Viewer} - Get the *Viewer*
   */
  get viewer() {
    return this._viewer;
  }


  /** * @member {Canvas} - Get the *Canvas*
   */
  get canvas() {
    return this.viewer.canvas;
  }

  /** * @member {Number} - Get the canvas width
   */
  get width() {
    return this.canvas.width;
  }

  /** * @member {Number} - Get the canvas height
   */
  get height() {
    return this.canvas.height;
  }

  /** * @member {Sequence} - Get the *Sequence*
   */
  get sequence() {
    return this.viewer.sequence;
  }

  /** * @member {Backbone} - Get the *Backbone*
   */
  get backbone() {
    return this.viewer.backbone;
  }

  /**
   * @member {Object} - Return an object that contains the 3 [D3 Continuous Scales](https://github.com/d3/d3-scale#continuous-scales) used by CGView.
   * See [Map Scales](../tutorials/details-map-scales.html) for details.
   *
   * Scale | Description
   * ------|------------
   *  x    | Convert between the canvas x position (0 is left side of canvas) and map x position (center of map).
   *  y    | Convert between the canvas y position (0 is top side of canvas) and map y position (center of map).
   *  bp - circular | Convert between bp and radians (Top of map is 1 bp and -π/2).
   *  bp - linear   | Convert between bp and distance on x-axis
   */
  // ```js
  // // Examples:
  // // For a map with canvas width and height of 600. Before moving or zooming the map.
  // canvas.scale.x(0)          // 300
  // canvas.scale.y(0)          // 300
  // canvas.scale.x.invert(300) // 0
  // canvas.scale.y.invert(300) // 0
  // // For a map with a length of 1000
  // canvas.scale.bp(1)        // -π/2
  // canvas.scale.bp(250)      // 0
  // canvas.scale.bp(500)      // π/2
  // canvas.scale.bp(750)      // π
  // canvas.scale.bp(1000)     // 3π/2
  // canvas.scale.bp(1000)     // 3π/2
  // canvas.scale.bp.invert(π) // 750
  // ```
  get scale() {
    return this._scale;
  }

  get delegate() {
    return this._delegate;
  }

  /**
   * @member {Canvas} - Get or set the layout type: linear or circular.
   */
  get type() {
    return this.delegate && this.delegate.type;
  }

  set type(value) {
    // Determine map center bp before changing layout
    const centerBp = this.delegate && this.canvas.bpForCanvasCenter();
    const layoutChanged = Boolean(this.delegate && this.type !== value);
    if (value === 'linear') {
      this._delegate = new LayoutLinear(this);
    } else if (value === 'circular') {
      this._delegate = new LayoutCircular(this);
    } else {
      throw 'Layout type must be one of the following: linear, circular';
    }
    this._adjustProportions();
    this.updateScales(layoutChanged, centerBp);
  }

  /** * @member {Number} - Get the distance from the backbone to the inner/bottom edge of the map.
   */
  get bbInsideOffset() {
    return this._bbInsideOffset;
  }

  /** * @member {Number} - Get the distance from the backbone to the outer/top edge of the map.
   */
  get bbOutsideOffset() {
    return this._bbOutsideOffset;
  }

  /** * @member {Number} - Get the distance from the center of the map to the inner/bottom edge of the map.
   */
  get centerInsideOffset() {
    return this._bbInsideOffset + this.backbone.adjustedCenterOffset;
  }

  /** * @member {Number} - Get the distance from the center of the map to the outer/top edge of the map.
   */
  get centerOutsideOffset() {
    return this._bbOutsideOffset + this.backbone.adjustedCenterOffset;
  }

  /** * @member {Number} - Get an object with stats about slot thickness ratios.
   * @private
   */
  get slotThicknessRatioStats() {
    return this._slotThicknessRatioStats;
  }

  /** * @member {Number} - Get an object with stats about slot proportion of map thickness.
   * @private
   */
  get slotProportionStats() {
    return this._slotProportionStats;
  }

  //////////////////////////////////////////////////////////////////////////
  // Required Delegate Methods
  //////////////////////////////////////////////////////////////////////////

  /**
   * @typedef {Object} Point
   * @property {number} x The X Coordinate
   * @property {number} y The Y Coordinate
   */

  /**
   * Returns the point on the canvas for the given *bp* and *centerOffset*.
   * @param {Number} bp - Basepair
   * @param {Number} [centerOffset={@link Backbone#adjustedCenterOffset Backbone.adjustedCenterOffset}] - Distance from the center of the map. For a circular map, this is the radius, while for a linear map, it's the distance from the backbone.
   *
   * @returns {Point} - The point on the canvas.
   */
  pointForBp(...args) {
    return this.delegate.pointForBp(...args);
  }

  /**
   * Returns the basepair corresponding to the given *point* on the canvas.
   * @param {Point} point - Point on the canvas.
   *
   * @returns {Number} - The basepair.
   */
  bpForPoint(...args) {
    return this.delegate.bpForPoint(...args);
  }

  /**
   * Returns the Center Offset for the given *point* on the canvas.
   * Center offset is the distance from the center of the map.
   * For a circular map, this is the radius, while for a linear map, it's the distance from the backbone.
   * @param {Point} point - Point on the canvas.
   *
   * @returns {Number} - Center Offset
   */
  centerOffsetForPoint(...args) {
    return this.delegate.centerOffsetForPoint(...args);
  }

  /**
   * Returns the X and Y scale domains for the given *bp* and *zoomFactor*.
   * @param {Number} bp - Basepair
   * @param {Number} [zoomFactor=Current viewer zoom factor] - The zoom factor used to calculate the domains
   *
   * @returns {Array} - The X and Y scale domains in the form of [[X1, X2], [Y1, Y2]].
   */
  domainsFor(...args) {
    return this.delegate.domainsFor(...args);
  }

  /**
   * Adjust the scale.bp.range. This methods is mainly required for Linear maps and is called
   * when ever the zoomFactor is changed. For circular maps, it only needs to be called when
   * initializing the bp scale.
   * @param {Boolean} initialize - Only used by Circular maps.
   * @private
   */
  adjustBpScaleRange(...args) {
    return this.delegate.adjustBpScaleRange(...args);
  }

  /**
   * Return the CGRange for the sequence visisible at the given *centerOffset*.
   * The *margin* is a distance in pixels added on to the Canvas size when
   * calculating the CGRange.
   * @param {Number} centerOffset - The distance from the center of them map.
   * @param {Number} margin - An amount (in pixels) added to the Canvas in all dimensions.
   *
   * @returns {CGRange} - the visible range.
   */
  // visibleRangeForCenterOffset(offset, margin = 0) {
  visibleRangeForCenterOffset(...args) {
    return this.delegate.visibleRangeForCenterOffset(...args);
  }

  /**
   * Return the maximum thickness of the map. Depends on the dimensions of the Canvas.
   * @returns {Number}
   * @private
   */
  maxMapThickness() {
    return this.delegate.maxMapThickness();
  }

  /**
   * The number of pixels per basepair along the given *centerOffset*.
   * @param {Number} [centerOffset={@link Backbone#adjustedCenterOffset Backbone.adjustedCenterOffset}] - Distance from the center of the map. For a circular map, this is the radius, while for a linear map, it's the distance from the backbone.
   * @return {Number} - Pixels per basepair.
   */
  pixelsPerBp(...args) {
    return this.delegate.pixelsPerBp(...args);
  }

  /**
   * Returns the clock position (1-12) for the supplied bp.
   * For example, the top of the map would be 12, the bottom would be 6 and
   * the right side of a circular map will be 3.
   * @param {Number} bp - Basepair position on the map.
   * @param {Boolean} invers - When true, give the opposite clock position (e.g. 6 instead of 12).
   *
   * @returns {Number} - An integer between 1 and 12.
   */
  clockPositionForBp(...args) {
    return this.delegate.clockPositionForBp(...args);
  }

  /**
   * Estimate of the zoom factor, if the viewer was only showing the given *bpLength*
   * as a portion of the total length.
   * @param {Number} bpLength - Length in basepairs.
   * @returns {Number} - Zoom Factor
   * @private
   */
  zoomFactorForLength(...args) {
    return this.delegate.zoomFactorForLength(...args);
  }

  /**
   * Return the initial maximum space/thickness to draw the map around the backbone.
   * This is usually some fraction of the viewer dimensions.
   * @returns {Number}
   * @private
   */
  initialWorkingSpace() {
    return this.delegate.initialWorkingSpace();
  }

  /**
   * Set the backbone centerOffset based on the approximate inside and outside
   * thickness of the map.
   * @param {Number} insideThickness - The thickness of the inside of the map. From
   *   the backbone down (linear) or towards the center (circular).
   * @param {Number} outsideThickness - The thickness of the outside of the map. From
   *   the backbone up (linear) or towards the outside (circular).
   *   @private
   */
  updateInitialBackboneCenterOffset(...args) {
    this.delegate.updateInitialBackboneCenterOffset(...args);
  }

  /**
   * Return an the backbone center offset adjusted for the zoom level.
   * @param {Number} centerOffset - The backbone initial centerOffset.
   * @returns {Number} adjustedCenterOffset
   */
  adjustedBackboneCenterOffset(...args) {
    return this.delegate.adjustedBackboneCenterOffset(...args);
  }

  // FIXME: update arguments
  /**
   * Adds a lineTo path to the given *layer*. Path does not draw. It only adds lineTo and optionally moveTo
   * commands to the context for the given *layer*.
   * @param {String} layer - The name of the canvas layer to add the path.
   * @param {Number} centerOffset - This distance from the center of the Map.
   * @param {Number} startBp - The start position in basepairs.
   * @param {Number} stopBp - The stop position in basepairs.
   * @param {Boolean} [anticlockwise=false] - For circular maps the default direction is clockwise. Set this to true to draw arcs, anticlockwise.
   * @param {String} [startType='moveTo'] - How the path should be started. Allowed values:
   * <br /><br />
   *  - moveTo:  *moveTo* start; *lineTo* stop
   *  - lineTo: *lineTo* start; *lineTo* stop
   *  - noMoveTo:  ingore start; *lineTo* stop
   */
  path(...args) {
    this.delegate.path(...args);
  }

  // Returns appropriate center point for captions
  // e.g. center of circlular map or right below linear map
  centerCaptionPoint() {
    return this.delegate.centerCaptionPoint();
  }


  //////////////////////////////////////////////////////////////////////////
  // Common methods for current layouts: linear, circular
  //  - These methods may have to be altered if additional layouts are added
  //////////////////////////////////////////////////////////////////////////

  // NOTES:
  //  - 3 scenarios
  //    - scales have not been initialized so simple center the map
  //    - scales already initialized and layout has not changed
  //      - keep the map centered as the scales change
  //    - layout changed
  //      - based on zoom will the whole map be in the canvas (determine from radius for the zoom)
  //        - if so: center the map
  //        - if not: center the map on the backbone at the bp that was the linear center
  updateScales(layoutChanged, bp) {
    if (!this.sequence) { return; }
    bp = bp && this.sequence.constrain(bp);
    const canvas = this.canvas;
    const scale = this.scale;

    // BP Scale
    scale.bp = d3.scaleLinear()
      .domain([1, this.sequence.length]);
    // The argument 'true' only affects the circular version of this method
    this.adjustBpScaleRange(true);
    this.viewer._updateZoomMax();

    // X/Y Scales
    if (layoutChanged) {
      // Deleting the current scales will cause the map to be centered
      scale.x = undefined;
      scale.y = undefined;
      this._updateScaleForAxis('x', canvas.width);
      this._updateScaleForAxis('y', canvas.height);
      // At larger zoom levels and when a bp was given, center the map on that bp
      const zoomFactorCutoff = 1.25;
      if (this.viewer.zoomFactor > zoomFactorCutoff && bp) {
        this.viewer.zoomTo(bp, this.viewer.zoomFactor, {duration: 0});
      }
    } else {
      // The canvas is being resized or initialized
      this._updateScaleForAxis('x', canvas.width);
      this._updateScaleForAxis('y', canvas.height);
    }
  }

  // The center of the zoom will be the supplied bp position on the backbone.
  // The default bp will be based on the center of the canvas.
  zoom(zoomFactor, bp = this.canvas.bpForCanvasCenter()) {
    // Center of zoom before zooming
    const {x: centerX1, y: centerY1} = this.pointForBp(bp);

    zoomFactor = utils.constrain(zoomFactor, this.viewer.minZoomFactor, this.viewer.maxZoomFactor);

    // Update the d3.zoom transform.
    // Only need to do this if setting Viewer.zoomFactor. The zoom transform is set
    // automatically when zooming via d3 (ie. in Viewer-Zoom.js)
    d3.zoomTransform(this.canvas.node('ui')).k = zoomFactor;

    // Update zoom factor
    this.viewer._zoomFactor = zoomFactor;

    // Update the BP scale, currently this is only needed for the linear layout
    this.adjustBpScaleRange();

    // Center of zoom after zooming
    // pointForBp is on the backbone by default
    const {x: centerX2, y: centerY2} = this.pointForBp(bp);

    // Find differerence in x/y and translate the domains
    const dx = centerX1 - centerX2;
    const dy = centerY2 - centerY1;
    this.translate(dx, -dy);
  }

  translate(dx, dy) {
    const domainX = this.scale.x.domain();
    const domainY = this.scale.y.domain();
    this.scale.x.domain([domainX[0] - dx, domainX[1] - dx]);
    this.scale.y.domain([domainY[0] + dy, domainY[1] + dy]);
  }


  //////////////////////////////////////////////////////////////////////////
  // Methods for determining offsets and Drawing
  // FIXME: Organized better
  //////////////////////////////////////////////////////////////////////////

  _updateSlotThicknessRatioStats(slots = this.visibleSlots()) {
    const thicknessRatios = slots.map( s => s.thicknessRatio );
    this._slotThicknessRatioStats = {
      min: d3.min(thicknessRatios),
      max: d3.max(thicknessRatios),
      sum: d3.sum(thicknessRatios)
    };
  }

  _updateSlotProportionStats(slots = this.visibleSlots()) {
    const proportions = slots.map( s => s.proportionOfMap );
    this._slotProportionStats = {
      min: d3.min(proportions),
      max: d3.max(proportions),
      sum: d3.sum(proportions)
    };
  }

  // position: 'inside', 'outside'
  _trackNonSlotSpace(track, position = 'inside') {
    const dividers = this.viewer.dividers;

    const slots = track.slots().filter( s =>  s.visible && s[position] );

    let space = 0;
    if (slots.length > 0) {
      // Add track start and end divider spacing
      space += dividers.track.adjustedSpacing * 2;
      // Add track divider thickness
      space += dividers.track.adjustedThickness;
      // Add slot divider spacing and thickness
      const slotDividerCount = slots.length - 1;
      space += slotDividerCount * ((dividers.slot.adjustedSpacing * 2) + dividers.slot.adjustedThickness);
    }
    return space;
  }

  // Returns the space (in pixels) of everything but the slots
  // i.e. dividers, spacing, and backbone
  // position: 'inside', 'outside', 'both'
  // Note: the backbone is only included if position is 'both'
  _nonSlotSpace(position = 'both') {
    let space = 0;
    const visibleTracks = this.tracks().filter( t =>  t.visible );
    for (let i = 0, len = visibleTracks.length; i < len; i++) {
      const track = visibleTracks[i];
      if (position === 'both') {
        space += this._trackNonSlotSpace(track, 'inside');
        space += this._trackNonSlotSpace(track, 'outside');
      } else {
        space += this._trackNonSlotSpace(track, position);
      }
    }
    if (position === 'both') {
      space += this.backbone.adjustedThickness;
    }

    return space;
  }

  _findSpace(visibleSlots, spaceType = 'min') {
    visibleSlots = visibleSlots || this.visibleSlots();
    const findMinSpace = (spaceType === 'min');
    const minSlotThickness = this.minSlotThickness;
    const maxSlotThickness = this.maxSlotThickness;
    const minThicknessRatio = this.slotThicknessRatioStats.min;
    const maxThicknessRatio = this.slotThicknessRatioStats.max;
    // let space = this._nonSlotSpace(visibleSlots);
    let space = this._nonSlotSpace();
    // If the min and max slot thickness range is too small for the min/max thickness ratio,
    // we have to scale the ratios
    const scaleRatios = (minSlotThickness / minThicknessRatio * maxThicknessRatio > maxSlotThickness);
    for (let i = 0, len = visibleSlots.length; i < len; i++) {
      const slot = visibleSlots[i];
      // Add Slot thickness based on thicknessRatio and min/max slot thickness
      if (scaleRatios) {
        space += utils.scaleValue(slot.thicknessRatio,
          {min: minThicknessRatio, max: maxThicknessRatio},
          {min: minSlotThickness, max: maxSlotThickness});
      } else {
        if (findMinSpace) {
          space += slot.thicknessRatio * minSlotThickness / minThicknessRatio;
        } else {
          space += slot.thicknessRatio * maxSlotThickness / maxThicknessRatio;
        }
      }
    }
    return space;
  }

  _minSpace(visibleSlots) {
    return this._findSpace(visibleSlots, 'min');
  }

  _maxSpace(visibleSlots) {
    return this._findSpace(visibleSlots, 'max');
  }

  /**
   * Calculate the backbone centerOffset and slot proportions based on the Viewer size and
   * the number of slots. Note, that since this will usually move the map
   * backbone for circular maps, it also recenters the map backbone If the 
   * zoomFactor is above 2.
   * @private
   */
  _adjustProportions() {
    const viewer = this.viewer;
    if (viewer.loading) { return; }
    const visibleSlots = this.visibleSlots();
    this._updateSlotThicknessRatioStats(visibleSlots);
    // The initial maximum amount of space for drawing slots, backbone, dividers, etc
    this.initialWorkingSpace();
    // Minimum Space required (based on minSlotThickness)
    this._minSpace(visibleSlots);
    // Calculate nonSlotSpace
    // const nonSlotSpace = this._nonSlotSpace() * thicknessScaleFactor;
    // let slotSpace = (workingSpace * thicknessScaleFactor) - nonSlotSpace;

    // FIXME: Issues with negative slot space for above. Try this for now:
    // I really need to rethink this
    const minSize = this.initialWorkingSpace() * viewer.zoomFactor;
    const mapThickness = Math.min(minSize, this.maxMapThickness());
    const slotSpace = mapThickness;
    // console.log(workingSpace, slotSpace, thicknessScaleFactor, nonSlotSpace)

    // The sum of the thickness ratios
    const thicknessRatioSum = this.slotThicknessRatioStats.sum;

    let outsideThickness = this._nonSlotSpace('outside');
    let insideThickness = this._nonSlotSpace('inside');

    // Update slot thick proportions
    this.visibleSlots().each( (i, slot) => {
      slot.proportionOfMap = slot.thicknessRatio / thicknessRatioSum;
      const slotThickness = slotSpace * slot.proportionOfMap;
      if (slot.inside) {
        insideThickness += slotThickness;
      } else {
        outsideThickness += slotThickness;
      }
    });
    this._updateSlotProportionStats(visibleSlots);

    this.updateInitialBackboneCenterOffset(insideThickness, outsideThickness);

    this._calculateMaxMapThickness();

    this.updateLayout(true);
    // Recenter map
    if (viewer.zoomFactor > 2) {
      viewer.moveTo(undefined, undefined, {duration: 0});
    }
  }
  // NOTE:
  // - Also calculate the maxSpace
  //   - then convert to proportion of radius [maxSpaceProportion]
  //   - then use the min(maxSpaceProportion and calculated proportion [slot.thicknessRation / sum slot.thicknessRatio ]
  //   - then assign proportionOfRadius to each slot
  //     - calculated proportion / the min (from above)
  //     - could use scaler here
  // - or drawing slots, dividers, etc should use layout.scaleFactor when drawing
  // console.log({
  //   workingSpace: workingSpace,
  //   minSpace: minSpace,
  //   thicknessScaleFactor: thicknessScaleFactor,
  //   nonSlotSpace: nonSlotSpace,
  //   slotSpace: slotSpace,
  //   // thicknessRatios: thicknessRatios,
  //   thicknessRatioSum: thicknessRatioSum
  // });

  // FIXME: temp while i figure things out
  // - IF this is used, create slotSpace method
  _calculateMaxMapThickness() {
    const viewer = this.viewer;
    const savedZoomFactor = viewer.zoomFactor;
    // Default Map Width
    viewer._zoomFactor = 1;
    this.updateLayout(true);
    this.bbOutsideOffset - this.bbInsideOffset;

    let defaultSlotTotalThickness = 0;

    const visibleTracks = this.tracks().filter( t =>  t.visible );
    for (let i = 0, tracksLength = visibleTracks.length; i < tracksLength; i++) {
      const track = visibleTracks[i];
      const slots = track.slots().filter( s => s.visible );
      if (slots.length > 0) {
        for (let j = 0, slotsLength = slots.length; j < slotsLength; j++) {
          const slot = slots[j];
          defaultSlotTotalThickness += slot.thickness;
        }
      }
    }

    // Max Map Width
    viewer._zoomFactor = viewer.maxZoomFactor;
    this.updateLayout(true);
    this.bbOutsideOffset - this.bbInsideOffset;

    let computedSlotTotalThickness = 0;

    for (let i = 0, tracksLength = visibleTracks.length; i < tracksLength; i++) {
      const track = visibleTracks[i];
      const slots = track.slots().filter( s => s.visible );
      if (slots.length > 0) {
        for (let j = 0, slotsLength = slots.length; j < slotsLength; j++) {
          const slot = slots[j];
          computedSlotTotalThickness += slot.thickness;
        }
      }
    }

    // FIXME: temp
    this._maxMapThicknessZoomFactor = computedSlotTotalThickness / defaultSlotTotalThickness;

    // Restore
    viewer._zoomFactor = savedZoomFactor;

    // console.log(this._nonSlotSpace());
    // console.log(defaultMapWidth, computedMaxMapWidth, computedMaxMapWidth / defaultMapWidth);
    // console.log(defaultSlotTotalThickness, computedSlotTotalThickness, computedSlotTotalThickness / defaultSlotTotalThickness);
  }

  // FIXME: temp with above
  // adjustedBBOffsetFor(bbOffset) {
  //   const viewer = this.viewer;
  //   const backbone = viewer.backbone;
  //   const maxMapThicknessZoomFactor = this._maxMapThicknessZoomFactor;
  //   const zoomFactor = (viewer.zoomFactor > maxMapThicknessZoomFactor) ? maxMapThicknessZoomFactor : viewer.zoomFactor;
  //   return (bbOffset * zoomFactor) + (backbone.adjustedThickness - backbone.thickness);
  // }

  // Calculate centerOffset for the supplied mapOffset
  // - Positive (+ve) mapOffsets are the distance from the outer/top edge of the map.
  // - Negative (-ve) mapOffsets are the distance from the inner/bottom edge of the map.
  centerOffsetForMapOffset(mapOffset) {
    return mapOffset + ( (mapOffset >= 0) ? this.centerOutsideOffset : this.centerInsideOffset );
  }

  // Calculate centerOffset for the supplied bbOffsetPercent:
  // -    0: center of backbone
  // -  100: outside/top edge of map
  // - -100: inside/bottom edge of map
  centerOffsetForBBOffsetPercent(bbOffsetPercent) {
    const bbOffset = this.backbone.adjustedCenterOffset;
    if (bbOffsetPercent === 0) {
      return bbOffset;
    } else if (bbOffsetPercent > 0) {
      return bbOffset + (bbOffsetPercent / 100 * this.bbOutsideOffset);
    } else if (bbOffsetPercent < 0) {
      return bbOffset - (bbOffsetPercent / 100 * this.bbInsideOffset);
    }
  }


  tracks(term) {
    return this.viewer.tracks(term);
  }

  slots(term) {
    return this.viewer.slots(term);
  }

  visibleSlots(term) {
    return this.slots().filter( s => s.visible && s.track.visible ).get(term);
  }

  slotForCenterOffset(offset) {
    const slots = this.visibleSlots();
    let slot;
    for (let i = 0, len = slots.length; i < len; i++) {
      if (slots[i].containsCenterOffset(offset)) {
        slot = slots[i];
        break;
      }
    }
    return slot;
  }

  get slotLength() {
    return this._slotLength || 0;
  }

  get fastMaxFeatures() {
    return this._fastMaxFeatures;
  }

  get fastFeaturesPerSlot() {
    return this._fastFeaturesPerSlot;
  }

  /**
   * Get or set the max slot thickness.
   */
  get maxSlotThickness() {
    return this._maxSlotThickness;
  }

  set maxSlotThickness(value) {
    this._maxSlotThickness = Number(value);
    this._adjustProportions();
  }

  /**
   * Get or set the min slot thickness.
   */
  get minSlotThickness() {
    return this._minSlotThickness;
  }

  set minSlotThickness(value) {
    this._minSlotThickness = Number(value);
    this._adjustProportions();
  }

  /**
   * Get or set the initial map thickness as a proportion of a viewer dimension
   * (height for linear maps, minimum dimension for circular maps). The initial
   * map thickness is at a zoomFactor of 1.
   */
  get initialMapThicknessProportion() {
    return this._initialMapThicknessProportion;
  }

  set initialMapThicknessProportion(value) {
    this._initialMapThicknessProportion = Number(value);
    this._adjustProportions();
  }

  /**
   * Get or set the maximum map thickness as a proportion of a viewer dimension
   * (height for linear maps, minimum dimension for circular maps).
   */
  get maxMapThicknessProportion() {
    return this._maxMapThicknessProportion;
  }

  set maxMapThicknessProportion(value) {
    this._maxMapThicknessProportion = Number(value);
    this._adjustProportions();
  }

  // Draw everything but the slots and thier features.
  // e.g. draws backbone, dividers, ruler, labels, progress
  drawMapWithoutSlots(fast) {
    const viewer = this.viewer;
    const backbone = viewer.backbone;
    this.canvas;
    // let startTime = new Date().getTime();

    viewer.clear('map');
    viewer.clear('foreground');
    viewer.clear('ui');

    if (viewer.messenger.visible) {
      viewer.messenger.close();
    }

    // All Text should have base line top
    // FIXME: contexts
    // ctx.textBaseline = 'top';

    // Draw Backbone
    backbone.draw();

    // Recalculate the slot offsets and thickness if the zoom level has changed
    this.updateLayout();

    // Divider rings
    viewer.dividers.draw();
    // Ruler
    const rulerOffsetAdjustment = viewer.dividers.track.adjustedThickness;
    viewer.ruler.draw(this.centerInsideOffset - rulerOffsetAdjustment, this.centerOutsideOffset + rulerOffsetAdjustment);
    // Labels
    if (viewer.annotation.visible) {
      viewer.annotation.draw(this.centerInsideOffset, this.centerOutsideOffset, fast);
    }

    // Captions on the Map layer
    for (let i = 0, len = viewer._captions.length; i < len; i++) {
      if (viewer._captions[i].onMap) {
        viewer._captions[i].draw();
      }
    }
    if (viewer.legend.position.onMap) {
      viewer.legend.draw();
    }

    // Progess
    this.drawProgress();

    // Note: now done in Canvas
    // if (canvas._testDrawRange) {
    //   const ctx = canvas.context('canvas');
    //   ctx.strokeStyle = 'grey';
    //   ctx.rect(0, 0, canvas.width, canvas.height);
    //   ctx.stroke();
    // }

    // Slots timout
    this._slotIndex = 0;
    if (this._slotTimeoutID) {
      clearTimeout(this._slotTimeoutID);
      this._slotTimeoutID = undefined;
    }
  }

  drawFast() {
    const startTime = new Date().getTime();
    this.drawMapWithoutSlots(true);
    this.drawAllSlots(true);
    // Debug
    if (this.viewer.debug) {
      this.viewer.debug.data.time.fastDraw = utils.elapsedTime(startTime);
      this.viewer.debug.draw();
    }
  }

  drawFull() {
    this.drawMapWithoutSlots();
    this.drawAllSlots(true);
    this._drawFullStartTime = new Date().getTime();
    this.drawSlotWithTimeOut(this);
  }

  drawExport() {
    this.drawMapWithoutSlots();
    this.drawAllSlots(false);
  }

  draw(fast) {
    fast ? this.drawFast() : this.drawFull();
  }

  drawAllSlots(fast) {
    let track, slot;
    // for (let i = 0, trackLen = this._tracks.length; i < trackLen; i++) {
    //   track = this._tracks[i];
    const tracks = this.tracks();
    for (let i = 0, trackLen = tracks.length; i < trackLen; i++) {
      track = tracks[i];
      if (!track.visible) { continue; }
      for (let j = 0, slotLen = track._slots.length; j < slotLen; j++) {
        slot = track._slots[j];
        if (!slot.visible) { continue; }
        slot.draw(this.canvas, fast);
      }
    }
  }

  drawSlotWithTimeOut(layout) {
    const slots = layout.visibleSlots();
    const slot = slots[layout._slotIndex];
    if (!slot) { return; }
    slot.clear();
    slot.draw(layout.canvas);
    layout._slotIndex++;
    if (layout._slotIndex < slots.length) {
      layout._slotTimeoutID = setTimeout(layout.drawSlotWithTimeOut, 0, layout);
    } else {
      if (layout.viewer.debug) {
        layout.viewer.debug.data.time.fullDraw = utils.elapsedTime(layout._drawFullStartTime);
        layout.viewer.debug.draw();
      }
      // if (typeof complete === 'function') { complete.call() }
    }
  }

  // position must be: 'inside' or 'outside'
  _updateLayoutFor(position = 'inside') {
    const viewer = this.viewer;
    const dividers = viewer.dividers;
    const direction = (position === 'outside') ? 1 : -1;
    let bbOffset = this.backbone.adjustedThickness / 2;
    // Distance between slots
    const slotGap = (dividers.slot.adjustedSpacing * 2) + dividers.slot.adjustedThickness;
    const visibleTracks = this.tracks().filter( t =>  t.visible );
    for (let i = 0, tracksLength = visibleTracks.length; i < tracksLength; i++) {
      const track = visibleTracks[i];
      const slots = track.slots().filter( s => s.visible && s[position] );
      if (slots.length > 0) {
        bbOffset += dividers.track.adjustedSpacing;
        for (let j = 0, slotsLength = slots.length; j < slotsLength; j++) {
          const slot = slots[j];
          const slotThickness = this._calculateSlotThickness(slot.proportionOfMap);
          slot._thickness = slotThickness;
          bbOffset += (slotThickness / 2);
          slot._bbOffset = direction * bbOffset;
          bbOffset += (slotThickness / 2);
          if (j === (slotsLength - 1)) {
            // Last slot for track - Use track divider
            bbOffset += dividers.track.adjustedSpacing;
            dividers.addBbOffset(direction * (bbOffset + (dividers.track.adjustedThickness / 2)), 'track');
            bbOffset += dividers.track.adjustedThickness;
          } else {
            // More slots for track - Use slot divider
            dividers.addBbOffset(direction * (bbOffset + (slotGap / 2)), 'slot');
            bbOffset += slotGap;
          }
        }
      }
    }
    return direction * bbOffset;
  }

  /**
   * Updates the bbOffset and thickness of every slot, divider and ruler, only if the zoom level has changed
   * @private
   */
  updateLayout(force) {
    const viewer = this.viewer;
    if (!force && this._savedZoomFactor === viewer._zoomFactor) {
      return;
    } else {
      this._savedZoomFactor = viewer._zoomFactor;
    }
    viewer.dividers.clearBbOffsets();

    this._fastFeaturesPerSlot = this._fastMaxFeatures / this.visibleSlots().length;
    this._bbInsideOffset = this._updateLayoutFor('inside');
    this._bbOutsideOffset = this._updateLayoutFor('outside');
  }

  /**
   * Slot thickness is based on a proportion of the Map thickness.
   * As the viewer is zoomed the slot thickness increases until
   *  - The max map thickness is reached, or
   *  - The slot thickness is greater than the maximum allowed slot thickness
   *  @private
   */
  _calculateSlotThickness(proportionOfMap) {
    const viewer = this.viewer;

    // FIXME: should not be based on adjustedCenterOffset
    // const mapThickness = Math.min(viewer.backbone.adjustedCenterOffset, this.maxMapThickness());
    // TEMP
    // Maybe this should be based on slotSpace from adjust proportions.
    // Should slot space be saved
    // const minSize = this.maxMapThickness() / 6 * viewer.zoomFactor;
    // const minSize = this.testSlotSpace * viewer.zoomFactor;
    const minSize = this.initialWorkingSpace() * viewer.zoomFactor;
    const mapThickness = Math.min(minSize, this.maxMapThickness());

    const maxAllowedProportion = this.maxSlotThickness / mapThickness;
    const slotProportionStats = this.slotProportionStats;
    if (slotProportionStats.max > maxAllowedProportion) {
      if (slotProportionStats.min === slotProportionStats.max) {
        proportionOfMap = maxAllowedProportion;
      } else {
        // SCALE
        // Based on the min and max allowed proportionOf Radii allowed
        const minAllowedProportion = this.minSlotThickness / mapThickness;
        const minMaxRatio = slotProportionStats.max / slotProportionStats.min;
        const minProportionOfMap = maxAllowedProportion / minMaxRatio;
        const minTo = (minProportionOfMap < minAllowedProportion) ? minAllowedProportion : minProportionOfMap;
        proportionOfMap = utils.scaleValue(proportionOfMap,
          {min: slotProportionStats.min, max: slotProportionStats.max},
          {min: minTo, max: maxAllowedProportion});
      }
    }
    return proportionOfMap * mapThickness;
  }

  // When updating scales because the canvas has been resized, we want to
  // keep the map at the same position in the canvas.
  // Axis must be 'x' or 'y'
  // Used to initialize or resize the circle x/y or linear y scale
  _updateScaleForAxis(axis, dimension) {
    const scale = this.scale;
    // Default Fractions to center the map when the scales have not been defined yet
    let f1 = (axis === 'x') ? -0.5 : 0.5;
    let f2 = (axis === 'x') ? 0.5 : -0.5;
    // Save scale domains to keep tract of translation
    if (scale[axis]) {
      const origDomain = scale[axis].domain();
      const origDimension = Math.abs(origDomain[1] - origDomain[0]);
      f1 = origDomain[0] / origDimension;
      f2 = origDomain[1] / origDimension;
    }
    scale[axis] = d3.scaleLinear()
      .domain([dimension * f1, dimension * f2])
      .range([0, dimension]);
    // console.log(scale[axis].domain())
  }

  drawProgress() {
    this.canvas.clear('background');
    let track, slot, progress;
    const visibleTracks = this.tracks().filter( t =>  t.visible );
    for (let i = 0, trackLen = visibleTracks.length; i < trackLen; i++) {
      track = visibleTracks[i];
      progress = track.loadProgress;
      for (let j = 0, slotLen = track._slots.length; j < slotLen; j++) {
        slot = track._slots[j];
        slot.drawProgress(progress);
      }
    }
  }
  //
  // moveTrack(oldIndex, newIndex) {
  //   this._tracks.move(oldIndex, newIndex);
  //   this._adjustProportions();
  // }
  //
  // removeTrack(track) {
  //   this._tracks = this._tracks.remove(track);
  //   this._adjustProportions();
  // }
  //
  // toJSON() {
  //   const json = {
  //     minSlotThickness: this.minSlotThickness,
  //     maxSlotThickness: this.maxSlotThickness,
  //     tracks: []
  //   };
  //   this.tracks().each( (i, track) => {
  //     json.tracks.push(track.toJSON());
  //   });
  //   return json;
  // }


}

//////////////////////////////////////////////////////////////////////////////

/**
 *
 */
class Messenger {

  /**
   * Class to shoe message on viewer
   * @private
   */
  constructor(viewer, options = {}) {
    this._viewer = viewer;
    this._wrapper = viewer._wrapper.node();

    this.fadeTime = utils.defaultFor(options.fadeTime, 100);
    this.height = utils.defaultFor(options.height, 40);
    this.width = utils.defaultFor(options.width, 200);

    this.box = d3.select(this._wrapper).append('div')
      .style('display', 'none')
      // .attr('class', 'cgv-dialog');
      .attr('class', 'cgv-messenger')
      .style('width', this.height)
      .style('height', this.width);
    // .style('line-height', this.height);
    // .style('border', '1px solid black')
    // .style('position', 'absolute')
    // .style('top', '0')
    // .style('bottom', '0')
    // .style('right', '0')
    // .style('left', '0')
    // .style('text-align', 'center')
    // .style('margin', 'auto auto');

    this.contents = this.box.append('div')
      .attr('class', 'cgv-messenger-contents');

    this._adjustSize();

    return this;
  }

  /**
   * Return the class name as a string.
   * @return {String} - 'Messenger'
   */
  toString() {
    return 'Messenger';
  }

  //////////////////////////////////////////////////////////////////////////
  // MEMBERS
  //////////////////////////////////////////////////////////////////////////

  /**
   * @member {Viewer} - Get the viewer.
   */
  get viewer() {
    return this._viewer;
  }

  /**
   * @member {Boolean} - Returns true if the dialog is visible.
   */
  get visible() {
    return (this.box.style('display') !== 'none');
  }

  /**
   * @member {Number} - Get or set the time it take for the dialog to appear and disappear in milliseconds [Default: 500].
   */
  get fadeTime() {
    return this._fadeTime;
  }

  set fadeTime(value) {
    this._fadeTime = value;
  }

  //////////////////////////////////////////////////////////////////////////
  // METHODS
  //////////////////////////////////////////////////////////////////////////

  /**
 * Opens the messenger
 * @param {Number} duration - The duration of the open animation in milliseconds. Defaults to fadeTime [Messenger.fadeTime](Messenger.html#fadeTime).
 */
  // open(duration) {
  //   duration = utils.defaultFor(duration, this.fadeTime);
  open() {
    this._adjustSize();
    this.box.style('display', 'block');
    // this.box.transition().duration(duration)
    //   .style('opacity', 1);
    this.box.style('opacity', 1);
    return this;
  }

  /**
 * Closes the messenger
 * @param {Number} duration - The duration of the close animation in milliseconds. Defaults to fadeTime [Messenger.fadeTime](Messenger.html#fadeTime).
 */
  close(duration) {
    duration = utils.defaultFor(duration, this.fadeTime);
    this.box.transition().duration(duration)
      .style('opacity', 0)
      .on('end', function() {
        d3.select(this).style('display', 'none');
      });
    return this;
  }


  _adjustSize() {
    // Minimum buffer between dialog and edges of container (times 2)
    const buffer = 50;
    const wrapperWidth = this._wrapper.offsetWidth;
    const wrapperHeight = this._wrapper.offsetHeight;
    let width = this.width;
    let height = this.height;

    if (this.height > wrapperHeight - buffer) height = wrapperHeight - buffer;
    if (this.width > wrapperWidth - buffer) width = wrapperWidth - buffer;

    // const headerHeight = 20;
    // const footerHeight = 20;
    // const contentHeight = height - headerHeight - footerHeight;

    this.box
      .style('width', `${width}px`)
      .style('height', `${height}px`);

    // this.contents
    //   .style('height', contentHeight + 'px');
  }


  flash(msg) {
    this.contents.html(msg);
    this.open();
  }

}

//////////////////////////////////////////////////////////////////////////////

/**
 * Plots are drawn as a series of arcs.
 *
 * ### Action and Events
 *
 * Action                                  | Viewer Method                            | Plot Method         | Event
 * ----------------------------------------|------------------------------------------|---------------------|-----
 * [Add](../docs.html#adding-records)      | [addPlots()](Viewer.html#addPlots)       | -                   | plots-add
 * [Update](../docs.html#updating-records) | [updatePlots()](Viewer.html#updatePlots) | [update()](#update) | plots-update
 * [Remove](../docs.html#removing-records) | [removePlots()](Viewer.html#removePlots) | [remove()](#remove) | plots-remove
 * [Read](../docs.html#reading-records)    | [plots()](Viewer.html#plots)             | -                   | -
 *
 * <a name="attributes"></a>
 * ### Attributes
 *
 * Attribute                         | Type     | Description
 * ----------------------------------|----------|------------
 * [name](#name)                     | String   | Name of plot
 * [legend](#legend)                 | String\|LegendItem | Name of legendItem or the legendItem itself (sets positive and negative legend)
 * [legendNegative](#legendNegative) | String\|LegendItem | Name of legendItem or the legendItem itself for the plot above the baseline
 * [legendPositive](#legendPositive) | String\|LegendItem | Name of legendItem or the legendItem itself for the plot below the baseline
 * [source](#source)                 | String   | Source of the plot
 * [positions](#positions)<sup>rc,iu</sup> | Array   | Array of base pair position on contig
 * [scores](#scores)<sup>rc,iu</sup> | Array    | Array of scores
 * [baseline](#baseline)             | Number   | Score where the plot goes from negative to positive (in terms of legend)
 * [axisMax](#axisMax)               | Number   | Maximum value for the plot axis
 * [axisMin](#axisMin)               | Number   | Minimum value for the plot axis
 * [favorite](#favorite)             | Boolean  | Plot is a favorite [Default: false]
 * [visible](CGObject.html#visible)  | Boolean  | Plot is visible [Default: true]
 * [meta](CGObject.html#meta)        | Object   | [Meta data](../tutorials/details-meta-data.html) for Plot
 * 
 * <sup>rc</sup> Required on Plot creation
 * <sup>iu</sup> Ignored on Plot update
 *
 * ### Examples
 *
 * @extends CGObject
 */
class Plot extends CGObject {

  /**
   * Create a new Plot.
   * @param {Viewer} viewer - The viewer
   * @param {Object} options - [Attributes](#attributes) used to create the plot
   * @param {Object} [meta] - User-defined [Meta data](../tutorials/details-meta-data.html) to add to the plot.
   */
  constructor(viewer, data = {}, meta = {}) {
    super(viewer, data, meta);
    this.viewer = viewer;
    this.name = data.name;
    this.extractedFromSequence = utils.defaultFor(data.extractedFromSequence, false);
    this.positions = utils.defaultFor(data.positions, []);
    this.scores = utils.defaultFor(data.scores, []);
    this.type = utils.defaultFor(data.type, 'line');
    this.source = utils.defaultFor(data.source, '');
    this.axisMin = utils.defaultFor(data.axisMin, d3.min([0, this.scoreMin]));
    this.axisMax = utils.defaultFor(data.axisMax, d3.max([0, this.scoreMax]));
    this.baseline = utils.defaultFor(data.baseline, 0);

    if (data.legend) {
      this.legendItem  = data.legend;
    }
    if (data.legendPositive) {
      this.legendItemPositive = data.legendPositive;
    }
    if (data.legendNegative) {
      this.legendItemNegative = data.legendNegative;
    }
    const plotID = viewer.plots().indexOf(this) + 1;
    if (!this.legendItemPositive && !this.legendItemNegative) {
      this.legendItem  = `Plot-${plotID}`;
    } else if (!this.legendItemPositive) {
      this.legendItemPositive = this.legendItemNegative;
    } else if (!this.legendItemNegative) {
      this.legendItemNegative = this.legendItemPositive;
    }
  }

  /**
   * Return the class name as a string.
   * @return {String} - 'Plot'
   */
  toString() {
    return 'Plot';
  }

  /**
   * @member {String} - Get or set the name.
   */
  get name() {
    return this._name;
  }

  set name(value) {
    this._name = value;
  }

  /**
   * @member {type} - Get or set the *type*
   */
  get type() {
    return this._type;
  }

  set type(value) {
    if (!utils.validate(value, ['line', 'bar'])) { return }
    this._type = value;
  }

  /**
   * @member {Viewer} - Get the *Viewer*
   */
  get viewer() {
    return this._viewer;
  }

  set viewer(viewer) {
    if (this.viewer) ;
    this._viewer = viewer;
    viewer._plots.push(this);
  }

  /**
   * @member {CGArray} - Get or set the positions (bp) of the plot.
   */
  get positions() {
    return this._positions || new CGArray();
  }

  set positions(value) {
    if (value) {
      this._positions = new CGArray(value);
    }
  }

  /**
   * @member {CGArray} - Get or set the scores of the plot. Value should be between 0 and 1.
   */
  get score() {
    return this._score || new CGArray();
  }

  set score(value) {
    if (value) {
      this._score = new CGArray(value);
    }
  }

  /**
   * @member {Number} - Get the number of points in the plot
   */
  get length() {
    return this.positions.length;
  }

  /**
   * @member {Array|Color} - Return an array of the positive and negativ colors [PositiveColor, NegativeColor].
   */
  get color() {
    return [this.colorPositive, this.colorNegative];
  }

  get colorPositive() {
    return this.legendItemPositive.color;
  }

  get colorNegative() {
    return this.legendItemNegative.color;
  }

  /**
   * @member {LegendItem} - Set both the legendItemPositive and
   * legendItemNegative to this legendItem. Get an CGArray of the legendItems: [legendItemPositive, legendItemNegative].
   */
  get legendItem() {
    return new CGArray([this.legendItemPositive, this.legendItemNegative]);
  }

  set legendItem(value) {
    this.legendItemPositive = value;
    this.legendItemNegative = value;
  }

  /**
   * @member {LegendItem} - Alias for [legendItem](plot.html#legendItem)
   */
  get legend() {
    return this.legendItem;
  }

  set legend(value) {
    this.legendItem = value;
  }

  /**
   * @member {LegendItem} - Get or Set both the LegendItem for the positive portion of the plot (i.e. above
   *   [baseline](Plot.html#baseline).
   */
  get legendItemPositive() {
    return this._legendItemPositive;
  }

  set legendItemPositive(value) {
    if (this.legendItemPositive && value === undefined) { return; }
    if (value && value.toString() === 'LegendItem') {
      this._legendItemPositive = value;
    } else {
      this._legendItemPositive = this.viewer.legend.findLegendItemOrCreate(value);
    }
  }

  /**
   * @member {LegendItem} - Get or Set both the LegendItem for the negative portion of the plot (i.e. below
   *   [baseline](Plot.html#baseline).
   */
  get legendItemNegative() {
    return this._legendItemNegative;
  }

  set legendItemNegative(value) {
    if (this.legendItemNegative && value === undefined) { return; }
    if (value && value.toString() === 'LegendItem') {
      this._legendItemNegative = value;
    } else {
      this._legendItemNegative = this.viewer.legend.findLegendItemOrCreate(value);
    }
  }

  /**
   * @member {LegendItem} - Alias for [legendItemPositive](plot.html#legendItemPositive).
   */
  get legendPositive() {
    return this.legendItemPositive;
  }

  set legendPositive(value) {
    this.legendItemPositive = value;
  }

  /**
   * @member {LegendItem} - Alias for [legendItemNegative](plot.html#legendItemNegative).
   */
  get legendNegative() {
    return this.legendItemNegative;
  }

  set legendNegative(value) {
    this.legendItemNegative = value;
  }

  /**
   * @member {Number} - Get or set the plot baseline. This is a value between the axisMin and axisMax
   * and indicates where where the baseline will be drawn. By default this is 0.
   */
  get baseline() {
    return this._baseline;
  }

  set baseline(value) {
    value = Number(value);
    const minAxis = this.axisMin;
    const maxAxis = this.axisMax;
    if (value > maxAxis) {
      this._baseline = maxAxis;
    } else if (value < minAxis) {
      this._baseline = minAxis;
    } else {
      this._baseline = value;
    }
  }

  /**
   * @member {Number} - Get or set the plot minimum axis value. This is a value must be less than
   * or equal to the minimum score.
   */
  get axisMin() {
    return this._axisMin;
  }

  set axisMin(value) {
    value = Number(value);
    const minValue = d3.min([this.scoreMin, this.baseline]);
    this._axisMin = (value > minValue) ? minValue : value;
  }

  /**
   * @member {Number} - Get or set the plot maximum axis value. This is a value must be greater than
   * or equal to the maximum score.
   */
  get axisMax() {
    return this._axisMax;
  }

  set axisMax(value) {
    value = Number(value);
    const maxValue = d3.max([this.scoreMax, this.baseline]);
    this._axisMax = (value < maxValue) ? maxValue : value;
  }

  get scoreMax() {
    return d3.max(this.scores);
  }

  get scoreMin() {
    return d3.min(this.scores);
  }

  get scoreMean() {
    return d3.mean(this.scores);
  }

  get scoreMedian() {
    return d3.median(this.scores);
  }

  /**
   * @member {Boolean} - Get or set the *extractedFromSequence*. This  plot is
   * generated directly from the sequence and does not have to be saved when exported JSON.
   */
  get extractedFromSequence() {
    return this._extractedFromSequence;
  }

  set extractedFromSequence(value) {
    this._extractedFromSequence = value;
  }


  /**
   * Highlights the tracks the plot is on. An optional track can be provided,
   * in which case the plot will only be highlighted on the track.
   * @param {Track} track - Only highlight the feature on this track.
   */
  highlight(track) {
    if (!this.visible) { return; }
    this.canvas.clear('ui');
    if (track && track.plot === this) {
      track.highlight();
    } else {
      this.tracks().each( (i, t) => t.highlight());
    }
  }

  /**
   * Update plot [attributes](#attributes).
   * See [updating records](../docs.html#s.updating-records) for details.
   * @param {Object} attributes - Object describing the properties to change
   */
  update(attributes) {
    this.viewer.updatePlots(this, attributes);
  }

  tracks(term) {
    const tracks = new CGArray();
    this.viewer.tracks().each( (i, track) => {
      if (track.plot === this) {
        tracks.push(track);
      }
    });
    return tracks.get(term);
  }

  /**
   * Remove the Plot from the viewer, tracks and slots
   */
  remove() {
    this.viewer.removePlots(this);
  }

  scoreForPosition(bp) {
    const index = utils.indexOfValue(this.positions, bp);
    if (index === 0 && bp < this.positions[index]) {
      return undefined;
    } else {
      return this.scores[index];
    }
  }


  draw(canvas, slotRadius, slotThickness, fast, range) {
    // let startTime = new Date().getTime();
    if (!this.visible) { return; }
    if (this.colorNegative.rgbaString === this.colorPositive.rgbaString) {
      this._drawPath(canvas, slotRadius, slotThickness, fast, range, this.colorPositive);
    } else {
      this._drawPath(canvas, slotRadius, slotThickness, fast, range, this.colorPositive, 'positive');
      this._drawPath(canvas, slotRadius, slotThickness, fast, range, this.colorNegative, 'negative');
    }
    // console.log("Plot Time: '" + utils.elapsedTime(startTime) );
  }

  // To add a fast mode use a step when creating the indices
  _drawPath(canvas, slotRadius, slotThickness, fast, range, color, orientation) {
    const ctx = canvas.context('map');
    const positions = this.positions;
    const scores = this.scores;
    // This is the difference in radial pixels required before a new arc is draw
    // const radialDiff = fast ? 1 : 0.5;
    // let radialDiff = 0.5;

    const sequenceLength = this.viewer.sequence.length;

    const startIndex = utils.indexOfValue(positions, range.start, false);
    let stopIndex = utils.indexOfValue(positions, range.stop, false);
    // Change stopIndex to last position if stop is between 1 and first position
    if (stopIndex === 0 && range.stop < positions[stopIndex]) {
      stopIndex = positions.length - 1;
    }
    const startPosition = startIndex === 0 ? positions[startIndex] : range.start;
    let stopPosition = range.stop;
    // console.log(startPosition + '..' + stopPosition)

    // let startScore = startIndex === 0 ? this.baseline : scores[startIndex];
    let startScore = scores[startIndex];

    startScore = this._keepPoint(startScore, orientation) ? startScore : this.baseline;

    ctx.beginPath();

    // Calculate baseline Radius
    // const baselineRadius = slotRadius - (slotThickness / 2) + (slotThickness * this.baseline);
    const axisRange = this.axisMax - this.axisMin;
    const baselineRadius = slotRadius - (slotThickness / 2) + (slotThickness * (this.baseline - this.axisMin)/axisRange);

    // Move to the first point
    const startPoint = canvas.pointForBp(startPosition, baselineRadius);
    ctx.moveTo(startPoint.x, startPoint.y);

    let savedR = baselineRadius + ((startScore - this.baseline) * slotThickness);
    let savedPosition = startPosition;

    let score, currentPosition;
    // const crossingBaseline = false;
    // const drawNow = false;
    let step = 1;
    if (fast) {
      // When drawing fast, use a step value scaled to base-2
      const positionsLength = this.countPositionsFromRange(startPosition, stopPosition);
      const maxPositions = 4000;
      const initialStep = positionsLength / maxPositions;
      if (initialStep > 1) {
        step = utils.base2(initialStep);
      }
    }

    this.positionsFromRange(startPosition, stopPosition, step, (i) => {
      // Handle Origin in middle of range
      if (i === 0 && startIndex !== 0) {
        canvas.path('map', savedR, savedPosition, sequenceLength, false, 'lineTo');
        savedPosition = 1;
        savedR = baselineRadius;
      }

      // NOTE: In the future the radialDiff code (see bottom) could be used to improve speed of NON-fast
      // drawing. However, there are a few bugs that need to be worked out
      score = scores[i];
      currentPosition = positions[i];
      canvas.path('map', savedR, savedPosition, currentPosition, false, 'lineTo');
      if ( this._keepPoint(score, orientation) ) {
        // savedR = baselineRadius + ((score - this.baseline) * slotThickness);
        savedR = baselineRadius + ((score - this.baseline)/axisRange * slotThickness);
        // savedR = baselineRadius + ((((score - axisMin)/axisRange) - this.baseline) * slotThickness);
        // return ((to.max - to.min) * (value - from.min) / (from.max - from.min)) + to.min;
      } else {
        savedR = baselineRadius;
      }
      savedPosition = currentPosition;
    });

    // Change stopPosition if between 1 and first position
    if (stopIndex === positions.length - 1 && stopPosition < positions[0]) {
      stopPosition = sequenceLength;
    }
    // Finish drawing plot to stop position
    canvas.path('map', savedR, savedPosition, stopPosition, false, 'lineTo');
    const endPoint = canvas.pointForBp(stopPosition, baselineRadius);
    ctx.lineTo(endPoint.x, endPoint.y);
    // Draw plot anticlockwise back to start along baseline
    canvas.path('map', baselineRadius, stopPosition, startPosition, true, 'noMoveTo');
    ctx.fillStyle = color.rgbaString;
    ctx.fill();

    // ctx.strokeStyle = 'black';
    // TODO: draw stroked line for sparse data
    // ctx.lineWidth = 0.05;
    // ctx.lineWidth = 1;
    // ctx.strokeStyle = color.rgbaString;
    // ctx.stroke();
  }


  // If the positive and negative legend are the same, the plot is drawn as a single path.
  // If the positive and negative legend are different, two plots are drawn:
  // - one above the baseline (positive)
  // - one below the baseline (negative)
  // This method checks if a point should be kept based on it's score and orientation.
  // If no orientation is provided, a single path will be drawn and all the points are kept.
  _keepPoint(score, orientation) {
    if (orientation === undefined) {
      return true;
    } else if (orientation === 'positive' && score > this.baseline) {
      return true;
    } else if (orientation === 'negative' && score < this.baseline ) {
      return true;
    }
    return false;
  }

  positionsFromRange(startValue, stopValue, step, callback) {
    const positions = this.positions;
    let startIndex = utils.indexOfValue(positions, startValue, true);
    const stopIndex = utils.indexOfValue(positions, stopValue, false);
    // This helps reduce the jumpiness of feature drawing with a step
    // The idea is to alter the start index based on the step so the same
    // indices should be returned. i.e. the indices should be divisible by the step.
    if (startIndex > 0 && step > 1) {
      startIndex += step - (startIndex % step);
    }
    if (stopValue >= startValue) {
      // Return if both start and stop are between values in array
      if (positions[startIndex] > stopValue || positions[stopIndex] < startValue) { return; }
      for (let i = startIndex; i <= stopIndex; i += step) {
        callback.call(positions[i], i, positions[i]);
      }
    } else {
      // Skip cases where the the start value is greater than the last value in array
      if (positions[startIndex] >= startValue) {
        for (let i = startIndex, len = positions.length; i < len; i += step) {
          callback.call(positions[i], i, positions[i]);
        }
      }
      // Skip cases where the the stop value is less than the first value in array
      if (positions[stopIndex] <= stopValue) {
        for (let i = 0; i <= stopIndex; i += step) {
          callback.call(positions[i], i, positions[i]);
        }
      }
    }
    return positions;
  }

  countPositionsFromRange(startValue, stopValue) {
    const positions = this.positions;
    let startIndex = utils.indexOfValue(positions, startValue, true);
    let stopIndex = utils.indexOfValue(positions, stopValue, false);

    if (startValue > positions[positions.length - 1]) {
      startIndex++;
    }
    if (stopValue < positions[0]) {
      stopIndex--;
    }
    if (stopValue >= startValue) {
      return stopIndex - startIndex + 1;
    } else {
      return (positions.length - startIndex) + stopIndex + 1;
    }
  }

  /**
   * Returns JSON representing the object
   */
  // Options:
  // - excludeData: if true, the scores and positions are not included
  toJSON(options = {}) {
    const json = {
      name: this.name,
      type: this.type,
      baseline: this.baseline,
      source: this.source,
    };
    if (this.legendPositive === this.legendNegative) {
      json.legend = this.legendPositive.name;
    } else {
      json.legendPositive = this.legendPositive.name;
      json.legendNegative = this.legendNegative.name;
    }
    if ( (this.axisMin !== this.scoreMin) || options.includeDefaults) {
      json.axisMin = this.axisMin;
    }
    if ( (this.axisMax !== this.scoreMax) || options.includeDefaults) {
      json.axisMax = this.axisMax;
    }
    if (!options.excludeData) {
      json.positions = this.positions;
      json.scores = this.scores;
    }
    // Optionally add default values
    // Visible is normally true
    if (!this.visible || options.includeDefaults) {
      json.visible = this.visible;
    }
    // Favorite is normally false
    if (this.favorite || options.includeDefaults) {
      json.favorite = this.favorite;
    }
    return json;
  }

}


// NOTE: radialDiff
// score = scores[i];
// currentPosition = positions[i];
// currentR = baselineRadius + (score - this.baseline) * slotThickness;
//
// if (drawNow || crossingBaseline) {
//   canvas.arcPath('map', savedR, savedPosition, currentPosition, false, 'lineTo');
//   savedPosition = currentPosition;
//   drawNow = false;
//   crossingBaseline = false;
//   if ( this._keepPoint(score, orientation) ) {
//     savedR = currentR;
//   } else {
//     savedR = baselineRadius;
//   }
// if (orientation && ( (lastScore - this.baseline) * (score - this.baseline) < 0)) {
//   crossingBaseline = true;
// }
//
// if ( Math.abs(currentR - savedR) >= radialDiff ){
//   drawNow = true;
// }
// lastScore = score;
// END RadialDiff


// score = scores[i];
// currentPosition = positions[i];
// canvas.arcPath('map', savedR, savedPosition, currentPosition, false, 'lineTo');
// if ( this._keepPoint(score, orientation) ){
//   savedR = baselineRadius + (score - this.baseline) * slotThickness;
// } else {
//   savedR = baselineRadius;
// }
// savedPosition = currentPosition;


//
// score = scores[i];
// currentPosition = positions[i];
// canvas.arcPath('map', savedR, savedPosition, currentPosition, false, 'lineTo');
// currentR = baselineRadius + (score - this.baseline) * slotThickness;
// savedR = currentR;
// savedPosition = currentPosition;
//
//
// positions.eachFromRange(startPosition, stopPosition, step, (i) => {
// if (i === 0) {
//   lastScore = this.baseline;
//   savedPosition = 1;
//   savedR = baselineRadius;
// }
//   lastScore = score;
//   score = scores[i];
//   currentPosition = positions[i];
//   currentR = baselineRadius + (score - this.baseline) * slotThickness;
//   // If going from positive to negative need to save currentR as 0 (baselineRadius)
//   // Easiest way is to check if the sign changes (i.e. multipling last and current score is negative)
//   if (orientation && ( (lastScore - this.baseline) * (score - this.baseline) < 0)) {
//     currentR = baselineRadius;
//     canvas.arcPath('map', currentR, savedPosition, currentPosition, false, true);
//     savedR = currentR;
//     savedPosition = currentPosition;
//   } else if ( this._keepPoint(score, orientation) ){
//     if ( Math.abs(currentR - savedR) >= radialDiff ){
//       canvas.arcPath('map', currentR, savedPosition, currentPosition, false, true);
//       savedR = currentR;
//       savedPosition = currentPosition
//     }
//   } else {
//     savedR = baselineRadius;
//   }
// });

//////////////////////////////////////////////////////////////////////////////

/**
 * A Slot is a single ring on the Map.
 *
 * @extends CGObject
 */
class Slot extends CGObject {

  /**
   * Slot
   */
  constructor(track, data = {}, meta = {}) {
    super(track.viewer, data, meta);
    this.track = track;
    this._strand = utils.defaultFor(data.strand, 'direct');
    this._features = new CGArray();
    this._plot;
    this.refresh();
  }

  /**
   * Return the class name as a string.
   * @return {String} - 'Slot'
   */
  toString() {
    return 'Slot';
  }

  /** * @member {Track} - Get the *Track*
   */
  get track() {
    return this._track;
  }

  set track(track) {
    if (this.track) ;
    this._track = track;
    track._slots.push(this);
  }

  /** * @member {String} - Get the Track Type
   */
  get type() {
    return this.track.type;
  }

  /** * @member {Layout} - Get the *Layout*
   */
  get layout() {
    return this.track.layout;
  }

  /**
   * @member {String} - Get the position of the slot in relation to the backbone
   */
  get position() {
    if (this.track.position === 'both') {
      return (this.isDirect() ? 'outside' : 'inside');
    } else {
      return this.track.position;
    }
  }

  /**
   * @member {Boolean} - Is the slot position inside the backbone
   */
  get inside() {
    return this.position === 'inside';
  }

  /**
   * @member {Boolean} - Is the slot position outside the backbone
   */
  get outside() {
    return this.position === 'outside';
  }

  /**
   * @member {Viewer} - Get or set the track size as a proportion of the map thickness 
   * @private
   */
  get proportionOfMap() {
    return this._proportionOfMap;
  }

  set proportionOfMap(value) {
    this._proportionOfMap = value;
  }

  /**
   * @member {Viewer} - Get the track size as a ratio to all other tracks
   * @private
   */
  get thicknessRatio() {
    return this.track.thicknessRatio;
  }

  /**
   * @member {Number} - Get the current offset of the center of the slot from the backbone.
   */
  get bbOffset() {
    return this._bbOffset;
  }

  /**
   * @member {Number} - Get the current center offset of the center of the slot.
   */
  get centerOffset() {
    return this.bbOffset + this.viewer.backbone.adjustedCenterOffset;
  }

  /**
   * @member {Number} - Get the current thickness of the slot.
   */
  get thickness() {
    return this._thickness;
  }


  get strand() {
    return this._strand;
  }

  isDirect() {
    return this.strand === 'direct';
  }

  isReverse() {
    return this.strand === 'reverse';
  }

  get hasFeatures() {
    return this._features.length > 0;
  }

  get hasPlot() {
    return this._plot;
  }

  features(term) {
    return this._features.get(term);
  }

  replaceFeatures(features) {
    this._features = features;
    this.refresh();
  }

  /**
   * The number of pixels per basepair along the feature track circumference.
   * @return {Number}
   * @private
   */
  pixelsPerBp() {
    return this.layout.pixelsPerBp(this.centerOffset);
  }

  // Refresh needs to be called when new features are added, etc
  refresh() {
    this._featureNCList = new NCList(this._features, {circularLength: this.sequence.length, startProperty: 'mapStart', stopProperty: 'mapStop'});
  }

  /**
   * Get the visible range
   * @member {Range}
   */
  get visibleRange() {
    return this._visibleRange;
  }

  /**
   * Does the slot contain the given *centerOffset*.
   * @param {Number} offset - The centerOffset.
   * @return {Boolean}
   */
  containsCenterOffset(offset) {
    const halfthickness = this.thickness / 2;
    return (offset >= (this.centerOffset - halfthickness)) && (offset <= (this.centerOffset + halfthickness));
  }

  /**
   * Return the first feature in this slot that contains the given bp.
   * @param {Number} bp - the position in bp to search for.
   * @return {Feature}
   */
  findFeaturesForBp(bp) {
    return this._featureNCList.find(bp);
  }

  findLargestFeatureLength() {
    let length = 0;
    let nextLength;
    for (let i = 0, len = this._features.length; i < len; i++) {
      nextLength = this._features[i].length;
      if (nextLength > length) {
        length = nextLength;
      }
    }
    return length;
  }

  clear() {
    const range = this._visibleRange;
    if (range) {
      const centerOffset = this.centerOffset;
      const slotThickness = this.thickness;
      const ctx = this.canvas.context('map');
      ctx.globalCompositeOperation = 'destination-out'; // The existing content is kept where it doesn't overlap the new shape.
      this.canvas.drawElement('map', range.start, range.stop, centerOffset, 'white', slotThickness);
      ctx.globalCompositeOperation = 'source-over'; // Default
    }
  }

  highlight(color = '#FFB') {
    const range = this._visibleRange;
    if (range && this.visible) {
      const centerOffset = this.centerOffset;
      const slotThickness = this.thickness;
      this.canvas.drawElement('background', range.start, range.stop, centerOffset, color, slotThickness);
    }
  }

  draw(canvas, fast) {
    const slotCenterOffset = this.centerOffset;
    const slotThickness = this.thickness;
    const range = canvas.visibleRangeForCenterOffset(slotCenterOffset, slotThickness);
    this._visibleRange = range;
    if (range) {
      const start = range.start;
      const stop = range.stop;
      if (this.hasFeatures) {
        let featureCount = this._features.length;
        if (!range.isMapLength()) {
          featureCount = this._featureNCList.count(start, stop);
        }
        let step = 1;
        // Change step if drawing fast and there are too many features
        if (fast && featureCount > this.layout.fastFeaturesPerSlot) {
          // Use a step that is rounded up to the nearest power of 2
          // This combined with eachFromRange altering the start index based on the step
          // means that as we zoom, the visible features remain consistent.
          // e.g. When zooming all the features visible at a step of 16
          // will be visible when the step is 8 and so on.
          const initialStep = Math.ceil(featureCount / this.layout.fastFeaturesPerSlot);
          step = utils.base2(initialStep);
        }
        const showShading = fast ? false : undefined;
        // When drawing shadows, draw in reverse order to make them look better
        if (this.viewer.settings.showShading && this.isDirect()) { step *= -1; }
        // Draw Features
        this._featureNCList.run(start, stop, step, (feature) => {
          feature.draw('map', slotCenterOffset, slotThickness, range, {showShading: showShading});
        });

        // Debug
        if (this.viewer.debug && this.viewer.debug.data.n) {
          const index = this.viewer.slots().indexOf(this);
          this.viewer.debug.data.n[`slot_${index}`] = featureCount;
        }
      } else if (this.hasPlot) {
        this._plot.draw(canvas, slotCenterOffset, slotThickness, fast, range);
      }
    }
  }

  drawProgress(progress) {
    const canvas = this.canvas;
    const centerOffset = this.centerOffset;
    const slotThickness = this.thickness;
    const range = this._visibleRange;
    // Draw progress like thickening circle
    if (progress > 0 && progress < 100 && range) {
      const thickness = slotThickness * progress / 100;
      canvas.drawElement('background', range.start, range.stop, centerOffset, '#EAEAEE', thickness, 'arc', false);
    }
  }

  /**
   * Remove a feature or array of features from the slot.
   * @param {Feature|Array} features - The Feature(s) to remove.
   * @private
   */
  removeFeatures(features) {
    features = (features.toString() === 'CGArray') ? features : new CGArray(features);
    this._features = this._features.filter( f => !features.includes(f) );
    this.refresh();
  }

  /**
   * Remove the plot from the slot.
   * @private
   */
  removePlot() {
    this._plot = undefined;
    this.refresh();
  }


}

//////////////////////////////////////////////////////////////////////////////

// TODO: - Instead of check for features or plot. There could be a data attribute which
//         will point to features or a plot.

/**
 * The Track is used for layout information...
 *
 * ### Action and Events
 *
 * Action                                    | Viewer Method                              | Track Method        | Event
 * ------------------------------------------|--------------------------------------------|---------------------|-----
 * [Add](../docs.html#adding-tracks)         | [addTracks()](Viewer.html#addTracks)       | -                   | tracks-add
 * [Update](../docs.html#updating-tracks)    | [updateTracks()](Viewer.html#updateTracks) | [update()](#update) | tracks-update
 * [Remove](../docs.html#removing-tracks)    | [removeTracks()](Viewer.html#removeTracks) | [remove()](#remove) | tracks-remove
 * [Reorder](../docs.html#reordering-tracks) | [moveTrack()](Viewer.html#moveTrack)       | [move()](#move)     | tracks-reorder
 * [Read](../docs.html#reading-tracks)       | [tracks()](Viewer.html#tracks)             | -                   | -
 *
 * <a name="attributes"></a>
 * ### Attributes
 *
 * Attribute                         | Type      | Description
 * ----------------------------------|-----------|------------
 * [name](#name)                     | String    | Name of track [Default: "Unknown"]
 * [dataType](#dataType)             | String    | Type of data shown by the track: plot, feature [Default: feature]
 * [dataMethod](#dataMethod)         | String    | Methods used to extract/connect to features or a plot: sequence, source, type, tag [Default: source]
 * [dataKeys](#dataKeys)             | String\|Array | Values used by dataMethod to extract features or a plot.
 * [position](#position)             | String    | Position relative to backbone: inside, outside, or both [Default: both]
 * [separateFeaturesBy](#separateFeaturesBy) | String    | How features should be separated: none, strand, or readingFrame [Default: strand]
 * [thicknessRatio](#thicknessRatio) | Number    | Thickness of track compared to other tracks [Default: 1]
 * [loadProgress](#loadProgress)     | Number    | Number between 0 and 100 indicating progress of track loading. Used internally by workers.
 * [favorite](#favorite)             | Boolean   | Track is a favorite [Default: false]
 * [visible](CGObject.html#visible)  | Boolean   | Track is visible [Default: true]
 * [meta](CGObject.html#meta)        | Object    | [Meta data](../tutorials/details-meta-data.html) for Track
 *
 * ### Examples
 *
 * @extends CGObject
 */
class Track extends CGObject {

  /**
   * Create a new track.
   * @param {Viewer} viewer - The viewer
   * @param {Object} options - [Attributes](#attributes) used to create the track.
   * @param {Object} [meta] - User-defined [Meta data](../tutorials/details-meta-data.html) to add to the track.
   */
  constructor(viewer, data = {}, meta = {}) {
    super(viewer, data, meta);
    this.viewer = viewer;
    this._plot;
    this._features = new CGArray();
    this._slots = new CGArray();
    this.name = utils.defaultFor(data.name, 'Unknown');
    this.separateFeaturesBy = utils.defaultFor(data.separateFeaturesBy, 'strand');
    this.position = utils.defaultFor(data.position, 'both');
    this.dataType = utils.defaultFor(data.dataType, 'feature');
    this.dataMethod = utils.defaultFor(data.dataMethod, 'source');
    this.dataKeys = data.dataKeys;
    this.dataOptions = data.dataOptions || {};
    this._thicknessRatio = utils.defaultFor(data.thicknessRatio, 1);
    this._loadProgress = 0;
    this.refresh();
  }

  /**
   * Return the class name as a string.
   * @return {String} - 'Track'
   */
  toString() {
    return 'Track';
  }

  /**
   * @member {Viewer} - Get the *Viewer*
   */
  get viewer() {
    return this._viewer;
  }

  set viewer(viewer) {
    if (this.viewer) ;
    this._viewer = viewer;
    viewer._tracks.push(this);
  }


  set visible(value) {
    // super.visible = value;
    this._visible = value;
    if (this.layout) {
      this.layout._adjustProportions();
    }
  }

  get visible() {
    // return super.visible
    return this._visible;
  }

  /**
   * @member {String} - Alias for getting the name. Useful for querying CGArrays.
   */
  get id() {
    return this.name;
  }

  /**
   * @member {String} - Get or set the *name*.
   */
  get name() {
    return this._name;
  }

  set name(value) {
    this._name = value;
  }

  /** * @member {Viewer} - Get the *Layout*
   */
  get layout() {
    return this.viewer.layout;
  }

  /**
   * @member {String} - Get or set the *dataType*. Must be one of 'feature' or 'plot' [Default: 'feature']
   */
  get dataType() {
    return this._dataType;
  }

  set dataType(value) {
    if ( utils.validate(value, ['feature', 'plot']) ) {
      this._dataType = value;
    }
  }

  /** * @member {String} - Alias for *dataType*.
   */
  get type() {
    return this.dataType;
    // return this.contents.type;
  }

  /**
   * @member {String} - Get or set the *dataMethod* attribute. *dataMethod* describes how the features/plot should be extracted.
   *    Options are 'source', 'type', 'tag', or 'sequence' [Default: 'source']
   */
  get dataMethod() {
    return this._dataMethod;
  }

  set dataMethod(value) {
    if ( utils.validate(value, ['source', 'type', 'tag', 'sequence']) ) {
      this._dataMethod = value;
    }
  }

  /**
   * @member {String} - Get or set the *dataKeys* attribute. *dataKeys* describes which features/plot should be extracted. For example,
   *    if *dataMethod* is 'type', and *dataKeys* is 'CDS', then all features with a type of 'CDS' will be used to create the track.
   *    For *dataMethod* of 'sequence', the following values are possible for *dataKeys*: 'orfs', 'start-stop-codons', 'gc-content', 'gc-skew'.
   */
  get dataKeys() {
    return this._dataKeys;
  }

  set dataKeys(value) {
    this._dataKeys = (value === undefined) ? new CGArray() : new CGArray(value);
  }

  /** * @member {Object} - Get or set the *dataOptions*. The *dataOptions* are passed to the SequenceExtractor.
   */
  get dataOptions() {
    return this._dataOptions;
  }

  set dataOptions(value) {
    this._dataOptions = value;
  }


  /**
   * @member {String} - Get or set separateFeaturesBy. Possible values are 'none', 'strand', or 'readingFrame'.
   */
  get separateFeaturesBy() {
    return this._separateFeaturesBy;
  }

  set separateFeaturesBy(value) {
    if ( utils.validate(value, ['none', 'strand', 'readingFrame']) ) {
      this._separateFeaturesBy = value;
      this.updateSlots();
    }
  }

  /**
   * @member {String} - Get or set the position. Possible values are 'inside', 'outside', or 'both'.
   */
  get position() {
    return this._position;
  }

  set position(value) {
    if (utils.validate(value, ['inside', 'outside', 'both'])) {
      this._position = value;
      this.updateSlots();
    }
  }

  /**
   * @member {Plot} - Get the plot associated with this track
   */
  get plot() {
    return this._plot;
  }

  /**
   * @member {Number} - Get or set the load progress position (integer between 0 and 100)
   */
  get loadProgress() {
    return this._loadProgress;
  }

  set loadProgress(value) {
    this._loadProgress = value;
    // this.viewer.trigger('track-load-progress-changed', this);
  }

  /**
   * @member {Number} - Return the number of features or plot points contained in this track.
   */
  get itemCount() {
    if (this.type === 'plot') {
      return (this.plot) ? this.plot.length : 0;
    } else if (this.type === 'feature') {
      return this.features().length;
    } else {
      return 0;
    }
  }

  /**
   * @member {Viewer} - Get or set the track size as a ratio to all other tracks
   */
  get thicknessRatio() {
    return this._thicknessRatio;
  }

  set thicknessRatio(value) {
    this._thicknessRatio = Number(value);
    this.layout._adjustProportions();
  }

  /**
   * Update track [attributes](#attributes).
   * See [updating records](../docs.html#s.updating-records) for details.
   * @param {Object} attributes - Object describing the properties to change
   */
  update(attributes) {
    this.viewer.updateTracks(this, attributes);
  }

  /**
   * Remove track
   */
  remove() {
    this.viewer.removeTracks(this);
  }

  /**
   * Move this track to a new index in the array of Viewer tracks.
   * @param {Number} newIndex - New index for this track (0-based)
   */
  move(newIndex) {
    const currentIndex = this.viewer.tracks().indexOf(this);
    this.viewer.moveTrack(currentIndex, newIndex);
  }


  /**
   * Returns an [CGArray](CGArray.html) of Features or a single Feature from all the features in this track.
   * @param {Integer|String|Array} term - See [CGArray.get](CGArray.html#get) for details.
   * @return {CGArray}
   */
  features(term) {
    return this._features.get(term);
  }

  slots(term) {
    return this._slots.get(term);
  }

  /**
   * Returns an [CGArray](CGArray.html) of Features or a single Feature from all the unique features in this track.
   * Unique features are ones that only appear in this track.
   * @param {Integer|String|Array} term - See [CGArray.get](CGArray.html#get) for details.
   * @return {CGArray}
   * @private
   */
  uniqueFeatures(term) {
    const features = new CGArray();
    for (let i = 0, len = this._features.length; i < len; i++) {
      if (this._features[i].tracks().length === 1) {
        features.push(this._features[i]);
      }
    }
    return features.get(term);
  }

  /**
   * Remove a feature or array of features from the track and slots.
   *
   * @param {Feature|Array} features - The Feature(s) to remove.
   */
  removeFeatures(features) {
    features = (features.toString() === 'CGArray') ? features : new CGArray(features);
    // this._features = new CGArray(
    //   this._features.filter( (f) => { return !features.includes(f) })
    // );
    this._features = this._features.filter( f => !features.includes(f) );
    this.slots().each( (i, slot) => {
      slot.removeFeatures(features);
    });
    this.viewer.trigger('track-update', this);
  }

  /**
   * Remove the plot from the track and slots.
   */
  removePlot() {
    this._plot = undefined;
    this.slots().each( (i, slot) => {
      slot.removePlot();
    });
    this.viewer.trigger('track-update', this);
  }

  refresh() {
    this._features = new CGArray();
    this._plot = undefined;
    if (this.dataMethod === 'sequence') {
      this.extractFromSequence();
    } else if (this.type === 'feature') {
      this.updateFeatures();
    } else if (this.type === 'plot') {
      this.updatePlot();
    }
    this.updateSlots();
  }

  extractFromSequence() {
    const sequenceExtractor = this.viewer.sequence.sequenceExtractor;
    if (sequenceExtractor) {
      sequenceExtractor.extractTrackData(this, this.dataKeys[0], this.dataOptions);
    } else {
      console.error('No sequence is available to extract features/plots from');
    }
  }

  updateFeatures() {
    // Methods where the feature will contain a single value
    if (this.dataMethod === 'source' || this.dataMethod === 'type') {
      this.viewer.features().each( (i, feature) => {
        if (this.dataKeys.includes(feature[this.dataMethod]) && feature.contig.visible) {
          this._features.push(feature);
        }
      });
    // Methods where the feature will contain an array of values
    } else if (this.dataMethod === 'tag') {
      this.viewer.features().each( (i, feature) => {
        if (this.dataKeys.some( k => feature.tags.includes(k)) && feature.contig.visible) {
          this._features.push(feature);
        }
      });
    }
  }

  updatePlot() {
    if (this.dataMethod === 'source') {
      // Plot with particular Source
      this.viewer.plots().find( (plot) => {
        if (plot.source === this.dataKeys[0]) {
          this._plot = plot;
        }
      });
    }
  }

  updateSlots() {
    if (this.type === 'feature') {
      this.updateFeatureSlots();
    } else if (this.type === 'plot') {
      this.updatePlotSlot();
    }
    this.layout._adjustProportions();
    // this.viewer.trigger('track-update', this);
  }

  updateFeatureSlots() {
    this._slots = new CGArray();
    if (this.separateFeaturesBy === 'readingFrame') {
      const features = this.sequence.featuresByReadingFrame(this.features());
      // Direct Reading Frames
      for (const rf of [1, 2, 3]) {
        const slot = new Slot(this, {strand: 'direct'});
        slot.replaceFeatures(features[`rfPlus${rf}`]);
      }
      // Reverse Reading Frames
      for (const rf of [1, 2, 3]) {
        const slot = new Slot(this, {strand: 'reverse'});
        slot.replaceFeatures(features[`rfMinus${rf}`]);
      }
    } else if (this.separateFeaturesBy === 'strand') {
      const features = this.featuresByStrand();
      // Direct Slot
      let slot = new Slot(this, {strand: 'direct'});
      slot.replaceFeatures(features.direct);
      // Reverse Slot
      slot = new Slot(this, {strand: 'reverse'});
      slot.replaceFeatures(features.reverse);
    } else {
      // Combined Slot
      const slot = new Slot(this, {strand: 'direct'});
      slot.replaceFeatures(this.features());
    }
  }

  // FIXME: this should become simply (update)
  // update(attributes = {}) {
  //   this.viewer.updateTracks(this, attributes);
  // }
  triggerUpdate() {
    this.viewer.updateTracks(this);
  }

  featuresByStrand() {
    const features = {};
    features.direct = new CGArray();
    features.reverse = new CGArray();
    this.features().each( (i, feature) => {
      if (feature.strand === -1) {
        features.reverse.push(feature);
      } else {
        features.direct.push(feature);
      }
    });
    return features;
  }

  updatePlotSlot() {
    this._slots = new CGArray();
    const slot = new Slot(this, {type: 'plot'});
    slot._plot = this._plot;
  }

  highlight(color = '#FFB') {
    if (this.visible) {
      this.slots().each( (i, slot) => {
        slot.highlight(color);
      });
    }
  }

  /**
   * Returns JSON representing the object
   */
  toJSON(options = {}) {
    const json = {
      name: this.name,
      separateFeaturesBy: this.separateFeaturesBy,
      position: this.position,
      thicknessRatio: this.thicknessRatio,
      dataType: this.dataType,
      dataMethod: this.dataMethod
    };
    // DataKeys
    json.dataKeys = (this.dataKeys.length === 1) ? this.dataKeys[0] : [...this.dataKeys];
    // DataOptions
    if (this.dataOptions && Object.keys(this.dataOptions).length > 0) {
      json.dataOptions = this.dataOptions;
    }
    // Optionally add default values
    if (!this.visible || options.includeDefaults) {
      json.visible = this.visible;
    }
    // This could be a new Track specific toJSON option
    if (options.includeDefaults) {
      json.loadProgress = this.loadProgress;
    }
    return json;
  }

}

//////////////////////////////////////////////////////////////////////////////

// NOTE: this method is now directly in Viewer
// CGV.Viewer.prototype._updateZoomMax = function() {
//   if (this._zoom) {
//     this._zoom.scaleExtent([this.minZoomFactor, this.maxZoomFactor]);
//   }
// };

/**
 * Add zoom/drag abilities to the Viewer map
 * @private
 */
function initializeZooming(viewer) {
  const zoomMax = viewer.backbone.maxZoomFactor();
  viewer._zoom = d3.zoom()
    .scaleExtent([1, zoomMax])
    .on('start', zoomstart)
    .on('zoom',  zooming)
    .on('end',   zoomend);
  d3.select(viewer.canvas.node('ui')).call(viewer._zoom)
    .on('dblclick.zoom', null);

  // Keep track of pan/translate changes
  let panX = 0;
  let panY = 0;

  function zoomstart() {
    viewer.trigger('zoom-start');
    viewer.highlighter.hidePopoverBox();
  }

  function zooming(d3Event) {
    const startTime = new Date().getTime();

    const bp = viewer.canvas.bpForMouse();

    const dx = d3Event.transform.x - panX;
    const dy = d3Event.transform.y - panY;
    panX = d3Event.transform.x;
    panY = d3Event.transform.y;
    // Only translate of not Zooming
    if (viewer.zoomFactor === d3Event.transform.k) {
      viewer.layout.translate(dx, dy);
    }

    viewer.layout.zoom(d3Event.transform.k, bp);

    viewer.drawFast();
    viewer.trigger('zoom');

    // DEBUG INFO
    if (viewer.debug) {
      if (viewer.debug.data.time) {
        viewer.debug.data.time.zoom = utils.elapsedTime(startTime);
      }
      if (viewer.debug.data.zoom) {
        viewer.debug.data.zoom.scale = utils.round(viewer._zoomFactor, 1);
      }
    }
  }

  function zoomend() {
    viewer.trigger('zoom-end');
    viewer.drawFull();
  }
}

/**
 * @author Jason Grant <jason.grant@ualberta.ca>
 * @requires D3
 */

console.log(`CGView.js Version: ${version}`);

/**
 * The Viewer is the main container class for CGView. It controls the
 * overal appearance of the map (e.g. width, height, etc).
 * It also contains all the major components of the map (e.g. [Layout](Layout.html),
 * [Sequence](Sequence.html), [Ruler](Ruler.html), etc). Many
 * of component options can be set during construction of the Viewer.
 *
 * ### Action and Events
 *
 * Action                                  | Viewer Method                        | Event
 * ----------------------------------------|--------------------------------------|-----
 * [Update](../docs.html#updating-records) | [update()](Viewer.html#update)       | viewer-update
 *
 * <a name="attributes"></a>
 * ### Attributes
 *
 * Attribute                         | Type      | Description
 * ----------------------------------|-----------|------------
 * [name](#name)                     | String    | Name for the map
 * [id](#id)                         | String    | ID for the map [Default: random 20 character HexString]
 * [width](#width)                   | Number    | Width of the viewer map in pixels [Default: 600]
 * [height](#height)                 | Number    | Height of the viewer map in pixels [Default: 600]
 * [dataHasChanged](#dataHasChanged) | Boolean   | Indicates that data been update/added since this attribute was reset
 * [sequence](#sequence)<sup>iu</sup>    | Object | [Sequence](Sequence.html) options
 * [settings](#settings)<sup>iu</sup>    | Object | [Settings](Settings.html) options
 * [legend](#legend)<sup>iu</sup>        | Object | [Legend](Legend.html) options
 * [backbone](#backbone)<sup>iu</sup>    | Object | [Backbone](Backbone.html) options
 * [layout](#layout)<sup>iu</sup>        | Object | [Layout](Layout.html) options
 * [ruler](#ruler)<sup>iu</sup>          | Object | [Ruler](Ruler.html) options
 * [dividers](#dividers)<sup>iu</sup>    | Object | [Dividers](Dividers.html) options
 * [annotation](#annotation)<sup>iu</sup> | Object | [Annotation](Annotation.html) options
 * [highlighter](#highlighter)<sup>iu</sup> | Object | [Highlighter](Highlighter.html) options
 * 
 * <sup>iu</sup> Ignored on Viewer update
 *
 * ### Examples
 * ```js
 * cgv = new CGV.Viewer('#my-viewer', {
 *   height: 500,
 *   width: 500,
 *   sequence: {
 *     // The length of the sequence
 *     length: 1000
 *     // Or, you can provide a sequence
 *     // seq: 'ATGTAGCATGCATCAGTAGCTA...'
 *   }
 * });
 * 
 * // Draw the map
 * cgv.draw()
 * ```
 *
 * See the [tutorials](../tutorials/index.html) to learn more about making maps.
 */
class Viewer {


  /**
   * Create a viewer
   * @param {String} containerId - The ID (with or without '#') of the element to contain the viewer.
   * @param {Object} options - [Attributes](#attributes) used to create the viewer.
   *    Component options will be passed to the contructor of that component.
   */
  constructor(containerId, options = {}) {
    this.containerId = containerId.replace('#', '');
    this._container = d3.select(`#${this.containerId}`);
    // Get options
    this._width = utils.defaultFor(options.width, 600);
    this._height = utils.defaultFor(options.height, 600);
    this._wrapper = this._container.append('div')
      .attr('class', 'cgv-wrapper')
      .style('position', 'relative')
      .style('width', `${this.width}px`)
      .style('height', `${this.height}px`);

    // Create map id
    this._id = utils.randomHexString(40);

    // Create object to contain all CGObjects
    this._objects = {};

    // Initialize containers
    this._features = new CGArray();
    this._tracks = new CGArray();
    this._plots = new CGArray();
    this._captions = new CGArray();
    this._bookmarks = new CGArray();

    this._loading = true;

    // Initialize Canvas
    this.canvas = new Canvas(this, this._wrapper, {width: this.width, height: this.height});

    // Initialize Layout and set the default map format (ie. topology).
    this._layout = new Layout(this, options.layout);
    this.format = utils.defaultFor(options.format, 'circular');

    this._zoomFactor = 1;
    this._minZoomFactor = 0.5;

    // Initialize IO
    this.io = new IO(this);
    // Initialize DragAndDrop
    this.allowDragAndDrop = utils.defaultFor(options.allowDragAndDrop, true);
    // Initialize Events
    this._events = new Events();
    // Initialize Sequence
    this._sequence = new Sequence(this, options.sequence);
    // Initialize Backbone
    this._backbone = new Backbone(this, options.backbone);
    // this.initializeDragging();
    initializeZooming(this);
    // Initial Event Monitor
    this.eventMonitor = new EventMonitor(this);
    // Initial Messenger
    this.messenger = new Messenger(this, options.messenger);
    // Initialize General Setttings
    this._settings = new Settings(this, options.settings);
    // Initial Legend
    this._legend = new Legend(this, options.legend);
    // Initialize Slot Divider
    this._dividers = new Dividers(this, options.dividers);
    // Initialize Annotation
    this._annotation = new Annotation(this, options.annotation);
    // Initialize Ruler
    this._ruler = new Ruler(this, options.ruler);
    // Initialize Highlighter
    this._highlighter = new Highlighter(this, options.highlighter);
    // Initialize Codon Tables
    this.codonTables = new CodonTables;
    // Initialize Debug
    this.debug = utils.defaultFor(options.debug, false);

    this.layout.updateScales();

    // Integrate external dependencies for specific features
    this.externals = {};
    // Adding SVG using svgcanvas
    // https://github.com/zenozeng/svgcanvas
    this.externals.SVGContext = options.SVGContext;

    // TEMP adding
    if (options.features) {
      this.addFeatures(options.features);
    }

    // TEMP TESTING FOR EDIT MODE
    this.shiftSet = false;
    const shiftTest = (e) => {if (e.shiftKey) {console.log(e);}};
    this._wrapper.on('mouseover', () => {
      if (!this.shiftSet) {
        document.addEventListener('keydown', shiftTest);
        this.shiftSet = true;
      }
    }).on('mouseout', () => {
      if (this.shiftSet) {
        document.removeEventListener('keydown', shiftTest);
        this.shiftSet = false;
      }
    });

    this._loading = false;
    this.draw();
  }

  //////////////////////////////////////////////////////////////////////////
  // STATIC CLASSS METHODS
  //////////////////////////////////////////////////////////////////////////
  static get debugSections() {
    return ['time', 'zoom', 'position', 'n'];
  }

  //////////////////////////////////////////////////////////////////////////
  // MEMBERS
  //////////////////////////////////////////////////////////////////////////

  /**
   * @member {String} - Get CGView version
   */
  get version() {
    return version;
  }

  /**
   * @member {String} - Get map id
   */
  get id() {
    return this._id;
  }

  set id(value) {
    this._id = value;
  }

  /**
   * @member {String} - Get or set the map format: circular, linear
   */
  get format() {
    return this.layout.type;
    // return this.settings.format.type;
  }

  set format(value) {
    this.layout.type = value;
    // this.settings.type = value;
  }

  /**
   * @member {Layout} - Get the map [layout](Layout.html) object
   */
  get layout() {
    return this._layout;
  }

  /**
   * @member {Legend} - Get the map [legend](Legend.html) object
   */
  get legend() {
    return this._legend;
  }

  /**
   * @member {Annotation} - Get the map [annotation](Annotation.html) object
   */
  get annotation() {
    return this._annotation;
  }

  /**
   * @member {Dividers} - Get the map [dividers](Dividers.html) object
   */
  get dividers() {
    return this._dividers;
  }

  /**
   * @member {Ruler} - Get the map [ruler](Ruler.html) object
   */
  get ruler() {
    return this._ruler;
  }

  /**
   * @member {Settings} - Get the map [settings](Settings.html) object
   */
  get settings() {
    return this._settings;
  }

  /**
   * @member {Sequence} - Get the [Sequence](Sequence.html)
   */
  get sequence() {
    return this._sequence;
  }

  /**
   * @member {Backbone} - Get the [Backbone](Backbone.html)
   */
  get backbone() {
    return this._backbone;
  }

  /**
   * @member {Highlighter} - Get the [Highlighter](Highlighter.html)
   */
  get highlighter() {
    return this._highlighter;
  }


  /**
   * @member {String} - Get or set the map name
   */
  get name() {
    return this._name;
  }

  set name(value) {
    this._name = value;
  }

  /**
   * @member {Number} - Get or set the genetic code used for translation.
   * This genetic code will be used unless a feature has an overriding genetic code.
   * Alias for Settings.geneticCode.
   * Default: 11
   */
  get geneticCode() {
    // return this._geneticCode || 11;
    return this.settings.geneticCode;
  }

  set geneticCode(value) {
    // this._geneticCode = value;
    this.settings.geneticCode = value;
  }

  /**
   * @member {Number} - Get or set the width of the Viewer
   */
  get width() {
    return this._width;
  }

  set width(value) {
    this.resize(value);
  }

  /**
   * @member {Number} - Get or set the width of the Viewer
   */
  get height() {
    return this._height;
  }

  set height(value) {
    this.resize(null, value);
  }

  /**
   * @member {Number} - Get the height or the width of the viewer, which ever is smallest.
   */
  get minDimension() {
    return Math.min(this.height, this.width);
  }

  /**
   * @member {Number} - Get the height or the width of the viewer, which ever is largest.
   */
  get maxDimension() {
    return Math.max(this.height, this.width);
  }

  /**
   * @member {Number} - Get or set the zoom level of the map. A value of 1 is the intial zoom level.
   *   Increasing the zoom level to 2 will double the length of the backbone, and so on.
   */
  get zoomFactor() {
    return this._zoomFactor;
  }

  // FIXME: this should be done by layout?? OR not allowed
  set zoomFactor(value) {
    this.layout.zoom(Number(value));
  }

  /**
   * @member {Number} - Get the bp for the center of the canvas. Alias for Canvas.bpForCanvasCenter().
   */
  get bp() {
    return this.canvas.bpForCanvasCenter();
  }

  /**
   * @member {Number} - Get the distance from the backbone to the center of the canvas.
   */
  get bbOffset() {
    const halfRangeWidth = this.scale.x.range()[1] / 2;
    const halfRangeHeight = this.scale.y.range()[1] / 2;
    const offset = this.layout.centerOffsetForPoint({x: halfRangeWidth, y: halfRangeHeight});
    return this.backbone.adjustedCenterOffset - offset;
  }

  /**
   * @member {Number} - Get the minimum allowed zoom level
   */
  get minZoomFactor() {
    return this._minZoomFactor;
  }

  /**
   * @member {Number} - Get the maximum allowed zoom level. The maximum zoom level is set so
   * that at the maximum, the sequence can be clearly seen.
   */
  get maxZoomFactor() {
    return this.backbone.maxZoomFactor();
  }

  /**
   * @member {Object} - Return the canvas [scales](Canvas.html#scale)
   */
  get scale() {
    return this.layout.scale;
  }

  get colorPicker() {
    if (this._colorPicker === undefined) {
      // Create Color Picker
      const colorPickerId = `${this.containerId}-color-picker`;
      this._wrapper.append('div')
        // .classed('cp-color-picker-dialog', true)
        .attr('id', `${this.containerId}-color-picker`);
      this._colorPicker = new ColorPicker(colorPickerId);
    }
    return this._colorPicker;
  }

  get debug() {
    return this._debug;
  }

  set debug(options) {
    if (options) {
      if (options === true) {
        // Select all sections
        options = {};
        options.sections = Viewer.debugSections;
      }
      this._debug = new Debug(this, options);
    } else {
      this._debug = undefined;
    }
  }

  /**
   * Return true if viewer is being initialized or loading new data.
   */
  get loading() {
    return this._loading;
  }

  /**
   * @member {Boolean} - Get or set the dataHasChanged property. This will be
   * set to false, anytime the data API (add, update, remove, reorder) is
   * used. It is reset to false automatically when a new JSON is loaded via
   * [IO.loadJSON()](IO.html#loadJSON).
   */
  get dataHasChanged() {
    return this._dataHasChanged;
  }

  set dataHasChanged(value) {
    // console.log('DATA', value)
    this._dataHasChanged = value;
  }

  /**
   * Get the [Events](Events.html) object.
   */
  get events() {
    return this._events;
  }

  /**
   * @member {Object} - Get the last mouse position on canvas
   * @private
   */
  get mouse() {
    return this.eventMonitor.mouse;
  }

  /**
   * @member {Boolean} - Returns true if an animation started with 
   * [Viewer.animate()](Viewer.html#animate) is in progress.
   */
  get isAnimating() {
    return Boolean(this._animateTimeoutID);
  }

  ///////////////////////////////////////////////////////////////////////////
  // METHODS
  ///////////////////////////////////////////////////////////////////////////

  /**
   * Resizes the the Viewer
   *
   * @param {Number} width - New width
   * @param {Number} height - New height
   * @param {Boolean} keepAspectRatio - If only one of width/height is given the ratio will remain the same. (NOT IMPLEMENTED YET)
   * @param {Boolean} fast -  After resize, should the viewer be draw redrawn fast.
   */
  resize(width, height, keepAspectRatio = true, fast) {
    this._width = width || this.width;
    this._height = height || this.height;

    this._wrapper
      .style('width', `${this.width}px`)
      .style('height', `${this.height}px`);

    this.canvas.resize(this.width, this.height);

    this.refreshCanvasLayer();
    // Hide Color Picker: otherwise it may disappear off the screen
    this.colorPicker.close();

    this.layout._adjustProportions();

    this.draw(fast);

    // this.trigger('resize');
  }

  /**
   * Returns an [CGArray](CGArray.html) of CGObjects or a single CGObject from all the CGObjects in the viewer.
   * Term      | Returns
   * ----------|----------------
   * undefined | All objects
   * String    | CGObject with a cgvID equal to the string or undefined
   * Array     | CGArray of CGObjects with matching cgvIDs
   *
   * @param {String|Array} term - The values returned depend on the term (see above table).
   * @return {CGArray|or|CGObject}
   */
  objects(term) {
    if (term === undefined) {
      return this._objects;
    } else if (typeof term === 'string') {
      return this._objects[term];
    } else if (Array.isArray(term)) {
      const array = new CGArray();
      for (let i = 0, len = term.length; i < len; i++) {
        array.push(this._objects[term[i]]);
      }
      return array;
    } else {
      return new CGArray();
    }
  }

  /**
   * Returns an [CGArray](CGArray.html) of Slots or a single Slot from all the Slots in the Layout.
   * @param {Integer|String|Array} term - See [CGArray.get](CGArray.html#get) for details.
   * @return {CGArray}
   */
  slots(term) {
    let slots = new CGArray();
    for (let i = 0, len = this._tracks.length; i < len; i++) {
      slots = slots.concat(this._tracks[i]._slots);
    }
    return slots.get(term);
  }

  /**
   * Returns a [CGArray](CGArray.html) of features or a single feature.
   * See [reading records](../docs.html#s.reading-records) for details.
   * @param {Integer|String|Array} term - See [CGArray.get](CGArray.html#get) for details.
   * @return {Feature|CGArray}
   */
  features(term) {
    return this._features.get(term);
  }

  /**
   * Returns an [CGArray](CGArray.html) of contigs or a single contig from all the contigs in the viewer. This is an alias for Viewer.sequence.contigs().
   * @param {Integer|String|Array} term - See [CGArray.get](CGArray.html#get) for details.
   * @return {CGArray}
   */
  contigs(term) {
    return this.sequence.contigs(term);
  }

  update(attributes) {
    // Validate attribute keys
    let keys = Object.keys(attributes);
    const validKeys = ['name', 'id', 'width', 'height', 'dataHasChanged'];
    if (!utils.validate(keys, validKeys)) { return; }

    // Special Case for Resizing - we don't want to update width and height separately
    if (keys.includes('width') && keys.includes('height')) {
      this.resize(attributes.width, attributes.height);
      keys = keys.filter( i => i !== 'width' && i !== 'height' );
    }

    // Trigger ignores 'viewer-update' for dataHasChanged. So we add it here if needed.
    if (keys.length > 0 && !keys.includes('dataHasChanged')) {
      attributes.dataHasChanged = true;
    }

    for (let i = 0; i < keys.length; i++) {
      this[keys[i]] = attributes[keys[i]];
    }
    this.trigger('viewer-update', { attributes });
  }


  /**
   * Returns a [CGArray](CGArray.html) of tracks or a single track.
   * See [reading records](../docs.html#s.reading-records) for details.
   * @param {Integer|String|Array} term - See [CGArray.get](CGArray.html#get) for details.
   * @return {Track|CGArray}
   */
  tracks(term) {
    return this._tracks.get(term);
  }

  /**
   * Add one or more [tracks](Track.html) (see [attributes](Track.html#attributes)).
   * See [adding records](../docs.html#s.adding-records) for details.
   * @param {Object|Array} data - Object or array of objects describing the tracks
   * @return {CGArray<Track>} CGArray of added tracks
   */
  addTracks(trackData = []) {
    trackData = CGArray.arrayerize(trackData);
    const tracks = trackData.map( (data) => new Track(this, data));

    // Recenter the map tracks if zoomed in if zoomed in
    if (!(this.backbone.visibleRange && this.backbone.visibleRange.overHalfMapLength())) {
      this.recenterTracks();
    }
    this.annotation.refresh();

    this.dirty = true;

    this.trigger('tracks-add', tracks);
    return tracks;
  }

  /**
   * Remove tracks.
   * See [removing records](../docs.html#s.removing-records) for details.
   * @param {Track|Array} tracks - Track or a array of tracks to remove
   */
  removeTracks(tracks) {
    tracks = CGArray.arrayerize(tracks);
    this._tracks = this._tracks.filter( t => !tracks.includes(t) );
    this.layout._adjustProportions();
    // Remove from Objects
    tracks.forEach( t => t.deleteFromObjects() );
    this.trigger('tracks-remove', tracks);
  }


  /**
   * Update track properties to the viewer. If no attribtes are given, the trigger event will still be called.
   */
  // updateTracks(tracks, attributes) {
  //   tracks = CGArray.arrayerize(tracks);
  //   if (attributes) {
  //     // Validate attribute keys
  //     const keys = Object.keys(attributes);
  //     const validKeys = ['name', 'position', 'separateFeaturesBy', 'visible', 'thicknessRatio', 'loadProgress', 'contents'];
  //     if (!validate(keys, validKeys)) { return false; }
  //     const contents = attributes.contents;
  //     if (contents) {
  //       // Validate content attribute keys
  //       const contentKeys = Object.keys(contents);
  //       const validContentKeys = ['type', 'from', 'extract', 'options'];
  //       if (!validate(contentKeys, validContentKeys)) { return false; }
  //       for (const track of tracks) {
  //         for (const contentKey of contentKeys) {
  //           const value = contents[contentKey];
  //           track.contents[contentKey] = value;
  //         }
  //         track.refresh();
  //       }
  //       // const {contents, ...modifiedAttributes} = attributes;
  //       const modifiedAttributes = keys.reduce( (obj, k) => {
  //         if (k !== 'contents') { obj[k] = attributes[k]; }
  //         return obj;
  //       }, {});
  //       tracks.attr(modifiedAttributes);
  //     } else {
  //       tracks.attr(attributes);
  //     }
  //   }
  //   this.trigger('tracks-update', { tracks, attributes });
  // }
  /**
   * Update [attributes](Track.html#attributes) for one or more tracks.
   * See [updating records](../docs.html#s.updating-records) for details.
   * @param {Track|Array|Object} tracksOrUpdates - Track, array of tracks or object describing updates
   * @param {Object} attributes - Object describing the properties to change
   */
  updateTracks(tracksOrUpdates, attributes) {
    const { records: tracks, updates } = this.updateRecords(tracksOrUpdates, attributes, {
      recordClass: 'Track',
      validKeys: ['name', 'position', 'separateFeaturesBy', 'dataType', 'dataMethod', 'dataKeys', 'dataOptions', 'favorite', 'visible', 'loadProgress', 'thicknessRatio']
    });
    let tracksToRefresh = [];
    if (updates) {
      const cgvIDs = Object.keys(updates);
      for (let cgvID of cgvIDs) {
        const value = updates[cgvID];
        const track = this.objects(cgvID);
        //TODO: try Sets
        const keys = Object.keys(value);
        if (keys.includes('dataMethod') || keys.includes('dataType') || keys.includes('dataKeys')) {
          if (!tracksToRefresh.includes(track)) {
            tracksToRefresh.push(track);
          }
        }
        if (keys.includes('visible')) {
          this.annotation.refresh();
        }
      }
    } else if (attributes) {
      const keys = Object.keys(attributes);
      if (keys.includes('dataMethod') || keys.includes('dataType') || keys.includes('dataKeys')) {
        tracksToRefresh = tracks;
      }
      if (keys.includes('visible')) {
        this.annotation.refresh();
      }
    }
    for (const track of tracksToRefresh) {
      track.refresh();
    }
    this.trigger('tracks-update', { tracks, attributes, updates });
  }

  /**
   * Move a track from one index to a new one
   * @param {Number} oldIndex - Index of track to move (0-based)
   * @param {Number} newIndex - New index for the track (0-based)
   */
  moveTrack(oldIndex, newIndex) {
    this._tracks.move(oldIndex, newIndex);
    this.layout._adjustProportions();
    this.trigger('tracks-moved', {oldIndex: oldIndex, newIndex: newIndex});
  }

  /**
   * Returns an [CGArray](CGArray.html) of Captions or a single Caption.
   * @param {Integer|String|Array} term - See [CGArray.get](CGArray.html#get) for details.
   * @return {CGArray}
   */
  captions(term) {
    return this._captions.get(term);
  }

  visibleCaptions(term) {
    return this._captions.filter( i => i.visible ).get(term);
  }

  /**
   * Add one or more [captions](Caption.html) (see [attributes](Caption.html#attributes)).
   * See [adding records](../docs.html#s.adding-records) for details.
   * @param {Object|Array} data - Object or array of objects describing the captions
   * @return {CGArray<Caption>} CGArray of added captions
   */
  addCaptions(captionData = []) {
    captionData = CGArray.arrayerize(captionData);
    const captions = captionData.map( (data) => new Caption(this, data));
    this.trigger('captions-add', captions);
    return captions;
  }

  updateCaptions(captionsOrUpdates, attributes) {
    const { records: captions, updates } = this.updateRecords(captionsOrUpdates, attributes, {
      recordClass: 'Caption',
      validKeys: ['name', 'on', 'anchor', 'position', 'font', 'visible', 'fontColor', 'textAlignment', 'backgroundColor']
    });
    this.trigger('captions-update', { captions, attributes, updates });
  }

  removeCaptions(captions) {
    captions = CGArray.arrayerize(captions);
    this._captions = this._captions.filter( f => !captions.includes(f) );
    // Update Layers
    this.clear('canvas');
    this.refreshCanvasLayer();
    // Remove from Objects
    captions.forEach( c => c.deleteFromObjects() );

    this.trigger('captions-remove', captions);
  }

  /**
   * Move a caption from one index to a new one
   * @param {Number} oldIndex - Index of caption to move (0-based)
   * @param {Number} newIndex - New index for the caption (0-based)
   */
  moveCaption(oldIndex, newIndex) {
    this._captions.move(oldIndex, newIndex);
    this.refreshCanvasLayer();
    this.trigger('captions-moved', {oldIndex: oldIndex, newIndex: newIndex});
  }

  /**
   * Returns a [CGArray](CGArray.html) of plots or a single plot.
   * See [reading records](../docs.html#s.reading-records) for details.
   * @param {Integer|String|Array} term - See [CGArray.get](CGArray.html#get) for details.
   * @return {Plot|CGArray}
   */
  plots(term) {
    return this._plots.get(term);
  }

  /**
   * Returns an [CGArray](CGArray.html) of Feature/Plot Source name or a single item.
   * @param {Integer|String|Array} term - See [CGArray.get](CGArray.html#get) for details.
   * @return {CGArray}
   */
  // FIXME: need better way to keep track of sources
  // FIXME: sources should not contain things like orfs???
  // FIXME: contains empty source for sequence plots.
  sources(term) {
    const featureSources = this._features.map( f => f.source );
    const plotSources = this._plots.map( p => p.source );
    const trackSources = this.tracks().
      filter( c => c.dataMethod === 'source').
      map( c => c.dataKeys ).flat();

    const allSources = featureSources.concat(plotSources).concat(trackSources);
    return new CGArray([...new Set(allSources)]).get(term);
  }

  /**
   * Returns an [CGArray](CGArray.html) of all Feature/Plot tags or a single item.
   * @param {Integer|String|Array} term - See [CGArray.get](CGArray.html#get) for details.
   * @return {CGArray}
   */
  // FIXME: need better way to keep track of tags
  // FIXME: add plots tags
  tags(term) {
    const featureTags = this._features.map( f => f.tags );
    // const plotTags = this._plots.map( p => p.tags );
    const trackTags = this.tracks().
      filter( c => c.dataMethod === 'tag').
      map( c => c.dataKeys );

    // const allTags = featureTags.concat(plotTags).concat(trackTags).flat();
    const allTags = featureTags.concat(trackTags).flat();
    return new CGArray([...new Set(allTags)]).get(term);
  }

  updateRecordsWithAttributes(records, attributes, options = {}) {
    const validKeys = options.validKeys;
    const recordClass = options.recordClass;
    // Validate attribute keys
    const attibuteKeys = Object.keys(attributes);
    if (validKeys && !utils.validate(attibuteKeys, validKeys)) { return; }
    // Validate record Class
    records = CGArray.arrayerize(records);
    if (recordClass && records.some( r => r.toString() !== recordClass )) {
      console.error(`The following records were not of the Class '${recordClass}':`, records.filter ( r => r.toString() != recordClass));
      return;
    }
    // Update Records
    records.attr(attributes);
    return records;
  }

  updateRecordsIndividually(updates, options = {}) {
    const validKeys = options.validKeys;
    const recordClass = options.recordClass;
    // Validate attribute keys
    if (validKeys) {
      let allAttributeKeys = [];
      const values = Object.values(updates);
      for (const value of values) {
        allAttributeKeys = allAttributeKeys.concat(Object.keys(value));
      }
      const uniqAttributeKeys = [...new Set(allAttributeKeys)];
      if (!utils.validate(uniqAttributeKeys, validKeys)) { return; }
    }
    // Get records form cgvIDs update keys
    const cgvIDs = new CGArray(Object.keys(updates));
    const records = cgvIDs.map( id => this.objects(id) );
    // Validate record Class
    if (recordClass && records.some( r => r.toString() !== recordClass )) {
      console.error(`The following records were not of the Class '${recordClass}':`, records.filter ( r => r.toString() != recordClass));
      return;
    }
    // Update Records
    for (const record of records) {
      const attributes = Object.keys(updates[record.cgvID]);
      for (const attribute of attributes) {
        record[attribute] = updates[record.cgvID][attribute];
      }
    }
    return records;
  }

  // Returns records (CGArray), updates, attributes
  // NOTE: Not used by Viewer.updateTracks or Viewer.update
  updateRecords(recordsOrUpdates = [], attributes = {}, options = {}) {
    let records, updates;
    if (recordsOrUpdates.toString() === '[object Object]') {
      // Assume recordsOrUpdate is an object of updates
      updates = recordsOrUpdates;
      records = this.updateRecordsIndividually(updates, options);
    } else {
      // Assume recordsOrUpdate is an individual record or an array of records
      records = this.updateRecordsWithAttributes(recordsOrUpdates, attributes, options);
    }
    return { records, updates, attributes };
  }

  /**
   * Returns a CGArray of the records that have had the attributesOfInterest changed.
   * If attributes has any of the attributesOfInterest then all the records are returned.
   * Otherwise any record in updates that has an attributesOfInterest of changed is returned.
   * @private
   */
  recordsWithChangedAttributes(attributesOfInterest, records, attributes = {}, updates) {
    records = CGArray.arrayerize(records);
    let returnedRecords = new CGArray();
    attributesOfInterest = CGArray.arrayerize(attributesOfInterest);
    const attributeKeys = Object.keys(attributes);
    if (attributeKeys.length > 0) {
      for (const attribute of attributesOfInterest) {
        if (attributeKeys.includes(attribute)) {
          return returnedRecords = records;
        }
      }
    } else if (updates) {
      for (const record of records) {
        for (const attribute of attributesOfInterest) {
          if (Object.keys(updates[record.cgvID]).includes(attribute)) {
            returnedRecords.push(record);
            continue;
          }
        }
      }
    }
    return returnedRecords;
  }

  /**
   * Add one or more [features](Feature.html) (see [attributes](Feature.html#attributes)).
   * See [adding records](../docs.html#s.adding-records) for details.
   * @param {Object|Array} data - Object or array of objects describing the features
   * @return {CGArray<Feature>} CGArray of added features
   */
  // FIXME: for History, we will want to be able to handle passing an array of features
  //  not just feature data. That way they don't have to be reinitialized and they keep the same cgvIDs.
  addFeatures(featureData = []) {
    featureData = CGArray.arrayerize(featureData);
    const features = featureData.map( (data) => new Feature(this, data));
    this.annotation.refresh();
    // FIXME: need to update tracks??
    // This causes sequence-based (e.g. orfs) to reload too
    // this.tracks().each( (i,t) => t.refresh() );
    this.trigger('features-add', features);
    return features;
  }

  /**
   * Remove features.
   * See [removing records](../docs.html#s.removing-records) for details.
   * @param {Feature|Array} features - Feature or a array of features to remove
   */
  removeFeatures(features) {
    features = CGArray.arrayerize(features);
    this._features = this._features.filter( f => !features.includes(f) );
    // Update Annotationa and Tracks
    const labels = features.map( f => f.label );
    this.annotation.removeLabels(labels);
    this.tracks().each( (i, track) => {
      track.removeFeatures(features);
    });
    this.annotation.refresh();
    // Update Contigs
    Contig.removeFeatures(features);
    // Remove from Objects
    features.forEach( f => f.deleteFromObjects() );

    this.trigger('features-remove', features);
  }

  /**
   * Update [attributes](Feature.html#attributes) for one or more features.
   * See [updating records](../docs.html#s.updating-records) for details.
   * @param {Feature|Array|Object} featuresOrUpdates - Feature, array of features or object describing updates
   * @param {Object} attributes - Object describing the properties to change
   */
  updateFeatures(featuresOrUpdates, attributes) {
    const { records: features, updates } = this.updateRecords(featuresOrUpdates, attributes, {
      recordClass: 'Feature',
      validKeys: ['name', 'type', 'contig', 'legendItem', 'source', 'tags', 'favorite', 'visible', 'strand', 'start', 'stop', 'mapStart', 'mapStop']
    });
    // Refresh tracks if any attribute is source, type, tags
    let refreshTracks;
    if (updates) {
      const values = Object.values(updates);
      for (let value of values) {
        refreshTracks = Object.keys(values).some( a => ['source', 'type', 'tags'].includes(a));
      }
    } else if (attributes) {
      refreshTracks = Object.keys(attributes).some( a => ['source', 'type', 'tags'].includes(a));
    }
    if (refreshTracks) {
      for (let track of cgv.tracks()) {
        track.refresh();
      }
    }
    // Refresh labels if any attribute is start, stop or visible
    let updateLabels;
    if (updates) {
      const values = Object.values(updates);
      for (let value of values) {
        if (Object.keys(value).includes('start') || Object.keys(value).includes('stop') || Object.keys(value).includes('visible')) {
          updateLabels = true;
        }
      }
    } else {
      updateLabels = attributes && (Object.keys(attributes).includes('start') || Object.keys(attributes).includes('stop') || Object.keys(attributes).includes('visible'));
    }
    if (updateLabels) {
      this.annotation.refresh();
    }
    this.trigger('features-update', { features, attributes, updates });
  }

  /**
   * Add one or more [plots](Plot.html) (see [attributes](Plot.html#attributes)).
   * See [adding records](../docs.html#s.adding-records) for details.
   * @param {Object|Array} data - Object or array of objects describing the plots
   * @return {CGArray<Plot>} CGArray of added plots
   */
  addPlots(plotData = []) {
    plotData = CGArray.arrayerize(plotData);
    const plots = plotData.map( (data) => new Plot(this, data));
    this.annotation.refresh();
    this.trigger('plots-add', plots);
    return plots;
  }

  /**
   * Remove plots.
   * See [removing records](../docs.html#s.removing-records) for details.
   * @param {Plot|Array} plots - Plot or a array of plots to remove
   */
  removePlots(plots) {
    plots = CGArray.arrayerize(plots);
    this._plots = this._plots.filter( p => !plots.includes(p) );
    plots.each( (i, plot) => {
      plot.tracks().each( (j, track) => {
        track.removePlot();
      });
    });
    // Remove from Objects
    plots.forEach( f => f.deleteFromObjects() );

    this.trigger('plots-remove', plots);
  }

  /**
   * Update [attributes](Plot.html#attributes) for one or more plot.
   * See [updating records](../docs.html#s.updating-records) for details.
   * @param {Plot|Array|Object} plotsOrUpdates - Plot, array of plot or object describing updates
   * @param {Object} attributes - Object describing the properties to change
   */
  updatePlots(plotsOrUpdates, attributes) {
    const { records: plots, updates } = this.updateRecords(plotsOrUpdates, attributes, {
      recordClass: 'Plot',
      validKeys: ['name', 'type','legend', 'legendPositive', 'legendNegative', 'source',
        'favorite', 'visible', 'baseline', 'axisMin', 'axisMax']
    });
    // Refresh tracks if any attribute is source
    // let sourceChanged;
    // if (plotsOrUpdates.toString() === '[object Object]') {
    //   const values = Object.values(plotsOrUpdates);
    //   for (let value of values) {
    //     if (Object.keys(value).includes('source')) {
    //       sourceChanged = true;
    //     }
    //   }
    // } else {
    //   sourceChanged = attributes && Object.keys(attributes).includes('source');
    // }
    // if (sourceChanged) {
    //   for (let track of cgv.tracks()) {
    //     track.refresh();
    //   }
    // }
    this.trigger('plots-update', { plots, attributes, updates });
  }

  /**
   * Returns a [CGArray](CGArray.html) of Bookmarks or a single Bookmark.
   * See [reading records](../docs.html#s.reading-records) for details.
   * @param {Integer|String|Array} term - See [CGArray.get](CGArray.html#get) for details.
   * @return {Bookmark|CGArray<Bookmark>}
   */
  bookmarks(term) {
    return this._bookmarks.get(term);
  }

  /**
   * Add one or more [Bookmarks](Bookmark.html) (see [attributes](Bookmark.html#attributes)).
   * See [adding records](../docs.html#s.adding-records) for details.
   * @param {Object|Array} data - Object or array of objects describing the bookmarks
   * @return {CGArray<Bookmark>} CGArray of added bookmarks
   */
  addBookmarks(bookmarkData = []) {
    bookmarkData = CGArray.arrayerize(bookmarkData);
    const bookmarks = bookmarkData.map( (data) => new Bookmark(this, data));
    this.trigger('bookmarks-add', bookmarks);
    return bookmarks;
  }

  /**
   * Remove bookmarks.
   * See [removing records](../docs.html#s.removing-records) for details.
   * @param {Bookmark | Array} bookmarks - Bookmark or a array of bookmarks to remove
   */
  removeBookmarks(bookmarks) {
    bookmarks = CGArray.arrayerize(bookmarks);
    this._bookmarks = this._bookmarks.filter( b => !bookmarks.includes(b) );
    // Remove from Objects
    bookmarks.forEach( b => b.deleteFromObjects() );
    this.trigger('bookmarks-remove', bookmarks);
  }

  bookmarkByShortcut(shortcut) {
    return this.bookmarks().find( b => b.shortcut && b.shortcut === `${shortcut}` );
  }

  /**
   * Update [attributes](Bookmark.html#attributes) for one or more bookmarks.
   * See [updating records](../docs.html#s.updating-records) for details.
   * @param {Bookmark | Array| Object } bookmarksOrUpdates - Bookmark, array of bookmarks or object describing updates
   * @param {Object} attributes - Object describing the properties to change
   */
  updateBookmarks(bookmarksOrUpdates, attributes) {
    const { records: bookmarks, updates } = this.updateRecords(bookmarksOrUpdates, attributes, {
      recordClass: 'Bookmark',
      validKeys: ['name', 'bp', 'zoom', 'format', 'favorite', 'shortcut', 'bbOffset']
    });
    this.trigger('bookmarks-update', { bookmarks, attributes, updates });
  }

  /**
   * Clear the viewer canvas
   */
  clear(layerName = 'map') {
    this.canvas.clear(layerName);
  }

  /**
  * Flash a message on the center of the viewer.
  * @private
  */
  flash(msg) {
    this.messenger.flash(msg);
  }

  fillBackground() {
    this.clear('background');
  }

  drawFull() {
    this.layout.drawFull();
  }

  drawFast() {
    this.layout.drawFast();
  }

  drawExport() {
    this.layout.drawExport();
  }

  /**
   * Draw the map. By default the full version of the map is drawn. The map can be drawn faster but this will
   * reduce the number of features and other components are drawn.
   * @param {Boolean} fast - If true, a fast version of the map is draw. Fast drawing is best for zooming and scrolling.
   */
  draw(fast) {
    this.layout.draw(fast);
  }

  featureTypes(term) {
    return this._features.map( f => f.type ).unique().get(term);
  }

  featuresByType(type) {
    return this._features.filter( f => f.type === type );
  }

  featuresBySource(source) {
    return this._features.filter( f => f.source === source );
  }

  refreshCanvasLayer() {
    for (let i = 0, len = this._captions.length; i < len; i++) {
      this._captions[i].refresh();
    }
    this.legend && this.legend.refresh();
  }

  /**
   * Animate through a defined set of elements (eg. features, bookmarks) or a
   * random number of features. By default the map will reset between
   * animations. To stop the animation, click the map canvas or call
   * [Viewer.stopAnimate()](Viewer.html#stopAnimate).
   * @param {Number|Array} elements - An array of [features](Feature.html) or
   *   [bookmarks](Bookmark.html). If a number is provided, that number of random
   *   features will be animated.
   * @param {Object} options - Options for the animations:
   * <br />
   * Name         | Type    | Description
   * -------------|---------|------------
   * noReset      | Boolean | If set to true, the map will not reset between animations [Default: false]
   * resetPosition  | Feature,Bookmark | A feature or bookmark to reset the map to between animations [Default: call [Viewer.reset()](Viewer.html#reset)]
   * resetDuration  | Number | Number of milliseconds for the reset animation [Default: 3000]
   * resetPause  | Number | Number of milliseconds to pause on the reset position [Default: 1000]
   * elementDuration  | Number | Number of milliseconds for each element animation [Default: 3000]
   * elementPause  | Number | Number of milliseconds to pause on each element position [Default: 1000]
   *
   * @param {Number} step - The element index (base-0) to start the animation with [Default: 0]
   * @param {Boolean} reset - Whether this is a reset animation or not [Default: false]
   * @param {Boolean} newAnimation - Whether this is a newAnimation or a continuation of a previous one [Default: true]
   */
  animate(elements=5, options={}, step=0, reset=false, newAnimation=true) {
    const noReset = options.noReset;
    const resetPosition = options.resetPosition;
    const resetDuration = utils.defaultFor(options.resetDuration, 3000);
    const resetPause = utils.defaultFor(options.resetPause, 1000);
    const elementDuration = utils.defaultFor(options.elementDuration, 3000);
    const elementPause = utils.defaultFor(options.elementPause, 1000);

    if (newAnimation) {
      // Stop previous animations
      this.stopAnimate();
    }

    // Get random features if an integer was provided for elements
    if (Number.isInteger(elements)) {
      const allFeatures = this.features();
      if (allFeatures.length > 0) {
        let animateFeatures = [];
        for (let i = 0; i < elements; i++) {
          const randomIndex = Math.floor(Math.random() * allFeatures.length);
          const randomFeature = allFeatures[randomIndex];
          animateFeatures.push(randomFeature);
        }
        elements = animateFeatures;
      } else {
        console.error('No features to animate');
        return;
      }
    }

    // Is this step reseting the animation?
    const resetStep = reset && !noReset;

    // Duration for timeout depends on resetStep and element/resetDuration and element/resetPause
    const timeoutDuration = resetStep ? (resetDuration + resetPause) : (elementDuration + elementPause);

    // console.log(`Animate: Step ${step}; Reseting: ${resetStep}; Duration: ${timeoutDuration}`);

    if (resetStep) {
      if (resetPosition) {
        resetPosition.moveTo(resetDuration);
      } else {
        this.reset(resetDuration);
      }
    } else {
      elements[step].moveTo(elementDuration);
      step = (step >= (elements.length - 1)) ? 0 : step + 1;
    }
    this._animateTimeoutID = setTimeout( () => {
      this.animate(elements, options, step, !reset, false);
    }, timeoutDuration);
  }

  /**
   * Stops an animation started with [Viewer.animate()](Viewer.html#animate).
   */
  stopAnimate() {
    clearTimeout(this._animateTimeoutID);
    this._animateTimeoutID = undefined;
    d3.select(this.canvas.node('ui')).interrupt();
  }

  /**
   * Move the viewer to show the map from the *start* to the *stop* position.
   * If only the *start* position is provided,
   * the viewer will center the image on that bp with the current zoom level.
   *
   * @param {Number} start - The start position in bp
   * @param {Number} stop - The stop position in bp
   * @param {Object} options - Options for the move:
   * <br />
   * Name         | Type   | Description
   * -------------|--------|------------
   * bbOffset       | Number | Distance the map backbone should be moved from center [Default: 0]
   * duration     | Number | The animation duration in milliseconds [Default: 1000]
   * ease         | Number | The d3 animation ease [Default: d3.easeCubic]
   * callback     | Function | Function called after the animation is complete.
   */
  moveTo(start, stop, options = {}) {
    if (stop) {
      const bpLength = this.sequence.lengthOfRange(start, stop);
      const bp = this.sequence.addBp(start, bpLength / 2);

      const zoomFactor = this.layout.zoomFactorForLength(bpLength);

      // this.zoomTo(bp, zoomFactor, duration, ease, callback);
      this.zoomTo(bp, zoomFactor, options);
    } else {
      // this._moveTo(start, duration, ease, callback);
      this._moveTo(start, options);
    }
  }

  _moveTo(bp, options = {}) {
    const self = this;
    const layout = this.layout;
    const backboneZoomThreshold = 3;

    const {
      bbOffset = utils.defaultFor(options.bbOffset, 0),
      duration = utils.defaultFor(options.duration, 1000),
      ease = utils.defaultFor(options.ease, d3.easeCubic),
      callback
    } = options;

    const { startProps, endProps } = this._moveProps(bp, undefined, bbOffset);

    const isCircular = this.settings.format === 'circular';

    d3.select(this.canvas.node('ui')).transition()
      .duration(duration)
      .ease(ease)
      .tween('move', function() {
        const intermProps = d3.interpolateObject(startProps, endProps);
        return function(t) {
          if (isCircular && startProps.zoomFactor > backboneZoomThreshold && endProps.zoomFactor > backboneZoomThreshold) {
            // Move along map backbone
            const domains = layout.domainsFor(intermProps(t).bp, intermProps(t).zoomFactor, intermProps(t).bbOffset);
            self.scale.x.domain([domains[0], domains[1]]);
            self.scale.y.domain([domains[2], domains[3]]);
          } else {
            // Move from linearly from start to stop
            self.scale.x.domain([intermProps(t).domainX0, intermProps(t).domainX1]);
            self.scale.y.domain([intermProps(t).domainY0, intermProps(t).domainY1]);
          }

          self.trigger('zoom');
          self.drawFast();
        };
      }).on('end', function() {
        callback ? callback.call() : self.drawFull();
      });
  }

  _moveLeftRight(factor=0.5, direction, options = {}) {
    const currentBp = this.canvas.bpForCanvasCenter();
    const length = this.sequence.length;
    let bpChange = length * factor / this.zoomFactor;
    console.log(factor);

    if (direction !== 'right') {
      bpChange *= -1;
    }

    let newBp = currentBp + bpChange;
    if (this.format === 'linear') {
      newBp = (utils.constrain((currentBp + bpChange), 1, this.sequence.length));
    }
    this.moveTo(newBp, null, options);
  }

  /**
   * Moves the map left or counterclockwise by factor, where the factor is the fraction of the current visable range.
   * For example, if 1000 bp are currently visible then the default (factor = 0.5) move
   * would be 500 bp.
   * @param {Number} factor - the fraction of the current visible region to move [Default: 0.5]
   * @param {Object} options - Options for the moving:
   * <br />
   * Name         | Type   | Description
   * -------------|--------|------------
   * bbOffset     | Number | Distance the map backbone should be moved from center [Default: 0]
   * duration     | Number | The animation duration in milliseconds [Default: 1000]
   * ease         | Number | The d3 animation ease [Default: d3.easeCubic]
   * callback     | Function | Function called after the animation is complete.
   */
  moveLeft(factor, options = {}) {
    this._moveLeftRight(factor, 'left', options);
  }

  /**
   * Moves the map right or clockwise by factor, where the factor is the fraction of the current visable range.
   * For example, if 1000 bp are currently visible then the default (factor = 0.5) move
   * would be 500 bp.
   * @param {Number} factor - the fraction of the current visible region to move [Default: 0.5]
   * @param {Object} options - Options for the moving:
   * <br />
   * Name         | Type   | Description
   * -------------|--------|------------
   * bbOffset     | Number | Distance the map backbone should be moved from center [Default: 0]
   * duration     | Number | The animation duration in milliseconds [Default: 1000]
   * ease         | Number | The d3 animation ease [Default: d3.easeCubic]
   * callback     | Function | Function called after the animation is complete.
   */
  moveRight(factor, options = {}) {
    this._moveLeftRight(factor, 'right', options);
  }

  // Returns a number of properties for the current position and the position
  // at the provdied bp, zoomFactor and bbOffset.
  // These properties can be interpolated with d3.interpolateObject(startProps, endProps);
  // Returns an object: {startProps, endProps}
  // Both startProps and endProps contain:
  // - bp, zoomFactor, bbOffset, domainX0, domainX1, domainY0, domainY1
  _moveProps(bp=this.bp, zoomFactor=this.zoomFactor, bbOffset=this.bbOffset) {
    // Current Domains
    const domainX = this.scale.x.domain();
    const domainY = this.scale.y.domain();

    let startBp = this.bp;
    let endBp = bp;

    // For circular maps take the shortest root (e.g. across origin)
    // NOTE: Negative values and values above length only work on circular maps
    const isCircular = this.settings.format === 'circular';
    if (isCircular) {
      const distance = Math.abs(endBp - startBp);
      if (distance > (this.sequence.length / 2)) {
        if (endBp > startBp) {
          endBp  = endBp - this.sequence.length;
        } else {
          startBp  = startBp - this.sequence.length;
        }
      }
    }
      
    const endDomains = this.layout.domainsFor(bp, zoomFactor, bbOffset);

    const startProps = {
      bp: startBp, zoomFactor: this.zoomFactor, bbOffset: this.bbOffset,
      domainX0: domainX[0], domainX1: domainX[1], domainY0: domainY[0], domainY1: domainY[1]
    };

    const endProps = {
      bp: endBp, zoomFactor: zoomFactor, bbOffset: bbOffset,
      domainX0: endDomains[0], domainX1: endDomains[1], domainY0: endDomains[2], domainY1: endDomains[3]
    };

    return {startProps, endProps};
  }

  /**
   * Move the viewer to *bp* position at the provided *zoomFactor*.
   * If *bp* is falsy (inc. 0), the map is centered.
   *
   * @param {Number} bp - The position in bp
   * @param {Number} zoomFactor - The zoome level
   * @param {Object} options - Options for the zoom:
   * <br />
   * Name         | Type   | Description
   * -------------|--------|------------
   * bbOffset     | Number | Distance the map backbone should be moved from center [Default: 0]
   * duration     | Number | The animation duration in milliseconds [Default: 1000]
   * ease         | Number | The d3 animation ease [Default: d3.easeCubic]
   * callback     | Function | Function called after the animation is complete.
   */
  // Implementation Notes:
  // For linear maps:
  // - Interpolate linearly between start and end domains
  // For cicular maps:
  // - when zoomed out (zoomFactor <= backboneZoomThreshold) do as with linear maps
  // - when zoomed in (zoomFactor > backboneZoomThreshold) use bp to interpolate along backbone
  zoomTo(bp, zoomFactor, options = {}) {
    const self = this;
    const layout = this.layout;
    const backboneZoomThreshold = 3;

    const {
      bbOffset = utils.defaultFor(options.bbOffset, 0),
      duration = utils.defaultFor(options.duration, 1000),
      ease = utils.defaultFor(options.ease, d3.easeCubic),
      callback
    } = options;

    const zoomExtent = self._zoom.scaleExtent();
    zoomFactor = utils.constrain(zoomFactor, zoomExtent[0], zoomExtent[1]);

    const { startProps, endProps } = this._moveProps(bp, zoomFactor, bbOffset);

    const isCircular = this.settings.format === 'circular';

    d3.select(this.canvas.node('ui')).transition()
      .duration(duration)
      .ease(ease)
      .tween('move', function() {
        const intermProps = d3.interpolateObject(startProps, endProps);
        return function(t) {

          if (isCircular && startProps.zoomFactor > backboneZoomThreshold && endProps.zoomFactor > backboneZoomThreshold) {
            // Move along map backbone
            const domains = layout.domainsFor(intermProps(t).bp, intermProps(t).zoomFactor, intermProps(t).bbOffset);
            self.scale.x.domain([domains[0], domains[1]]);
            self.scale.y.domain([domains[2], domains[3]]);
          } else {
            // Move from linearly from start to stop
            self.scale.x.domain([intermProps(t).domainX0, intermProps(t).domainX1]);
            self.scale.y.domain([intermProps(t).domainY0, intermProps(t).domainY1]);
          }
          self._zoomFactor = intermProps(t).zoomFactor;
          d3.zoomTransform(self.canvas.node('ui')).k = intermProps(t).zoomFactor;

          self.layout.adjustBpScaleRange();

          self.trigger('zoom');
          self.drawFast();
        };
      }).on('start', function() {
        self.trigger('zoom-start');
      }).on('end', function() {
        self.trigger('zoom-end');
        callback ? callback.call() : self.drawFull();
      });
  }

  /**
   * Zoom in on the current bp a factor
   * @param {Number} - Amount to zoom in by [Default: 2]
   */
  zoomIn(factor=2) {
    const bp = utils.constrain(this.canvas.bpForCanvasCenter(), 1, this.sequence.length);
    this.zoomTo(bp, this.zoomFactor * factor);
  }

  /**
   * Zoom out on the current bp a factor
   * @param {Number} - Amount to zoom out by [Default: 2]
   */
  zoomOut(factor=2) {
    const bp = utils.constrain(this.canvas.bpForCanvasCenter(), 1, this.sequence.length);
    this.zoomTo(bp, this.zoomFactor / factor);
  }

  /**
   * Set zoom level to 1 and centers map
   */
  reset(duration = 1000, ease) {
    this.zoomTo(0, 1, {duration, ease});
  }

  /**
   * Recenter the map tracks at the current bp position
   */
  recenterTracks(duration = 0) {
    this.moveTo(this.bp, undefined, {duration});
  }


  _updateZoomMax() {
    if (this._zoom) {
      this._zoom.scaleExtent([this.minZoomFactor, this.maxZoomFactor]);
    }
  };

  // FIXME: Each object must use update API
  /**
   * Inverts the colors of all map elements (e.g. legendItems, backbone, background).
   */
  invertColors() {
    this.settings.update({backgroundColor: this.settings.backgroundColor.invert().rgbaString});

    this.legend.invertColors();
    this.captions().each( (i, caption) => caption.invertColors() );
    this.refreshCanvasLayer();
    this.ruler.invertColors();
    this.dividers.invertColors();
    this.backbone.invertColors();
    this.sequence.invertColors();
    this.annotation.invertColors();
    this.draw();
  }

  /**
   * See [Events.on()](Events.html#on) 
   */
  on(event, callback) {
    this.events.on(event, callback);
  }

  /**
   * See [Events.off()](Events.html#off) 
   */
  off(event, callback) {
    this.events.off(event, callback);
  }

  /**
   * See [Events.trigger()](Events.html#trigger) 
   */
  trigger(event, object) {
    this.events.trigger(event, object);
    // Almost all events will results in data changing with the following exceptions
    const eventsToIgnoreForDataChange = ['viewer-update', 'cgv-json-load', 'bookmarks-shortcut', 'zoom-start', 'zoom', 'zoom-end'];
    if (!this.loading && !eventsToIgnoreForDataChange.includes(event)) {
      // console.log(event, object)
      // Also need to ignore track-update with loadProgress
      // const attributeKeys = object && object.attributes && Object.keys(object.attributes);
      // if ( !(attributeKeys && attributeKeys.length === 1 && attributeKeys[0] === 'loadProgress')) {
      //   this.update({dataHasChanged: true});
      // }
      // Special conditions where we do not want to say dataHasChanged
      // Ignore track-update with loadProgress
      const attributeKeys = object && object.attributes && Object.keys(object.attributes);
      if ( attributeKeys && attributeKeys.length === 1 && attributeKeys[0] === 'loadProgress') {
        // console.log('Skip loadProgress')
        return;
      }
      // Ignore plot-add with SequenceExtracted plots
      if (event === 'plots-add') {
        const plots = object;
        if (plots.every( p => p.extractedFromSequence) ) {
          // console.log('Skip Extracted Plot')
          return;
        }
      }
      if (event === 'tracks-update') {
        const attributes = object && object.attributes;
        if (attributes === undefined) {
          // console.log('Skip track update with no attributes')
          return;
        }
      }
      this.update({dataHasChanged: true});
    }
  }

}

export { Anchor, Annotation, Backbone, Bookmark, Box, CGArray, CGObject, CGRange, Canvas, Caption, CodonTable, CodonTables, Color, ColorPicker, Contig, Debug, Divider, Dividers, EventMonitor, Events, Feature, Font, Highlighter, HighlighterElement, IO, Label, Layout, LayoutCircular, LayoutLinear, Legend, LegendItem, Messenger, NCList, Plot, Position, Rect, Ruler, Sequence, SequenceExtractor, Settings, Slot, Track, Viewer, utils, version };
