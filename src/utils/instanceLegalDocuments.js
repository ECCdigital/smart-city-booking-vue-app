/**
 * The three legal documents of the instance. Each is stored as
 * `{ source, url, fileName, reference }`: `reference` is the media reference
 * the editor writes, `url` and `fileName` are read fields the backend derives
 * from it on the way out — a document served from the media library reads as a
 * plain link, with `source` set to `"url"` (§7.2 of the legal-documents spec).
 *
 * That shape is a transitional one and stays asymmetric to the tenant's plain
 * reference list on purpose (§3 there). This module is the single place in the
 * UI that knows it.
 *
 * Mirrors the document half of `src/commons/services/media/instance-media.js`
 * of the backend.
 */

import { getApiHttpBaseUrl } from "@/services/auth/authMode";

// Where the instance keeps its legal documents, in the order they are edited.
export const LEGAL_DOCUMENT_KEYS = Object.freeze([
  "dataProtection",
  "legalNotice",
  "termsAndConditions",
]);

// The fields the backend derives from the reference; the editor never writes
// them and drops them wherever a reference stands.
const DERIVED_FIELDS = Object.freeze(["url", "fileName"]);

/**
 * A legal document as an untouched instance carries it.
 *
 * @returns {Object} The default document.
 */
export function defaultLegalDocument() {
  return { source: "url", url: "", fileName: "", reference: null };
}

/**
 * A document as the form reads it: the stored media reference or — as long as
 * the media import has not converted it — the legacy address, which reads as
 * an external reference (§4.9 of the media spec).
 *
 * @param {Object|null} document - The stored legal document.
 * @returns {Object|string|null} The value of the reference field.
 */
export function legalDocumentReference(document) {
  if (!document) {
    return null;
  }

  return document.reference || document.url || null;
}

/**
 * A document carrying a newly picked reference. The read fields are emptied
 * along with it — not written, emptied: an address left behind would resurface
 * the old document the moment the user removes the reference again, and an
 * empty address is the only way this shape says "no document". `source` says
 * `"url"` because that is what the editor writes from here on, a reference or
 * an external address, and never a file of the old file manager.
 *
 * @param {Object|null} document - The document held by the editor.
 * @param {Object|null} reference - The picked reference, null to clear.
 * @returns {Object} The document as the editor holds it on.
 */
export function legalDocumentWithReference(document, reference) {
  return {
    ...defaultLegalDocument(),
    ...(document || {}),
    source: "url",
    url: "",
    fileName: "",
    reference: reference || null,
  };
}

/**
 * The instance as it goes to the API: at every document the derived read
 * fields drop out wherever a reference stands, so a save never writes back
 * what the backend derives. A document that holds only a legacy address keeps
 * it — until the media import has converted it, that address is the document.
 *
 * @param {Object|null} instance - The instance held by the editor.
 * @returns {Object|null} The instance as it goes out.
 */
export function legalDocumentsForSave(instance) {
  if (!instance) {
    return instance;
  }

  const payload = { ...instance };

  for (const key of LEGAL_DOCUMENT_KEYS) {
    const document = payload[key];
    if (!document || !document.reference) {
      continue;
    }

    const stripped = { ...document };
    DERIVED_FIELDS.forEach((field) => delete stripped[field]);
    payload[key] = stripped;
  }

  return payload;
}

/**
 * A stored document address as a link target. A document of our own media
 * library carries the backend's root-relative delivery path (§4.4 of the media
 * spec), which this browser only reaches through the API base; an address
 * outside the platform is opened as it stands, and a bare host keeps the
 * scheme it never brought along.
 *
 * @param {string|null} url - The stored address of a legal document.
 * @returns {string} The href, empty for a document without an address.
 */
export function legalDocumentHref(url) {
  if (!url) {
    return "";
  }

  if (/^(https?:)?\/\//i.test(url)) {
    return url;
  }

  if (url.startsWith("/")) {
    return `${getApiHttpBaseUrl()}${url}`;
  }

  return `https://${url}`;
}
