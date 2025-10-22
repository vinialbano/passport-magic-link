import { Request } from 'express'
import jwt, { type Algorithm } from 'jsonwebtoken'
import { Strategy } from 'passport-strategy'
import {
  type TokenStorage,
  MemoryStorage,
  type UserId
} from './MemoryStorage.js'
import { lookup } from './lookup.js'
import { UsedTokens } from './collections/UsedTokens.js'

export type User = Record<string, unknown>
/**
 * JWT payload structure
 */
export interface JWTPayload {
  user: User
  iat: number
  exp?: number
}

/**
 * Strategy configuration options
 */
export interface MagicLinkOptions {
  secret: string
  userFields: string[]
  tokenField: string
  ttl?: number
  allowPost?: boolean
  passReqToCallbacks?: boolean
  verifyUserAfterToken?: boolean
  storage?: TokenStorage
  algorithm?: Algorithm
}
/**
 * Authentication options for authenticate method
 */
export interface MagicLinkAuthenticateOptions {
  action?: 'requestToken' | 'acceptToken'
  authMessage?: string
  allowReuse?: boolean
  userPrimaryKey?: string
  tokenAlreadyUsedMessage?: string
}

declare module 'passport' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface AuthenticateOptions extends MagicLinkAuthenticateOptions {}
}
/**
 * Send token callback signatures
 */
type SendTokenCallback = (user: User, token: string) => Promise<void>
type SendTokenCallbackWithReq = (
  req: Request,
  user: User,
  token: string
) => Promise<void>
export type SendToken = SendTokenCallback | SendTokenCallbackWithReq

/**
 * Verify user callback signatures
 */
type VerifyUserCallback = (
  userFields: Record<string, unknown>
) => Promise<User | null>
type VerifyUserCallbackWithReq = (
  req: Request,
  userFields: Record<string, unknown>
) => Promise<User | null>
export type VerifyUser = VerifyUserCallback | VerifyUserCallbackWithReq

// Configuration validation constants
const DEFAULT_TTL_SECONDS = 600 // 10 minutes
const MIN_TTL_SECONDS = 1
const MAX_TTL_SECONDS = 86400 // 24 hours

/**
 * Validates TTL value and returns it or throws
 */
function validateTTL(ttl: number): number {
  if (ttl < MIN_TTL_SECONDS) {
    throw new Error(`TTL must be at least ${MIN_TTL_SECONDS} second`)
  }
  if (ttl > MAX_TTL_SECONDS) {
    throw new Error(`TTL cannot exceed ${MAX_TTL_SECONDS} seconds (24 hours)`)
  }
  return ttl
}

/**
 * Validates user fields array and returns it or throws
 */
function validateUserFields(fields: string[]): readonly string[] {
  if (!fields || fields.length === 0) {
    throw new Error('User fields cannot be empty')
  }

  const hasEmptyField = fields.some(
    field => !field || field.trim().length === 0
  )
  if (hasEmptyField) {
    throw new Error('User fields cannot contain empty values')
  }

  return Object.freeze([...fields])
}

/**
 * Validates secret and returns it or throws
 */
function validateSecret(value: string): string {
  if (!value || value.trim().length === 0) {
    throw new Error('Secret cannot be empty')
  }
  return value
}

/**
 * Magic Link Authentication Strategy for Passport.js
 *
 * Implements passwordless authentication using JWT tokens delivered via "magic links"
 * Supports two-phase authentication: requestToken (generate/send) and acceptToken (verify)
 */
export class MagicLinkStrategy extends Strategy {
  public readonly name: string = 'magiclink'

  // Configuration properties
  private readonly secret: string
  private readonly ttlSeconds: number
  private readonly algorithm: Algorithm
  private readonly allowPost: boolean
  private readonly userFields: readonly string[]
  private readonly tokenField: string
  private readonly storage: TokenStorage

  // Callback properties
  private readonly sendToken: SendToken
  private readonly verifyUser: VerifyUser
  private readonly passReqToCallbacks: boolean
  private readonly verifyUserAfterToken: boolean

  /**
   * Constructor with overloads to handle optional req parameter in callbacks
   */
  constructor(
    options: MagicLinkOptions & { passReqToCallbacks: true },
    sendToken: SendTokenCallbackWithReq,
    verifyUser: VerifyUserCallbackWithReq
  )

