# ADR 0002: One field, one component, one rule for the bookable

- **Status:** Accepted
- **Date:** 2026-10-08
- **Origin:** ECCdigital/tickets#337 (map), #352 (this record), #340 (component interface, points 1, 3 and 6)
- **Numbering:** 0001 was the ADR on the optional Admin BFF, removed from the repo but still linked from `AGENTS.md`; its number is not reused.

## Context

A bookable is edited in two modes of `BookableEdit`: the editing page (Bearbeitungsseite, tabs with section cards) and the guided flow (Geführter Ablauf, steps). Both show the same bookable, but grew apart: the same field had different names, different inputs and different rules per mode, and some states could be stored in one mode that the other could not show. Components changed the `bookable` prop in place, sent the whole bookable through a `model` setter, some with a 200 ms debounce, and some changed it when they mounted (ids, defaults, normalization) - so the unsaved-changes hint, the overview and the checks saw a change only sometimes, and a value could depend on a component staying alive (`keep-alive`).

## Decision

### One field, one component, one rule

Every field of the bookable has exactly one component, one label and one rule, the same in both modes. The mode only draws the frame around it: a section card with a heading in a tab on the editing page, the panel of a step with its question in the guided flow. The frame passes no heights or variants into the component. A new field follows this from the start.

### Changes are partial patches (#340, point 1)

A component that changes the bookable uses the mixin `src/mixins/bookableEditing.js`:

- prop `bookable` - read only, never changed in place;
- `patch(changes)` - emits `update:bookable` with only the changed top-level fields;
- `apply(fn)` - runs a rule that sets a bookable in place (`applyBookingMode`, `applyAccess`, …) on a deep copy and emits the top-level fields it changed.

A deeper field changes by rebuilding its top-level value (a new `priceCategories` list, a new `bookingDiscounts` object). Changes go out at once, without debounce. `BookableEdit` merges every patch flat into its bookable. There is no `model` computed with a setter.

### State is only derived (#340, point 3)

A component holds what it derives from the bookable, plus fleeting state whose loss costs nothing: an open dialog or menu, a search text, a choice the data cannot show yet (Tarife before a second tier, „Nur ausgewählte“ before a role is named). Nothing works only because of `keep-alive`; it stays as a cache.

No component changes the bookable when it mounts. What the editor needs in shape is done once by the pure `normalizeBookable` (`src/utils/normalizeBookable.js`) in `BookableEdit` - on load and after a save, before the unsaved-changes snapshot - so the normalization never reads as an edit.

### Expert options follow one rule (#339, built by #353)

Whether an expert option shows - a booking mode, a section or a tab - is decided by the pure `expertOptionShown(option, { expertMode, stored, current })` in `src/utils/bookableExpertMode.js`: always in expert mode, without it only while the stored or the current bookable uses it, its stand differing from a new bookable's. `BookableEdit` provides the bookable as loaded or last saved with the mode; a component asks `expertOptionShown(option)` from `bookableEditing` and has no `v-if="expertMode"` of its own. Sections, tabs and the flow's optional areas take the same rule as `shown(option)`. There is no locked option with a hint.

### The check is pure (#340, point 6)

What blocks a save is decided by one pure module over the bookable, mirroring what the backend refuses and naming that reason per rule, independent of which components are mounted. Its messages at the fields come from the same rules. (Built by ECCdigital/tickets#354; until then the tabs' own forms still check.)

## Consequences

- A component spec mounts the component with a bookable, drives the DOM and asserts the patch (`tests/unit/support/bookableEditing.js` hosts it as `BookableEdit` does). One spec covers both modes, because the component knows no mode.
- Switching between the modes keeps unsaved input: both read the one bookable in `BookableEdit`.
- Components that still use a `model` setter or change the prop in place are moved onto the mixin by the tickets of the map that rebuild them.
