/**
 * CommonJS Example - Async createToken/verifyToken
 *
 * Demonstrates the createToken/verifyToken option as an alternative to `secret`.
 *
 * Why this matters:
 *   - The callbacks are async, so signing/verification can call out to
 *     anything: an HSM, a KMS, a remote signing service, a DB lookup, etc.
 *   - This minimal example uses jsonwebtoken with an HMAC secret fetched
 *     from an async `getSigningSecret()` — stand-in for "fetch from your
 *     secrets manager". Swap in AWS KMS / HashiCorp Vault / etc. as needed.
 */

const express = require('express')
const session = require('express-session')
const passport = require('passport')
const jwt = require('jsonwebtoken')
const { Strategy: MagicLinkStrategy } = require('passport-magic-link')

const app = express()
const PORT = Number(process.env.PORT) || 3011

const users = [
  { id: 1, email: 'alice@example.com', name: 'Alice' },
  { id: 2, email: 'bob@example.com', name: 'Bob' }
]

const magicLinks = []

// Simulates an async secret fetch — real implementations would call a
// secrets manager (AWS Secrets Manager, Vault, Doppler, etc.)
const getSigningSecret = async () => {
  return process.env.JWT_SECRET || 'fetched-from-secrets-manager-min-32-chars'
}

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(
  session({
    secret: 'session-secret-change-in-production',
    resave: false,
    saveUninitialized: false
  })
)
app.use(passport.initialize())
app.use(passport.session())

passport.use(
  new MagicLinkStrategy(
    {
      userFields: ['email'],
      tokenField: 'token',
      ttl: 600,
      // Custom async signing — no `secret` option is passed.
      createToken: async (payload, ttlSeconds) => {
        const secret = await getSigningSecret()
        return jwt.sign(payload, secret, { expiresIn: ttlSeconds })
      },
      // Must return the decoded payload — and must include `exp` so the
      // strategy can schedule used-token cleanup.
      verifyToken: async token => {
        const secret = await getSigningSecret()
        return jwt.verify(token, secret)
      }
    },
    async (user, token) => {
      const magicLink = `http://localhost:${PORT}/auth/login?token=${token}`
      console.log(`\n🔗 Magic link for ${user.email}:\n${magicLink}\n`)
      magicLinks.push({ email: user.email, link: magicLink })
    },
    async payload => {
      return users.find(u => u.email === payload.email) || null
    }
  )
)

passport.serializeUser((user, done) => done(null, user.id))
passport.deserializeUser((id, done) => {
  done(
    null,
    users.find(u => u.id === id)
  )
})

app.post(
  '/auth/request',
  passport.authenticate('magiclink', { action: 'requestToken' }),
  (_req, res) => res.json({ message: 'Magic link sent!' })
)

app.get(
  '/auth/login',
  passport.authenticate('magiclink', {
    action: 'acceptToken',
    session: true,
    failureRedirect: '/auth/failed'
  }),
  (req, res) => {
    res.send(
      `<h1>✓ Login Successful (async signing)</h1><p>Welcome, <strong>${req.user.name}</strong></p>`
    )
  }
)

app.get('/auth/failed', (_req, res) => {
  res.status(401).send('<h1>✗ Login Failed</h1><p>Invalid or expired link.</p>')
})

app.get('/debug/links', (_req, res) => {
  if (magicLinks.length === 0) {
    return res.send(
      '<h1>No magic links yet</h1><p>POST to /auth/request first</p>'
    )
  }
  const last = magicLinks[magicLinks.length - 1]
  res.send(`
    <h1>Last Magic Link</h1>
    <p><strong>Email:</strong> ${last.email}</p>
    <p><a href="${last.link}">Click to Login</a></p>
  `)
})

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║  CJS Async-Token Example - Port ${PORT}        ║
╚══════════════════════════════════════════════╝

No \`secret\` option — signing goes through createToken/verifyToken.

Try it:
  1. curl -X POST http://localhost:${PORT}/auth/request \\
       -H "Content-Type: application/json" \\
       -d '{"email":"alice@example.com"}'

  2. Open: http://localhost:${PORT}/debug/links
  3. Click the magic link to login!
`)
})
