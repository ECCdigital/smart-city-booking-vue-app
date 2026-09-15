/**
 * Hands a Blob to the browser as a file download under `filename` and frees
 * the object URL afterwards - the one way every "Herunterladen" of the admin
 * saves a PDF or iCal it fetched over the API.
 */
export function saveBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/** Opens a hosted file (an attachment with its own `url`) in a new tab. */
export function openFileUrl(url, filename) {
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.download = filename;
  link.click();
}
