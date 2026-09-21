/**
 * The bookables whose price and availability were confirmed in the running
 * wizard session. Kept in memory on purpose: it survives the detour to the
 * legal and payment forms, and neither a reload nor leaving the wizard -
 * there is no stored wizard progress (tenant supervision spec §9).
 */
const confirmed = new Set();

export function confirmChoices(bookableId) {
  confirmed.add(bookableId);
}

export function hasConfirmedChoices(bookableId) {
  return confirmed.has(bookableId);
}

export function resetConfirmedChoices() {
  confirmed.clear();
}
