declare module 'chai-passport-strategy' {
  import { use } from 'chai'
  import { NextFunction, Request, Response } from 'express'
  import { Strategy } from 'passport-strategy'

  export interface ChaiPassportStrategy<User, AuthenticateOptions> {
    passport: {
      use: (strategy: Strategy) => TestPassport<User, AuthenticateOptions>
    }
  }

  // Common callback types for chai-passport-strategy
  export type ExpressMiddleware = (
    req: Request,
    res: Response,
    next?: NextFunction
  ) => void
  export type PassCallback = () => void
  export type SuccessCallback<User> = (user: User) => void
  export type FailCallback = (challenge: string, code?: number) => void
  export type ErrorCallback = (error: Error) => void

  // TestPassport interface for chai-passport-strategy
  export interface TestPassport<User, AuthenticateOptions> {
    request(cb: ExpressMiddleware): this
    success(cb: SuccessCallback<User>): this
    fail(cb: FailCallback): this
    pass(cb: PassCallback): this
    error(cb: ErrorCallback): this
    authenticate(options?: AuthenticateOptions): void
  }

  const chaiPassportStrategy: Parameters<typeof use>[0]
  export = chaiPassportStrategy
}
