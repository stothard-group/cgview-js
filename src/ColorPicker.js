// ColorPicker
//////////////////////////////////////////////////////////////////////////////

import Color from './Color';
import utils from './Utils';
import * as d3 from 'd3';

class ColorPicker {


  /**
   * The ColorPicker
   * Based on Flexi Color Picker: http://www.daviddurman.com/flexi-color-picker/
   * Color is stored internally as HSV, as well as a Color object.
   */
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this._object = options.object;
    this.container = d3.select(`#${containerId}`).node();
    this._width = utils.defaultFor(options.width, 100);
    this._height = utils.defaultFor(options.height, 100);

    this._color = new Color( utils.defaultFor(options.colorString, 'rgba(255,0,0,1)') );
    this.hsv = this._color.hsv;
    this.opacity = this._color.opacity;

    this.onChange = options.onChange;
    this.onClose = options.onClose;

    this.container.innerHTML = this._colorpickerHTMLSnippet();
    d3.select(this.container).classed('cp-dialog', true);
    this.dialogElement = this.container.getElementsByClassName('cp-dialog')[0];
    this.slideElement = this.container.getElementsByClassName('cp-color-slider')[0];
    this.pickerElement = this.container.getElementsByClassName('cp-color-picker')[0];
    this.alphaElement = this.container.getElementsByClassName('cp-alpha-slider')[0];
    this.slideIndicator = this.container.getElementsByClassName('cp-color-slider-indicator')[0];
    this.pickerIndicator = this.container.getElementsByClassName('cp-color-picker-indicator')[0];
    this.pickerIndicatorRect1 = this.container.getElementsByClassName('cp-picker-indicator-rect-1')[0];
    this.alphaIndicator = this.container.getElementsByClassName('cp-alpha-slider-indicator')[0];
    this.currentColorIndicator = this.container.getElementsByClassName('cp-color-current')[0];
    this.originalColorIndicator = this.container.getElementsByClassName('cp-color-original')[0];
    this.doneButton = this.container.getElementsByClassName('cp-done-button')[0];
    this._configureView();

    // Prevent the indicators from getting in the way of mouse events
    // this.slideIndicator.style.pointerEvents = 'none';
    // this.pickerIndicator.style.pointerEvents = 'none';
    // this.alphaIndicator.style.pointerEvents = 'none';

    d3.select(this.slideElement).on('mousedown.click', this.slideListener());
    d3.select(this.pickerElement).on('mousedown.click', this.pickerListener());
    d3.select(this.alphaElement).on('mousedown.click', this.alphaListener());
    d3.select(this.originalColorIndicator).on('mousedown.click', this.originalColorListener());
    d3.select(this.doneButton).on('mousedown.click', this.doneListener());

    this.enableDragging(this, this.slideElement, this.slideListener());
    this.enableDragging(this, this.pickerElement, this.pickerListener());
    this.enableDragging(this, this.alphaElement, this.alphaListener());
    this.enableDragging(this, this.container, this.dialogListener());

    this.enableDragging(this, this.slideIndicator, this.slideListener());
    this.enableDragging(this, this.pickerIndicator, this.pickerListener());
    this.enableDragging(this, this.alphaIndicator, this.alphaListener());


    this.setColor(this._color);

