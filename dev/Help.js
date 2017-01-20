//////////////////////////////////////////////////////////////////////////////
// CGview Help
//////////////////////////////////////////////////////////////////////////////
(function(CGV) {

  class Help {

    constructor(viewer) {
      this.viewer = viewer;

      this.dialog = new CGV.Dialog(viewer, {
        header_text: 'CGView (CGV) Help',
        content_text: help_text,
        width: 700,
        height: 350
      });

    }

  }

  var help_text = '' +
    'The map can be scrolled around or scaled using the controls in the menu or by using the various mouse and keyboard shortcuts:' + 
    '<h3>Viewer Controls</h3>' +
    '<table class="cgv-table">' +
    '<thead><tr><th>Action</th><th>Command</th></tr></thead><tbody>' +
    '<tr><td>Zoom In/Out</td><td>Scroll wheel</td></tr>' +
    '<tr><td>Move Around</td><td>Click and Drag</td></tr></tbody></table>' +
    '<h3>Change Map</h3>' +
    '<table class="cgv-table">' +
    '<thead><tr><th>Action</th><th>Command</th></tr></thead><tbody>' +
    '<tr><td>Change Feature Colors</td><td>Click on color swatches in legend</td></tr>' +
    '</tbody></table>' +
    '<h3>Troubleshooting</h3>' +
    '<p>If the viewer is not showing any map or is slow, try updating to the latest version of your ' +
    'browser. We have found that <a href="https://www.google.com/chrome" target="_blank">Google Chrome</a> is the fastest.</p></div></div>';

  CGV.Help = Help;

})(CGView);


