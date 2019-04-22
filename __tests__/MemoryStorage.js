const storage = require('../src/MemoryStorage')

test('storage API', () => {
  ['get', 'set', 'delete'].forEach(method => {
    expect(storage[method]).toBeInstanceOf(Function)
  })
})

test('storage set/get', async () => {
  storage.set('abc', 123)
  storage.set('another', 'foo')
  const found = await storage.get('abc')
  expect(found).toBe(123)
})

test('storage delete/get', async () => {
  await storage.delete('abc')
  const abc = await storage.get('abc')
  const another = await storage.get('another')
  expect(abc).toBeUndefined()
  expect(another).toBe('foo')
})
