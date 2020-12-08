//////////////////////////////////////////////////////////////////////////////
// Divider
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {
  /**
   * <br />
   * The CGView Divider is a line that separates tracks or slots.
   */
  class Divider extends CGV.CGObject {

    /**
     * Create a divider
     *
     * @param {Viewer} viewer - The viewer that contains the divider
     * @param {String} name - The name for the divider. One of track, slot, or mirrored.
     * @param {Object} options - Options and stuff
     */
    constructor(viewer, name, options = {}, meta = {}) {
      super(viewer, options, meta);
      this.color = CGV.defaultFor(options.color, 'grey');
      this._thickness = CGV.defaultFor(options.thickness, 1);
      this._spacing = CGV.defaultFor(options.spacing, 1);
      this._name = name;
      this._bbOffsets = new CGV.CGArray();
      this.viewer.trigger('divider-update', { divider: this, attributes: this.toJSON({includeDefaults: true}) });
    }

    /**
     * Return the class name as a string.
     * @return {String} - 'Divider'
     */
    toString() {
      return 'Divider';
    }

    get name() {
      return this._name;
    }

    get visible() {
      return this._visible;
    }

    set visible(value) {
      this._visible = value;
      this.viewer.layout && this.viewer.layout._adjustProportions();
    }

    /**
     * @member {Color} - Get or set the divider color. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
     */
    get color() {
      return this._color;
    }

    set color(value) {
      if (value.toString() === 'Color') {
        this._color = value;
      } else {
        this._color = new CGV.Color(value);
      }
    }

    /**
     * @member {Number} - Set or get the divider thickness. This is the unzoomed thickness.
     */
    set thickness(value) {
      if (value !== undefined) {
        // this._thickness = Math.round(value);
        this._thickness = value;
        this.viewer.layout._adjustProportions();
      }
    }

    get thickness() {
      return this._thickness;
    }

    /**
     * @member {Number} - Get the divider thickness adjusted for visibility and zoom level.
     */
    get adjustedThickness() {
      if (!this.visible) { return 0; }
      return (this.viewer.zoomFactor < 1) ? (this._thickness * this.viewer.zoomFactor) : this._thickness;
    }

    /**
     * @member {Number} - Set or get the divider spacing.
     */
    set spacing(value) {
      if (value !== undefined) {
        this._spacing = Math.round(value);
        this.viewer.layout._adjustProportions();
      }
    }

    get spacing() {
      return this._spacing;
    }

    /**
     * @member {Number} - Get the divider spacing adjusted for zoom level. Even the divider
     * is not visible, there can still be spacing between the slots/tracks.
     */
    get adjustedSpacing() {
      return (this.viewer.zoomFactor < 1) ? (this._spacing * this.viewer.zoomFactor) : this._spacing;
    }

    get mirror() {
      return this._mirror;
    }

    set mirror(value) {
      this._mirror = value;
      if (value === true) {
        // Mirror other divider to this one
        this.viewer.dividers.mirrorDivider(this);
      } else {
        // Turns off mirroring
        this.viewer.dividers.mirrorDivider();
      }
    }

    /**
     * Update divider
     */
    update(attributes) {
      const { records: dividers, updates } = this.viewer.updateRecords(this, attributes, {
        recordClass: 'Divider',
        validKeys: ['visible', 'color', 'thickness', 'spacing', 'mirror']
      });
      this.viewer.trigger('divider-update', { divider: this, attributes, updates });
    }


    // /**
    //  * @member {Number} - Set or get the array of divider positions based on the distance from the backbone.
    //  */
    // set bbOffsets(value) {
    //   if (value && value.toString() === 'CGArray') {
    //     this._bbOffsets = value;
    //   }
    // }
    //
    // get bbOffsets() {
    //   return this._bbOffsets;
    // }
    //
    // /**
    //  * The visible range
    //  * @member {Range}
    //  */
    // get visibleRange() {
    //   return this._visibleRange;
    // }
    //
    // clearBbOffsets() {
    //   this.bbOffsets = new CGV.CGArray();
    // }
    //
    // addBbOffset(bbOffset) {
    //   this._bbOffsets.push(bbOffset);
    // }
    //
    // draw() {
    //   if (!this.visible || this.thickness === 0) { return; }
    //   for (let i = 0, len = this._bbOffsets.length; i < len; i++) {
    //     const bbOffset = this._bbOffsets[i];
    //     this._visibleRange = this.canvas.visibleRangeForCenterOffset(bbOffset, 100);
    //     if (this.visibleRange) {
    //       this.viewer.canvas.drawElement('map', this.visibleRange.start, this.visibleRange.stop, bbOffset, this.color.rgbaString, this.adjustedThickness);
    //     }
    //   }
    // }

    toJSON() {
      return {
        visible: this.visible,
        color: this.color.rgbaString,
        thickness: this.thickness,
        spacing: this.spacing
      };
    }

  }

  CGV.Divider = Divider;
})(CGView);


