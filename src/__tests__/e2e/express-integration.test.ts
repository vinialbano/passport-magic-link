import type { Application } from 'express'
import express, { Request, Response } from 'express'
import session from 'express-session'
import passport from 'passport'
import request from 'supertest'
import { MemoryStorage } from '../../MemoryStorage.js'
import { MagicLinkStrategy, User } from '../../Strategy.js'

describe('Express E2E Tests', () => {
  let tokensSent: Array<{ user: User; token: string }> = []

  beforeEach(() => {
    tokensSent = []
  })

  // Helper: Create Express app with strategy
  const createApp = (strategy: MagicLinkStrategy): Application => {
    const app = express()

    app.use(express.json())
    app.use(express.urlencoded({ extended: true }))
    app.use(
      session({
        secret: 'test-session-secret',
        resave: false,
        saveUninitialized: false
      })
    )

    app.use(passport.initialize())
    app.use(passport.session())

    passport.use('magiclink', strategy)

    // Passport serialization
    passport.serializeUser((user: Express.User, done) => done(null, user))
    passport.deserializeUser<User>((user: User, done) => done(null, user))

    return app
  }

  // Helper: Add standard auth routes
  const addAuthRoutes = (app: Application) => {
    app.post(
      '/auth/request',
      passport.authenticate('magiclink', { action: 'requestToken' }),
      (req, res) => res.json({ message: 'Magic link sent' })
    )

    app.post(
      '/auth/callback',
      passport.authenticate('magiclink', {
        action: 'acceptToken',
        session: false
      }),
      (req, res) => res.json({ user: req.user })
    )

    app.post(
      '/auth/session-callback',
      passport.authenticate('magiclink', {
        action: 'acceptToken',
        session: true
      }),
      (req, res) => res.json({ user: req.user })
    )

    app.get('/protected', (req, res) => {
      if (req.user) {
        res.json({ user: req.user })
      } else {
        res.status(401).json({ error: 'Not authenticated' })
      }
    })

    app.use((err: Error, req: Request, res: Response) => {
      res.status(500).json({ error: err.message })
    })
  }

  // Helper: Create standard strategy
  const createStrategy = (options = {}) => {
    return new MagicLinkStrategy(
      {
        storage: new MemoryStorage(),
        secret: 'test-secret-key-32-characters-long',
        userFields: ['email'],
        tokenField: 'token',
        ...options
      },
      async (user, token) => {
        tokensSent.push({ user, token })
      },
      async payload => {
        if (payload.email === 'notfound@example.com') {
          return null
        }
        return { id: 1, email: payload.email, name: 'Test User' }
      }
    )
  }

  describe('Passport.js Integration', () => {
    it('should integrate with passport.authenticate and return correct HTTP status codes', async () => {
      const strategy = createStrategy()
      const app = createApp(strategy)
      addAuthRoutes(app)

      // Happy path: Request token → Use token
      const requestResponse = await request(app)
        .post('/auth/request')
        .send({ email: 'test@example.com' })
        .expect(200)

      expect(requestResponse.body.message).toBe('Magic link sent')
      expect(tokensSent).toHaveLength(1)
      const { token } = tokensSent[0]!

      const callbackResponse = await request(app)
        .post('/auth/callback')
        .send({ token })
        .expect(200)

      expect(callbackResponse.body.user).toMatchObject({
        id: 1,
        email: 'test@example.com',
        name: 'Test User'
      })

      // Error cases
      await request(app).post('/auth/callback').send({ token }).expect(400) // Reuse token
      await request(app).post('/auth/request').send({}).expect(401) // Missing email
      await request(app)
        .post('/auth/request')
        .send({ email: 'notfound@example.com' })
        .expect(400) // User not found
      await request(app).post('/auth/callback').send({}).expect(401) // Missing token
      await request(app)
        .post('/auth/callback')
        .send({ token: 'invalid.jwt.token' })
        .expect(401) // Invalid token
    })

    it('should maintain user session after authentication with express-session', async () => {
      const strategy = createStrategy()
      const app = createApp(strategy)
      addAuthRoutes(app)

      // Request token
      await request(app)
        .post('/auth/request')
        .send({ email: 'session@example.com' })
        .expect(200)

      const { token } = tokensSent[0]!
      const agent = request.agent(app)

      // Authenticate with session enabled
      const authResponse = await agent
        .post('/auth/session-callback')
        .send({ token })
        .expect(200)

      expect(authResponse.body.user.email).toBe('session@example.com')

      // Session should persist
      const protectedResponse = await agent.get('/protected').expect(200)
      expect(protectedResponse.body.user.email).toBe('session@example.com')

      // Without session should fail
      await request(app).get('/protected').expect(401)
    })
  })

  describe('Advanced Configuration Options', () => {
    it('should handle custom TTL with real token expiration', async () => {
      const strategy = createStrategy({ ttl: 1 })
      const app = createApp(strategy)
      addAuthRoutes(app)

      // Request token
      await request(app)
        .post('/auth/request')
        .send({ email: 'ttl@example.com' })
        .expect(200)

      const { token } = tokensSent[tokensSent.length - 1]!

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Expired token should fail
      const response = await request(app)
        .post('/auth/callback')
        .send({ token })
        .expect(401)

      expect(response.body.message || response.text).toContain('Unauthorized')
    }, 10000)

    it('should handle custom user fields and custom tokenField name', async () => {
      const strategy = new MagicLinkStrategy(
        {
          secret: 'test-secret-key-32-characters-long',
          userFields: ['username', 'email'],
          tokenField: 'authToken'
        },
        async (user, token) => {
          tokensSent.push({ user, token })
        },
        async payload => ({
          id: 1,
          username: payload.username,
          email: payload.email
        })
      )

      const app = createApp(strategy)
      addAuthRoutes(app)

      // Request with custom fields
      await request(app)
        .post('/auth/request')
        .send({ username: 'testuser', email: 'custom@example.com' })
        .expect(200)

      const { token } = tokensSent[tokensSent.length - 1]!

      // Use custom token field name
      const response = await request(app)
        .post('/auth/callback')
        .send({ authToken: token })
        .expect(200)

      expect(response.body.user).toMatchObject({
        id: 1,
        username: 'testuser',
        email: 'custom@example.com'
      })

      // Wrong field name should fail
      await request(app).post('/auth/callback').send({ token }).expect(401)
    })
  })
})
