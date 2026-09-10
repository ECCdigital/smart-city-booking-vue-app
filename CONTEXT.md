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
