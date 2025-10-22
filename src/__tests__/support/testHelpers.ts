/* istanbul ignore file */

import { use } from 'chai'
import chaiPassportStrategy, {
  ChaiPassportStrategy,
  ExpressMiddleware
} from 'chai-passport-strategy'
import jwt from 'jsonwebtoken'
import {
  MagicLinkAuthenticateOptions,
  MagicLinkOptions,
  MagicLinkStrategy,
  User
} from '../../Strategy.js'
import { testOptions, testUsers } from './fixtures.js'
import { createMockSendToken, createMockVerifyUser } from './mockFactories.js'

// Chai Passport Strategy setup
export const { passport: testPassport } = use(
  chaiPassportStrategy
) as ReturnType<typeof use> &
  ChaiPassportStrategy<User, MagicLinkAuthenticateOptions>

// Simplified test execution helpers
export const testStrategySuccess = (
  strategy: MagicLinkStrategy,
  requestSetup: ExpressMiddleware,
  options: MagicLinkAuthenticateOptions = { action: 'acceptToken' }
): Promise<{ user: User; token?: string }> => {
  return new Promise((resolve, reject) => {
    testPassport
      .use(strategy)
      .request(requestSetup)
      .success((user: User) => {
        resolve({ user })
      })
      .fail((challenge: string) => {
        reject(new Error(`Test expected success but failed with: ${challenge}`))
      })
      .error((error: Error) => {
        reject(error)
      })
      .authenticate(options)
  })
}

export const testStrategyFailure = (
  strategy: MagicLinkStrategy,
  requestSetup: ExpressMiddleware,
  options: MagicLinkAuthenticateOptions = {}
): Promise<{ challenge: string; code?: number }> => {
  return new Promise((resolve, reject) => {
    testPassport
      .use(strategy)
      .request(requestSetup)
      .success((user: User) => {
        reject(
          new Error(
            `Test expected failure but succeeded with user: ${JSON.stringify(user)}`
          )
        )
      })
      .fail((challenge: string, code?: number) => {
        resolve({ challenge, code })
      })
      .error((error: Error) => {
        reject(error)
      })
      .authenticate(options)
  })
}

export const testStrategyError = (
  strategy: MagicLinkStrategy,
  requestSetup: ExpressMiddleware,
  options: MagicLinkAuthenticateOptions = {}
): Promise<Error> => {
  return new Promise((resolve, reject) => {
    testPassport
      .use(strategy)
      .request(requestSetup)
      .success((user: User) => {
        reject(
          new Error(
            `Test expected error but succeeded with user: ${JSON.stringify(user)}`
          )
        )
      })
      .fail((challenge: string) => {
        reject(
          new Error(
            `Test expected error but failed with challenge: ${challenge}`
          )
        )
      })
      .error((error: Error) => {
        resolve(error)
      })
      .authenticate(options)
  })
}

export const testStrategyPass = (
  strategy: MagicLinkStrategy,
  requestSetup: ExpressMiddleware,
  options: MagicLinkAuthenticateOptions = {}
): Promise<void> => {
  return new Promise((resolve, reject) => {
    testPassport
      .use(strategy)
      .request(requestSetup)
      .success((user: User) => {
        reject(
          new Error(
            `Test expected pass but succeeded with user: ${JSON.stringify(user)}`
          )
        )
      })
      .fail((challenge: string) => {
        reject(
          new Error(
            `Test expected pass but failed with challenge: ${challenge}`
          )
        )
      })
      .error((error: Error) => {
        reject(error)
      })
      .pass(() => {
        resolve()
      })
      .authenticate(options)
  })
}

/**
 * Enhanced Strategy Creation Helpers
 */

// Enhanced strategy creation that matches the makeStrategy pattern used in tests
export const createTestStrategy = (
  options: Partial<MagicLinkOptions> = {},
  sendToken = createMockSendToken(),
  verifyUser = createMockVerifyUser(testUsers.valid)
): MagicLinkStrategy => {
  options.secret ??= 'top-secret'
  return new MagicLinkStrategy(
    { ...testOptions.minimal, ...options },
    sendToken,
    verifyUser
  )
}

// JWT token creation helper (unifies createValidToken patterns)
export const createValidToken = (
  user: User = testUsers.valid,
  secret: string = 'top-secret',
  options: Record<string, unknown> = {}
): string => {
  return jwt.sign({ user }, secret, { expiresIn: '10m', ...options })
}

export const createExpiredToken = (
  user: User = testUsers.valid,
  secret: string = 'top-secret'
): string => {
  return jwt.sign({ user }, secret, { expiresIn: '-1m' })
}
