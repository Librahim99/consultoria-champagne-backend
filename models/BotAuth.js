const mongoose = require('mongoose');
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.BOT_ENCRYPTION_KEY; // Debe ser de 32 bytes (256 bits)
const IV_LENGTH = 16; // Para AES

const botAuthSchema = new mongoose.Schema({
  data: { type: String, required: true }, // JSON encriptado de { creds, keys }
}, { timestamps: true });

// Método para encriptar
botAuthSchema.methods.encrypt = function(plainText) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(plainText);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

// Método para desencriptar
botAuthSchema.methods.decrypt = function(encryptedText) {
  const textParts = encryptedText.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encrypted = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};

// Pre-save: encriptar data si se modifica
botAuthSchema.pre('save', function(next) {
  if (this.isModified('data')) {
    this.data = this.encrypt(JSON.stringify(this.data));
  }
  next();
});

module.exports = mongoose.model('BotAuth', botAuthSchema);