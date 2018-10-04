var jsdocKinds = require('../constants/jsdoc/kinds');
var docSetTypes = require('../constants/docSetTypes');

var _map = ['CALLBACK', 'CLASS', 'CONSTANT', 'EVENT', 'FILE', 'FUNCTION', 'GLOBAL', 'MIXIN', 'MODULE', 'NAMESPACE']
  .reduce(function (map, key) {
    map[jsdocKinds[key]] = docSetTypes[key];
    return map;
}, {});
_map[jsdocKinds.EXTERNAL] = docSetTypes.RESOURCE;
_map[jsdocKinds.MEMBER] = docSetTypes.PROPERTY;
_map[jsdocKinds.TYPEDEF] = docSetTypes.STRUCT;
_map[jsdocKinds.TUTORIAL] = docSetTypes.GUIDE;

var isTutorial = function (doclet) {
  return doclet.kind === undefined && typeof doclet.parent === 'object';
};

var isCallback = function (doclet) {
  return doclet.kind === jsdocKinds.TYPEDEF && doclet.signature;
};

var isGlobalProperty = function (doclet) {
  return doclet.kind === jsdocKinds.MEMBER && doclet.scope === 'global';
};

module.exports = {
  getDocsetTypeFor: function (doclet) {
    var kind = doclet.kind;
    if (isTutorial(doclet)) {
      kind = jsdocKinds.TUTORIAL;
    } else if (isCallback(doclet)) {
      kind = jsdocKinds.CALLBACK;
    } else if (isGlobalProperty(doclet)) {
      kind = jsdocKinds.GLOBAL;
    }
    return _map[kind];
  },
  isTutorial: isTutorial
};
