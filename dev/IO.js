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

      // Override Main Viewer settings
      viewer.sequenceLength = CGV.defaultFor(json.sequenceLength, viewer.sequenceLength)
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
          if (feature._color.rgbaString == legendItem.swatchColor) {
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
          if (arcPlot._color.rgbaString == legendItem.swatchColor) {
            arcPlot.legendItem = legendItem;
          }
          if (arcPlot._colorPositive && arcPlot._colorPositive.rgbaString == legendItem.swatchColor) {
            arcPlot.legendItemPositive = legendItem;
          }
          if (arcPlot._colorNegative && arcPlot._colorNegative.rgbaString == legendItem.swatchColor) {
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
