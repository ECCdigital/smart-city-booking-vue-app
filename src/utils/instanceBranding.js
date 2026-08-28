/**
 * The branding of the instance: the theme plus the two images every visitor of
 * the portal sees. `logo` and `favicon` hold the media references, `logoUrl`
 * and `faviconUrl` are the read fields the backend derives from them on the
 * way out (§4.9 of the media spec). This module is the single place in the UI
 * that knows that pairing.
 *
 * Mirrors `src/commons/services/media/instance-media.js` of the backend.
 */

// Where a branding reference is stored, and the read field it feeds.
export const BRANDING_IMAGES = Object.freeze({
  logo: { reference: "logo", readField: "logoUrl" },
  favicon: { reference: "favicon", readField: "faviconUrl" },
});

/**
 * A branding as an untouched instance carries it.
 *
 * @returns {Object} The default branding.
 */
export function defaultBranding() {
  return {
    active: false,
    theme: {
      colors: { primary: "", secondary: "" },
    },
    logo: null,
    favicon: null,
    logoUrl: "",
    faviconUrl: "",
  };
}

/**
 * The branding as it goes to the API: a read field drops out wherever its
 * reference stands, so a save never writes back what the backend derives
 * (§4.9). A site that holds only a legacy address keeps it — until the media
 * import has converted it, that address is the branding.
 *
 * @param {Object|null} branding - The branding held by the editor.
 * @returns {Object|null} The branding as it goes out.
 */
export function brandingForSave(branding) {
  if (!branding) {
    return branding;
  }

  const payload = { ...branding };

  for (const image of Object.values(BRANDING_IMAGES)) {
    if (payload[image.reference]) {
      delete payload[image.readField];
    }
  }

  return payload;
}
