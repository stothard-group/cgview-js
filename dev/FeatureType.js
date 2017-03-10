//////////////////////////////////////////////////////////////////////////////
// FeatureType
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class FeatureType {

    /**
     * A Feature Type 
     */
    constructor(viewer, data = {}) {
      this.viewer = viewer
      this.name = CGV.defaultFor(data.name, '');
      // Decoration: arc, arrow, score
      this.decoration = CGV.defaultFor(data.decoration, 'arc');

    }

    /**
     * @member {Viewer} - Get the *Viewer*
     */
    get viewer() {
      return this._viewer
    }

    set viewer(viewer) {
      if (this.viewer) {
        // TODO: Remove if already attached to Viewer
      }
      this._viewer = viewer;
      viewer._featureTypes.push(this);
    }

    /**
     * @member {type} - Get or set the *type*
     */
    get type() {
      return this._type
    }

    set type(value) {
      this._type = value;
    }

    /**
     * @member {String} - Get or set the decoration. Choices are *arc* [Default], *arrow*, *score*
     */
    get decoration() {
      return this._decoration;
    }

    set decoration(value) {
      if ( CGV.validate(value, ['arc', 'arrow', 'score']) ) {
        this._decoration = value;
      }
    }

    features(term) {
      var viewer = this.viewer;
      var _features = new CGV.CGArray( viewer._features.filter( (f) => { return f.featureType == this } ));
      return _features.get(term);
    }

  }

  CGV.FeatureType = FeatureType;

})(CGView);
