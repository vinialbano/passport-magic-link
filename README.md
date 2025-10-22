# passport-magic-link
Magic Link authentication for Passport JS

[![Build Status](https://travis-ci.org/vinialbano/passport-magic-link.svg?branch=master)](https://travis-ci.org/vinialbano/passport-magic-link)
[![Coverage Status](https://coveralls.io/repos/github/vinialbano/passport-magic-link/badge.svg?branch=master)](https://coveralls.io/github/vinialbano/passport-magic-link?branch=master)

## Installation

```bash
npm install passport-magic-link
```

## Usage

This package supports both CommonJS and ES Modules, and includes TypeScript definitions.

### Configure Strategy

  The MagicLinkStrategy constructor receives three parameters:

  * `options`: A javascript object containing some configuration:
    * `secret` Mandatory string, used to sign tokens
    * `userFields`: An array of mandatory field names from the request query or body that are going to be used to create or retrieve the user.
    * `tokenField`: The name of the field which contains the token in the request query or body.
    * `ttl`: Optional integer, defaults to 10 minutes (in seconds). It's used to set the token expiration
    * `passReqToCallbacks`: Optional boolean, defaults to false. If true, the request is passed to the `sendToken` and `verifyUser` functions.
    * `verifyUserAfterToken`: Optional boolean, defaults to false. If true, the request data is passed to the token and the user is verified after the token confirmation.
    * `storage`: Optional token storage instance. Defaults to MemoryStorage.
  * `sendToken`: A function that is used to deliver the token to the user. You may use an email service, SMS or whatever method you want. It receives the user object, the token and optionally the request. It returns a promise indicating whether the token has been sent or not.
  * `verifyUser`: A function that receives the request and returns a promise containing the user object. It may be used to insert and/or find the user in the database. It may be executed before the token creation or after the token confirmation.

#### Examples

**CommonJS:**
```javascript
const { Strategy } = require('passport-magic-link')

passport.use(new Strategy({
   secret: 'my-secret',
   userFields: ['name', 'email'],
   tokenField: 'token'
}, (user, token) => {
   return MailService.sendMail({
    to: user.email,
    token
   })
}, (user) => {
  return User.findOrCreate({email: user.email, name: user.name})
}))
```

**ES Modules:**
```javascript
import { Strategy } from 'passport-magic-link'

passport.use(new Strategy({
   secret: 'my-secret',
   userFields: ['name', 'email'],
   tokenField: 'token'
}, (user, token) => {
   return MailService.sendMail({
    to: user.email,
    token
   })
}, (user) => {
  return User.findOrCreate({email: user.email, name: user.name})
}))
```

**TypeScript:**
```typescript
import { Strategy, MagicLinkStrategyOptions } from 'passport-magic-link'
import type { SendTokenFunction, VerifyUserFunction } from 'passport-magic-link'

const options: MagicLinkStrategyOptions = {
   secret: 'my-secret',
   userFields: ['name', 'email'],
   tokenField: 'token'
}

const sendToken: SendTokenFunction = async (user, token) => {
   return MailService.sendMail({
    to: user.email,
    token
   })
}

const verifyUser: VerifyUserFunction = async (user) => {
  return User.findOrCreate({email: user.email, name: user.name})
}

passport.use(new Strategy(options, sendToken, verifyUser))
```
   
  
### Authenticate Requests
  
  Use `passport.authenticate()`, specifying the `'magiclink'` strategy for two actions:
  
#### request token
  In this situation the passport authenticate middleware will send a token produced by the user information, which is returned by the `verifyUser` function. The delivery system is not provided by default and must be placed in the `sendToken` function.
  
  ```javascript
  app.post('/auth/magiclink',
      passport.authenticate('magiclink', { action : 'requestToken' }),
      (req, res) => res.redirect('/check-your-inbox')
  )
  ```
  
#### accept token
  In this situation (the default) the passport authenticate middleware will check for a token. The token value is returned by the `verifyToken` function.
  
  ```javascript
  app.get('/auth/magiclink/callback',
    passport.authenticate('magiclink', { action : 'acceptToken' }),
    (req, res) => res.redirect('/profile')
  )
  ```
  
  The options field can also receive some optional properties:
  * `allowReuse`: A boolean indicating whether a token can be used more than once. Defaults to `false`.
  * `userPrimaryKey`: A string containing the primary key of the user object. This is only used if the token cannot be reused. Defaults to `email`.
  * `tokenAlreadyUsedMessage`: A string containing the error message if the token has already been used. Defaults to `Token was already used`.
  
  ```javascript
  app.get('/auth/magiclink/callback',
    passport.authenticate('magiclink', {
      action : 'acceptToken',
      userPrimaryKey: 'id'
     }),
    (req, res) => res.redirect('/profile')
  )
  ```

## TypeScript Support

This package includes comprehensive TypeScript definitions. Key types include:

- `MagicLinkStrategyOptions`: Configuration options for the strategy
- `SendTokenFunction` / `SendTokenFunctionWithRequest`: Function signatures for token delivery
- `VerifyUserFunction` / `VerifyUserFunctionWithRequest`: Function signatures for user verification
- `StorageInterface`: Interface for custom token storage implementations
- `MagicLinkUser`: User object structure
- `MagicLinkPayload`: JWT payload structure

### Custom Storage Implementation

```typescript
import { StorageInterface } from 'passport-magic-link'

class RedisStorage implements StorageInterface {
  async set(key: string, value: any): Promise<void> {
    // Redis implementation
  }
  
  async get(key: string): Promise<any> {
    // Redis implementation
  }
  
  async delete(key: string): Promise<boolean> {
    // Redis implementation
  }
}

const strategy = new Strategy({
  secret: 'my-secret',
  userFields: ['email'],
  tokenField: 'token',
  storage: new RedisStorage()
}, sendToken, verifyUser)
```

## Module Formats

This package supports multiple import methods:

```javascript
// CommonJS
const { Strategy, MemoryStorage, lookup } = require('passport-magic-link')

// ES Modules
import { Strategy, MemoryStorage, lookup } from 'passport-magic-link'

// TypeScript
import { Strategy, MemoryStorage, lookup } from 'passport-magic-link'
import type { MagicLinkStrategyOptions } from 'passport-magic-link'
```

## Acknowledgements
  
  This module is forked and modified from [Nick Balestra's Passport Zero](https://github.com/nickbalestra/zero)
