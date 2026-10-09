import Viewer from '../src/Viewer';

describe('IO', () => {

  let cgv;

  beforeEach(() => {
    document.body.innerHTML = '<div id="map"></div>';
    cgv = new Viewer('#map');
  });

  afterEach(() => {
    cgv.stopAnimate();
    clearTimeout(cgv.layout._slotTimeoutID);
    cgv.annotation._externalLabels.destroy();
  });

  describe('outside label migration', () => {
    const map = (version, annotation) => ({cgview: {version, sequence: {length: 1234}, annotation}});

    test('new viewers and current-format maps default to Adaptive', () => {
      expect(cgv.annotation.toJSON()).toMatchObject({labelMethod: 'adaptive', labelDensity: 0, labelSpacing: 3, keepLabelsInView: true});
      for (const annotation of [undefined, {}, {font: 'serif,plain,14'}]) {
        cgv.io.loadJSON(map('1.9.0', annotation));
        expect(cgv.annotation.labelMethod).toBe('adaptive');
      }
    });

    test.each(['0.1', '0.2', '1.0.0', '1.4.0', '1.5.0', '1.7.0', '1.8.0'])(
      '%s maps retain Classic when placement was implicit', version => {
        for (const annotation of [undefined, {}, {font: 'serif,plain,14'}]) {
          const json = map(version, annotation);
          // Structural migrations of early formats expect these sections.
          Object.assign(json.cgview, {settings: {general: {}}, legend: {}, tracks: [], layout: {tracks: []}});
          cgv.io.loadJSON(json);
          expect(cgv.annotation.labelMethod).toBe('classic');
        }
      });

    test.each(['1.8.0', '1.9.0'])('%s legacy fields convert before annotation construction', version => {
      for (const [previous, current] of [['default', 'classic'], ['angled', 'adaptive']]) {
        for (const field of ['labelPlacement', 'externalLabelRenderer']) {
          const annotation = {[field]: previous, priorityMax: 17, labelLineThickness: 2,
            color: 'red', font: 'serif,plain,14', onlyDrawFavorites: true, labelPosition: 'outside',
            externalLabelRendererOptions: {labelDensity: 0.6, gap: 8, constrainToViewport: false}};
          const json = map(version, annotation);
          cgv.io.loadJSON(JSON.stringify(json));
          expect(cgv.annotation.labelMethod).toBe(current);
          expect(cgv.annotation.toJSON()).toMatchObject({
            labelLineThickness: 2, font: 'serif,plain,14', onlyDrawFavorites: true, labelPosition: 'outside',
            labelDensity: 0.6, labelSpacing: 8, keepLabelsInView: false,
          });
          expect(cgv.annotation.color.rgbString).toBe('rgb(255,0,0)');
          const saved = cgv.io.toJSON();
          for (const key of ['labelPlacement', 'labelPlacementFast', 'labelPlacementFull', 'priorityMax', 'externalLabelRenderer', 'externalLabelRendererOptions']) {
            expect(saved.cgview.annotation).not.toHaveProperty(key);
          }
          cgv.io.loadJSON(saved);
          expect(cgv.annotation.toJSON()).toEqual(saved.cgview.annotation);
        }
      }
    });

    test.each(['classic', 'adaptive'])('%s imports drop retired tuning options and preserve shared options', method => {
      const shared = {labelDensity: 0.6, gap: 7, constrainToViewport: false};
      const json = map('1.9.0', {externalLabelRenderer: method,
        externalLabelRendererOptions: {...shared, maxLabels: 8, animate: false, density: 'airy'}});
      const original = JSON.parse(JSON.stringify(json));
      cgv.io.loadJSON(json);
      const flat = {labelMethod: method, labelDensity: 0.6, labelSpacing: 7, keepLabelsInView: false};
      expect(cgv.annotation).toMatchObject(flat);
      const saved = cgv.io.toJSON();
      expect(saved.cgview.annotation).toMatchObject(flat);
      for (const key of ['externalLabelRenderer', 'externalLabelRendererOptions', 'maxLabels', 'animate', 'density']) {
        expect(saved.cgview.annotation).not.toHaveProperty(key);
      }
      cgv.io.loadJSON(saved);
      expect(cgv.annotation).toMatchObject(flat);
      expect(json).toEqual(original);
    });

    test('1.9 experimental maps with only a priority cap retain Classic', () => {
      cgv.io.loadJSON(map('1.9.0', {priorityMax: 0}));
      expect(cgv.annotation.labelMethod).toBe('classic');
    });

    test('reloading the same old object does not change its implicit method', () => {
      const json = map('1.8.0');
      cgv.io.loadJSON(json);
      expect(cgv.annotation.labelMethod).toBe('classic');
      cgv.io.loadJSON(json);
      expect(cgv.annotation.labelMethod).toBe('classic');
      expect(json.cgview.version).toBe('1.8.0');
      expect(json.cgview.annotation).toBeUndefined();
    });

    test.each(['classic', 'adaptive'])('explicit %s wins over legacy placement and defaults', method => {
      for (const version of ['1.8.0', '1.9.0']) {
        for (const labelPlacement of ['default', 'angled']) {
          for (const field of ['labelMethod', 'externalLabelRenderer']) {
            cgv.io.loadJSON(map(version, {[field]: method, labelPlacement, priorityMax: 50}));
            expect(cgv.annotation.labelMethod).toBe(method);
          }
        }
      }
    });

    test('explicit flat fields override nested settings, including zero and false', () => {
      const flat = {labelMethod: 'classic', labelDensity: 0, labelSpacing: 0, keepLabelsInView: false};
      const json = map('1.9.0', {...flat, labelPlacement: 'angled', externalLabelRenderer: 'adaptive',
        externalLabelRendererOptions: {labelDensity: 1, gap: 12, constrainToViewport: true}});
      const original = JSON.parse(JSON.stringify(json));
      expect(cgv.io.updateJSON(json).cgview.annotation).toEqual(flat);
      cgv.io.loadJSON(json);
      expect(cgv.annotation.toJSON()).toMatchObject(flat);
      expect(json).toEqual(original);
    });

    test('mixed-format imports fill only missing flat settings from the old options', () => {
      const json = map('1.9.0', {labelDensity: 0, externalLabelRendererOptions: {
        labelDensity: 1, gap: 8, constrainToViewport: false}});
      cgv.io.loadJSON(json);
      expect(cgv.annotation.toJSON()).toMatchObject({labelMethod: 'adaptive', labelDensity: 0, labelSpacing: 8, keepLabelsInView: false});
    });

    test('conversion is idempotent and does not overwrite the supplied annotation or options', () => {
      const annotation = {labelPlacement: 'angled', priorityMax: 50,
        externalLabelRendererOptions: {labelDensity: 0.5, gap: 4}};
      const original = JSON.parse(JSON.stringify(annotation));
      const first = cgv.io.updateJSON(map('1.8.0', annotation));
      const second = cgv.io.updateJSON(first);
      expect(second).toEqual(first);
      expect(annotation).toEqual(original);
      expect(first.cgview.annotation).toEqual({labelMethod: 'adaptive', labelDensity: 0.5, labelSpacing: 4});
    });

    test('conversion preserves explicit custom renderer IDs and rejects unknown methods on load', () => {
      const json = map('1.8.0', {labelMethod: 'custom-renderer', labelPlacement: 'default'});
      expect(cgv.io.updateJSON(json).cgview.annotation.labelMethod).toBe('custom-renderer');
      expect(() => cgv.io.loadJSON(json)).toThrow("Unknown external label renderer 'custom-renderer'");
    });
  });

  describe('loadJSON', () => {

    test('load JSON object literal', () => {
      const json = { cgview: { version: '1.7.0', sequence: { length: 1234 } } };
      expect(cgv.sequence.length).toBe(1000); // The default
      cgv.io.loadJSON(json);
      expect(cgv.sequence.length).toBe(1234);
    });

    test('load JSON string', () => {
      const json = "{\"cgview\":{\"version\":\"1.7.0\",\"sequence\":{\"length\":1234}}}";
      expect(cgv.sequence.length).toBe(1000); // The default
      cgv.io.loadJSON(json);
      expect(cgv.sequence.length).toBe(1234);
    });

    test('defaults to adaptive 1 px borders when border settings are omitted', () => {
      expect(cgv.settings.borderThickness).toBe(1);
      expect(cgv.settings.adaptiveBorderThickness).toBe(true);
      cgv.settings.update({borderThickness: 2.5, adaptiveBorderThickness: false});
      cgv.io.loadJSON({cgview: {version: '1.9.0', sequence: {length: 1234}}});
      expect(cgv.settings.borderThickness).toBe(1);
      expect(cgv.settings.adaptiveBorderThickness).toBe(true);
    });

    test.each([false, true])('loads, updates, and saves adaptiveBorderThickness=%s', adaptive => {
      cgv.io.loadJSON({cgview: {
        version: '1.9.0', sequence: {length: 1234},
        settings: {adaptiveBorderThickness: adaptive, borderThickness: 2.5},
      }});
      expect(cgv.settings.adaptiveBorderThickness).toBe(adaptive);
      const drawFull = jest.spyOn(cgv, 'drawFull');
      const onUpdate = jest.fn();
      cgv.on('settings-update.border-test', onUpdate);
      cgv.settings.update({adaptiveBorderThickness: !adaptive});
      expect(drawFull).toHaveBeenCalled();
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
        attributes: {adaptiveBorderThickness: !adaptive},
      }));
      const json = cgv.io.toJSON();
      expect(json.cgview.settings.adaptiveBorderThickness).toBe(!adaptive);
      cgv.io.loadJSON(json);
      expect(cgv.settings.adaptiveBorderThickness).toBe(!adaptive);
      expect(cgv.settings.borderThickness).toBe(2.5);
    });

    test('throws an error if no "cgview" property present', () => {
      const json = { sequence: { length: 1234 } };
      expect( () => cgv.io.loadJSON(json) ).toThrow("No 'cgview' property found in JSON.");;
    });

    test('loads annotation JSON with automatic labels by default', () => {
      const json = {
        cgview: {
          version: '1.8.0',
          sequence: {length: 1234},
          annotation: {font: 'sans-serif,plain,12'},
        },
      };

      cgv.io.loadJSON(json);

      expect(cgv.annotation.labelPosition).toBe('auto');
      expect(cgv.annotation.inlineLabelAllowShrinking).toBe(true);
      expect(cgv.annotation.inlineLabelAllowTruncation).toBe(false);
    });

    test('round trips inline annotation settings through CGView JSON', () => {
      document.body.innerHTML = '<div id="map"></div><div id="second-map"></div>';
      const firstViewer = new Viewer('#map', {
        annotation: {
          labelPosition: 'auto',
          inlineLabelAllowShrinking: false,
          inlineLabelAllowTruncation: true,
          inlineLabelColor: 'navy',
        },
      });
      const secondViewer = new Viewer('#second-map');

      secondViewer.io.loadJSON(firstViewer.io.toJSON());

      expect(secondViewer.annotation.toJSON()).toEqual(firstViewer.annotation.toJSON());
      expect(secondViewer.annotation.labelPosition).toBe('auto');
      expect(secondViewer.annotation.inlineLabelAllowShrinking).toBe(false);
      expect(secondViewer.annotation.inlineLabelAllowTruncation).toBe(true);
      expect(secondViewer.annotation.inlineLabelColor.rgbaString).toBe('rgba(0,0,128,1)');
      expect(secondViewer.annotation.toJSON()).not.toHaveProperty('inlineLabelMinFontSize');
      expect(secondViewer.annotation.toJSON()).not.toHaveProperty('inlineLabelPadding');
    });

  });

  describe('exports', () => {

    test.each(['map', 'canvas'])('paints a translucent %s legend once per SVG or PNG export', on => {
      const item = cgv.legend.addItems({name: 'Export legend', swatchColor: 'rgba(10,30,50,0.5)'})[0];
      cgv.legend.update({on, backgroundStyle: 'halo', backgroundColor: 'rgba(255,255,255,0.5)'});
      let svgContext;
      cgv.externals.SVGContext = function() {
        svgContext = document.createElement('canvas').getContext('2d');
        svgContext.getSerializedSvg = () => '<svg></svg>';
        return svgContext;
      };
      cgv.io.getSVG();
      expect(svgContext.strokeText.mock.calls.filter(call => call[0] === item.name)).toHaveLength(1);
      expect(svgContext.fillText.mock.calls.filter(call => call[0] === item.name)).toHaveLength(1);
      expect(svgContext.strokeRect).toHaveBeenCalledTimes(1);

      const createLayers = jest.spyOn(cgv.canvas, 'createLayers');
      const download = jest.spyOn(cgv.io, 'download').mockImplementation(() => {});
      try {
        cgv.io.downloadImage(1200, 1200);
        const ctx = createLayers.mock.results[0].value[on === 'map' ? 'foreground' : 'canvas'].ctx;
        expect(ctx.strokeText.mock.calls.filter(call => call[0] === item.name)).toHaveLength(1);
        expect(ctx.fillText.mock.calls.filter(call => call[0] === item.name)).toHaveLength(1);
        expect(ctx.strokeRect).toHaveBeenCalledTimes(1);
        expect(ctx.scale).toHaveBeenCalledWith(2, 2);
      } finally {
        createLayers.mockRestore();
        download.mockRestore();
      }
    });

    test.each(['map', 'canvas'])('paints a translucent %s caption once per SVG or PNG export', on => {
      const caption = cgv.addCaptions({
        name: 'Export halo', backgroundStyle: 'halo', backgroundColor: 'rgba(255,255,255,0.5)',
      })[0];
      caption.on = on;
      let svgContext;
      cgv.externals.SVGContext = function() {
        svgContext = document.createElement('canvas').getContext('2d');
        svgContext.getSerializedSvg = () => '<svg></svg>';
        return svgContext;
      };
      cgv.io.getSVG();
      expect(svgContext.strokeText.mock.calls.filter(call => call[0] === caption.name)).toHaveLength(1);
      expect(svgContext.fillText.mock.calls.filter(call => call[0] === caption.name)).toHaveLength(1);

      const createLayers = jest.spyOn(cgv.canvas, 'createLayers');
      const download = jest.spyOn(cgv.io, 'download').mockImplementation(() => {});
      try {
        cgv.io.downloadImage(1200, 1200);
        const ctx = createLayers.mock.results[0].value[on === 'map' ? 'foreground' : 'canvas'].ctx;
        expect(ctx.strokeText.mock.calls.filter(call => call[0] === caption.name)).toHaveLength(1);
        expect(ctx.fillText.mock.calls.filter(call => call[0] === caption.name)).toHaveLength(1);
        expect(ctx.scale).toHaveBeenCalledWith(2, 2);
      } finally {
        createLayers.mockRestore();
        download.mockRestore();
      }
    });

    const SVGContext = function() {
      const context = document.createElement('canvas').getContext('2d');
      context.getSerializedSvg = () => '<svg></svg>';
      return context;
    };

    const setPendingDraw = (viewer) => {
      if (viewer.layout._slotTimeoutID !== undefined) {
        clearTimeout(viewer.layout._slotTimeoutID);
      }
      const timeoutID = setTimeout(() => {}, 1000);
      viewer.layout._slotTimeoutID = timeoutID;
      return () => {
        clearTimeout(timeoutID);
        viewer.layout._slotTimeoutID = undefined;
      };
    };

    test('resumes an in-progress Canvas draw after SVG export', () => {
      cgv.externals.SVGContext = SVGContext;
      const originalLayers = cgv.canvas._layers;
      const clearPendingDraw = setPendingDraw(cgv);
      const drawFull = jest.spyOn(cgv, 'drawFull').mockImplementation(() => {});

      try {
        expect(cgv.io.getSVG()).toBe('<svg></svg>');
        expect(cgv.canvas._layers).toBe(originalLayers);
        expect(drawFull).toHaveBeenCalledTimes(1);
      } finally {
        clearPendingDraw();
      }
    });

    test('resumes an in-progress Canvas draw after PNG export', () => {
      const originalLayers = cgv.canvas._layers;
      const clearPendingDraw = setPendingDraw(cgv);
      const drawFull = jest.spyOn(cgv, 'drawFull').mockImplementation(() => {});
      cgv.io.download = jest.fn();

      try {
        cgv.io.downloadImage();
        expect(cgv.canvas._layers).toBe(originalLayers);
        expect(drawFull).toHaveBeenCalledTimes(1);
      } finally {
        clearPendingDraw();
      }
    });

    test('does not restart a Canvas draw when the viewer was settled', () => {
      cgv.externals.SVGContext = SVGContext;
      const drawFull = jest.spyOn(cgv, 'drawFull').mockImplementation(() => {});

      expect(cgv.layout.fullDrawInProgress).toBe(false);
      expect(cgv.io.getSVG()).toBe('<svg></svg>');
      expect(drawFull).not.toHaveBeenCalled();
    });

    test('restores live layers when export rendering throws', () => {
      cgv.externals.SVGContext = SVGContext;
      const originalLayers = cgv.canvas._layers;
      jest.spyOn(cgv, 'drawExport').mockImplementation(() => {
        throw new Error('Export rendering failed');
      });

      expect(() => cgv.io.getSVG()).toThrow('Export rendering failed');
      expect(cgv.canvas._layers).toBe(originalLayers);
    });

    test('renders inline feature labels through the SVG canvas context', () => {
      let svgContext;
      cgv.externals.SVGContext = function() {
        svgContext = document.createElement('canvas').getContext('2d');
        svgContext.getSerializedSvg = () => '<svg></svg>';
        return svgContext;
      };
      cgv.annotation.update({labelPosition: 'inline'});
      cgv.addFeatures([{name: 'svg label', source: 'test', start: 100, stop: 900, legend: 'Feature'}]);
      cgv.addTracks({
        dataType: 'feature',
        dataMethod: 'source',
        dataKeys: 'test',
        position: 'outside',
      });

      expect(cgv.io.getSVG()).toBe('<svg></svg>');
      expect(svgContext.fillText.mock.calls.map(call => call[0]))
        .toEqual(expect.arrayContaining(Array.from('svg label')));
    });

  });

});
