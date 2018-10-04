var path = require('path');
var objectAssign = require('object-assign');

var Generator = require('docset-generator').DocSetGenerator;
var Entries = require('./DocSetEntries');

/**
 *
 * @param {Object} config
 * @param {Object} config.opts - jsdoc options (Template publish function third parameter)
 * @param {string} config.opts.destination - Html documentation path
 * @param {string} [config.opts.configure] - Path to the jsdoc conf file
 * @param {boolean} [config.verbose] - Verbose flag, will default to false
 * @param {Object} config.templateHelper - templateHelper needed by the Entries instance
 * @param {Object} config.docletHelper - docletHelper needed by the Entries instance
 * @returns {Promise}
 */
module.exports = function (config) {
  config = config || {};
  var opts = config.opts || {};
  if (typeof opts.destination !== 'string') {
    throw Error("Please provide the opts parameter (third argument from the publish function)");
  }

  var docSetConfig = {
    documentation: opts.destination,
    verbose: !!config.verbose
  };

  try {
    var jsdocConf = typeof opts.configure === 'string' && opts.configure.length ? require(path.resolve(opts.configure)) : {};
    if (typeof jsdocConf === 'object' && typeof jsdocConf.docset === 'object') {
      docSetConfig = objectAssign(docSetConfig, jsdocConf.docset);
    }
  } catch (e) {
    console.log('Error occurred when trying to access the jsdoc configuration file (' + opts.configure + '): ' + e.message);
  }

  if (docSetConfig.documentation && !docSetConfig.name) {
    docSetConfig.name = path.basename(docSetConfig.documentation);
  }

  var entries = new Entries({
    templateHelper: config.templateHelper,
    docletHelper: config.docletHelper
  }).getEntries();

  if (Array.isArray(entries)) {
    docSetConfig.entries = entries;
  }

  return new Generator(docSetConfig)
    .create();
};
