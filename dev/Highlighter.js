//////////////////////////////////////////////////////////////////////////////
// Highlighter
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * The Highlighter object controls highlighting of features and plots on the Viewer
   * when the mouse hovers over them.
   */
  class Highlighter {
    /**
     * The following options can be set when creating a
     * [SpectraViewer](SpectraViewer.js.html):
     *
     *  Option                | Default     | Description
     *  ----------------------|-------------------------------------------------
     *  textDisplay          | true        | Show popup with description of highlighted element. A custom display string can be provided to display specific information about the element. See below for examples.
     *  display               | {lineWidth: 3} | Display options as described in [SVPath](SVPath.js.html)
     *
     * ####Custom Text Display####
     *
     * If a String is provided for _text_display_ it will parsed first to replace sections
     * with this format: #{T:name} where T is how to extract the information and _name_ is the property/function name to call on the element
     * T can be one of:
     *   * p: property (e.g. element.name)
     *   * f: function (e.g. element.name( ))
     *   * m: meta property (e.g. element.meta.name)
     *
     * Example:
     *
     * If _text_display_ was "Compound: #{p:name} [#{f:display_concentration}]", this would
     * this would display something like the following:
     *   Compound: Glucose [132 uM]
     *
     *
     * @param {Viewer} viewer - The [Viewer](Viewer.html) object
     * @param {Object} options - Options for how highlighting should work. Described below.
     * @return {Highlighter}
     */
    constructor(viewer, options = {}) {
      this._viewer = viewer;
      this.textDisplay = CGV.defaultFor(options.textDisplay, true);
      // display_defaults = { lineWidth: 3, visible: true };
      // this.display = CGV.merge(display_defaults, options.display);
      // this.popup_box = this.sv.sv_wrapper.append('div').attr('class', 'jsv-highlight-popup-box').style('visibility', 'hidden');
      // this.text_container = this.popup_box.append('div').attr('class', 'jsv-highlight-text-container');
    }

    /**
     * @member {Viewer} - Get the viewer.
     */
    get viewer() {
      return this._viewer
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



