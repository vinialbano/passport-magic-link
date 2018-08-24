const {passport: testPassport} = require('chai').use(
  require('chai-passport-strategy')
)
const Strategy = require('../src/Strategy')
const jwt = require('jsonwebtoken')

describe('Strategy', () => {
  describe('#constructor', () => {
    test('should throw if constructed without a secret', () => {
      expect(() => new Strategy({}))
        .toThrowError('Magic Link authentication strategy requires an encryption secret')
    })

    test('should throw if constructed without a verifyUser function', () => {
      expect(() => new Strategy({
        secret: 'top-secret'
      }))
        .toThrowError('Magic Link authentication strategy requires a verifyUser function')
    })

    test('should throw if constructed without a sendToken function', () => {
      expect(() => new Strategy({
        secret: 'top-secret'
      }, () => {}))
        .toThrowError('Magic Link authentication strategy requires a sendToken function')
    })

    test('should throw if constructed without a verifyToken function', () => {
      expect(() => new Strategy({
        secret: 'top-secret'
      }, () => {}, () => {}))
        .toThrowError('Magic Link authentication strategy requires a verifyToken function')
    })

    test('strategy defaults', () => {
      let strategy
      const verifyUser = () => {}
      const sendToken = () => {}
      const verifyToken = () => {}

      expect(() => {
        strategy = new Strategy(
          {
            secret: 'top-secret'
          },
          verifyUser,
          sendToken,
          verifyToken)
      }).not.toThrow()
      expect(strategy.name).toBe('magiclink')
      expect(strategy.secret).toBe('top-secret')
      expect(strategy.verifyUser).toBe(verifyUser)
      expect(strategy.sendToken).toBe(sendToken)
      expect(strategy.verifyToken).toBe(verifyToken)
      expect(strategy.ttl).toBe(600)
      expect(strategy.passReqToCallback).toBeFalsy()
    })
  })

  describe('#requestToken', () => {
    test('fails when the verifyUser function rejects', (done) => {
      const verifyUser = () => Promise.reject(new Error('Verify user error'))
      const sendToken = () => {}
      const verifyToken = () => {}

      const strategy = new Strategy(
        {
          secret: 'top-secret'
        },
        verifyUser,
        sendToken,
        verifyToken)

      testPassport
        .use(strategy)
        .fail(result => {
          expect(result.message).toBe('Verify user error')
          done()
        })
        .authenticate({action: 'requestToken'})
    })

    test('fails when the verifyUser function does not resolve to a user', (done) => {
      const verifyUser = () => Promise.resolve(null)
      const sendToken = () => {}
      const verifyToken = () => {}

      const strategy = new Strategy(
        {
          secret: 'top-secret'
        },
        verifyUser,
        sendToken,
        verifyToken)

      testPassport
        .use(strategy)
        .fail(result => {
          expect(result.message).toBe('No user found')
          done()
        })
        .authenticate({action: 'requestToken'})
    })

    test('calls error when the token creation fails', (done) => {
      const signMock = jest.spyOn(jwt, 'sign')
      signMock.mockImplementation((payload, secretOrPrivateKey, options, callback) => {
        callback(new Error('Token sign error'))
      })

      const verifyUser = () => Promise.resolve({
        name: 'John Doe',
        email: 'john@doe.com'
      })
      const sendToken = () => {}
      const verifyToken = () => {}

      const strategy = new Strategy(
        {
          secret: 'top-secret'
        },
        verifyUser,
        sendToken,
        verifyToken)

      testPassport
        .use(strategy)
        .error(result => {
          expect(result.message).toBe('Token sign error')
          signMock.mockRestore()
          done()
        })
        .authenticate({action: 'requestToken'})
    })

    describe('when the passReqToCallback option is false', () => {
      test('calls error when the sendToken function rejects', (done) => {
        const signMock = jest.spyOn(jwt, 'sign')
        signMock.mockImplementation((payload, secretOrPrivateKey, options, callback) => {
          callback(null, '123456')
        })
        const verifyUser = () => Promise.resolve({
          name: 'John Doe',
          email: 'john@doe.com'
        })
        const sendToken = jest.fn((user, token) => Promise.reject(new Error('Token send error')))
        const verifyToken = () => {}

        const strategy = new Strategy(
          {
            secret: 'top-secret'
          },
          verifyUser,
          sendToken,
          verifyToken)

        testPassport
          .use(strategy)
          .error(result => {
            expect(result.message).toBe('Token send error')
            expect(sendToken).toHaveBeenCalledWith({
              name: 'John Doe',
              email: 'john@doe.com'
            }, '123456')
            signMock.mockRestore()
            done()
          })
          .authenticate({action: 'requestToken'})
      })

      test('pass with success message', (done) => {
        const signMock = jest.spyOn(jwt, 'sign')
        signMock.mockImplementation((payload, secretOrPrivateKey, options, callback) => {
          callback(null, '123456')
        })
        const verifyUser = () => Promise.resolve({
          name: 'John Doe',
          email: 'john@doe.com'
        })
        const sendToken = jest.fn((user, token) => Promise.resolve())
        const verifyToken = () => {}

        const strategy = new Strategy(
          {
            secret: 'top-secret'
          },
          verifyUser,
          sendToken,
          verifyToken)

        testPassport
          .use(strategy)
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
      })
    })

    describe('when the passReqToCallback option is true', () => {
      test('calls error when the sendToken function rejects', (done) => {
        const signMock = jest.spyOn(jwt, 'sign')
        signMock.mockImplementation((payload, secretOrPrivateKey, options, callback) => {
          callback(null, '123456')
        })
        const verifyUser = () => Promise.resolve({
          name: 'John Doe',
          email: 'john@doe.com'
        })
        const sendToken = jest.fn((user, token) => Promise.reject(new Error('Token send error')))
        const verifyToken = () => {}

        const strategy = new Strategy(
          {
            secret: 'top-secret',
            passReqToCallback: true
          },
          verifyUser,
          sendToken,
          verifyToken)

        testPassport
          .use(strategy)
          .error(result => {
            expect(result.message).toBe('Token send error')
            expect(sendToken).toHaveBeenCalledWith(
              {
                headers: {},
                method: 'GET',
                url: '/'
              },
              {
                name: 'John Doe',
                email: 'john@doe.com'
              }, '123456')
            signMock.mockRestore()
            done()
          })
          .authenticate({action: 'requestToken'})
      })

      test('pass with success message', (done) => {
        const signMock = jest.spyOn(jwt, 'sign')
        signMock.mockImplementation((payload, secretOrPrivateKey, options, callback) => {
          callback(null, '123456')
        })
        const verifyUser = () => Promise.resolve({
          name: 'John Doe',
          email: 'john@doe.com'
        })
        const sendToken = jest.fn((user, token) => Promise.resolve())
        const verifyToken = () => {}

        const strategy = new Strategy(
          {
            secret: 'top-secret',
            passReqToCallback: true
          },
          verifyUser,
          sendToken,
          verifyToken)

        testPassport
          .use(strategy)
          .pass(result => {
            expect(result.message).toBe('Token succesfully delivered')
            expect(sendToken).toHaveBeenCalledWith(
              {
                headers: {},
                method: 'GET',
                url: '/'
              }, {
                name: 'John Doe',
                email: 'john@doe.com'
              }, '123456')
            signMock.mockRestore()
            done()
          })
          .authenticate({action: 'requestToken'})
      })
    })
  })

  describe('#acceptToken', () => {
    test('fails when the verifyToken function rejects', (done) => {
      const verifyUser = () => {}
      const sendToken = () => {}
      const verifyToken = () => Promise.reject(new Error('Verify token error'))

      const strategy = new Strategy(
        {
          secret: 'top-secret'
        },
        verifyUser,
        sendToken,
        verifyToken)

      testPassport
        .use(strategy)
        .fail(result => {
          expect(result.message).toBe('Verify token error')
          done()
        })
        .authenticate({action: 'acceptToken'})
    })

    test('pass with no token message when no token is found', (done) => {
      const verifyUser = () => {}
      const sendToken = () => {}
      const verifyToken = () => Promise.resolve(null)

      const strategy = new Strategy(
        {
          secret: 'top-secret'
        },
        verifyUser,
        sendToken,
        verifyToken)

      testPassport
        .use(strategy)
        .pass(result => {
          expect(result.message).toBe('No token found')
          done()
        })
        .authenticate({action: 'acceptToken'})
    })

    test('calls error when the token validation fails', (done) => {
      const verifyMock = jest.spyOn(jwt, 'verify')
      verifyMock.mockImplementation((jwtString, secretOrPrivateKey, callback) => {
        callback(new Error('Token verification error'))
      })

      const verifyUser = () => {}
      const sendToken = () => {}
      const verifyToken = () => Promise.resolve('123456')

      const strategy = new Strategy(
        {
          secret: 'top-secret'
        },
        verifyUser,
        sendToken,
        verifyToken)

      testPassport
        .use(strategy)
        .error(result => {
          expect(result.message).toBe('Token verification error')
          verifyMock.mockRestore()
          done()
        })
        .authenticate({action: 'acceptToken'})
    })

    test('succeeds when the token is valid and returns the user object', (done) => {
      const verifyMock = jest.spyOn(jwt, 'verify')
      verifyMock.mockImplementation((jwtString, secretOrPrivateKey, callback) => {
        callback(null, {
          user: {
            name: 'John Doe',
            email: 'john@doe.com'
          }
        })
      })

      const verifyUser = () => {}
      const sendToken = () => {}
      const verifyToken = () => Promise.resolve('123456')

      const strategy = new Strategy(
        {
          secret: 'top-secret'
        },
        verifyUser,
        sendToken,
        verifyToken)

      testPassport
        .use(strategy)
        .success(user => {
          expect(user).toMatchObject({
            name: 'John Doe',
            email: 'john@doe.com'
          })
          verifyMock.mockRestore()
          done()
        })
        .authenticate({action: 'acceptToken'})
    })

    test('calls error when non existing action is called', (done) => {
      const verifyUser = () => {}
      const sendToken = () => {}
      const verifyToken = () => {}

      const strategy = new Strategy(
        {
          secret: 'top-secret'
        },
        verifyUser,
        sendToken,
        verifyToken)

      testPassport
        .use(strategy)
        .error(result => {
          expect(result.message).toBe('Unknown action')
          done()
        })
        .authenticate({action: 'invalid'})
    })
  })
})
