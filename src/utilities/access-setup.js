import i18n from "@/language/index";
import { createLockAndAccessAppDefaults } from "@/utilities/access-apps";
import {
  DOOR_TYPE,
  providerAccessPointDefaults,
} from "@/utilities/access-points";
import { needsAction } from "@/utilities/access-point-rows";

/**
 * How far the tenant has set up its access points, for the Zugangspunkte
 * page (ECCdigital/tickets#1106): the providers it may connect, grouped by
 * what they open, the three steps of the setup and what is still open.
 * Everything here is derived from what the page loaded - providers, IQs,
 * access points and assignments -, the backend keeps no state of the setup.
 */

/** The order the providers are offered in: doors first, then lockers. */
const PROVIDER_ORDER = ["nuki", "salto-ks", "open-locker", "ifbs", "pareva"];

/**
 * Every provider the page can connect, as `{ id, title }`, in the order it
 * offers them.
 *
 * @returns {Array<{id: string, title: string}>}
 */
export function knownProviders() {
  const defaults = createLockAndAccessAppDefaults();
  return PROVIDER_ORDER.map((id) => ({ id, title: defaults[id].title }));
}

/**
 * The providers in two groups by what they open: doors (`door`), and
 * Schließfächer and Fahrradboxen (`locker`). A group without a provider is
 * left out.
 *
 * @param {Array<{id: string}>} providers The providers to group
 * @returns {Array<{key: string, providers: Array}>}
 */
export function groupProviders(providers) {
  const groups = [
    { key: "door", providers: [] },
    { key: "locker", providers: [] },
  ];
  providers.forEach((provider) => {
    const type = providerAccessPointDefaults(provider.id)?.type;
    groups[type === DOOR_TYPE ? 0 : 1].providers.push(provider);
  });
  return groups.filter((group) => group.providers.length);
}

const t = (key, params) =>
  i18n.t(`accessPoint.management.setup.${key}`, params);

/** What the provider's access points are called, by the type they start as. */
function kindOf(providerId) {
  return providerAccessPointDefaults(providerId)?.type === DOOR_TYPE
    ? "door"
    : "locker";
}

/**
 * What a connected section without access points says: „Noch keine Tür.
 * Legen Sie die erste an.“ - switched off, where creating is locked, only
 * „Noch keine Tür.“
 *
 * @param {string} providerId
 * @param {{active?: boolean}} [state] Whether the provider is switched on
 * @returns {string} A translated sentence
 */
export function emptySection(providerId, { active = true } = {}) {
  return t(`${active ? "empty" : "emptyOff"}.${kindOf(providerId)}`);
}

/**
 * The next step of a provider just connected, as its section names it:
 * activate the IQs where some are open, then create the first access point.
 *
 * @param {{id: string, title: string}} provider
 * @param {number} openIqs The IQs of the provider not activated yet
 * @returns {string} A translated sentence
 */
export function nextAfterConnect(provider, openIqs = 0) {
  const create = t(`next.create.${kindOf(provider.id)}`);
  return t("next.sentence", {
    provider: provider.title || provider.id,
    step: openIqs > 0 ? t("next.iqsFirst", { create }) : create,
  });
}

const tc = (key, count, params = {}) =>
  i18n.tc(`accessPoint.management.setup.${key}`, count, { count, ...params });

/**
 * The state of the setup:
 *
 * 1. „Anbieter verbinden“ is done with at least one provider connected and
 *    no IQ open.
 * 2. „Zugangspunkte anlegen“ is done with at least one access point.
 * 3. „Buchungsobjekten zuordnen“ is done when every access point has a
 *    bookable.
 *
 * Once all three are done, `done` holds the line „Eingerichtet: …“ that
 * takes the place of the strip. `open` counts the access points with
 * something still to do (`needsAction`), for „Offen (n)“: no bookable, or
 * an IQ not activated as its provider's listing says (ECCdigital/tickets#1107).
 *
 * @param {Object} input
 * @param {number} input.connected The providers connected and switched on
 * @param {number} [input.openIqs] The IQs not activated yet
 * @param {Object[]} input.accessPoints All access points of the tenant
 * @param {Function} input.bookablesOf The bookables of an access point: a
 *   list, or `null` where they were not readable
 * @param {Function} [input.listingOf] What the provider of an access point
 *   lists: a list, or `null` while it is not read
 * @returns {{steps: Array<{key: string, done: boolean, state: string}>, done: string, open: number}}
 */
export function setupState({
  connected,
  openIqs = 0,
  accessPoints,
  bookablesOf,
  listingOf = () => null,
}) {
  const total = accessPoints.length;
  const bookables = accessPoints.map((accessPoint) => bookablesOf(accessPoint));
  const readable = bookables.every(Array.isArray);
  const assigned = bookables.filter(
    (list) => Array.isArray(list) && list.length > 0
  ).length;

  let connectState = t("steps.connect.none");
  if (connected) {
    connectState = tc("steps.connect.connected", connected);
    if (openIqs) {
      connectState = [connectState, tc("steps.connect.openIqs", openIqs)].join(
        ", "
      );
    }
  }
  let assignState = t("steps.assign.none");
  if (total && !readable) assignState = t("steps.assign.unreadable");
  else if (total) assignState = t("steps.assign.assigned", { assigned, total });

  const steps = [
    {
      key: "connect",
      done: connected > 0 && !openIqs,
      state: connectState,
    },
    {
      key: "create",
      done: total > 0,
      state: total ? tc("steps.create.created", total) : t("steps.create.none"),
    },
    {
      key: "assign",
      done: total > 0 && readable && assigned === total,
      state: assignState,
    },
  ];

  return {
    steps,
    done: steps.every((step) => step.done)
      ? t("done", {
          providers: tc("providers", connected),
          accessPoints: tc("accessPoints", total),
        })
      : "",
    open: accessPoints.filter((accessPoint, index) =>
      needsAction(accessPoint, bookables[index], listingOf(accessPoint))
    ).length,
  };
}
