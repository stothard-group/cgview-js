// Static methods for converting XML <-> JSON
// NOTE: xml2json required for conversions
// https://github.com/abdmob/x2js
// Class for reading and writing JSON
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
     * Load data from new JSON format (modeled after XML from original CGView).
     * Removes any previous viewer data and overrides options that are already set.
     * @param {Object} data - TODO
     */
    load_json(json) {
      var viewer = this._viewer;

      // Determine scale factor between viewer and json map data
      var jsonMinDimension = Math.min(json.height, json.width);
      var viewerMinDimension = Math.min(viewer.height, viewer.width);
      var scaleFacter = jsonMinDimension / viewerMinDimension;

      // Override Main Viewer settings
      if (json.sequence) {
        viewer.sequence.seq = json.sequence.seq;
      } else {
        viewer.sequence.length = CGV.defaultFor(json.sequenceLength, viewer.sequence.length);
      }
      viewer.globalLabel = CGV.defaultFor(json.globalLabel, viewer.globalLabel);
      viewer.labelFont = CGV.defaultFor(json.labelFont, viewer.labelFont);
      viewer.ruler.font = CGV.defaultFor(json.rulerFont, viewer.ruler.font);
      viewer.backbone.radius = json.backboneRadius / scaleFacter;
      viewer.backbone.color = CGV.defaultFor(json.backboneColor, viewer.backbone.color);
      viewer.backbone.thickness = Math.ceil(json.backboneThickness / scaleFacter);
      // ...

      // Load FeatureSlots
      if (json.featureSlots) {
        json.featureSlots.forEach((slotData) => {
          new CGV.FeatureSlot(viewer, slotData);
        });
      }

      // Load Legends
      if (json.legends) {
        json.legends.forEach((legendData) => {
          new CGV.Legend(viewer, legendData);
        });
      }

      // Associate features and arcplots with LegendItems
      var swatchedLegendItems = viewer.swatchedLegendItems();
      var itemsLength = swatchedLegendItems.length;
      var legendItem;
      // Features
      var features = viewer.features();
      var feature;
      for (var i = 0, len = features.length; i < len; i++) {
        feature = features[i];
        for (var j = 0; j < itemsLength; j++) {
          legendItem = swatchedLegendItems[j];
          if (feature._color.rgbaString == legendItem.swatchColor.rgbaString) {
            feature.legendItem = legendItem;
            break
          }
        }
      }
      // ArcPlots
      var arcPlots = viewer.arcPlots();
      var arcPlot;
      for (var i = 0, len = arcPlots.length; i < len; i++) {
        arcPlot = arcPlots[i];
        for (var j = 0; j < itemsLength; j++) {
          legendItem = swatchedLegendItems[j];
          if (arcPlot._color.rgbaString == legendItem.swatchColor.rgbaString) {
            arcPlot.legendItem = legendItem;
          }
          if (arcPlot._colorPositive && arcPlot._colorPositive.rgbaString == legendItem.swatchColor.rgbaString) {
            arcPlot.legendItemPositive = legendItem;
          }
          if (arcPlot._colorNegative && arcPlot._colorNegative.rgbaString == legendItem.swatchColor.rgbaString) {
            arcPlot.legendItemNegative = legendItem;
          }
        }
      }
    }

    // Load data from conventionaly CGView XML file.
    load_xml(xml) {
      var json = IO.xml_to_json(xml);
      this.load_json(json);
    }

    static xml_to_json(xml) {
      if (!window.X2JS) {
        console.log("X2JS needs to be installed to read CGView XML: https://github.com/abdmob/x2js");
        return
      }
      var x2js = new X2JS({ attributePrefix: '' });
      // var json = x2js.xml_str2json(xml);
      var json = xmlToJson(xml);
      // var cgview = json.cgview
      // cgview.featureSlots = cgview.featureSlot
      // delete cgview.featureSlot

      return json
    }

    static json_to_xml(json) {
    }

    exportImage(width, height) {
      var viewer = this._viewer;
      var canvas = viewer.canvas;
      width = width || viewer.width;
      height = height || viewer.height;

      var windowTitle = 'CGV-Image-' + width + 'x' + height;

      // Adjust size based on pixel Ratio
      width = width / CGV.pixel_ratio;
      height = height / CGV.pixel_ratio;

      // Save current settings
      var origContext = canvas.ctx;
      var debug = viewer.debug;
      viewer.debug = false;

      // Generate new context and scales
      var tempCanvas = d3.select('body').append('canvas')
        .attr('width', width).attr('height', height).node();

      CGV.scale_resolution(tempCanvas, CGV.pixel_ratio);
      canvas.ctx = tempCanvas.getContext('2d');

      // Calculate scaling factor
      var minNewDimension = d3.min([width, height]);
      var scaleFactor = minNewDimension / viewer.minDimension;
      canvas.ctx.scale(scaleFactor, scaleFactor);

      // Generate image
      viewer.draw_full();
      var image = tempCanvas.toDataURL();

      // Restore original context and settings
      canvas.ctx = origContext;
      viewer.debug = debug;

      // Delete temp canvas
      d3.select(tempCanvas).remove();

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

  // Changes XML to JSON
  // function xmlToJson(xml) {
  //   // Create the return object
  //   var obj = {};
  //
  //   if (xml.nodeType == 1) { // element
  //     // do attributes
  //     if (xml.attributes.length > 0) {
  //     obj["@attributes"] = {};
  //       for (var j = 0; j < xml.attributes.length; j++) {
  //         var attribute = xml.attributes.item(j);
  //         obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
  //       }
  //     }
  //   } else if (xml.nodeType == 3) { // text
  //     obj = xml.nodeValue;
  //   }
  //
  //   // do children
  //   if (xml.hasChildNodes()) {
  //     for(var i = 0; i < xml.childNodes.length; i++) {
  //       var item = xml.childNodes.item(i);
  //       var nodeName = item.nodeName;
  //       if (typeof(obj[nodeName]) == "undefined") {
  //         obj[nodeName] = xmlToJson(item);
  //       } else {
  //         if (typeof(obj[nodeName].push) == "undefined") {
  //           var old = obj[nodeName];
  //           obj[nodeName] = [];
  //           obj[nodeName].push(old);
  //         }
  //         obj[nodeName].push(xmlToJson(item));
  //       }
  //     }
  //   }
  //   return obj;
  // };

  CGV.IO = IO;

})(CGView);
