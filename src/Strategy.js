const PassportStrategy = require('passport-strategy')
const jwt = require('jsonwebtoken')
const {promisify} = require('util')

class MagicLinkStrategy extends PassportStrategy {
  /**
   * @param {string} secret - The secret to sign the token
   * @param {Number} ttl - Time to live
   * @param {Boolean} passReqToCallback - Whether the req should be passed do the sendToken callback
   * @param {Function} verifyUser - A function to verify the user
   * @param {Function} sendToken - A function to deliver the token
   * @param {Function} verifyToken - A function to verify the token
   */
  constructor (
    {
      secret,
      ttl = 60 * 10, // default: 10 minutes
      passReqToCallback = false
    },
    verifyUser,
    sendToken,
    verifyToken
  ) {
    if (!secret) throw new Error('Magic Link authentication strategy requires an encryption secret')
    if (!verifyUser) throw new Error('Magic Link authentication strategy requires a verifyUser function')
    if (!sendToken) throw new Error('Magic Link authentication strategy requires a sendToken function')
    if (!verifyToken) throw new Error('Magic Link authentication strategy requires a verifyToken function')
    super()

    this.name = 'magiclink'
    this.secret = secret
    this.ttl = ttl
    this.passReqToCallback = passReqToCallback
    this.verifyUser = verifyUser
    this.sendToken = sendToken
    this.verifyToken = verifyToken
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
    let user
    try {
      // Verify user
      user = await this.verifyUser(req)
    } catch (err) {
      return this.fail(err)
    }

    if (!user) {
      return this.fail(
        new Error(options.authMessage || `No user found`),
        400
      )
    }

    // Generate JWT
    const createToken = promisify(jwt.sign)
    let token
    try {
      token = await createToken(
        {user, iat: Math.floor(Date.now() / 1000)},
        this.secret,
        {expiresIn: this.ttl}
      )
    } catch (err) {
      return this.error(err)
    }

    try {
      // Deliver JWT
      if (this.passReqToCallback) {
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
    let token
    try {
      // Get token
      token = await this.verifyToken(req)
    } catch (err) {
      return this.fail(err)
    }
    if (!token) {
      return this.pass({message: `No token found`})
    }

    try {
      // Verify token
      const verifyToken = promisify(jwt.verify)
      const {user} = await verifyToken(
        token,
        this.secret
      )

      // Pass setting a passport user
      // Next middleware can check req.user object
      return this.success(user)
    } catch (err) {
      return this.error(err)
    }
  }
}

module.exports = MagicLinkStrategy
