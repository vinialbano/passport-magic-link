# passport-magic-link
Magic Link authentication for Passport JS

[![Build Status](https://travis-ci.org/vinialbano/passport-magic-link.svg?branch=master)](https://travis-ci.org/vinialbano/passport-magic-link)
[![Coverage Status](https://coveralls.io/repos/github/vinialbano/passport-magic-link/badge.svg?branch=master)](https://coveralls.io/github/vinialbano/passport-magic-link?branch=master)

## Installation

  `npm install passport-magic-link`
  
## Usage

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

#### Example
   
   ```javascript
    const MagicLinkStrategy = require('passport-magic-link').Strategy
    
    passport.use(new MagicLinkStrategy({
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
  
## Acknowledgements
  
  This module is forked and modified from [Nick Balestra's Passport Zero](https://github.com/nickbalestra/zero)
