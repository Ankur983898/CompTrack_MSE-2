const crypto = require('crypto');
module.exports = {
  sha256: (s) => crypto.createHash('sha256').update(s).digest('hex'),
  randomToken: (n = 32) => crypto.randomBytes(n).toString('base64url'),
  uuid: () => crypto.randomUUID(),
};
