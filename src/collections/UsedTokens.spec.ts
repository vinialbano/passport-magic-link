import { UsedTokens } from './UsedTokens.js'

describe('UsedTokens', () => {
  describe('constructor', () => {
    it('should create empty collection with no record', () => {
      const usedTokens = new UsedTokens()

      expect(usedTokens.toRecord()).toEqual({})
    })

    it('should create empty collection with empty record', () => {
      const usedTokens = new UsedTokens({})

      expect(usedTokens.toRecord()).toEqual({})
    })

    it('should load tokens from record', () => {
      const record = {
        token1: 1000000,
        token2: 2000000
      }
      const usedTokens = new UsedTokens(record)

      expect(usedTokens.hasBeenUsed('token1')).toBe(true)
      expect(usedTokens.hasBeenUsed('token2')).toBe(true)
    })

    it('should preserve milliseconds timestamps', () => {
      const record = { token1: 5000000 }
      const usedTokens = new UsedTokens(record)

      const result = usedTokens.toRecord()
      expect(result.token1).toBe(5000000)
    })

    it('should handle multiple tokens', () => {
      const record = {
        token1: 1000000,
        token2: 2000000,
        token3: 3000000
      }
      const usedTokens = new UsedTokens(record)

      expect(usedTokens.hasBeenUsed('token1')).toBe(true)
      expect(usedTokens.hasBeenUsed('token2')).toBe(true)
      expect(usedTokens.hasBeenUsed('token3')).toBe(true)
    })
  })

  describe('hasBeenUsed', () => {
    it('should return false for new token', () => {
      const usedTokens = new UsedTokens()

      expect(usedTokens.hasBeenUsed('new-token')).toBe(false)
    })

    it('should return true for used token', () => {
      const usedTokens = new UsedTokens()
      usedTokens.markAsUsed('used-token', 1000)

      expect(usedTokens.hasBeenUsed('used-token')).toBe(true)
    })

    it('should return false for different token', () => {
      const usedTokens = new UsedTokens()
      usedTokens.markAsUsed('token-a', 1000)

      expect(usedTokens.hasBeenUsed('token-b')).toBe(false)
    })

    it('should be case-sensitive', () => {
      const usedTokens = new UsedTokens()
      usedTokens.markAsUsed('Token', 1000)

      expect(usedTokens.hasBeenUsed('token')).toBe(false)
      expect(usedTokens.hasBeenUsed('Token')).toBe(true)
    })
  })

  describe('markAsUsed', () => {
    it('should add token to collection', () => {
      const usedTokens = new UsedTokens()

      usedTokens.markAsUsed('new-token', 1000)

      expect(usedTokens.hasBeenUsed('new-token')).toBe(true)
    })

    it('should store token with correct expiration in milliseconds', () => {
      const usedTokens = new UsedTokens()

      usedTokens.markAsUsed('token-with-exp', 5000)

      const record = usedTokens.toRecord()
      expect(record['token-with-exp']).toBe(5000000)
    })

    it('should overwrite existing token', () => {
      const usedTokens = new UsedTokens()

      usedTokens.markAsUsed('same-token', 1000)
      usedTokens.markAsUsed('same-token', 2000)

      const record = usedTokens.toRecord()
      expect(record['same-token']).toBe(2000000)
    })

    it('should handle multiple tokens with different expirations', () => {
      const usedTokens = new UsedTokens()

      usedTokens.markAsUsed('token1', 1000)
      usedTokens.markAsUsed('token2', 2000)
      usedTokens.markAsUsed('token3', 3000)

      const record = usedTokens.toRecord()
      expect(record.token1).toBe(1000000)
      expect(record.token2).toBe(2000000)
      expect(record.token3).toBe(3000000)
    })
  })

  describe('removeExpiredTokens', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should remove expired tokens', () => {
      const now = Date.now()
      jest.setSystemTime(now)

      const usedTokens = new UsedTokens()
      // Store expirations in milliseconds directly in the record
      const pastExpirationSeconds = Math.floor((now - 10000) / 1000)
      const futureExpirationSeconds = Math.floor((now + 10000) / 1000)

      usedTokens.markAsUsed('expired-token', pastExpirationSeconds)
      usedTokens.markAsUsed('valid-token', futureExpirationSeconds)

      usedTokens.removeExpiredTokens()

      expect(usedTokens.hasBeenUsed('expired-token')).toBe(false)
      expect(usedTokens.hasBeenUsed('valid-token')).toBe(true)
    })

    it('should keep non-expired tokens', () => {
      const now = Date.now()
      jest.setSystemTime(now)

      const usedTokens = new UsedTokens()
      const futureExpirationSeconds = Math.floor((now + 60000) / 1000)

      usedTokens.markAsUsed('future-token', futureExpirationSeconds)
      usedTokens.removeExpiredTokens()

      expect(usedTokens.hasBeenUsed('future-token')).toBe(true)
    })

    it('should remove multiple expired tokens', () => {
      const now = Date.now()
      jest.setSystemTime(now)

      const usedTokens = new UsedTokens()
      const pastExp1Seconds = Math.floor((now - 5000) / 1000)
      const pastExp2Seconds = Math.floor((now - 10000) / 1000)
      const futureExpSeconds = Math.floor((now + 5000) / 1000)

      usedTokens.markAsUsed('expired1', pastExp1Seconds)
      usedTokens.markAsUsed('expired2', pastExp2Seconds)
      usedTokens.markAsUsed('valid', futureExpSeconds)

      usedTokens.removeExpiredTokens()

      expect(usedTokens.hasBeenUsed('expired1')).toBe(false)
      expect(usedTokens.hasBeenUsed('expired2')).toBe(false)
      expect(usedTokens.hasBeenUsed('valid')).toBe(true)
    })

    it('should handle empty collection', () => {
      const usedTokens = new UsedTokens()

      expect(() => usedTokens.removeExpiredTokens()).not.toThrow()
      expect(usedTokens.toRecord()).toEqual({})
    })

    it('should handle collection with all expired tokens', () => {
      const now = Date.now()
      jest.setSystemTime(now)

      const usedTokens = new UsedTokens()
      const pastExpSeconds = Math.floor((now - 1000) / 1000)

      usedTokens.markAsUsed('expired1', pastExpSeconds)
      usedTokens.markAsUsed('expired2', pastExpSeconds)

      usedTokens.removeExpiredTokens()

      expect(usedTokens.toRecord()).toEqual({})
    })
  })

  describe('toRecord', () => {
    it('should convert to storage format with milliseconds', () => {
      const usedTokens = new UsedTokens()

      usedTokens.markAsUsed('token1', 1000)

      const record = usedTokens.toRecord()
      expect(record).toEqual({ token1: 1000000 })
    })

    it('should use milliseconds for timestamps', () => {
      const usedTokens = new UsedTokens()

      usedTokens.markAsUsed('token', 5)

      const record = usedTokens.toRecord()
      expect(record.token).toBe(5000)
    })

    it('should return empty object for empty collection', () => {
      const usedTokens = new UsedTokens()

      expect(usedTokens.toRecord()).toEqual({})
    })

    it('should convert multiple tokens', () => {
      const usedTokens = new UsedTokens()

      usedTokens.markAsUsed('token1', 100)
      usedTokens.markAsUsed('token2', 200)

      const record = usedTokens.toRecord()
      expect(record).toEqual({
        token1: 100000,
        token2: 200000
      })
    })

    it('should be reversible with constructor', () => {
      const original = new UsedTokens()

      original.markAsUsed('token1', 1000)
      original.markAsUsed('token2', 2000)

      const record = original.toRecord()
      const restored = new UsedTokens(record)

      expect(restored.hasBeenUsed('token1')).toBe(true)
      expect(restored.hasBeenUsed('token2')).toBe(true)
      expect(restored.toRecord()).toEqual(record)
    })
  })
})
