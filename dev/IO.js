// Static methods for converting XML <-> JSON
// NOTE: xml2json required for conversions
// https://github.com/abdmob/x2js
// Class for reading and writing JSON
//////////////////////////////////////////////////////////////////////////////
// IO
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class IO {

    constructor(viewer) {
      this._viewer = viewer;
    }

    // Load data from new JSON format (modeled after XML from original CGView).
    // Removes any previous viewer data and overrides options that are already set.
    load_json(json) {
      var viewer = this._viewer;
      
      // Override Main Viewer settings
      // ...
      // Add featureSlots

      if (data.featureSlots) {
        data.featureSlots.forEach((slotData) =>
          var slot = new CGV.FeatureSlot(slotData);
          viewer.addFeatureSlot(slot);
        );
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
      var json = x2js.xml_str2json(xml);
      return json
    }

    static json_to_xml(json) {
    }

  }

  CGV.IO = IO;

})(CGView);
