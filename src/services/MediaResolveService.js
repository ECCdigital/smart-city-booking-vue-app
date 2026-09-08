import store from "@/store";
import ApiMediaService, { MEDIA_SCOPE } from "@/services/api/ApiMediaService";

/**
 * Resolves media ids to their metadata. Every reference site an editor renders
 * needs the medium behind it (kind, visibility, title) before it can show a
 * preview, and the same medium turns up in many sites at once — an image list,
 * a card grid, the picker. The in-flight promise is shared and the result is
 * cached per scope and tenant, so one medium is fetched once, not once per
 * component.
 *
 * The cache holds metadata only; the bytes come from the binary route and are
 * cached by the browser under the headers of §4.6.
 */

const cache = new Map();

function cacheKey(scope, mediaId) {
  const tenantId =
    scope === MEDIA_SCOPE.INSTANCE
      ? MEDIA_SCOPE.INSTANCE
      : store.getters["tenants/currentTenantId"];

  return `${tenantId}:${mediaId}`;
}

export default {
  /**
   * The metadata of a medium, from the cache when it is known.
   *
   * @param {string} scope - One of {@link MEDIA_SCOPE}.
   * @param {string} mediaId - Id of the medium.
   * @returns {Promise<Object|null>} The medium, or null when it is gone or
   *   unreadable for this user — a reference may outlive its medium.
   */
  resolve(scope, mediaId) {
    if (!mediaId) {
      return Promise.resolve(null);
    }

    const key = cacheKey(scope, mediaId);
    if (cache.has(key)) {
      return cache.get(key);
    }

    const pending = ApiMediaService.getMedia(scope, mediaId)
      .then((response) => response.data)
      .catch(() => null);

    cache.set(key, pending);
    return pending;
  },

  /**
   * Puts a medium the caller already holds into the cache — an upload result
   * or a picker selection, so the preview it triggers needs no round trip.
   *
   * @param {string} scope - One of {@link MEDIA_SCOPE}.
   * @param {Object} media - The medium.
   */
  prime(scope, media) {
    if (media?.id) {
      cache.set(cacheKey(scope, media.id), Promise.resolve(media));
    }
  },

  /**
   * Drops a medium from the cache, for when its metadata changed elsewhere.
   *
   * @param {string} scope - One of {@link MEDIA_SCOPE}.
   * @param {string} mediaId - Id of the medium.
   */
  invalidate(scope, mediaId) {
    cache.delete(cacheKey(scope, mediaId));
  },
};
