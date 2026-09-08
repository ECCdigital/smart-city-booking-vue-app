# Access vocabulary

The access area speaks German on screen and `access` in the code, and the two words for one thing are rarely the same word. This is the mapping, plus the few rules that are easy to break without noticing.

## The terms

Every code cell leads with the identifier, so the table can be read from either end: German term → code, or a grep hit → the word on screen.

| German                                        | Code / API                                                    | What it is                                                                                                                                                                    |
| --------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Zugangspunkt                                  | `accessPoint`, a row in `accesspoints`                        | What a door and a locker system both are since 4.3.x: created once per tenant, assigned to any number of bookables.                                                           |
| Tür                                           | `DOOR_TYPE`, `type: "door"`                                   | Nuki, Salto KS. Shared for the booking period, not handed out. Anything not `locker` counts as one.                                                                           |
| Schließfachanlage, short **Anlage**           | `LOCKER_TYPE`, `type: "locker"`, `isLockerAccessPoint()`      | iFBS, Pareva. One row per tenant and iFBS location, or per tenant and Pareva product.                                                                                         |
| Fach                                          | `compartment`                                                 | The compartment a booking is assigned at an Anlage — one per booked unit of the item, at each assigned Anlage, picked by the provider. Lives in the grant, not in the Anlage. |
| Herkunft — „Selbst angelegt“ / „Vom Anbieter“ | `originLabel` in `AccessPointManagement.vue`, derived         | „Vom Anbieter“ for an Anlage whose provider lists access points (`canListAccessPoints`), else „Selbst angelegt“. Nothing stores it.                                           |
| Vom Anbieter übernehmen / Manuell anlegen     | `mode: "provider" \| "manual"` in `AccessPointEditDialog.vue` | The two sides of the switch in the create dialog: the listing over the form, or the form alone. Not `form.mode`.                                                              |
| Anbieter                                      | `provider` — `nuki`, `salto-ks`, `ifbs`, `pareva`             | Chosen in the dialog; it then settles the type and, for an Anlage, the mode (`providerAccessPointDefaults`).                                                                  |
| Standort-ID (iFBS)                            | `externalId` of an Anlage with `provider: "ifbs"`             | The `LocationID` of the iFBS location. The only id field of an iFBS Anlage; iFBS knows no ids per Fach.                                                                       |
| Produkt-ID (Pareva)                           | `externalId` of an Anlage with `provider: "pareva"`           | The id of the Pareva product, a 24-hex id (what Pareva's `/available` lists as `size` is a size code, not this). Entered by hand; the cabinet (`lockerId`) is in the app.     |
| Vorgemerkt (die Vormerkung)                   | `ACCESS_STATE.HELD`                                           | Claimed for the booking, not granted yet.                                                                                                                                     |
| Erteilt (der Grant)                           | `ACCESS_STATE.GRANTED`                                        | Granted and not taken back.                                                                                                                                                   |
| Widerrufen (der Widerruf)                     | `ACCESS_STATE.REVOKED`                                        | Granted once, taken back since. The entry stays as the trace.                                                                                                                 |
| Stückzahl                                     | `bookable.amount`                                             | The bookable's capacity: the upper bound of concurrent bookings. Edited on the Preise tab („Verfügbare Anzahl“) only; empty means unlimited.                                  |
| Pufferzeit — Vorlauf / Nachlauf               | `accessPointDetails.accessBuffer.before` / `.after`           | Minutes around the booking period in which the access points may still be operated. Per bookable.                                                                             |
| Zugänge                                       | `BookingAccessPoints.vue`, `accessEntriesOf()`                | The one list of doors and Fächer in booking details.                                                                                                                          |
| Reichweite                                    | `isOutOfReach()`                                              | Whether a record is visible to the caller at all. A term of these docs and the changelog, not of the UI copy.                                                                 |

## An Anlage shows the one field its provider reads

The id fields of the dialog follow the provider (`providerIdFields` in `src/utilities/access-points.js`), the same on create and on edit: „Standort-ID“ for iFBS, „Produkt-ID“ for Pareva, each with its own hint, and the Produkt-ID with a placeholder showing the shape of the 24-hex id. `providerLocationId` is read by no provider and is not shown for an Anlage; it stays a field of the schema and the API, goes out as `null` when an iFBS or Pareva Anlage is created, and passes through unchanged when a stored one is edited. A door, and an Anlage of a provider the table does not know, keep both fields — „ID beim Anbieter“ and, informative, „Standort-ID beim Anbieter“.

## The way in is not the Herkunft

The switch is offered only while a provider that lists access points is active — `providerCapabilities` with `listAccessPoints`, `canListAccessPoints()` — and is then preset to the first of them; the picker's provider select names those providers only, the form's own provider field every active one. Switching hides the listing and touches nothing entered. Without a listing to take over from the dialog is the form alone, without a hint; with exactly one provider active the form starts on it, which is how a tenant with Pareva alone lands on the Pareva Anlage. A Pareva Anlage is always entered by hand: Pareva's listing names size codes, not products, so the backend reports it without `listAccessPoints`. The dialog's `mode` is this choice and not the door's Modus, which is `form.mode` in the same component.

The Herkunft column is derived from the type and the provider: an Anlage of a provider that lists access points reads „Vom Anbieter“, everything else „Selbst angelegt“ — a door taken over from the listing included, because nothing records the way in, and a Pareva Anlage, because it was typed in.

## „Locker“ is not a German word here

`locker` stays as the `type` value, the provider ids stay, and `isLockerAccessPoint` keeps its name. In the German copy the word appears nowhere, because it names both things at once: the cabinet the admin assigns and the single box the booking gets. Those two have to stay apart — the Stückzahl sits on the bookable, the Fach lives in the grant — so the copy says **Schließfachanlage** (short: **Anlage**) and **Fach**, and „Schließfach“ alone is never one of them. The screens that used the old word (`BookableEditLockerSystems.vue`, the „Schließfach-Steuerung“ section) are gone.

## The three states are derived, not delivered

`accessState()` in `src/utilities/booking-access-points.js` reads two fields of the projection:

| State      | Condition                                       |
| ---------- | ----------------------------------------------- |
| Vorgemerkt | `externalBookingId == null` and not provisioned |
| Erteilt    | `isProvisioned === true`                        |
| Widerrufen | `externalBookingId != null && !isProvisioned`   |

`externalBookingId` is the grant's `authorizationId`, written only when the grant is made; `isProvisioned` is that grant unrevoked. A door carries no `externalBookingId`, so it is vorgemerkt or erteilt, never widerrufen.

## The opaque Fach-Id

A Fach is addressed by `<accessPointId>:<authorizationId>`, before the grant by `<accessPointId>:hold`. **Pass the `id` the projection hands out on as it came — never split it, never assemble one.** That is the rule the retired locker section broke: it sent `lockerInfo.processId` as the id, which since 4.3.x is neither an access point id nor a compartment id, so every open command answered 403.

## Capacity belongs to the bookable, never to the Anlage

An Anlage has no capacity of its own — the management table says so in its assignment cell — and there is no number per assigned Anlage either. The bookable's `amount` („Stückzahl“) is the upper bound of concurrent bookings, edited on the Preise tab only; the access tab („Zugang & Schließsysteme“) owns the switch, the buffer and the assignment table, and nothing that counts. The retired „Menge“ column and its field `accessPointDetails.accessPointAmounts` are neither written nor read; a stored map is dropped by `ApiBookablesService` on the way out.

Two checks, and both must pass: the platform counts the concurrent bookings against `amount` (empty means unlimited), and the provider is asked live whether it has the compartments — Pareva answers one entry per free unit of the product in the window, and the check needs at least as many entries as the item books. With an unlimited `amount` the provider alone decides; with the provider unreachable, the count alone does. A booking gets one Fach per booked unit of its item at each assigned Anlage; a bookable with several Anlagen hands out that number at each of them.

A Pareva product has a stock of its own, and that number is Pareva's: the platform stores no amount on the Anlage, and the checkout asks Pareva live whether the product is free in the booked window, beside the platform's own count (spec `docs/specs/pareva-anlage.md`; the retirement of the Menge in `.scratch/schliesssysteme-ohne-menge/spec.md`, local, not committed).

## One source for a booking's Zugänge

`GET /api/:tenant/access?bookingId=<id>` (`ApiAccessService.getAccessPoints`) — tenant-scaled, so a tenant owner reaches a booking that is not their own. It answers doors and Fächer in one flat list; `src/utilities/booking-access-points.js` documents the fields an entry carries.

Not on it: `accessEligibility`, so `primaryBlockingReason`, `remoteOperableAccessPointIds` and `evidenceWaived` are out of reach here and the UI re-derives the reason from what it has (`openBlockOf`). Also absent: `hold`, `grant`, `revokedAt`, `externalId`.

Do not reach for `booking.lockerInfo` or `booking.accessInfo` in this screen, and not for `/api/access/bookings` — that route is instance-wide and hangs on `instanceOwner`, which a tenant owner does not satisfy. `accessInfo` on the tenant's bookings has one remaining reader: `bookingsWithLiveAccess()` in `src/utilities/access-grants.js`, which `AccessPointManagement.vue` uses to tell the delete dialog which running bookings still hold a live access.

## `capabilities` free the buttons

`capabilities` is the list of provider actions the projection offers a client: `open`, `close`, `getStatus`. A button is offered only where its capability is declared — Pareva declares none, and `mode` alone is not enough (opening also needs `remote` or `both`). `unlatch` is not among the projected capabilities, because the lock decides behind `open` whether it pulls its latch; the „Tür öffnen“ button therefore stands on `close`, the nearest declared signal of a lock that takes mechanical commands.

A button that cannot be used stays visible and disabled, with its reason on the element. The reasons are the backend's own vocabulary, mirrored in `src/utilities/access-blocking-reasons.js`; `locker_not_ready` is gone from it because the backend dropped it from its enum.

## Reichweite

From the Rechte-Strang, and worth keeping here because the same question runs through the access screens. Reichweite is whether a record is visible to the caller at all — not which permission is missing. Since 4.3.x a record outside it answers 404 as readily as 403, so `isOutOfReach(error)` in `src/services/api/apiErrorMessage.js` covers both statuses and is the one to ask wherever the UI only wants to know "may this be shown?". `isForbiddenError` is the narrower question a list screen asks to tell an empty result from a denied one — which is what the lists of the Verwaltung ask; the card „Zugänge“ in booking details asks `isOutOfReach`, because the access route answers 403 for every booking that is not Bestätigt, with or without access points, and that is nothing to show rather than a failure. A message that has to _name_ a reason still looks at the status itself.
