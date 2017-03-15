## CGView.js

This is a JavaScript port of the Java program [CGView](http://wishart.biology.ualberta.ca/cgview/index.html).
While CGView is meant to create static maps as PNG, JPG or SVG files, CGView.js can be used to create
interactive maps for the web that can be easily panned, zoomed and altered. The maps can be saved as PNG files
with resolutions upto 6000x6000 pixels.

### Dependencies
* [D3](http://d3js.org) (Version 4)
* [d3-selection-multi](https://github.com/d3/d3-selection-multi)

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

### Overview ###

CGView.js draws maps as a series of [Tracks](Track.html) around the [Backbone](Backbone.html).
The *Backbone* represents the sequence and if the seqeunce is provided to
CGView.js, then you can actually zoom in far enough to see the sequence in the
backbone. *Tracks* contain either a [Plot](Plot.html) or a set of
[Features](Feature.html). *Tracks* are drawn as as one or more
[Slots](Slot.html) where each *Slot* is a single ring on the map. Slots outside
of the backbone show features on the forward strand, while inside slots show
features on the reverse strand.  *Tracks* containing a *Plot* are always drawn
as a single slot, however, Feature Tracks can be drawn in 3 different
configurations:

Slots | Description
------|------------
 1    | All the Features are drawn on a single Slot
 2    | Features are drawn separated by strand
 6    | Features are drawn separated by reading frame

The [Viewer](Viewer.html) is the main class in CGView.js and contains several components
which control the look and feel of the Map. These components can be accessed through *Accessor*
members or methods. Members (or properties) provide access in cases where there
is only a single component (e.g Sequence). Methods allow selection of one or
more objects in cases where there can be more than one component (e.g. Features).
See [CGArray.get](CGArray.html#get) for details.

```js
// Access the sequence object
viewer.sequence
// Access all the features
viewer.features()
// Access the first feature
viewer.features(1)
// Access the first feature with the name 'my_feature'
viewer.features('my_feature')
```

Component                        | Accessor                                   | Description
---------------------------------|--------------------------------------------|------------
[Sequence](Sequence.html)        | [sequence](Viewer.html#sequence)           | The Sequence object contains the sequence itself or at the very least the length of the sequence.
[Canvas](Canvas.html)            | [canvas](Viewer.html#canvas)               | The Canvas object contains the canvas layers, scale and various drawing methods.
[IO](IO.html)                    | [io](Viewer.html#io)                       | The IO object has methods for reading and writing data to and from the Viewer.
[Legend](Legend.html)            | [legend](Viewer.html#legend)               | The Legend object contains the [LegendItems](LegendItem.html) which are used to color the features and plots.
[Backbone](Backbone.html)        | [backbone](Viewer.html#backbone)           | The Backbone represents the sequence. Slots outside of the backbone show features on the forward strand, while inside slots show features on the reverse strand.
[Layout](Layout.html)            | [layout](Viewer.html#layout)               | The Layout describes what's in each Track and how to lay them out.
[Ruler](Ruler.html)              | [ruler](Viewer.html#ruler)                 | The Ruler controls how the sequence ruler is drawn.
[Annotation](Annotation.html)    | [annotation](Viewer.html#annotation)       | Annotation controls how feature labels are drawn.
[Messenger](Messenger.html)      | [messenger](Viewer.html#messenger)         | Messenger provides the interface for showing messages.
[Divider](Divider.html)          | [slotDivider](Viewer.html#slotDivider)     | The slotDivider controls the space and lines between each slot.
[Help](Help.html)                | [help](Viewer.html#help)                   | Help control what is draw in the help menu.
[Menu](Menu.html)                | [menu](Viewer.html#menu)                   | Provides control for the Menu.
[Feature](Feature.html)          | [features()](Viewer.html#features)         | Returns one or more Features.
[Plot](Plot.html)                | [plots()](Viewer.html#plots)               | Returns one or more Plots.
[Caption](Caption.html)          | [captions()](Viewer.html#captions)         | Returns one or more Captions.
[FeatureType](FeatureType.html)  | [featureType()](Viewer.html#featureTypes)  | Returns one or more FeatureTypes.


### Tutorials ###

- Basic Map: Learn how to create a simple map features and a plot
- Sequence Map: Learn how to create a map with features and plots extracted from the sequence.
- JSON Map: Learn how to create a map by importing from JSON.
- Helpful tips: Learch about some useful CGView.js tips.

### Creating a New Viewer ###

Create a container for the viewer in HTML:

```html
<div id='my-viewer'></div>
```

Create a new [Viewer](Viewer.html)

The *Viewer* is the main object in CGView.js. While many options can be
provided when creating the viewer, the most important is the sequence options.
For the sequence, you can provide the length or the sequence itself. If the
sequence is provided, you will be able to see the sequence when zoomed in far
enough. Also with the sequence, you can easily create new tracks with plots
(e.g. GC Skew, GC Content) or features (e.g. start/stop codons, ORFs) extracted
from the sequence.
```js
cgv = new CGV.Viewer('#my-viewer', {
  height: 600,
  width: 600,
  sequence: {
    // Proved the sequence length
    length: 100000
    // Or the sequence itself
    // seq: 'ATGCGATGCA...'
  }
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




