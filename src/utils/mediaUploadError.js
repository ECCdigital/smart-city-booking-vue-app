import FormatService from "@/services/FormatService";

// ICO is in the global allowlist of the backend (favicons), so both scopes
// advertise it.
export const MEDIA_ALLOWED_TYPES_LABEL = "JPEG, PNG, WebP, GIF, SVG, ICO";

// A font is taken as woff2 alone (map #510). The other font formats are the
// ones an admin most likely holds; they get told what to bring instead.
export const FONT_UPLOAD_LABEL = "woff2 bis 500 KB";
const OTHER_FONT_FORMATS = Object.freeze(["ttf", "otf", "woff"]);

function extensionOf(fileName) {
  const match = /\.([^.]+)$/.exec(fileName || "");
  return match ? match[1].toLowerCase() : "";
}

function otherFontFormat(subject, fileName) {
  const extension = extensionOf(fileName);
  return OTHER_FONT_FORMATS.includes(extension)
    ? `${subject} ist eine ${extension.toUpperCase()}-Datei. Schriften bitte als woff2 hochladen.`
    : null;
}

/**
 * Why a file cannot be a font, judged by its name before it is uploaded — a
 * picker of fonts would otherwise take an image in. The backend decides by
 * the content in the end.
 *
 * @param {string} fileName - Name of the picked file.
 * @returns {?string} The message, or null for a woff2.
 */
export function fontFileRefusal(fileName) {
  if (extensionOf(fileName) === "woff2") {
    return null;
  }
  const subject = `„${fileName}“`;
  return (
    otherFontFormat(subject, fileName) ||
    `${subject} ist keine Schrift im Format woff2.`
  );
}

const MESSAGE_BY_CODE = {
  file_too_large: (params) => {
    const limit = params?.maxBytes
      ? ` (Limit: ${FormatService.bytes(params.maxBytes)})`
      : "";
    return `ist zu groß${limit} — Upload abgelehnt.`;
  },
  unsupported_file_type: () =>
    `hat einen nicht unterstützten Dateityp — erlaubt sind ${MEDIA_ALLOWED_TYPES_LABEL}, PDF und Schriften als woff2.`,
  invalid_image: () => "ist keine gültige Bilddatei oder beschädigt.",
  empty_file: () => "ist leer.",
};

/**
 * Turns a rejected upload into a sentence an admin can act on. The backend
 * answers with a code from `src/errors/`, so the wording lives here and not at
 * every upload site.
 *
 * @param {Object} error - The rejected request.
 * @param {string} [fileName] - Name of the uploaded file; a refused TTF, OTF
 *   or WOFF is told to come as woff2.
 * @param {Object} [options]
 * @param {boolean} [options.named=true] - Whether the message names the file;
 *   a site that shows the name beside it says „Die Datei“ instead.
 * @returns {string} The message.
 */
export function mediaUploadErrorMessage(
  error,
  fileName,
  { named = true } = {}
) {
  const body = error.response?.data;
  const subject = named && fileName ? `„${fileName}"` : "Die Datei";

  if (body?.code === "unsupported_file_type") {
    const font = otherFontFormat(subject, fileName);
    if (font) {
      return font;
    }
  }

  const message = MESSAGE_BY_CODE[body?.code];
  if (message) {
    return `${subject} ${message(body.params)}`;
  }

  if (error.response?.status === 413) {
    return `${subject} ist zu groß — Upload abgelehnt.`;
  }

  return `${subject} konnte nicht hochgeladen werden.`;
}
