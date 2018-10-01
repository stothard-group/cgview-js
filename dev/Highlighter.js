//////////////////////////////////////////////////////////////////////////////
// Highlighter
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {
  /**
   * <br />
   * The Highlighter object controls highlighting and popovers of features and
   * plots on the Viewer when the mouse hovers over them.
   */
  class Highlighter extends CGV.CGObject {

    /**
     * Create a Highligher
     *
     * @param {Viewer} viewer - The parent *Viewer* for the *Highligher*.
     * @param {Object} options - Options for how highlighting should work. Described below.
     *
     *  Option                  | Default     | Description
     *  ------------------------|-------------------------------------------------
     *  featureHighlighting    | true        | Highlight a feature when the mouse is over it
     *  featurePopovers        | true        | Show a popover for the feature when the mouse is over it
     *  featurePopoverContents | undefined   | Function to create html for the popover
     *  plotHighlighting       | true        | Highlight a plot when the mouse is over it
     *  plotPopovers           | true        | Show a popover for the plot when the mouse is over it
     *  plotPopoverContents    | undefined   | Function to create html for the popover
     *
     * @return {Highlighter}
     */
    constructor(viewer, options = {}, meta = {}) {
      super(viewer, options, meta);
      this._viewer = viewer;
      this.popoverBox = viewer._container.append('div').attr('class', 'cgv-highlighter-popover-box').style('visibility', 'hidden');
      this.featureHighlighting = CGV.defaultFor(options.featureHighlighting, true);
      this.featurePopovers = CGV.defaultFor(options.featurePopovers, true);
      this.featurePopoverContents = options.featurePopoverContents;
      this.plotHighlighting = CGV.defaultFor(options.plotHighlighting, true);
      this.plotPopovers = CGV.defaultFor(options.plotPopovers, true);
      this.plotPopoverContents = options.plotPopoverContents;
      this.initializeEvents();

      // Set up position constants
      this._offsetLeft = parseInt(this.viewer._container.style('padding-left')) + 10;
      this._offsetTop = parseInt(this.viewer._container.style('padding-top')) - 20;
    }

    /**
     * @member {Viewer} - Get the viewer.
     */
    get viewer() {
      return this._viewer;
    }

    position(e) {
      let viewerRect = {top: 0, left: 0};
      if (this.viewer._container.style('position') !== 'fixed') {
        viewerRect = this.viewer._container.node().getBoundingClientRect();
      }
      // let viewerRect = this.viewer._container.node().getBoundingClientRect();
      const originX = e.canvasX + viewerRect.left + window.pageXOffset;
      const originY = e.canvasY + viewerRect.top + window.pageYOffset;
      return { x: originX + this._offsetLeft, y: originY + this._offsetTop };
    }

    initializeEvents() {
      this.viewer.off('.cgv-highlighter');
      this.viewer.on('mousemove.cgv-highlighter', (e) => {
        if (e.feature) {
          this.mouseOverFeature(e);
        } else if (e.plot) {
          this.mouseOverPlot(e);
        } else {
          this.hidePopoverBox();
        }
      });
    }

    featurePopoverContentsDefault(feature) {
      return `<div style='margin: 0 5px; font-size: 14px'>${feature.type}: ${feature.name}</div>`;
    }

    plotPopoverContentsDefault(plot, bp) {
      const score = plot.scoreForPosition(bp);
      return `<div style='margin: 0 5px; font-size: 14px'>Score: ${score.toFixed(2)}</div>`;
    }

    mouseOverFeature(e) {
      if (this.featureHighlighting) {
        e.feature.highlight(e.slot);
      }
      if (this.featurePopovers && this.visible) {
        const position = this.position(e);
        const html = (this.featurePopoverContents && this.featurePopoverContents(e.feature)) || this.featurePopoverContentsDefault(e.feature);
        this.showPopoverBox({position: position, html: html});
      }
    }

    mouseOverPlot(e) {
      if (this.plotHighlighting) {
        this.highlightPlot(e);
      }
      if (this.plotPopovers && this.visible) {
        const position = this.position(e);
        const html = (this.plotPopoverContents && this.plotPopoverContents(e.plot, e.bp)) || this.plotPopoverContentsDefault(e.plot, e.bp);
        this.showPopoverBox({position: position, html: html});
      }
    }

    highlightPlot(e) {
      const viewer = this.viewer;
      const score = e.plot.scoreForPosition(e.bp);
      if (score) {
        const startIndex = CGV.indexOfValue(e.plot.positions, e.bp, false);
        const start = e.plot.positions[startIndex];
        const stop = e.plot.positions[startIndex + 1] || viewer.sequence.length;
        const baselineCenterOffset = e.slot.centerOffset - (e.slot.thickness / 2) + (e.slot.thickness * e.plot.baseline);
        const scoredCenterOffset = baselineCenterOffset + ((score - e.plot.baseline) * e.slot.thickness);
        const thickness = Math.abs(baselineCenterOffset - scoredCenterOffset);
        const centerOffset = Math.min(baselineCenterOffset, scoredCenterOffset) + (thickness / 2);
        const color = (score >= e.plot.baseline) ? e.plot.colorPositive.copy() : e.plot.colorNegative.copy();
        color.highlight();

        viewer.canvas.drawElement('ui', start, stop, centerOffset, color.rgbaString, thickness);
      }
    }

    hidePopoverBox() {
      this.popoverBox.style('visibility', 'hidden');
    }

    showPopoverBox(options = {}) {
      if (options.html) {
        this.popoverBox.html(options.html);
      }
      if (options.position) {
        this.popoverBox
          .style('left', `${options.position.x}px`)
          .style('top', `${options.position.y}px`);
      }
      this.popoverBox.style('visibility', 'visible');
    }

    toJSON() {
      return {
        visible: this.visible
      };
    }

  }

  CGV.Highlighter = Highlighter;
})(CGView);


