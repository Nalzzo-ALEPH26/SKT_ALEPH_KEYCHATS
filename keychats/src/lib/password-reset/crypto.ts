import 'server-only'

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

function encryptionKey() {
  const secret = process.env.SUPABASE_SECRET_KEY
  if (!secret) throw new Error('PASSWORD_RESET_SECRET_MISSING')
  return createHash('sha256').update(`keychats-password-reset:${secret}`).digest()
}

export function generatePasswordResetToken() {
  return randomBytes(32).toString('base64url')
}

export function hashPasswordResetToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function encryptTemporaryPassword(password: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv, tag, ciphertext].map((part) => part.toString('base64url')).join('.')
}

export function decryptTemporaryPassword(payload: string) {
  const [ivValue, tagValue, ciphertextValue] = payload.split('.')
  if (!ivValue || !tagValue || !ciphertextValue) throw new Error('PASSWORD_RESET_PAYLOAD_INVALID')
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivValue, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}
