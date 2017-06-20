//////////////////////////////////////////////////////////////////////////////
// IO
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class IO {

    /**
     * Interface for reading and writing data to and from CGView
     * @param {Viewer} viewer - Viewer stuff...
     */
    constructor(viewer) {
      this._viewer = viewer;
    }
    /**
     * @member {Viewer} - Get the viewer.
     */
    get viewer() {
      return this._viewer
    }

    asJSON() {
      return {test: 42}
    }

    /**
     * Load data from NEW JSON format.
     * Removes any previous viewer data and overrides options that are already set.
     * @param {Object} data - TODO
     */
    loadJSON(json) {
      var viewer = this._viewer;
      // Load Sequence
      viewer._sequence = new CGV.Sequence(viewer, json.sequence);
      // Load Settings TODO:
      var settings = json.settings;
      // viewer.annotation.visible = CGV.defaultFor(json.globalLabel, viewer.globalLabel);
      // viewer.annotation.font = CGV.defaultFor(json.labelFont, viewer.labelFont);

      // General Settings
      viewer.settings = new CGV.Settings(viewer, settings.general);
      // Ruler
      viewer.ruler = new CGV.Ruler(viewer, settings.ruler);
      // Backbone
      viewer.backbone = new CGV.Backbone(viewer, settings.backbone);
      // Load Captions
      if (json.captions) {
        json.captions.forEach((captionData) => {
          new CGV.Caption(viewer, captionData);
        });
      }

      // Load Legend
      viewer.legend = new CGV.Legend(viewer, json.legend);

      // Create features
      if (json.features) {
        json.features.forEach((featureData) => {
          new CGV.Feature(viewer, featureData);
        });
      }

      if (json.dividers) {
      }

      if (json.plots) {
        json.plots.forEach((plotData) => {
          console.log('PLOT')
          new CGV.Plot(viewer, plotData);
        });
      }

      // Load Layout
      viewer.layout = new CGV.Layout(viewer, json.layout);

    }

    exportImage(width, height) {
      var viewer = this._viewer;
      var canvas = viewer.canvas;
      width = width || viewer.width;
      height = height || viewer.height;

      var windowTitle = 'CGV-Image-' + width + 'x' + height;

      // Adjust size based on pixel Ratio
      width = width / CGV.pixelRatio;
      height = height / CGV.pixelRatio;

      // Save current settings
      // var origContext = canvas.ctx;
      var origLayers = canvas._layers;
      var debug = viewer.debug;
      viewer.debug = false;

      // Create new layers and add export layer
      var layerNames = canvas.layerNames.concat(['export']);
      var tempLayers = canvas.createLayers(d3.select('body'), layerNames, width, height);

      // Calculate scaling factor
      var minNewDimension = d3.min([width, height]);
      var scaleFactor = minNewDimension / viewer.minDimension;

      // Scale context of layers, excluding the 'export' layer
      for (var name of canvas.layerNames) {
        tempLayers[name].ctx.scale(scaleFactor, scaleFactor);
      }
      canvas._layers = tempLayers;

      // Draw map on to new layers
      viewer.drawExport();
      viewer.fillBackground();
      // Legend
      viewer.legend.draw();
      // Captions
      for (var i = 0, len = viewer._captions.length; i < len; i++) {
        viewer._captions[i].draw();
      }

      // Copy drawing layers to export layer
      var exportContext = tempLayers['export'].ctx;
      exportContext.drawImage(tempLayers['background'].node, 0, 0);
      exportContext.drawImage(tempLayers['map'].node, 0, 0);
      exportContext.drawImage(tempLayers['captions'].node, 0, 0);

      // Generate image from export layer
      // var image = tempLayers['export'].node.toDataURL();
      var image = tempLayers['export'].node.toBlob( (blob) => { this.download(blob, 'image.png', 'image/png')} );

      // Restore original layers and settings
      canvas._layers = origLayers
      viewer.debug = debug;

      // Delete temp canvas layers
      for (var name of layerNames) {
        d3.select(tempLayers[name].node).remove();
      }


      // // Preview
      // var previewWidth = Math.min(400, width);
      // var previewHeight = Math.min(400, height);
      //
      // var win = window.open();
      // var html = [
      //   '<html>',
      //     '<head>',
      //       '<title>',
      //         windowTitle,
      //       '</title>',
      //       '<style>',
      //         'body { font-family: sans-serif; }',
      //       '</style>',
      //     '</head>',
      //     '<body>',
      //       '<h2>Your CGView Image is Below</h2>',
      //       '<p>To save, right click on either image below and choose "Save Image As...". The two images are the same. The first is scaled down for easier previewing, while the second shows the map at actual size. Saving either image will download the full size map.</p>',
      //       '<h3>Preview</h3>',
      //       '<img style="border: 1px solid grey" width="' + previewWidth+ '" height="' + previewHeight +  '" src="' + image +  '"/ >',
      //       '<h3>Actual Size</h3>',
      //       // '<img style="border: 1px solid grey" src="' + image +  '"/ >',
      //       '<img style="border: 1px solid grey" width="' + width+ '" height="' + height +  '" src="' + image +  '"/ >',
      //     '</body>',
      //   '<html>'
      // ].join('');
      // win.document.write(html);
    }

    exportFasta(id) {
      var fasta = this.viewer.sequence.asFasta(id);
      this.download(fasta, 'sequence.fa', 'text/plain');
    }

    exportJSON() {
      var json = this.viewer.io.asJSON();
      this.download(JSON.stringify(json), 'cgview.json', 'text/json');
    }

    // https://stackoverflow.com/questions/13405129/javascript-create-and-save-file
		download(data, filename, type='text/plain') {
		  var file = new Blob([data], {type: type});
			if (window.navigator.msSaveOrOpenBlob) // IE10+
				window.navigator.msSaveOrOpenBlob(file, filename);
			else { // Others
				var a = document.createElement("a");
				var	url = URL.createObjectURL(file);
				a.href = url;
				a.download = filename;
				document.body.appendChild(a);
				a.click();
				setTimeout(function() {
						document.body.removeChild(a);
						window.URL.revokeObjectURL(url);  
				}, 0); 
			}
		}

  }

  // A low performance polyfill based on toDataURL.
  if (!HTMLCanvasElement.prototype.toBlob) {
    Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
      value: function (callback, type, quality) {

        var binStr = atob( this.toDataURL(type, quality).split(',')[1] ),
          len = binStr.length,
          arr = new Uint8Array(len);

        for (var i = 0; i < len; i++ ) {
          arr[i] = binStr.charCodeAt(i);
        }

        callback( new Blob( [arr], {type: type || 'image/png'} ) );
      }
    });
  }

  CGV.IO = IO;

})(CGView);


