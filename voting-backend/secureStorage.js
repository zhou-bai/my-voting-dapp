// secureStorage.js
const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function encrypt(text, secret) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    crypto.scryptSync(secret, 'salt', 32),
    iv
  );
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(text, secret) {
  const [ivPart, encryptedPart] = text.split(':');
  const iv = Buffer.from(ivPart, 'hex');
  const encrypted = Buffer.from(encryptedPart, 'hex');
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    crypto.scryptSync(secret, 'salt', 32),
    iv
  );
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

module.exports = { encrypt, decrypt };