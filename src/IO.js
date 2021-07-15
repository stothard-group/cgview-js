//////////////////////////////////////////////////////////////////////////////
// IO
//////////////////////////////////////////////////////////////////////////////

// FIXME: Check at the end: A low performance polyfill based on toDataURL.

import { version } from '../package.json';
import CGArray from './CGArray';
import Sequence from './Sequence';
import Settings from './Settings';
import Ruler from './Ruler';
import Backbone from './Backbone';
import Annotation from './Annotation';
import Dividers from './Dividers';
import { Highlighter } from './Highlighter';
import Legend from './Legend';
import utils from './Utils';
import * as d3 from 'd3';

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
    return this._viewer;
  }

  /**
   * @member {Number} - Get or set the ability to drag-n-drop JSON files on to viewer
   */
  get allowDragAndDrop() {
    return this._allowDragAndDrop;
  }

  set allowDragAndDrop(value) {
    this._allowDragAndDrop = value;
    if (value) {
      this.io.initializeDragAndDrop();
    } else {
      // console.log('COMONE')
      // d3.select(this.canvas.node('ui')).on('.dragndrop', null);
    }
  }

  formatDate(d) {
    // return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`
    const timeformat = d3.timeFormat('%Y-%m-%d %H:%M:%S');
    return timeformat(d);
  }

  toJSON(options = {}) {
    const v = this.viewer;
    const jsonInfo = v._jsonInfo || {};

    const json = {
      cgview: {
        version,
        created: jsonInfo.created || this.formatDate(new Date()),
        updated: this.formatDate(new Date()),
        id: v.id,
        name: v.name,
        geneticCode: v.geneticCode,
        settings: v.settings.toJSON(options),
        backbone: v.backbone.toJSON(options),
        ruler: v.ruler.toJSON(options),
        annotation: v.annotation.toJSON(options),
        dividers: v.dividers.toJSON(options),
        highlighter: v.highlighter.toJSON(options),
        captions: [],
        legend: v.legend.toJSON(options),
        sequence: v.sequence.toJSON(options),
        features: [],
        plots: [],
        bookmarks: [],
        tracks: []
      }
    };
    v.captions().each( (i, caption) => {
      json.cgview.captions.push(caption.toJSON(options));
    });
    v.features().each( (i, feature) => {
      // Only export features that were not extracted from the sequence.
      if (!feature.extractedFromSequence ||
          feature.tracks().filter( t => t.dataMethod !== 'sequence' ).length > 0) {
        json.cgview.features.push(feature.toJSON(options));
      }
    });
    v.plots().each( (i, plot) => {
      // Only export plots that were not extracted from the sequence.
      if (!plot.extractedFromSequence ||
          plot.tracks().filter( t => t.dataMethod !== 'sequence' ).length > 0) {
        json.cgview.plots.push(plot.toJSON(options));
      }
    });
    v.bookmarks().each( (i, bookmark) => {
      json.cgview.bookmarks.push(bookmark.toJSON(options));
    });
    v.tracks().each( (i, track) => {
      json.cgview.tracks.push(track.toJSON(options));
    });
    return json;
  }

  /**
   * Load data from object literal or JSON string ([Format details](../json.html)).
   * The map data must be contained within a top level "cgview" property.
   * Removes any previous viewer data and overrides options that are already set.
   * @param {Object} data - JSON string or Object Literal
   */
  loadJSON(json) {

    let data = json;
    if (typeof json === 'string') {
      data = JSON.parse(json);
    }

    data = data && data.cgview;

    if (!data) {
      throw new Error("No 'cgview' property found in JSON.");
    }

    const viewer = this._viewer;
    viewer.clear('all');

    // Reset objects
    viewer._objects = {};

    viewer.trigger('cgv-json-load', data);
    // In events this should mention how everything is reset (e.g. tracks, features, etc)

    // Viewer attributes
    viewer.update({
      id: data.id,
      name: data.name,
      geneticCode: data.geneticCode,
    });

    // data Info
    viewer._dataInfo = {
      version: data.version,
      created: data.created
    };

    // Reset arrays
    viewer._features = new CGArray();
    viewer._tracks = new CGArray();
    viewer._plots = new CGArray();
    viewer._captions = new CGArray();
    viewer._bookmarks = new CGArray();

    viewer._loading = true;

    // Load Sequence
    viewer._sequence = new Sequence(viewer, data.sequence);
    // Load Settings
    // const settings = data.settings || {};
    // General Settings
    viewer.settings = new Settings(viewer, data.settings);
    // Ruler
    viewer.ruler = new Ruler(viewer, data.ruler);
    // Backbone
    viewer.backbone = new Backbone(viewer, data.backbone);
    // Annotation
    viewer.annotation = new Annotation(viewer, data.annotation);
    // Slot Dividers
    // viewer.slotDivider = new Divider(viewer, settings.dividers.slot);
    viewer.dividers = new Dividers(viewer, data.dividers);
    // Highlighter
    viewer.highlighter = new Highlighter(viewer, data.highlighter);

    // Load Bookmarks
    if (data.bookmarks) {
      viewer.addBookmarks(data.bookmarks);
    }

    // Load Captions
    if (data.captions) {
      viewer.addCaptions(data.captions);
    }

    // Load Legend
    viewer.legend = new Legend(viewer, data.legend);

    // Create features
    if (data.features) {
      viewer.addFeatures(data.features);
    }

    // Create plots
    if (data.plots) {
      viewer.addPlots(data.plots);
      // data.plots.forEach((plotData) => {
      //   new Plot(viewer, plotData);
      // });
    }

    // Create tracks
    if (data.tracks) {
      viewer.addTracks(data.tracks);
    }
    viewer._loading = false;
    viewer.update({dataHasChanged: false});

    // Load Layout
    // viewer._layout = new Layout(viewer, data.layout);
    viewer.format = utils.defaultFor(data.format, 'circular');
    viewer.zoomTo(0, 1, {duration: 0});
  }

  /**
   * Download the currently visible map as a PNG image.
   * @param {Number} width - Width of image
   * @param {Number} height - Height of image
   * @param {String} filename - Name to save image file as
   */
  downloadImage(width, height, filename = 'image.png') {
    const viewer = this._viewer;
    const canvas = viewer.canvas;
    width = width || viewer.width;
    height = height || viewer.height;

    // Save current settings
    // let origContext = canvas.ctx;
    const origLayers = canvas._layers;
    const debug = viewer.debug;
    viewer.debug = false;

    // Create new layers and add export layer
    const layerNames = canvas.layerNames.concat(['export']);
    const tempLayers = canvas.createLayers(d3.select('body'), layerNames, width, height, false);

    // Calculate scaling factor
    const minNewDimension = d3.min([width, height]);
    const scaleFactor = minNewDimension / viewer.minDimension;

    // Scale context of layers, excluding the 'export' layer
    for (const name of canvas.layerNames) {
      tempLayers[name].ctx.scale(scaleFactor, scaleFactor);
    }
    canvas._layers = tempLayers;

   // tempLayers.map.ctx = new C2S(1000, 1000); 

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
    const exportContext = tempLayers.export.ctx;
    exportContext.drawImage(tempLayers.background.node, 0, 0);
    exportContext.drawImage(tempLayers.map.node, 0, 0);
    exportContext.drawImage(tempLayers.foreground.node, 0, 0);
    exportContext.drawImage(tempLayers.canvas.node, 0, 0);

    // Generate image from export layer
    // let image = tempLayers['export'].node.toDataURL();
    tempLayers.export.node.toBlob( (blob) => { this.download(blob, filename, 'image/png');} );
    // console.log(tempLayers.map.ctx.getSerializedSvg(true));

    // Restore original layers and settings
    canvas._layers = origLayers;
    viewer.debug = debug;

    // Delete temp canvas layers
    for (const name of layerNames) {
      d3.select(tempLayers[name].node).remove();
    }
  }

  downloadFasta(fastaId, filename = 'sequence.fa', options = {}) {
    const fasta = this.viewer.sequence.asFasta(fastaId, options);
    this.download(fasta, filename, 'text/plain');
  }

  downloadJSON(filename = 'cgview.json', options = {}) {
    const json = this.viewer.io.toJSON(options);
    this.download(JSON.stringify(json), filename, 'text/json');
  }

  // https://stackoverflow.com/questions/13405129/javascript-create-and-save-file
  download(data, filename, type = 'text/plain') {
    const file = new Blob([data], {type: type});
    if (window.navigator.msSaveOrOpenBlob) {
      // IE10+
      window.navigator.msSaveOrOpenBlob(file, filename);
    } else {
      // Others
      const a = document.createElement('a');
      const	url = URL.createObjectURL(file);
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
   * @private
   */
  initializeDragAndDrop() {
    const viewer = this.viewer;
    const canvas = viewer.canvas;
    d3.select(canvas.node('ui')).on('dragleave.dragndrop', () => {
      d3.event.preventDefault();
      d3.event.stopPropagation();
      viewer.drawFull();
    });

    d3.select(canvas.node('ui')).on('dragover.dragndrop', () => {
      d3.event.preventDefault();
      d3.event.stopPropagation();
    });

    d3.select(canvas.node('ui')).on('drop.dragndrop', () => {
      d3.event.preventDefault();
      d3.event.stopPropagation();
      viewer.drawFull();
      const file = d3.event.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = function() {
        const jsonObj = reader.result;
        try {
          const jsonParsed = JSON.parse(jsonObj);
          // sv.trigger('drop');
          viewer.io.loadJSON(jsonParsed.cgview);
          viewer.drawFull();
        } catch (e) {
          // sv.draw();
          // sv.flash('Could not read file: ' + e.message);
        }
      };
      reader.readAsText(file);
    });
  }

}

// // A low performance polyfill based on toDataURL.
// if (!HTMLCanvasElement.prototype.toBlob) {
//   Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
//     value: function (callback, type, quality) {
//       const binStr = atob( this.toDataURL(type, quality).split(',')[1] ),
//         len = binStr.length,
//         arr = new Uint8Array(len);
//
//       for (let i = 0; i < len; i++ ) {
//         arr[i] = binStr.charCodeAt(i);
//       }
//
//       callback( new Blob( [arr], {type: type || 'image/png'} ) );
//     }
//   });
// }

export default IO;

