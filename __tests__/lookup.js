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
      field: {
        innerField: 'innerValue'
      }
    }, 'field[innerField]')).toBe('innerValue')
  })

  test('returns null when the field is an object or array', () => {
    expect(lookup({
      field: {
        innerField: 'innerValue'
      }
    }, 'field')).toBeNull()

    expect(lookup({
      field: ['oi']
    }, 'field')).toBeNull()
  })
})
