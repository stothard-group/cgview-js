
// ColorPicker
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class ColorPicker {


    /**
     * The ColorPicker
     * Based on Flexi Color Picker: http://www.daviddurman.com/flexi-color-picker/
     */
    constructor(containerId, options = {}) {
      this.containerId = containerId;
      this.container = d3.select('#' + containerId).node();
      this._width = CGV.defaultFor(options.width, 100);
      this._height = CGV.defaultFor(options.height, 100);
      this.color = new CGV.Color( CGV.defaultFor(options.colorString, 'rgba(255,0,0,1)') );
      this.onChange = options.onChange;

      this.container.innerHTML = this._colorpickerHTMLSnippet();
      this.slideElement = this.container.getElementsByClassName('cp-color-slider')[0];
      this.pickerElement = this.container.getElementsByClassName('cp-color-picker')[0];
      this.alphaElement = this.container.getElementsByClassName('cp-alpha-slider')[0];
      this.slideIndicator = this.container.getElementsByClassName('cp-color-slider-indicator')[0];
      this.pickerIndicator = this.container.getElementsByClassName('cp-color-picker-indicator')[0];
      this.alphaIndicator = this.container.getElementsByClassName('cp-alpha-slider-indicator')[0];
      this._configureView();

      // Prevent the indicators from getting in the way of mouse events
      this.slideIndicator.style.pointerEvents = 'none';
      this.pickerIndicator.style.pointerEvents = 'none';
      this.alphaIndicator.style.pointerEvents = 'none';

      d3.select(this.slideElement).on('mousedown.click', this.slideListener());
      d3.select(this.pickerElement).on('mousedown.click', this.pickerListener());
      d3.select(this.alphaElement).on('mousedown.click', this.alphaListener());

      this.enableDragging(this, this.slideElement, this.slideListener());
      this.enableDragging(this, this.pickerElement, this.pickerListener());
      this.enableDragging(this, this.alphaElement, this.alphaListener());
    }

    updateIndicators() {
      var hsv = this.color.hsv;
      var slideY = hsv.h * this.slideElement.offsetHeight / 360;
      var pickerHeight = this.pickerElement.offsetHeight;
      var pickerX = hsv.s * this.pickerElement.offsetWidth;
      var pickerY = pickerHeight - (hsv.v * pickerHeight);
      var alphaX = this.alphaElement.offsetWidth * this.color.opacity;

      var pickerIndicator = this.pickerIndicator;
      var slideIndicator = this.slideIndicator;
      var alphaIndicator = this.alphaIndicator;
      slideIndicator.style.top = (slideY - slideIndicator.offsetHeight/2) + 'px';
      pickerIndicator.style.top = (pickerY - pickerIndicator.offsetHeight/2) + 'px';
      pickerIndicator.style.left = (pickerX - pickerIndicator.offsetWidth/2) + 'px';
      alphaIndicator.style.left = (alphaX - alphaIndicator.offsetWidth/2) + 'px';
    }

    _colorpickerHTMLSnippet() {
      return [
        '<div class="cp-color-picker-wrapper">',
              '<div class="cp-color-picker"></div>',
              '<div class="cp-color-picker-indicator"></div>',
        '</div>',
        '<div class="cp-color-slider-wrapper">',
              '<div class="cp-color-slider"></div>',
              '<div class="cp-color-slider-indicator"></div>',
        '</div>',
        '<div class="cp-alpha-slider-wrapper">',
              '<div class="cp-alpha-slider"></div>',
              '<div class="cp-alpha-slider-indicator"></div>',
        '</div>'
      ].join('');
    }

    /**
     * Create slide, picker, and alpha markup
     * The container ID is used to make unique ids for the SVG defs
     */
    _configureView() {
      var slide, picker, alpha;
      var containerId = this.containerId;
      slide = $el('svg', { xmlns: 'http://www.w3.org/2000/svg', version: '1.1', width: '100%', height: '100%' },
                [
                  $el('defs', {},
                    $el('linearGradient', { id: containerId + '-gradient-hsv', x1: '0%', y1: '100%', x2: '0%', y2: '0%'},
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
                  $el('rect', { x: '0', y: '0', width: '100%', height: '100%', fill: 'url(#' + containerId + '-gradient-hsv)'})
                ]
               );

      picker = $el('svg', { xmlns: 'http://www.w3.org/2000/svg', version: '1.1', width: '100%', height: '100%' },
                 [
                   $el('defs', {},
                     [
                       $el('linearGradient', { id: containerId + '-gradient-black', x1: '0%', y1: '100%', x2: '0%', y2: '0%'},
                         [
                           $el('stop', { offset: '0%', 'stop-color': '#000000', 'stop-opacity': '1' }),
                           $el('stop', { offset: '100%', 'stop-color': '#CC9A81', 'stop-opacity': '0' })
                         ]
                        ),
                       $el('linearGradient', { id: containerId + '-gradient-white', x1: '0%', y1: '100%', x2: '100%', y2: '100%'},
                         [
                           $el('stop', { offset: '0%', 'stop-color': '#FFFFFF', 'stop-opacity': '1' }),
                           $el('stop', { offset: '100%', 'stop-color': '#CC9A81', 'stop-opacity': '0' })
                         ]
                        )
                     ]
                    ),
                   $el('rect', { x: '0', y: '0', width: '100%', height: '100%', fill: 'url(#' + containerId + '-gradient-white)'}),
                   $el('rect', { x: '0', y: '0', width: '100%', height: '100%', fill: 'url(#' + containerId + '-gradient-black)'})
                 ]
                );

      alpha = $el('svg', { xmlns: 'http://www.w3.org/2000/svg', version: '1.1', width: '100%', height: '100%' },
                [
                  $el('defs', {}, 
                    [
                      $el('linearGradient', { id: containerId + '-alpha-gradient' },
                        [
                          $el('stop', { offset: '0%', 'stop-color': '#FFFFFF', 'stop-opacity': '0' }),
                          $el('stop', { offset: '100%', 'stop-color': '#FFFFFF', 'stop-opacity': '1' })
                        ]
                       ),
                      $el('pattern', { id: containerId + '-alpha-squares', x: '0', y: '0', width: '10', height: '10', patternUnits: 'userSpaceOnUse' },
                        [
                          $el('rect', { x: '0', y: '0', width: '10', height: '10', fill: 'white'}),
                          $el('rect', { x: '0', y: '0', width: '5', height: '5', fill: 'lightgray'}),
                          $el('rect', { x: '5', y: '5', width: '5', height: '5', fill: 'lightgray'})
                        ]
                      )
                    ]
                  ),
                  $el('rect', { x: '0', y: '0', width: '100%', height: '100%', fill: 'url(#' + containerId + '-alpha-squares)'}),
                  $el('rect', { x: '0', y: '0', width: '100%', height: '100%', fill: 'url(#' + containerId + '-alpha-gradient)'})
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
        d3.select(document).on('mousemove.colordrag', function() {
          if (document.selection) {
            document.selection.empty()
          } else {
            window.getSelection().removeAllRanges()
          }
          // d3.event.preventDefault();
          listener();
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
      var cp = this;
      var slideElement = cp.slideElement;
      var pickerElement = cp.pickerElement;
      var alphaElement = cp.alphaElement;

      return function() {
        var mouse = mousePosition(slideElement);
        var hsv = cp.color.hsv;
        hsv.h = mouse.y / slideElement.offsetHeight * 360// + cp.hueOffset;
        // Hack to fix indicator bug
        if (hsv.h >= 359) { hsv.h = 359}
        cp.color.hsv = hsv;
        pickerElement.style.backgroundColor = cp.color.rgbString;
        d3.select(alphaElement).selectAll('stop').attr('stop-color', cp.color.rgbString);
        cp.updateIndicators();
        cp.onChange && cp.onChange(cp.color);
      }
    };

    /**
     * Return click event handler for the picker.
     * Calls ctx.callback if provided.
     */
    pickerListener() {
      var cp = this;
      var pickerElement = cp.pickerElement;
      var alphaElement = cp.alphaElement;
      return function() {
        var width = pickerElement.offsetWidth;
        var height = pickerElement.offsetHeight;
        var mouse = mousePosition(pickerElement);
        var hsv = cp.color.hsv;
        hsv.s = mouse.x / width;
        hsv.v = (height - mouse.y) / height;
        cp.color.hsv = hsv
        cp.updateIndicators();
        d3.select(alphaElement).selectAll('stop').attr('stop-color', cp.color.rgbString);
        cp.onChange && cp.onChange(cp.color);
      }
    }

    /**
     * Return click event handler for the alpha.
     * Sets alpha background color and calls ctx.callback if provided.
     */  
    alphaListener() {
      var cp = this;
      var alphaElement = cp.alphaElement;
      return function() {
        var mouse = mousePosition(alphaElement);
        var opacity = mouse.x / alphaElement.offsetWidth;
        cp.color.opacity = opacity;
        cp.updateIndicators();
        cp.onChange && cp.onChange(cp.color);
      }
    };


  }

  /**
   * Create SVG element.
   */
  function $el(el, attrs, children) {
    el = document.createElementNS('http://www.w3.org/2000/svg', el);
    for (var key in attrs)
      el.setAttribute(key, attrs[key]);
    if (Object.prototype.toString.call(children) != '[object Array]') children = [children];
    var i = 0, len = (children[0] && children.length) || 0;
    for (; i < len; i++)
      el.appendChild(children[i]);
    return el;
  }

  /**
   * Return mouse position relative to the element el.
   */
  function mousePosition(element) {
    var width = element.offsetWidth;
    var height = element.offsetHeight;

    var pos = d3.mouse(element);
    var mouse = {x: pos[0], y: pos[1]}
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
    return mouse
  }

  CGV.ColorPicker = ColorPicker;

})(CGView);
