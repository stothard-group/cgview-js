//////////////////////////////////////////////////////////////////////////////
// Highlighter
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {
  /**
   * <br />
   * The Highlighter object controls highlighting and popovers of features,
   * plots and other elements on the Viewer when the mouse hovers over them.
   */
  class Highlighter extends CGV.CGObject {

    /**
     * Create a Highlighter
     *
     * @param {Viewer} viewer - The parent *Viewer* for the *Highligher*.
     * @param {Object} options - Options for how highlighting should work. Described below.
     *
     *  Option     | Default              | Description
     *  -----------|----------------------|--------------------------
     *  feature    | HighlighterElement   | Describes the highlightling options for features.
     *  plot       | HighlighterElement   | Describes the highlightling options for plots.
     *
     * @return {Highlighter}
     */
    constructor(viewer, options = {}, meta = {}) {
      super(viewer, options, meta);
      this._viewer = viewer;
      this.popoverBox = viewer._container.append('div').attr('class', 'cgv-highlighter-popover-box').style('visibility', 'hidden');
      this.feature = new CGV.HighlighterElement('feature', options.feature);
      this.plot = new CGV.HighlighterElement('plot', options.plot);
      this.contig = new CGV.HighlighterElement('contig', options.contig);
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
      const originX = e.canvasX + viewerRect.left + window.pageXOffset;
      const originY = e.canvasY + viewerRect.top + window.pageYOffset;
      return { x: originX + this._offsetLeft, y: originY + this._offsetTop };
    }

    initializeEvents() {
      this.viewer.off('.cgv-highlighter');
      this.viewer.on('mousemove.cgv-highlighter', (e) => {
        this.mouseOver(e);
        // if (e.feature) {
        //   this.mouseOver('feature', e);
        // } else if (e.plot) {
        //   this.mouseOver('plot', e);
        // } else {
        //   this.hidePopoverBox();
        // }
      });
    }

    // mouseOver(type, e) {
    mouseOver(e) {
      const type = e.elementType;
      if (!type || !this[type]) {
        this.hidePopoverBox();
        return;
      }
      if (this[type].highlighting) {
        this[`highlight${CGV.capitalize(type)}`](e);
      }
      if (this[type].popovers && this.visible) {
        const position = this.position(e);
        const html = (this[type].popoverContents && this[type].popoverContents(e)) || this[`${type}PopoverContentsDefault`](e);
        this.showPopoverBox({position: position, html: html});
      } else {
        this.hidePopoverBox();
      }
    }

    featurePopoverContentsDefault(e) {
      const feature = e.element;
      return `<div style='margin: 0 5px; font-size: 14px'>${feature.type}: ${feature.name}</div>`;
    }

    plotPopoverContentsDefault(e) {
      const plot = e.element;
      const score = plot.scoreForPosition(e.bp);
      return `<div style='margin: 0 5px; font-size: 14px'>Score: ${score.toFixed(2)}</div>`;
    }

    contigPopoverContentsDefault(e) {
      const contig = e.element;
      return `<div style='margin: 0 5px; font-size: 14px'>Contig ${contig.index}/${this.sequence.contigs().length} [${contig.length} bp]: ${contig.name}</div>`;
    }

    highlightFeature(e) {
      e.element.highlight(e.slot);
    }

    highlightPlot(e) {
      const viewer = this.viewer;
      const plot = e.element;
      const score = plot.scoreForPosition(e.bp);
      if (score) {
        const startIndex = CGV.indexOfValue(plot.positions, e.bp, false);
        const start = plot.positions[startIndex];
        const stop = plot.positions[startIndex + 1] || viewer.sequence.length;
        const baselineCenterOffset = e.slot.centerOffset - (e.slot.thickness / 2) + (e.slot.thickness * plot.baseline);
        const scoredCenterOffset = baselineCenterOffset + ((score - plot.baseline) * e.slot.thickness);
        const thickness = Math.abs(baselineCenterOffset - scoredCenterOffset);
        const centerOffset = Math.min(baselineCenterOffset, scoredCenterOffset) + (thickness / 2);
        const color = (score >= plot.baseline) ? plot.colorPositive.copy() : plot.colorNegative.copy();
        color.highlight();

        viewer.canvas.drawElement('ui', start, stop, centerOffset, color.rgbaString, thickness);
      }
    }

    highlightContig(e) {
      // e.element.highlight(e.slot);
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


//////////////////////////////////////////////////////////////////////////////
// Highlighter Element
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {
  /**
   * Create a Highlighter element.
   *
   * @param {String} type - The element type: 'feature' or 'plot'.
   * @param {Object} options - Options for how highlighting should work. Described below.
   *
   *  Option          | Default     | Description
   *  ----------------|-------------------------------------------------
   *  highlighting    | true        | Highlight a element when the mouse is over it
   *  popovers        | true        | Show a popover for the element when the mouse is over it
   *  popoverContents | undefined   | Function to create html for the popover
   *
   * @return {Highlighter}
   */
  class HighlighterElement {
    constructor(type, options = {}) {
      this.type = type;
      this.highlighting = CGV.defaultFor(options.highlighting, true);
      this.popovers = CGV.defaultFor(options.popovers, true);
      this.popoverContents = options.popoverContents;
    }

    get type() {
      return this._type;
    }

    set type(value) {
      this._type = value;
    }

    get highlighting() {
      return this._highlighting;
    }

    set highlighting(value) {
      this._highlighting = value;
    }

    get popover() {
      return this._popover;
    }

    set popover(value) {
      this._popover = value;
    }

    get popoverContents() {
      return this._popoverContents;
    }

    set popoverContents(value) {
      this._popoverContents = value;
    }

  }

  CGV.HighlighterElement = HighlighterElement;
})(CGView);


