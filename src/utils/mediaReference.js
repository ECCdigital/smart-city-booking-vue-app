/**
 * A media reference is the typed usage of a file at an entity (§4.8 of the
 * media spec): it points either at a medium of the library or at an external
 * address — never at both. Context fields (title, caption, mailAttach, …) stay
 * at the usage site, never at the medium.
 *
 * These helpers mirror `src/commons/services/media/media-reference.js` of the
 * backend. Reading normalises legacy values on the way out; writing always
 * produces the typed form, so the editors never store a bare URL again.
 */

export const MEDIA_REFERENCE_SOURCE = Object.freeze({
  MEDIA: "media",
  EXTERNAL: "external",
});

/**
 * Reads a reference site. Anything the media library wrote is already a
 * reference; a bare string is legacy — a plain URL the media import has not
 * converted yet, which reads as an external reference because that is what it
 * is until then.
 *
 * @param {Object|string|null} value - The stored value of a reference site.
 * @returns {{source: string, mediaId: ?string, url: ?string}|null}
 */
export function toMediaReference(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return {
      source: MEDIA_REFERENCE_SOURCE.EXTERNAL,
      mediaId: null,
      url: value,
    };
  }

  if (typeof value !== "object") {
    return null;
  }

  if (value.source) {
    return {
      source: value.source,
      mediaId: value.mediaId ?? null,
      url: value.url ?? null,
    };
  }

  // A legacy attachment: context fields plus a raw url.
  return toMediaReference(value.url);
}

/**
 * A reference to a medium of the library.
 *
 * @param {string} mediaId - Id of the medium.
 * @returns {{source: string, mediaId: string, url: null}}
 */
export function mediaReferenceOf(mediaId) {
  return {
    source: MEDIA_REFERENCE_SOURCE.MEDIA,
    mediaId,
    url: null,
  };
}

/**
 * A reference to an address outside the platform.
 *
 * @param {string} url - The external address.
 * @returns {{source: string, mediaId: null, url: string}}
 */
export function externalReferenceOf(url) {
  return {
    source: MEDIA_REFERENCE_SOURCE.EXTERNAL,
    mediaId: null,
    url,
  };
}

/**
 * The medium a reference site points at, if it points at one at all.
 *
 * @param {Object|string|null} value - The stored value of a reference site.
 * @returns {string|null} The media id, or null for external and empty sites.
 */
export function referencedMediaId(value) {
  const reference = toMediaReference(value);

  return reference?.source === MEDIA_REFERENCE_SOURCE.MEDIA
    ? reference.mediaId || null
    : null;
}

/**
 * Whether a reference site points at a medium of the library.
 *
 * @param {Object|string|null} value - The stored value of a reference site.
 * @returns {boolean}
 */
export function isMediaReference(value) {
  return Boolean(referencedMediaId(value));
}

/**
 * The external address of a reference site, if it has one.
 *
 * @param {Object|string|null} value - The stored value of a reference site.
 * @returns {string|null}
 */
export function externalReferenceUrl(value) {
  const reference = toMediaReference(value);

  return reference?.source === MEDIA_REFERENCE_SOURCE.EXTERNAL
    ? reference.url || null
    : null;
}

// The binary route of the media API — the shape of every address the library
// hands out, tenant and instance scope alike.
const MEDIA_FILE_URL_PATTERN = /\/media\/([^/?#]+)\/file(?:[?#]|$)/;

/**
 * The medium an address points at, if it is one of ours. Legacy sites that the
 * media spec leaves untyped (§4.8) store a bare address even when the file
 * comes from the library; reading the id back out is what lets those sites
 * show a proper preview instead of a raw URL.
 *
 * @param {string|null} url - The address.
 * @returns {string|null} The media id, or null for foreign addresses.
 */
export function mediaIdFromUrl(url) {
  if (typeof url !== "string") {
    return null;
  }

  return MEDIA_FILE_URL_PATTERN.exec(url)?.[1] || null;
}

/**
 * The medium behind a reference site for display purposes — the referenced one
 * or, at an untyped site, the one its address points at. Never use this to
 * decide what to store: only a typed reference is a reference.
 *
 * @param {Object|string|null} value - The stored value of a reference site.
 * @returns {string|null}
 */
export function displayMediaId(value) {
  return (
    referencedMediaId(value) || mediaIdFromUrl(externalReferenceUrl(value))
  );
}

/**
 * The media ids of a list of reference sites, without duplicates.
 *
 * @param {Array<Object|string>} values - Stored reference sites.
 * @returns {string[]}
 */
export function collectMediaIds(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return [...new Set(values.map(referencedMediaId).filter(Boolean))];
}
