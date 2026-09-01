/**
 * What is teased but not yet operable.
 *
 * These flags hide unfinished access features behind a "coming soon" state:
 * visible, greyed out and unusable, so the live test shows where the product
 * is heading without letting anyone configure something half-built. Stored
 * configuration is untouched and keeps travelling through a save.
 *
 * Remove the flag - and the markup reading it - once the feature ships.
 */

/** Salto KS credentials and the IQ activation wizard. */
export const SALTO_KS_COMING_SOON = true;

/** Access point modes where the booking user types a PIN at the lock. */
export const COMING_SOON_ACCESS_POINT_MODES = ["authorization", "both"];

/**
 * @param {string} mode An access point mode id
 * @returns {boolean} Whether the mode may not be chosen yet
 */
export function isComingSoonAccessPointMode(mode) {
  return COMING_SOON_ACCESS_POINT_MODES.includes(mode);
}
