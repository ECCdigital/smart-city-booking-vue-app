<template>
  <div ref="karte" class="standort-karte" />
</template>

<script>
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import ApiGeoService from "@/services/api/ApiGeoService";
import { kachelEbene } from "@/components/commons/Standort/kachelEbene";

// Street level, where a Punkt is checked.
const ZOOM_STRASSE = 17;
// TopPlusOpen serves up to 18; above that the tiles are scaled up.
const ZOOM_KACHELN = 18;
const ZOOM_MAX = 19;

const r6 = (x) => Math.round(x * 1e6) / 1e6;
const gleich = (p, q) => !!p && !!q && p.lat === q.lat && p.lon === q.lon;

function pinSvg(farbe, deckkraft) {
  return `<svg class="standort-karte__pin" width="34" height="48" viewBox="0 0 30 42" style="opacity:${deckkraft}" aria-hidden="true"><path d="M15 0C6.7 0 0 6.7 0 15c0 11.2 15 27 15 27s15-15.8 15-27C30 6.7 23.3 0 15 0z" fill="${farbe}"/><circle cx="15" cy="15" r="5.5" fill="#fff"/></svg>`;
}

const pin = (farbe, deckkraft = 1) =>
  L.divIcon({
    html: pinSvg(farbe, deckkraft),
    className: "standort-karte__icon",
    iconSize: [34, 48],
    iconAnchor: [17, 48],
  });

/**
 * The small map of the input of a Standort, on Leaflet (#372, #471). It
 * shows the Punkt as a pin to drag and takes a click as a new Punkt; moving
 * and zooming the map never moves it. Tiles come through the tile proxy of
 * the backend (`kachelEbene`).
 *
 * On a touch screen one finger scrolls the page and two move the map, so
 * the map never moves by mistake; the pin still drags with one finger. The
 * mouse wheel zooms only once the map has the focus.
 *
 * Events: `punkt-gesetzt` (`{ lat, lon }`, a click or the end of a drag),
 * `ausschnitt` (`{ lat, lon }`, the middle after every move) and
 * `kacheln-ausfall` (once, at the first tile answered with 503).
 */
