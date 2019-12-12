//////////////////////////////////////////////////////////////////////////////
// Caption
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {
  /**
   * <br />
   * The *Caption* object can be used to add additional annotation to
   * the map. A *Caption* contain one or more [CaptionItem]{@link CaptionItem} elements
   */
  class Caption extends CGV.CGObject {

    /**
     * Create a new Caption.
     *
     * @param {Viewer} viewer - The parent *Viewer* for the *Caption*.
     * @param {Object} options - Options used to create the caption.
     *
     *  Option                | Default          | Description
     *  ----------------------|-------------------------------------------------
     *  position              | "upper-right"    | Where to draw the caption. See {@link Position}
     *  anchor                |                  | Where to anchor the caption box to the position {@link Anchor}
     *  font                  | "SansSerif,plain,8" | A string describing the font. See {@link Font} for details.
     *  fontColor             | "black"          | A string describing the color. See {@link Color} for details.
     *  textAlignment         | "left"           | *left*, *center*, or *right*
     *  backgroundColor       | Viewer backgroundColor | A string describing the color. See {@link Color} for details.
     *  name                  | ""               | String to display as the Caption
     *
     * @param {Object=} meta - User-defined key:value pairs to add to the caption.
     */
    constructor(viewer, options = {}, meta = {}) {
      super(viewer, options, meta);
      this.viewer = viewer;
      this._name = CGV.defaultFor(options.name, '');
      this.backgroundColor = options.backgroundColor;
      // this.backgroundColor = 'black';
      this.fontColor = CGV.defaultFor(options.fontColor, 'black');
      this.textAlignment = CGV.defaultFor(options.textAlignment, 'left');
      this.box = new CGV.Box(viewer, {
        position: CGV.defaultFor(options.position, 'middle-center'),
        anchor: CGV.defaultFor(options.anchor, 'middle-center')
      });
      // Setting font will refresh the caption and draw
      this.font = CGV.defaultFor(options.font, 'SansSerif, plain, 8');
      // FIXME: go through caption initialization and reduce to calles to Refresh (we only need one)
    }

    /**
     * Return the class name as a string.
     * @return {String} - 'Caption'
     */
    toString() {
      return 'Caption';
    }

    /**
     * @member {Viewer} - Get or set the *Viewer*
     */
    get viewer() {
      return this._viewer;
    }

    set viewer(viewer) {
      this._viewer = viewer;
      viewer._captions.push(this);
    }

    get visible() {
      return this._visible;
    }

    set visible(value) {
      // super.visible = value;
      this._visible = value;
      this.viewer.refreshCanvasLayer();
      // this.viewer ? this.viewer.refreshCanvasLayer() : this.refresh();
      // this.refresh();
    }

    get on() {
      return this.box.on;
    }

    set on(value) {
      this.clear();
      this.box.on = value;
      this.refresh();
    }

    get anchor() {
      return this.box.anchor;
    }

    set anchor(value) {
      this.clear();
      this.box.anchor = value;
      this.refresh();
    }

    get onMap() {
      return this.position.onMap;
    }

    get onCanvas() {
      return this.position.onCanvas;
    }

    /**
     * @member {Context} - Get the *Context* for drawing.
     */
    get ctx() {
      const layer = (this.onMap) ? 'foreground' : 'canvas';
      return this.canvas.context(layer);
    }

    get position() {
      return this.box.position;
    }

    set position(value) {
      this.clear();
      this.box.position = value;
      // this.refresh();
      this.viewer.refreshCanvasLayer();
      // FIXME: need to update anchor 
    }

    /**
     * @member {Color} - Get or set the backgroundColor. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
     */
    get backgroundColor() {
      // TODO set to cgview background color if not defined
      return this._backgroundColor;
    }

    set backgroundColor(color) {
      // this._backgroundColor.color = color;
      if (color === undefined) {
        this._backgroundColor = this.viewer.settings.backgroundColor;
      } else if (color.toString() === 'Color') {
        this._backgroundColor = color;
      } else {
        this._backgroundColor = new CGV.Color(color);
      }
      this.refresh();
    }

    /**
     * @member {Font} - Get or set the font. When setting the font, a string representing the font or a {@link Font} object can be used. For details see {@link Font}.
     */
    get font() {
      return this._font;
    }

    set font(value) {
      if (value.toString() === 'Font') {
        this._font = value;
      } else {
        this._font = new CGV.Font(value);
      }
      this.refresh();
    }

    /**
     * @member {Color} - Get or set the fontColor. When setting the color, a string representing the color or a {@link Color} object can be used. For details see {@link Color}.
     */
    get fontColor() {
      // return this._fontColor.rgbaString;
      return this._fontColor;
    }

    set fontColor(value) {
      if (value.toString() === 'Color') {
        this._fontColor = value;
      } else {
        this._fontColor = new CGV.Color(value);
      }
      this.refresh();
    }

    /**
     * @member {String} - Get or set the text alignment. Possible values are *left*, *center*, or *right*.
     */
    get textAlignment() {
      return this._textAlignment;
    }

    set textAlignment(value) {
      if ( CGV.validate(value, ['left', 'center', 'right']) ) {
        this._textAlignment = value;
      }
      this.refresh();
    }

    /**
     * @member {String} - Get or set the caption name.
     */
    get name() {
      return this._name || '';
    }

    set name(value) {
      this._name = value;
      this.refresh();
    }

    /**
     * @member {String} - Get the name split into an array of lines.
     */
    get lines() {
      return this.name.split('\n');
    }

    update(attributes) {
      this.viewer.updateCaptions(this, attributes);
    }

    moveTo(duration) {
      this.position.moveTo(duration);
    }

    /**
     * Recalculates the *Caption* size and position.
     */
    refresh() {
      const box = this.box;
      if (!box) { return; }
      this.clear();

      // Padding is half line height/font size
      box.padding = this.font.size / 2;

      // Calculate Caption Width
      const lines = this.lines;
      const fonts = lines.map( () => this.font.css );
      const itemWidths = CGV.Font.calculateWidths(this.ctx, fonts, lines);
      const width = d3.max(itemWidths) + (box.padding * 2);

      // Calculate height of Caption
      // - height of each line; plus padding between line; plus padding;
      const lineHeight = this.font.size + box.padding;
      const height = (lineHeight * lines.length) + box.padding;

      box.resize(width, height);

      this.draw();
    }

    fillBackground() {
      const box = this.box;
      this.ctx.fillStyle = this.backgroundColor.rgbaString;
      box.clear(this.ctx);
      this.ctx.fillRect(box.x, box.y, box.width, box.height);
    }

    invertColors() {
      this.update({
        backgroundColor: this.backgroundColor.invert().rgbaString,
        fontColor: this.fontColor.invert().rgbaString
      });
    }

    // highlight(color = '#FFB') {
    //   if (!this.visible) { return; }
    //   // let ctx = this.canvas.context('background');
    //   // ctx.fillStyle = color;
    //   // ctx.fillRect(this.originX, this.originY, this.width, this.height);
    //   const ctx = this.canvas.context('ui');
    //   ctx.lineWidth = 1;
    //   ctx.strokeStyle = color;
    //   ctx.strokeRect(this.originX, this.originY, this.width, this.height);
    // }

    textX() {
      const box = this.box;
      if (this.textAlignment === 'left') {
        return box.leftPadded;
      } else if (this.textAlignment === 'center') {
        return box.centerX;
      } else if (this.textAlignment === 'right') {
        return box.rightPadded;
      }
    }

    clear() {
      this.box.clear(this.ctx);
    }

    draw() {
      if (!this.visible) { return; }
      const ctx = this.ctx;
      const box = this.box;

      // Update the box origin if relative to the map
      box.refresh();

      this.fillBackground();
      ctx.textBaseline = 'top';
      ctx.font = this.font.css;
      ctx.textAlign = this.textAlignment;
      // Draw Text Label
      ctx.fillStyle = this.fontColor.rgbaString;
      // ctx.fillText(this.name, box.paddedX, box.paddedY);

      const lineHeight = (box.height - box.padding) / this.lines.length;
      let lineY = box.paddedY;
      for (let i = 0, len = this.lines.length; i < len; i++) {
        ctx.fillText(this.lines[i], this.textX(), lineY);
        lineY += lineHeight;
      }
    }

    remove() {
      // const viewer = this.viewer;
      // viewer._captions = viewer._captions.remove(this);
      // viewer.clear('canvas');
      // viewer.refreshCanvasLayer();
      this.viewer.removeCaptions(this);
    }

    move(newIndex) {
      const currentIndex = this.viewer.captions().indexOf(this);
      this.viewer.moveCaption(currentIndex, newIndex);
    }

    toJSON() {
      const json = {
        name: this.name,
        position: this.position.toJSON(),
        textAlignment: this.textAlignment,
        font: this.font.string,
        fontColor: this.fontColor.rgbaString,
        backgroundColor: this.backgroundColor.rgbaString,
        visible: this.visible
      };
      if (this.position.onMap) {
        json.anchor = this.anchor.toJSON();
      }
      // FIXME: proksee needs to know visible status but IO would be smaller without defaults
      //        - Maybe, we should have parameters for full JSON and reduced JSON
      // if (!this.visible) {
      //   json.visible = this.visible;
      // }

      return json;
    }

  }

  CGV.Caption = Caption;
})(CGView);
