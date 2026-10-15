import ApiClient from "./ApiClientService";

const base = (tenantId) => `api/v2/${encodeURIComponent(tenantId)}/geo`;

/**
 * The geo routes of the backend for the location input (map
 * ECCdigital/tickets#372): search, reverse search, start view and the tile
 * proxy. They go through the API client, so they carry the sign-in in the
 * direct as in the BFF mode; a tile cannot be an `<img src>` for that reason.
 *
 * A hit has the stored form of a location: `address` (`street`,
 * `house_number`, `postcode`, `city`, `country_code`), `coordinates.points`
 * as `[lon, lat]` and `display_address`. Failures reach the caller; a
 * `503` (`geo_search_unavailable`, `geo_tiles_unavailable`) means the
 * provider is out of reach or a limit is hit.
 */
export default {
  /**
   * At most 5 hits for `q` (3 characters or more), near the focus first.
   *
   * @param {string} tenantId
   * @param {{ q: string, lat?: number, lon?: number, lang?: string }} query
   *   `lat`/`lon` are the focus, the middle of the map.
   * @returns {Promise<Object[]>} The hits.
   */
  async search(tenantId, { q, lat, lon, lang }) {
    const params = { q };
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      Object.assign(params, { lat, lon });
    }
    if (lang) params.lang = lang;
    const response = await ApiClient.get(`${base(tenantId)}/search`, {
      params,
    });
    return response.data?.data || [];
  },

  /**
   * The address at a point.
   *
   * @param {string} tenantId
   * @param {{ lat: number, lon: number, lang?: string }} query
   * @returns {Promise<?Object>} One hit, or `null`.
   */
  async reverse(tenantId, { lat, lon, lang }) {
    const params = { lat, lon };
    if (lang) params.lang = lang;
    const response = await ApiClient.get(`${base(tenantId)}/reverse`, {
      params,
    });
    return response.data?.data || null;
  },

  /**
   * Where the map of a location without point begins: the middle of the
   * tenant's points, or all of Germany.
   *
   * @param {string} tenantId
   * @returns {Promise<{ lat: number, lon: number, zoom: number }>}
   */
  async start(tenantId) {
    const response = await ApiClient.get(`${base(tenantId)}/start`);
    return response.data?.data;
  },

  /**
   * One tile of the map as an image.
   *
   * @param {string} tenantId
   * @param {{ z: number, x: number, y: number }} coords
   * @param {{ signal?: AbortSignal }} [options] - Aborts a tile no longer shown.
   * @returns {Promise<Blob>} The image.
   */
  async tile(tenantId, { z, x, y }, { signal } = {}) {
    const response = await ApiClient.get(
      `${base(tenantId)}/tiles/${z}/${x}/${y}`,
      { responseType: "blob", signal }
    );
    return response.data;
  },
};
