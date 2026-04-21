/**
 * Comprehensive TypeScript Example - passport-magic-link
 *
 * Demonstrates:
 * - Login flow (verifyUserAfterToken: false)
 * - Signup flow (verifyUserAfterToken: true)
 * - TypeScript types and interfaces
 * - Production-ready patterns
 */

import express, { Request, Response, NextFunction } from 'express'
import session from 'express-session'
import passport from 'passport'
import { Strategy as MagicLinkStrategy } from 'passport-magic-link'

// Types
interface User {
  id: number
  email: string
  name: string
  createdAt: Date
}

interface MagicLink {
  email: string
  name?: string
  link: string
  type: 'login' | 'signup'
}

// App setup
const app = express()
const PORT = Number(process.env.PORT) || 3003

// In-memory databases (use a real DB in production)
const users: User[] = [
  {
    id: 1,
    email: 'alice@example.com',
    name: 'Alice',
    createdAt: new Date('2024-01-01')
  },
  {
    id: 2,
    email: 'bob@example.com',
    name: 'Bob',
    createdAt: new Date('2024-01-15')
  }
]
let nextUserId = 3

const magicLinks: MagicLink[] = []

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(
  session({
    secret:
      process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  })
)
app.use(passport.initialize())
app.use(passport.session())

// ====================
// LOGIN STRATEGY (verifyUserAfterToken: false)
// ====================
const loginStrategy = new MagicLinkStrategy(
  {
    secret: process.env.JWT_SECRET || 'your-jwt-secret-min-32-characters',
    userFields: ['email'],
    tokenField: 'token',
    ttl: 600, // 10 minutes
    verifyUserAfterToken: false // Verify user BEFORE sending token
  },
  async (user, token) => {
    const { email } = user as { email: string }
    const magicLink = `http://localhost:${PORT}/auth/login?token=${token}`
    console.log(`\n📧 Login link for ${email}:\n🔗 ${magicLink}\n`)

    // In production: send email here
    // await emailService.send({ to: email, subject: 'Your Magic Link', html: ... });

    magicLinks.push({ email, link: magicLink, type: 'login' })
  },
  async payload => {
    const { email } = payload as { email: string }
    const user = users.find(u => u.email === email)
    if (!user) {
      console.log(`❌ User not found: ${email}`)
      return null
    }
    console.log(`✅ User found: ${user.name}`)
    return user as unknown as Record<string, unknown>
  }
)

// ====================
// SIGNUP STRATEGY (verifyUserAfterToken: true)
// ====================
const signupStrategy = new MagicLinkStrategy(
  {
    secret: process.env.JWT_SECRET || 'your-jwt-secret-min-32-characters',
    userFields: ['email', 'name'],
    tokenField: 'token',
    ttl: 600,
    verifyUserAfterToken: true // Verify user AFTER token verification
  },
  async (user, token) => {
    const { email, name } = user as { email: string; name?: string }
    const magicLink = `http://localhost:${PORT}/auth/signup/callback?token=${token}`
    console.log(`\n📧 Signup link for ${email}:\n🔗 ${magicLink}\n`)

    magicLinks.push({ email, name, link: magicLink, type: 'signup' })
  },
  async payload => {
    const { email, name } = payload as { email: string; name?: string }
    let user = users.find(u => u.email === email)

    if (user) {
      console.log(`✅ Existing user: ${user.name}`)
      return user as unknown as Record<string, unknown>
    }

    user = {
      id: nextUserId++,
      email,
      name: name || email.split('@')[0],
      createdAt: new Date()
    }
    users.push(user)
    console.log(`🎉 New user created: ${user.name}`)
    return user as unknown as Record<string, unknown>
  }
)

// Register strategies
passport.use('magiclink-login', loginStrategy)
passport.use('magiclink-signup', signupStrategy)

// Passport serialization
passport.serializeUser((user: Express.User, done) => {
  done(null, (user as User).id)
})

