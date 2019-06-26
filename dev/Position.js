//////////////////////////////////////////////////////////////////////////////
// CGView Positin
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {
  /**
   * <br />
   * Position gives a precise location on the canvas or map.
   */
  class Position {

    /**
     * Creating a Position. The default value for Position will be 'middel-center'.
     *
     * @param {String|Object} value - A string describing the position or
     *   an object. The object properties will depend on the position type.
     *
     *   String           | xPercent | yPercent
     *   -----------------|----------|---------
     *   top-left         | 0        | 0
     *   top-center       | 50       | 0
     *   top-right        | 100      | 0
     *   middle-left      | 0        | 50
     *   middle-center    | 50       | 50
     *   middle-right     | 100      | 50
     *   bottom-left      | 0        | 100
     *   bottom-center    | 50       | 100
     *   bottom-right     | 100      | 100
     *
     *   Examples:
     *    value: { lengthPercent: 23, mapOffset: 10 }
     *    value: { lengthPercent: 23, bbOffset: 10 }
     *    value: { contig: 'contig-1', bp: 100, mapOffset: 10 } // NOT IMPLEMENTED
     *    value: { xPercent: 50, yPercent: 40 }
     *    value: 'top-left'
     *
     *   Order of priority for value:
     *   Value                           | Assumes On |
     *   --------------------------------|------------|------------
     *   "top-left"                      | Canvas     |
     *   {xPercent, yPercent,...}        | Canvas     |
     *   {lengthPercent,...}             | Map        |
     *   {contig, bp,...}                | Map        |
     *   {bp,...}                        | Map        |
     *
     *   For offsets on the map: mapOffset > bbOffset > default [mapOffset: 20]
     *
     *   Positions create a point in canvas space based on the supplied values.
     *   The position (on the map) can be updated by called refresh, if the map pans or zoomes.
     *   The type of position can be changed by altering the position properties:
     *      - on: map, canvas
     *      - offsetTo: backbone, map // NOT IMPLEMENTED
     *      - value:
     *         - 'top-left'
     *         - {bp: 1, contig: 'c-1'}
     *         - {lengthPercent: 23, mapOffset: 23}
     *         - {xPercent: 20, yPercent: 30}
     *
     */
    constructor(viewer, value) {
      this._viewer = viewer;
      this.value = value;
    }

    /**
     * Return the class name as a string.
     * @return {String} - 'Anchor'
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

    get xPercent() {
      return this._xPercent;
    }

    get yPercent() {
      return this._yPercent;
    }

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

    _processValue(value) {
      if (typeof value === 'string') {
        this._value = CGV.validate(value, Position.names) ? value : 'middle-center';
        this._on = 'canvas';
        this._type = 'name';
      } else if (typeof value === 'object') {
        const keys = Object.keys(value);
        if (keys.includes('xPercent') && keys.includes('yPercent')) {
          const {xPercent, yPercent} = value;
          this._value = {xPercent, yPercent};
          this._on = 'canvas';
          this._type = 'percent';
        } else if (keys.includes('lengthPercent')) {
          const {lengthPercent} = value;
          this._value = {lengthPercent};
          this._on = 'map';
          this._type = 'percent';
        } else if (keys.includes('bp')) {
          // FIXME: handle bp without contig
          // FIXME: currently not handing bp at all (do we need to yet?)
          const {bp, contig} = value;
          this._value = {bp, contig};
          this._on = 'map';
          this._type = 'bp';
        }
        // Add offset value
        if (this.onMap) {
          const {mapOffset, bbOffset} = value;
          if (CGV.isNumeric(mapOffset)) {
            this._offsetType = 'map';
            this._value.mapOffset = Number(mapOffset);
          } else if (CGV.isNumeric(bbOffset)) {
            this._offsetType = 'backbone';
            this._value.bbOffset = CGV.constrain(bbOffset, -100, 100);
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

    _originFromMapPercent({lengthPercent, bbOffset, mapOffset}) {
      const layout = this.viewer.layout;
      const bp = this.viewer.sequence.length * lengthPercent / 100;
      let centerOffset;
      if (this.offsetType === 'backbone') {
        // FIXME: need better way to convert offsets
        centerOffset = this.viewer.layout.adjustedBBOffsetFor(bbOffset) + this.viewer.backbone.adjustedCenterOffset;
      } else {
        if (mapOffset >= 0) {
          centerOffset = layout.centerOutsideOffset + mapOffset;
        } else {
          centerOffset = layout.centerInsideOffset + mapOffset;
        }
      }
      const point = this.canvas.pointForBp(bp, centerOffset);
      return point;
    }

    convertToOnMap() {
      if (this.onMap) { return this; }
      const viewer = this.viewer;
      const canvas = this.canvas;
      const point = this.point;
      const bp = canvas.bpForPoint(point);
      // FIXME: TEMP - need best way to get bbOffset or mapOffset
      //               dpending on position
      const bbOffset = viewer.layout.centerOffsetForPoint(point) - viewer.backbone.adjustedCenterOffset;
      const lengthPercent = bp / viewer.sequence.length * 100;
      this.value = {lengthPercent, bbOffset};
      return this;
    }

    convertToOnCanvas() {
      if (this.onCanvas) { return this; }
      const viewer = this.viewer;
      const canvas = this.canvas;
      const value = this.value;
      // FIXME: TEMP - need best way to get bbOffset or mapOffset
      //               dpending on position
      const centerOffset = value.bbOffset + viewer.backbone.adjustedCenterOffset;
      const bp = viewer.sequence.length * value.lengthPercent / 100;
      const point = canvas.pointForBp(bp, centerOffset);

      this.value = {
        xPercent: point.x / viewer.width * 100,
        yPercent: point.y / viewer.height * 100
      };
      return this;
    }

    toJSON() {
      return this.value;
    }

  }

  CGV.Position = Position;
})(CGView);


