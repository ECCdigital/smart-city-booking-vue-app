import L from "leaflet";

/**
 * The tile layer of the map of a location (#372, tiles). An `<img src>`
 * sends no sign-in, so every tile is loaded through `load` - the
 * `ApiGeoService`, over the API client, with the Bearer header or the cookie
 * of the BFF - and shown as a Blob URL. The URL is revoked, and a request
 * still running aborted, as soon as Leaflet removes the tile.
 *
 * A failed tile stays empty. A `503` fires `unavailable` on the layer.
 *
 * Options besides those of `L.GridLayer`:
 * - `load(coords, signal)` - answers the tile as a `Blob`.
 */
const AuthTileLayer = L.GridLayer.extend({
  initialize(options) {
    L.GridLayer.prototype.initialize.call(this, options);
    this.on("tileunload", ({ tile }) => release(tile));
  },

  createTile(coords, done) {
    const tile = document.createElement("img");
    tile.alt = "";
    tile.setAttribute("role", "presentation");
    const abort = new AbortController();
    tile._authTileAbort = abort;

    this.options
      .load(coords, abort.signal)
      .then((image) => {
        if (abort.signal.aborted) return;
        tile._authTileUrl = URL.createObjectURL(image);
        tile.onload = () => done(null, tile);
        tile.onerror = () => {
          tile.style.visibility = "hidden";
          done(new Error("tile not an image"), tile);
        };
        tile.src = tile._authTileUrl;
      })
      .catch((error) => {
        if (abort.signal.aborted) return;
        if (error?.response?.status === 503) this.fire("unavailable");
        tile.style.visibility = "hidden";
        done(error, tile);
      });

    return tile;
  },
});

function release(tile) {
  tile._authTileAbort?.abort();
  if (tile._authTileUrl) URL.revokeObjectURL(tile._authTileUrl);
  tile._authTileUrl = null;
}

/** A new tile layer, see {@link AuthTileLayer}. */
export const authTileLayer = (options) => new AuthTileLayer(options);
