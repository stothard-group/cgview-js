# DocSet Generator

Generates a docSet from html documentation.

## Installation

``
npm install docset-generator --save
``

## Usage


```
var DocSetGenerator = require('docset-generator').DocSetGenerator;
var docSetGenerator = new DocSetGenerator(
  {
    destination: "/path/to/dir",
    name: "MyDocSet",
    documentation: "/path/to/html"
  });
docSetGenerator.create();
```

## Options

The DocSetGenerator constructor takes one parameter:
`` new DocSetGenerator(configuration) ``

The configuration parameter is an object with the following keys.

* `name`: name of the docSet
* `documentation`: path to the html documentation
* `destination`: path to the directory in which you want to generate the docSet [optional, falls back to the documentation folder]
* `enableJavascript`: boolean, enable Javascript in the generated docSet
* `entries`: [Entries](#entries) that will populate the docSet database [optional]
* `icon`: path to the docSet icon [optional]
* `index`: path to the index page of your html documentation [optional, default to index.html]
* `platformFamily`: will be used to fill the DocSetPlatformFamily attribute in the Info.plist file [optional, falls back to the name]
* `identifier`: will be used to fill the DocSetIdentifier attribute in the Info.plist file [optional, falls back to the name]

### Entries

The entries parameter is an array of entries that will populate the sqlite3 database that comes with the docset.

Structure
```
Array<{ name:string, type:string, path:string }>
```

The type has to be one of the [supported entry types](https://kapeli.com/docsets#supportedentrytypes).

This parameter is optional but without any entries, you won't get a neat overview of your documentation (list of classes, namespaces, methods and whatever else may be useful to you).
You can use [jsdoc-docset](https://github.com/theasta/jsdoc-docset) to generate those entries from inside your jsdoc template.


