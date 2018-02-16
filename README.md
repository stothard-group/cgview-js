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
The *Backbone* represents the sequence and if the sequence is provided to
CGView.js, then you can zoom in far enough to see the sequence in the
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
[Settings](Settings.html)        | [settings](Viewer.html#settings)           | Settings store general options for the viewer.
[Messenger](Messenger.html)      | [messenger](Viewer.html#messenger)         | Messenger provides the interface for showing messages.
[Divider](Divider.html)          | [slotDivider](Viewer.html#slotDivider)     | The slotDivider controls the space and lines between each slot.
[Highlighter](Highlighter.html)  | [highlighter](Viewer.html#highlighter)     | Highlighter controls what happens when mousing over features/plots.
[Feature](Feature.html)          | [features()](Viewer.html#features)         | Returns one or more Features.
[Plot](Plot.html)                | [plots()](Viewer.html#plots)               | Returns one or more Plots.
[Caption](Caption.html)          | [captions()](Viewer.html#captions)         | Returns one or more Captions.
[FeatureType](FeatureType.html)  | [featureType()](Viewer.html#featureTypes)  | Returns one or more FeatureTypes.

### JSON Format ###

[See the CGView JSON format](json_format.html)

### Tutorials ###

- [Basic Map](basic_map.html): Learn how to create a simple map features and a plot
- [Sequence Map](sequence_map.html): Learn how to create a map with features and plots extracted from the sequence.
- [JSON Map](json_map.html): Learn how to create a map by importing from JSON.
- Helpful tips: Learch about some useful CGView.js tips.





