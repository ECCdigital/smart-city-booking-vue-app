/**
 * `accessPointDetails.accessPointAmounts` of a bookable: `{ "<accessPointId>":
 * <n> }`, how many compartments a booking gets at each of the bookable's
 * locker systems. The bookable's `amount` is distributed over its systems by
 * this editor - it is not owed at every system again, so a bookable of 12 at
 * two systems gives a booking 12 compartments, not 24.
 *
 * The field sits beside the unchanged flat `accessPointIds` rather than
 * replacing it with a list of objects: a door carries no amount and must not
 * notice the change (locker spec §L2.1). The backend reads the same field
 * (`entities/bookable/access-point-amounts.js`) and falls back to what the
 * booking's item books wherever the map says nothing, so a bookable saved
 * without a distribution behaves exactly as it did before.
 */

/**
 * Whether a value is a number of compartments: a whole, non-negative one.
 * Nothing else counts - an empty field is no number, not zero. Mirrors the
 * backend reader, so the UI never sends what would come back as
 * `invalid_amount`.
 *
 * @param {*} value The value as it was stored or typed
 * @returns {boolean} True for a whole, non-negative number
 */
export function isCompartmentAmount(value) {
  if (value === undefined || value === null || value === "") return false;

  const amount = Number(value);
  return Number.isInteger(amount) && amount >= 0;
}

/**
 * A stored value read as an amounts map. Anything that is no map - absent, a
 * list, a leftover of an older shape - reads as no distribution at all.
 */
function asAmountMap(amounts) {
  return amounts && typeof amounts === "object" && !Array.isArray(amounts)
    ? amounts
    : {};
}

/**
 * How many compartments the bookable distributes to one access point.
 *
 * Nothing distributed is not zero: the backend then hands the system what the
 * booking's item books. `null` is that "as before", and it is what an empty
 * cell in the assignment table shows.
 *
 * @param {Object} details The bookable's `accessPointDetails`
 * @param {string} accessPointId The id of the access point's row
 * @returns {number|null} The distributed compartments, or `null`
 */
export function compartmentsAt(details, accessPointId) {
  const amount = asAmountMap(details?.accessPointAmounts)[
    String(accessPointId)
  ];
  return isCompartmentAmount(amount) ? Number(amount) : null;
}

/**
 * The amounts as they read after one cell of the table was edited.
 *
 * A cleared field - or one holding something that is no number at all - drops
 * the entry, because "nothing distributed" is a state of its own. Everything
 * else is normalized to a whole, non-negative number the way the buffer fields
 * of the same tab normalize theirs, so an admin cannot leave the screen with a
 * value the backend rejects.
 *
 * @param {Object} details The bookable's `accessPointDetails`
 * @param {string} accessPointId The id of the edited access point's row
 * @param {*} value What the field holds now
 * @returns {Object} A fresh amounts map; the stored one is left alone
 */
export function withCompartmentsAt(details, accessPointId, value) {
  const amounts = { ...asAmountMap(details?.accessPointAmounts) };
  const key = String(accessPointId);
  const blank = value === "" || value === null || value === undefined;
  const amount = blank ? NaN : Math.floor(Number(value));

  if (Number.isFinite(amount)) {
    amounts[key] = Math.max(amount, 0);
  } else {
    delete amounts[key];
  }

  return amounts;
}

/**
 * The amounts stripped of everything meaningless: an entry for an access point
 * the given ids do not reference, and an entry that is no number of
 * compartments. The backend discards the first and answers `invalid_amount`
 * for the second, and the UI has no reason to send either - least of all a
 * leftover the admin never typed and could not correct.
 *
 * @param {Object} amounts The stored amounts map
 * @param {string[]} accessPointIds The ids the bookable references
 * @returns {Object} A fresh amounts map; the given one is left alone
 */
export function prunedAmounts(amounts, accessPointIds) {
  const referenced = new Set((accessPointIds || []).map((id) => String(id)));

  return Object.fromEntries(
    Object.entries(asAmountMap(amounts))
      .filter(
        ([id, amount]) => referenced.has(id) && isCompartmentAmount(amount)
      )
      .map(([id, amount]) => [id, Number(amount)])
  );
}

/**
 * Whether the distribution disagrees with the bookable's capacity, and by
 * which two numbers.
 *
 * `amount` stays freely editable (§L2.2) - it is the general count of any
 * bookable, not one with compartments - so this is a warning, never a lock.
 * The known risk of saving a difference: the backend makes the compartments
 * the distribution asks for, while the occupancy is counted against `amount`.
 *
 * Silent where there is nothing to compare: a bookable that distributes
 * nothing behaves as it always did, and an empty capacity means unlimited.
 * A partly filled distribution does warn - the systems left empty fall back to
 * the booking's item, which is not what the sum says.
 *
 * @param {Object} bookable The bookable being edited
 * @param {string[]} lockerIds The ids of the assigned locker systems
 * @returns {{distributed: number, capacity: number}|null} The two numbers
 *   where they disagree, otherwise `null`
 */
export function capacityMismatch(bookable, lockerIds) {
  const details = bookable?.accessPointDetails;
  const distributedIds = (lockerIds || []).filter(
    (id) => compartmentsAt(details, id) !== null
  );

  if (!distributedIds.length) return null;
  if (!isCompartmentAmount(bookable?.amount)) return null;

  const distributed = distributedIds.reduce(
    (sum, id) => sum + compartmentsAt(details, id),
    0
  );
  const capacity = Number(bookable.amount);

  return distributed === capacity ? null : { distributed, capacity };
}
