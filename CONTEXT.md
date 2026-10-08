# Smart City Booking Admin UI

Administration of multi-tenant resource booking. This glossary covers the Hero Editor vocabulary that
goes beyond the Shared contract's own list (`.scratch/hero-layout/spec.md`, section "Vocabulary").

## Language

### Hero Editor

**Panel** (admin: „Fläche“):
The surface a Block paints behind itself, with its own colour, opacity, corner radius and an optional frosting of what lies behind it. It looks the same in light and dark mode; text inside it with the default colour stays dark in both.
_Avoid_: background (that is the Hero-wide Background), box, card, glass (that is the Glas preset, not the concept)

**Glas** (admin: „Glas“):
The Panel's preset and starting point: a light, mostly transparent, frosted surface with medium corners. Switching a Panel on produces it; the chip restores it.
_Avoid_: translucent (the retired name), default (the Panel has none; a Block without a Panel has `null`)

**Offset** (admin: „Versatz“):
A Block's displacement from its natural place in the Zone stack, in steps; it moves only the Block, never its neighbours.
_Avoid_: position (that is the Zone), margin, nudge

**Layer** (admin: „Im Vordergrund“):
Whether a Block paints in front of or behind overlapping Blocks; two values, front and back.
_Avoid_: z-index, order (that is the array order), level

**Alignment** (admin: „Ausrichtung“):
How a Block's content sits inside its own box — the lines of a text or rich-text Block, the image of an image Block. Only visible once the Block has a width to spare; by default it follows the Zone column.
_Avoid_: text alignment (it places images too), position (that is the Zone), justify

**Inline format**:
A size or colour applied to a run of words inside rich text, drawn from the same scale and tokens as a text Block.
_Avoid_: style, span, mark (TipTap's word, not the domain's)

**Paragraph alignment**:
A per-paragraph override of the Block's alignment inside rich text.

### Bookings

**Buchungslink** (admin: „Link kopieren“):
The URL of a booking page or group booking page that one admin hands to another. It names the booking and the tenant it belongs to, so the recipient lands on the same page in the same tenant; a recipient who is not a member of that tenant sees an explanation on the page, never a redirect.
_Avoid_: deep link (the browser mechanism, not the thing shared), Zahlungslink (that is the customer-facing payment URL, a different link)

**Dokumente** (admin: „Dokumente“):
The files that belong to a booking or group booking, in four groups: Belege (receipts), Rechnungen (invoices), Stornobelege (cancellation receipts) and Anhänge (other attachments). The actions that produce a document belong to its group.
_Avoid_: Anhänge for the whole set (that is only the fourth group)

**Buchungsseite** (admin: „Buchung #…“):
The page at `/bookings/:bookingId?tenant=…` that shows one booking and every action on it. Replaces the former details dialog; one surface per booking.
_Avoid_: Buchungsdetails (the dialog's title, retired), Drawer

**Serienbuchungsseite** (admin: „Serienbuchung #…“):
The page at `/group-bookings/:groupBookingId?tenant=…` that shows one series with its members. Replaces the former group booking dialog.
_Avoid_: Gruppenbuchungsseite (the code says group booking, the screen says Serienbuchung)

**Erstattungsstand** (admin: „Rückerstattung offen“ / „Rückerstattung erfolgt“):
Whether the refund of a cancelled booking has been paid out: open or completed. The backend sets it to open at the cancellation, only where a refund is due (cancelled out of Bestätigt with a refund above zero); the administration ticks it off by hand on the Buchungsseite and can take that back - the platform pays nothing out and learns of no payout. A marker beside Storniert, not a state: a reinstatement drops it, and the booker never sees it.
_Avoid_: Rückerstattungsstatus, Refund-Status, erstattet (as a booking state)

**Mitglied** (of a tenant):
An admin whose permissions list the tenant, or an instance owner for whom the tenant appears in the loaded tenant list. The one fact about access the client can know without asking the server; decides the non-member state of a Buchungsseite.
_Avoid_: berechtigt (that is Reichweite, a different question)

**Reichweite**:
How far an admin's read on bookings reaches at the current tenant: *any* (instance owner, tenant owner, `manageBookings.readAny`) or *own* (every other member). Decides only how a 404 is worded on a Buchungsseite, since the backend answers 404 alike for gone and out of reach.
_Avoid_: Rolle

### Bookables

**Übersicht** (admin: „Übersicht“):
The card beside a bookable's form that recaps what the bookable holds and jumps to where each value is set. In the editor it is cut by tab, in the guided flow by step; there a step not yet visited reads „Noch offen“ and a value left empty „–“. It shows values, never how the bookable will look.
_Avoid_: Zusammenfassung, Vorschau (that is the storefront's job), Zwischenstand

**Schrittliste**:
The guided flow's progress on large screens: the six steps by title with their state (done, current, upcoming) in a column on the left, clickable like the dots it replaces. It answers „Wo bin ich?“; the Übersicht answers „Was habe ich eingegeben?“.
_Avoid_: Stepper, Navigation (that is the editor's section nav), Punkte (those are the small-screen form)

**Meldung**:
What the check of a bookable says under one field when its value would be refused, such as „Bitte einen Titel eingeben.“. A field shows it once it was left, and every field shows it after a refused save. It never locks „Speichern“, „Weiter“ or a tab.
_Avoid_: Fehler, Validierungsfehler, Offene Punkte (those are the confirmation page's list after the save)

### SSO

**Adresse**:
The origin (scheme, host and port) under which a Biletado app is reachable, such as `https://booking.guben.de`. The Admin UI of an instance can have several, the Storefront has one.
_Avoid_: Domain (has no scheme), URL (also covers paths)

**Rücksprungadresse**:
A complete URL under an Adresse that Biletado hands to Keycloak to come back to, after sign-in or after sign-out. Keycloak accepts only the ones its client lists.
_Avoid_: Callback (names only the one after sign-in)
