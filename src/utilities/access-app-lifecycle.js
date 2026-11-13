import i18n from "@/language/index";
import {
  accessPointFields,
  accessPointKind,
  DOOR_KIND,
  FIXED_COMPARTMENT_KIND,
  LOCKER_SYSTEM_KIND,
} from "@/utilities/access-point-fields";

/**
 * What the section of a provider says before it is switched off or its
 * connection removed (ECCdigital/tickets#1107): the access points that
 * stop opening or are in the way, named by their kind - Tür,
 * Schließfachanlage, festes Fach.
 */

// The kinds in the order they are named.
const KINDS = [DOOR_KIND, LOCKER_SYSTEM_KIND, FIXED_COMPARTMENT_KIND];

/**
 * How many access points of each kind there are, the kinds without any left
 * out.
 *
 * @param {Object[]} accessPoints The access points of the provider
 * @returns {Array<{kind: string, count: number}>}
 */
function kindCounts(accessPoints) {
  const counts = {};
  (accessPoints || []).forEach((accessPoint) => {
    const kind = accessPointKind(accessPoint);
    counts[kind] = (counts[kind] || 0) + 1;
  });
  return KINDS.filter((kind) => counts[kind]).map((kind) => ({
    kind,
    count: counts[kind],
  }));
}

/** „a“, „a und b“, „a, b und c“. */
function enumerate(parts) {
  if (parts.length < 2) return parts.join("");
  const and = i18n.t("accessPoint.management.section.and");
  return `${parts.slice(0, -1).join(", ")} ${and} ${parts[parts.length - 1]}`;
}

/**
 * The question before the provider is switched off: what stops opening,
 * also for running bookings, and that everything stays stored.
 *
 * @param {string} providerName The provider as the section names it
 * @param {Object[]} accessPoints The access points of the provider
 * @returns {string} A translated text
 */
export function switchOffQuestion(providerName, accessPoints) {
  const t = (key, params) =>
    i18n.t(`accessPoint.management.section.switchOff.${key}`, params);
  const counts = kindCounts(accessPoints);
  const sentences = [t("question", { provider: providerName })];
  if (counts.length) {
    const total = counts.reduce((sum, { count }) => sum + count, 0);
    const things = enumerate(
      counts.map(({ kind, count }) =>
        i18n.tc(`accessPoint.management.section.kinds.${kind}`, count, {
          count,
        })
      )
    );
    sentences.push(
      i18n.tc("accessPoint.management.section.switchOff.stops", total, {
        things,
      })
    );
  }
  sentences.push(t("kept"));
  return sentences.join(" ");
}

/**
 * Why the connection of the provider cannot be removed: its access points
 * are to be deleted first, named by the kinds it has - by the kind it
 * creates where the page knows of none, as when the backend refuses all
 * the same.
 *
 * @param {string} providerId The provider, e.g. "nuki"
 * @param {Object[]} accessPoints The access points of the provider
 * @returns {string} A translated sentence
 */
export function removalHint(providerId, accessPoints) {
  const kinds = kindCounts(accessPoints).map(({ kind }) => kind);
  if (!kinds.length) kinds.push(accessPointFields(providerId).kind);
  return i18n.t("accessPoint.management.settings.removeBlocked", {
    things: enumerate(
      kinds.map((kind) =>
        i18n.t(`accessPoint.management.settings.removeKinds.${kind}`)
      )
    ),
  });
}
