/**
 * TypeScript Example - Key rotation via createToken/verifyToken
 *
 * Demonstrates the "rotate secrets without customer impact" use case
 * called out in PR #48. Each token carries a `kid` (key ID) header
 * pointing at the key that signed it; verification looks the key up
 * in a keystore. Rotation is a two-step dance:
 *
 *   1. Publish a new key to the keystore. From now on, new tokens
 *      are signed with it.
 *   2. Keep the old key in the keystore until every live token has
 *      expired (TTL). Then remove it.
 *
 * The `createToken` / `verifyToken` callbacks are plain async functions,
 * so each step is just a keystore read — no strategy reconstruction,
 * no server restart.
 */

import express, { Request, Response, NextFunction } from 'express'
import session from 'express-session'
import passport from 'passport'
import jwt, { JwtHeader } from 'jsonwebtoken'
import { randomBytes } from 'node:crypto'
import {
  Strategy as MagicLinkStrategy,
  type CreateToken,
  type VerifyToken
} from 'passport-magic-link'

interface User {
  id: number
  email: string
  name: string
}

interface SigningKey {
  kid: string
  secret: string
  createdAt: Date
}

// ====================
// KEY RING
// ====================
// Minimal in-memory keystore. Real deployments back this with a
// secrets manager and refresh on a timer.
class KeyRing {
  private keys = new Map<string, SigningKey>()
  private currentKid: string

  constructor() {
    const initial = this.makeKey()
    this.keys.set(initial.kid, initial)
    this.currentKid = initial.kid
  }

  private makeKey(): SigningKey {
    return {
      kid: randomBytes(8).toString('hex'),
      secret: randomBytes(32).toString('base64'),
      createdAt: new Date()
    }
  }

  current(): SigningKey {
    const key = this.keys.get(this.currentKid)
    if (!key) throw new Error('Current signing key missing')
    return key
  }

  lookup(kid: string): SigningKey | undefined {
    return this.keys.get(kid)
  }

  rotate(): SigningKey {
    const next = this.makeKey()
    this.keys.set(next.kid, next)
    this.currentKid = next.kid
    console.log(
      `🔑 Rotated signing key. Current kid=${next.kid}. Total keys=${this.keys.size}`
    )
    return next
  }

  retire(kid: string): boolean {
    if (kid === this.currentKid) return false
    return this.keys.delete(kid)
  }

  list(): SigningKey[] {
    return [...this.keys.values()]
  }
}

const keyRing = new KeyRing()

// ====================
// TOKEN CALLBACKS
// ====================
const createToken: CreateToken = async (payload, ttlSeconds) => {
  const key = keyRing.current()
  return jwt.sign(payload, key.secret, {
    algorithm: 'HS256',
    expiresIn: ttlSeconds,
    keyid: key.kid
  })
}

const verifyToken: VerifyToken = async token => {
  // `complete: true` returns { header, payload }, letting us read `kid` safely.
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      (header: JwtHeader, callback) => {
        if (!header.kid) return callback(new Error('Missing kid header'))
        const key = keyRing.lookup(header.kid)
        if (!key) return callback(new Error(`Unknown kid: ${header.kid}`))
        callback(null, key.secret)
      },
      { algorithms: ['HS256'] },
      (err, decoded) => {
        if (err) return reject(err)
        resolve(decoded as Awaited<ReturnType<VerifyToken>>)
      }
    )
  })
}

// ====================
// APP
// ====================
const app = express()
const PORT = Number(process.env.PORT) || 3013

const users: User[] = [
  { id: 1, email: 'alice@example.com', name: 'Alice' },
  { id: 2, email: 'bob@example.com', name: 'Bob' }
]

const magicLinks: { email: string; link: string; kid: string }[] = []

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'session-secret-change-in-production',
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
      createToken,
      verifyToken
    },
    async (user, token) => {
      const { email } = user as { email: string }
      const { kid } = keyRing.current()
      const link = `http://localhost:${PORT}/auth/login?token=${token}`
      console.log(`\n🔗 Magic link for ${email} (kid=${kid}):\n${link}\n`)
      magicLinks.push({ email, link, kid })
    },
    async payload => {
      const { email } = payload as { email: string }
      const found = users.find(u => u.email === email)
      return (found as unknown as Record<string, unknown>) ?? null
    }
  )
)

