var docletUtils = require('./utils/doclet');

var dashAnchor = function (doclet) {
  var entryName = doclet.name;
  var entryType = docletUtils.getDocsetTypeFor(doclet);
  return '<a name="//apple_ref/' + entryType + '/' + encodeURIComponent(entryName) + '" class="dashAnchor"></a>';
};

module.exports = {
  dashAnchor: dashAnchor
};
