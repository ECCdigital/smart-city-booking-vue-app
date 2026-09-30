# Prototype: media library on a phone (ECCdigital/tickets#58)

Throwaway branch. It answers "what should the media library look like on a
phone held upright?" and is kept as the primary source for that decision; it
is never merged.

## Run it

`npm run serve` with a backend, then open `/media` below 600px width
(`?variant=A|B|C`, or the pink switcher at the bottom, or ←/→). The media
picker (e.g. „Bilder hinzufügen“ on a room) shares the phone grid.

- **A „Seite“**: filters behind the search funnel, a full-width upload button
  on top, the large view as a full-screen page.
- **B „Daumenzone“**: filters as a swipeable chip row, the upload button fixed
  at the bottom with a sheet for gallery/camera/file, the large view as a
  bottom sheet that grows into the edit form.
- **C „Lightbox“**: a type switch on top, a tight grid, a floating upload
  button asking for the visibility after picking, a dark swipeable lightbox.

Deleting is stubbed; uploads and saves hit the backend you run against.

## Verdict

Marvin-Anders picked **B, with the filters of A** (type, visibility and tags
behind the search funnel). Implemented on `58-mediathek-handy`.

## Screenshots

`0-ist.png` (before), `A-seite.png`, `B-daumenzone.png`, `C-lightbox.png`,
`picker.png` (the variants), `umsetzung-*.png` (the implementation).
