// Built-in plugins
export const CaptionDynamicText = {
  name: 'CaptionDynamicText',
  version: '0.1.0',
  type: 'CaptionDynamicText',
  draw: function(cgv) {
    console.log('Drawing CaptionDynamicText');
  },
  install: function(cgv) {
    console.log('Installing CaptionDynamicText');
    // cgv.CaptionDynamicText = {
    //   getDynamicText: function() {
    //     return 'Dynamic Text';
    //   }
    // };
  }
};

export const BuiltInPlugins = [
  CaptionDynamicText,
];