import { Request } from 'express'
import { MemoryStorage } from '../../MemoryStorage.js'
import { MagicLinkOptions } from '../../Strategy.js'
import { testUsers } from '../support/fixtures.js'
import {
  clearCapturedToken,
  createMockSendToken,
  createMockVerifyUser,
  getCapturedToken,
  MockSendToken,
  MockVerifyUser
} from '../support/mockFactories.js'
import {
  createTestStrategy,
  createValidToken,
  testStrategyError,
  testStrategyFailure,
  testStrategyPass,
  testStrategySuccess
} from '../support/testHelpers.js'

describe('MagicLinkStrategy - Integration Tests', () => {
  let sendToken: MockSendToken
  let verifyUser: MockVerifyUser

  beforeEach(() => {
    jest.clearAllMocks()
    clearCapturedToken()

    sendToken = createMockSendToken()
    verifyUser = createMockVerifyUser(testUsers.valid)
  })

  const makeStrategy = (opts: Partial<MagicLinkOptions> = {}) =>
    createTestStrategy(opts, sendToken, verifyUser)

  const setupRequest = (data: Record<string, unknown>) => {
    return (req: Request) => {
      req.body = { ...data }
    }
  }

  describe('action routing', () => {
    describe('default action behavior', () => {
      it('should call acceptToken as default action when no action specified', async () => {
        const strategy = makeStrategy({ verifyUserAfterToken: false })
        const validToken = createValidToken(testUsers.valid)

        const { user } = await testStrategySuccess(
          strategy,
          setupRequest({ token: validToken }),
          { action: undefined }
        )

        expect(user).toEqual(testUsers.valid)
        expect(verifyUser).not.toHaveBeenCalled() // verifyUserAfterToken=false
      })

      it('should return error for non-existing action', async () => {
        const strategy = makeStrategy()

        const error = await testStrategyError(
          strategy,
          setupRequest({ token: 'any' }),
          { action: 'invalidAction' as never }
        )

        expect(error.message).toBe('Unknown action')
      })
    })

    describe('explicit action routing', () => {
      it('should route to requestToken when action=requestToken', async () => {
        const strategy = makeStrategy()

        await testStrategyPass(strategy, setupRequest(testUsers.valid), {
          action: 'requestToken'
        })

        expect(verifyUser).toHaveBeenCalledWith(testUsers.valid)
        expect(sendToken).toHaveBeenCalledWith(
          testUsers.valid,
          getCapturedToken()
        )
      })

      it('should route to acceptToken when action=acceptToken', async () => {
        const strategy = makeStrategy({ verifyUserAfterToken: false })
        const validToken = createValidToken(testUsers.valid)

        const { user } = await testStrategySuccess(
          strategy,
          setupRequest({ token: validToken }),
          { action: 'acceptToken' }
        )

        expect(user).toEqual(testUsers.valid)
      })
    })
  })

  describe('runtime options', () => {
    describe('allowReuse option', () => {
      it('should prevent token reuse by default', async () => {
        const storage = new MemoryStorage()
        const strategy = makeStrategy({ storage, verifyUserAfterToken: true })

        // Generate token
        await testStrategyPass(strategy, setupRequest(testUsers.valid), {
          action: 'requestToken'
        })

        const validToken = getCapturedToken()!

        // First use should succeed
        await testStrategySuccess(
          strategy,
          setupRequest({ token: validToken }),
          { action: 'acceptToken' }
        )

        // Second use should fail
        const { challenge } = await testStrategyFailure(
          strategy,
          setupRequest({ token: validToken }),
          { action: 'acceptToken' }
        )

        expect(challenge).toBe('Token was already used')
      })

      it('should allow token reuse when allowReuse=true', async () => {
        const storage = new MemoryStorage()
        const strategy = makeStrategy({ storage, verifyUserAfterToken: true })

        // Generate token
        await testStrategyPass(strategy, setupRequest(testUsers.valid), {
          action: 'requestToken'
        })

        const validToken = getCapturedToken()!

        // First use
        await testStrategySuccess(
          strategy,
          setupRequest({ token: validToken }),
          { action: 'acceptToken' }
        )

        // Second use with allowReuse=true should succeed
        const { user } = await testStrategySuccess(
          strategy,
          setupRequest({ token: validToken }),
          { action: 'acceptToken', allowReuse: true }
        )

        expect(user).toEqual(testUsers.valid)
      })
    })

    describe('custom messages', () => {
      it('should use custom tokenAlreadyUsedMessage', async () => {
        const storage = new MemoryStorage()
        const strategy = makeStrategy({ storage, verifyUserAfterToken: true })
        const customMessage =
          'This magic link has expired. Please request a new one.'

        // Generate and use token
        await testStrategyPass(strategy, setupRequest(testUsers.valid), {
          action: 'requestToken'
        })

        const validToken = getCapturedToken()!

        await testStrategySuccess(
          strategy,
          setupRequest({ token: validToken }),
          { action: 'acceptToken' }
        )

        // Second use with custom message
        const { challenge } = await testStrategyFailure(
          strategy,
          setupRequest({ token: validToken }),
          { action: 'acceptToken', tokenAlreadyUsedMessage: customMessage }
        )

        expect(challenge).toBe(customMessage)
      })

      it('should use custom authMessage when user verification fails', async () => {
        verifyUser.mockResolvedValueOnce(null)
        const strategy = makeStrategy({ verifyUserAfterToken: true })
        const validToken = createValidToken(testUsers.valid)
        const customMessage = 'User account not found or disabled'

        const { challenge } = await testStrategyFailure(
          strategy,
          setupRequest({ token: validToken }),
          { action: 'acceptToken', authMessage: customMessage }
        )

        expect(challenge).toBe(customMessage)
      })
    })

    describe('userPrimaryKey option', () => {
      it('should use userPrimaryKey for storage keying', async () => {
        const storage = new MemoryStorage()
        const strategy = makeStrategy({ storage, verifyUserAfterToken: false })
        const userWithId = { ...testUsers.valid, id: 'user-123' }
        const validToken = createValidToken(userWithId)

        const { user } = await testStrategySuccess(
          strategy,
          setupRequest({ token: validToken }),
          { action: 'acceptToken', userPrimaryKey: 'id' }
        )

        expect(user).toEqual(userWithId)

        // Verify storage used the id as key
        const storedTokens = await storage.get('user-123')
        expect(storedTokens).toBeDefined()
        expect(storedTokens![validToken]).toBeDefined()
      })

      it('should default to email when userPrimaryKey not specified', async () => {
        const storage = new MemoryStorage()
        const strategy = makeStrategy({ storage, verifyUserAfterToken: false })
        const validToken = createValidToken(testUsers.valid)

        await testStrategySuccess(
          strategy,
          setupRequest({ token: validToken }),
          { action: 'acceptToken' }
        )

        // Verify storage used email as default key
        const storedTokens = await storage.get(testUsers.valid.email)
        expect(storedTokens).toBeDefined()
        expect(storedTokens![validToken]).toBeDefined()
      })
    })
  })

  describe('end-to-end authentication flow', () => {
    describe('complete flow without verifyUserAfterToken', () => {
      it('should complete full authentication cycle', async () => {
        const storage = new MemoryStorage()
        const strategy = makeStrategy({
          storage,
          verifyUserAfterToken: false,
          passReqToCallbacks: false
        })

        // Step 1: User requests magic link
        await testStrategyPass(strategy, setupRequest(testUsers.valid), {
          action: 'requestToken'
        })

        expect(verifyUser).toHaveBeenCalledWith(testUsers.valid)
        const token = getCapturedToken()
        expect(token).toBeTruthy()
        expect(sendToken).toHaveBeenCalledWith(testUsers.valid, token)

        // Step 2: User clicks magic link and gets authenticated
        const { user } = await testStrategySuccess(
          strategy,
          setupRequest({ token }),
          { action: 'acceptToken' }
        )

        expect(user).toEqual(testUsers.valid)

        // Step 3: Token should be marked as used
        const { challenge } = await testStrategyFailure(
          strategy,
          setupRequest({ token }),
          { action: 'acceptToken' }
        )

        expect(challenge).toBe('Token was already used')
      })
    })

    describe('complete flow with verifyUserAfterToken', () => {
      it('should complete full authentication cycle with deferred verification', async () => {
        const storage = new MemoryStorage()
        const strategy = makeStrategy({
          storage,
          verifyUserAfterToken: true,
          passReqToCallbacks: false
        })

        // Step 1: User requests magic link (no user verification yet)
        await testStrategyPass(strategy, setupRequest(testUsers.valid), {
          action: 'requestToken'
        })

        expect(verifyUser).not.toHaveBeenCalled() // Deferred
        const token = getCapturedToken()
        expect(sendToken).toHaveBeenCalledWith(testUsers.valid, token)

        // Step 2: User clicks magic link and gets authenticated (verify now)
        const { user } = await testStrategySuccess(
          strategy,
          setupRequest({ token }),
          { action: 'acceptToken' }
        )

        expect(verifyUser).toHaveBeenCalledWith(testUsers.valid)
        expect(user).toEqual(testUsers.valid)
      })
    })

    describe('complete flow with passReqToCallbacks', () => {
      it('should pass request object to all callbacks', async () => {
        const storage = new MemoryStorage()
        const strategy = makeStrategy({
          storage,
          verifyUserAfterToken: false,
          passReqToCallbacks: true
        })

        // Step 1: Request token with req passed to callbacks
        const requestSetup = (req: Request) => {
          req.body = testUsers.valid
          req.headers = { 'user-agent': 'test-browser' }
        }

        await testStrategyPass(strategy, requestSetup, {
          action: 'requestToken'
        })

        expect(verifyUser).toHaveBeenCalledWith(
          expect.objectContaining({
            body: testUsers.valid,
            headers: expect.objectContaining({ 'user-agent': 'test-browser' })
          }),
          testUsers.valid
        )

        const token = getCapturedToken()
        expect(sendToken).toHaveBeenCalledWith(
          expect.objectContaining({
            body: testUsers.valid
          }),
          testUsers.valid,
          token
        )

        // Step 2: Accept token with req passed to callbacks
        const { user } = await testStrategySuccess(
          strategy,
          setupRequest({ token }),
          { action: 'acceptToken' }
        )

        expect(user).toEqual(testUsers.valid)
      })
    })

    describe('error handling throughout flow', () => {
      it('should handle user verification failure in request phase', async () => {
        verifyUser.mockResolvedValueOnce(null)
        const strategy = makeStrategy({ verifyUserAfterToken: false })

        const { challenge } = await testStrategyFailure(
          strategy,
          setupRequest(testUsers.valid),
          { action: 'requestToken' }
        )

        expect(challenge).toBe('No user found')
        expect(sendToken).not.toHaveBeenCalled()
      })

      it('should handle token delivery failure', async () => {
        sendToken.mockRejectedValueOnce(new Error('Email service down'))
        const strategy = makeStrategy({ verifyUserAfterToken: false })

        const error = await testStrategyError(
          strategy,
          setupRequest(testUsers.valid),
          { action: 'requestToken' }
        )

        expect(error.message).toBe('Authentication failed')
      })

      it('should handle invalid token in accept phase', async () => {
        const strategy = makeStrategy()

        const { challenge } = await testStrategyFailure(
          strategy,
          setupRequest({ token: 'invalid.token.here' }),
          { action: 'acceptToken' }
        )

        expect(challenge).toBe('Invalid token')
      })

      it('should handle user verification failure in accept phase when verifyUserAfterToken=true', async () => {
        const strategy = makeStrategy({ verifyUserAfterToken: true })
        const validToken = createValidToken(testUsers.valid)
        verifyUser.mockResolvedValueOnce(null)

        const { challenge } = await testStrategyFailure(
          strategy,
          setupRequest({ token: validToken }),
          { action: 'acceptToken' }
        )

        expect(challenge).toBe('No user found')
      })
    })

    describe('security throughout flow', () => {
      it('should prevent token reuse across the entire flow', async () => {
        const storage = new MemoryStorage()
        const strategy = makeStrategy({ storage, verifyUserAfterToken: true })

        // Complete flow once
        await testStrategyPass(strategy, setupRequest(testUsers.valid), {
          action: 'requestToken'
        })

        const token = getCapturedToken()!

        await testStrategySuccess(strategy, setupRequest({ token }), {
          action: 'acceptToken'
        })

        // Attempt to reuse should fail
        const { challenge } = await testStrategyFailure(
          strategy,
          setupRequest({ token }),
          { action: 'acceptToken' }
        )

        expect(challenge).toBe('Token was already used')
      })

      it('should clean up expired tokens during flow', async () => {
        const storage = new MemoryStorage()
        const strategy = makeStrategy({ storage, verifyUserAfterToken: false })

        // Create and store an expired token manually
        const expiredToken = createValidToken(testUsers.valid, 'top-secret', {
          expiresIn: '-1h'
        })
        await storage.set(testUsers.valid.email, {
          [expiredToken]: Date.now() - 3600000
        })

        // Use a new valid token - should trigger cleanup
        const validToken = createValidToken(testUsers.valid)

        await testStrategySuccess(
          strategy,
          setupRequest({ token: validToken }),
          { action: 'acceptToken' }
        )

        // Verify expired token was cleaned up
        const storedTokens = await storage.get(testUsers.valid.email)
        expect(storedTokens![expiredToken]).toBeUndefined()
        expect(storedTokens![validToken]).toBeDefined()
      })
    })

    describe('storage integration', () => {
      it('should work with custom storage implementation', async () => {
        const customStorage = {
          get: jest.fn().mockResolvedValue({}),
          set: jest.fn().mockResolvedValue(undefined),
          delete: jest.fn().mockResolvedValue(undefined)
        }

        const strategy = makeStrategy({
          storage: customStorage,
          verifyUserAfterToken: false
        })

        // Request token
        await testStrategyPass(strategy, setupRequest(testUsers.valid), {
          action: 'requestToken'
        })

        const token = getCapturedToken()!

        // Accept token
        const { user } = await testStrategySuccess(
          strategy,
          setupRequest({ token }),
          { action: 'acceptToken' }
        )

        expect(user).toEqual(testUsers.valid)
        expect(customStorage.get).toHaveBeenCalled()
        expect(customStorage.set).toHaveBeenCalled()
      })
    })
  })
})
