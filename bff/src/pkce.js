const crypto = require("crypto");

function generateCodeVerifier() {
  return crypto.randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier) {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

function generateState(prefix = "") {
  const value = crypto.randomBytes(16).toString("hex");
  return prefix ? `${prefix}${value}` : value;
}

module.exports = {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
};
