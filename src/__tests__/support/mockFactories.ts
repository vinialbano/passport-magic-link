/* istanbul ignore file */

import { SendToken, User, VerifyUser } from '../../Strategy.js'
/**
 * Mock factory functions for Strategy tests
 */

// Use the actual exported types from Strategy
export type MockSendToken = jest.MockedFunction<SendToken>
export type MockVerifyUser = jest.MockedFunction<VerifyUser>

let capturedToken: string | null = null

export const createMockSendToken = (): MockSendToken => {
  return jest
    .fn()
    .mockImplementation(async (...args: Parameters<SendToken>) => {
      // Mock implementation captures token for test verification
      capturedToken = args.length === 3 ? args[2] : args[1]
      return Promise.resolve()
    })
}

export const createMockVerifyUser = (
  returnValue: User | null = null
): MockVerifyUser => {
  return jest.fn().mockResolvedValue(returnValue)
}

// Helper to get captured token from mock
export const getCapturedToken = (): string | null => {
  return capturedToken
}

// Helper to clear captured token
export const clearCapturedToken = (): void => {
  capturedToken = null
}
