//////////////////////////////////////////////////////////////////////////////
// Utils
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  CGV.log = function(msg, level) {
    console.log(msg);
  }

  CGV.testSearch = function(length) {
    var pattern = /ATG/igm;
    var indices = []
    var seq = "";
    var possible = "ATCG";

    console.log('Making Sequence...');
    for (var i=0; i < length; i++ ) {
      seq += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    window.seq = seq
    console.log('Finding Pattern...');
    var start_time = new Date().getTime();
    while (match = pattern.exec(seq)) {
      indices.push(match.index);
    }
    console.log('ATGs found: ' + indices.length);
    console.log('Time: ' + CGV.elapsedTime(start_time));
  }

  /**
   * Return the _defaultValue_ if _value_ is undefined
   * @param {Object} value         Returned if it is defined
   * @param {Object} defaultValue Returned if _value_ is undefined
   * @return {Object}
   */
  CGV.defaultFor = function(value, defaultValue) {
    return (value === undefined) ? defaultValue : value;
  }

  /**
   * Return true if the value is one of the validOptions.
   *
   * @param {Object} value - Value to validate
   * @param {Array} validOptions - Array of valid options
   * @return {Boolean}
   */
  CGV.validate = function(value, validOptions) {
    if (validOptions.indexOf(value) != -1) {
      return true
    } else {
      console.error("The value '" + value + "' is not one of the following: " +  validOptions.join(', '))
      return false
    }
  }

  /**
   * Converts the value to a boolean. The following values will be false,
   * all other values will be true: 'false', 'False', false, undefined.
   *
   * @param {Object} value - Value to convert to boolean.
   * @return {Boolean}
   */
  CGV.booleanify = function(value) {
    if (value == 'false' || value == 'False' || value == undefined || value == false) {
      return false
    } else {
      return true
    }
  }

  /**
   * Return the pixel ratio. The default is 1.
   */
  CGV.pixelRatio = 1;

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
    return px * CGV.pixelRatio;
  }

  CGV.getPixelRatio = function(canvas) {
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

  CGV.scaleResolution = function(canvas, ratio){
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

  CGV.elapsedTime = function(old_time) {
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
  // Note:
  //   - For CGView, quadrant 4 has both x and y as positive
  //   - Quandrant 4 has minus angles to match up with the bp scale
  //   - The center of the circle is always (0,0)
  CGV.angleFromPosition = function(x, y) {
    var angle = 1/2*Math.PI;
    if (x != 0) {
      angle = Math.atan(Math.abs(y / x));
    }
    if (y >= 0 && x >= 0) {
      // quadrant 4
      // angle = 2*Math.PI - angle;
      angle = 0 - angle;
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
   * Calculate the hour hand clock position for the supplied angle where:
   *   3/2π -> 12 o'clock
   *   0    -> 3 o'clock
   *   1/2π -> 6 o'clock
   *   π    -> 9 o'clock
   *
   * @param {Number} radians - The angle in radians
   * @return {Number}
   */
  CGV.clockPositionForAngle = function(radians) {
    var clockPostion = Math.round( (radians + Math.PI/2) * (6/Math.PI) );
    if (clockPostion > 12) {
      clockPostion -= 12;
    } else if (clockPostion < 1) {
      clockPostion += 12;
    }
    return clockPostion
  }

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
  CGV.rectOriginForAttachementPoint = function(point, clockPosition, width, height) {
    var x, y;
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
    return {x: x, y: y}
  }

  // CGV.withinRange = function(bp, start, end) {
  //   if (end >= start) {
  //     // Typical Range
  //     return (bp >= start && bp <= end)
  //   } else {
  //     // Range spans 0
  //     return (bp >= start || bp <= end)
  //   }
  // }

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

  // a and b should be arrays of equal length
  CGV.dotProduct = function(a, b) {
    var value = 0;
    for (var i = 0, len = a.length; i < len; i++) {
      value += a[i] * b[i];
    }
    return value
  }

  CGV.pointsAdd = function(a, b) {
    var value =  [0, 0];
    value[0] = a[0] + b[0];
    value[1] = a[1] + b[1];
    return value
  }

  CGV.pointsSubtract = function(a, b) {
    var value = [0, 0];
    value[0] = a[0] - b[0];
    value[1] = a[1] - b[1];
    return value
  }

  // Using code from:
  // http://stackoverflow.com/questions/1073336/circle-line-segment-collision-detection-algorithm
  CGV.circleAnglesFromIntersectingLine = function(radius, x1, y1, x2, y2) {
    // Direction vector of line segment, from start to end
    var d = CGV.pointsSubtract([x2,y2], [x1,y1]);
    // Vector from center of circle to line segment start
    // Center of circle is alwas [0,0]
    var f = [x1, y1]

    // t2 * (d DOT d) + 2t*( f DOT d ) + ( f DOT f - r2 ) = 0
    var a = CGV.dotProduct(d, d);
    var b = 2 * CGV.dotProduct(f, d);
    var c = CGV.dotProduct(f, f) - (radius * radius);

    var discriminant = b*b - 4*a*c;

    var angles = {};
    if (discriminant >= 0) {
      discriminant = Math.sqrt(discriminant);
      var t1 = (-b - discriminant)/(2*a);
      var t2 = (-b + discriminant)/(2*a);
      if (t1 >= 0 && t1 <=1) {
        var px = x1 + (t1 * (x2 - x1));
        var py = y1 + (t1 * (y2 - y1));
        // angles.push(CGV.angleFromPosition(px, py))
        angles.t1 = CGV.angleFromPosition(px, py)
      }
      if (t2 >= 0 && t2 <=1) {
        var px = x1 + (t2 * (x2 - x1));
        var py = y1 + (t2 * (y2 - y1));
        // angles.push(CGV.angleFromPosition(px, py))
        angles.t2 = CGV.angleFromPosition(px, py)
      }
    }
    return angles
  }


  // Return 2 or more angles that intersect with rectangle defined by xy, height, and width
  // Center of circle is always (0,0)
  CGV.circleAnglesFromIntersectingRect = function(radius, x, y, width, height) {
    var angles = [];
    // Top
    angles.push(CGV.circleAnglesFromIntersectingLine(radius, x, y, x + width, y));
    // Right
    angles.push(CGV.circleAnglesFromIntersectingLine(radius, x + width, y, x + width, y - height));
    // Bottom
    angles.push(CGV.circleAnglesFromIntersectingLine(radius, x + width, y - height, x, y - height));
    // Left
    angles.push(CGV.circleAnglesFromIntersectingLine(radius, x, y - height, x, y));
    angles = angles.filter( (a) => { return Object.keys(a).length > 0 })
    if (angles.length > 0) {
      // Resort the angles
      // T1 and T2 are what percent along a line that intersect with the circle
      // T1 is closest to the line start
      // Essentially, with the ways the lines of the rect have been set up
      // T2 is always a start angle and T1 is always an end angle.
      // So if the very first angle is a T1 we want to move it to the end of the list of angles
      var firstKeys = Object.keys(angles[0]);
      if (firstKeys.length == 1 && firstKeys[0] == 't1') {
        angles.push(angles.shift());
      } 
      if (firstKeys.length == 2) {
        angles.push({t1: angles[0].t1});
        angles[0].t1 = undefined;
      }
      angles = angles.map( (a) => {
        var r = []
        if (a.t1 != undefined) {
          r.push(a.t1)
        }
        if (a.t2 != undefined) {
          r.push(a.t2)
        }
        return r
      });
      angles = [].concat.apply([], angles);
    }

    return angles
  }


  /**
   * Binary search to find the index of data where data[index] equals _search_value_.
   * If no element equals value, the returned index will be the upper or lower [default]
   * index that surrounds the value.
   *
   * @param {Array} data Array of numbers. Must be sorted from lowest to highest.
   * @param {Number} search_value The value to search for.
   * @param {Boolean} upper Only used if no element equals the _search_value_ 
   *
   *    - _true_: return index to right of value
   *    - _false_: return index to left of value [default]
   *
   * @return {Number}
   */
  CGV.indexOfValue = function(data, search_value, upper) {
    var min_index = 0;
    var max_index = data.length - 1;
    var current_index, current_value;
    if (data[min_index] >= search_value) return min_index;
    if (data[max_index] <= search_value) return max_index;

    while (max_index - min_index > 1) {
      current_index = (min_index + max_index) / 2 | 0;
      // current_index = (min_index + max_index) >>> 1 | 0;
      current_value = data[current_index];
      if (current_value < search_value) {
        min_index = current_index;
      } else if (current_value > search_value){
        max_index = current_index;
      } else {
        return current_index;
      }
    }
    return (upper ? max_index : min_index);
  }


  /**
   * Return true of nubmer a and b have opposite signs
   */
  CGV.oppositeSigns = function(a, b) {
    return (a * b) < 0
  }

  /**
   * Return the next largest base 2 value for the given number
   */
  CGV.base2 = function(value) {
    return Math.pow(2, Math.ceil(Math.log(value) / Math.log(2)));
  }

  /**
   * Contain the value between the min and max values
   * @param {Number} value - Number to contrain
   * @param {Number} min - If the value is less than min, min will be returned
   * @param {Number} max - If the value is greater than max, max will be returned
   * @return {Number}
   */
  CGV.constrain = function(value, min, max) {
    return Math.max( Math.min(max, value), min)
  }

  /**
   * Merges top level properties of each supplied object.
   * ```javascript
   * CGV.merge({a:1, b:1}, {b:2, c:2}, {c:3, d:3});
   * //=> {a: 1, b: 2, c: 3, d: 3}
   * ```
   * If a non object is provided, it is ignored. This can be useful if
   * merging function arguments that may be undefined.
   * @param {Object} object_1,object_2,..,object_n Objects to merge
   * @return {Object}
   */
  CGV.merge = function() {
    var data = {};
    var object, keys, key;
    for (var arg_i=0, arg_len=arguments.length; arg_i < arg_len; arg_i++) {
      object = arguments[arg_i];
      if (typeof object === 'object') {
        keys = Object.keys(object);
        for (var key_i=0, key_len=keys.length; key_i < key_len; key_i++){
          key = keys[key_i];
          data[key] = object[key];
        }
      }
    }
    return data;
  }


  /**
   * This function scales a value from the *from* range to the *to* range.
   * To scale from [min,max] to [a,b]:
   *
   *                 (b-a)(x - min)
   *          f(x) = --------------  + a
   *                   max - min
   */
  CGV.scaleValue = function(value, from={min: 0, max: 1}, to={min: 0, max: 1}) {
    return (to.max - to.min) * (value - from.min) / (from.max - from.min) + to.min;
  }







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
  CGV.uniqueId = function(idBase, start, currentIds) {
    var id;
    do {
      id = idBase + start;
      start++;
    } while (currentIds.indexOf(id) > -1);
    return id;
  }

  /**
   * Create a random hex string
   *
   * https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
   */
  CGV.randomHexString = function(len) {
    var text = "";
    var possible = "abcdef0123456789";
    for (var i = 0; i < len; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }



  //
  //
  // /**
  //  * Returns the number of milliseconds elapsed since the supplied time.
  //  * The returned time will have 'ms' appended to it.
  //  * @param {Integer} old_time Old time in milliseconds
  //  * @return {Integer}
  //  */
  // JSV.elapsedTime = function(old_time) {
  //   var elapsed = (new Date().getTime()) - old_time;
  //   return elapsed + ' ms';
  // }
  //
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



  // COLORS
  // http://krazydad.com/tutorials/makecolors.php
  CGV.colors = function(len, center, width, alpha, freq1, freq2, freq3,
                                   phase1, phase2, phase3) {
    var colors = [];
    if (len == undefined)      len    = 50;
    if (center == undefined)   center = 200;
    if (width == undefined)    width  = 30;
    if (alpha == undefined)    alpha  = 1;
    if (freq1 == undefined)    freq1  = 2.4;
    if (freq2 == undefined)    freq2  = 2.4;
    if (freq3 == undefined)    freq3  = 2.4;
    if (phase1 == undefined)   phase1 = 0;
    if (phase2 == undefined)   phase2 = 2;
    if (phase3 == undefined)   phase3 = 4;

    for (var i = 0; i < len; ++i) {
      var red   = Math.round(Math.sin(freq1*i + phase1) * width + center);
      var green = Math.round(Math.sin(freq2*i + phase2) * width + center);
      var blue  = Math.round(Math.sin(freq3*i + phase3) * width + center);
      colors.push('rgba(' + red + ',' + green + ',' + blue + ',' + alpha + ')');
    }
    return colors;
  }

  CGV.test_colors = function(colors) {
    colors.forEach(function(color) {
      document.write( '<font style="color:' + color + '">&#9608;</font>')
    })
    document.write( '<br/>')
  }


})(CGView);


