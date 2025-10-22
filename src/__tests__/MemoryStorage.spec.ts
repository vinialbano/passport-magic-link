import { MemoryStorage } from '../MemoryStorage.js'
describe('MemoryStorage', () => {
  const storage = new MemoryStorage()
  test('storage API', () => {
    ;(['get', 'set', 'delete'] as const).forEach(method => {
      expect(storage[method]).toBeInstanceOf(Function)
    })
  })

  test('storage set/get', async () => {
    await storage.set('abc', { value: 123 })
    await storage.set('another', { value: 456 })
    const found = await storage.get('abc')
    expect(found).toEqual({ value: 123 })
  })

  test('storage delete/get', async () => {
    await storage.delete('abc')
    const abc = await storage.get('abc')
    const another = await storage.get('another')
    expect(abc).toBeUndefined()
    expect(another).toEqual({ value: 456 })
  })
})
