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

      const keys = Object.keys(options);
      // Both track and slot data is provided
      if (keys.includes('slot') && keys.includes('track')) {
        this._slot = new CGV.Divider(viewer, 'slot', options.slot);
        this._track = new CGV.Divider(viewer, 'track', options.track);
      } else {
        // Only one of track or slot data is provided. Mirro data.
        if (keys.includes('slot')) {
          this._slot = new CGV.Divider(viewer, 'mirrored', options.slot);
          this._track = this.slot;
        } else if (keys.includes('track')) {
          this._track = new CGV.Divider(viewer, 'mirrored', options.track);
          this._slot = this.track;
        } else {
          // Neither track or slot data is provided. Create default slot and mirror.
          this._slot = new CGV.Divider(viewer, 'mirrored');
          this._track = this.slot;
        }
      }

      // if (options.slotMirrorsTrack) {
      //   this.slot = this.track;
      // }
      this.clearBbOffsets();
      // this.viewer.trigger('settings-update', {attributes: this.toJSON({includeDefaults: true})});
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

    get dividersMirrored() {
      return this.slot === this.track;
    }

    // get slotMirrorsTrack() {
    //   return this._slotMirrorsTrack;
    // }

    // If a dividier is provided, the other divider will be mirroed to the provide one.
    // If no divider is provided, the dividers will no longer be mirrored.
    mirrorDivider(divider) {
      if (divider) {
        // Mirror other divider to the one provided
        if (this.slot === divider) {
          this._track = this.slot;
        } else {
          this._slot = this.track;
        }
        this.slot._name = 'mirrored';
      } else {
        // Turn off mirroring
        this._track = new CGV.Divider(this.viewer, 'track', this.slot.toJSON());
        this.slot._name = 'slot';
      }

    }
    // set slotMirrorsTrack(value) {
    //   this._slotMirrorsTrack = value;
    //   this._slot = value ? this._track : new CGV.Divider(this, this._track.toJSON());
    //   this.viewer.layout._adjustProportions();
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
        if (!this[bbOffset.type].visible) { continue; } 
        const centerOffset = backboneOffset + bbOffset.distance;
        const visibleRange = canvas.visibleRangeForCenterOffset(centerOffset, 100);
        if (visibleRange) {
          canvas.drawElement('map', visibleRange.start, visibleRange.stop, centerOffset, this[bbOffset.type].color.rgbaString, this[bbOffset.type].adjustedThickness);
        }
      }
    }

    toJSON(options = {}) {
      if (this.slot === this.track) {
        return {
          slot: this._slot.toJSON(options),
        };
      } else {
        return {
          track: this._track.toJSON(options),
          slot: this._slot.toJSON(options),
        };
      }
    }

  }

  CGV.Dividers = Dividers;
})(CGView);


