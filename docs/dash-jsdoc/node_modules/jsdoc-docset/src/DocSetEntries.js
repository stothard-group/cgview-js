var objectAssign = require('object-assign');
var docletUtils = require('./utils/doclet');
var categories = require('./constants/jsdoc/categories');

/**
 *
 * @param options
 * @param options.templateHelper
 * @param [options.members]
 * @param [options.docletHelper]
 * @param [options.categories]
 * @constructor
 */
var DocSetEntries = function (options) {
  this.docletHelper = options.docletHelper;
  this.categories = options.categories || categories;

  if (typeof options.templateHelper === 'object' &&
    typeof options.templateHelper.longnameToUrl === 'object') {
    this.longnameToUrl = options.templateHelper.longnameToUrl;
    this.tutorialToUrl = options.templateHelper.tutorialToUrl;
  } else {
    throw Error('Please provide the templateHelper instance.');
  }

  this._customSymbolHandlers = {};
};

// PUBLIC

DocSetEntries.prototype.getEntries = function () {
  var members = this._getMembersFromDocletHelper();

  return this.categories.reduce(function(entries, type) {
    var handler = this.getSymbolHandler(type);
    return !Array.isArray(members[type]) ? entries :
      entries.concat(members[type].map(this.applyHandler(handler)));
  }.bind(this), []);
};

DocSetEntries.prototype.addSymbolHandler = function (symbol, customSymbolHandler) {
  var customHandler = this._customSymbolHandlers[symbol] || this._getDefaultCustomHandler();
  this._customSymbolHandlers[symbol] = objectAssign({}, customHandler, customSymbolHandler);
};


// PRIVATE

DocSetEntries.prototype._getMembersFromDocletHelper = function () {
  var docletHelper = this.docletHelper;
  var members = {};
  if (typeof docletHelper !== 'object' || typeof docletHelper.getCategory !== 'function') {
    throw Error('Please provide the docletHelper instance with a getCategory method.');
  }

  var isBaseline = typeof docletHelper.symbols === 'object';
  if (isBaseline) {
    members = objectAssign({}, docletHelper.symbols, {
      modules: docletHelper.symbols.modules ? docletHelper.symbols.modules.modules || [] : [],
      functions: [],
      properties: []
    });
    Object.keys(docletHelper.globals).forEach(function (type) {
      if (Array.isArray(docletHelper.globals[type]) && docletHelper.globals[type].length) {
        if (Array.isArray(members[type])) {
          members[type] = members[type].concat(docletHelper.globals[type]);
        }
      }
    });
  } else {
    this.categories.forEach(function (category) {
      members[category] = docletHelper.getCategory(category);
    });
  }
  return members;
};


DocSetEntries.prototype._defaultPathHandler = function (doclet) {
  if (docletUtils.isTutorial(doclet)) {
    return this.tutorialToUrl(doclet.longname);
  } else {
    return this.longnameToUrl[doclet.longname];
  }
};

DocSetEntries.prototype._defaultNameHandler = function (doclet) {
  return doclet.longname.replace(/^module:/, '');
};

DocSetEntries.prototype._defaultTypeHandler = function (doclet) {
  return docletUtils.getDocsetTypeFor(doclet);
};

DocSetEntries.prototype._getDefaultCustomHandler = function () {
  return {
    name: this._defaultNameHandler.bind(this),
    type: this._defaultTypeHandler.bind(this),
    path: this._defaultPathHandler.bind(this)
  }
};

DocSetEntries.prototype.getSymbolHandler = function (symbol) {
  return this._customSymbolHandlers[symbol] || this._getDefaultCustomHandler();
};

DocSetEntries.prototype.applyHandler = function (handler) {
  return function (doclet) {
    return {
      name: handler.name(doclet),
      type: handler.type(doclet),
      path: handler.path(doclet)
    }
  }
};

module.exports = DocSetEntries;
