const {passport: testPassport} = require('chai').use(
  require('chai-passport-strategy')
)
const Strategy = require('../src/Strategy')
const jwt = require('jsonwebtoken')
const storage = require('../src/MemoryStorage')

describe('Strategy', () => {
  describe('#constructor', () => {
    test('should throw if constructed without a secret', () => {
      expect(() => new Strategy({}))
        .toThrowError('Magic Link authentication strategy requires an encryption secret')
    })

    test('should throw if constructed without a userFields array', () => {
      expect(() => new Strategy({
        secret: 'top-secret'
      }))
        .toThrowError('Magic Link authentication strategy requires an array of mandatory user fields')
    })

    test('should throw if constructed without a tokenField', () => {
      expect(() => new Strategy({
        secret: 'top-secret',
        userFields: ['email']
      }))
        .toThrowError('Magic Link authentication strategy requires a token field')
    })

    test('should throw if constructed without a sendToken function', () => {
      expect(() => new Strategy({
        secret: 'top-secret',
        userFields: ['email'],
        tokenField: 'token'
      }))
        .toThrowError('Magic Link authentication strategy requires a sendToken function')
    })

    test('should throw if constructed without a verifyUser function', () => {
      expect(() => new Strategy({
        secret: 'top-secret',
        userFields: ['email'],
        tokenField: 'token'
      }, () => {}))
        .toThrowError('Magic Link authentication strategy requires a verifyUser function')
    })

    test('strategy defaults', () => {
      let strategy
      const sendToken = () => {}
      const verifyUser = () => {}

      expect(() => {
        strategy = new Strategy(
          {
            secret: 'top-secret',
            userFields: ['email'],
            tokenField: 'token'
          },
          sendToken,
          verifyUser)
      }).not.toThrow()
      expect(strategy.name).toBe('magiclink')
      expect(strategy.secret).toBe('top-secret')
      expect(strategy.userFields).toEqual(['email'])
      expect(strategy.sendToken).toBe(sendToken)
      expect(strategy.tokenField).toBe('token')
      expect(strategy.ttl).toBe(600)
      expect(strategy.passReqToCallbacks).toBeFalsy()
      expect(strategy.verifyUserAfterToken).toBeFalsy()
    })
  })

  describe('#requestToken', () => {
    test('fails when not all the user fields are found', (done) => {
      const sendToken = () => {}
      const verifyUser = () => {}

      const strategy = new Strategy(
        {
          secret: 'top-secret',
          userFields: ['email'],
          tokenField: 'token'
        },
        sendToken,
        verifyUser)

      testPassport
        .use(strategy)
        .fail(result => {
          expect(result.message).toBe('Mandatory user fields missing')
          done()
        })
        .authenticate({action: 'requestToken'})

      testPassport
        .use(strategy)
        .fail(result => {
          expect(result.message).toBe('Mandatory user fields missing')
          done()
        })
        .authenticate({action: 'requestToken', allowPost: true})
    })

    describe('when the user is verified before the token is sent', () => {
      test('calls error when the token creation fails', (done) => {
        const signMock = jest.spyOn(jwt, 'sign')
        signMock.mockImplementation((payload, secretOrPrivateKey, options, callback) => {
          callback(new Error('Token sign error'))
        })

        const sendToken = () => {}
        const verifyUser = jest.fn(() => Promise.resolve({email: 'john@doe.com'}))

        const strategy = new Strategy(
          {
            secret: 'top-secret',
            userFields: ['email'],
            tokenField: 'token'
          },
          sendToken,
          verifyUser)

        testPassport
          .use(strategy)
          .req(req => {
            req.query = {
              email: 'john@doe.com'
            }
          })
          .error(result => {
            expect(result.message).toBe('Token sign error')
            signMock.mockRestore()
            done()
          })
          .authenticate({action: 'requestToken'})

        expect(verifyUser).toHaveBeenCalledWith({email: 'john@doe.com'})
      })

      test('calls error when the verifyUser function rejects', (done) => {
        const sendToken = () => {}
        const verifyUser = () => Promise.reject(new Error('No user found'))

        const strategy = new Strategy(
          {
            secret: 'top-secret',
            userFields: ['email'],
            tokenField: 'token'
          },
          sendToken,
          verifyUser)

        testPassport
          .use(strategy)
          .req(req => {
            req.query = {
              email: 'john@doe.com'
            }
          })
          .error(result => {
            expect(result.message).toBe('No user found')
            done()
          })
          .authenticate({action: 'requestToken'})
      })

      test('fails when the verifyUser function does not return a user', (done) => {
        const sendToken = () => {}
        const verifyUser = jest.fn(() => Promise.resolve(null))

        const strategy = new Strategy(
          {
            secret: 'top-secret',
            userFields: ['email'],
            tokenField: 'token'
          },
          sendToken,
          verifyUser)

        testPassport
          .use(strategy)
          .req(req => {
            req.query = {
              email: 'john@doe.com'
            }
          })
          .fail(result => {
            expect(result.message).toBe('No user found')
            done()
          })
          .authenticate({action: 'requestToken'})

        expect(verifyUser).toHaveBeenCalledWith({email: 'john@doe.com'})
      })

      describe('when the passReqToCallbacks option is true', () => {
        test('calls error when the sendToken function rejects', (done) => {
          const signMock = jest.spyOn(jwt, 'sign')
          signMock.mockImplementation((payload, secretOrPrivateKey, options, callback) => {
            callback(null, '123456')
          })

          const sendToken = jest.fn((user, token) => Promise.reject(new Error('Token send error')))
          const verifyUser = jest.fn(() => Promise.resolve({
            name: 'John Doe',
            email: 'john@doe.com'
          }))

          const strategy = new Strategy(
            {
              secret: 'top-secret',
              userFields: ['email', 'name'],
              tokenField: 'token',
              passReqToCallbacks: true
            },
            sendToken,
            verifyUser)

          testPassport
            .use(strategy)
            .req(req => {
              req.query = {
                name: 'John Doe',
                email: 'john@doe.com'
              }
            })
            .error(result => {
              expect(result.message).toBe('Token send error')
              expect(sendToken).toHaveBeenCalledWith(
                {
                  headers: {},
                  method: 'GET',
                  url: '/',
                  query: {
                    name: 'John Doe',
                    email: 'john@doe.com'
                  }
                },
                {
                  name: 'John Doe',
                  email: 'john@doe.com'
                }, '123456')
              signMock.mockRestore()
              done()
            })
            .authenticate({action: 'requestToken'})

          expect(verifyUser).toHaveBeenCalledWith({
            headers: {},
            method: 'GET',
            query: {
              email: 'john@doe.com',
              name: 'John Doe'
            },
            url: '/'
          }, {name: 'John Doe', email: 'john@doe.com'})
        })

        test('pass with success message', (done) => {
          const signMock = jest.spyOn(jwt, 'sign')
          signMock.mockImplementation((payload, secretOrPrivateKey, options, callback) => {
            callback(null, '123456')
          })

          const sendToken = jest.fn((user, token) => Promise.resolve())
          const verifyUser = jest.fn(() => Promise.resolve({
            name: 'John Doe',
            email: 'john@doe.com'
          }))

          const strategy = new Strategy(
            {
              secret: 'top-secret',
              userFields: ['email', 'name'],
              tokenField: 'token',
              passReqToCallbacks: true
            },
            sendToken,
            verifyUser)

          testPassport
            .use(strategy)
            .req(req => {
              req.query = {
                name: 'John Doe',
                email: 'john@doe.com'
              }
            })
            .pass(result => {
              expect(result.message).toBe('Token succesfully delivered')
              expect(sendToken).toHaveBeenCalledWith(
                {
                  headers: {},
                  method: 'GET',
                  url: '/',
                  query: {
                    name: 'John Doe',
                    email: 'john@doe.com'
                  }
                }, {
                  name: 'John Doe',
                  email: 'john@doe.com'
                }, '123456')
              signMock.mockRestore()
              done()
            })
            .authenticate({action: 'requestToken'})

          expect(verifyUser).toHaveBeenCalledWith({
            headers: {},
            method: 'GET',
            query: {
              email: 'john@doe.com',
              name: 'John Doe'
            },
            url: '/'
          }, {name: 'John Doe', email: 'john@doe.com'})
        })
      })

      describe('when the passReqToCallbacks option is false', () => {
        test('pass with success message', (done) => {
          const signMock = jest.spyOn(jwt, 'sign')
          signMock.mockImplementation((payload, secretOrPrivateKey, options, callback) => {
            callback(null, '123456')
          })

          const sendToken = jest.fn((user, token) => Promise.resolve())
          const verifyUser = jest.fn(() => Promise.resolve({
            name: 'John Doe',
            email: 'john@doe.com'
          }))

          const strategy = new Strategy(
            {
              secret: 'top-secret',
              userFields: ['email', 'name'],
              tokenField: 'token'
            },
            sendToken,
            verifyUser)

          testPassport
            .use(strategy)
            .req(req => {
              req.query = {
                name: 'John Doe',
                email: 'john@doe.com'
              }
            })
            .pass(result => {
              expect(result.message).toBe('Token succesfully delivered')
              expect(sendToken).toHaveBeenCalledWith({
                name: 'John Doe',
                email: 'john@doe.com'
              }, '123456')
              signMock.mockRestore()
              done()
            })
            .authenticate({action: 'requestToken'})

          expect(verifyUser).toHaveBeenCalledWith({name: 'John Doe', email: 'john@doe.com'})
        })
      })
    })

    describe('when the user is verified after the token is sent', () => {
      test('calls error when the token creation fails', (done) => {
        const signMock = jest.spyOn(jwt, 'sign')
        signMock.mockImplementation((payload, secretOrPrivateKey, options, callback) => {
          callback(new Error('Token sign error'))
        })

        const sendToken = () => {}
        const verifyUser = () => {}

        const strategy = new Strategy(
          {
            secret: 'top-secret',
            userFields: ['email'],
            tokenField: 'token',
            verifyUserAfterToken: true
          },
          sendToken,
          verifyUser)

        testPassport
          .use(strategy)
          .req(req => {
            req.query = {
              email: 'john@doe.com'
            }
          })
          .error(result => {
            expect(result.message).toBe('Token sign error')
            signMock.mockRestore()
            done()
          })
          .authenticate({action: 'requestToken'})
      })

      describe('when the passReqToCallbacks option is false', () => {
        test('pass with success message', (done) => {
          const signMock = jest.spyOn(jwt, 'sign')
          signMock.mockImplementation((payload, secretOrPrivateKey, options, callback) => {
            callback(null, '123456')
          })

          const sendToken = jest.fn((user, token) => Promise.resolve())
          const verifyUser = () => {}

          const strategy = new Strategy(
            {
              secret: 'top-secret',
              userFields: ['email', 'name'],
              tokenField: 'token',
              verifyUserAfterToken: true
            },
            sendToken,
            verifyUser)

          testPassport
            .use(strategy)
            .req(req => {
              req.query = {
                email: 'john@doe.com',
                name: 'John Doe'
              }
            })
            .pass(result => {
              expect(result.message).toBe('Token succesfully delivered')
              expect(sendToken).toHaveBeenCalledWith({
                email: 'john@doe.com',
                name: 'John Doe'
              }, '123456')
              signMock.mockRestore()
              done()
            })
            .authenticate({action: 'requestToken'})
        })
      })

      describe('when the passReqToCallbacks option is true', () => {
        test('pass with success message', (done) => {
          const signMock = jest.spyOn(jwt, 'sign')
          signMock.mockImplementation((payload, secretOrPrivateKey, options, callback) => {
            callback(null, '123456')
          })

          const sendToken = jest.fn((user, token) => Promise.resolve())
          const verifyUser = () => {}

          const strategy = new Strategy(
            {
              secret: 'top-secret',
              userFields: ['email', 'name'],
              tokenField: 'token',
              verifyUserAfterToken: true,
              passReqToCallbacks: true
            },
            sendToken,
            verifyUser)

          testPassport
            .use(strategy)
            .req(req => {
              req.query = {
                email: 'john@doe.com',
                name: 'John Doe'
              }
            })
            .pass(result => {
              expect(result.message).toBe('Token succesfully delivered')
              expect(sendToken).toHaveBeenCalledWith({
                headers: {},
                method: 'GET',
                url: '/',
                query: {
                  name: 'John Doe',
                  email: 'john@doe.com'
                }
              }, {
                email: 'john@doe.com',
                name: 'John Doe'
              }, '123456')
              signMock.mockRestore()
              done()
            })
            .authenticate({action: 'requestToken'})
        })
      })
    })
  })

  describe('#acceptToken', () => {
    test('fails when the token is not found', (done) => {
      const sendToken = () => {}
      const verifyUser = () => {}

      const strategy = new Strategy(
        {
          secret: 'top-secret',
          userFields: ['email', 'name'],
          tokenField: 'token'
        },
        sendToken,
        verifyUser)

      testPassport
        .use(strategy)
        .fail(result => {
          expect(result.message).toBe('Token missing')
          done()
        })
        .authenticate({action: 'acceptToken'})

      testPassport
        .use(strategy)
        .fail(result => {
          expect(result.message).toBe('Token missing')
          done()
        })
        .authenticate({action: 'acceptToken', allowPost: true})
    })

    test('fails when the token validation fails', (done) => {
      const verifyMock = jest.spyOn(jwt, 'verify')
      verifyMock.mockImplementation((jwtString, secretOrPrivateKey, callback) => {
        callback(new Error('Token verification error'))
      })

      const sendToken = () => {}
      const verifyUser = () => {}

      const strategy = new Strategy(
        {
          secret: 'top-secret',
          userFields: ['email', 'name'],
          tokenField: 'token'
        },
        sendToken,
        verifyUser)

      testPassport
        .use(strategy)
        .req(req => {
          req.query = {
            token: '123456'
          }
        })
        .fail(result => {
          expect(result.message).toBe('Token verification error')
          verifyMock.mockRestore()
          done()
        })
        .authenticate({action: 'acceptToken'})
    })

    describe('when the token reuse is not allowed', () => {
      test('fails if the token has been used before', (done) => {
        const verifyMock = jest.spyOn(jwt, 'verify')
        verifyMock.mockImplementation((jwtString, secretOrPrivateKey, callback) => {
          callback(null, {
            user: {
              name: 'John Doe',
              email: 'john@doe.com'
            },
            exp: new Date('01-01-2019')
          })
        })

        const storageGetMock = jest.spyOn(storage, 'get')
        const storageSetMock = jest.spyOn(storage, 'set')
        storageGetMock.mockImplementationOnce((key) => {
          return {
            '234567': new Date('2019-05-01'),
            '456789': new Date('2019-01-02')
          }
        })

        const sendToken = () => {}
        const verifyUser = () => {}

        const strategy = new Strategy(
          {
            secret: 'top-secret',
            userFields: ['email', 'name'],
            tokenField: 'token'
          },
          sendToken,
          verifyUser)

        testPassport
          .use(strategy)
          .req(req => {
            req.query = {
              token: '789123'
            }
          })
          .success(user => {
            expect(storageSetMock).toHaveBeenCalledWith('john@doe.com', {'234567': new Date('2019-05-01'), '789123': new Date('01-01-2019')})

            testPassport
              .use(strategy)
              .req(req => {
                req.query = {
                  token: '234567'
                }
              })
              .fail(err => {
                expect(err.message).toBe('Token was already used')
                expect(err.status).toBe(400)
                verifyMock.mockRestore()
                storageSetMock.mockRestore()
                storageGetMock.mockRestore()
                done()
              })
              .authenticate({action: 'acceptToken', allowReuse: false})
          })
          .authenticate({action: 'acceptToken', allowReuse: false})
      })
    })

    describe('when the user is verified before the token is sent', () => {
      test('succeeds when the token is valid and the token is not reused', (done) => {
        const verifyMock = jest.spyOn(jwt, 'verify')
        verifyMock.mockImplementation((jwtString, secretOrPrivateKey, callback) => {
          callback(null, {
            user: {
              name: 'John Doe',
              email: 'john@doe.com'
            }
          })
        })

        const sendToken = () => {}
        const verifyUser = () => {}

        const strategy = new Strategy(
          {
            secret: 'top-secret',
            userFields: ['email', 'name'],
            tokenField: 'token'
          },
          sendToken,
          verifyUser)

        testPassport
          .use(strategy)
          .req(req => {
            req.query = {
              token: '123456'
            }
          })
          .success(user => {
            expect(user).toMatchObject({
              name: 'John Doe',
              email: 'john@doe.com'
            })
            verifyMock.mockRestore()
            done()
          })
          .authenticate({action: 'acceptToken', allowReuse: true})
      })
    })

    describe('when the user is verified after the token is sent', () => {
      describe('when the passReqToCallbacks option is true', () => {
        test('calls error when the verifyUser function rejects', (done) => {
          const verifyMock = jest.spyOn(jwt, 'verify')
          verifyMock.mockImplementation((jwtString, secretOrPrivateKey, callback) => {
            callback(null, {
              user: {
                name: 'John Doe',
                email: 'john@doe.com'
              }
            })
          })

          const sendToken = () => {}
          const verifyUser = jest.fn(() => Promise.reject(new Error('User not found')))

          const strategy = new Strategy(
            {
              secret: 'top-secret',
              userFields: ['email', 'name'],
              tokenField: 'token',
              verifyUserAfterToken: true,
              passReqToCallbacks: true
            },
            sendToken,
            verifyUser)

          testPassport
            .use(strategy)
            .req(req => {
              req.query = {
                token: '123456'
              }
            })
            .error(result => {
              expect(result.message).toBe('User not found')
              expect(verifyUser).toHaveBeenCalledWith({
                headers: {},
                method: 'GET',
                query: {
                  token: '123456'
                },
                url: '/'
              }, {
                email: 'john@doe.com',
                name: 'John Doe'
              })
              verifyMock.mockRestore()

              done()
            })
            .authenticate({action: 'acceptToken'})
        })

        test('fails when the user is not found', (done) => {
          const verifyMock = jest.spyOn(jwt, 'verify')
          verifyMock.mockImplementation((jwtString, secretOrPrivateKey, callback) => {
            callback(null, {
              user: {
                name: 'John Doe',
                email: 'john@doe.com'
              }
            })
          })

          const sendToken = () => {}
          const verifyUser = jest.fn(() => Promise.resolve(null))

          const strategy = new Strategy(
            {
              secret: 'top-secret',
              userFields: ['email', 'name'],
              tokenField: 'token',
              verifyUserAfterToken: true,
              passReqToCallbacks: true
            },
            sendToken,
            verifyUser)

          testPassport
            .use(strategy)
            .req(req => {
              req.query = {
                token: '123456'
              }
            })
            .fail(result => {
              expect(result.message).toBe('No user found')
              expect(verifyUser).toHaveBeenCalledWith({
                headers: {},
                method: 'GET',
                query: {
                  token: '123456'
                },
                url: '/'
              }, {
                email: 'john@doe.com',
                name: 'John Doe'
              })
              verifyMock.mockRestore()

              done()
            })
            .authenticate({action: 'acceptToken'})
        })

        test('succeeds when the user is found', (done) => {
          const verifyMock = jest.spyOn(jwt, 'verify')
          verifyMock.mockImplementation((jwtString, secretOrPrivateKey, callback) => {
            callback(null, {
              user: {
                name: 'John Doe',
                email: 'john@doe.com'
              }
            })
          })

          const sendToken = () => {}
          const verifyUser = jest.fn(() => Promise.resolve({email: 'john@doe.com', name: 'John Doe'}))

          const strategy = new Strategy(
            {
              secret: 'top-secret',
              userFields: ['email', 'name'],
              tokenField: 'token',
              verifyUserAfterToken: true,
              passReqToCallbacks: true
            },
            sendToken,
            verifyUser)

          testPassport
            .use(strategy)
            .req(req => {
              req.query = {
                token: '123456'
              }
            })
            .success(user => {
              expect(user).toMatchObject({
                email: 'john@doe.com',
                name: 'John Doe'
              })
              expect(verifyUser).toHaveBeenCalledWith({
                headers: {},
                method: 'GET',
                query: {
                  token: '123456'
                },
                url: '/'
              }, {
                email: 'john@doe.com',
                name: 'John Doe'
              })
              verifyMock.mockRestore()

              done()
            })
            .authenticate({action: 'acceptToken', allowReuse: true})
        })
      })

      describe('when the passReqToCallbacks option is false', () => {
        test('calls error when the verifyUser function rejects', (done) => {
          const verifyMock = jest.spyOn(jwt, 'verify')
          verifyMock.mockImplementation((jwtString, secretOrPrivateKey, callback) => {
            callback(null, {
              user: {
                name: 'John Doe',
                email: 'john@doe.com'
              }
            })
          })

          const sendToken = () => {}
          const verifyUser = jest.fn(() => Promise.reject(new Error('User not found')))

          const strategy = new Strategy(
            {
              secret: 'top-secret',
              userFields: ['email', 'name'],
              tokenField: 'token',
              verifyUserAfterToken: true
            },
            sendToken,
            verifyUser)

          testPassport
            .use(strategy)
            .req(req => {
              req.query = {
                token: '123456'
              }
            })
            .error(result => {
              expect(result.message).toBe('User not found')
              expect(verifyUser).toHaveBeenCalledWith({
                email: 'john@doe.com',
                name: 'John Doe'
              })
              verifyMock.mockRestore()

              done()
            })
            .authenticate({action: 'acceptToken'})
        })

        test('fails when the user is not found', (done) => {
          const verifyMock = jest.spyOn(jwt, 'verify')
          verifyMock.mockImplementation((jwtString, secretOrPrivateKey, callback) => {
            callback(null, {
              user: {
                name: 'John Doe',
                email: 'john@doe.com'
              }
            })
          })

          const sendToken = () => {}
          const verifyUser = jest.fn(() => Promise.resolve(null))

          const strategy = new Strategy(
            {
              secret: 'top-secret',
              userFields: ['email', 'name'],
              tokenField: 'token',
              verifyUserAfterToken: true
            },
            sendToken,
            verifyUser)

          testPassport
            .use(strategy)
            .req(req => {
              req.query = {
                token: '123456'
              }
            })
            .fail(result => {
              expect(result.message).toBe('No user found')
              expect(verifyUser).toHaveBeenCalledWith({
                email: 'john@doe.com',
                name: 'John Doe'
              })
              verifyMock.mockRestore()

              done()
            })
            .authenticate({action: 'acceptToken'})
        })

        test('succeeds when the user is found', (done) => {
          const verifyMock = jest.spyOn(jwt, 'verify')
          verifyMock.mockImplementation((jwtString, secretOrPrivateKey, callback) => {
            callback(null, {
              user: {
                name: 'John Doe',
                email: 'john@doe.com'
              }
            })
          })

          const sendToken = () => {}
          const verifyUser = jest.fn(() => Promise.resolve({email: 'john@doe.com', name: 'John Doe'}))

          const strategy = new Strategy(
            {
              secret: 'top-secret',
              userFields: ['email', 'name'],
              tokenField: 'token',
              verifyUserAfterToken: true
            },
            sendToken,
            verifyUser)

          testPassport
            .use(strategy)
            .req(req => {
              req.query = {
                token: '123456'
              }
            })
            .success(user => {
              expect(user).toMatchObject({
                email: 'john@doe.com',
                name: 'John Doe'
              })
              expect(verifyUser).toHaveBeenCalledWith({
                email: 'john@doe.com',
                name: 'John Doe'
              })
              verifyMock.mockRestore()

              done()
            })
            .authenticate({action: 'acceptToken'})
        })
      })
    })
  })

  test('calls acceptToken as a default action', (done) => {
    const sendToken = () => {}
    const verifyUser = () => {}

    const strategy = new Strategy(
      {
        secret: 'top-secret',
        userFields: ['email', 'name'],
        tokenField: 'token'
      },
      sendToken,
      verifyUser)

    testPassport
      .use(strategy)
      .fail(result => {
        expect(result.message).toBe('Token missing')
        done()
      })
      .authenticate()
  })

  test('calls error when non existing action is called', (done) => {
    const sendToken = () => {}
    const verifyUser = () => {}

    const strategy = new Strategy(
      {
        secret: 'top-secret',
        userFields: ['email', 'name'],
        tokenField: 'token'
      },
      sendToken,
      verifyUser)

    testPassport
      .use(strategy)
      .error(result => {
        expect(result.message).toBe('Unknown action')
        done()
      })
      .authenticate({action: 'invalid'})
  })
})
