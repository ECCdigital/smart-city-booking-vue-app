/**
 * Cross-tab / cross-app (same origin) session sync with Storefront.
 * HttpOnly cookie changes are invisible to JS — we broadcast logout and
 * re-validate on focus when the Admin session looks active.
 *
 * Uses BroadcastChannel + localStorage `storage` events (other tabs only).
 * Keys must match Storefront `app/utils/sharedAuthSync.ts`.
 */

export const SHARED_AUTH_CHANNEL = "scb-shared-auth";
export const MSG_SESSION_ENDED = "session-ended";
export const STORAGE_SESSION_ENDED_KEY = "scb-shared-auth-ended";

let channel = null;
let endingSession = false;

function getChannel() {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null;
  }
  if (!channel) {
    channel = new BroadcastChannel(SHARED_AUTH_CHANNEL);
  }
  return channel;
}

/** Strip router publicPath / BASE_URL so public-route checks match app paths. */
export function stripBasePath(pathname = "") {
  const path = pathname || "";
  const base = (process.env.BASE_URL || "/").replace(/\/$/, "");
  if (base && base !== "/" && path.startsWith(base)) {
    const stripped = path.slice(base.length);
    if (!stripped) return "/";
    return stripped.startsWith("/") ? stripped : `/${stripped}`;
  }
  return path;
}

/**
 * Unauthenticated entry paths — must not force a login redirect when cookies
 * are absent (cold /auth/me 401 during bootstrap).
 */
const PUBLIC_AUTH_PATH_PATTERNS = [
  /^\/login(?:\/|$)/,
  /^\/register(?:\/|$)/,
  /^\/welcome(?:\/|$)/,
  /^\/checkout(?:\/|$)/,
  /^\/password(?:\/|$)/,
  /^\/email\/verify(?:\/|$)/,
  /^\/auth\/invitation(?:\/|$)/,
  /^\/auth\/card(?:\/|$)/,
  /^\/booking\//,
  /^\/payment\/redirection(?:\/|$)/,
  /^\/sso\//,
];

export function isPublicAuthPath(pathname = window.location.pathname) {
  const path = stripBasePath(pathname);
  return PUBLIC_AUTH_PATH_PATTERNS.some((re) => re.test(path));
}

export function isAdminLoginPath(pathname = window.location.pathname) {
  return /\/login(?:\/|$)/.test(stripBasePath(pathname) || "");
}

/** True when a cold open of this path should try cookie session restore. */
export function pathLikelyRequiresAuth(pathname = "") {
  if (isPublicAuthPath(pathname)) {
    return false;
  }
  // "/" home and all admin app routes expect auth when opened directly
  return true;
}

export function broadcastSessionEnded() {
  try {
    getChannel()?.postMessage({ type: MSG_SESSION_ENDED });
  } catch {
    // ignore
  }
  try {
    localStorage.setItem(STORAGE_SESSION_ENDED_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

/**
 * Clear client auth state and hard-redirect to login when needed.
 * Redirect is synchronous so bootstrap cannot keep mounting the SPA.
 * @param {{ redirect?: boolean }} [options]
 */
export async function endAdminSession({ redirect = true } = {}) {
  if (endingSession) return;
  endingSession = true;

  try {
    sessionStorage.setItem("bffJustLoggedOut", "1");
    sessionStorage.removeItem("bffAuthSession");
    try {
      localStorage.removeItem("user");
    } catch {
      // ignore
    }

    // Redirect first — do not wait on dynamic imports / store cleanup
    if (redirect && typeof window !== "undefined" && !isPublicAuthPath()) {
      const base = (process.env.BASE_URL || "/").replace(/\/$/, "");
      window.location.replace(`${base}/login`);
    }

    broadcastSessionEnded();

    try {
      const ApiClientService = (await import("@/services/api/ApiClientService"))
        .default;
      ApiClientService.clearTokens();
    } catch {
      // ignore
    }

    try {
      const store = (await import("@/store/index")).default;
      await store.dispatch("user/delete");
    } catch {
      // ignore
    }
  } finally {
    setTimeout(() => {
      endingSession = false;
    }, 2000);
  }
}

/**
 * Start listening for session-ended from other tabs / Storefront.
 * @param {() => void | Promise<void>} onEnded
 * @returns {() => void} cleanup
 */
export function subscribeSessionEnded(onEnded) {
  const cleanups = [];

  const ch = getChannel();
  if (ch) {
    const onMessage = (event) => {
      if (event?.data?.type === MSG_SESSION_ENDED) {
        onEnded();
      }
    };
    ch.addEventListener("message", onMessage);
    cleanups.push(() => ch.removeEventListener("message", onMessage));
  }

  if (typeof window !== "undefined") {
    const onStorage = (event) => {
      if (event.key === STORAGE_SESSION_ENDED_KEY && event.newValue) {
        onEnded();
      }
    };
    window.addEventListener("storage", onStorage);
    cleanups.push(() => window.removeEventListener("storage", onStorage));
  }

  return () => cleanups.forEach((fn) => fn());
}
