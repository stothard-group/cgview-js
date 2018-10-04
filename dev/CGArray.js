//////////////////////////////////////////////////////////////////////////////
// CGArray
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {
  /**
   * <br />
   * CGArray is essentially an array for holding CGV Objects. Any method
   * that works on an Array will also work on a CGArray.
   *
   * If a single array is provided it will be converted to an CGArray.
   * If mulitple elements are provided, they will be added to the new CGArray.
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
      } else if (elements.length > 50000) {
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
      return new CGV.CGArray(res);
    }

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
   * @param {Undefined} term Return full CGArray
   * @param {Integer}   term Return element at that index (base-1)
   * @param {String}    term Return first element with an id property same as string.
   * @param {Array}     term Return CGArray with elements with matching ids
   * @return {CGArray|or|Element}
   */
    get(term) {
      if (term === undefined) {
        return this;
      } else if (Number.isInteger(term)) {
        return this[term - 1];
      } else if (typeof term === 'string') {
        return this.filter( element => element.id && element.id.toLowerCase() === term.toLowerCase() )[0];
      } else if (Array.isArray(term)) {
        return this.filter( element => term.some( id => element.id === id ) );
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
    each(callback) {
      for (let i = 0, len = this.length; i < len; i++) {
        callback.call(this[i], i, this[i]);
      }
      return this;
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
  CGV.CGArray = CGArray;
})(CGView);


