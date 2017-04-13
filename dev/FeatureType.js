//////////////////////////////////////////////////////////////////////////////
// FeatureType
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class FeatureType extends CGV.CGObject {

    /**
     * A Feature Type 
     */
    constructor(viewer, data = {}, meta = {}) {
      super(viewer, data, meta)
      this.viewer = viewer
      this.name = CGV.defaultFor(data.name, '');
      // Decoration: arc, arrow, score
      this.decoration = CGV.defaultFor(data.decoration, 'arc');
      this.viewer.trigger('feature-type-update');
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
     * @member {String} - Get or set the *name*
     */
    get name() {
      return this._name
    }

    set name(value) {
      this._name = value;
    }

    /**
     * @member {String} - Alias for [name](FeatureType.html#name)
     */
    get id() {
      return this.name
    }

    set id(value) {
      this.name = value;
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

    remove() {
      var viewer = this.viewer;
      viewer._featureTypes = viewer._featureTypes.remove(this);
      viewer.trigger('feature-type-update');
    }

  }

  CGV.FeatureType = FeatureType;

})(CGView);
