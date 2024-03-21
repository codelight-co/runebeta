import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

interface EncryptionOptions {
  /** Encryption key. */
  key: string;
  /** One of the `crypto.getCiphers()` algorithms. */
  algorithm: string;
  /** IV Length to use in bytes. */
  ivLength: number;
}

/**
 * Encrypts the supplied string with the columns options.
 *
 * @param string The string to encrypt.
 * @param options The encryption options.
 */
export function encryptString(string: string, options: EncryptionOptions) {
  const buffer = Buffer.from(string, 'utf8');
  const iv = randomBytes(options.ivLength);
  const key = Buffer.from(options.key, 'hex');

  const cipher = createCipheriv(options.algorithm, key, iv);
  const start = cipher.update(buffer);
  const end = cipher.final();

  return Buffer.concat([iv, start, end]).toString('base64');
}

/**
 * Decrypts the supplied string using the column options.
 *
 * @param string The string to decrypt,
 * @param options The encryption options.
 */
export function decryptString(string: string, options: EncryptionOptions) {
  const buffer = Buffer.from(string, 'base64');
  const iv = buffer.slice(0, options.ivLength);
  const key = Buffer.from(options.key, 'hex');

  const decipher = createDecipheriv(options.algorithm, key, iv);
  const start = decipher.update(buffer.slice(options.ivLength));
  const end = decipher.final();

  return Buffer.concat([start, end]).toString('utf8');
}
