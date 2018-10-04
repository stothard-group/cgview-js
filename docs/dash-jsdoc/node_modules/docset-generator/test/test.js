var DocSetGenerator = require('../lib/docset-generator').DocSetGenerator;

var config = {
  destination: "../tmp/",
  name: "MyDocSetJs",
  identifier: "MyDocSet",
  platformFamily: "MyDocSet",
  icon: "fixtures/icon.png",
  documentation: "fixtures/html",
  entries: [
    { 
      name: 'Animal',
      type: 'Class',
      path: 'Animal.html'
    },
    { 
      name: 'Apple',
      type: 'Namespace',
      path: 'Apple.html'
    },
    { 
      name: 'Apple.Core',
      type: 'Namespace',
      path: 'Apple.Core.html'
    }
  ]};

var generator = new DocSetGenerator(config);
generator.create();
