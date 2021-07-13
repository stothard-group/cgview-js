import Viewer from '../src/Viewer';
import IO from '../src/IO';

describe('IO', () => {

  beforeAll(() => {
    // Set up document body to have a div for the map
    document.body.innerHTML = '<div id="map"></div>';
  });

  beforeEach(() => {
    cgv = new Viewer('#map');
  });

  describe('loadJSON', () => {

    test('load JSON object literal', () => {
      const json = { cgview: { sequence: { length: 1234 } } };
      expect(cgv.sequence.length).toBe(1000); // The default
      cgv.io.loadJSON(json);
      expect(cgv.sequence.length).toBe(1234);
    });

    test('load JSON string', () => {
      const json = "{\"cgview\":{\"sequence\":{\"length\":1234}}}";
      expect(cgv.sequence.length).toBe(1000); // The default
      cgv.io.loadJSON(json);
      expect(cgv.sequence.length).toBe(1234);
    });

    test('throws an error if no "cgview" property present', () => {
      const json = { sequence: { length: 1234 } };
      expect( () => cgv.io.loadJSON(json) ).toThrow("No 'cgview' property found in JSON.");;
    });

  });

});


