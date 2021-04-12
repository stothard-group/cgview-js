// //////////////////////////////////////////////////////////////////////////////
// // Track Contents
// //////////////////////////////////////////////////////////////////////////////
// (function(CGV) {
//   /**
//    * <br />
//    * Track  Contents describes what features/plot make up the track.
//    * @extends CGObject
//    */
//   class TrackContents extends CGV.CGObject {
//
//     /**
//      * Create a new track content.
//      */
//     constructor(track, data = {}, meta = {}) {
//       super(track.viewer, data, meta);
//       this._track = track;
//       this.type = CGV.defaultFor(data.type, 'feature');
//       this.from = CGV.defaultFor(data.from, 'source');
//       this.extract = data.extract;
//       this.options = data.options || {};
//     }
//
//     /**
//      * Return the class name as a string.
//      * @return {String} - 'TrackContents'
//      */
//     toString() {
//       return 'TrackContents';
//     }
//
//     /**
//      * @member {String} - Get the *track*.
//      */
//     get track() {
//       return this._track;
//     }
//
//     /**
//      * @member {String} - Get or set the *type*. Must be one of 'feature' or 'plot' [Default: 'feature']
//      */
//     get type() {
//       return this._type;
//     }
//
//     set type(value) {
//       if ( CGV.validate(value, ['feature', 'plot']) ) {
//         this._type = value;
//       }
//     }
//
//     /**
//      * @member {String} - Get or set the *from* attribute. *from* describes from where the features/plot should be extracted.
//      *    Options are 'source', 'type', or 'sequence' [Default: 'source']
//      */
//     get from() {
//       return this._from;
//     }
//
//     set from(value) {
//       if ( CGV.validate(value, ['source', 'type', 'sequence']) ) {
//         this._from = value;
//       }
//     }
//
//     /**
//      * @member {String} - Get or set the *extract* attribute. *extract* describes which features/plot should be extracted. For example,
//      *    if *from* is 'type', and *extract* is 'CDS', then all features with a type of 'CDS' will be used to create the track.
//      *    For *from* of 'sequence', the following values are possible for *extract*: 'orfs', 'start-stop-codons', 'gc-content', 'gc-skew'.
//      */
//     get extract() {
//       return this._extract;
//     }
//
//     set extract(value) {
//       this._extract = (value === undefined) ? new CGV.CGArray() : new CGV.CGArray(value);
//     }
//
//
//     /** * @member {Object} - Get or set the *Options*. The *options* are passed to the SequenceExtractor.
//      */
//     get options() {
//       return this._options;
//     }
//
//     set options(value) {
//       this._options = value;
//     }
//
//     update(attributes) {
//       this.track.update({contents: attributes});
//     }
//
//     toJSON(options = {}) {
//       const json = {
//         type: this.type,
//         from: this.from
//       };
//       // Extract
//       if (this.extract.length === 1) {
//         json.extract = this.extract[0];
//       } else {
//         json.extract = [];
//         this.extract.each( (i, item) => { json.extract.push(item); });
//       }
//       // Options
//       if (this.options && Object.keys(this.options).length > 0) {
//         json.options = this.options;
//       }
//       return json;
//     }
//
//   }
//
//   CGV.TrackContents = TrackContents;
// })(CGView);
