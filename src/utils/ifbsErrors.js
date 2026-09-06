/**
 * The numeric error codes iFBS answers a compartment command with. iFBS is the
 * only provider whose codes this UI can name; every other provider's code is
 * shown as the bare number.
 */
const IFBS_ERROR_CODES = {
  1001: "Fehlender API-Schlüssel",
  1002: "Ungültiger API-Schlüssel",
  1003: "Ungültiger API-Schlüssel (Datenbankfehler)",
  1901: "Fehlende OpenBox-ID",
  1902: "OpenBox-Vorgang nicht gefunden",
  1903: "Mehrere OpenBox-Vorgänge gefunden (Datenbankfehler)",
  1904: "Zeitüberschreitung – keine Bestätigung vom Schließfach erhalten",
};

/**
 * What an iFBS error code means, in German.
 *
 * @param {number|string} errorCode The code iFBS answered with
 * @returns {string|null} The text, or `null` for a code this table does not
 *   know - the caller then says what it can without inventing a meaning
 */
export function getIfbsErrorMessage(errorCode) {
  return IFBS_ERROR_CODES[errorCode] || null;
}
