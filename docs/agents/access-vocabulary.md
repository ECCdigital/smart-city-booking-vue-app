# Access vocabulary

The access area speaks German on screen and `access` in the code, and the two words for one thing are rarely the same word. This is the mapping, plus the few rules that are easy to break without noticing.

## The terms

Every code cell leads with the identifier, so the table can be read from either end: German term → code, or a grep hit → the word on screen.

| German                                        | Code / API                                                          | What it is                                                                                                          |
| --------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Zugangspunkt                                  | `accessPoint`, a row in `accesspoints`                              | What a door and a locker system both are since 4.3.x: created once per tenant, assigned to any number of bookables. |
| Tür                                           | `DOOR_TYPE`, `type: "door"`                                         | Nuki, Salto KS. Shared for the booking period, not handed out. Anything not `locker` counts as one.                 |
| Schließfachanlage, short **Anlage**           | `type: "locker"`, `isLockerAccessPoint()`                           | iFBS, Pareva. One row per tenant and iFBS location, or per tenant and Pareva product size.                          |
| Fach                                          | `compartment`                                                       | The compartment a booking is assigned at an Anlage. Lives in the grant, not in the Anlage.                          |
| Herkunft — „Selbst angelegt“ / „Vom Anbieter“ | `originLabel` in `AccessPointManagement.vue`, derived from the type | A door is typed in by hand, an Anlage is taken over from what the provider lists. There is no stored origin field.  |
| Anbieter                                      | `provider` — `nuki`, `salto-ks`, `ifbs`, `pareva`                   | Chosen in the dialog; it then settles the type and, for an Anlage, the mode (`providerAccessPointDefaults`).        |
| Vorgemerkt (die Vormerkung)                   | `ACCESS_STATE.HELD`                                                 | Claimed for the booking, not granted yet.                                                                           |
| Erteilt (der Grant)                           | `ACCESS_STATE.GRANTED`                                              | Granted and not taken back.                                                                                         |
| Widerrufen (der Widerruf)                     | `ACCESS_STATE.REVOKED`                                              | Granted once, taken back since. The entry stays as the trace.                                                       |
| Menge                                         | `accessPointDetails.accessPointAmounts`                             | How many Fächer a booking gets at one assigned Anlage.                                                              |
| Stückzahl                                     | `bookable.amount`                                                   | The bookable's capacity.                                                                                            |
| Pufferzeit — Vorlauf / Nachlauf               | `accessPointDetails.accessBuffer.before` / `.after`                 | Minutes around the booking period in which the access points may still be operated. Per bookable.                   |
| Zugänge                                       | `BookingAccessPoints.vue`, `accessEntriesOf()`                      | The one list of doors and Fächer in booking details.                                                                |
| Reichweite                                    | `isOutOfReach()`                                                    | Whether a record is visible to the caller at all. A term of these docs and the changelog, not of the UI copy.       |

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

An Anlage has no capacity of its own — the management table says so in its assignment cell. The bookable's `amount` („Stückzahl“, in `BookableEditAccessLocks.vue`) is distributed over its assigned Anlagen through the „Menge“ column, stored as `accessPointAmounts: { "<accessPointId>": <n> }` beside the unchanged flat `accessPointIds` (`src/utilities/access-point-amounts.js`). A door carries no Menge, which is why the numbers live in a second field rather than in a list of objects.

An empty Menge cell is not a zero: where the map says nothing the backend falls back to what the booking's item books, so a bookable without a distribution behaves as it always did — and draws no warning either. Where at least one Anlage does carry a Menge and the sum disagrees with a numeric `amount`, the tab warns and saves anyway (`capacityMismatch()`). `amount` is editable on this tab, except while an external provider reports it — an older rule, unrelated to compartments.

## One source for a booking's Zugänge

`GET /api/:tenant/access?bookingId=<id>` (`ApiAccessService.getAccessPoints`) — tenant-scaled, so a tenant owner reaches a booking that is not their own. It answers doors and Fächer in one flat list; `src/utilities/booking-access-points.js` documents the fields an entry carries.

Not on it: `accessEligibility`, so `primaryBlockingReason`, `remoteOperableAccessPointIds` and `evidenceWaived` are out of reach here and the UI re-derives the reason from what it has (`openBlockOf`). Also absent: `hold`, `grant`, `revokedAt`, `externalId`.

Do not reach for `booking.lockerInfo` or `booking.accessInfo` in this screen, and not for `/api/access/bookings` — that route is instance-wide and hangs on `instanceOwner`, which a tenant owner does not satisfy. `accessInfo` on the tenant's bookings has one remaining reader: `bookingsWithLiveAccess()` in `src/utilities/access-grants.js`, which `AccessPointManagement.vue` uses to tell the delete dialog which running bookings still hold a live access.

## `capabilities` free the buttons

`capabilities` is the list of provider actions the projection offers a client: `open`, `close`, `getStatus`. A button is offered only where its capability is declared — Pareva declares none, and `mode` alone is not enough (opening also needs `remote` or `both`). `unlatch` is not among the projected capabilities, because the lock decides behind `open` whether it pulls its latch; the „Tür öffnen“ button therefore stands on `close`, the nearest declared signal of a lock that takes mechanical commands.

A button that cannot be used stays visible and disabled, with its reason on the element. The reasons are the backend's own vocabulary, mirrored in `src/utilities/access-blocking-reasons.js`; `locker_not_ready` is gone from it because the backend dropped it from its enum.

## Reichweite

From the Rechte-Strang, and worth keeping here because the same question runs through the access screens. Reichweite is whether a record is visible to the caller at all — not which permission is missing. Since 4.3.x a record outside it answers 404 as readily as 403, so `isOutOfReach(error)` in `src/services/api/apiErrorMessage.js` covers both statuses and is the one to ask wherever the UI only wants to know "may this be shown?". `isForbiddenError` is the narrower question a list screen asks to tell an empty result from a denied one — which is what the access screens ask today. A message that has to _name_ a reason still looks at the status itself.
