const lookup = require('../src/lookup')

describe('Lookup', () => {
  test('returns null when the object is not valid', () => {
    expect(lookup(null, '')).toBeNull()
    expect(lookup(undefined, '')).toBeNull()
    expect(lookup('', '')).toBeNull()
    expect(lookup(1, '')).toBeNull()
    expect(lookup({}, '')).toBeNull()
  })

  test('returns the value when a field is found in the object', () => {
    expect(lookup({
      field: 'value'
    }, 'field')).toBe('value')
    expect(lookup({
      field: ['arrayValue']
    }, 'field')).toEqual(expect.arrayContaining(['arrayValue']))
    expect(lookup({
      field: {
        innerField: 'innerValue'
      }
    }, 'field')).toMatchObject({
      innerField: 'innerValue'
    })
  })

  test('returns a nested field when the field is an object or array', () => {
    expect(lookup({
      field: {
        innerField: 'innerValue'
      }
    }, 'field[innerField]')).toBe('innerValue')

    expect(lookup({
      field: ['arrayValue']
    }, 'field[0]')).toBe('arrayValue')
  })
})
