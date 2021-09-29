import Viewer from '../src/Viewer';

describe('Contig', () => {

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

  describe('isMapContig', () => {

    test('returns true if it is the map contig', () => {
      expect(cgv.sequence.mapContig.isMapContig).toBe(true)
    });

    test('returns false if it is not the map contig', () => {
      expect(cgv.contigs(1).isMapContig).toBe(false)
    });


  });

});