passport.deserializeUser((id: number, done) => {
  const user = users.find(u => u.id === id)
  done(null, user || null)
})

// ====================
// ROUTES - Login Flow
// ====================
app.post(
  '/auth/login/request',
  passport.authenticate('magiclink-login', {
    action: 'requestToken',
    failureMessage: true
  }),
  (_req: Request, res: Response) => {
    res.json({ success: true, message: 'Magic link sent! Check console.' })
  }
)

app.get(
  '/auth/login',
  passport.authenticate('magiclink-login', {
    action: 'acceptToken',
    session: true,
    failureRedirect: '/auth/failed'
  }),
  (req: Request, res: Response) => {
    const user = req.user as User
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Login Successful</title>
          <style>
            body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .success { color: #059669; font-size: 48px; margin: 0; }
            .user-box { background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
            a { color: #3b82f6; }
          </style>
        </head>
        <body>
          <div class="success">✓</div>
          <h1>Welcome Back!</h1>
          <div class="user-box">
            <p><strong>${user.name}</strong></p>
            <p>${user.email}</p>
          </div>
          <p><a href="/protected">View Protected Content</a></p>
          <p><a href="/debug">View All Debug Info</a></p>
        </body>
      </html>
    `)
  }
)

// ====================
// ROUTES - Signup Flow
// ====================
app.post(
  '/auth/signup/request',
  passport.authenticate('magiclink-signup', {
    action: 'requestToken',
    failureMessage: true
  }),
  (_req: Request, res: Response) => {
    res.json({ success: true, message: 'Signup link sent! Check console.' })
  }
)

app.get(
  '/auth/signup/callback',
  passport.authenticate('magiclink-signup', {
    action: 'acceptToken',
    session: true,
    failureRedirect: '/auth/failed'
  }),
  (req: Request, res: Response) => {
    const user = req.user as User
    const isNewUser = Date.now() - user.createdAt.getTime() < 5000

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${isNewUser ? 'Signup' : 'Login'} Successful</title>
          <style>
            body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .success { color: #059669; font-size: 48px; margin: 0; }
            .badge { background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 12px; font-size: 14px; }
            .user-box { background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
            a { color: #3b82f6; }
          </style>
        </head>
        <body>
          <div class="success">✓</div>
          <h1>${isNewUser ? 'Welcome!' : 'Welcome Back!'}</h1>
          <div class="badge">${isNewUser ? 'New Account' : 'Existing User'}</div>
          <div class="user-box">
            <p><strong>${user.name}</strong></p>
            <p>${user.email}</p>
            <p style="font-size: 12px; color: #666;">User ID: ${user.id}</p>
          </div>
          <p><a href="/protected">View Protected Content</a></p>
          <p><a href="/debug">View All Debug Info</a></p>
        </body>
      </html>
    `)
  }
)

// ====================
// COMMON ROUTES
// ====================
app.get('/auth/failed', (_req: Request, res: Response) => {
  res.status(401).send(`
    <!DOCTYPE html>
    <html>
      <body style="font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center;">
        <div style="color: #dc2626; font-size: 48px;">✗</div>
        <h1>Authentication Failed</h1>
        <p>Your magic link is invalid or has expired.</p>
      </body>
    </html>
  `)
})

app.get('/protected', (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send(`
      <html>
        <body style="font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center;">
          <h1>Unauthorized</h1>
          <p>Please login first.</p>
        </body>
      </html>
    `)
  }

  const user = req.user as User
  res.send(`
    <html>
      <body style="font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px;">
        <h1>🔒 Protected Content</h1>
        <div style="background: #f0f9ff; padding: 20px; border-radius: 8px;">
          <p><strong>Authenticated as:</strong> ${user.name}</p>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>User ID:</strong> ${user.id}</p>
        </div>
        <p><a href="/logout">Logout</a></p>
      </body>
    </html>
  `)
})

app.get('/logout', (req: Request, res: Response) => {
  req.logout(err => {
    if (err) {
      return res.status(500).send('Logout failed')
    }
    res.send('<h1>Logged Out</h1><p><a href="/debug">Back to Home</a></p>')
  })
})

// ====================
// DEBUG ROUTES
// ====================
app.get('/debug', (_req: Request, res: Response) => {
  const loginLinks = magicLinks.filter(l => l.type === 'login')
  const signupLinks = magicLinks.filter(l => l.type === 'signup')

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Debug Dashboard</title>
        <style>
          body { font-family: system-ui; max-width: 900px; margin: 20px auto; padding: 20px; }
          .section { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .link-box { background: white; padding: 15px; margin: 10px 0; border-radius: 6px; border: 1px solid #e5e7eb; }
          .button { display: inline-block; padding: 8px 16px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 5px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { text-align: left; padding: 8px; border-bottom: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <h1>🔍 Debug Dashboard</h1>

        <div class="section">
          <h2>📧 Test Login (Existing Users)</h2>
          <p>Request a magic link for existing users:</p>
          <a href="javascript:void(0)" onclick="requestLogin('alice@example.com')" class="button">Login as Alice</a>
          <a href="javascript:void(0)" onclick="requestLogin('bob@example.com')" class="button">Login as Bob</a>
        </div>

        <div class="section">
          <h2>🎉 Test Signup (New Users)</h2>
          <p>Request a signup link (creates account or logs in existing):</p>
          <a href="javascript:void(0)" onclick="requestSignup()" class="button">Signup New User</a>
        </div>

        ${
          loginLinks.length > 0
            ? `
          <div class="section">
            <h2>🔗 Recent Login Links</h2>
            ${loginLinks
              .slice(-5)
              .reverse()
              .map(
                l => `
              <div class="link-box">
                <strong>${l.email}</strong><br/>
                <a href="${l.link}" class="button">Click to Login</a>
              </div>
            `
              )
              .join('')}
          </div>
        `
            : ''
        }

        ${
          signupLinks.length > 0
            ? `
          <div class="section">
            <h2>🔗 Recent Signup Links</h2>
            ${signupLinks
              .slice(-5)
              .reverse()
              .map(
                l => `
              <div class="link-box">
                <strong>${l.email}</strong> ${l.name ? `(${l.name})` : ''}<br/>
                <a href="${l.link}" class="button">Click to Signup</a>
              </div>
            `
              )
              .join('')}
          </div>
        `
            : ''
        }

        <div class="section">
          <h2>👥 Registered Users (${users.length})</h2>
          <table>
            <tr><th>ID</th><th>Name</th><th>Email</th><th>Created</th></tr>
            ${users
              .map(
                u => `
              <tr>
                <td>${u.id}</td>
                <td>${u.name}</td>
                <td>${u.email}</td>
                <td>${u.createdAt.toLocaleDateString()}</td>
              </tr>
            `
              )
              .join('')}
          </table>
        </div>

        <script>
          function requestLogin(email) {
            fetch('/auth/login/request', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email })
            }).then(() => location.reload());
          }

          function requestSignup() {
            const email = prompt('Enter email:');
            const name = prompt('Enter name (optional):');
            if (email) {
              fetch('/auth/signup/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, name })
              }).then(() => location.reload());
            }
          }
        </script>
      </body>
    </html>
  `)
})

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err.message)
  res.status(500).json({ error: err.message })
})

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║  TypeScript Example - Port ${PORT}             ║
╚══════════════════════════════════════════════╝

🌐 Open: http://localhost:${PORT}/debug

Features:
  ✓ Login flow (existing users)
  ✓ Signup flow (new users)
  ✓ TypeScript types
  ✓ Interactive debug dashboard
  ✓ Session management

Pre-registered users:
  • alice@example.com
  • bob@example.com
`)
})
