import FormatService from "@/services/FormatService";

// ICO is in the global allowlist of the backend (favicons), so both scopes
// advertise it.
export const MEDIA_ALLOWED_TYPES_LABEL = "JPEG, PNG, WebP, GIF, SVG, ICO";

const MESSAGE_BY_CODE = {
  file_too_large: (params) => {
    const limit = params?.maxBytes
      ? ` (Limit: ${FormatService.bytes(params.maxBytes)})`
      : "";
    return `ist zu groß${limit} — Upload abgelehnt.`;
  },
  unsupported_file_type: () =>
    `hat einen nicht unterstützten Dateityp — erlaubt sind ${MEDIA_ALLOWED_TYPES_LABEL} und PDF.`,
  invalid_image: () => "ist keine gültige Bilddatei oder beschädigt.",
  empty_file: () => "ist leer.",
};

/**
 * Turns a rejected upload into a sentence an admin can act on. The backend
 * answers with a code from `src/errors/`, so the wording lives here and not at
 * every upload site.
 *
 * @param {Object} error - The rejected request.
 * @param {string} [fileName] - Names the file when the surrounding UI does not.
 * @returns {string} The message.
 */
export function mediaUploadErrorMessage(error, fileName) {
  const body = error.response?.data;
  const subject = fileName ? `„${fileName}"` : "Die Datei";

  const message = MESSAGE_BY_CODE[body?.code];
  if (message) {
    return `${subject} ${message(body.params)}`;
  }

  if (error.response?.status === 413) {
    return `${subject} ist zu groß — Upload abgelehnt.`;
  }

  return `${subject} konnte nicht hochgeladen werden.`;
}
