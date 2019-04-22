class MemoryStorage {
  constructor () {
    this.tokens = new Map()
  }

  async set (key, value) {
    return this.tokens.set(key, value)
  }

  async get (key) {
    return this.tokens.get(key)
  }

  async delete (key) {
    return this.tokens.delete(key)
  }
}

module.exports = new MemoryStorage()
