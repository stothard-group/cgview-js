//////////////////////////////////////////////////////////////////////////////
// Legend
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class Legend {

    constructor(viewer, data, options = {}) {
      this.viewer = viewer;
      this._legendItems = new CGV.CGArray();
      // this._sections = CGV.defaultFor(options.sections, []);

      if (data.legendItems) {
        data.legendItems.forEach((legendItemData) => {
          new CGV.LegendItem(this, legendItemData);
        });
      }

    }

    /**
     * @member {Viewer} - Get or set the *Viewer*
     */
    get viewer() {
      return this._viewer
    }

    set viewer(viewer) {
      if (this.viewer) {
        // TODO: Remove if already attached to Viewer
      }
      this._viewer = viewer;
      viewer._legends.push(this);
    }

    draw(ctx, x = 10, y = 20) {
    }

  }

  CGV.Legend = Legend;

})(CGView);
