import _ from "lodash";
import { v4 as uuidv4 } from "uuid";
import { normalizeLeadTimeFields } from "@/utils/bookingLeadTime";
import { normalizeBookingDiscounts } from "@/utils/bookingDiscounts";

const hasEntries = (list) => Array.isArray(list) && list.length > 0;

/**
 * The bookable as the editor works on it, from the stored one: run when
 * `BookableEdit` loads a bookable and after it saved one, before the
 * unsaved-changes snapshot - so what it changes never reads as an edit, and
 * no component has to change the bookable when it mounts. Pure: the stored
 * bookable stays as it was. See docs/adr/0002-one-field-one-component-one-rule.md.
 */
export function normalizeBookable(stored) {
  const bookable = _.cloneDeep(stored || {});

  // The backend reads 0 as unlimited, as it reads null.
  if (bookable.amount === 0) bookable.amount = null;

  // Named roles or people only ever let signed-in users book in the backend.
  if (
    hasEntries(bookable.permittedRoles) ||
    hasEntries(bookable.permittedUsers)
  ) {
    bookable.requiresLogin = true;
  }

  // The editor tells the Zeiträume apart by their id.
  bookable.blockPeriods = (bookable.blockPeriods || []).map((period) =>
    period.id ? period : { ...period, id: uuidv4() }
  );

  if (!bookable.cancellationPolicy) {
    bookable.cancellationPolicy = { userCancellable: true };
  }

  normalizeLeadTimeFields(bookable);
  normalizeBookingDiscounts(bookable);
  return bookable;
}
