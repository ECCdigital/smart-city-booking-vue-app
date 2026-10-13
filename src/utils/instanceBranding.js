/**
 * The branding of the instance: the theme plus the two images every visitor of
 * the portal sees. `logo` and `favicon` hold the media references, `logoUrl`
 * and `faviconUrl` are the read fields the backend derives from them on the
 * way out (§4.9 of the media spec). This module is the single place in the UI
 * that knows that pairing.
 *
 * Mirrors `src/commons/services/media/instance-media.js` of the backend.
 */
import { FONT_SOURCE, fontLicenseConfirmed } from "@/utils/instanceFonts";

// Where a branding reference is stored, and the read field it feeds.
export const BRANDING_IMAGES = Object.freeze({
  logo: { reference: "logo", readField: "logoUrl" },
  favicon: { reference: "favicon", readField: "faviconUrl" },
});

/**
 * A branding as an untouched instance carries it. A field an older instance
 * never stored reads as its default here, as it does in the backend
 * (`branding-schema.js`): the accent colour is empty while none is set.
 *
 * @returns {Object} The default branding.
 */
export function defaultBranding() {
  return {
    active: false,
    theme: {
      colors: { primary: "", secondary: "", accent: "" },
    },
    // The system font, as long as none is chosen.
    font: null,
    logo: null,
    favicon: null,
    logoUrl: "",
    faviconUrl: "",
  };
}

/**
 * A branding image as the form reads it: the stored media reference or — as
 * long as the media import has not converted it — the legacy address, which
 * reads as an external reference (§4.9 of the media spec).
 *
 * @param {Object} branding - The branding held by the editor.
 * @param {string} name - A key of `BRANDING_IMAGES`.
 * @returns {Object|string|null} The reference, the legacy address or null.
 */
export function brandingImage(branding, name) {
  const { reference, readField } = BRANDING_IMAGES[name];
  return branding[reference] || branding[readField] || null;
}

/**
 * The change of the branding that sets an image: the reference, and the
 * legacy address dropped along with it. The read field is derived from the
 * reference on the way out (§4.9); an address left behind would resurface the
 * old image the moment the user removes the reference again.
 *
 * @param {string} name - A key of `BRANDING_IMAGES`.
 * @param {Object|null} value - The new reference.
 * @returns {Object} The top-level fields of the branding that change.
 */
export function brandingImagePatch(name, value) {
  const { reference, readField } = BRANDING_IMAGES[name];
  return { [reference]: value || null, [readField]: "" };
}

/**
 * The font as it goes to the API. The licence of an own font goes as the tick
 * alone: the backend stamps person and moment itself and never takes them
 * from the form (`branding-font.js`). A font of the list carries no licence.
 *
 * @param {?Object} font - The font held by the editor.
 * @returns {?Object} The font as it goes out.
 */
function fontForSave(font) {
  if (font?.source === FONT_SOURCE.CURATED) {
    return { source: font.source, id: font.id };
  }
  if (font?.source !== FONT_SOURCE.MEDIA) {
    return font;
  }
  const payload = { source: font.source, reference: font.reference };
  if (fontLicenseConfirmed(font)) {
    payload.license = { confirmed: true };
  }
  return payload;
}

/**
 * The branding as it goes to the API: a read field drops out wherever its
 * reference stands, so a save never writes back what the backend derives
 * (§4.9). A site that holds only a legacy address keeps it — until the media
 * import has converted it, that address is the branding.
 *
 * Every other field goes back as the editor holds it, those this UI does not
 * edit included: the backend reads a field the payload leaves out as its
 * default, so dropping one would reset it.
 *
 * The Background drops out as well. The Hero Editor owns it and saves it
 * through its own route; a payload without the key keeps the stored
 * Background, while a stale copy from the tab would overwrite it (hero layout
 * spec, "Stale-overwrite guard").
 *
 * @param {Object|null} branding - The branding held by the editor.
 * @returns {Object|null} The branding as it goes out.
 */
export function brandingForSave(branding) {
  if (!branding) {
    return branding;
  }

  const payload = { ...branding };
  delete payload.background;

  for (const image of Object.values(BRANDING_IMAGES)) {
    if (payload[image.reference]) {
      delete payload[image.readField];
    }
  }

  if ("font" in payload) {
    payload.font = fontForSave(payload.font);
  }

  return payload;
}
