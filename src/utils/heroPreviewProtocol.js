/**
 * The `postMessage` protocol between the Hero Editor's Live Preview and the
 * storefront's preview page, and the address the two frames load.
 *
 * **The storefront owns the protocol.** The version, the message types and the
 * payload shapes below are copied verbatim from `shared/types/hero.ts` of the
 * repository `smart-city-booking-store-front`, which carries the same
 * cross-reference back to this file. A protocol change bumps
 * `HERO_PREVIEW_PROTOCOL` there first and is noted in both changelogs; nothing
 * here is a local decision.
 *
 * Two rules run through everything: a Draft snapshot is always complete and
 * idempotent — there are no partial updates — and the target origin is the
 * normalised origin of the Portal-URL, for posting and for filtering incoming
 * messages alike. Never `*`.
 */

/** The version every message carries. Others are ignored silently. */
export const HERO_PREVIEW_PROTOCOL = 1;

/** Admin → storefront: the complete Draft snapshot, resolved by the backend. */
export const HERO_PREVIEW_DRAFT = "hero-preview:draft";

/** Storefront → admin: the frame has mounted and wants the current Draft. */
export const HERO_PREVIEW_READY = "hero-preview:ready";

/** Storefront → admin: what the rendered Draft measures in that frame. */
export const HERO_PREVIEW_REPORT = "hero-preview:report";

/** Storefront → admin: a Zone was clicked while a Block is selected. */
export const HERO_PREVIEW_ZONE_CLICK = "hero-preview:zone-click";

/** Storefront → admin: a rendered Block was clicked. */
export const HERO_PREVIEW_BLOCK_CLICK = "hero-preview:block-click";

/** Everything the storefront sends. A message of another type is not ours. */
const INBOUND_TYPES = Object.freeze([
  HERO_PREVIEW_READY,
  HERO_PREVIEW_REPORT,
  HERO_PREVIEW_ZONE_CLICK,
  HERO_PREVIEW_BLOCK_CLICK,
]);

/** The two colour modes the storefront sets the `html` class from. */
export const HERO_PREVIEW_COLOR_MODES = Object.freeze(["light", "dark"]);

/**
 * The Draft snapshot the frames are painted from.
 *
 * `heroLayout`, `background` and `name` arrive in Theme Bundle export form —
 * the answer of `POST /api/catalog/hero-layout/preview`, never the raw Draft —
 * and `draftId` is the running number that answer was asked under, so a frame
 * can drop a report of a Draft that has since been replaced. This is the one
 * place a resolved Draft is read into the protocol's shape. The locale is not
 * in the message; it lives in the frame's address.
 *
 * @param {Object} options - What the message is built from.
 * @param {Object} options.preview - `{ draftId, heroLayout, background, name }`.
 * @param {?string} [options.selectedBlockId] - The Block the editor shows.
 * @param {string} [options.colorMode] - `light` or `dark`.
 * @returns {Object} The `hero-preview:draft` message.
 */
export function heroPreviewDraftMessage({
  preview,
  selectedBlockId = null,
  colorMode = "light",
}) {
  const resolved = preview || {};
  const message = {
    protocol: HERO_PREVIEW_PROTOCOL,
    type: HERO_PREVIEW_DRAFT,
    draftId: resolved.draftId || 0,
    heroLayout: resolved.heroLayout || null,
    background: resolved.background || null,
    name: resolved.name || "",
    colorMode: HERO_PREVIEW_COLOR_MODES.includes(colorMode)
      ? colorMode
      : "light",
  };

  // The key is absent without a selection rather than `null`: the storefront
  // shows the Zone overlay exactly while a Block is selected.
  if (selectedBlockId) {
    message.selectedBlockId = selectedBlockId;
  }

  return message;
}

/**
 * What a `message` event carried, when it is one of ours.
 *
 * The origin is checked by the caller, which knows the Portal-URL; this is the
 * second filter: another protocol version and an unlisted type are ignored
 * silently, so a page sharing the origin cannot drive the editor by accident.
 *
 * @param {*} data - The `data` of a `message` event.
 * @returns {?Object} The message, or `null` when it is not ours.
 */
export function heroPreviewMessage(data) {
  if (!data || typeof data !== "object") {
    return null;
  }
  if (data.protocol !== HERO_PREVIEW_PROTOCOL) {
    return null;
  }

  return INBOUND_TYPES.includes(data.type) ? data : null;
}

/**
 * The origin the frames are posted to and are heard from.
 *
 * @param {*} portalUrl - `instance.portalUrl`, as the Portal tab stored it.
 * @returns {string} The normalised origin, or `""` when there is none.
 */
export function heroPreviewOrigin(portalUrl) {
  try {
    const url = new URL(String(portalUrl == null ? "" : portalUrl).trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "";
    }
    return url.origin;
  } catch {
    return "";
  }
}

/**
 * The address one frame loads.
 *
 * It is built from the origin, not from the Portal-URL's path: the preview
 * route sits at the root of the storefront, and the origin is what the
 * messages are filtered by, so the two cannot drift apart.
 *
 * The toolbar's view travels as `mode`, not as `view`. `view` is the catalog
 * search's own list/map switch, and that page rewrites the query string
 * wholesale, which would take the frame's view with it. The storefront owns
 * the route and renamed the key for that reason; the admin spec's §3 still
 * says `view=` and is the stale one.
 *
 * @param {*} portalUrl - `instance.portalUrl`.
 * @param {Object} [options] - The toolbar's view and the header's locale.
 * @param {string} [options.locale] - `de` or `en`.
 * @param {string} [options.mode] - `home` or `compact`.
 * @returns {string} The frame address, or `""` without a Portal-URL.
 */
export function heroPreviewFrameSrc(portalUrl, { locale, mode } = {}) {
  const origin = heroPreviewOrigin(portalUrl);
  if (!origin) {
    return "";
  }

  const prefix = locale === "en" ? "/en" : "";
  const view = mode === "compact" ? "compact" : "home";

  return `${origin}${prefix}/preview/hero?mode=${view}`;
}
