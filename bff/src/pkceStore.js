/**
 * In-memory PKCE session store.
 * Survives the Keycloak round-trip even when Set-Cookie is dropped by a
 * reverse proxy (common with vue-cli devServer proxy + 302 redirects).
 * Single-process only — fine for local/dev and one BFF replica.
 */

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

function savePkceSession(state, { codeVerifier, redirect, silent, redirectUri }) {
  prune();
  store.set(String(state), {
    codeVerifier,
    redirect: redirect || "/",
    silent: !!silent,
    // Must match authorize-time redirect_uri on token exchange (bit-identical)
    redirectUri: redirectUri || null,
    expiresAt: Date.now() + TTL_MS,
  });
}

function takePkceSession(state) {
  prune();
  if (!state) return null;
  const key = String(state);
  const value = store.get(key);
  if (!value) return null;
  store.delete(key);
  if (value.expiresAt <= Date.now()) return null;
  return value;
}

module.exports = {
  savePkceSession,
  takePkceSession,
};
