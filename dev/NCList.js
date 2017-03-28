//////////////////////////////////////////////////////////////////////////////
// NCList
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * The NCList is a container for intervals that allows fast searching of overlaping regions.
   * Alekseyenko, A., and Lee, C. (2007).
   * Nested Containment List (NCList): A new algorithm for accelerating
   * interval query of genome alignment and interval databases.
   * Bioinformatics, doi:10.1093/bioinformatics/btl647
   * https://academic.oup.com/bioinformatics/article/23/11/1386/199545/Nested-Containment-List-NCList-a-new-algorithm-for
   *
   * Code adapted from
   * https://searchcode.com/codesearch/view/17093141
   */
  class NCList {
    /**
     * @param {Viewer} intervals - Intervals to create the NCList
     * @return {NCList}
     */
    constructor(intervals = [], options = {}) {
      this.intervals = [];
      this.circularLength = options.circularLength;

      // for (var i = 0, len = intervals.length; i < len; i++) {
      //   this.intervals.push( {interval: intervals[i], index: i})
      // }
      this.fill(intervals);
      // intervals.forEach( (i) => { console.log(i)})
    }

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

    fill(intervals) {
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

    end(interval) {
      return interval.stop || interval.interval.stop
    }

    start(interval) {
      return interval.start || interval.interval.start
    }

    sublist(interval, list) {
      interval.sublist = list;
    }


    _run(start, stop = start, step = 1, callback = function() {}, list = this.topList) {
      var skip;
      var len = list.length;
      var i = this.binarySearch(list, start, true, 'stop')
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

    run(start, stop, step, callback = function() {}) {
      this._runIntervalsCrossingOrigin = [];
      if (this.circularLength && stop < start) {
        this._run(start, this.circularLength, step,  callback);
        this._run(1, stop, step,  callback);
      } else {
        this._run(start, stop, step, callback);
      }
    }

    count(start, stop, step) {
      var count = 0;
      this.run(start, stop, step, (i) => {
        count++
      });
      return count
    }

    find(start, stop, step) {
      var overlaps = [];
      this.run(start, stop, step, (i) => {
        overlaps.push(i);
      });
      return overlaps
    }


    binarySearch(data, search_value, upper, getter) {
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


    test() {
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

// n = new CGV.NCList([{start: 1, stop: 100}, {start: 10, stop: 80}, {start: 70, stop: 200}])
// n = new CGV.NCList(cgv.slots(1)._features)


    // fill(intervals) {
    //   if (intervals.length == 0) {
    //       this.topList = [];
    //       return;
    //   }
    //   var start = this.start;
    //   var end = this.end;
    //   var sublist = this.sublist;
    //
    //   // Sort by overlap
    //   intervals.sort(function(a, b) {
    //       if (start(a) != start(b))
    //           return start(a) - start(b);
    //       else
    //           return end(b) - end(a);
    //   });
    //   var sublistStack = [];
    //   var curList = [];
    //   this.topList = curList;
    //   curList.push(intervals[0]);
    //   if (intervals.length == 1) return;
    //   var curInterval, topSublist;
    //   for (var i = 1, len = intervals.length; i < len; i++) {
    //       curInterval = intervals[i];
    //       //if this interval is contained in the previous interval,
    //       if (end(curInterval) < end(intervals[i - 1])) {
    //           //create a new sublist starting with this interval
    //           sublistStack.push(curList);
    //           curList = new Array(curInterval);
    //           sublist(intervals[i - 1], curList);
    //       } else {
    //           //find the right sublist for this interval
    //           while (true) {
    //               if (0 == sublistStack.length) {
    //                   curList.push(curInterval);
    //                   break;
    //               } else {
    //                   topSublist = sublistStack[sublistStack.length - 1];
    //                   if (end(topSublist[topSublist.length - 1])
    //                       > end(curInterval)) {
    //                       //curList is the first (deepest) sublist that
    //                       //curInterval fits into
    //                       curList.push(curInterval);
    //                       break;
    //                   } else {
    //                       curList = sublistStack.pop();
    //                   }
    //               }
    //           }
    //       }
    //   }
    // }
