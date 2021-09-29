import Viewer from '../src/Viewer';

describe('LegendItem', () => {

  beforeAll(() => {
    // Set up document body to have a div for the map
    document.body.innerHTML = '<div id="map"></div>';
  });

  beforeEach(() => {
    cgv = new Viewer('#map');
    // Turn off console.log
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('findLegendItemByName', () => {

    test('will find blank name', () => {
      const item_1 = cgv.legend.addItems({name: ''})[0];
      expect(item_1.name).toBe('');
      const item_2 = cgv.legend.findLegendItemByName('');
      expect(item_1.name).toBe(item_2.name);
    });

  });

  // describe('findLegendItemOrCreate', () => {
  // });

});


