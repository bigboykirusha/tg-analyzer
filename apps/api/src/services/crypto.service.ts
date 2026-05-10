import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { config } from '../config'

const ALGORITHM = 'aes-256-gcm'
const SECRET_KEY = Buffer.from(config.SESSION_ENCRYPTION_KEY, 'hex')

export interface EncryptedSession {
  encrypted: string
  iv: string
  authTag: string
}

export function encryptSession(sessionString: string): EncryptedSession {
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, SECRET_KEY, iv)
  let encrypted = cipher.update(sessionString, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: cipher.getAuthTag().toString('hex'),
  }
}

export function decryptSession(encrypted: string, iv: string, authTag: string) {
  const decipher = createDecipheriv(ALGORITHM, SECRET_KEY, Buffer.from(iv, 'hex'))
  decipher.setAuthTag(Buffer.from(authTag, 'hex'))

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}
