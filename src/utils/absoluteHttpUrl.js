/**
 * Whether `value` is an absolute http(s) address: one with a host, so it has
 * an origin. The Live Preview needs the origin of the Portal-URL, and the
 * backend takes nothing else as the link of a footer logo, `javascript:`
 * first of all.
 *
 * @param {*} value - The candidate.
 * @returns {boolean} Whether it is an absolute http(s) address.
 */
export function isAbsoluteHttpUrl(value) {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") && !!url.hostname
    );
  } catch {
    return false;
  }
}
