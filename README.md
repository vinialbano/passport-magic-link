# passport-magic-link
Magic Link authentication for Passport JS

[![Build Status](https://travis-ci.org/vinialbano/passport-magic-link.svg?branch=master)](https://travis-ci.org/vinialbano/passport-magic-link)
[![Coverage Status](https://coveralls.io/repos/github/vinialbano/passport-magic-link/badge.svg?branch=master)](https://coveralls.io/github/vinialbano/passport-magic-link?branch=master)

## Installation

  `npm install passport-magic-link`
  
## Usage

  ### Configure Strategy

  The MagicLinkStrategy constructor receives four parameters:

  * `options`: A javascript object containing some configuration:
    * `secret` Mandatory string, used to sign tokens
    * `ttl`: Optional integer, defaults to 10 minutes (in seconds). It's used to set the token expiration
    * `passReqToCallback`: Optional boolean, defaults to false. If true, the request is passed to the `sendToken` function.
  * `verifyUser`: A function that receives the request and returns a promise containing the user object. It may be used to insert and/or find the user in the database.
  * `sendToken`: A function that is used to deliver the token to the user. You may use an email service, SMS or whatever method you want. It receives the user object, the token and optionally the request. It returns a promise indicating whether the token has been sent or not.
  * `verifyToken`: A function that receives the request and returns a promise containing the token object.

  #### Example
    
    ```javascript
    const MagicLinkStrategy = require('passport-magic-link').Strategy
    
    passport.use(new MagicLinkStrategy({
       secret: 'my-secret'
    }, (req) => {
      if (req.body && req.body.email) {
        return User.findOrCreate({email: req.body.email})
      }
      return null
    }, (user, token) => {
       return MailService.sendMail({
        to: user.email,
        token
       })
    }, (req) => {
      if (req.query && req.query.token) {
        return req.query.token
      }
      return null
    }))
    ```
  
  ### Authenticate Requests
  
  Use `passport.authenticate()`, specifying the `'magiclink'` strategy for two actions:
  
  #### request token
  In this situation the passport authenticate middleware will send a token produced by the user information, which is returned by the `verifyUser` function. The delivery system is not provided by default and must be placed in the `sendToken` function.
  
  ```javascript
  app.post('/auth/magiclink',
      passport.use('magiclink', { action : 'requestToken' }),
      (req, res) => res.redirect('/check-your-inbox')
    )
  ```
  
  #### accept token
  In this situation (the default) the passport authenticate middleware will check for a token. The token value is returned by the `verifyToken` function.
  
  ```javascript
  app.get('/auth/magiclink/callback',
    passport.use('magiclink', { action : 'acceptToken' }),
    (req, res) => res.redirect('/profile')
  )
  ```
  
  ## Acknowledgements
  
  This module is forked and modified from [Nick Balestra's Passport Zero](https://github.com/nickbalestra/zero)
