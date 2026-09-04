/**
 * Shared doubles for API failures, so that a spec asserting on "denied" and a
 * spec asserting on "broke" mean the same thing by them.
 */

/**
 * An axios error carrying the 4.3.x `ForbiddenError` body
 * (`{ error, code, statusCode, params }`) - what the backend answers a
 * signed-in user without reach with from 4.3.x on.
 */
export function forbiddenError(code = "forbidden") {
  const error = new Error("Request failed with status code 403");
  error.response = {
    status: 403,
    data: {
      error: "ForbiddenError",
      code,
      statusCode: 403,
      params: {},
    },
  };
  return error;
}

/** An axios error for a failure that is not a denial. */
export function serverError(status = 500) {
  const error = new Error(`Request failed with status code ${status}`);
  error.response = { status, data: {} };
  return error;
}

/**
 * Lets pending promise callbacks run. `$nextTick` alone does not: a component
 * that awaits an API call resolves on the microtask queue first.
 */
export function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
