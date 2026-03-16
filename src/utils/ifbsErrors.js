const IFBS_ERROR_CODES = {
  1001: "Fehlender API-Schlüssel",
  1002: "Ungültiger API-Schlüssel",
  1003: "Ungültiger API-Schlüssel (Datenbankfehler)",
  1901: "Fehlende OpenBox-ID",
  1902: "OpenBox-Vorgang nicht gefunden",
  1903: "Mehrere OpenBox-Vorgänge gefunden (Datenbankfehler)",
  1904: "Zeitüberschreitung – keine Bestätigung vom Schließfach erhalten",
};

export function getIfbsErrorMessage(errorCode) {
  return (
    IFBS_ERROR_CODES[errorCode] ||
    `Unbekannter Fehler (Code: ${errorCode})`
  );
}
