/////////////////////////////////////////////////////////////////////////////
// CGViewer Dialog
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * This class is for creating dialog boxes with custom content.
   */
  class Dialog {

    constructor(viewer, options) {
      options = options || {};
      this._wrapper = viewer._wrapper.node();

      this.fadeTime = CGV.defaultFor(options.fadeTime, 500);
      this.header_text = CGV.defaultFor(options.header_text, '');
      this.content_text = CGV.defaultFor(options.content_text, '');
      this.height = CGV.defaultFor(options.height, 300);
      this.width = CGV.defaultFor(options.width, 300);
      this.buttons = options.buttons;

      this.box = d3.select(this._wrapper).append('div')
        .style('display', 'none')
        .attr('class', 'cgv-dialog');

      this.header = this.box.append('div')
        .attr('class', 'cgv-dialog-header')
        .html(this.header_text);

      this.dismiss = this.box.append('div')
        .attr('class', 'cgv-dialog-dismiss')
        .html('X')
        .on('click', () => { this.close(); });

      this.contents = this.box.append('div')
        .attr('class', 'cgv-dialog-contents cgv-scroll');

      if (this.buttons) {
        this.footer = this.box.append('div')
          .attr('class', 'cgv-dialog-footer');
        this._generate_buttons();
      }

      this.contents.html(this.content_text);

      this._adjust_size();

      return this;
    }

    //////////////////////////////////////////////////////////////////////////
    // MEMBERS
    //////////////////////////////////////////////////////////////////////////

    /**
     * @member {Boolean} - Returns true if the dialog is visible.
     */
    get visible() {
      return (this.box.style('display') != 'none');
    }

    /**
     * @member {Number} - Get or set the time it take for the dialog to appear and disappear in milliseconds [Default: 500].
     */
    get fadeTime() {
      return this._fadeTime;
    }

    set fadeTime(value) {
      this._fadeTime = value;
    }

    //////////////////////////////////////////////////////////////////////////
    // METHODS
    //////////////////////////////////////////////////////////////////////////

  /**
   * Opens the dialog
   * @param {Number} duration - The duration of the open animation in milliseconds. Defaults to fadeTime [Dialog.fadeTime](Dialog.html#fadeTime).
   */
    open(duration) {
      duration = CGV.defaultFor(duration, this.fadeTime)
      this._adjust_size();
      this.box.style('display', 'block');
      this.box.transition().duration(duration)
        .style('opacity', 1);
      return this;
    }

  /**
   * Closes the dialog
   * @param {Number} duration - The duration of the close animation in milliseconds. Defaults to fadeTime [Dialog.fadeTime](Dialog.html#fadeTime).
   */
    close(duration) {
      duration = CGV.defaultFor(duration, this.fadeTime)
      this.box.transition().duration(duration)
        .style('opacity', 0)
        .on('end', function() {
          d3.select(this).style('display', 'none');
        });
      return this;
    }

    _generate_buttons() {
      var labels = Object.keys(this.buttons);
      labels.forEach( (label) => {
        this.footer.append('button')
          .html(label)
          .attr('class', 'cgv-button')
          .on('click', () => { this.buttons[label].call(this) });
      });

    }

    _adjust_size() {
      // Minimum buffer between dialog and edges of container (times 2)
      var buffer = 50;
      var wrapper_width = this._wrapper.offsetWidth;
      var wrapper_height = this._wrapper.offsetHeight;
      var width = this.width;
      var height = this.height;

      if (this.height > wrapper_height - buffer) height = wrapper_height - buffer;
      if (this.width > wrapper_width - buffer) width = wrapper_width - buffer;

      var header_height = 40;
      var footer_height = this.buttons ? 35 : 0;
      var content_height = height - header_height - footer_height;

      this.box
        .style('width', width + 'px')
        .style('height', height + 'px')

      this.contents
        .style('height', content_height + 'px');
    }

  }

  CGV.Dialog = Dialog;

})(CGView);


