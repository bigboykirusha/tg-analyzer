import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { config } from '../config'

const ALGORITHM = 'aes-256-gcm'
const KEY = Buffer.from(config.SESSION_ENCRYPTION_KEY, 'hex')

export interface EncryptedValue {
  encrypted: string
  iv: string
  authTag: string
}

export function encrypt(plaintext: string): EncryptedValue {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, KEY, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return { encrypted: encrypted.toString('hex'), iv: iv.toString('hex'), authTag: cipher.getAuthTag().toString('hex') }
}

export function decrypt(value: EncryptedValue): string {
  const decipher = createDecipheriv(ALGORITHM, KEY, Buffer.from(value.iv, 'hex'))
  decipher.setAuthTag(Buffer.from(value.authTag, 'hex'))
  return Buffer.concat([decipher.update(Buffer.from(value.encrypted, 'hex')), decipher.final()]).toString('utf8')
}

/** Encrypts a JSON value into a self-contained string, for short-lived Redis state. */
export function sealJson(value: unknown): string {
  return JSON.stringify(encrypt(JSON.stringify(value)))
}

export function openJson<T>(sealed: string): T {
  return JSON.parse(decrypt(JSON.parse(sealed) as EncryptedValue)) as T
}
