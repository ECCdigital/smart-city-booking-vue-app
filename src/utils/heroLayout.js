/**
 * The Hero Layout as the Hero Editor holds it while the dialog is open.
 *
 * The editor edits a **Draft** — the layout, the Background, the Portalname
 * the derived default is built from, and whether the layout is still that
 * derived default. The three hero-layout routes speak in the same four parts;
 * this module is the single place that knows how a Draft becomes a payload
 * and when two Drafts would save the same thing.
 *
 * The rule that shapes all of it: while the layout is the default one the save
 * sends `heroLayout: null`. A materialised copy of the derived default would
 * stop following later Portalname and logo changes, which is exactly what
 * „Standard-Layout (folgt Portalname und Logo)“ promises (hero layout spec,
 * §10).
 */

import { normalizeHeroBlock } from "@/utils/heroBlocks";

/**
 * The layout with every Block completed — every default of the Shared contract
 * filled in and the legacy Panel strings read into the shape the Draft holds.
 *
 * A layout arrives from three places: the read route, the save route's answer
 * and the preview route after „Auf Standard zurücksetzen“. All three go
 * through here, so what the editor holds is one shape, whatever version wrote
 * it — and a field the form has no control for yet survives the round-trip
 * instead of being dropped on the next save.
 *
 * @param {Object|null} heroLayout - The layout as it arrived.
 * @returns {Object|null} A new layout, or `null` where there was none.
 */
export function normalizeHeroLayout(heroLayout) {
  const layout = clone(heroLayout);
  if (!layout || !Array.isArray(layout.blocks)) {
    return layout;
  }

  return { ...layout, blocks: layout.blocks.map(normalizeHeroBlock) };
}

/**
 * A Draft built from what a hero-layout route answered.
 *
 * The read route carries `isDefault`; the save and the preview route do not,
 * so the caller passes the state it just sent.
 *
 * @param {Object|null} data - The answer of a hero-layout route.
 * @param {{ isDefault?: boolean }} [context] - Fallback for the missing flag.
 * @returns {Object} The Draft the editor edits.
 */
export function heroDraftFromResponse(data, context = {}) {
  const answer = data || {};

  return {
    heroLayout: normalizeHeroLayout(answer.heroLayout),
    background: clone(answer.background),
    name: answer.name || "",
    isDefault:
      typeof answer.isDefault === "boolean"
        ? answer.isDefault
        : !!context.isDefault,
  };
}

/**
 * The body of `PUT /api/catalog/hero-layout`.
 *
 * The payload is a **snapshot**: it copies what it carries rather than handing
 * out the Draft's own objects. A round-trip is in flight for as long as the
 * network takes and the author goes on editing meanwhile — a body that moved
 * with the Draft would leave the editor unable to say what a refusal was even
 * about, because `details[].field` names positions in the body that was sent.
 *
 * @param {Object} draft - The Draft the editor holds.
 * @returns {{ heroLayout: Object|null, background?: Object }} The payload.
 */
export function heroLayoutSavePayload(draft) {
  const payload = {
    heroLayout: draft.isDefault ? null : clone(draft.heroLayout),
  };

  // `background: null` is a reset, not a no-op — and the Background is the
  // auth pages' too (Shared contract, "Reset"). A payload without the key
  // keeps the stored one, so a Draft that carries no Background sends none.
  if (draft.background) {
    payload.background = clone(draft.background);
  }

  return payload;
}

/**
 * The body of `POST /api/catalog/hero-layout/preview` — what the save would
 * send plus the Portalname, which the route needs to derive the default. The
 * route normalises, sanitises and enriches it into Theme Bundle export form
 * and writes nothing; it is what the Live Preview paints from.
 *
 * @param {Object} draft - The Draft the editor holds.
 * @returns {Object} The payload.
 */
export function heroPreviewPayload(draft) {
  return { ...heroLayoutSavePayload(draft), name: draft.name || "" };
}

/**
 * The same body for the derived Default Hero Layout: no layout, the edited
 * Background untouched. „Auf Standard zurücksetzen“ shows the answer before
 * anything is saved.
 *
 * @param {Object} draft - The Draft the editor holds.
 * @returns {Object} The payload.
 */
export function heroDefaultPreviewPayload(draft) {
  return heroPreviewPayload({ ...draft, isDefault: true });
}

/**
 * What the Draft would write, as a string. Two Drafts with the same snapshot
 * save the same thing, so the editor is dirty exactly while the snapshot has
 * moved away from the one the last load or save left behind.
 *
 * @param {Object} draft - The Draft the editor holds.
 * @returns {string} The snapshot.
 */
export function heroDraftSnapshot(draft) {
  return JSON.stringify(heroLayoutSavePayload(draft));
}

function clone(value) {
  return value ? JSON.parse(JSON.stringify(value)) : null;
}
