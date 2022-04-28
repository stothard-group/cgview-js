//////////////////////////////////////////////////////////////////////////////
// IO
//////////////////////////////////////////////////////////////////////////////

// FIXME: Check at the end: A low performance polyfill based on toDataURL.

import { version as currentVersion } from '../package.json';
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
   * @param {Viewer} viewer - Viewer
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
   * @private
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

  /**
   * Format the date from created and updated JSON attributes.
   * @param {Date} d - Date to format
   * @private
   */
  formatDate(d) {
    // return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`
    const timeformat = d3.timeFormat('%Y-%m-%d %H:%M:%S');
    return timeformat(d);
  }

  /**
   * Return the CGView map as a JSON object. The JSON can later be loaded using [loadJSON](#loadJSON).
   * See the [JSON page](../json.html) for details on the JSON structure.
   */
  toJSON(options = {}) {
    const v = this.viewer;
    const jsonInfo = v._jsonInfo || {};

    const json = {
      cgview: {
        version: currentVersion,
        created: jsonInfo.created || this.formatDate(new Date()),
        updated: this.formatDate(new Date()),
        id: v.id,
        name: v.name,
        format: v.format,
        // geneticCode: v.geneticCode,
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
    try {
      this._loadJSON(json);
    } catch (error) {
      const msg = `Loading Error: ${error}`
      console.log(msg);
      const canvas = this.viewer.canvas;
      canvas.clear('debug');
      const ctx = canvas.context('debug');
      ctx.fillText(msg, 5, 15);
    }
  }

  _loadJSON(json) {

    let data = json;
    if (typeof json === 'string') {
      data = JSON.parse(json);
    }

    data = this.updateJSON(data);

    data = data && data.cgview;

    if (!data) {
      throw new Error("No 'cgview' property found in JSON.");
    }

    const viewer = this._viewer;
    viewer.clear('all');

    // Reset objects
    viewer._objects = {};

    viewer.trigger('cgv-json-load', data); // would 'io-load' be a better name?
    // In events this should mention how everything is reset (e.g. tracks, features, etc)

    // Viewer attributes
    viewer.update({
      id: data.id,
      name: data.name,
      // geneticCode: data.geneticCode,
    });

    viewer._jsonInfo = {
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
    viewer._settings = new Settings(viewer, data.settings);
    // Ruler
    viewer._ruler = new Ruler(viewer, data.ruler);
    // Backbone
    viewer._backbone = new Backbone(viewer, data.backbone);
    // Annotation
    viewer._annotation = new Annotation(viewer, data.annotation);
    // Slot Dividers
    // viewer.slotDivider = new Divider(viewer, settings.dividers.slot);
    viewer._dividers = new Dividers(viewer, data.dividers);
    // Highlighter
    viewer._highlighter = new Highlighter(viewer, data.highlighter);

    // Load Bookmarks
    if (data.bookmarks) {
      viewer.addBookmarks(data.bookmarks);
    }

    // Load Captions
    if (data.captions) {
      viewer.addCaptions(data.captions);
    }

    // Load Legend
    viewer._legend = new Legend(viewer, data.legend);

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
   * Update old CGView JSON formats to the current version.
   * The map data must be contained within a top level "cgview" property.
   * @param {Object} data - Object Literal
   */
  updateJSON(data) {
    data = data && data.cgview;

    if (!data) {
      throw new Error("No 'cgview' property found in JSON.");
    }

    const version = data.version;
    console.log(`Loading map JSON version: '${version}'`);

    let major, minor;
    const result = version.match(/^(\d+)\.(\d+)/)
    if (result) {
      major = Number(result[1]);
      minor = Number(result[2]);
    } else {
      throw new Error(`Can not read cgview version '${version}'`);
    }
    // console.log('major', major)
    // console.log('minor', minor)

    switch (true) {
      case (version === '0.1'):
        data = this._updateVersion_0_1(data)
        break;
      case (version === '0.2'):
        data = this._updateVersion_0_2(data)
        break;
      case (version === '1.0.0'):
        data = this._updateVersion_1_0(data);
        break;
      case (major === 1):
        console.log('No need to convert.')
        break;
      default:
        throw new Error(`Unknown cgview version '${version}'`);
    }
    return {cgview: data};
  }

  // This version is all over the place so concentrate on tracks
  // Version 0.2 started on 2018-08-22
  _updateVersion_0_2(data) {
    // Tracks
    const tracks = data.layout && data.layout.tracks || data.tracks;
    for (const track of tracks) {
      if (track.readingFrame === 'separated') {
        track.separateFeaturesBy = 'readingFrame';
      } else if (track.strand === 'separated') {
        track.separateFeaturesBy = 'strand';
      } else {
        track.separateFeaturesBy = 'none';
      }
      track.dataType = track.contents && track.contents.type || track.dataType;
      track.dataMethod = track.contents && track.contents.from || track.dataMethod;
      track.dataKeys = track.contents && track.contents.extract || track.dataKeys;
    }
    data.tracks = tracks;
    // Version
    data.version = '1.1.0';
    console.log(`Update JSON to version '${data.version}'`);
    return data;
  }

  _updateVersion_0_1(data) {
    const positionMap = {
      'lower-left': 'bottom-left',
      'lower-center': 'bottom-center',
      'lower-right': 'bottom-right',
      'upper-left': 'top-left',
      'upper-center': 'top-center',
      'upper-right': 'top-right',
    }
    // Captions
    const captions = data.captions;
    if (captions) {
      for (const caption of captions) {
        caption.position = positionMap[caption.position] || caption.position;
        caption.font = caption.items[0].font || caption.font;
        caption.fontColor = caption.items[0].fontColor || caption.fontColor;
        caption.name = caption.items.map(i => i.name).join('\n');
      }
    }
    // Legend
    const legend = data.legend;
    legend.position = positionMap[legend.position] || legend.position;
    legend.defaultFont = legend.font;
    // Tracks
    const tracks = data.layout.tracks || [];
    for (const track of tracks) {
      if (track.readingFrame === 'separated') {
        track.separateFeaturesBy = 'readingFrame';
      } else if (track.strand === 'separated') {
        track.separateFeaturesBy = 'strand';
      } else {
        track.separateFeaturesBy = 'none';
      }
      track.dataType = track.contents.type;
      track.dataMethod = track.contents.from;
      track.dataKeys = track.contents.extract;
    }
    data.tracks = tracks;
    // From Settings
    data.annotaion = data.settings.annotaion;
    data.backbone = data.settings.backbone;
    data.dividers = data.settings.dividers;
    data.ruler = data.settings.ruler;
    data.settings = data.settings.general;
    // Plots aren't saved properly on CGView Server so we can ignore
    // Version
    data.version = '1.1.0';
    console.log(`Update JSON to version '${data.version}'`);
    return data;
  }

  _updateVersion_1_0(data) {
    // Contigs are the only chagne for this version
    const contigs = data.sequence && data.sequence.contigs;
    if (contigs) {
      for (const contig of contigs) {
        contig.name = contig.id;
      }
    }
    // Version
    data.version = '1.1.0';
    console.log(`Update JSON to version '${data.version}'`);
    return data;
  }

  /**
   * Download the currently visible map as a PNG image.
   * @param {Number} width - Width of image
   * @param {Number} height - Height of image
   * @param {String} filename - Name to save image file as
   */
  downloadImage(width, height, filename = 'image.png') {
    this.downloadSVG(width, height, filename);
    return;
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

  /**
   * Download the currently visible map as a SVG image.
   * TESTING FOR NOW!
   * If this works, merge/extract common code in downloadImage
   * Requires svgcanvas to be available.
   * @param {Number} width - Width of image
   * @param {Number} height - Height of image
   * @param {String} filename - Name to save image file as
   */
  downloadSVG(width, height, filename = 'image.png') {
    if (!svgcanvas) {
      console.log('SVG Canvas not available. Please see...')
      return;
    }
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
   tempLayers.map.ctx = new svgcanvas.Context(width, height); 

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
    // tempLayers.export.node.toBlob( (blob) => { this.download(blob, filename, 'image/png');} );
    // console.log(tempLayers.map.ctx.getSerializedSvg(true));
    const svg = tempLayers.map.ctx.getSerializedSvg();
    console.log('SVG-1')
    console.log(svg)
    this.download(svg, 'TEST.svg', 'text/plain');
    // this.download('svg', 'TEST.svg', 'text/plain');
    console.log('SVG-2')


    // Restore original layers and settings
    canvas._layers = origLayers;
    viewer.debug = debug;

    // Delete temp canvas layers
    for (const name of layerNames) {
      d3.select(tempLayers[name].node).remove();
    }
  }

  /**
   * Download the map sequence in FASTA format.
   * @param {String} fastaId - ID line for FASTA (i.e. text after '>')
   * @param {String} filename - Name for saved file
   * @param {Object} options - Options for FASTA (see [Sequence.asFasta](Sequence.html#asFasta))
   */
  downloadFasta(fastaId, filename = 'sequence.fa', options = {}) {
    const fasta = this.viewer.sequence.asFasta(fastaId, options);
    this.download(fasta, filename, 'text/plain');
  }

  /**
   * Download the map as a JSON object
   * @param {String} filename - Name for saved file
   * @param {Object} options - Options passed to toJSON
   */
  downloadJSON(filename = 'cgview.json', options = {}) {
    const json = this.viewer.io.toJSON(options);
    this.download(JSON.stringify(json), filename, 'text/json');
  }

  // https://stackoverflow.com/questions/13405129/javascript-create-and-save-file
  /**
   * Download data to a file
   * @param {Object} data - Data to download
   * @param {String} filename - Name for saved file
   * @param {String} type - Mime type for the file
   * @private
   */
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
   * TODO: Check if this works still
   * @private
   */
  initializeDragAndDrop() {
    const viewer = this.viewer;
    const canvas = viewer.canvas;
    d3.select(canvas.node('ui')).on('dragleave.dragndrop', (d3Event) => {
      d3Event.preventDefault();
      d3Event.stopPropagation();
      viewer.drawFull();
    });

    d3.select(canvas.node('ui')).on('dragover.dragndrop', (d3Event) => {
      d3Event.preventDefault();
      d3Event.stopPropagation();
    });

    d3.select(canvas.node('ui')).on('drop.dragndrop', (d3Event) => {
      d3Event.preventDefault();
      d3Event.stopPropagation();
      viewer.drawFull();
      const file = d3Event.dataTransfer.files[0];
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

