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

## The headline over the path

Since the UI-Nachschliff strand a booking's state is drawn once, the same way in three hosts - the detail drawer, the edit form and the series drawer - and once more as the choice in the create form. The words below are the strand's, in `src/utils/bookingStatus.js` and `src/components/Booking/BookingStatusPath.vue`; there is no `BookingStatusBar` any more.

| German            | Code                                                   | What it is                                                                                                                                                                                                                                                                                    |
| ----------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kopfzeile         | `BookingStatusPath.vue`                                | The state area of a booking: avatar and state word (with the Kostenfrei chip), the actions on the right, the line of segments under it, the dates under the segments, and the slots `reason` and `payment` under everything. The host computes the path; the component never reads the route. |
| Hauptpfad         | `pathOf(booking)` → `path.steps`                       | Angefragt → Zahlung offen → Bestätigt; without Zahlung offen where the booking is free.                                                                                                                                                                                                       |
| Schritt, Segment  | `STEP_STATE` - `done`, `current`, `upcoming`, `void`   | One state of the main path as one segment of the line: reached, the current one, still to come, or dropped by a cut. In the chooser the segments are radios.                                                                                                                                  |
| Endsegment        | `path.end`, `path.terminal`                            | The red segment Abgelehnt / Storniert that cuts the path after the step reached (`end.afterIndex`); it carries `cancelledAt` as `date` and the `rejectionReason` as `reason`.                                                                                                                 |
| Erreicht          | `path.reachedIndex`                                    | The last step the booking had before the cut: Angefragt at Abgelehnt, `cancelledFrom` at Storniert, Bestätigt where that is unknown. For a series: the step **every** member reached.                                                                                                         |
| Hauptaktion       | `splitActions(actions).primary`                        | The one action along the path - Freigeben, Als bezahlt markieren, Wiederherstellen - as a filled button (`booking-action-primary`).                                                                                                                                                           |
| Nebenweg          | `splitActions(actions).secondary`                      | Ablehnen / Stornieren (and the delete). **Always in the ⋮-menu** (`booking-action-menu`), also where there is no Hauptaktion - at Bestätigt, Stornieren stands alone in the menu, never as a button.                                                                                          |
| Zustand der Serie | `label` prop, `seriesPathOf(groupBooking, members)`    | The caption the series drawer puts before the word; the path of the series read as one booking (see below).                                                                                                                                                                                   |
| Anfangszustand    | `label` prop, `chooser` + `value` props, event `input` | The caption the create form puts before the word; the choice on the same headline (see below).                                                                                                                                                                                                |

### The Anfangszustand is chosen with the state words

The choice in the create form names the state the booking is born in; internally it stays the act (`requested / confirmed / paid`), so that the price may move it. That is the addendum to spec E10: the segments read Angefragt / Zahlung offen / Bestätigt (`statusLabel()`), not Angefragt / Freigegeben / Bezahlt.

| Segment clicked (`input`) | Choice (`INITIAL_STATE`)                     | Wire (`initialStateWire`)                                          |
| ------------------------- | -------------------------------------------- | ------------------------------------------------------------------ |
| Angefragt                 | `requested`                                  | `status: requested`                                                |
| Zahlung offen             | `confirmed`                                  | `status: payment_due`                                              |
| Bestätigt                 | `paid` with a price, `confirmed` without one | `status: confirmed`, with `paymentMethod` and `timePaid` at `paid` |

`choose()` in `BookingEditStatus.vue` is that translation; `initialStateChoices(priceEur)` offers `paid` only with something to pay, and a paid draft that turns free falls back to `confirmed`. The headline's word and checked segment follow `initialStateWire(initialState, priceEur).status`, so a `confirmed` draft reads Zahlung offen with a price and Bestätigt without.

### A series read as a booking

`seriesPathOf(groupBooking, members)` draws the series on the same headline, captioned „Zustand der Serie":

-   **Kostenfrei** for a series means a total price of zero: `totalPriceOf(members) <= 0`. Then the path has no Zahlung offen and the chip stands beside the word.
-   **Erreicht** is what every member reached: at Storniert the cut sits behind the lowest of the members' `cancelledFrom`s (a missing one reads as Bestätigt); at Abgelehnt behind Angefragt.
-   **The only date** is the series' own request (`groupBooking.timeCreated`); there is no paid and no cancellation date.
-   **The reason** stands only where every member gives the same one (`sharedReason`), the rule after „Serie stornieren"; otherwise the block is absent.
-   **Gemischt** has no path (`seriesPathOf` answers `null`): the drawer counts the members per state instead (`mixedCounts(members)` - „2 Angefragt · 1 Bestätigt", in the vocabulary's order, only states with members) and points at the list below; no button, no menu.
-   **Series verbs**: series-wide actions are worded with „Serie" - „Serie freigeben", „Serie als bezahlt markieren", „Serie ablehnen" / „Serie stornieren" (`seriesActionLabel(action, status)`, `group-booking.action.*`); the member rows keep the plain verbs.

## The UI reads `status`, never a flag

A flag is a derivation, and the derivations lie in the places that matter: `isPayed` means "nothing left to pay", so a free booking carries it in every state - which is why a free, unconfirmed booking used to read as "Bezahlt" and could not be deleted. Reading `status` heals both.

So: **no code under `src/` reads `isCommitted`, `isPayed` or `isRejected` to decide anything about a booking, and no code under `src/` sends one.** Where a component needs a yes/no, it asks the module (`isPaid`, `isRejectedOrCancelled`, `allowsAction`), and the module itself exports nothing that reads a flag. The remaining readers - the edit form's write path, the checkout views, the public cancellation page - are on their way out ticket by ticket; `src/js-web-interface/` is the one exception, a separately shipped embed that stays on the flags.

The rule engine is untouched: rules evaluate the stored document, and the backend keeps writing the flags there.
