# [CGView.js](http://js.cgview.ca)

[![npm version](https://img.shields.io/npm/v/cgview)](https://www.npmjs.com/package/cgview)
![bundle size](https://img.shields.io/bundlephobia/min/cgview)
[![jsDelivr hits](https://data.jsdelivr.com/v1/package/npm/cgview/badge)](https://www.jsdelivr.com/package/npm/cgview)
![Last Commit](https://img.shields.io/github/last-commit/stothard-group/CGView-js.svg)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://www.apache.org/licenses/LICENSE-2.0)
[![Docs](https://img.shields.io/badge/docs-available-blue)](https://js.cgview.ca)

CGView.js is a <strong>C</strong>ircular <strong>G</strong>enome <strong>View</strong>ing
tool for visualizing and interacting with small genomes. 

## Resources

- [CGView.js Home](http://js.cgview.ca)
- [Tutorials](http://js.cgview.ca/tutorials)
- [Examples](http://js.cgview.ca/examples)
- [Documentation](http://js.cgview.ca/docs.html)

## Install

```bash
npm install --save cgview
```
See [Installation Instructions](http://js.cgview.ca/docs.html#section-setup)
for additional ways to setup CGView.js.

## Usage

```js
import CGV from from 'cgview';

cgv = new CGV.Viewer('#my-viewer', {
  height: 500,
  width: 500,
  sequence: {
    // The length of the sequence
    length: 1000
    // Or, you can provide a sequence
    // seq: 'ATGTAGCATGCATCAGTAGCTA...'
  }
});

// Draw the map
cgv.draw()
```

See the [tutorials](http://js.cgview.ca/tutorials/index.html) for how to add features and plots.

## License

CGView.js is distrubuted under the [Apache Version 2.0 License](https://github.com/stothard-group/cgview-js/blob/main/LICENSE).




