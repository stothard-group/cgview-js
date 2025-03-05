// This file is the interface for the plugins.
// This is a test of how to create a plugin system.
// Initially, we will add a built-in plugin or two to test the system.

// Thoughts/Layout:
// We can allow objects or classes to be passed in as plugins.

// Required properties:
// - name
// - version
// - type

// Optional methods:
// - install: function(cgv) {}
//   - This function will be called when the plugin is installed.
// - uninstall: function(cgv) {}


class Plugins {

  // plugins: array of plugins or a single plugin object
  constructor(viewer, plugins) {
    this.viewer = viewer;
    this.plugins = [];
    if (plugins) {
      // plugins are an array
      if (Array.isArray(plugins)) {
        plugins.forEach(plugin => this.add(plugin));
      }
      // plugins is an object
      else if (typeof plugins === 'object') {
        this.add(plugins);
      }
      else {
        throw new Error('Plugins must be an array or an object.');
      }
    } else {
      console.log('No plugins provided.');
    }
  }

  static get types() {
    return ['General', 'CaptionDynamicText', 'LabelPlacement', 'SVGContext'];
  }

  add(plugin) {
    console.log(`Plugin Add: ${plugin.name}`);
    console.log(plugin);
    if (!plugin.name) {
      throw new Error('Plugin must have a name.');
    }
    if (!plugin.version) {
      throw new Error('Plugin must have a version.');
    }
    if (!plugin.type) {
      throw new Error('Plugin must have a type.');
    }
    if (!Plugins.types.includes(plugin.type)) {
      throw new Error(`Plugin type is not valid. Must be one of: ${Plugins.types.join(', ')}`);
    }
    if (plugin.install) {
      if (typeof plugin.install !== 'function') {
        throw new Error('Plugin install must be a function.');
      }
      plugin.install(this.viewer);
    }
    this.plugins.push(plugin);
  }

}

export default Plugins;