export default {
  name: "StandortKarte",
  props: {
    /** The Punkt, `{ lat, lon }`, or `null`. */
    punkt: { type: Object, default: null },
    /** A second, pale pin: where the Punkt would go. */
    vorschlagPunkt: { type: Object, default: null },
    /** Where the map begins without Punkt: `{ lat, lon, zoom }`. */
    ansicht: { type: Object, default: null },
    /** The tenant whose tile proxy is asked. */
    tenantId: { type: String, default: null },
  },
  mounted() {
    const karte = L.map(this.$refs.karte, {
      maxZoom: ZOOM_MAX,
      dragging: !L.Browser.mobile,
      scrollWheelZoom: false,
    });
    this.karte = karte;
    karte.attributionControl.setPrefix(false);

    kachelEbene({
      laden: (coords, signal) =>
        ApiGeoService.tile(this.tenantId, coords, { signal }),
      maxNativeZoom: ZOOM_KACHELN,
      maxZoom: ZOOM_MAX,
      attribution: this.quellenangabe(),
    })
      .on("ausfall", () => {
        if (this.ausfallGemeldet) return;
        this.ausfallGemeldet = true;
        this.$emit("kacheln-ausfall");
      })
      .addTo(karte);

    karte.on("click", ({ latlng }) => this.melden(latlng));
    karte.on("moveend", () => {
      const mitte = karte.getCenter();
      this.$emit("ausschnitt", { lat: r6(mitte.lat), lon: r6(mitte.lng) });
    });
    karte.on("focus", () => karte.scrollWheelZoom.enable());
    karte.on("blur", () => karte.scrollWheelZoom.disable());

    if (this.punkt) {
      karte.setView([this.punkt.lat, this.punkt.lon], ZOOM_STRASSE);
    } else if (this.ansicht) {
      this.ansichtZeigen(this.ansicht);
    }
    this.zeichnen();

    if (typeof ResizeObserver !== "undefined") {
      this.beobachter = new ResizeObserver(() => karte.invalidateSize());
      this.beobachter.observe(this.$refs.karte);
    }
  },
  beforeDestroy() {
    this.beobachter?.disconnect();
    this.karte?.remove();
  },
  watch: {
    punkt(punkt) {
      // A Punkt from elsewhere (a hit, a Vorschlag, NUKI) is brought into
      // view; one the map reported itself stays where the hand put it.
      if (punkt && !gleich(punkt, this.gemeldet)) {
        const zoom = this.karte.getZoom();
        this.karte.setView(
          [punkt.lat, punkt.lon],
          Math.max(Number.isFinite(zoom) ? zoom : 0, ZOOM_STRASSE)
        );
      }
      this.gemeldet = null;
      this.zeichnen();
    },
    vorschlagPunkt(vorschlag) {
      this.zeichnen();
      if (vorschlag && this.punkt) {
        this.karte.fitBounds(
          L.latLngBounds([
            [vorschlag.lat, vorschlag.lon],
            [this.punkt.lat, this.punkt.lon],
          ]).pad(0.6),
          { maxZoom: ZOOM_KACHELN }
        );
      }
    },
    ansicht(ansicht) {
      if (ansicht && !this.punkt) this.ansichtZeigen(ansicht);
    },
  },
  methods: {
    ansichtZeigen({ lat, lon, zoom }) {
      this.karte.setView([lat, lon], zoom);
    },
    melden(latlng) {
      const punkt = { lat: r6(latlng.lat), lon: r6(latlng.lng) };
      this.gemeldet = punkt;
      this.$emit("punkt-gesetzt", punkt);
    },
    farbe() {
      return this.$vuetify?.theme?.currentTheme?.primary || "#0099DB";
    },
    zeichnen() {
      const karte = this.karte;
      if (this.pin) karte.removeLayer(this.pin);
      if (this.zweiterPin) karte.removeLayer(this.zweiterPin);
      this.pin = null;
      this.zweiterPin = null;

      if (this.punkt) {
        this.pin = L.marker([this.punkt.lat, this.punkt.lon], {
          icon: pin(this.farbe()),
          draggable: true,
          autoPan: true,
          keyboard: false,
        })
          .on("dragend", ({ target }) => this.melden(target.getLatLng()))
          .addTo(karte);
      }
      if (this.punkt && this.vorschlagPunkt) {
        const ziel = [this.vorschlagPunkt.lat, this.vorschlagPunkt.lon];
        this.zweiterPin = L.layerGroup([
          L.polyline([[this.punkt.lat, this.punkt.lon], ziel], {
            color: this.farbe(),
            weight: 2,
            dashArray: "4 6",
            interactive: false,
          }),
          L.marker(ziel, { icon: pin(this.farbe(), 0.45), interactive: false }),
        ]).addTo(karte);
      }
    },
    /**
     * The source the licence of TopPlusOpen (dl-de/by-2-0) asks for, and
     * OpenStreetMap for the data of the search.
     */
    quellenangabe() {
      const link = (href, text) =>
        `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
      const jahr = new Date().getFullYear();
      return [
        `${link("https://www.bkg.bund.de", `© BKG (${jahr})`)}`,
        link("https://www.govdata.de/dl-de/by-2-0", "dl-de/by-2-0"),
        link(
          "https://sg.geodatenzentrum.de/web_public/Datenquellen_TopPlus_Open.pdf",
          this.$t("location.map.sources")
        ),
        `${this.$t("location.map.search")}: ${link(
          "https://www.openstreetmap.org/copyright",
          "© OpenStreetMap"
        )}`,
      ].join(", ");
    },
  },
};
</script>

<style scoped>
.standort-karte {
  position: absolute;
  inset: 0;
}
.standort-karte ::v-deep .standort-karte__icon {
  background: none;
  border: 0;
}
.standort-karte ::v-deep .standort-karte__pin {
  filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.35));
}
</style>
