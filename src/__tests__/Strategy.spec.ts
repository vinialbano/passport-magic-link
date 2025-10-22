import { MemoryStorage } from '../MemoryStorage.js'
import { MagicLinkStrategy } from '../Strategy.js'

describe('MagicLinkStrategy - Validation', () => {
  const validOptions = {
    secret: 'test-secret',
    userFields: ['email'],
    tokenField: 'token',
    ttl: 600
  }

  const sendToken = async () => {}
  const verifyUser = async () => ({ email: 'test@example.com' })

  describe('Constructor Validation', () => {
    it('should throw error if secret is missing (undefined)', () => {
      const optionsWithoutSecret = { ...validOptions }
      delete (optionsWithoutSecret as Partial<typeof validOptions>).secret
      expect(
        () => new MagicLinkStrategy(optionsWithoutSecret, sendToken, verifyUser)
      ).toThrow(
        'Magic Link authentication strategy requires an encryption secret'
      )
    })

    it('should throw error if secret is empty string', () => {
      expect(
        () =>
          new MagicLinkStrategy(
            { ...validOptions, secret: '' },
            sendToken,
            verifyUser
          )
      ).toThrow(
        'Magic Link authentication strategy requires an encryption secret'
      )
    })

    it('should throw error if secret is only whitespace', () => {
      expect(
        () =>
          new MagicLinkStrategy(
            { ...validOptions, secret: '   ' },
            sendToken,
            verifyUser
          )
      ).toThrow('Secret cannot be empty')
    })

    it('should throw error if userFields is empty array', () => {
      expect(
        () =>
          new MagicLinkStrategy(
            { ...validOptions, userFields: [] },
            sendToken,
            verifyUser
          )
      ).toThrow(
        'Magic Link authentication strategy requires an array of mandatory user fields'
      )
    })

    it('should throw error if userFields contains empty string', () => {
      expect(
        () =>
          new MagicLinkStrategy(
            { ...validOptions, userFields: ['email', ''] },
            sendToken,
            verifyUser
          )
      ).toThrow('User fields cannot contain empty values')
    })

    it('should throw error if userFields contains whitespace-only string', () => {
      expect(
        () =>
          new MagicLinkStrategy(
            { ...validOptions, userFields: ['email', '   '] },
            sendToken,
            verifyUser
          )
      ).toThrow('User fields cannot contain empty values')
    })

    it('should throw error if tokenField is missing', () => {
      expect(
        () =>
          new MagicLinkStrategy(
            { ...validOptions, tokenField: '' },
            sendToken,
            verifyUser
          )
      ).toThrow('Magic Link authentication strategy requires a token field')
    })

    it('should throw error if sendToken is null', () => {
      expect(
        () => new MagicLinkStrategy(validOptions, null as never, verifyUser)
      ).toThrow(
        'Magic Link authentication strategy requires a sendToken function'
      )
    })

    it('should throw error if verifyUser is null', () => {
      expect(
        () => new MagicLinkStrategy(validOptions, sendToken, null as never)
      ).toThrow(
        'Magic Link authentication strategy requires a verifyUser function'
      )
    })

    it('should throw error if TTL is less than 1 second', () => {
      expect(
        () =>
          new MagicLinkStrategy(
            { ...validOptions, ttl: 0 },
            sendToken,
            verifyUser
          )
      ).toThrow('TTL must be at least 1 second')
    })

    it('should throw error if TTL is greater than 24 hours', () => {
      expect(
        () =>
          new MagicLinkStrategy(
            { ...validOptions, ttl: 86401 },
            sendToken,
            verifyUser
          )
      ).toThrow('TTL cannot exceed 86400 seconds (24 hours)')
    })
  })

  describe('Configuration Options', () => {
    it('should accept valid minimum TTL (1 second)', () => {
      expect(
        () =>
          new MagicLinkStrategy(
            { ...validOptions, ttl: 1 },
            sendToken,
            verifyUser
          )
      ).not.toThrow()
    })

    it('should accept valid maximum TTL (24 hours)', () => {
      expect(
        () =>
          new MagicLinkStrategy(
            { ...validOptions, ttl: 86400 },
            sendToken,
            verifyUser
          )
      ).not.toThrow()
    })

    it('should accept custom storage', () => {
      const customStorage = new MemoryStorage()
      expect(
        () =>
          new MagicLinkStrategy(
            { ...validOptions, storage: customStorage },
            sendToken,
            verifyUser
          )
      ).not.toThrow()
    })

    it('should accept custom algorithm', () => {
      expect(
        () =>
          new MagicLinkStrategy(
            { ...validOptions, algorithm: 'HS512' },
            sendToken,
            verifyUser
          )
      ).not.toThrow()
    })

    it('should accept allowPost option', () => {
      expect(
        () =>
          new MagicLinkStrategy(
            { ...validOptions, allowPost: false },
            sendToken,
            verifyUser
          )
      ).not.toThrow()
    })

    it('should accept passReqToCallbacks option', () => {
      expect(
        () =>
          new MagicLinkStrategy(
            { ...validOptions, passReqToCallbacks: true } as never,
            sendToken as never,
            verifyUser as never
          )
      ).not.toThrow()
    })

    it('should accept verifyUserAfterToken option', () => {
      expect(
        () =>
          new MagicLinkStrategy(
            { ...validOptions, verifyUserAfterToken: true },
            sendToken,
            verifyUser
          )
      ).not.toThrow()
    })
  })

  describe('Strategy Name', () => {
    it('should have name "magiclink"', () => {
      const strategy = new MagicLinkStrategy(
        validOptions,
        sendToken,
        verifyUser
      )
      expect(strategy.name).toBe('magiclink')
    })
  })
})
