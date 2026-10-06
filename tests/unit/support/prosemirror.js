/**
 * ProseMirror measures the selection whenever the editor takes focus, and jsdom
 * has no layout to measure. Every spec that mounts a real `Tiptap` calls this
 * once, so the measurement answers with nothing instead of throwing.
 */
export function stubProseMirrorLayout() {
  const noRects = () => [];
  const noRect = () => ({
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: 0,
    height: 0,
  });

  for (const prototype of [Range.prototype, Element.prototype]) {
    if (!prototype.getClientRects) prototype.getClientRects = noRects;
    if (!prototype.getBoundingClientRect) {
      prototype.getBoundingClientRect = noRect;
    }
  }
}
