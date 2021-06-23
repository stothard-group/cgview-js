import Viewer from '../src/Viewer';

describe('Viewer', () => {

  beforeAll(() => {
    // Set up document body to have a div for the map
    document.body.innerHTML = '<div id="map"></div>';
  });

  test('can be created', () => {
    const cgv = new Viewer('#map');
    expect(cgv.features().length).toBe(0);
  });

  test('can be created with a feature', () => {
    const feature = {start: 100, stop: 200};
    const cgv = new Viewer('#map', {features: [feature]});
    expect(cgv.features().length).toBe(1);
  });



});


