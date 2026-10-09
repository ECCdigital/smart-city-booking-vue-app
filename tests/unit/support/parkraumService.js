/**
 * ParkraumService taking fields over, as specs set it up: its locker system
 * among the tenant's access points, and a bookable whose provider entry is
 * on and whose Schließsysteme assign that locker system. Without the
 * assignment the provider takes nothing over (`providerTakesOver`).
 */
export const IFBS_LOCKER = Object.freeze({
  id: "ap-ifbs",
  provider: "ifbs",
  externalId: "loc1",
});

/** The fields of a bookable whose `handles` ParkraumService takes over. */
export const takenOverBy = (handles) => ({
  externalProviders: [{ provider: "ifbs", active: true, handles }],
  accessPointDetails: { active: true, accessPointIds: [IFBS_LOCKER.id] },
});
