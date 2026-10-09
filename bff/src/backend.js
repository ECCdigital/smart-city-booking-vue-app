const { apiBaseUrl } = require("./config");

const DEFAULT_FETCH_TIMEOUT_MS = 10_000;

class BackendUnreachableError extends Error {
  constructor(cause) {
    super(`Backend API unreachable at ${apiBaseUrl}`);
    this.name = "BackendUnreachableError";
    this.cause = cause;
    this.status = 502;
  }
}

/**
 * fetch with AbortController timeout. Aborts become BackendUnreachableError.
 */
async function fetchWithTimeout(
  url,
  options = {},
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new BackendUnreachableError(
        new Error(`Request timed out after ${timeoutMs}ms`)
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function backendFetch(path, options = {}) {
  const url = `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = {
    Accept: "application/json",
    ...(options.headers || {}),
  };

  let body = options.body;
  if (body !== undefined && typeof body !== "string") {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetchWithTimeout(url, {
      method: options.method || "GET",
      headers,
      body,
    });
  } catch (error) {
    if (error instanceof BackendUnreachableError) {
      console.error(
        `BFF → API failed (${url}):`,
        error.cause?.message || error.message
      );
      throw error;
    }
    console.error(`BFF → API failed (${url}):`, error.message);
    throw new BackendUnreachableError(error);
  }

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  return { response, data, status: response.status, ok: response.ok };
}

/**
 * Answers an error caught around `backendFetch`: `502` when the backend is
 * unreachable, `500` (logged) for anything else.
 */
function sendCaughtError(res, error, fallbackMessage) {
  if (error instanceof BackendUnreachableError) {
    return res.status(502).json({
      success: false,
      message: error.message,
    });
  }
  console.error(fallbackMessage, error);
  return res.status(500).json({ success: false, message: fallbackMessage });
}

module.exports = {
  backendFetch,
  BackendUnreachableError,
  sendCaughtError,
  fetchWithTimeout,
  DEFAULT_FETCH_TIMEOUT_MS,
};
