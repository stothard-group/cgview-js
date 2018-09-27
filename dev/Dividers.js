//////////////////////////////////////////////////////////////////////////////
// Dividers
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {
  /**
   * <br />
   * The CGView Divider is a line that separates tracks or slots.
   */
  class Dividers {

    /**
     * Create a divider
     *
     * @param {Viewer} viewer - The viewer that contains the divider
     * @param {Object} options - Options and stuff
     */
    constructor(viewer, options = {}, meta = {}) {
      this.viewer = viewer;

      this._slot = new CGV.Divider(viewer, options.slot);
      this._track = new CGV.Divider(viewer, options.track);

      if (options.slotMirrorsTrack) {
        this.slot = this.track;
      }
      this.clearBbOffsets();
    }

    /**
     * Return the class name as a string.
     * @return {String} - 'Divider'
     */
    toString() {
      return 'Dividers';
    }

    get track() {
      return this._track;
    }

    get slot() {
      return this._slot;
    }

    get slotMirrorsTrack() {
      return this._slotMirrorsTrack;
    }

    set slotMirrorsTrack(value) {
      this._slotMirrorsTrack = value;
      this._slot = value ? this._track : new CGV.Divider(this, this._track.toJSON());
      this.viewer.layout._adjustProportions();
    }

    /**
     * @member {Number} - Set or get the array of divider positions based on the distance from the backbone.
     */
    // set bbOffsets(value) {
    //   if (value && value.toString() === 'CGArray') {
    //     this._bbOffsets = value;
    //   }
    // }

    /**
     * @member {Number} - Returns a CGArray where each element is an object with 2 properties: distance, type. The 'distance' is the divider distance from the backbone. The 'type' is the divider type (e.g. 'slot' or 'track').
     */
    get bbOffsets() {
      return this._bbOffsets;
    }

    clearBbOffsets() {
      this._bbOffsets = new CGV.CGArray();
    }

    addBbOffset(bbOffset, type) {
      if (['track', 'slot'].includes(type)) {
        this._bbOffsets.push({distance: bbOffset, type: type});
      } else {
        throw 'Divider bbOffset type must be one of "slot" or "track"';
      }
    }

    draw() {
      const canvas = this.viewer.canvas;
      const backboneOffset = this.viewer.backbone.adjustedCenterOffset;
      // if (!this.visible || this.thickness === 0) { return; }
      for (let i = 0, len = this._bbOffsets.length; i < len; i++) {
        const bbOffset = this._bbOffsets[i];
        const centerOffset = backboneOffset + bbOffset.distance;
        const visibleRange = canvas.visibleRangeForCenterOffset(centerOffset, 100);
        if (visibleRange) {
          canvas.drawArc('map', visibleRange.start, visibleRange.stop, centerOffset, this[bbOffset.type].color.rgbaString, this[bbOffset.type].adjustedThickness);
        }
      }
    }

    toJSON() {
      return {
        track: this._track.toJSON(),
        slot: this._slot.toJSON(),
        slotMirrorsTrack: Boolean(this.slotMirrorsTrack)
      };
    }

  }

  CGV.Dividers = Dividers;
})(CGView);


