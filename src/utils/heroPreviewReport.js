/**
 * What the Live Preview's frames report back, and what the editor makes of it.
 *
 * A frame answers every Draft it renders with a `hero-preview:report`: the
 * `draftId` it rendered, which of the two frames it is, and the warnings it
 * measured (`heroPreviewProtocol.js`). Warnings are advice, never a refusal —
 * a Hero with a Block reaching past its edge saves like any other (hero layout
 * spec §9).
 *
 * Two shapes come out of a report: the tooltip on the Block's row, which
 * collects what both frames say about that Block, and the per-frame summary in
 * the preview toolbar. Both are pure functions of the reports and the Blocks,
 * so the editor only has to keep the last report of each frame.
 *
 * The wording is the frame's as much as the code's: the same
 * `outside-content-area` reads „Ragt … aus dem Kopfbereich heraus“ from the
 * desktop frame and „Wird … abgeschnitten“ from the mobile one, because that
 * is what leaving the content area looks like on each.
 */

import { heroBlockLabel } from "@/utils/heroBlocks";

/** The two frames, in the order the panel shows them. */
export const HERO_PREVIEW_VIEWPORTS = Object.freeze(["desktop", "mobile"]);

/**
 * What each warning says on a row, per frame. A code without an entry — a
 * storefront newer than this editor — says nothing rather than something
 * wrong.
 *
 * `overlap` is desktop-only, and has no mobile wording for that reason: the
 * rows stack on mobile, where a Block lands is not the author's choice, and
 * the storefront does not measure it there. Should that ever change it is a
 * protocol change, which bumps the version and reaches both sides at once.
 */
const WARNING_TEXTS = Object.freeze({
  "outside-content-area": Object.freeze({
    desktop: () => "Ragt auf dem Desktop aus dem Kopfbereich heraus",
    mobile: () => "Wird auf Mobilgeräten abgeschnitten",
  }),
  overlap: Object.freeze({
    desktop: (other) => `Überlappt auf dem Desktop mit ‚${other}‘`,
  }),
});

/**
 * The last report of each frame, before either has sent one.
 *
 * @returns {Object<string, ?Object>} A report slot per frame, all empty.
 */
export function noHeroPreviewReports() {
  return Object.fromEntries(HERO_PREVIEW_VIEWPORTS.map((view) => [view, null]));
}

/**
 * Whether a report is about the Draft the frames were last given.
 *
 * A frame renders on its own clock, so a report of a Draft the editor has
 * already replaced arrives now and then; it is discarded, and the badges of
 * the last matching report stay — which is what the frame still shows.
 *
 * @param {Object} message - The `hero-preview:report` message.
 * @param {?number} draftId - The `draftId` of the resolved Draft, if any.
 * @returns {boolean} Whether the editor should take it.
 */
export function isCurrentHeroPreviewReport(message, draftId) {
  if (!message || draftId == null) {
    return false;
  }

  return (
    HERO_PREVIEW_VIEWPORTS.includes(message.viewport) &&
    message.draftId === draftId
  );
}

/**
 * What the yellow badge of each Block says, from both frames at once. A Block
 * neither frame warned about is not in the answer and carries no badge.
 *
 * @param {Object<string, ?Object>} reports - The last report of each frame.
 * @param {Array} blocks - The Blocks as the Draft holds them.
 * @returns {Object<string, string[]>} The warnings, per Block id.
 */
export function heroPreviewWarningTexts(reports, blocks) {
  const texts = {};

  for (const viewport of HERO_PREVIEW_VIEWPORTS) {
    const report = (reports || {})[viewport];
    for (const warning of (report && report.warnings) || []) {
      addWarning(texts, warning, viewport, blocks);
    }
  }

  return texts;
}

/**
 * How many warnings a frame reported — none at all while it has not reported,
 * which is not the same as a frame that reported nothing to say.
 *
 * @param {?Object} report - The frame's last report, if it has sent one.
 * @returns {number} The count.
 */
export function heroPreviewWarningCount(report) {
  return report ? (report.warnings || []).length : 0;
}

/**
 * The summary of one frame, as the toolbar shows it beside that frame.
 *
 * @param {?Object} report - The frame's last report, if it has sent one.
 * @returns {string} The summary, empty while the frame has not reported.
 */
export function heroPreviewWarningSummary(report) {
  if (!report) {
    return "";
  }

  const count = heroPreviewWarningCount(report);

  return count === 1 ? "1 Hinweis" : `${count} Hinweise`;
}

/**
 * Every Block a warning names gets the badge — both of an overlap, each
 * reading the other's name, so the author can go from either row to the pair.
 */
function addWarning(texts, warning, viewport, blocks) {
  const wording = (WARNING_TEXTS[warning && warning.code] || {})[viewport];
  if (!wording) {
    return;
  }

  const ids = (warning.blockIds || []).filter(Boolean);
  for (const id of ids) {
    const other = ids.find((candidate) => candidate !== id);
    const text = wording(nameOf(blocks, other));
    if (!(texts[id] || []).includes(text)) {
      texts[id] = [...(texts[id] || []), text];
    }
  }
}

/** How the Block a warning points at is named in the other one's tooltip. */
function nameOf(blocks, id) {
  return heroBlockLabel(
    (blocks || []).find((candidate) => candidate.id === id) || null
  );
}
