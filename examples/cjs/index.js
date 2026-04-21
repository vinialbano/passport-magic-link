/**
 * Simple CommonJS Example - passport-magic-link
 *
 * Demonstrates basic magic link authentication with Express
 */

const express = require('express')
const session = require('express-session')
const passport = require('passport')
const {
  Strategy: MagicLinkStrategy,
  MemoryStorage
} = require('passport-magic-link')

const app = express()
const PORT = Number(process.env.PORT) || 3001

// Sample users database
const users = [
  { id: 1, email: 'alice@example.com', name: 'Alice' },
  { id: 2, email: 'bob@example.com', name: 'Bob' }
]

// Store generated magic links for demo
const magicLinks = []

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(
  session({
    secret: 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false
  })
)
app.use(passport.initialize())
app.use(passport.session())

// Configure Magic Link Strategy
passport.use(
  new MagicLinkStrategy(
    {
      secret: 'your-jwt-secret-min-32-characters',
      userFields: ['email'],
      tokenField: 'token'
    },
    // sendToken: where you'd send the email
    async (user, token) => {
      const magicLink = `http://localhost:${PORT}/auth/login?token=${token}`
      console.log(`\n🔗 Magic link for ${user.email}:\n${magicLink}\n`)
      magicLinks.push({ email: user.email, link: magicLink })
    },
    // verifyUser: lookup user in database
    async payload => {
      return users.find(u => u.email === payload.email) || null
    }
  )
)

// Passport session serialization
passport.serializeUser((user, done) => done(null, user.id))
passport.deserializeUser((id, done) => {
  done(
    null,
    users.find(u => u.id === id)
  )
})

// Routes
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
    res.send(`
      <h1>✓ Login Successful!</h1>
      <p>Welcome, <strong>${req.user.name}</strong></p>
      <p><a href="/protected">View Protected Page</a></p>
    `)
  }
)

app.get('/auth/failed', (_req, res) => {
  res.status(401).send('<h1>✗ Login Failed</h1><p>Invalid or expired link.</p>')
})

app.get('/protected', (req, res) => {
  if (!req.user) {
    return res
      .status(401)
      .send('<h1>Unauthorized</h1><p>Please login first.</p>')
  }
  res.send(`<h1>Protected Content</h1><p>Hello, ${req.user.name}!</p>`)
})

// Debug endpoint
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
╔════════════════════════════════════════╗
║  CommonJS Example - Port ${PORT}         ║
╚════════════════════════════════════════╝

Try it:
  1. curl -X POST http://localhost:${PORT}/auth/request \\
       -H "Content-Type: application/json" \\
       -d '{"email":"alice@example.com"}'

  2. Open: http://localhost:${PORT}/debug/links

  3. Click the magic link to login!

Available users: alice@example.com, bob@example.com
`)
})
