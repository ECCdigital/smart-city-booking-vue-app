/**
 * Extrahiert eine anzeigbare Fehlermeldung aus einer axios-Fehlerantwort.
 * Bei 400-Antworten mit Klartext-Body (z. B. serverseitige PDF-Template-
 * Validierung von PUT /api/tenants) wird dieser Text zurückgegeben,
 * sonst der Fallback.
 */
export function getApiErrorMessage(error, fallback) {
  if (error?.response?.status === 400) {
    const data = error.response.data;
    if (typeof data === "string" && data.trim()) {
      return data.trim();
    }
    if (data && typeof data.message === "string" && data.message.trim()) {
      return data.message.trim();
    }
  }
  return fallback;
}
