# passport-magic-link Examples

Focused examples demonstrating `passport-magic-link` in different module systems and configurations.

## 📂 Basic Examples

### 🟦 [cjs/](cjs/) - CommonJS (Simple)
**Port 3001** | Basic login flow | ~100 lines

```bash
cd cjs && npm install && npm start
```

### 🟩 [esm/](esm/) - ES Modules (Simple)
**Port 3002** | Basic login flow | ~100 lines

```bash
cd esm && npm install && npm start
```

### 🟪 [typescript/](typescript/) - TypeScript (Comprehensive)
**Port 3003** | Login + Signup flows | Interactive dashboard | ~400 lines

```bash
cd typescript && npm install && npm run dev
```

## 🔐 Custom Token Examples (createToken / verifyToken)

Examples for the async `createToken` / `verifyToken` callbacks — used instead of
the static `secret` option when you need asymmetric signing, key rotation, KMS/HSM
integration, or an external signing service.

### 🟦 [cjs-async-token/](cjs-async-token/) - CJS · async HMAC
**Port 3011** | Fetch signing secret from an async source (secrets manager stand-in)

```bash
cd cjs-async-token && npm install && npm start
```

### 🟩 [esm-async-token/](esm-async-token/) - ESM · RS256 asymmetric
**Port 3012** | RSA keypair generated at boot, public key exposed at `/.well-known/jwks.pem`

```bash
cd esm-async-token && npm install && npm start
```

### 🟪 [typescript-async-token/](typescript-async-token/) - TS · Key rotation
**Port 3013** | Multi-key ring, `kid` header, rotate/retire admin endpoints

```bash
cd typescript-async-token && npm install && npm run dev
```

## 🚀 Quick Start

1. Choose an example (start with `cjs/` or `esm/` for basics)
2. Install and run
3. Request magic link: `curl -X POST http://localhost:PORT/auth/request -H "Content-Type: application/json" -d '{"email":"alice@example.com"}'`
4. Open debug page: `http://localhost:PORT/debug/links`
5. Click the magic link!

TypeScript examples have interactive dashboards at `http://localhost:PORT/debug`.

## 🔑 Key Differences

### verifyUserAfterToken: false (Login - CJS/ESM examples)
User verified **before** token sent → For existing users only

### verifyUserAfterToken: true (Signup - TypeScript example)
User verified **after** token verified → For registration/signup

### secret vs createToken/verifyToken
Use `secret` for quick-start and local deployments. Reach for the async
callbacks when signing material must live outside the app process — asymmetric
keys, KMS-managed keys, remote signing services, or when you need to rotate
without a restart.

See [typescript/](typescript/) for the two `verifyUserAfterToken` patterns,
and [typescript-async-token/](typescript-async-token/) for the rotation walkthrough.
