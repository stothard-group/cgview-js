//////////////////////////////////////////////////////////////////////////////
// CGArray
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * <br />
   * CGArray is essentially an array for holding CGV Objects. Any method
   * that works directly on an Array (Mutator methods) will work on a CGArray
   * (e.g. pop, push, reverse)
   *
   * If a single array is provided it will be converted to an CGArray.
   * If mulitple elements are provided, they will be added to the new CGArray.
   */
  let CGArrayOLD = function() {
    if ( (arguments.length === 1) && (Array.isArray(arguments[0])) ) {
      for (let i = 0, len = arguments[0].length; i < len; i++) {
        this.push(arguments[0][i]);
      }
    } else if (arguments.length > 0) {
      this.push.apply(this, arguments)
    }
  }
  CGArray.prototype = Object.create(Array.prototype);

  /**
   * Return the string 'CGArray'
   * @return {String}
   */
  CGArray.prototype.toString = function() { return 'CGArray' }

  /**
   * Push the elements of the supplied CGArray/Array on to the CGArray.
   * @param {CGArray|Array} cgarray CGArray or Array to add
   * @return {CGArray}
   */
  CGArray.prototype.merge = function(cgarray) {
    for (let i = 0, len = cgarray.length; i < len; i++) {
      this.push(cgarray[i]);
    }
    return this
  };

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
  CGArray.prototype.attr = function(attributes) {
    if ( (arguments.length === 1) && (typeof attributes === 'object') ) {
      let keys = Object.keys(attributes);
      let key_len = keys.length;
      for (let set_i=0, set_len=this.length; set_i < set_len; set_i++) {
        for (let key_i=0; key_i < key_len; key_i++) {
          this[set_i][keys[key_i]] = attributes[keys[key_i]];
        }
      }
    } else if (arguments.length === 2) {
      for (let i=0, len=this.length; i < len; i++) {
        this[i][arguments[0]] = arguments[1];
      }
    } else if (attributes !== undefined) {
      throw new Error('attr(): must be 2 arguments or a single object');
    }
    return this;
  }

  /**
   * Call the draw method for each element in the CGArray.
   * See [SVPath.draw](SVPath.js.html#draw) for details
   * @param {} context
   * @param {} scale
   * @param {} fast
   * @param {} calculated
   * @param {} pixel_skip
   * @retrun {CGArray}
   */
  // CGArray.prototype.draw = function(context, scale, fast, calculated, pixel_skip) {
  //   for (let i=0, len=this.length; i < len; i++) {
  //     this[i].draw(context, scale, fast, calculated, pixel_skip);
  //   }
  //   return this;
  // }

  /**
   * Iterates through each element of the CGArray and run the callback.
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
  CGArray.prototype.each = function(callback) {
    for (let i = 0, len = this.length; i < len; i++) {
      callback.call(this[i], i, this[i]);
    }
    return this;
  }

  // CGArray.prototype.eachFromRange = function(startValue, stopValue, step, callback) {
  //   let startIndex = CGV.indexOfValue(this, startValue, true);
  //   let stopIndex = CGV.indexOfValue(this, stopValue, false);
  //   // This helps reduce the jumpiness of feature drawing with a step 
  //   // The idea is to alter the start index based on the step so the same
  //   // indices should be returned. i.e. the indices should be divisible by the step.
  //   if (startIndex > 0 && step > 1) {
  //     startIndex += step - (startIndex % step);
  //   }
  //   if (stopValue >= startValue) {
  //     // Return if both start and stop are between values in array
  //     if (this[startIndex] > stopValue || this[stopIndex] < startValue) { return }
  //     for (let i = startIndex; i <= stopIndex; i += step) {
  //       callback.call(this[i], i, this[i]);
  //     }
  //   } else {
  //     // Skip cases where the the start value is greater than the last value in array
  //     if (this[startIndex] >= startValue) {
  //       for (let i = startIndex, len = this.length; i < len; i += step) {
  //         callback.call(this[i], i, this[i]);
  //       }
  //     }
  //     // Skip cases where the the stop value is less than the first value in array
  //     if (this[stopIndex] <= stopValue) {
  //       for (let i = 0; i <= stopIndex; i += step) {
  //         callback.call(this[i], i, this[i]);
  //       }
  //     }
  //   }
  //   return this;
  // }
  //
  // CGArray.prototype.countFromRange = function(startValue, stopValue, step) {
  //   let startIndex = CGV.indexOfValue(this, startValue, true);
  //   let stopIndex = CGV.indexOfValue(this, stopValue, false);
  //
  //   if (startValue > this[this.length - 1]) {
  //     startIndex++;
  //   }
  //   if (stopValue < this[0]) {
  //     stopIndex--;
  //   }
  //   if (stopValue >= startValue) {
  //     return stopIndex - startIndex + 1
  //   } else {
  //     return (this.length - startIndex) + stopIndex + 1
  //   }
  // }


  /**
   * Returns true if the CGArray contains the element.
   * @param {Object} element Element to check for
   * @return {Boolean}
   */
  // CGArray.prototype.contains = function(element) {
  //   return (this.indexOf(element) >= 0)
  // }

  /**
   * Returns new CGArray with element removed
   * @return {CGArray}
   */
  CGArray.prototype.remove = function(element) {
    let self = this;
    self = new CGArray( self.filter(function(i) { return i !== element }) );
    return self;
  }

  /**
   * Return true if the CGArray is empty.
   * @return {Boolean}
   */
  CGArray.prototype.empty = function() {
    return this.length === 0;
  }

  /**
   * Returns true if the CGArray is not empty.
   * @return {Boolean}
   */
  CGArray.prototype.present = function() {
    return this.length > 0;
  }

  /**
   * Move the an item from oldIndex to newIndex.
   * @param {Number} oldIndex - index of element to move
   * @param {Number} newIndex - move element to this index
   */
  CGArray.prototype.move = function(oldIndex, newIndex) {
		if (newIndex >= this.length) {
			let k = newIndex - this.length;
			while ((k--) + 1) {
				this.push(undefined);
			}
		}
		this.splice(newIndex, 0, this.splice(oldIndex, 1)[0]);
		return this
  }



  /**
   * Sorts the CGArray by the provided property name.
   * @param {String} property Property to order each element set by [default: 'center']
   * @param {Boolean} descending Order in descending order (default: false)
   * @return {CGArray}
   */
  // CGArray.prototype.order_by = function(property, descending) {
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

  // CGArray.prototype.lineWidth = function(width) {
  //   for (let i=0, len=this.length; i < len; i++) {
  //     this[i].lineWidth = width;
  //   }
  //   return this;
  // }

  /**
   * Retrieve subset of CGArray or an individual element from CGArray depending on term provided.
   * @param {Undefined} term Return full CGArray
   * @param {Integer}   term Return element at that index (base-1)
   * @param {String}    term Return first element with id same as string. If the id starts
   *   with 'path-id-', the first element with that path-id will be returned.
   * @param {Array}     term Return CGArray with elements with matching ids
   * @return {CGArray|or|Element}
   */
  CGArray.prototype.get = function(term) {
    // if (arguments.length === 0) {
    if (term === undefined) {
      return this;
    } else if (Number.isInteger(term)) {
      return this[term-1];
    } else if (typeof term === 'string') {
      if ( term.match(/^cgv-id-/) ) {
        return this.filter(function(element) { return element.cgvID === term; })[0];
      // } else if ( term.match(/^label-id-/) ) {
      //   return this.filter(function(element) { return element.label_id() === term; })[0];
      } else {
        return this.filter(function(element) { return element.id && element.id.toLowerCase() === term.toLowerCase(); })[0];
      }
    } else if (Array.isArray(term)) {
      let filtered = this.filter(function(element) { return term.some(function(id) { return element.id === id; }); });
      let cgarray = new CGArray();
      cgarray.push.apply(cgarray, filtered);
      return cgarray;
    } else {
      return new CGArray();
    }
  }

  /**
   * Returns true if set matchs the supplied set. The order does not matter
   * and duplicates are ignored.
   * @param {CGArray}     term CGArray to compare against
   * @return {Boolean}
   */
  // CGArray.prototype.equals = function(set) {
  //   if (set.toString() !== 'CGArray' && !Array.isArray(set)) { return false }
  //   let setA = this.unique();
  //   let setB = set.unique();
  //   let equals = true
  //   if (setA.length !== setB.length) {
  //     return false
  //   }
  //   setA.forEach(function(a) {
  //     if (!setB.includes(a)) {
  //       equals = false
  //       return
  //     }
  //   })
  //   return equals
  // }

  /**
   * Return new CGArray with no duplicated values.
   * @return {CGArray}
   */
  CGArray.prototype.unique = function() {
    return new CGArray(this.filter( onlyUnique ));
  }

  function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
  }

  // Polyfill for Array
  CGArray.prototype.find = function(predicate) {
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    let list = Object(this);
    let length = list.length >>> 0;
    let thisArg = arguments[1];
    let value;

    for (let i = 0; i < length; i++) {
      value = list[i];
      if (predicate.call(thisArg, value, i, list)) {
        return value;
      }
    }
    return undefined;
  };

  /** @ignore */

  CGV.CGArrayOLD = CGArrayOLD;

})(CGView);

