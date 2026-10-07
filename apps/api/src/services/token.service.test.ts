import test from 'node:test'
import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'
import { config } from '../config'
import { signToken, verifyToken } from './token.service'

const claims = {
  sub: '11111111-1111-4111-8111-111111111111',
  familyId: '22222222-2222-4222-8222-222222222222',
}

test('tokens are bound to purpose, version, issuer and algorithm', () => {
  const token = signToken('access', claims)
  assert.equal(verifyToken(token, 'access').sub, claims.sub)
  const legacyWsToken = jwt.sign({ ...claims, kind: 'ws', version: 2 }, config.JWT_SECRET, {
    algorithm: 'HS256',
    issuer: 'tg-analyzer',
  })
  assert.throws(() => verifyToken(legacyWsToken, 'access'))
  assert.throws(() => verifyToken(jwt.sign(claims, config.JWT_SECRET), 'access'))
  assert.throws(() =>
    verifyToken(
      jwt.sign({ ...claims, kind: 'access', version: 2 }, config.JWT_SECRET, {
        algorithm: 'HS384',
        issuer: 'tg-analyzer',
      }),
      'access',
    ),
  )
  const decoded = jwt.decode(token) as { exp: number; iat: number }
  assert.equal(decoded.exp! - decoded.iat!, 900)
})

test('expired and malformed subject tokens are rejected', () => {
  assert.throws(() =>
    verifyToken(
      jwt.sign({ ...claims, version: 2, kind: 'access' }, config.JWT_SECRET, { expiresIn: -1, issuer: 'tg-analyzer' }),
      'access',
    ),
  )
  assert.throws(() => verifyToken(signToken('access', { ...claims, sub: '' }), 'access'))
})
