import L from "leaflet";

/**
 * The tile layer of the map of a Standort (#372, „Kacheln“). An `<img src>`
 * sends no sign-in, so every tile is loaded through `laden` - the
 * `ApiGeoService`, over the API client, with the Bearer header or the cookie
 * of the BFF - and shown as a Blob URL. The URL is revoked, and a request
 * still running aborted, as soon as Leaflet removes the tile.
 *
 * A failed tile stays empty. A `503` fires `ausfall` on the layer.
 *
 * Options besides those of `L.GridLayer`:
 * - `laden(coords, signal)` - answers the tile as a `Blob`.
 */
const KachelEbene = L.GridLayer.extend({
  initialize(options) {
    L.GridLayer.prototype.initialize.call(this, options);
    this.on("tileunload", ({ tile }) => freigeben(tile));
  },

  createTile(coords, done) {
    const kachel = document.createElement("img");
    kachel.alt = "";
    kachel.setAttribute("role", "presentation");
    const abbruch = new AbortController();
    kachel._standortAbbruch = abbruch;

    this.options
      .laden(coords, abbruch.signal)
      .then((bild) => {
        if (abbruch.signal.aborted) return;
        kachel._standortUrl = URL.createObjectURL(bild);
        kachel.onload = () => done(null, kachel);
        kachel.onerror = () => {
          kachel.style.visibility = "hidden";
          done(new Error("tile not an image"), kachel);
        };
        kachel.src = kachel._standortUrl;
      })
      .catch((fehler) => {
        if (abbruch.signal.aborted) return;
        if (fehler?.response?.status === 503) this.fire("ausfall");
        kachel.style.visibility = "hidden";
        done(fehler, kachel);
      });

    return kachel;
  },
});

function freigeben(kachel) {
  kachel._standortAbbruch?.abort();
  if (kachel._standortUrl) URL.revokeObjectURL(kachel._standortUrl);
  kachel._standortUrl = null;
}

/** A new tile layer, see {@link KachelEbene}. */
export const kachelEbene = (options) => new KachelEbene(options);
