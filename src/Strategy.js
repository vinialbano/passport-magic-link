const PassportStrategy = require('passport-strategy')
const jwt = require('jsonwebtoken')
const {promisify} = require('util')
const lookup = require('./lookup')
const memoryStorage = require('./MemoryStorage')

class MagicLinkStrategy extends PassportStrategy {
  /**
   * @param {string} secret - The secret to sign the token
   * @param {Array} userFields - An array of mandatory user fields from the request
   * @param {Array} tokenField - The token field from the request
   * @param {Number} ttl - Time to live
   * @param {Boolean} passReqToCallbacks - Whether the req should be passed do the sendToken callback
   * @param {Boolean} verifyUserAfterToken - Whether the user should be verified after the token verification
   * @param {Function} sendToken - A function to deliver the token
   * @param {Function} verifyUser - A function to verify the user
   * @param {Object} storage - The storage for persistent tokens
   */
  constructor (
    {
      secret,
      userFields,
      tokenField,
      ttl = 60 * 10, // default: 10 minutes
      passReqToCallbacks = false,
      verifyUserAfterToken = false,
      storage = memoryStorage // default: In-memory storage
    },
    sendToken,
    verifyUser
  ) {
    if (!secret) throw new Error('Magic Link authentication strategy requires an encryption secret')
    if (!userFields || !userFields.length) throw new Error('Magic Link authentication strategy requires an array of mandatory user fields')
    if (!tokenField) throw new Error('Magic Link authentication strategy requires a token field')
    if (!sendToken) throw new Error('Magic Link authentication strategy requires a sendToken function')
    if (!verifyUser) throw new Error('Magic Link authentication strategy requires a verifyUser function')
    super()

    this.name = 'magiclink'
    this.secret = secret
    this.ttl = ttl
    this.passReqToCallbacks = passReqToCallbacks
    this.verifyUserAfterToken = verifyUserAfterToken
    this.userFields = userFields
    this.tokenField = tokenField
    this.storage = storage
    this.sendToken = sendToken
    this.verifyUser = verifyUser
  }

  async authenticate (req, options = {}) {
    const sanitizedOptions = {
      action: 'acceptToken',
      ...options
    }

    // Request token logic
    // ====================================
    if (sanitizedOptions.action === 'requestToken') {
      return this.requestToken(req, sanitizedOptions)
    }

    // Accept token logic
    // ====================================
    if (sanitizedOptions.action === 'acceptToken') {
      return this.acceptToken(req, sanitizedOptions)
    }

    return this.error(new Error('Unknown action'))
  }

  async requestToken (req, options) {
    let userFields = {}
    let user

    for (let i = 0; i < this.userFields.length; i++) {
      const fieldValue = lookup(req.body, this.userFields[i]) || lookup(req.query, this.userFields[i])
      if (typeof fieldValue === 'undefined') {
        userFields = null
        break
      }
      userFields[this.userFields[i]] = fieldValue
    }

    if (!userFields) {
      return this.fail(new Error('Mandatory user fields missing'))
    }

    if (!this.verifyUserAfterToken) {
      try {
        // Verify user
        if (this.passReqToCallbacks) {
          user = await this.verifyUser(req, userFields)
        } else {
          user = await this.verifyUser(userFields)
        }
      } catch (err) {
        return this.error(err)
      }

      if (!user) {
        return this.fail(
          {message: options.authMessage || `No user found`},
          400
        )
      }
    } else {
      user = userFields
    }

    // Generate JWT
    const createToken = promisify(jwt.sign)
    let token
    try {
      token = await createToken(
        {user: user, iat: Math.floor(Date.now() / 1000)},
        this.secret,
        {expiresIn: this.ttl}
      )
    } catch (err) {
      return this.error(err)
    }

    try {
      // Deliver JWT
      if (this.passReqToCallbacks) {
        await this.sendToken(req, user, token)
      } else {
        await this.sendToken(user, token)
      }
    } catch (err) {
      return this.error(err)
    }

    return this.pass({message: 'Token succesfully delivered'})
  }

  async acceptToken (req, options) {
    const token = lookup(req.body, this.tokenField) || lookup(req.query, this.tokenField) || lookup(req.params, this.tokenField)

    if (!token) {
      return this.fail({message: 'Token missing'})
    }

    let user
    let tokenExpiration
    try {
      // Verify token
      const verifyToken = promisify(jwt.verify)
      let {user: tokenUser, exp} = await verifyToken(
        token,
        this.secret
      )
      user = tokenUser
      tokenExpiration = exp
    } catch (err) {
      return this.fail({message: err.message})
    }

    if (this.verifyUserAfterToken) {
      try {
        // Verify user
        if (this.passReqToCallbacks) {
          user = await this.verifyUser(req, user)
        } else {
          user = await this.verifyUser(user)
        }
      } catch (err) {
        return this.error(err)
      }

      if (!user) {
        return this.fail(
          {message: options.authMessage || `No user found`},
          400
        )
      }
    }

    // Invalidate already used tokens
    const allowReuse = options.allowReuse || false
    const primaryKey = options.userPrimaryKey || 'email'

    if (!allowReuse) {
      // Get used tokens from storage
      const userUID = user[primaryKey]
      const usedTokens = (await this.storage.get(userUID)) || {}
      if (usedTokens[token]) {
        return this.fail({
          message: (options.tokenAlreadyUsedMessage || 'Token was already used'),
          status: 400
        })
      }
      // If you using a persistent token storage you might want to
      // regularly prune expired tokens
      Object.keys(usedTokens).forEach(token => {
        const expiration = usedTokens[token]
        if (expiration <= Date.now()) {
          delete usedTokens[token]
        }
      })

      // Revoke the token (No need to revoke already expired tokens)
      usedTokens[token] = tokenExpiration
      await this.storage.set(userUID, usedTokens)
    }

    // Pass setting a passport user
    // Next middleware can check req.user object
    return this.success(user)
  }
}

module.exports = MagicLinkStrategy
