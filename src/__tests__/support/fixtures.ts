/* istanbul ignore file */

import { User } from '../../Strategy.js'

/**
 * Test data factories and fixtures for Strategy tests
 */
export interface TestUser extends User {
  email: string
  name: string
  role?: string
}

export const testUsers = {
  valid: {
    email: 'john@doe.com',
    name: 'John Doe'
  } as TestUser,

  withRole: {
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin'
  } as TestUser,

  missingFields: {
    name: 'Incomplete User'
    // Missing required email field
  } as Partial<TestUser>,

  notFound: {
    email: 'notfound@example.com',
    name: 'Not Found User'
  } as TestUser
} as const

export const testOptions = {
  minimal: {
    secret: 'top-secret',
    userFields: ['email', 'name'] as string[],
    tokenField: 'token'
  },

  withPassReq: {
    secret: 'top-secret',
    userFields: ['email', 'name'] as string[],
    tokenField: 'token',
    passReqToCallbacks: true
  },

  withVerifyAfter: {
    secret: 'top-secret',
    userFields: ['email', 'name'] as string[],
    tokenField: 'token',
    verifyUserAfterToken: true
  },

  withAllOptions: {
    secret: 'top-secret',
    userFields: ['email', 'name'] as string[],
    tokenField: 'token',
    ttl: 600,
    allowPost: true,
    passReqToCallbacks: true,
    verifyUserAfterToken: false
  }
} as const

export interface TestRequestData {
  [key: string]: unknown
  email?: string
  name?: string
  token?: string
}

export interface TestTokenData {
  token: string
}

export const testRequestData = {
  validUser: {
    email: 'john@doe.com',
    name: 'John Doe'
  } as TestRequestData,

  missingEmail: {
    name: 'John Doe'
  } as TestRequestData,

  validToken: {
    token: 'valid-jwt-token'
  } as TestTokenData,

  invalidToken: {
    token: 'invalid-token'
  } as TestTokenData
} as const
