import Viewer from '../src/Viewer';

describe('Feature', () => {

  beforeAll(() => {
    // Set up document body to have a div for the map
    document.body.innerHTML = '<div id="map"></div>';
  });

  beforeEach(() => {
    cgv = new Viewer('#map', {
      sequence: {
        contigs: [
          { name: 'contig_1', length: 100 },
          { name: 'contig_2', length: 100 },
        ],
      },
    });
  });

  describe('contrained positions', () => {

    test('for stop', () => {
      const feature = cgv.addFeatures([
        {name: 'f1', contig: 'contig_1', start: 10, stop: 120},
      ])[0];
      expect(feature.start).toEqual(10);
      expect(feature.stop).toEqual(100);
    });

    test('for start and stop', () => {
      const feature = cgv.addFeatures([
        {name: 'f2', contig: 'contig_1', start: 130, stop: 150},
      ])[0];
      expect(feature.start).toEqual(100);
      expect(feature.stop).toEqual(100);
    });

  });

  describe('feature on contigs', () => {

    beforeEach(() => {
      cgv.addFeatures([
        {name: 'f1', contig: 'contig_1', start: 10, stop: 20},
        {name: 'f2', contig: 'contig_2', start: 30, stop: 50},
      ]);
    });

    test('can be added', () => {
      expect(cgv.features().length).toEqual(2);
      expect(cgv.features(2).start).toEqual(30);
      expect(cgv.features(2).stop).toEqual(50);
    });

    test('have different mapContig positions', () => {
      expect(cgv.features(2).mapStart).toEqual(130);
      expect(cgv.features(2).mapStop).toEqual(150);
    });

    test('will belong to the contig it was added with', () => {
      expect(cgv.features(1).contig).toEqual(cgv.contigs(1));
      expect(cgv.features(2).contig).toEqual(cgv.contigs(2));
    });

    test('will move with the contigs', () => {
      cgv.contigs(2).move(0);
      expect(cgv.features(2).start).toEqual(30);
      expect(cgv.features(2).stop).toEqual(50);
      expect(cgv.features(2).mapStart).toEqual(30);
      expect(cgv.features(2).mapStop).toEqual(50);
    });

    test('can be moved to mapContig', () => {
      const feature = cgv.features(2);
      feature.moveToMapContig();
      expect(feature.contig.cgvID).toEqual(cgv.sequence.mapContig.cgvID);
      expect(feature.start).toEqual(130);
      expect(feature.stop).toEqual(150);
      expect(feature.mapStart).toEqual(130);
      expect(feature.mapStop).toEqual(150);
    });

  });

  describe('feature without contig', () => {

    beforeEach(() => {
      cgv.addFeatures([
        {name: 'f1', start: 10, stop: 20},
        {name: 'f2', start: 130, stop: 150},
      ]);
    });

    test('can be added', () => {
      expect(cgv.features().length).toEqual(2);
      expect(cgv.features(2).start).toEqual(130);
      expect(cgv.features(2).stop).toEqual(150);
    });

    test('have the same mapContig positions', () => {
      expect(cgv.features(2).mapStart).toEqual(130);
      expect(cgv.features(2).mapStop).toEqual(150);
    });

    test('will belong to the mapContig', () => {
      expect(cgv.features(1).contig).toEqual(cgv.sequence.mapContig);
      expect(cgv.features(2).contig).toEqual(cgv.sequence.mapContig);
    });

    test('will NOT move with the contigs', () => {
      cgv.contigs(2).move(0);
      expect(cgv.features(2).start).toEqual(130);
      expect(cgv.features(2).stop).toEqual(150);
      expect(cgv.features(2).mapStart).toEqual(130);
      expect(cgv.features(2).mapStop).toEqual(150);
      expect(cgv.features(2).contig).toEqual(cgv.sequence.mapContig);
    });

    test('can be moved to a contig', () => {
      const feature = cgv.features(2);
      feature.moveToContig();
      expect(feature.contig.cgvID).toEqual(cgv.contigs(2).cgvID);
      expect(feature.start).toEqual(30);
      expect(feature.stop).toEqual(50);
      expect(feature.mapStart).toEqual(130);
      expect(feature.mapStop).toEqual(150);
    });

  });

});


