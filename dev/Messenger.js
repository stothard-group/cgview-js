//////////////////////////////////////////////////////////////////////////////
// Messenger
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  /**
   * <br />
   *
   */
  class Messenger {

    /**
     * Class to shoe message on viewer
     *
     */
    constructor(viewer, options = {}) {
      this._viewer = viewer;
      this._wrapper = viewer._wrapper.node();

      this.fadeTime = CGV.defaultFor(options.fadeTime, 100);
      this.height = CGV.defaultFor(options.height, 40);
      this.width = CGV.defaultFor(options.width, 200);

      this.box = d3.select(this._wrapper).append('div')
        .style('display', 'none')
        // .attr('class', 'cgv-dialog');
        .attr('class', 'cgv-messenger')
        .style('width', this.height)
        .style('height', this.width)
        // .style('line-height', this.height);
        // .style('border', '1px solid black')
        // .style('position', 'absolute')
        // .style('top', '0')
        // .style('bottom', '0')
        // .style('right', '0')
        // .style('left', '0')
        // .style('text-align', 'center')
        // .style('margin', 'auto auto');

      this.contents = this.box.append('div')
        .attr('class', 'cgv-messenger-contents');

      this._adjust_size();

      return this;
    }

    /**
     * Return the class name as a string.
     * @return {String} - 'Messenger'
     */
    toString() {
      return 'Messenger';
    }

    //////////////////////////////////////////////////////////////////////////
    // MEMBERS
    //////////////////////////////////////////////////////////////////////////

    /**
     * @member {Viewer} - Get the viewer.
     */
    get viewer() {
      return this._viewer
    }

    /**
     * @member {Boolean} - Returns true if the dialog is visible.
     */
    get visible() {
      return (this.box.style('display') !== 'none');
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
   * Opens the messenger
   * @param {Number} duration - The duration of the open animation in milliseconds. Defaults to fadeTime [Messenger.fadeTime](Messenger.html#fadeTime).
   */
    open(duration) {
      duration = CGV.defaultFor(duration, this.fadeTime)
      this._adjust_size();
      this.box.style('display', 'block');
      // this.box.transition().duration(duration)
      //   .style('opacity', 1);
      this.box.style('opacity', 1);
      return this;
    }

  /**
   * Closes the messenger
   * @param {Number} duration - The duration of the close animation in milliseconds. Defaults to fadeTime [Messenger.fadeTime](Messenger.html#fadeTime).
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


    _adjust_size() {
      // Minimum buffer between dialog and edges of container (times 2)
      let buffer = 50;
      let wrapper_width = this._wrapper.offsetWidth;
      let wrapper_height = this._wrapper.offsetHeight;
      let width = this.width;
      let height = this.height;

      if (this.height > wrapper_height - buffer) height = wrapper_height - buffer;
      if (this.width > wrapper_width - buffer) width = wrapper_width - buffer;

      let header_height = 20;
      let footer_height = 20
      let content_height = height - header_height - footer_height;

      this.box
        .style('width', width + 'px')
        .style('height', height + 'px')

      // this.contents
      //   .style('height', content_height + 'px');
    }


    flash(msg) {
      this.contents.html(msg);
      this.open();
    }

  }

  CGV.Messenger = Messenger;

})(CGView);
