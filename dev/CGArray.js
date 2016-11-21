//////////////////////////////////////////////////////////////////////////////
// CGArray
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * CGArray is essentially an array for holding CGV Objects. Any method
   * that works directly on an Array (Mutator methods) will work on a CGArray
   * (e.g. pop, push, reverse)
   *
   * If a single array is provided it will be converted to an CGArray.
   * If mulitple elements are provided, they will be added to the new CGArray.
   */
  var CGArray = function() {
    if ( (arguments.length == 1) && (Array.isArray(arguments[0])) ) {
      this.push.apply(this, arguments[0])
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
    this.push.apply(this, cgarray);
    return this;
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
    if ( (arguments.length == 1) && (typeof attributes == 'object') ) {
      var keys = Object.keys(attributes);
      var key_len = keys.length;
      for (var set_i=0, set_len=this.length; set_i < set_len; set_i++) {
        for (var key_i=0; key_i < key_len; key_i++) {
          this[set_i][keys[key_i]] = attributes[keys[key_i]];
        }
      }
    } else if (arguments.length == 2) {
      for (var i=0, len=this.length; i < len; i++) {
        this[i][arguments[0]] = arguments[1];
      }
    } else if (attributes != undefined) {
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
  CGArray.prototype.draw = function(context, scale, fast, calculated, pixel_skip) {
    for (var i=0, len=this.length; i < len; i++) {
      this[i].draw(context, scale, fast, calculated, pixel_skip);
    }
    return this;
  }

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
    for (var i = 0, len = this.length; i < len; i++) {
      callback.call(this[i], i, this);
    }
    return this;
  }

  // TODO: add step
  CGArray.prototype.eachFromRange = function(startValue, stopValue, step, callback) {
    var startIndex = CGV.indexOfValue(this, startValue, true);
    var stopIndex = CGV.indexOfValue(this, stopValue, false);
    if (stopValue >= startValue) {
      for (var i = startIndex; i <= stopIndex; i++) {
        callback.call(this[i], i, this[i]);
      }
    } else {
      for (var i = startIndex, len = this.length; i < len; i++) {
        callback.call(this[i], i, this[i]);
      }
      for (var i = 0; i <= stopIndex; i++) {
        callback.call(this[i], i, this[i]);
      }
    }
    return this;
  }

  CGArray.prototype.countFromRange = function(startValue, stopValue, step) {
    var startIndex = CGV.indexOfValue(this, startValue, true);
    var stopIndex = CGV.indexOfValue(this, stopValue, false);

    if (startValue > this[this.length - 1]) {
      startIndex++;
    }
    if (stopValue < this[0]) {
      stopIndex--;
    }
    if (stopValue >= startValue) {
      return stopIndex - startIndex + 1
    } else {
      return (this.length - startIndex) + stopIndex + 1
    }
  }


  /**
   * Returns true if the CGArray contains the element.
   * @param {Object} element Element to check for
   * @return {Boolean}
   */
  CGArray.prototype.contains = function(element) {
    return (this.indexOf(element) >= 0)
  }

  /**
   * Returns new CGArray with element removed
   * @return {CGArray}
   */
  CGArray.prototype.remove = function(element) {
    var self = this;
    self = new CGArray( self.filter(function(i) { return i != element }) );
    return self;
  }

  /**
   * Return true if the CGArray is empty.
   * @return {Boolean}
   */
  CGArray.prototype.empty = function() {
    return this.length == 0;
  }

  /**
   * Returns true if the CGArray is not empty.
   * @return {Boolean}
   */
  CGArray.prototype.present = function() {
    return this.length > 0;
  }

  /**
   * Sorts the CGArray by the provided property name.
   * @param {String} property Property to order each element set by [default: 'center']
   * @param {Boolean} descending Order in descending order (default: false)
   * @return {CGArray}
   */
  CGArray.prototype.order_by = function(property, descending) {
    // Sort by function call
    if (this.length > 0) {

      if (typeof this[0][property] === 'function'){
        this.sort(function(a,b) {
          if (a[property]() > b[property]()) {
            return 1;
          } else if (a[property]() < b[property]()) {
            return -1;
          } else {
            return 0;
          }
        })
      } else {
      // Sort by property
        this.sort(function(a,b) {
          if (a[property] > b[property]) {
            return 1;
          } else if (a[property] < b[property]) {
            return -1;
          } else {
            return 0;
          }
        })
      }
    }
    if (descending) this.reverse();
    return this;
  }

  CGArray.prototype.lineWidth = function(width) {
    for (var i=0, len=this.length; i < len; i++) {
      this[i].lineWidth = width;
    }
    return this;
  }

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
    // if (arguments.length == 0) {
    if (term == undefined) {
      return this;
    } else if (Number.isInteger(term)) {
      return this[term-1];
    } else if (typeof term == 'string') {
      if ( term.match(/^path-id-/) ) {
        return this.filter(function(element) { return element.path_id() == term; })[0];
      } else if ( term.match(/^label-id-/) ) {
        return this.filter(function(element) { return element.label_id() == term; })[0];
      } else {
        return this.filter(function(element) { return element.id == term; })[0];
      }
    } else if (Array.isArray(term)) {
      var filtered = this.filter(function(element) { return term.some(function(id) { return element.id == id; }); });
      var cgarray = new CGArray();
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
  CGArray.prototype.equals = function(set) {
    if (set.toString() != 'CGArray' && !Array.isArray(set)) { return false }
    var setA = this.unique();
    var setB = set.unique();
    var equals = true
    if (setA.length != setB.length) {
      return false
    }
    setA.forEach(function(a) {
      if (!setB.contains(a)) {
        equals = false
        return
      }
    })
    return equals
  }

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
    var list = Object(this);
    var length = list.length >>> 0;
    var thisArg = arguments[1];
    var value;

    for (var i = 0; i < length; i++) {
      value = list[i];
      if (predicate.call(thisArg, value, i, list)) {
        return value;
      }
    }
    return undefined;
  };

  /** @ignore */

  CGV.CGArray = CGArray;

})(CGView);


