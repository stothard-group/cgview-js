//////////////////////////////////////////////////////////////////////////////
// NCList
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * The NCList is a container for intervals that allows fast searching of overlaping regions.
   *
   * Nested Containment List (NCList): A new algorithm for accelerating
   * interval query of genome alignment and interval databases.
   * Alekseyenko, A., and Lee, C. (2007).
   * Bioinformatics, doi:10.1093/bioinformatics/btl647
   * https://academic.oup.com/bioinformatics/article/23/11/1386/199545/Nested-Containment-List-NCList-a-new-algorithm-for
   *
   * Code adapted from
   * https://searchcode.com/codesearch/view/17093141
   */
  class NCList {
    /**
     * Each interval should have a start and stop property.
     *
     * @param {Array} intervals - Array of Intervals used to create the NCList.
     * @param {Object} options - 
     * @return {NCList}
     */
    constructor(intervals = [], options = {}) {
      this.intervals = [];
      this.circularLength = options.circularLength;
      this.fill(intervals);
    }

    /**
     * @member {Number} - The number of intervals in the NCList
     */
    get length() {
      return this._length
    }


    /**
     * Splits intervals that span the Origin of cicular sequences
     */
    _normalize(intervals) {
      var interval;
      var nomalizedIntervals = []
      for (var i = 0, len = intervals.length; i < len; i++) {
        interval = intervals[i];
        if (interval.start <= interval.stop) {
          nomalizedIntervals.push( {interval: interval, index: i});
        } else {
          nomalizedIntervals.push({
            interval: interval,
            index: i,
            start: interval.start,
            stop: this.circularLength,
            crossesOrigin: true
          });
          nomalizedIntervals.push({
            interval: interval,
            index: i,
            start: 1,
            stop: interval.stop,
            crossesOrigin: true
          });
        }
      }
      return nomalizedIntervals
    }

    /**
     * Fils the NCList with the given intervals
     * @param {Array} intervals - Array of intervals
     */
    fill(intervals) {
      this._length = intervals.length;
      if (intervals.length == 0) {
          this.topList = [];
          return;
      }
      var start = this.start;
      var end = this.end;
      var sublist = this.sublist;

      intervals = this._normalize(intervals);
      this.intervals = intervals;

      // Sort by overlap
      intervals.sort(function(a, b) {
          if (start(a) != start(b))
              return start(a) - start(b);
          else
              return end(b) - end(a);
      });
      var sublistStack = [];
      var curList = [];
      this.topList = curList;
      curList.push(intervals[0]);
      if (intervals.length == 1) return;
      var curInterval, topSublist;
      for (var i = 1, len = intervals.length; i < len; i++) {
          curInterval = intervals[i];
          //if this interval is contained in the previous interval,
          if (end(curInterval) < end(intervals[i - 1])) {
              //create a new sublist starting with this interval
              sublistStack.push(curList);
              curList = new Array(curInterval);
              sublist(intervals[i - 1], curList);
          } else {
              //find the right sublist for this interval
              while (true) {
                  if (0 == sublistStack.length) {
                      curList.push(curInterval);
                      break;
                  } else {
                      topSublist = sublistStack[sublistStack.length - 1];
                      if (end(topSublist[topSublist.length - 1])
                          > end(curInterval)) {
                          //curList is the first (deepest) sublist that
                          //curInterval fits into
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
      return interval.stop || interval.interval.stop
    }

    /**
     * Method to retrieve the start coordinate of the interval
     */
    start(interval) {
      return interval.start || interval.interval.start
    }

    /**
     * Method to set the sublist for the given interval.
     */
    sublist(interval, list) {
      interval.sublist = list;
    }


    _run(start, stop = start, step = 1, callback = function() {}, list = this.topList) {
      var skip;
      var len = list.length;
      var i = this._binarySearch(list, start, true, 'stop')
      while (i >= 0 && i < len && this.start(list[i]) <= stop) {
        skip = false

        if (list[i].crossesOrigin) {
          if (this._runIntervalsCrossingOrigin.indexOf(list[i].interval) != -1) {
            skip = true;
          } else {
            this._runIntervalsCrossingOrigin.push(list[i].interval);
          }
        }

        if (!skip && list[i].index % step == 0) {
          callback.call(list[i].interval, list[i].interval);
        }
        if (list[i].sublist) {
          this._run(start, stop, step, callback, list[i].sublist);
        }
        i++;
      }
    }

    /*
     * Run the callback for each interval that overlaps with the given range.
     * @param {Number} start - Start position of the range
     * @param {Number} stop - Stop position of the range [Default: same as start]
     * @param {Number} step - Skip intervals by increasing the step [Default: 1]
     */
    run(start, stop, step, callback = function() {}) {
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
      var count = 0;
      this.run(start, stop, step, (i) => {
        count++
      });
      return count
    }

    /*
     * Return intervals that overlaps with the given range.
     * @param {Number} start - Start position of the range
     * @param {Number} stop - Stop position of the range [Default: same as start]
     * @param {Number} step - Skip intervals by increasing the step [Default: 1]
     * @return {Array}
     */
    find(start, stop, step) {
      var overlaps = [];
      this.run(start, stop, step, (i) => {
        overlaps.push(i);
      });
      return overlaps
    }


    _binarySearch(data, search_value, upper, getter) {
      var min_index = -1;
      var max_index = data.length;
      var current_index, current_value;

      while (max_index - min_index > 1) {
        current_index = (min_index + max_index) / 2 | 0;
        current_value = this.end(data[current_index]);
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


    /*
     * Test that the correct intervalsare returned especially for circular sequences
     */
    static test() {
      function testInterval(nc, start, stop, expected) {
        var result = nc.find(start, stop).map( (n) => {return n.name}).sort().join(', ')
        var expected = expected.sort().join(', ');
        var testOut = '' + start + '..' + stop + ': ' + expected + ' - ';
        testOut += (result == expected) ? 'Pass' : 'FAIL' + ' - ' + result;
        console.log(testOut);
      }

      var intervals = [
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
      ]
      var nc = new CGV.NCList(intervals, { circularLength: 100 });

      testInterval(nc, 10, 20, ['A', 'B', 'C', 'D', 'E', 'F', 'J', 'L']);
      testInterval(nc, 40, 85, ['F', 'G', 'L']);
      testInterval(nc, 40, 95, ['F', 'G', 'H', 'I', 'J', 'K', 'L']);
      testInterval(nc, 95, 10, ['A', 'B', 'C', 'G', 'H', 'I', 'J', 'K', 'L']);

      return nc
    }

  }

  CGV.NCList = NCList;

})(CGView);

