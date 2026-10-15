<template>
  <div ref="map" class="location-map" />
</template>

<script>
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import ApiGeoService from "@/services/api/ApiGeoService";
import { authTileLayer } from "@/utils/authTileLayer";

// Street level, where a point is checked.
const ZOOM_STREET = 17;
// TopPlusOpen serves up to 18; above that the tiles are scaled up.
const ZOOM_TILES = 18;
const ZOOM_MAX = 19;

const r6 = (x) => Math.round(x * 1e6) / 1e6;
const samePoint = (p, q) => !!p && !!q && p.lat === q.lat && p.lon === q.lon;

function pinSvg(color, opacity) {
  return `<svg class="location-map__pin" width="34" height="48" viewBox="0 0 30 42" style="opacity:${opacity}" aria-hidden="true"><path d="M15 0C6.7 0 0 6.7 0 15c0 11.2 15 27 15 27s15-15.8 15-27C30 6.7 23.3 0 15 0z" fill="${color}"/><circle cx="15" cy="15" r="5.5" fill="#fff"/></svg>`;
}

const pin = (color, opacity = 1) =>
  L.divIcon({
    html: pinSvg(color, opacity),
    className: "location-map__icon",
    iconSize: [34, 48],
    iconAnchor: [17, 48],
  });

/**
 * The small map of the input of a location, on Leaflet (#372, #471). It
 * shows the point as a pin to drag and takes a click as a new point; moving
 * and zooming the map never moves it. Tiles come through the tile proxy of
 * the backend (`authTileLayer`).
 *
 * On a touch screen one finger scrolls the page and two move the map, so
 * the map never moves by mistake; the pin still drags with one finger. The
 * mouse wheel zooms only once the map has the focus.
 *
 * Events: `point-set` (`{ lat, lon }`, a click or the end of a drag),
 * `moved` (`{ lat, lon }`, the middle after every move) and
 * `tiles-unavailable` (once, at the first tile answered with 503).
 */
export default {
  name: "LocationMap",
  props: {
    /** The point, `{ lat, lon }`, or `null`. */
    point: { type: Object, default: null },
    /** A second, pale pin: where the point would go. */
    suggestedPoint: { type: Object, default: null },
    /** Where the map begins without point: `{ lat, lon, zoom }`. */
    view: { type: Object, default: null },
    /** The tenant whose tile proxy is asked. */
    tenantId: { type: String, default: null },
  },
  mounted() {
    const map = L.map(this.$refs.map, {
      maxZoom: ZOOM_MAX,
      dragging: !L.Browser.mobile,
      scrollWheelZoom: false,
    });
    this.map = map;
    map.attributionControl.setPrefix(false);

    authTileLayer({
      load: (coords, signal) =>
        ApiGeoService.tile(this.tenantId, coords, { signal }),
      maxNativeZoom: ZOOM_TILES,
      maxZoom: ZOOM_MAX,
      attribution: this.attribution(),
    })
      .on("unavailable", () => {
        if (this.unavailableReported) return;
        this.unavailableReported = true;
        this.$emit("tiles-unavailable");
      })
      .addTo(map);

    map.on("click", ({ latlng }) => this.report(latlng));
    map.on("moveend", () => {
      const middle = map.getCenter();
      this.$emit("moved", { lat: r6(middle.lat), lon: r6(middle.lng) });
    });
    map.on("focus", () => map.scrollWheelZoom.enable());
    map.on("blur", () => map.scrollWheelZoom.disable());

    if (this.point) {
      map.setView([this.point.lat, this.point.lon], ZOOM_STREET);
    } else if (this.view) {
      this.showView(this.view);
    }
    this.draw();

    if (typeof ResizeObserver !== "undefined") {
      this.observer = new ResizeObserver(() => map.invalidateSize());
      this.observer.observe(this.$refs.map);
    }
  },
  beforeDestroy() {
    this.observer?.disconnect();
    this.map?.remove();
  },
  watch: {
    point(point) {
      // A point from elsewhere (a hit, a suggestion, NUKI) is brought into
      // view; one the map reported itself stays where the hand put it.
      if (point && !samePoint(point, this.reported)) {
        const zoom = this.map.getZoom();
        this.map.setView(
          [point.lat, point.lon],
          Math.max(Number.isFinite(zoom) ? zoom : 0, ZOOM_STREET)
        );
      }
      this.reported = null;
      this.draw();
    },
    suggestedPoint(suggested) {
      this.draw();
      if (suggested && this.point) {
        this.map.fitBounds(
          L.latLngBounds([
            [suggested.lat, suggested.lon],
            [this.point.lat, this.point.lon],
          ]).pad(0.6),
          { maxZoom: ZOOM_TILES }
        );
      }
    },
    view(view) {
      if (view && !this.point) this.showView(view);
    },
  },
  methods: {
    showView({ lat, lon, zoom }) {
      this.map.setView([lat, lon], zoom);
    },
    report(latlng) {
      const point = { lat: r6(latlng.lat), lon: r6(latlng.lng) };
      this.reported = point;
      this.$emit("point-set", point);
    },
    color() {
      return this.$vuetify?.theme?.currentTheme?.primary || "#0099DB";
    },
    draw() {
      const map = this.map;
      if (this.pin) map.removeLayer(this.pin);
      if (this.suggestedPin) map.removeLayer(this.suggestedPin);
      this.pin = null;
      this.suggestedPin = null;

      if (this.point) {
        this.pin = L.marker([this.point.lat, this.point.lon], {
          icon: pin(this.color()),
          draggable: true,
          autoPan: true,
          keyboard: false,
        })
          .on("dragend", ({ target }) => this.report(target.getLatLng()))
          .addTo(map);
      }
      if (this.point && this.suggestedPoint) {
        const target = [this.suggestedPoint.lat, this.suggestedPoint.lon];
        this.suggestedPin = L.layerGroup([
          L.polyline([[this.point.lat, this.point.lon], target], {
            color: this.color(),
            weight: 2,
            dashArray: "4 6",
            interactive: false,
          }),
          L.marker(target, {
            icon: pin(this.color(), 0.45),
            interactive: false,
          }),
        ]).addTo(map);
      }
    },
    /**
     * The source the licence of TopPlusOpen (dl-de/by-2-0) asks for, and
     * OpenStreetMap for the data of the search.
     */
    attribution() {
      const link = (href, text) =>
        `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
      const year = new Date().getFullYear();
      return [
        `${link("https://www.bkg.bund.de", `© BKG (${year})`)}`,
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
.location-map {
  position: absolute;
  inset: 0;
}
.location-map ::v-deep .location-map__icon {
  background: none;
  border: 0;
}
.location-map ::v-deep .location-map__pin {
  filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.35));
}
</style>
