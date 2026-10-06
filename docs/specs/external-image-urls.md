# Spec: Restore external image URLs with the media library

**Status:** ready for implementation
**Repo:** smart-city-booking-vue-app, branch `feat/media-library-admin`
**Backend:** no changes required (verified on `feat/media-library-core`)

## Problem

Since the media-library editors landed (`8ba941b` "Store media references in the bookable and event editors"), admins can no longer enter external image URLs for **bookable images** and **event images**. The backend still fully supports them — every image field accepts `{source: "external", mediaId: null, url}`, the `MediaReferenceGuard` passes external references untouched, and `exportPublic()` serves the external URL verbatim to the storefront. The gap is UI-only:

- `MediaReferenceField.vue` (single image: teaser, speaker, logo, …) *can* create external references, but only via an unlabeled `mdi-link-variant` icon toggle.
- `MediaReferenceList.vue` (bookable `images`, event `images`) has **no** way to create one — its only affordance is "Aus Mediathek wählen". It already displays, reorders, and deletes external rows correctly; only creation is missing.
- The legacy `bookable.imgUrl` is shown as a read-only alert in `BookableEditGeneral.vue` — an old external cover URL can no longer be edited, cleared, or migrated.

## Decisions

1. **Model: external reference, no import.** An entered URL is stored as `{source: "external", mediaId: null, url}` (hotlinking). No import-by-URL endpoint, no backend work.
2. **Scope: bookable and event images only.** Attachments, branding, and legal documents already work via `MediaReferenceField` and are untouched (apart from decision 3 applying to the shared dialog).
3. **Entry point: an "Externer Link" tab in `MediaPickerDialog.vue`.** The dialog becomes the single entry point everywhere: Mediathek | Upload | Externer Link. Selecting the tab shows a URL text field (`placeholder="https://…"`); confirming emits `externalReferenceOf(url)` instead of a media pick.
4. **Remove the field-level icon toggle.** With the dialog tab in place, the `allowExternal` icon toggle in `MediaReferenceField.vue` (lines ~54–65) is redundant and is removed; the dialog tab is the discoverable, labeled replacement.
5. **Legacy `imgUrl` migration action.** The read-only alert in `BookableEditGeneral.vue` gains an "Als Bild übernehmen" action: it prepends `externalReferenceOf(model.imgUrl)` to `model.images` and clears `model.imgUrl`. Once `imgUrl` is empty the alert disappears (existing behavior).
6. **External rows are inline-editable.** An existing external entry in `MediaReferenceList.vue` can have its URL changed in place (small edit affordance on the row); the same applies to the single-field display where practical.
7. **Dead-code cleanup.** Delete `src/components/Files/ChooseFile.vue` and `src/services/api/ApiFileService.js` — both are orphaned and call the removed `/api/:tenant/files` endpoints.

## Touch points

| File | Change |
| --- | --- |
| `src/components/Media/MediaPickerDialog.vue` | Add "Externer Link" tab with URL input; emit an external reference on confirm. |
| `src/components/Media/MediaReferenceList.vue` | Accept external results from the dialog (`externalReferenceOf` is already imported); add inline URL editing for external rows. Display/reorder/delete already work. |
| `src/components/Media/MediaReferenceField.vue` | Route external entry through the dialog tab; remove the icon-only toggle. |
| `src/components/Bookable/Edit/BookableEditGeneral.vue` | "Als Bild übernehmen" action on the legacy `imgUrl` alert (→ decision 5). |
| `src/components/Files/ChooseFile.vue`, `src/services/api/ApiFileService.js` | Delete (dead code). |

## Acceptance criteria

- A bookable and an event can each get a gallery image by pasting an external `https://` URL; it saves as `{source: "external", url}` and renders on the storefront.
- The same dialog tab works for single-image fields (teaser image, speaker image, instance logo).
- An existing external entry's URL can be corrected without deleting the row.
- A bookable with only a legacy `imgUrl` can be migrated to `images[0]` with one click; the alert then disappears and the cover still renders.
- No code references `/api/:tenant/files` or `/api/files` any more.
- `publicOnly` contexts still allow external entries (the backend guard only restricts library media, not external references).