  constructor(
    options: MagicLinkOptions & { passReqToCallbacks?: false },
    sendToken: SendTokenCallback,
    verifyUser: VerifyUserCallback
  )

  constructor(
    options: MagicLinkOptions,
    sendToken: SendToken,
    verifyUser: VerifyUser
  )

  constructor(
    options: MagicLinkOptions,
    sendToken: SendToken,
    verifyUser: VerifyUser
  ) {
    super()

    // Validate required options
    if (!options.secret) {
      throw new Error(
        'Magic Link authentication strategy requires an encryption secret'
      )
    }
    if (!options.userFields || !options.userFields.length) {
      throw new Error(
        'Magic Link authentication strategy requires an array of mandatory user fields'
      )
    }
    if (!options.tokenField) {
      throw new Error(
        'Magic Link authentication strategy requires a token field'
      )
    }
    if (!sendToken) {
      throw new Error(
        'Magic Link authentication strategy requires a sendToken function'
      )
    }
    if (!verifyUser) {
      throw new Error(
        'Magic Link authentication strategy requires a verifyUser function'
      )
    }

    // Initialize configuration properties
    this.secret = validateSecret(options.secret)
    this.userFields = validateUserFields(options.userFields)
    this.tokenField = options.tokenField
    this.ttlSeconds = validateTTL(options.ttl ?? DEFAULT_TTL_SECONDS)
    this.algorithm = options.algorithm ?? 'HS256'
    this.allowPost = options.allowPost ?? true
    this.storage = options.storage ?? new MemoryStorage()

    // Initialize callback properties
    this.sendToken = sendToken
    this.verifyUser = verifyUser
    this.passReqToCallbacks = options.passReqToCallbacks ?? false
    this.verifyUserAfterToken = options.verifyUserAfterToken ?? false
  }

  /**
   * Main authentication method called by Passport.js
   */
  override async authenticate(
    req: Request,
    options: MagicLinkAuthenticateOptions = {}
  ): Promise<void> {
    options.action ??= 'acceptToken'

    if (options.action === 'requestToken') {
      return this.requestToken(req, options)
    }

    if (options.action === 'acceptToken') {
      return this.acceptToken(req, options)
    }

    return this.error(new Error('Unknown action'))
  }

  /**
   * Handle token request phase - generate and deliver JWT token
   */
  private async requestToken(
    req: Request,
    options: MagicLinkAuthenticateOptions
  ): Promise<void> {
    const userFields = this.extractUserFields(req)
    if (!userFields) return

    const user = await this.verifyUserBeforeToken(userFields, req, options)
    if (!user) return

    const token = this.generateToken(user)
    if (!token) return

    const delivered = await this.deliverToken(token, user, req)
    if (!delivered) return

    this.pass()
  }

  /**
   * Extract user fields from request
   */
  private extractUserFields(request: Request): Record<string, string> | null {
    const extracted: Record<string, string> = {}

    for (const fieldName of this.userFields) {
      const value = this.extractSingleField(request, fieldName)

      if (value === undefined || value === null) {
        this.fail('Mandatory user fields missing', 401)
        return null
      }

      extracted[fieldName] = value
    }

    return extracted
  }

  /**
   * Extract a single field from request body or query
   */
  private extractSingleField(
    request: Request,
    fieldName: string
  ): string | undefined {
    const fromBody = this.allowPost
      ? lookup<string>(request.body, fieldName)
      : undefined
    const fromQuery = lookup<string>(request.query, fieldName)
    return fromBody ?? fromQuery
  }

  /**
   * Verify user before token generation (if configured)
   */
  private async verifyUserBeforeToken(
    userFields: Record<string, string>,
    request: Request,
    options: MagicLinkAuthenticateOptions
  ): Promise<User | null> {
    if (this.verifyUserAfterToken) {
      return userFields
    }

    try {
      const user = this.passReqToCallbacks
        ? await (this.verifyUser as VerifyUserCallbackWithReq)(
            request,
            userFields
          )
        : await (this.verifyUser as VerifyUserCallback)(userFields)

      if (!user) {
        this.fail(options.authMessage || 'No user found', 400)
        return null
      }

      return user
    } catch (error) {
      console.error('User verification failed:', error)
      this.error(new Error('Authentication failed'))
      return null
    }
  }

