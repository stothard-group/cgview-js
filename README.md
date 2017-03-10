## CGView.js

This is a JavaScript port of the Java program [CGView](http://wishart.biology.ualberta.ca/cgview/index.html).
While the CGView is meant to create static maps as PNG, JPG or SVG files, CGView.js can be used to create
interactive maps for the web that can be easily panned, zoomed and altered. The maps can be saved as PNG files
with resolutions upto 6000x6000 pixels.

### Dependencies
* D3 - http://d3js.org (Version 4)
* d3-selection-multi - https://github.com/d3/d3-selection-multi

### Setup ###

* For the D3 dependencies add the following to your html:

```html
<script src="https://d3js.org/d3.v4.min.js"></script>
<script src="https://d3js.org/d3-selection-multi.v0.4.min.js"></script>
```

* Copy *cgview.js* to your javascript folder and add a script tag to your html:

```html
<script src='javascript/cgview.js'></script>
```

* Copy *cgview.css* to your stylesheets folder and add a link to the file in your html:

```html
<link rel="stylesheet" href="stylesheets/cgview.css" />
```

### Creating a New Viewer ###

Create a container for the viewer in HTML:

```html
<div id='my-viewer'></div>
```

Create [Viewer](Viewer.html)
```js
cgv = new CGV.Viewer('#my-viewer', {
  height: 600,
  width: 600,
  TODO: ADD MORE OPTIONS: sequence
});
sv.flash('Loading...')
```

Maps are made up of [Tracks](Track.html) that contain [Features](Feature.html) or [Plots](ArcPlot.html).

Before creating a feature, a [LegendItem](LegendItem.html) and [FeatureType](FeatureType.html) should be created first
to describe the shape and color of the feature.

Create [FeatureType](FeatureType.html)
```js
new CGV.FeatureType(cgv, {
  // Name of feature type.
  name: 'CDS',
  // How to draw features of this type. Options: 'arrow' or 'arc'
  decoration: 'arrow'
});

```

Create [LegendItem](LegendItem.html)
```js
new CGV.LegendItem(cgv.legend, {
  // Text of LegendItem label.
  text: 'CDS',
  // Color of swatch beside legend item. Features associated with
  // this legend item will be drawn using this color. Colors can be rgb, rgba format
  // or as a string (e.g. 'blue').
  swatchColor: 'rgba(200, 150, 150, 0.8)'
});
```

Create [Feature](Feature.html)

```js
new CGV.Feature(cgv, {
  // Feature type. Used to determine how the feature is drawn (e.g. arrow or arc).
  // If a FeatureType with this name does not exist, a new FeatureType will be
  // created with this name and the default settings (e.g. the decoration will be an 'arc').
  type: 'CDS',
  // Name of the feature.
  label: 'My Feature Name',
  // Beginning of the feature in bp. Must be <= stop.
  start: 100,
  // End of the feature in bp. Must be >= start.
  stop: 250,
  // Which strand is the feature on. 1: forward strand; -1: reverse strand.
  strand: 1,
  // Used to group features into a track.
  source: 'genome-features',
  // Name of LegendItem to associate with the feature.
  // If a LegendItem with this text does not exist, a new LegendItem will be created
  // with this text and the default settings (e.g. the color will be 'black').
  legend: 'CDS'
});
```

Create [Track](Track.html), which is a part of the the Viewer [Layout](Layout.html)
```js
new CGV.Track(cgv.layout, {
  // Name for the track.
  name: 'My track',
  // Draw the track using separated or combined slots for each reading frame. Options: 'separated', 'combined'.
  readingFrame: 'combined',
  // Draw the track using separated or combined slots for the forward and reverse strand. Options: 'separated', 'combined'.
  strand: 'combined',
  // Where to draw the track in relation to the backbone. Options: 'inside', 'outside', 'both'.
  position: 'both',
  // Here we describe what features or plot will be in the track.
  contents: {
    // What type of track is this. Options: 'features' or 'plot'.
    features: {
      // Which Features to use. Options: 'source', 'types' or 'sequence' (see examples below).
      source: 'genome-features' // All features with the source 'genome-features' will be added to this track.
    }
  }
});
```
[Tracks](Track.html) are drawn as one or more [Slots](Slot.html) on the map.

Examples of contents
```js
contents: {
  features: {
    // Features can be extracted from the sequence (if it's been added to the viewer).
    // What should be extracted. Options: 'orfs', 'start_stop_codons'
    sequence: orfs,
    // Additional options can also be provided.
    // In this case, what start and stop codons to use.
    start: 'ATG',
    stop: 'TAA,TAG,TGA'
  }
}
```



LOAD JSON

```js
cgv.loadJSON(jsonData);
```

The format of the JSON...



## TODO
* Have image of map and parts (e.g. track, slot, caption, ruler, etc)