    d3.select(this.container).style('visibility', 'hidden');
  }

  get color() {
    return this._color;
  }

  /**
   * Get or set the object currently associated with the color picker
   */
  get object() {
    return this._object;
  }

  set object(value) {
    this._object = value;
  }

  updateColor() {
    this._color.hsv = this.hsv;
    this._color.opacity = this.opacity;
    this.updateIndicators();
    const pickerRgbString = Color.rgb2String( Color.hsv2rgb( {h: this.hsv.h, s: 1, v: 1} ) );
    this.pickerElement.style.backgroundColor = pickerRgbString;
    this.pickerIndicatorRect1.style.backgroundColor = this.color.rgbString;
    this.slideIndicator.style.backgroundColor = pickerRgbString;
    d3.select(this.alphaElement).selectAll('stop').attr('stop-color', this.color.rgbString);
    this.currentColorIndicator.style.backgroundColor = this.color.rgbaString;
    this.onChange && this.onChange(this.color);
  }

  setColor(value) {
    this._color.setColor(value);
    this.hsv = this._color.hsv;
    this.opacity = Number(this._color.opacity.toFixed(2));
    this.originalColorIndicator.style.backgroundColor = this._color.rgbaString;
    this.updateColor();
  }

  updateIndicators() {
    const hsv = this.hsv;
    const slideY = hsv.h * this.slideElement.offsetHeight / 360;
    const pickerHeight = this.pickerElement.offsetHeight;
    const pickerX = hsv.s * this.pickerElement.offsetWidth;
    const pickerY = pickerHeight - (hsv.v * pickerHeight);
    const alphaX = this.alphaElement.offsetWidth * this.opacity;

    const pickerIndicator = this.pickerIndicator;
    const slideIndicator = this.slideIndicator;
    const alphaIndicator = this.alphaIndicator;
    slideIndicator.style.top = `${slideY - (slideIndicator.offsetHeight / 2)}px`;
    pickerIndicator.style.top = `${pickerY - (pickerIndicator.offsetHeight / 2)}px`;
    pickerIndicator.style.left = `${pickerX - (pickerIndicator.offsetWidth / 2)}px`;
    alphaIndicator.style.left = `${alphaX - (alphaIndicator.offsetWidth / 2)}px`;
  }

  setPosition(pos) {
    this.container.style.left = `${pos.x}px`;
    this.container.style.top = `${pos.y}px`;
  }

  get width() {
    return this.container.offsetWidth;
  }

  get height() {
    return this.container.offsetHeight;
  }

  _colorpickerHTMLSnippet() {
    return [
      '<div class="cp-color-picker-wrapper">',
      '<div class="cp-color-picker"></div>',
      // '<div class="cp-color-picker-indicator"></div>',
      '<div class="cp-color-picker-indicator">',
      '<div class="cp-picker-indicator-rect-1"></div>',
      '<div class="cp-picker-indicator-rect-2"></div>',
      '</div>',
      '</div>',
      '<div class="cp-color-slider-wrapper">',
      '<div class="cp-color-slider"></div>',
      // '<div class="cp-color-slider-indicator"></div>',
      '<div class="cp-color-slider-indicator">',
      '<div class="cp-color-indicator-rect-1"></div>',
      '<div class="cp-color-indicator-rect-2"></div>',
      '</div>',
      '</div>',
      '<div class="cp-alpha-slider-wrapper">',
      '<div class="cp-alpha-slider"></div>',
      // '<div class="cp-alpha-slider-indicator"></div>',
      '<div class="cp-alpha-slider-indicator">',
      '<div class="cp-alpha-indicator-rect-1"></div>',
      '<div class="cp-alpha-indicator-rect-2"></div>',
      '</div>',
      '</div>',
      '<div class="cp-dialog-footer">',
      '<div class="cp-footer-color-section">',
      '<div class="cp-color-original"></div>',
      '<div class="cp-color-current"></div>',
      '</div>',
      '<div class="cp-footer-button-section">',
      '<button class="cp-done-button">Done</button>',
      '</div>',
      '</div>'

    ].join('');
  }

  /**
   * Create slide, picker, and alpha markup
   * The container ID is used to make unique ids for the SVG defs
   */
  _configureView() {
    const containerId = this.containerId;
    const slide = $el('svg', { xmlns: 'http://www.w3.org/2000/svg', version: '1.1', width: '20px', height: '100px' },
      [
        $el('defs', {},
          $el('linearGradient', { id: `${containerId}-gradient-hsv`, x1: '0%', y1: '100%', x2: '0%', y2: '0%'},
            [
              $el('stop', { offset: '0%', 'stop-color': '#FF0000', 'stop-opacity': '1' }),
              $el('stop', { offset: '13%', 'stop-color': '#FF00FF', 'stop-opacity': '1' }),
              $el('stop', { offset: '25%', 'stop-color': '#8000FF', 'stop-opacity': '1' }),
              $el('stop', { offset: '38%', 'stop-color': '#0040FF', 'stop-opacity': '1' }),
              $el('stop', { offset: '50%', 'stop-color': '#00FFFF', 'stop-opacity': '1' }),
              $el('stop', { offset: '63%', 'stop-color': '#00FF40', 'stop-opacity': '1' }),
              $el('stop', { offset: '75%', 'stop-color': '#0BED00', 'stop-opacity': '1' }),
              $el('stop', { offset: '88%', 'stop-color': '#FFFF00', 'stop-opacity': '1' }),
              $el('stop', { offset: '100%', 'stop-color': '#FF0000', 'stop-opacity': '1' })
            ]
          )
        ),
        $el('rect', { x: '0', y: '0', width: '20px', height: '100px', rx: '2px', fill: `url(#${containerId}-gradient-hsv)`})
      ]
    );

    const picker = $el('svg', { xmlns: 'http://www.w3.org/2000/svg', version: '1.1', width: '100px', height: '100px' },
      [
        $el('defs', {},
          [
            $el('linearGradient', { id: `${containerId}-gradient-black`, x1: '0%', y1: '100%', x2: '0%', y2: '0%'},
              [
                $el('stop', { offset: '0%', 'stop-color': '#000000', 'stop-opacity': '1' }),
                $el('stop', { offset: '100%', 'stop-color': '#CC9A81', 'stop-opacity': '0' })
              ]
            ),
            $el('linearGradient', { id: `${containerId}-gradient-white`, x1: '0%', y1: '100%', x2: '100%', y2: '100%'},
              [
                $el('stop', { offset: '0%', 'stop-color': '#FFFFFF', 'stop-opacity': '1' }),
                $el('stop', { offset: '100%', 'stop-color': '#CC9A81', 'stop-opacity': '0' })
              ]
            )
          ]
        ),
        $el('rect', { x: '0', y: '0', width: '100px', height: '100px', rx: '2px', fill: `url(#${containerId}-gradient-white)`}),
        $el('rect', { x: '0', y: '0', width: '100px', height: '100px', rx: '2px', fill: `url(#${containerId}-gradient-black)`})
      ]
    );

    const alpha = $el('svg', { xmlns: 'http://www.w3.org/2000/svg', version: '1.1', width: '127px', height: '10px', style: 'position: absolute;' },
      [
        $el('defs', {},
          [
            $el('linearGradient', { id: `${containerId}-alpha-gradient` },
              [
                $el('stop', { offset: '0%', 'stop-color': '#FFFFFF', 'stop-opacity': '0' }),
                $el('stop', { offset: '100%', 'stop-color': '#FFFFFF', 'stop-opacity': '1' })
              ]
            ),
            $el('pattern', { id: `${containerId}-alpha-squares`, x: '0', y: '0', width: '10px', height: '10px', patternUnits: 'userSpaceOnUse' },
              [
                $el('rect', { x: '0', y: '0', width: '10px', height: '10px', fill: 'white'}),
                $el('rect', { x: '0', y: '0', width: '5px', height: '5px', fill: 'lightgray'}),
                $el('rect', { x: '5px', y: '5px', width: '5px', height: '5px', fill: 'lightgray'})
              ]
            )
          ]
        ),
        $el('rect', { x: '0', y: '0', width: '127px', height: '10px', rx: '2px', fill: `url(#${containerId}-alpha-squares)`}),
        $el('rect', { x: '0', y: '0', width: '127px', height: '10px', rx: '2px', fill: `url(#${containerId}-alpha-gradient)`})
      ]
    );

    this.slideElement.appendChild(slide);
    this.pickerElement.appendChild(picker);
    this.alphaElement.appendChild(alpha);
  }



  /**
  * Enable drag&drop color selection.
  * @param {object} ctx ColorPicker instance.
  * @param {DOMElement} element HSV slide element or HSV picker element.
  * @param {Function} listener Function that will be called whenever mouse is dragged over the element with event object as argument.
  */
  enableDragging(ctx, element, listener) {
    d3.select(element).on('mousedown', function() {
      d3.event.preventDefault();
      d3.event.stopPropagation();
      const mouseStart = mousePosition(element);
      d3.select(document).on('mousemove.colordrag', function() {
        if (document.selection) {
          document.selection.empty();
        } else {
          window.getSelection().removeAllRanges();
        }
        listener(mouseStart);
      });
      d3.select(document).on('mouseup', function() {
        d3.select(document).on('mousemove.colordrag', null);
      });
    });
  }

  /**
   * Return click event handler for the slider.
   * Sets picker background color and calls ctx.callback if provided.
   */
  slideListener() {
    const cp = this;
    const slideElement = cp.slideElement;
    return function() {
      const mouse = mousePosition(slideElement);
      cp.hsv.h = mouse.y / slideElement.offsetHeight * 360;// + cp.hueOffset;
      // Hack to fix indicator bug
      if (cp.hsv.h >= 359) { cp.hsv.h = 359;}
      cp.updateColor();
    };
  }

  /**
   * Return click event handler for the picker.
   * Calls ctx.callback if provided.
   */
  pickerListener() {
    const cp = this;
    const pickerElement = cp.pickerElement;
    return function() {
      const width = pickerElement.offsetWidth;
      const height = pickerElement.offsetHeight;
      const mouse = mousePosition(pickerElement);
      cp.hsv.s = mouse.x / width;
      cp.hsv.v = (height - mouse.y) / height;
      cp.updateColor();
    };
  }

  /**
   * Return click event handler for the alpha.
   * Sets alpha background color and calls ctx.callback if provided.
   */
  alphaListener() {
    const cp = this;
    const alphaElement = cp.alphaElement;
    return function() {
      const mouse = mousePosition(alphaElement);
      const opacity =  mouse.x / alphaElement.offsetWidth;
      cp.opacity = Number(opacity.toFixed(2));
      cp.updateColor();
    };
  }

  /**
   * Return click event handler for the dialog.
   */
  dialogListener() {
    const cp = this;
    const container = cp.container;
    return function(mouseStart) {
      const parentOffset = utils.getOffset(container.offsetParent);
      const offsetX = parentOffset.left;
      const offsetY = parentOffset.top;
      container.style.left = `${d3.event.pageX - offsetX - mouseStart.x}px`;
      container.style.top = `${d3.event.pageY - offsetY - mouseStart.y}px`;
    };
  }


  /**
   * Return click event handler for the original color.
   */
  originalColorListener() {
    const cp = this;
    return function() {
      cp.setColor(cp.originalColorIndicator.style.backgroundColor);
    };
  }

  /**
   * Return click event handler for the done button.
   */
  doneListener() {
    const cp = this;
    return function() {
      cp.onChange = undefined;
      cp.close();
    };
  }

  get visible() {
    return d3.select(this.container).style('visibility') === 'visible';
  }

  set visible(value) {
    value ? this.open() : this.close();
  }

  open(object) {
    if (object) { this.object = object; }
    const box = d3.select(this.container);
    box.style('visibility', 'visible');
    box.transition().duration(200)
      .style('opacity', 1);
    return this;
  }

  close() {
    d3.select(this.container).transition().duration(200)
      .style('opacity', 0)
      .on('end', function() {
        d3.select(this).style('visibility', 'hidden');
      });
    this.onClose && this.onClose();
    this.onClose = undefined;
    return this;
  }

}

/**
 * Create SVG element.
 */
function $el(el, attrs, children) {
  el = document.createElementNS('http://www.w3.org/2000/svg', el);
  for (const key in attrs) el.setAttribute(key, attrs[key]);
  if (Object.prototype.toString.call(children) !== '[object Array]') children = [children];
  const len = (children[0] && children.length) || 0;
  for (let i = 0; i < len; i++) el.appendChild(children[i]);
  return el;
}

/**
 * Return mouse position relative to the element el.
 */
function mousePosition(element) {
  const width = element.offsetWidth;
  const height = element.offsetHeight;

  const pos = d3.mouse(element);
  const mouse = {x: pos[0], y: pos[1]};
  if (mouse.x > width) {
    mouse.x = width;
  } else if (mouse.x < 0) {
    mouse.x = 0;
  }
  if (mouse.y > height) {
    mouse.y = height;
  } else if (mouse.y < 0) {
    mouse.y = 0;
  }
  return mouse;
}

export default ColorPicker;


