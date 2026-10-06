/**
 * The legal documents of a tenant: a list of `{ type, title, reference }`
 * (§2.1 of the legal-documents spec). Unlike the three fixed documents of the
 * instance this list carries the pure reference form — the tenant has no
 * legacy stock, so no read field stands beside the reference and none has to
 * be dropped on the way in. The asymmetry to `instanceLegalDocuments.js` is
 * deliberate (§3 there); the two look different because they are differently
 * old.
 *
 * The rules below mirror `src/commons/utilities/legal-documents.js` of the
 * backend. The UI enforces them so a taken type is never offered twice; the
 * server enforces them because the UI is the convenience, not the guarantee
 * (§7.3).
 */

import {
  MEDIA_REFERENCE_SOURCE,
  externalReferenceOf,
  mediaReferenceOf,
  toMediaReference,
} from "@/utils/mediaReference";

export const LEGAL_DOCUMENT_TYPE = Object.freeze({
  DATA_PROTECTION: "dataProtection",
  LEGAL_NOTICE: "legalNotice",
  TERMS_AND_CONDITIONS: "termsAndConditions",
  RIGHT_OF_WITHDRAWAL: "rightOfWithdrawal",
  OTHER: "other",
});

/**
 * The four types the platform knows by name, in the order they are offered.
 * Their label comes from the translation, never from the stored title — the
 * server stores types, not wordings (§2.2). The wording was settled in German
 * only: this app ships a single locale (`src/language/index.js`), so there is
 * no English bundle for the labels to live in.
 */
export const KNOWN_LEGAL_DOCUMENT_TYPES = Object.freeze([
  LEGAL_DOCUMENT_TYPE.DATA_PROTECTION,
  LEGAL_DOCUMENT_TYPE.LEGAL_NOTICE,
  LEGAL_DOCUMENT_TYPE.TERMS_AND_CONDITIONS,
  LEGAL_DOCUMENT_TYPE.RIGHT_OF_WITHDRAWAL,
]);

/**
 * Whether a type carries a title of its own. Only `other` does — it is the
 * escape hatch that keeps the list extensible without a release, and the only
 * type a human names.
 *
 * @param {string} type - The type of a document.
 * @returns {boolean}
 */
export function isOtherType(type) {
  return type === LEGAL_DOCUMENT_TYPE.OTHER;
}

/**
 * A newly added document.
 *
 * @param {string} type - The type it starts out with.
 * @returns {Object} The document as the editor holds it.
 */
export function defaultLegalDocument(type) {
  return { type, title: "", reference: null };
}

/**
 * The documents of a tenant as the editor holds them: a copy carrying the
 * three stored fields and nothing else. A missing type stays missing — an
 * invented one would claim a document is something it never said it was.
 *
 * @param {Array|null} documents - The stored documents.
 * @returns {Array<Object>} The documents as the editor holds them.
 */
export function cloneLegalDocuments(documents) {
  return (Array.isArray(documents) ? documents : []).map((legalDocument) => ({
    type: legalDocument?.type || "",
    title: legalDocument?.title || "",
    reference: legalDocument?.reference || null,
  }));
}

/**
 * The types a row may be set to: the known ones no other row holds, plus
 * `other`, which is never used up. A row keeps its own type in the list —
 * otherwise the type it currently shows would drop out from under it.
 *
 * @param {Array<Object>} documents - The documents held by the editor.
 * @param {number} index - The row the types are offered to; a row that does
 *   not exist yet takes the position it would be added at.
 * @returns {string[]} The selectable types.
 */
export function availableLegalDocumentTypes(documents, index) {
  const rows = documents || [];
  const taken = new Set(
    rows
      .filter((legalDocument, position) => position !== index)
      .map((legalDocument) => legalDocument?.type)
  );

  const types = KNOWN_LEGAL_DOCUMENT_TYPES.filter((type) => !taken.has(type));
  const stored = rows[index]?.type;

  // A type this app has no name for — a server that grew one, or a row that
  // lost its own. It has to stay visible, or editing the row beside it would
  // quietly drop what is stored.
  if (stored && !isOtherType(stored) && !types.includes(stored)) {
    types.push(stored);
  }

  return [...types, LEGAL_DOCUMENT_TYPE.OTHER];
}

/**
 * The type a newly added row starts out with: the first known type still free,
 * and `other` once all four are filed. Adding a row never produces a duplicate
 * that way, so the list only ever grows into a valid state.
 *
 * @param {Array<Object>} documents - The documents held by the editor.
 * @returns {string} The type of the new row.
 */
export function nextLegalDocumentType(documents) {
  const rows = documents || [];

  return availableLegalDocumentTypes(rows, rows.length)[0];
}

/**
 * Whether a row's title collides with another freely named document. Two
 * `other` documents may not share a title — it is all that tells them apart
 * (§2.3).
 *
 * @param {Array<Object>} documents - The documents held by the editor.
 * @param {number} index - The row to check.
 * @returns {boolean}
 */
export function hasDuplicateOtherTitle(documents, index) {
  const rows = documents || [];
  const row = rows[index];

  if (!isOtherType(row?.type)) {
    return false;
  }

  const candidate = (row.title || "").trim().toLowerCase();

  if (!candidate) {
    return false;
  }

  return rows.some(
    (legalDocument, position) =>
      position !== index &&
      isOtherType(legalDocument?.type) &&
      (legalDocument?.title || "").trim().toLowerCase() === candidate
  );
}

/**
 * A reference as it goes back to the API. Reading a document hands out the
 * address its reference resolves to, so a reference to a medium arrives
 * carrying both a medium and an address — written back, that describes a
 * reference the platform rejects, because a reference points at exactly one of
 * the two (§4.8 of the media spec). The derived address drops out here.
 *
 * @param {Object|string|null} value - The stored reference.
 * @returns {Object|null} The reference as it goes out.
 */
function referenceForSave(value) {
  const reference = toMediaReference(value);

  if (!reference) {
    return null;
  }

  return reference.source === MEDIA_REFERENCE_SOURCE.MEDIA
    ? mediaReferenceOf(reference.mediaId)
    : externalReferenceOf(reference.url);
}

/**
 * The tenant as it goes to the API: every document trimmed to what the server
 * stores. A known type carries no title — the label comes from the
 * translation — and every reference sheds the derived address.
 *
 * @param {Object|null} tenant - The tenant being saved.
 * @returns {Object|null} The tenant as it goes out.
 */
export function legalDocumentsForSave(tenant) {
  if (!tenant || !Array.isArray(tenant.legalDocuments)) {
    return tenant;
  }

  return {
    ...tenant,
    legalDocuments: tenant.legalDocuments.map((legalDocument) => ({
      ...legalDocument,
      title: isOtherType(legalDocument?.type)
        ? (legalDocument.title || "").trim()
        : "",
      reference: referenceForSave(legalDocument?.reference),
    })),
  };
}
