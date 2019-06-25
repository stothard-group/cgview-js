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
     *    position: { percentLength: 23, mapOffset: 10 }
     *    position: { percentLength: 23, bbOffset: 10 }
     *    position: { contig: 'contig-1', bp: 100, mapOffset: 10 }
     *    position: { xPercent: 50, yPercent: 40 }
     *    position: 'top-left'
     *
     *   Order of priority for value:
     *   Value                           | Assumes On |
     *   --------------------------------|------------|------------
     *   "top-left"                      | Canvas     |
     *   {xPercent, yPercent,...}        | Canvas     |
     *   {percentLength,...}             | Map        |
     *   {contig, bp,...}                | Map        |
     *   {bp,...}                        | Map        |
     *
     *   For offsets on the map: mapOffset > bbOffset > default [mapOffset: 20]
     *
     *   Positions create a point in canvas space based on the supplied values.
     *   The position (on the map) can be updated by called refresh, if the map pans or zoomes.
     *   The type of position can be changed by altering the position properties:
     *      - on: map, canvas
     *      - type: percent, bp, name
     *      - offsetTo: backbone, map
     *      - value:
     *         - 'top-left'
     *         - {bp: 1, contig: 'c-1'}
     *         - {percentLength: 23, mapOffset: 23}
     *         - {xPercent: 20, yPercent: 30}
     *
     */
    constructor(viewer, value) {
      this.viewer = viewer;
      this.processValue(value);
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

    get value() {
      return this._value;
    }

    get type() {
      return this._type;
    }

    get xPercent() {
      return this.value && this.value.xPercent;
    }

    get yPercent() {
      return this.value && this.value.yPercent;
    }

    get onMap() {
      return this.on === 'map';
    }

    get onCanvas() {
      return this.on === 'canvas';
    }

    processValue(value) {
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
        } else if (keys.includes('percentLength')) {
          const {percentLength} = value;
          this._value = {percentLength};
          this._on = 'map';
          this._type = 'percent';
        } else if (keys.includes('bp')) {
          // FIXME: handle bp without contig
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
            this._value.mapOffset = Number(mapOffset)
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

      return this._originFromCanvasPercents({xPercent, yPercent});
    }

    _originFromCanvasPercents({xPercent, yPercent}) {
      const x = this.canvas.width * xPercent / 100;
      const y = this.canvas.height * yPercent / 100;

      return {x, y};
    }

    _originFromMapPercent({percentLength, bbOffset, mapOffset}) {
      const layout = this.viewer.layout;
      const bp = this.viewer.sequence.length * percentLength;
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

    // update(attributes) {
    //   this.refresh();
    // }

    toJSON() {
      if (this.name) {
        return this.name;
      } else {
        return {
          xPercent: this.xPercent,
          yPercent: this.yPercent
        };
      }
    }

  }

  CGV.Position = Position;
})(CGView);


