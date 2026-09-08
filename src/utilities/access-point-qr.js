import ApiAccessPointService from "@/services/api/ApiAccessPointService";

export const QR_FORMATS = Object.freeze(["pdf", "svg", "png"]);

const CONTENT_TYPES = Object.freeze({
  pdf: "application/pdf",
  svg: "image/svg+xml",
  png: "image/png",
});

function parseFilename(disposition, accessPoint, format) {
  const match = (disposition || "").match(/filename=([^;]+)/i);
  if (match) {
    return match[1].trim().replace(/"/g, "");
  }
  return `access-point-${accessPoint.id}.${format}`;
}

/**
 * Download the printable QR code of an access point.
 *
 * The code is rendered by the server because the scan code inside it is
 * server knowledge - the client only ever handles the finished file.
 *
 * @param {Object} accessPoint The access point to print
 * @param {string} format `pdf` (A4 template), `svg` or `png`
 * @param {string} [tenant] Tenant id, defaults to the selected tenant
 * @returns {Promise<void>} Resolves once the download has been triggered
 */
export async function downloadQrCode(accessPoint, format, tenant) {
  const response = await ApiAccessPointService.getQrCode(
    accessPoint.id,
    format,
    tenant
  );

  const blob = new Blob([response.data], {
    type: CONTENT_TYPES[format] || "application/octet-stream",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute(
    "download",
    parseFilename(
      response.headers?.["content-disposition"],
      accessPoint,
      format
    )
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
