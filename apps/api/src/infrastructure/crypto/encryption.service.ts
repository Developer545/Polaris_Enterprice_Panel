import { Injectable } from '@nestjs/common'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { getEnv } from '../../config/env'

const ALGORITHM = 'aes-256-cbc'
const IV_LENGTH = 16

/**
 * AES-256-CBC encryption for sensitive DB fields:
 * - tenant dbUrl (for dedicated strategies)
 * - Hacienda credentials (user, password)
 * - Digital certificate data (.p12 base64)
 */
@Injectable()
export class EncryptionService {
  private getKey(): Buffer {
    return Buffer.from(getEnv().ENCRYPTION_KEY, 'hex')
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH)
    const cipher = createCipheriv(ALGORITHM, this.getKey(), iv)
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    // Store as: iv_hex:encrypted_base64
    return `${iv.toString('hex')}:${encrypted.toString('base64')}`
  }

  decrypt(ciphertext: string): string {
    const [ivHex, encryptedBase64] = ciphertext.split(':')
    if (!ivHex || !encryptedBase64) throw new Error('Invalid ciphertext format')
    const iv = Buffer.from(ivHex, 'hex')
    const encrypted = Buffer.from(encryptedBase64, 'base64')
    const decipher = createDecipheriv(ALGORITHM, this.getKey(), iv)
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
  }
}
