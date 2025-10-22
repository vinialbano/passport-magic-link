import { lookup } from '../lookup.js'

describe('Lookup', () => {
  test('returns undefined when the object is not valid', () => {
    expect(lookup(null, '')).toBeUndefined()
    expect(lookup(undefined, '')).toBeUndefined()
    expect(lookup({}, '')).toBeUndefined()
  })

  test('returns the value when a field is found in the object', () => {
    expect(lookup({ field: 'value' }, 'field')).toBe('value')
    expect(lookup({ field: ['arrayValue'] }, 'field')).toEqual(
      expect.arrayContaining(['arrayValue'])
    )
    expect(
      lookup({ field: { innerField: 'innerValue' } }, 'field')
    ).toMatchObject({
      innerField: 'innerValue'
    })
  })

  test('returns a nested field when the field is an object or array', () => {
    expect(
      lookup({ field: { innerField: 'innerValue' } }, 'field[innerField]')
    ).toBe('innerValue')

    expect(lookup({ field: ['arrayValue'] }, 'field[0]')).toBe('arrayValue')
  })
})
