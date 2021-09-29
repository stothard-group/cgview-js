import utils from '../src/Utils';

describe('Utils', () => {

  describe('uniqueName', () => {

    test('return original name if unique', () => {
      const allNames = ['Other', 'RNA'];
      const origName = 'CDS';
      const uniqueName = utils.uniqueName(origName, allNames);
      expect(uniqueName).toBe('CDS');
    });

    test('return new name if not unique', () => {
      const allNames = ['CDS', 'RNA'];
      const origName = 'CDS';
      const uniqueName = utils.uniqueName(origName, allNames);
      expect(uniqueName).toBe('CDS-2');
    });

    test('return blank name if empty', () => {
      const allNames = ['CDS', 'RNA'];
      const origName = '';
      const uniqueName = utils.uniqueName(origName, allNames);
      expect(uniqueName).toBe('');
    });

    test('return "-2" if blank name present', () => {
      const allNames = ['CDS', ''];
      const origName = '';
      const uniqueName = utils.uniqueName(origName, allNames);
      expect(uniqueName).toBe('-2');
    });

  });

});


