# [CGView.js](http://js.cgview.ca)

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

CGView.js is Apache v2 (LINK) licensed.




