//////////////////////////////////////////////////////////////////////////////
// Highlighter
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * <br />
   * The Highlighter object controls highlighting and popovers of features and
   * plots on the Viewer when the mouse hovers over them.
   */
  class Highlighter {
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
    constructor(viewer, options = {}) {
      this._viewer = viewer;
      // this.popoverBox = d3.select('body').append('div').attr('class', 'cgv-highlighter-popover-box').style('visibility', 'hidden');
      this.popoverBox = viewer._container.append('div').attr('class', 'cgv-highlighter-popover-box').style('visibility', 'hidden');
      // this.text_container = this.popup_box.append('div').attr('class', 'jsv-highlight-text-container');
      this.featureHighlighting = CGV.defaultFor(options.featureHighlighting, true);
      this.featurePopovers = CGV.defaultFor(options.featurePopovers, true);
      this.featurePopoverContents = options.featurePopoverContents;
      this.plotHighlighting = CGV.defaultFor(options.plotHighlighting, true);
      this.initializeEvents();
    }

    /**
     * @member {Viewer} - Get the viewer.
     */
    get viewer() {
      return this._viewer
    }

    position(e) {
      // FIXME: move constants to init, so we don't keep calculating
      var ratio = CGV.pixel(1);
      var wrapper = this.viewer._wrapper.node();
      var offsetLeft = wrapper.offsetLeft;
      var offsetTop = wrapper.offsetTop;
      return { x: e.canvasX/ratio + offsetLeft + 10, y: e.canvasY/ratio + offsetTop - 20}
    }

    initializeEvents() {
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

    mouseOverFeature(e) {
      if (this.featureHighlighting) {
        e.feature.highlight(e.slot);
      }
      if (this.featurePopovers) {
        var position = this.position(e);
        var html;
        if (this.featurePopoverContents) {
          html = this.featurePopoverContents(e.feature);
        } else {
          var f = e.feature;
          var html = `<div style='margin: 0 5px;'>${f.type}: ${f.name}</div>`;
        }
        this.popoverBox.html(html);
        this.popoverBox
          .style('left', position.x)
          .style('top', position.y);
        this.showPopoverBox();
      }
    }

    mouseOverPlot(e) {
      if (this.plotHighlighting) {
        this.highlightPlot(e);
      }
    }

    highlightPlot(e) {
      var viewer = this.viewer;
      var score = e.plot.scoreForPosition(e.bp);
      if (score) {
        var startIndex = CGV.indexOfValue(e.plot.positions, e.bp, false);
        var start = e.plot.positions[startIndex];
        var stop = e.plot.positions[startIndex + 1] || viewer.sequence.length;
        var baselineRadius = e.slot.radius - (e.slot.thickness / 2) + (e.slot.thickness * e.plot.baseline);
        var scoredRadius = baselineRadius + (score - e.plot.baseline) * e.slot.thickness;
        var thickness = Math.abs(baselineRadius - scoredRadius);
        var radius = Math.min(baselineRadius, scoredRadius) + (thickness / 2);
        var color = (score >= e.plot.baseline) ? e.plot.colorPositive.copy() : e.plot.colorNegative.copy();
        color.highlight();

        viewer.canvas.drawArc('ui', start, stop, radius, color.rgbaString, thickness);
      }
    }

    hidePopoverBox() {
      this.popoverBox.style('visibility', 'hidden');
    }

    showPopoverBox() {
      this.popoverBox.style('visibility', 'visible');
    }


    // SVHighlighter.prototype.hover = function() {
    //   var sv = this.sv;
    //   if (this.element_type) {
    //     var old_element = this.highlighted_element;
    //     var element = sv.find_element_mouse_over(this.element_type, this.restriction_spectrum_id, this.possible_elements, this.visible_only);
    //     if ( sv.selection.mouse_in_selection() || sv.selection.mouse_in_handle() ) {
    //       element = undefined;
    //     }
    //     if (old_element != element) {
    //       this.highlighted_element = element;
    //       // Remove previous highlighting
    //       if (old_element) {
    //         old_element.display_settings(this.saved_display_settings);
    //         this.hide_popup_box();
    //       }
    //       // Highlight new element
    //       if (element) {
    //         this.saved_display_settings = element.display_settings();
    //         element.display_settings(this.display);
    //         this.show_popup_box();
    //       }
    //       // sv.calc_draw();
    //       sv.full_draw();
    //     }
    //   }
    // }
    //
    // SVHighlighter.prototype.remove = function() {
    //   if (this.highlighted_element) {
    //     this.highlighted_element.display_settings(this.saved_display_settings);
    //     this.highlighted_element = undefined;
    //     this.hide_popup_box();
    //   }
    // }
    //
    // SVHighlighter.prototype.hide_popup_box = function() {
    //   this.sv.trigger('highlight-end');
    //   // this.popup_box.style('display', 'none');
    //   this.popup_box.style('visibility', 'hidden');
    // }
    //
    // SVHighlighter.prototype.show_popup_box = function() {
    //   var element = this.highlighted_element;
    //   var text = '';
    //   if (this.textDisplay === true) {
    //     text = this.default_text();
    //   } else if (typeof this.textDisplay == 'string') {
    //     text = this.parsed_text();
    //   }
    //   this.sv.trigger('highlight-start');
    //   if (this.textDisplay) {
    //     // Increase popup width before adding text, so text_container is not compressed
    //     this.popup_box.style('width', '100%');
    //     this.text_container.html(text);
    //     // this.popup_box.style('display', 'block').style('width', parseInt(this.text_container.style('width')) + 20);
    //     var box_width = this.text_container.node().offsetWidth + 20;
    //     // Alter position if menu is showing
    //     var top = this.sv.menu.visible() ? this.sv.menu.height() + 5 : 15 ;
    //     // Show
    //     this.popup_box.style('visibility', 'visible')
    //       .style('top', top + 'px')
    //       .style('width', box_width + 'px');
    //   }
    // }
    //
    // SVHighlighter.prototype.default_text = function() {
    //   var text = '';
    //   if (this.element_type == 'peak') {
    //     text = 'Peak: ' + d3.round(this.highlighted_element.center, 3) + ' ppm';
    //   } else if (this.element_type == 'cluster') {
    //     text = 'Cluster: ' + d3.round(this.highlighted_element.center(), 3) + ' ppm';
    //   } else if (this.element_type == 'compound') {
    //     text = this.highlighted_element.name;
    //   } else if (this.element_type == 'spectrum') {
    //     text = this.highlighted_element.name;
    //   }
    //   return text;
    // }
    //
    //
    // SVHighlighter.prototype.parsed_text = function() {
    //   var element = this.highlighted_element;
    //   var parser = function(match, p1, p2) {
    //     var text;
    //     if (p1 == 'p') {
    //       text = element[p2];
    //     } else if (p1 == 'f') {
    //       text = element[p2]();
    //     } else if (p1 == 'm') {
    //       text = element.meta[p2];
    //     }
    //     return text;
    //   }
    // // 'bob#{a:1}test#{b:2}'.replace(/\#\{(.):(.*?)\}/g, function(match, p1, p2) {return ' - ' + p2 + ' - '})
    //   return this.textDisplay.replace(/#\{(.):(.*?)\}/g, parser);
    // }

  }

  CGV.Highlighter = Highlighter;

})(CGView);