passport.serializeUser((user: Express.User, done) =>
  done(null, (user as User).id)
)
passport.deserializeUser((id: number, done) => {
  done(null, users.find(u => u.id === id) || null)
})

// ====================
// ROUTES
// ====================
app.post(
  '/auth/request',
  passport.authenticate('magiclink', { action: 'requestToken' }),
  (_req: Request, res: Response) => res.json({ message: 'Magic link sent!' })
)

app.get(
  '/auth/login',
  passport.authenticate('magiclink', {
    action: 'acceptToken',
    session: true,
    failureRedirect: '/auth/failed'
  }),
  (req: Request, res: Response) => {
    const user = req.user as User
    res.send(`<h1>✓ Login Successful (rotated keys)</h1><p>Welcome, <strong>${user.name}</strong></p>
      <p><a href="/debug">Debug Dashboard</a></p>`)
  }
)

app.get('/auth/failed', (_req: Request, res: Response) => {
  res
    .status(401)
    .send(
      '<h1>✗ Login Failed</h1><p>Invalid, expired, or signed with a retired key.</p>'
    )
})

// Rotate the current signing key. Tokens already in flight keep working
// because their kid still resolves in the keystore.
app.post('/admin/rotate', (_req: Request, res: Response) => {
  const next = keyRing.rotate()
  res.json({ currentKid: next.kid, keys: keyRing.list().map(k => k.kid) })
})

// Remove a retired kid. Any in-flight token signed with it will fail verify.
app.post(
  '/admin/retire/:kid',
  (req: Request<{ kid: string }>, res: Response) => {
    const ok = keyRing.retire(req.params.kid)
    res.json({ retired: ok, keys: keyRing.list().map(k => k.kid) })
  }
)

app.get('/debug', (_req: Request, res: Response) => {
  const current = keyRing.current()
  res.send(`
    <!DOCTYPE html>
    <html>
      <head><title>Key Rotation Debug</title>
        <style>body{font-family:system-ui;max-width:860px;margin:20px auto;padding:20px}
        .box{background:#f9fafb;padding:16px;border-radius:8px;margin:12px 0}
        button,a.button{display:inline-block;padding:8px 14px;background:#3b82f6;color:#fff;border:0;border-radius:6px;cursor:pointer;text-decoration:none;margin:4px}
        code{background:#eef;padding:2px 6px;border-radius:4px}</style>
      </head>
      <body>
        <h1>🔑 Key Rotation Dashboard</h1>
        <div class="box">
          <h2>Current signing key</h2>
          <p><code>${current.kid}</code> &middot; created ${current.createdAt.toISOString()}</p>
        </div>
        <div class="box">
          <h2>All keys in ring (${keyRing.list().length})</h2>
          <ul>${keyRing
            .list()
            .map(
              k =>
                `<li><code>${k.kid}</code>${
                  k.kid === current.kid
                    ? ' <strong>← current</strong>'
                    : `
            <button onclick="fetch('/admin/retire/${k.kid}', { method: 'POST' }).then(() => location.reload())">retire</button>`
                }</li>`
            )
            .join('')}</ul>
          <button onclick="fetch('/admin/rotate', { method: 'POST' }).then(() => location.reload())">Rotate now</button>
        </div>
        <div class="box">
          <h2>Try it</h2>
          <a href="javascript:void(0)" class="button" onclick="fetch('/auth/request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'alice@example.com'})}).then(()=>location.reload())">Request link for Alice</a>
        </div>
        ${
          magicLinks.length
            ? `<div class="box"><h2>Recent magic links</h2>
          ${magicLinks
            .slice(-5)
            .reverse()
            .map(
              l =>
                `<p><code>kid=${l.kid}</code> &middot; ${l.email}<br><a href="${l.link}" class="button">Open link</a></p>`
            )
            .join('')}
        </div>`
            : ''
        }
      </body>
    </html>
  `)
})

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err.message)
  res.status(500).json({ error: err.message })
})

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║  TypeScript Async-Token Example - Port ${PORT}     ║
╚═══════════════════════════════════════════════════╝

🌐 Open: http://localhost:${PORT}/debug

Walkthrough:
  1. Click "Request link for Alice" → magic link is signed with kid #A.
  2. Click "Rotate now" → new kid #B becomes current.
  3. The link from step 1 still works (kid #A is still in the ring).
  4. "Retire" kid #A → the old link now fails verification.
`)
})
