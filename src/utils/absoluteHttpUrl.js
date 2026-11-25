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

/**
 * Makes `url` callable from outside this app (a calendar, the clipboard): an
 * absolute http(s) address stays, a protocol-relative one gets the current
 * scheme, anything else is anchored on the current origin. The API base may
 * be relative — the BFF default is `/admin/api`.
 *
 * @param {string} url - An absolute, protocol-relative or root-relative address.
 * @returns {string} The address with scheme and host.
 */
export function toAbsoluteHttpUrl(url) {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  if (url.startsWith("//")) {
    return `${window.location.protocol}${url}`;
  }
  return `${window.location.origin}${url}`;
}
