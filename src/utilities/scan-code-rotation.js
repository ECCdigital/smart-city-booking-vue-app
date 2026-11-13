import i18n from "@/language/index";
import {
  accessPointLabel,
  isFixedCompartment,
  requiresQrScan,
} from "@/utilities/access-points";

/**
 * What the question before rotating a scan code says (ECCdigital/tickets#1111),
 * for a door, a fixed Fach, one Fach of a Schließfachanlage or all of its
 * Fächer: that the code is replaced and printed stickers are void, and what
 * that means for bookers. Loud only where the access point demands the QR
 * scan - there an old sticker locks bookers out; without it they keep opening
 * through the app. The tick that all stickers get printed anew is asked for
 * only when all Fächer of an Anlage with QR scan are rotated.
 */

const t = (key, params) =>
  i18n.t(`accessPoint.management.rotate.${key}`, params);
const tc = (key, count, params) =>
  i18n.tc(`accessPoint.management.rotate.${key}`, count, { count, ...params });

/**
 * Whom an old sticker no longer lets in: „öffnet die Tür nicht“, „öffnet
 * Fach 2 nicht“, „öffnet keines der 6 Fächer“.
 */
function opensNot(accessPoint, { compartment, all, count }) {
  if (all) return tc("opensNot.all", count);
  if (compartment)
    return t("opensNot.compartment", { number: compartment.number });
  if (isFixedCompartment(accessPoint)) return t("opensNot.fixed");
  return t("opensNot.door");
}

/**
 * @param {Object} accessPoint The access point, the Anlage for its Fächer
 * @param {Object} [options]
 * @param {Object} [options.compartment] The one Fach of the Anlage rotated
 * @param {boolean} [options.all] Whether all Fächer of the Anlage are rotated
 * @returns {{question: string, replaced: string, consequence: string,
 *   locks: boolean, needsAcknowledge: boolean, confirm: string}}
 *   `locks`: the consequence is a warning, not a remark
 */
export function rotationWarning(
  accessPoint,
  { compartment = null, all = false } = {}
) {
  const count = accessPoint?.config?.compartments?.length || 0;
  const locks = requiresQrScan(accessPoint);
  let target;
  if (all) target = tc("target.all", count);
  else if (compartment)
    target = t("target.compartment", { number: compartment.number });
  else
    target = t("target.accessPoint", { label: accessPointLabel(accessPoint) });

  const sticker = all ? "all" : "one";
  return {
    question: all ? t("allQuestion") : t("question"),
    replaced: t("replaced", { target }),
    consequence: locks
      ? t(`locks.${sticker}`, {
          opensNot: opensNot(accessPoint, { compartment, all, count }),
        })
      : t(`keepsOpening.${sticker}`),
    locks,
    needsAcknowledge: all && locks,
    confirm: all ? t("allConfirm", { count }) : t("confirm"),
  };
}
