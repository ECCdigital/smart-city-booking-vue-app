const { apiBaseUrl } = require("./config");

class BackendUnreachableError extends Error {
  constructor(cause) {
    super(`Backend API unreachable at ${apiBaseUrl}`);
    this.name = "BackendUnreachableError";
    this.cause = cause;
    this.status = 502;
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
    response = await fetch(url, {
      method: options.method || "GET",
      headers,
      body,
    });
  } catch (error) {
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

module.exports = { backendFetch, BackendUnreachableError };
