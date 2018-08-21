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

    formatDate(d) {
      // return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`
      let timeformat = d3.timeFormat("%Y-%m-%d %H:%M:%S");
      return timeformat(d)
    }

    toJSON() {
      let v = this.viewer;
      let jsonInfo = v._jsonInfo || {};

      let json = {
        cgview: {
          version: CGV.version,
          created: jsonInfo.created || this.formatDate(new Date()),
          updated: this.formatDate(new Date()),
          id: v.id,
          name: v.name,
          settings: {
            general: v.settings.toJSON(),
            backbone: v.backbone.toJSON(),
            ruler: v.ruler.toJSON(),
            annotation: v.annotation.toJSON(),
            dividers: {
              slot: v.slotDivider.toJSON()
            },
            highlighter: v.highlighter.toJSON()
          },
          captions: [],
          legend: v.legend.toJSON(),
          sequence: v.sequence.toJSON(),
          features: [],
          plots: [],
          layout: v.layout.toJSON()
        }
      }
      v.captions().each( (i, caption) => {
        json.cgview.captions.push(caption.toJSON());
      });
      v.features().each( (i, feature) => {
        // Only export features that were not extracted from the sequence.
        if (!feature.extractedFromSequence ||
            feature.tracks().filter( (t) => { return t.contents.from !== 'sequence' }).length > 0) {
          json.cgview.features.push(feature.toJSON());
        }
      });
      return json
    }

    /**
     * Load data from object literal or JSON string ([Format details](json_format.html).
     * Removes any previous viewer data and overrides options that are already set.
     * @param {Object} data - JSON string or Object Literal
     */
    loadJSON(data) {
      let viewer = this._viewer;

      if (typeof data === 'string') {
        data = JSON.parse(data);
      }

      viewer._id = data.id;
      viewer.name = data.name;

      // data Info
      viewer._dataInfo = {
        version: data.version,
        created: data.created
      }

      // Reset arrays
      viewer._features = new CGV.CGArray();
      viewer._plots = new CGV.CGArray();
      viewer._captions = new CGV.CGArray();

      // Load Sequence
      viewer._sequence = new CGV.Sequence(viewer, data.sequence);
      // Load Settings
      let settings = data.settings || {};
      // General Settings
      viewer.settings = new CGV.Settings(viewer, settings.general);
      // Ruler
      viewer.ruler = new CGV.Ruler(viewer, settings.ruler);
      // Backbone
      viewer.backbone = new CGV.Backbone(viewer, settings.backbone);
      // Annotation
      viewer.annotation = new CGV.Annotation(viewer, settings.annotation);
      // Slot Dividers
      viewer.slotDivider = new CGV.Divider(viewer, settings.dividers.slot);
      // Highlighter
      viewer.highlighter = new CGV.Highlighter(viewer, settings.highlighter);

      // Load Captions
      if (data.captions) {
        data.captions.forEach((captionData) => {
          new CGV.Caption(viewer, captionData);
        });
      }

      // Load Legend
      viewer.legend = new CGV.Legend(viewer, data.legend);

      // Create features
      if (data.features) {
        data.features.forEach((featureData) => {
          new CGV.Feature(viewer, featureData);
        });
      }

      if (data.plots) {
        data.plots.forEach((plotData) => {
          new CGV.Plot(viewer, plotData);
        });
      }

      // Load Layout
      viewer.layout = new CGV.Layout(viewer, data.layout);
    }

    // downloadImage(size, filename = 'image.png') {
    downloadImage(width, height, filename = 'image.png') {
      let viewer = this._viewer;
      let canvas = viewer.canvas;
      // width = size || viewer.width;
      // height = size || viewer.height;
      width = width || viewer.width;
      height = height || viewer.height;

      let windowTitle = 'CGV-Image-' + width + 'x' + height;

      // Adjust size based on pixel Ratio
      width = width / CGV.pixelRatio;
      height = height / CGV.pixelRatio;

      // Save current settings
      // let origContext = canvas.ctx;
      let origLayers = canvas._layers;
      let debug = viewer.debug;
      viewer.debug = false;

      // Create new layers and add export layer
      let layerNames = canvas.layerNames.concat(['export']);
      let tempLayers = canvas.createLayers(d3.select('body'), layerNames, width, height);

      // Calculate scaling factor
      let minNewDimension = d3.min([width, height]);
      let scaleFactor = minNewDimension / viewer.minDimension;

      // Scale context of layers, excluding the 'export' layer
      for (let name of canvas.layerNames) {
        tempLayers[name].ctx.scale(scaleFactor, scaleFactor);
      }
      canvas._layers = tempLayers;

      // Draw map on to new layers
      viewer.drawExport();
      viewer.fillBackground();
      // Legend
      viewer.legend.draw();
      // Captions
      for (let i = 0, len = viewer._captions.length; i < len; i++) {
        viewer._captions[i].draw();
      }

      // Copy drawing layers to export layer
      let exportContext = tempLayers['export'].ctx;
      exportContext.drawImage(tempLayers['background'].node, 0, 0);
      exportContext.drawImage(tempLayers['map'].node, 0, 0);
      exportContext.drawImage(tempLayers['captions'].node, 0, 0);

      // Generate image from export layer
      // let image = tempLayers['export'].node.toDataURL();
      let image = tempLayers['export'].node.toBlob( (blob) => { this.download(blob, filename, 'image/png')} );

      // Restore original layers and settings
      canvas._layers = origLayers
      viewer.debug = debug;

      // Delete temp canvas layers
      for (let name of layerNames) {
        d3.select(tempLayers[name].node).remove();
      }
    }

    downloadFasta(fastaId, filename = 'sequence.fa') {
      let fasta = this.viewer.sequence.asFasta(fastaId);
      this.download(fasta, filename, 'text/plain');
    }

    downloadJSON(filename = 'cgview.json') {
      let json = this.viewer.io.toJSON();
      this.download(JSON.stringify(json), filename, 'text/json');
    }

    // https://stackoverflow.com/questions/13405129/javascript-create-and-save-file
		download(data, filename, type='text/plain') {
		  let file = new Blob([data], {type: type});
			if (window.navigator.msSaveOrOpenBlob) // IE10+
				window.navigator.msSaveOrOpenBlob(file, filename);
			else { // Others
				let a = document.createElement("a");
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

    /**
     * Initialize Viewer Drag-n-Drop.
     */
    initializeDragAndDrop() {
      let viewer = this.viewer;
      let canvas = viewer.canvas
      d3.select(canvas.node('ui')).on('dragleave.dragndrop', () => {
        d3.event.preventDefault();
        d3.event.stopPropagation();
        viewer.drawFull();
      });

      d3.select(canvas.node('ui')).on('dragover.dragndrop', () => {
        d3.event.preventDefault();
        d3.event.stopPropagation();
        // sv.draw();
        // sv.flash('Drop Bayesil JSON File...');
      });

      d3.select(canvas.node('ui')).on('drop.dragndrop', () => {
        d3.event.preventDefault();
        d3.event.stopPropagation();
        // sv.draw();
        viewer.drawFull();
        let file = d3.event.dataTransfer.files[0];
        // console.log(file.type)
        // sv.flash('Loading "' + file.name + '"...');
        let reader = new FileReader();
        // sv.json_file = file;
        reader.onload = function() {
          let jsonObj = reader.result;
          try {
            let jsonParsed = JSON.parse(jsonObj);
            // sv.trigger('drop');
            viewer.io.loadJSON(jsonParsed.cgview)
            viewer.drawFull();
          } catch (e) {
            // sv.draw();
            // sv.flash('Could not read file: ' + e.message);
          }
        }
        reader.readAsText(file);
      });
    }

  }

  // A low performance polyfill based on toDataURL.
  if (!HTMLCanvasElement.prototype.toBlob) {
    Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
      value: function (callback, type, quality) {

        let binStr = atob( this.toDataURL(type, quality).split(',')[1] ),
          len = binStr.length,
          arr = new Uint8Array(len);

        for (let i = 0; i < len; i++ ) {
          arr[i] = binStr.charCodeAt(i);
        }

        callback( new Blob( [arr], {type: type || 'image/png'} ) );
      }
    });
  }

  CGV.IO = IO;

})(CGView);


