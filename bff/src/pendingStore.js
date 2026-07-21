/**
 * In-memory pending SSO token store (post-callback, pre-confirm/register).
 * Avoids relying on Set-Cookie on 302 responses through the vue-cli proxy.
 */

const crypto = require("crypto");

const store = new Map();
const TTL_MS = 5 * 60 * 1000;

function prune() {
  const now = Date.now();
  for (const [key, value] of store.entries()) {
    if (value.expiresAt <= now) {
      store.delete(key);
    }
  }
}

function createPendingTicket() {
  return crypto.randomBytes(24).toString("base64url");
}

function savePendingSession(ticket, payload) {
  prune();
  store.set(String(ticket), {
    ...payload,
    expiresAt: Date.now() + TTL_MS,
  });
}

function getPendingSession(ticket) {
  prune();
  if (!ticket) return null;
  const value = store.get(String(ticket));
  if (!value || value.expiresAt <= Date.now()) return null;
  return value;
}

function takePendingSession(ticket) {
  const value = getPendingSession(ticket);
  if (!value) return null;
  store.delete(String(ticket));
  return value;
}

module.exports = {
  createPendingTicket,
  savePendingSession,
  getPendingSession,
  takePendingSession,
};
