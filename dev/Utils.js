//////////////////////////////////////////////////////////////////////////////
// Utils
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * Return the _default_value_ if _value_ is undefined
   * @param {Object} value         Returned if it is defined
   * @param {Object} default_value Returned if _value_ is undefined
   * @return {Object}
   */
  CGV.default_for = function(value, default_value) {
    return (value === undefined) ? default_value : value;
  }

  /**
   * Return the pixel ratio. The default is 1.
   */
  CGV.pixel_ratio = 1;

  /**
   * Converts provided number of pixels based on pixel ratio which depends on
   * the screen resolution. Typical displays will have a pixel ration of 1,
   * while retina displays will have a pixel ration of 2.
   *
   * **Important**: Whenever drawing on the canvas, convert the pixels first
   * using this method.
   *
   * @param {Integer} value Number of pixels
   * @return {Intger}
   */
  CGV.pixel = function(px) {
    return px * CGV.pixel_ratio;
  }

  CGV.get_pixel_ratio = function(canvas) {
    var context = canvas.getContext('2d');
    //  query the various pixel ratios
    var devicePixelRatio = window.devicePixelRatio || 1;

    var backingStoreRatio = context.webkitBackingStorePixelRatio ||
      context.mozBackingStorePixelRatio ||
      context.msBackingStorePixelRatio ||
      context.oBackingStorePixelRatio ||
      context.backingStorePixelRatio || 1;

    return devicePixelRatio / backingStoreRatio;
  }

  CGV.scale_resolution = function(canvas, ratio){
    // get the canvas and context
    var context = canvas.getContext('2d');

    // upscale the canvas if the two ratios don't match
    if (ratio != 1) {

      var oldWidth  = canvas.width;
      var oldHeight = canvas.height;

      canvas.width  = oldWidth  * ratio;
      canvas.height = oldHeight * ratio;

      canvas.style.width  = oldWidth  + 'px';
      canvas.style.height = oldHeight + 'px';
    }
  }

  CGV.elapsed_time = function(old_time) {
    var elapsed = (new Date().getTime()) - old_time;
    return elapsed + ' ms';
  }

  // Circle Quadrants and Angles in Radians
  //        3/2π
  //       -----
  //     / 3 | 4 \
  //  π|---------| 0
  //     \ 2 | 1 /
  //       -----
  //        1/2π
  // Note, for CGView, quadrant 4 has both x and y as positive
  CGV.angleFromPosition = function(x, y) {
    var angle = 1/2*Math.PI;
    if (x != 0) {
      angle = Math.atan(Math.abs(y / x));
    }
    if (y >= 0 && x >= 0) {
      // quadrant 4
      angle = 2*Math.PI - angle;
    } else if (y < 0 && x >= 0) {
      // quandrant 1
    } else if (y < 0 && x < 0) {
      // quandrant 2
      angle = Math.PI - angle;
    } else if (y >= 0 && x < 0) {
      // quandrant 3
      angle = Math.PI + angle;
    }
    return angle
  }

  /**
   * Rounds the number use d3.format.
   * @param {Number} value Number to round
   * @param {Integer} places Number of decimal places to round [Default: 2]
   * @return {Number}
   */
  CGV.round = function(value, places) {
    var places = places || 2;
    // return d3.round(value, places);
    return Number(value.toFixed(places));
  }


  // /**
  //  * Merges top level properties of each supplied object.
  //  * ```javascript
  //  * JSV.merge({a:1, b:1}, {b:2, c:2}, {c:3, d:3});
  //  * //=> {a: 1, b: 2, c: 3, d: 3}
  //  * ```
  //  * If a non object is provided, it is ignored. This can be useful if
  //  * merging function arguments that may be undefined.
  //  * @param {Object} object_1,object_2,..,object_n Objects to merge
  //  * @return {Object}
  //  */
  // JSV.merge = function() {
  //   var data = {};
  //   var object, keys, key;
  //   for (var arg_i=0, arg_len=arguments.length; arg_i < arg_len; arg_i++) {
  //     object = arguments[arg_i];
  //     if (typeof object === 'object') {
  //       keys = Object.keys(object);
  //       for (var key_i=0, key_len=keys.length; key_i < key_len; key_i++){
  //         key = keys[key_i];
  //         data[key] = object[key];
  //       }
  //     }
  //   }
  //   return data;
  // }
  //
  // /**
  //  * Returns a string id using the _id_base_ and _start_ while
  //  * making sure the id is not in _current_ids_.
  //  * ```javascript
  //  * JSV.unique_id('spectra_', 1, ['spectra_1', 'spectra_2']);
  //  * //=> 'spectra_3'
  //  * ```
  //  * @param {String} id_base Base of ids
  //  * @param {Integer} start Integer to start trying to creat ids with
  //  * @param {Array} current_ids Array of current ids
  //  * @return {String}
  //  */
  // JSV.unique_id = function(id_base, start, current_ids) {
  //   var id;
  //   do {
  //     id = id_base + start;
  //     start++;
  //   } while (current_ids.indexOf(id) > -1);
  //   return id;
  // }
  //
  //
  // /**
  //  * Returns the number of milliseconds elapsed since the supplied time.
  //  * The returned time will have 'ms' appended to it.
  //  * @param {Integer} old_time Old time in milliseconds
  //  * @return {Integer}
  //  */
  // JSV.elapsed_time = function(old_time) {
  //   var elapsed = (new Date().getTime()) - old_time;
  //   return elapsed + ' ms';
  // }
  //
  // /**
  //  * Binary search to find the index of data where data[index] equals _search_value_.
  //  * If no element equals value, the returned index will be the upper or lower [default]
  //  * index that surrounds the value.
  //  *
  //  * @param {Array} data Array of numbers. Must be sorted from lowest to highest.
  //  * @param {Number} search_value The value to search for.
  //  * @param {Boolean} upper Only used if no element equals the _search_value_ 
  //  *
  //  *    - _true_: return index to right of value
  //  *    - _false_: return index to left of value [default]
  //  *
  //  * @return {Number}
  //  */
  // JSV.index_of_value = function(data, search_value, upper) {
  //   var min_index = 0;
  //   var max_index = data.length - 1;
  //   var current_index, current_value;
  //   if (data[min_index] >= search_value) return min_index;
  //   if (data[max_index] <= search_value) return max_index;
  //
  //   while (max_index - min_index > 1) {
  //     current_index = (min_index + max_index) / 2 | 0;
  //     current_value = data[current_index];
  //     if (current_value < search_value) {
  //       min_index = current_index;
  //     } else if (current_value > search_value){
  //       max_index = current_index;
  //     } else {
  //       return current_index;
  //     }
  //   }
  //   return (upper ? max_index : min_index);
  // }
  //
  // /**
  //  * Returns a number unless _n_ is undefined in which case _undefined_ is returned.
  //  * @param {Object} n The object to convert to a number
  //  * @return {Number}
  //  */
  // JSV.number = function(n) {
  //   if (n === undefined) return;
  //   return Number(n);
  // }
  //
  // /** 
  //  * Convience function to determine if an object is a number.
  //  * @param {Object} n The object to check
  //  * @return {Boolean}
  //  */
  // JSV.isNumeric = function (n) {
  //   return isFinite(n) && parseFloat(n) == n;
  // }
  //
  // /** 
  //  * Return the number of decimal places found in _num_.
  //  *
  //  * @param {Number} num The number to check
  //  * @return {Number}
  //  */
  // JSV.decimalPlaces = function(num) {
  //   var match = (''+num).match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
  //   if (!match) { return 0; }
  //   return Math.max(
  //              0,
  //              // Number of digits right of decimal point.
  //              (match[1] ? match[1].length : 0)
  //              // Adjust for scientific notation.
  //              - (match[2] ? +match[2] : 0));
  // }
  //
  // // COLORS
  // // http://krazydad.com/tutorials/makecolors.php
  // JSV.colors = function(len, center, width, alpha, freq1, freq2, freq3,
  //                                  phase1, phase2, phase3) {
  //   var colors = [];
  //   if (len == undefined)      len    = 50;
  //   if (center == undefined)   center = 200;
  //   if (width == undefined)    width  = 30;
  //   if (alpha == undefined)    alpha  = 1;
  //   if (freq1 == undefined)    freq1  = 2.4;
  //   if (freq2 == undefined)    freq2  = 2.4;
  //   if (freq3 == undefined)    freq3  = 2.4;
  //   if (phase1 == undefined)   phase1 = 0;
  //   if (phase2 == undefined)   phase2 = 2;
  //   if (phase3 == undefined)   phase3 = 4;
  //
  //   for (var i = 0; i < len; ++i) {
  //     var red   = Math.round(Math.sin(freq1*i + phase1) * width + center);
  //     var green = Math.round(Math.sin(freq2*i + phase2) * width + center);
  //     var blue  = Math.round(Math.sin(freq3*i + phase3) * width + center);
  //     colors.push('rgba(' + red + ',' + green + ',' + blue + ',' + alpha + ')');
  //   }
  //   return colors;
  // }
  //
  // JSV.test_colors = function(colors) {
  //   colors.forEach(function(color) {
  //     document.write( '<font style="color:' + color + '">&#9608;</font>')
  //   })
  //   document.write( '<br/>')
  // }
  //

})(CGView);


