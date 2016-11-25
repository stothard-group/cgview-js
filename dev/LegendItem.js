//////////////////////////////////////////////////////////////////////////////
// LegendItem
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class LegendItem {

    constructor(legend, data = {}, display = {}, meta = {}) {
      this.legend = legend;
      this._text = CGV.defaultFor(data.text, '');
      this._drawSwatch = CGV.defaultFor(data.drawSwatch, false);
      this._font = CGV.defaultFor(data.font, '');
      this._fontColor = CGV.defaultFor(data.fontColor, '');
      this._swatchColor = CGV.defaultFor(data.swatchColor, '');
      this._swatchOpacity = CGV.defaultFor(data.swatchOpacity, '');
      this._textAlignment = CGV.defaultFor(data.textAlignment, '');
    }


    /**
     * @member {Legend} - Get or set the *Legend*
     */
    get legend() {
      return this._legend
    }

    set legend(legend) {
      if (this.legend) {
        // TODO: Remove if already attached to FeatureSlot
      }
      this._legend = legend;
      legend._legendItems.push(this);
      this._viewer = legend.viewer;
    }

    /**
     * @member {Viewer} - Get the *Viewer*
     */
    get viewer() {
      return this._viewer
    }

    get width() {
      return this._width
    }

    get height() {
      return this._font.size
    }

  }

  CGV.LegendItem = LegendItem;

})(CGView);
