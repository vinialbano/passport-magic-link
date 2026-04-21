/**
 * ESM Example - Async createToken/verifyToken with RS256 asymmetric signing
 *
 * Demonstrates the primary motivation for PR #48: signing tokens with an
 * RSA private key and verifying with the public key. Lets you rotate
 * the private key independently, or hand it to an HSM that never exposes
 * the private material to the application.
 *
 * For simplicity, the keypair is generated at startup. In production:
 *   - Load the private key from a secrets manager / HSM / KMS
 *   - Distribute the public key via JWKS to consumers
 */

import express from 'express'
import session from 'express-session'
import passport from 'passport'
import jwt from 'jsonwebtoken'
import { generateKeyPairSync } from 'node:crypto'
import { Strategy as MagicLinkStrategy } from 'passport-magic-link'

const app = express()
const PORT = Number(process.env.PORT) || 3012

// Generate an RSA-2048 keypair at boot. In production, load from KMS/HSM/disk.
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
})

const users = [
  { id: 1, email: 'alice@example.com', name: 'Alice' },
  { id: 2, email: 'bob@example.com', name: 'Bob' }
]

const magicLinks = []

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
      // Sign with the private key (RS256). No static `secret` is shared.
      createToken: async (payload, ttlSeconds) => {
        return jwt.sign(payload, privateKey, {
          algorithm: 'RS256',
          expiresIn: ttlSeconds
        })
      },
      // Verify with the public key only — the verifier never holds signing material.
      verifyToken: async token => {
        return jwt.verify(token, publicKey, { algorithms: ['RS256'] })
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
      `<h1>✓ Login Successful (RS256)</h1><p>Welcome, <strong>${req.user.name}</strong></p>`
    )
  }
)

app.get('/auth/failed', (_req, res) => {
  res.status(401).send('<h1>✗ Login Failed</h1><p>Invalid or expired link.</p>')
})

// Exposes the public key as PEM. A real service would publish JWKS
// (JSON Web Key Set) at /.well-known/jwks.json instead.
app.get('/public-key.pem', (_req, res) => {
  res.type('text/plain').send(publicKey)
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
    <p><a href="/public-key.pem">Public key (PEM)</a></p>
  `)
})

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║  ESM Async-Token Example - Port ${PORT}        ║
╚══════════════════════════════════════════════╝

RS256 asymmetric signing via createToken/verifyToken.
Public key exposed at http://localhost:${PORT}/public-key.pem

Try it:
  1. curl -X POST http://localhost:${PORT}/auth/request \\
       -H "Content-Type: application/json" \\
       -d '{"email":"alice@example.com"}'

  2. Open: http://localhost:${PORT}/debug/links
  3. Click the magic link to login!
`)
})
