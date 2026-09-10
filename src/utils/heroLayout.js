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
    heroLayout: clone(answer.heroLayout),
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
 * @param {Object} draft - The Draft the editor holds.
 * @returns {{ heroLayout: Object|null, background?: Object }} The payload.
 */
export function heroLayoutSavePayload(draft) {
  const payload = {
    heroLayout: draft.isDefault ? null : draft.heroLayout || null,
  };

  // `background: null` is a reset, not a no-op — and the Background is the
  // auth pages' too (Shared contract, "Reset"). A payload without the key
  // keeps the stored one, so a Draft that carries no Background sends none.
  if (draft.background) {
    payload.background = draft.background;
  }

  return payload;
}

/**
 * The body of `POST /api/catalog/hero-layout/preview` that resolves the
 * derived Default Hero Layout: no layout, the edited Background untouched.
 * „Auf Standard zurücksetzen“ shows the answer before anything is saved, and
 * the route writes nothing.
 *
 * @param {Object} draft - The Draft the editor holds.
 * @returns {Object} The payload.
 */
export function heroDefaultPreviewPayload(draft) {
  return {
    ...heroLayoutSavePayload({ ...draft, isDefault: true }),
    name: draft.name || "",
  };
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
