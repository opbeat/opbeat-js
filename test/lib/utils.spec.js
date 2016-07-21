var utils = require('../../src/lib/utils')

describe('lib/utils', function () {
  it('should merge objects', function () {
    var result = utils.merge({a: 'a'}, {b: 'b', a: 'b'})
    expect(result).toEqual(Object({a: 'b', b: 'b'}))

    var deepMerged = utils.merge({a: {c: 'c'}}, {b: 'b', a: {d: 'd'}})
    expect(deepMerged).toEqual(Object({a: Object({c: 'c', d: 'd'}), b: 'b'}))

    var a = {a: {c: 'c'}}
    deepMerged = utils.merge({}, a, {b: 'b', a: {d: 'd'}})
    expect(deepMerged).toEqual(Object({a: Object({c: 'c', d: 'd'}), b: 'b'}))
    expect(a).toEqual(Object({a: Object({c: 'c'})}))

    deepMerged = utils.merge({a: {c: 'c'}}, {b: 'b', a: 'b'})
    expect(deepMerged).toEqual(Object({a: 'b', b: 'b'}))

    deepMerged = utils.merge({a: {c: 'c'}}, {b: 'b', a: null})
    expect(deepMerged).toEqual(Object({a: null, b: 'b'}))

    deepMerged = utils.merge({a: null}, {b: 'b', a: null})
    expect(deepMerged).toEqual(Object({a: null, b: 'b'}))
  })
})
