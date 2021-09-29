import CGArray from '../src/CGArray';

describe('CGArray', () => {

  test('can be created', () => {
    const cga = new CGArray(1, 2, 3);
    expect(cga.length).toBe(3);
  });

  test('can init with 40010 item array', () => {
    const len = 40010;
    const a = new Array(len)
    const cga = new CGArray(a);
    expect(cga.length).toBe(len);
  });

  test('present', () => {
    let cga = new CGArray(1, 2, 3);
    expect(cga.present()).toBe(true);
    cga = new CGArray();
    expect(cga.present()).toBe(false);
  });

  test('empty', () => {
    let cga = new CGArray(1, 2, 3);
    expect(cga.empty()).toBe(false);
    cga = new CGArray();
    expect(cga.empty()).toBe(true);
  });

  test('remove: return array with elements removed', () => {
    const cga = new CGArray(1, 2, 3, 2);
    const cga2 = cga.remove(2);
    expect(cga2.length).toBe(2);
  });

  test('get(undefined): return entire array', () => {
    const cga = new CGArray(1, 2, 3, 4);
    expect(cga.get()).toBe(cga);
  });

  test('get(1): return first element', () => {
    const cga = new CGArray(1, 2, 3, 4);
    expect(cga.get(1)).toBe(cga[0]);
  });

  test('get("bob"): return first element with same name', () => {
    const cga = new CGArray({name: 'bob'}, {name: 'carl'}, {name: 'bob'});
    expect(cga.get('bob')).toBe(cga[0]);
  });

  test('get("unknown"): return undefined if nothing is found', () => {
    const cga = new CGArray({name: 'bob'}, {name: 'carl'}, {name: 'bob'});
    expect(cga.get('unknown')).toBe(undefined);
  });

  test('get(["bob"]): return all items with name bob', () => {
    const cga = new CGArray({name: 'bob'}, {name: 'carl'}, {name: 'bob'});
    expect(cga.get(["bob"]).length).toBe(2);
  });

  test('get(["bob", "carl"]): return all items with name bob', () => {
    const cga = new CGArray({name: 'bob'}, {name: 'carl'}, {name: 'bob'}, {name: 'simon'});
    expect(cga.get(["bob", "carl"]).length).toBe(3);
  });

  test('get(["unknown"]): return empty CGArray', () => {
    const cga = new CGArray({name: 'bob'}, {name: 'carl'}, {name: 'bob'}, {name: 'simon'});
    expect(cga.get(["unknown"]).length).toBe(0);
  });


  test('can be return as an Array', () => {
    const cga = new CGArray(1, 2, 3);
    expect(cga.constructor.name).toBe('CGArray')
    expect(cga.asArray().constructor.name).toBe('Array')
  });

});


