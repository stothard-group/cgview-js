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

      // Create featureTypes
      if (json.featureTypes) {
        json.featureTypes.forEach((featureTypeData) => {
          new CGV.FeatureType(viewer, featureTypeData);
        });
      }

      // Create features
      if (json.features) {
        json.features.forEach((featureData) => {
          new CGV.Feature(viewer, featureData);
        });
        viewer.annotation.refresh();
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
      var image = tempLayers['export'].node.toDataURL();

      // Restore original layers and settings
      canvas._layers = origLayers
      viewer.debug = debug;

      // Delete temp canvas layers
      for (var name of layerNames) {
        d3.select(tempLayers[name].node).remove();
      }

      var win = window.open();
      var html = [
        '<html>',
          '<head>',
            '<title>',
              windowTitle,
            '</title>',
          '</head>',
          '<body>',
        // FIXME: The following 3 lines are TEMPORARILY commented out while making preview comparisons
            '<h2>Your CGView Image is Below</h2>',
            '<p>To save, right click on either image below and choose "Save Image As...". The two images are the same. The first is scaled down for easier previewing, while the second shows the map at actual size. Saving either image will download the full size map.</p>',
            '<h3>Preview</h3>',
            '<img style="border: 1px solid grey" width="' + viewer.width + '" height="' + viewer.height +  '" src="' + image +  '"/ >',
            '<h3>Actual Size</h3>',
            '<img style="border: 1px solid grey" src="' + image +  '"/ >',
          '</body>',
        '<html>'
      ].join('');
      win.document.write(html);
    }

  }

  CGV.IO = IO;

})(CGView);


    /**
     * Load data from OLD JSON format (modeled after XML from original CGView).
     * Removes any previous viewer data and overrides options that are already set.
     * @param {Object} data - TODO
     */
    // load_json(json) {
    //   var viewer = this._viewer;
    //
    //   // Determine scale factor between viewer and json map data
    //   var jsonMinDimension = Math.min(json.height, json.width);
    //   var viewerMinDimension = Math.min(viewer.height, viewer.width);
    //   var scaleFacter = jsonMinDimension / viewerMinDimension;
    //
    //   // Override Main Viewer settings
    //   if (json.sequence) {
    //     viewer.sequence.seq = json.sequence.seq;
    //   } else {
    //     viewer.sequence.length = CGV.defaultFor(json.sequenceLength, viewer.sequence.length);
    //   }
    //   viewer.globalLabel = CGV.defaultFor(json.globalLabel, viewer.globalLabel);
    //   viewer.labelFont = CGV.defaultFor(json.labelFont, viewer.labelFont);
    //   viewer.ruler.font = CGV.defaultFor(json.rulerFont, viewer.ruler.font);
    //   viewer.backbone.radius = json.backboneRadius / scaleFacter;
    //   viewer.backbone.color = CGV.defaultFor(json.backboneColor, viewer.backbone.color);
    //   viewer.backbone.thickness = Math.ceil(json.backboneThickness / scaleFacter);
    //   // ...
    //
    //   // Load Tracks
    //   if (json.tracks) {
    //     json.tracks.forEach((slotData) => {
    //       new CGV.Track(viewer, slotData);
    //     });
    //   }
    //
    //   // Load Legends
    //   if (json.legends) {
    //     json.legends.forEach((legendData) => {
    //       new CGV.Legend(viewer, legendData);
    //     });
    //   }
    //
    //   // Associate features and arcplots with LegendItems
    //   var swatchedLegendItems = viewer.swatchedLegendItems();
    //   var itemsLength = swatchedLegendItems.length;
    //   var legendItem;
    //   // Features
    //   var features = viewer.features();
    //   var feature;
    //   for (var i = 0, len = features.length; i < len; i++) {
    //     feature = features[i];
    //     for (var j = 0; j < itemsLength; j++) {
    //       legendItem = swatchedLegendItems[j];
    //       if (feature._color.rgbaString == legendItem.swatchColor.rgbaString) {
    //         feature.legendItem = legendItem;
    //         break
    //       }
    //     }
    //   }
    //   // Plots
    //   var plots = viewer.plots();
    //   var plot;
    //   for (var i = 0, len = plots.length; i < len; i++) {
    //     plot = plots[i];
    //     for (var j = 0; j < itemsLength; j++) {
    //       legendItem = swatchedLegendItems[j];
    //       if (plot._color.rgbaString == legendItem.swatchColor.rgbaString) {
    //         plot.legendItem = legendItem;
    //       }
    //       if (plot._colorPositive && plot._colorPositive.rgbaString == legendItem.swatchColor.rgbaString) {
    //         plot.legendItemPositive = legendItem;
    //       }
    //       if (plot._colorNegative && plot._colorNegative.rgbaString == legendItem.swatchColor.rgbaString) {
    //         plot.legendItemNegative = legendItem;
    //       }
    //     }
    //   }
    // }