  /**
   * Generate JWT token
   */
  private generateToken(user: User): string | null {
    try {
      const payload = { user, iat: Math.floor(Date.now() / 1000) }
      const jwtOptions = {
        expiresIn: this.ttlSeconds,
        algorithm: this.algorithm
      }

      return jwt.sign(payload, this.secret, jwtOptions)
    } catch (error) {
      console.error('Token generation failed:', error)
      this.error(new Error('Authentication failed'))
      return null
    }
  }

  /**
   * Deliver token to user via sendToken callback
   */
  private async deliverToken(
    token: string,
    user: User,
    request: Request
  ): Promise<boolean> {
    try {
      if (this.passReqToCallbacks) {
        await (this.sendToken as SendTokenCallbackWithReq)(request, user, token)
      } else {
        await (this.sendToken as SendTokenCallback)(user, token)
      }
      return true
    } catch (error) {
      console.error('Token delivery failed:', error)
      this.error(new Error('Authentication failed'))
      return false
    }
  }

  /**
   * Handle token acceptance phase - verify JWT and authenticate user
   */
  private async acceptToken(
    req: Request,
    options: MagicLinkAuthenticateOptions
  ): Promise<void> {
    const tokenString = this.extractToken(req)
    if (!tokenString) return

    const verificationResult = this.verifyJwtToken(tokenString)
    if (!verificationResult) return

    const { user: initialUser, tokenExpiration } = verificationResult

    const user = await this.verifyUserAfterTokenVerification(
      initialUser,
      req,
      options
    )
    if (!user) return

    const isAllowed = await this.checkTokenReuse(
      tokenString,
      tokenExpiration,
      user,
      options
    )
    if (!isAllowed) return

    this.success(user)
  }

  /**
   * Extract token from request (body, query, or params)
   */
  private extractToken(request: Request): string | null {
    const fromBody = this.allowPost
      ? lookup<string>(request.body, this.tokenField)
      : undefined

    const fromQuery = lookup<string>(request.query, this.tokenField)
    const fromParams = lookup<string>(request.params, this.tokenField)

    const token = fromBody ?? fromQuery ?? fromParams

    if (!token) {
      this.fail('Token missing', 401)
      return null
    }

    return token
  }

  /**
   * Verify JWT token and extract payload
   */
  private verifyJwtToken(
    tokenString: string
  ): { user: User; tokenExpiration: number } | null {
    try {
      const jwtOptions = { algorithms: [this.algorithm] }
      const payload = jwt.verify(
        tokenString,
        this.secret,
        jwtOptions
      ) as JWTPayload

      return {
        user: payload.user,
        tokenExpiration: payload.exp!
      }
    } catch (error) {
      console.error('Token verification failed:', error)
      this.fail('Invalid token', 401)
      return null
    }
  }

  /**
   * Verify user after token verification (if configured)
   */
  private async verifyUserAfterTokenVerification(
    user: User,
    request: Request,
    options: MagicLinkAuthenticateOptions
  ): Promise<User | null> {
    if (!this.verifyUserAfterToken) {
      return user
    }

    try {
      const verifiedUser = this.passReqToCallbacks
        ? await (this.verifyUser as VerifyUserCallbackWithReq)(request, user)
        : await (this.verifyUser as VerifyUserCallback)(user)

      if (!verifiedUser) {
        this.fail(options.authMessage || 'No user found', 400)
        return null
      }

      return verifiedUser
    } catch (error) {
      console.error('User verification failed:', error)
      this.error(new Error('Authentication failed'))
      return null
    }
  }

  /**
   * Check if token has been used before and mark as used
   */
  private async checkTokenReuse(
    tokenString: string,
    tokenExpirationSeconds: number,
    user: User,
    options: MagicLinkAuthenticateOptions
  ): Promise<boolean> {
    const allowReuse = options.allowReuse || false
    if (allowReuse) {
      return true
    }

    const primaryKey = options.userPrimaryKey || 'email'
    const userUID = user[primaryKey] as UserId

    const storedRecord = (await this.storage.get(userUID)) || {}
    const usedTokens = new UsedTokens(storedRecord)

    if (usedTokens.hasBeenUsed(tokenString)) {
      this.fail(
        options.tokenAlreadyUsedMessage || 'Token was already used',
        400
      )
      return false
    }

    usedTokens.removeExpiredTokens()
    usedTokens.markAsUsed(tokenString, tokenExpirationSeconds)
    await this.storage.set(userUID, usedTokens.toRecord())

    return true
  }
}
