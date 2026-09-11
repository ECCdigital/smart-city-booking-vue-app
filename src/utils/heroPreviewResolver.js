/**
 * The Draft round-trip of the Live Preview.
 *
 * No Draft reaches a frame unresolved: every one goes through
 * `POST /api/catalog/hero-layout/preview` first, which normalises, sanitises
 * and enriches it into Theme Bundle export form, and only a `200` is a preview
 * (hero layout spec §3). Typing is debounced so a keystroke is not a request.
 *
 * Two round-trips can still overlap — a slow one and the one that replaced it
 * — so every request carries a running `draftId` and an answer that is no
 * longer the one asked for last is dropped. Without that a slow early request
 * could paint over a newer preview.
 *
 * The resolver holds the ordering and nothing else. What a `200` and a `400`
 * mean for the frames and for „Speichern“ is the editor's, through the two
 * callbacks. Both are handed the payload the answer is about: the Draft moves
 * on while a request is in flight, and a `400` names fields of the body that
 * was sent, not of the one on screen now.
 */

/** How long a change waits for the next one before it is sent. */
export const HERO_PREVIEW_DEBOUNCE = 300;

/**
 * @param {Object} options - How the resolver talks to its surroundings.
 * @param {Function} options.resolve - Sends the payload; answers as axios does.
 * @param {Function} [options.onResolved] - `(preview, draftId, payload)` after
 *   a 200.
 * @param {Function} [options.onRejected] - `(error, draftId, payload)` after a
 *   failure.
 * @param {number} [options.delay] - The debounce, in ms.
 * @returns {{ send: Function, cancel: Function }} The resolver.
 */
export function createHeroPreviewResolver({
  resolve,
  onResolved,
  onRejected,
  delay = HERO_PREVIEW_DEBOUNCE,
}) {
  let timer = null;
  let draftId = 0;

  function cancel() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  async function run(payload) {
    draftId += 1;
    const id = draftId;

    try {
      const response = await resolve(payload);
      // A newer round-trip has gone out since: its answer is the current one.
      if (id === draftId && onResolved) {
        onResolved((response || {}).data || null, id, payload);
      }
    } catch (error) {
      if (id === draftId && onRejected) {
        onRejected(error, id, payload);
      }
    }
  }

  return {
    /**
     * Queues a Draft. A Draft queued while another one waits replaces it —
     * a snapshot is complete, so only the last one is worth sending.
     *
     * @param {Object} payload - The body of the preview route.
     */
    send(payload) {
      cancel();
      timer = setTimeout(() => {
        timer = null;
        run(payload);
      }, delay);
    },
    /** Drops a queued Draft. An answer already on its way still counts. */
    cancel,
  };
}
