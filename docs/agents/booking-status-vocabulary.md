# Booking status vocabulary

Since 4.3.x a booking's state is **one stored value**, `booking.status`, moved by named transitions. The three flags (`isCommitted`, `isPayed`, `isRejected`) are derivations the backend still delivers for the rule engine and the JS embed. The Admin UI reads the value and not the flags; this is the mapping between the German words on screen and the code, plus the rules that are easy to break without noticing.

## The five states

`src/utils/bookingStatus.js` owns the mapping. Every label is an i18n key under `booking.status.*`; the module resolves it through the app's i18n instance, so callers get the word straight back.

| German        | `status`      | Chip                        | What it is                                                                                         |
| ------------- | ------------- | --------------------------- | -------------------------------------------------------------------------------------------------- |
| Angefragt     | `requested`   | orange, `mdi-clock-outline` | Placed, not yet confirmed. The only state a priced booking can be hard-deleted in.                 |
| Zahlung offen | `payment_due` | blue, `mdi-cash-clock`      | Confirmed with a price and not paid. Says both things - there is no second chip for the payment.   |
| Bestätigt     | `confirmed`   | success, `mdi-check-circle` | Confirmed and paid, or confirmed and free. A "paid date" (`timePaid`) is shown only here.          |
| Abgelehnt     | `rejected`    | error, `mdi-cancel`         | Cancelled out of `requested`. Reinstate goes back to `requested`.                                  |
| Storniert     | `cancelled`   | error, `mdi-close-circle`   | Cancelled out of `payment_due` or `confirmed`. `cancellationRefund.cancelledFrom` remembers which. |

Sort order of the "Status" column (`statusRank`): `requested < payment_due < confirmed < cancelled < rejected`.

## Two derived words that are not states

| German     | Code                                    | What it is                                                                                                                    |
| ---------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Kostenfrei | `isFree(booking)`, `freeMarker()`       | `priceEur <= 0`. A marker chip beside the status, never a status - a free booking still runs through Angefragt and Bestätigt. |
| Gemischt   | `groupBookingStatus(members) === MIXED` | A series whose members do not share one status. Group actions are offered only where the status is shared (spec E9).          |

"Bezahlt" as a fact (the export column, the details chip) is read off the state too: `isPaid(booking)` is true at `confirmed`, and at `cancelled` iff `cancelledFrom === "confirmed"`. `paymentLabel(booking)` turns that into Kostenfrei / Ja / Nein for the Excel export.

## The action verbs

Each verb is an i18n key under `booking.action.*` and names one backend transition on its own route. There is no "Freigabe zurücknehmen" and no "Zahlung zurücknehmen" - the backend has no such transition and answers 400.

| German                | `BOOKING_ACTION` | Allowed at                 | Route                                 |
| --------------------- | ---------------- | -------------------------- | ------------------------------------- |
| Freigeben             | `confirm`        | `requested`                | `GET …/bookings/:id/commit`           |
| Als bezahlt markieren | `pay`            | `payment_due`              | `POST …/bookings/:id/pay`             |
| Ablehnen              | `cancel`         | `requested`                | `POST …/bookings/:id/reject`          |
| Stornieren            | `cancel`         | `payment_due`, `confirmed` | `POST …/bookings/:id/reject`          |
| Wiederherstellen      | `reinstate`      | `rejected`, `cancelled`    | `POST …/bookings/:id/reinstate`       |
| Löschen               | `delete`         | `requested`, `rejected`    | `DELETE …/bookings/:id` (hard delete) |

`allowedActions(status)` answers the third column, `allowsAction(booking, action)` asks it for one booking, and `actionLabel(action, status)` picks Ablehnen or Stornieren for a cancel. "Freigeben" stays the tenants' established word for `confirm`; the kanban's workflow actions (`commit`, `paid`, `reject`) use the same verbs.

## The UI reads `status`, never a flag

A flag is a derivation, and the derivations lie in the places that matter: `isPayed` means "nothing left to pay", so a free booking carries it in every state - which is why a free, unconfirmed booking used to read as "Bezahlt" and could not be deleted. Reading `status` heals both.

So: **no code under `src/` reads `isCommitted`, `isPayed` or `isRejected` to decide anything about a booking, and no code under `src/` sends one.** Where a component needs a yes/no, it asks the module (`isPaid`, `isRejectedOrCancelled`, `allowsAction`), and the module itself exports nothing that reads a flag. The remaining readers - the edit form's write path, the checkout views, the public cancellation page - are on their way out ticket by ticket; `src/js-web-interface/` is the one exception, a separately shipped embed that stays on the flags.

The rule engine is untouched: rules evaluate the stored document, and the backend keeps writing the flags there.
