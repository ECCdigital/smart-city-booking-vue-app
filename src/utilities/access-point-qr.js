import ApiAccessPointService from "@/services/api/ApiAccessPointService";
import { unpackBlobErrorBody } from "@/services/api/apiErrorMessage";
import { saveBlob } from "@/utils/fileDownload";

export const QR_FORMATS = Object.freeze(["pdf", "svg", "png"]);

const CONTENT_TYPES = Object.freeze({
  pdf: "application/pdf",
  svg: "image/svg+xml",
  png: "image/png",
});

function parseFilename(disposition, fallback) {
  const match = (disposition || "").match(/filename=([^;]+)/i);
  if (match) {
    return match[1].trim().replace(/"/g, "");
  }
  return fallback;
}

/**
 * Fetch a QR code the server renders and hand it to the browser as a file,
 * named as the server's `Content-Disposition` says, else `fallbackName`.
 *
 * @throws The request's error, its body unpacked from the Blob
 */
async function downloadRendered(request, format, fallbackName) {
  let response;
  try {
    response = await request();
  } catch (error) {
    throw await unpackBlobErrorBody(error);
  }

  const blob = new Blob([response.data], {
    type: CONTENT_TYPES[format] || "application/octet-stream",
  });
  saveBlob(
    blob,
    parseFilename(response.headers?.["content-disposition"], fallbackName)
  );
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
 * @throws The request's error, its body unpacked from the Blob the download
 *   asked for, so a caller can read the reason (e.g. a missing
 *   `STORE_FRONT_URL`, `503 store_front_url_missing`)
 */
export function downloadQrCode(accessPoint, format, tenant) {
  return downloadRendered(
    () => ApiAccessPointService.getQrCode(accessPoint.id, format, tenant),
    format,
    `access-point-${accessPoint.id}.${format}`
  );
}

/**
 * Download the printable QR code of one Fach of a Schließfachanlage that
 * carries its own Fächer (ECCdigital/tickets#1056). The server names the
 * file `qr-<anlage>-schrank-<x>-fach-<nn>.<format>`.
 *
 * @param {Object} accessPoint The Anlage
 * @param {Object} compartment Its Fach, an entry of `config.compartments`
 * @param {string} format `pdf` (A4 template), `svg` or `png`
 * @param {string} [tenant] Tenant id, defaults to the selected tenant
 * @returns {Promise<void>} Resolves once the download has been triggered
 * @throws The request's error, its body unpacked, as `downloadQrCode`
 */
export function downloadCompartmentQrCode(
  accessPoint,
  compartment,
  format,
  tenant
) {
  return downloadRendered(
    () =>
      ApiAccessPointService.getCompartmentQrCode(
        accessPoint.id,
        compartment.id,
        format,
        tenant
      ),
    format,
    `qr-${accessPoint.id}-fach-${compartment.id}.${format}`
  );
}

/**
 * Download the Sammel-PDF of a Schließfachanlage that carries its own Fächer
 * (ECCdigital/tickets#1062): the QR codes of all its Fächer on an
 * Etikettenbogen, every Schrank on a new page. The server names the file
 * `qr-<anlage>-alle-faecher.pdf`.
 *
 * @param {Object} accessPoint The Anlage
 * @param {string} [tenant] Tenant id, defaults to the selected tenant
 * @returns {Promise<void>} Resolves once the download has been triggered
 * @throws The request's error, its body unpacked, as `downloadQrCode`
 */
export function downloadCompartmentQrSheet(accessPoint, tenant) {
  return downloadRendered(
    () => ApiAccessPointService.getCompartmentQrSheet(accessPoint.id, tenant),
    "pdf",
    `qr-${accessPoint.id}-alle-faecher.pdf`
  );
}
