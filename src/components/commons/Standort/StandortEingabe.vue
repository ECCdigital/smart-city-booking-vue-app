<template>
  <div
    class="standort"
    :class="{ 'standort--schmal': schmalAnzeigen }"
    data-test="standort-eingabe"
  >
    <div class="standort__suche">
      <v-text-field
        ref="suche"
        :value="suchText"
        :label="$t('location.search.label')"
        :loading="sucheLaeuft"
        prepend-inner-icon="mdi-magnify"
        autocomplete="off"
        clearable
        outlined
        dense
        hide-details
        role="combobox"
        :aria-expanded="String(listeSichtbar)"
        data-test="standort-suche"
        @input="sucheEingabe"
        @focus="listeOffen = true"
        @blur="listeOffen = false"
        @keydown="sucheTaste"
      />
      <v-card
        v-if="listeSichtbar"
        class="standort__liste"
        elevation="8"
        role="listbox"
      >
        <v-list dense>
          <v-list-item
            v-for="(t, i) in treffer"
            :key="i"
            :input-value="i === aktiv"
            role="option"
            :aria-selected="String(i === aktiv)"
            data-test="standort-treffer"
            @mousedown.prevent
            @click="waehlen(i)"
          >
            <v-list-item-icon class="mr-3">
              <v-icon small>mdi-map-marker-outline</v-icon>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title>
                {{ t.display_address }}
                <v-chip
                  v-if="ausland(t)"
                  x-small
                  label
                  class="ml-1"
                  color="orange lighten-4"
                >
                  {{ landName(t.address.country_code) }}
                </v-chip>
              </v-list-item-title>
            </v-list-item-content>
          </v-list-item>
          <v-divider v-if="treffer.length && ohneTrefferZeigen" />
          <v-list-item
            v-if="ohneTrefferZeigen"
            :input-value="aktiv === treffer.length"
            role="option"
            :aria-selected="String(aktiv === treffer.length)"
            data-test="standort-ohne-treffer"
            @mousedown.prevent
            @click="waehlen(treffer.length)"
          >
            <v-list-item-icon class="mr-3">
              <v-icon small color="primary">mdi-map-marker-plus-outline</v-icon>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title class="primary--text">
                {{
                  $t(
                    treffer.length
                      ? "location.search.notListed"
                      : "location.search.noHit",
                    { text: suchText.trim() }
                  )
                }}
              </v-list-item-title>
              <v-list-item-subtitle>
                {{ $t("location.search.notListedHint") }}
              </v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-list>
      </v-card>
    </div>

    <v-alert
      v-if="sucheAusfall"
      dense
      text
      type="warning"
      class="standort__hinweis"
      data-test="standort-suche-ausfall"
    >
      {{ $t("location.search.unavailable") }}
    </v-alert>

    <v-alert
      v-if="pruefung.punktFehlt && !zustand.punktSetzen"
      dense
      text
      type="warning"
      class="standort__hinweis"
      data-test="standort-punkt-fehlt"
    >
      <strong>{{ $t("location.point.missing") }}</strong>
      <template v-if="zustand.altText">
        {{ $t("location.point.missingText", { text: zustand.altText }) }}
        <v-btn
          x-small
          text
          color="primary"
          data-test="standort-text-suchen"
          @click="textSuchen"
        >
          {{ $t("location.search.searchText") }}
        </v-btn>
      </template>
      <template v-else>{{ $t("location.point.missingAddress") }}</template>
    </v-alert>

    <v-progress-linear
      v-if="zustand.anfrage"
      indeterminate
      height="2"
      class="standort__hinweis"
    />
    <v-alert
      v-if="zustand.vorschlag"
      dense
      text
      color="primary"
      class="standort__hinweis"
      data-test="standort-vorschlag"
    >
      <div class="standort__vorschlag">
        <span class="standort__vorschlag-text">{{ vorschlagText }}</span>
        <v-btn
          x-small
          depressed
          color="primary"
          data-test="standort-vorschlag-uebernehmen"
          @click="dispatch({ typ: 'vorschlagUebernehmen' })"
        >
          {{
            $t(
              zustand.vorschlag.art === "punkt"
                ? "location.suggestion.move"
                : "location.suggestion.adopt"
            )
          }}
        </v-btn>
        <v-btn
          x-small
          text
          data-test="standort-vorschlag-verwerfen"
          @click="dispatch({ typ: 'vorschlagVerwerfen' })"
        >
          {{
            $t(
              zustand.vorschlag.art === "punkt"
                ? "location.suggestion.keepPoint"
                : "location.suggestion.keepAddress"
            )
          }}
        </v-btn>
      </div>
    </v-alert>

    <div class="standort__raster">
      <div class="standort__felder">
        <v-text-field
          v-for="feld in felder"
          :key="feld.name"
          :class="`standort__feld--${feld.name}`"
          :value="zustand.anschrift[feld.name]"
          :label="$t(feld.label)"
          :placeholder="feld.placeholder && $t(feld.placeholder)"
          :persistent-placeholder="!!feld.placeholder"
          outlined
          dense
          hide-details
          :data-test="`standort-${feld.name}`"
          @input="feldAendern(feld.name, $event)"
          @blur="anschriftFertig"
        />
      </div>

      <div class="standort__karte-spalte">
        <div class="standort__karte" :style="{ height: `${kartenHoehe}px` }">
          <StandortKarte
            :punkt="zustand.punkt"
            :vorschlag-punkt="vorschlagPunkt"
            :ansicht="ansicht"
            :tenant-id="mandant"
            @punkt-gesetzt="punktGesetzt($event, 'karte')"
            @ausschnitt="mitte = $event"
            @kacheln-ausfall="karteAusfall = true"
          />
          <div
            v-if="zustand.punktSetzen"
            class="standort__banner"
            data-test="standort-setzen"
          >
            <v-icon small color="white">mdi-gesture-tap</v-icon>
            <span class="standort__banner-text">
              {{ $t("location.map.place", { text: zustand.punktSetzen.text }) }}
            </span>
            <v-btn
              x-small
              text
              color="white"
              data-test="standort-setzen-abbrechen"
              @click="setzenAbbrechen"
            >
              {{ $t("location.map.cancel") }}
            </v-btn>
          </div>
          <div
            v-else-if="karteAusfall"
            class="standort__banner"
            data-test="standort-karte-ausfall"
          >
            <v-icon small color="white">mdi-map-marker-off-outline</v-icon>
            <span class="standort__banner-text">
              {{ $t("location.map.unavailable") }}
            </span>
          </div>
        </div>
        <div class="standort__herkunft" data-test="standort-herkunft">
          <v-icon x-small>mdi-map-marker</v-icon>
          <span>{{ herkunftText }}</span>
          <v-spacer />
          <a
            v-if="!leer"
            class="standort__leeren"
            data-test="standort-leeren"
            @click="leeren"
          >
            {{ $t("location.point.clear") }}
          </a>
        </div>
      </div>
    </div>

    <!-- Registers with a surrounding v-form: a refused save shows the
         reason here. -->
    <v-input
      :value="pruefung.grund"
      :rules="[meldung]"
      hide-details="auto"
      class="standort__meldung"
    />
  </div>
</template>

<script>
import _ from "lodash";
import ApiGeoService from "@/services/api/ApiGeoService";
import StandortKarte from "@/components/commons/Standort/StandortKarte.vue";
import {
  anzeige,
  ausGespeichert,
  pruefen,
  reducer,
  zuGespeichert,
} from "@/utils/standortLogik";

// The search waits this long after the last keystroke, and asks from this
// many characters on (#372, user story 2).
const SUCHE_PAUSE_MS = 300;
const SUCHE_MIN_ZEICHEN = 3;
const SUCHE_MAX_TREFFER = 5;
// After this pause in a field of the Anschrift, the Anschrift counts as typed.
const ANSCHRIFT_PAUSE_MS = 1200;
// Below this width the fields and the map stand one under the other.
const SCHMAL_UNTER_PX = 600;
// Only if `geo/start` cannot be read: the map needs a view to be usable.
const DEUTSCHLAND = Object.freeze({ lat: 51.2, lon: 9.4, zoom: 5 });

const FELDER = Object.freeze([
  { name: "strasse", label: "location.fields.street" },
  { name: "hausnummer", label: "location.fields.houseNumber" },
  { name: "plz", label: "location.fields.postcode" },
  { name: "ort", label: "location.fields.city" },
  {
    name: "zusatz",
    label: "location.fields.additional",
    placeholder: "location.fields.additionalPlaceholder",
  },
]);
const LAND = Object.freeze({ name: "land", label: "location.fields.country" });

const istAusfall = (error) => error?.response?.status === 503;

/**
 * The input of a Standort (map ECCdigital/tickets#372, #471): the search on
 * top, the fields of the Anschrift and the Zusatz beneath, the map beside
 * them - one under the other where it is narrow. Anschrift and Punkt never
 * change each other silently; the rules are the Standort-Logik's
 * (`src/utils/standortLogik.js`), this component draws its Zustand, sends
 * its actions and runs the Anfragen it asks for.
 *
 * `v-model` is the Standort in the stored form. An untouched Standort goes
 * out as the stored one, word for word: only so does the backend let an old
 * one without Punkt pass. `pruefung` reports whether it may be saved and why
 * not (`{ speicherbar, grund, punktFehlt }`); a surrounding `v-form` shows
 * the reason here once it validates.
 *
 * `setzePunkt(punkt, herkunft)` sets the Punkt from outside, e.g. NUKI's
 * „Vorbelegen“ with `herkunft` `"nuki"`: the reverse search then suggests
 * an Anschrift. See notes of #471 for the interface.
 */
export default {
  name: "StandortEingabe",
  components: { StandortKarte },
  props: {
    /** The Standort in the stored form: an object, a text, `null`. */
    value: { type: [Object, String], default: null },
    /**
     * The Standort as stored, against which „unchanged“ is measured; by
     * default the `value` the input opened with. `null`: nothing stored yet.
     */
    gespeichert: { type: [Object, String], default: undefined },
    /** The tenant whose geo routes are asked; by default the current one. */
    tenantId: { type: String, default: null },
    /** Fields and map one under the other, whatever the width. */
    schmal: { type: Boolean, default: false },
  },
  data() {
    const geoeffnet = this.value;
    return {
      geoeffnet,
      zustand: ausGespeichert(
        this.value,
        this.gespeichert === undefined ? geoeffnet : this.gespeichert
      ),
      // The Standort last handed out or in; another one from outside is
      // read anew.
      ausgegeben: this.value,
      suchText: "",
      treffer: [],
      sucheLaeuft: false,
      sucheFertig: false,
      sucheNr: 0,
      listeOffen: false,
      aktiv: 0,
      sucheAusfall: false,
      karteAusfall: false,
      laufendeAnfrage: null,
      mitte: null,
      ansicht: null,
      breite: Infinity,
    };
  },
  computed: {
    basis() {
      return this.gespeichert === undefined ? this.geoeffnet : this.gespeichert;
    },
    mandant() {
      return (
        this.tenantId ||
        this.$store?.getters?.["tenants/currentTenantId"] ||
        null
      );
    },
    sprache() {
      return this.$i18n?.locale || "de";
    },
    fokus() {
      return this.mitte ? { lat: this.mitte.lat, lon: this.mitte.lon } : {};
    },
    felder() {
      const land = this.zustand.anschrift.land;
      return land && land.toUpperCase() !== "DE"
        ? [...FELDER.slice(0, 4), LAND, FELDER[4]]
        : FELDER;
    },
    pruefung() {
      return pruefen(this.zustand);
    },
    ohneTrefferZeigen() {
      return (
        this.sucheFertig && this.suchText.trim().length >= SUCHE_MIN_ZEICHEN
      );
    },
    eintraege() {
      return this.treffer.length + (this.ohneTrefferZeigen ? 1 : 0);
    },
    listeSichtbar() {
      return this.listeOffen && this.eintraege > 0;
    },
    vorschlagPunkt() {
      const v = this.zustand.vorschlag;
      return v && v.art === "punkt" ? v.punkt : null;
    },
    vorschlagText() {
      const v = this.zustand.vorschlag;
      if (!v) return "";
      if (v.art === "punkt") {
        return this.$t("location.suggestion.point", { distance: v.abstand });
      }
      return this.$t("location.suggestion.address", {
        address: anzeige(v.anschrift) || v.anschrift.ort,
      });
    },
    herkunftText() {
      const herkunft = this.zustand.punkt && this.zustand.herkunftPunkt;
      return this.$t(
        herkunft ? `location.point.${herkunft}` : "location.point.none"
      );
    },
    leer() {
      const { anschrift, punkt, altText } = this.zustand;
      return !punkt && !anzeige(anschrift) && !anschrift.zusatz && !altText;
    },
    schmalAnzeigen() {
      return (
        this.schmal ||
        this.$vuetify.breakpoint.xsOnly ||
        this.breite < SCHMAL_UNTER_PX
      );
    },
    kartenHoehe() {
      return this.schmalAnzeigen ? 220 : 260;
    },
  },
  watch: {
    value(wert) {
      if (wert === this.ausgegeben || _.isEqual(wert, this.ausgegeben)) {
        this.ausgegeben = wert;
        return;
      }
      this.neuLesen(wert);
    },
    basis() {
      this.neuLesen(this.value);
    },
    pruefung: {
      immediate: true,
      handler(pruefung, vorher) {
        if (!_.isEqual(pruefung, vorher)) this.$emit("pruefung", pruefung);
      },
    },
  },
  created() {
    this.suchText = this.zustand.altText;
    if (!this.zustand.punkt) this.startHolen();
  },
  mounted() {
    if (typeof ResizeObserver === "undefined") return;
    this.beobachter = new ResizeObserver(([eintrag]) => {
      this.breite = eintrag.contentRect.width;
    });
    this.beobachter.observe(this.$el);
  },
  beforeDestroy() {
    clearTimeout(this.sucheTimer);
    clearTimeout(this.anschriftTimer);
    this.beobachter?.disconnect();
  },
  methods: {
    /**
     * Sets the Punkt from outside, as a click on the map does: the reverse
     * search then suggests an Anschrift.
     *
     * @param {{ lat: number, lon: number }} punkt
     * @param {"nuki"|"karte"} [herkunft] - Where it comes from; NUKI by default.
     */
    setzePunkt(punkt, herkunft = "nuki") {
      this.punktGesetzt(punkt, herkunft);
    },
    punktGesetzt(punkt, herkunft) {
      this.dispatch({ typ: "punktGesetzt", punkt, herkunft });
    },
    dispatch(aktion) {
      this.zustand = reducer(this.zustand, aktion);
      this.ausgeben();
      this.anfrageAusfuehren();
    },
    ausgeben() {
      const wert = zuGespeichert(this.zustand);
      if (wert === this.ausgegeben || _.isEqual(wert, this.ausgegeben)) return;
      this.ausgegeben = wert;
      this.$emit("input", wert);
    },
    neuLesen(wert) {
      this.zustand = ausGespeichert(wert, this.basis);
      this.ausgegeben = wert;
    },
    /**
     * Runs the Anfrage the Zustand asks for and sends the answer back. An
     * Anfrage is told apart by itself, not its id: the ids start over when
     * the Standort is read anew. An answer no longer asked for is dropped.
     */
    async anfrageAusfuehren() {
      const anfrage = this.zustand.anfrage;
      if (!anfrage || anfrage === this.laufendeAnfrage) return;
      this.laufendeAnfrage = anfrage;
      const ergebnis =
        anfrage.art === "rueckwaerts"
          ? await this.rueckwaertsSuchen(anfrage)
          : await this.anschriftSuchen(anfrage);
      if (this.zustand.anfrage === anfrage) this.dispatch(ergebnis);
    },
    async rueckwaertsSuchen({ id, punkt }) {
      const treffer = await this.geo(() =>
        ApiGeoService.reverse(this.mandant, { ...punkt, lang: this.sprache })
      );
      return { typ: "rueckwaertsErgebnis", id, treffer };
    },
    async anschriftSuchen({ id, anschrift }) {
      const treffer = await this.geo(() =>
        ApiGeoService.search(this.mandant, {
          q: anzeige(anschrift),
          ...this.fokus,
          lang: this.sprache,
        })
      );
      return {
        typ: "sucheErgebnis",
        id,
        treffer: (treffer && treffer[0]) || null,
      };
    },
    /** A call of search or reverse search; a failure answers `null`. */
    async geo(aufruf) {
      try {
        const antwort = await aufruf();
        this.sucheAusfall = false;
        return antwort;
      } catch (error) {
        if (istAusfall(error)) this.sucheAusfall = true;
        else console.error(error);
        return null;
      }
    },
    async startHolen() {
      try {
        this.ansicht = await ApiGeoService.start(this.mandant);
      } catch (error) {
        console.error(error);
        this.ansicht = DEUTSCHLAND;
      }
    },

    sucheEingabe(text) {
      this.suchText = text || "";
      this.listeOffen = true;
      this.aktiv = 0;
      clearTimeout(this.sucheTimer);
      this.sucheFertig = false;
      const q = this.suchText.trim();
      if (q.length < SUCHE_MIN_ZEICHEN) {
        this.sucheNr += 1;
        this.treffer = [];
        this.sucheLaeuft = false;
        return;
      }
      this.sucheTimer = setTimeout(() => this.suchen(q), SUCHE_PAUSE_MS);
    },
    async suchen(q) {
      this.sucheNr += 1;
      const nr = this.sucheNr;
      this.sucheLaeuft = true;
      const treffer = await this.geo(() =>
        ApiGeoService.search(this.mandant, {
          q,
          ...this.fokus,
          lang: this.sprache,
        })
      );
      if (nr !== this.sucheNr) return;
      this.treffer = (treffer || []).slice(0, SUCHE_MAX_TREFFER);
      this.sucheLaeuft = false;
      this.sucheFertig = true;
    },
    sucheTaste(event) {
      const tasten = {
        ArrowDown: () => this.blaettern(1),
        ArrowUp: () => this.blaettern(-1),
        Enter: () => this.listeSichtbar && this.waehlen(this.aktiv),
        Escape: () => {
          this.listeOffen = false;
        },
      };
      const taste = tasten[event.key];
      if (!taste) return;
      // Escape closes the list, not a dialog the input stands in.
      if (event.key === "Escape" && this.listeSichtbar) event.stopPropagation();
      event.preventDefault();
      taste();
    },
    blaettern(schritt) {
      if (!this.listeOffen) {
        this.listeOffen = true;
        return;
      }
      if (!this.eintraege) return;
      this.aktiv = (this.aktiv + schritt + this.eintraege) % this.eintraege;
    },
    waehlen(index) {
      if (index < this.treffer.length) {
        this.dispatch({ typ: "trefferGewaehlt", treffer: this.treffer[index] });
      } else if (this.ohneTrefferZeigen) {
        this.dispatch({ typ: "ohneTreffer", text: this.suchText.trim() });
      } else {
        return;
      }
      this.sucheLeeren();
    },
    sucheLeeren() {
      clearTimeout(this.sucheTimer);
      this.sucheNr += 1;
      this.suchText = "";
      this.treffer = [];
      this.sucheLaeuft = false;
      this.sucheFertig = false;
      this.listeOffen = false;
      this.aktiv = 0;
    },
    /** „Text suchen“: the old text of a Standort without Punkt, at once. */
    textSuchen() {
      this.suchText = this.zustand.altText;
      this.listeOffen = true;
      this.aktiv = 0;
      this.suchen(this.suchText.trim());
    },
    /** Back to the search, with the text that found nothing. */
    setzenAbbrechen() {
      const text = this.zustand.punktSetzen?.text || "";
      this.dispatch({ typ: "punktSetzenAbbrechen" });
      this.suchText = text;
      this.listeOffen = true;
      this.$refs.suche?.focus();
      if (text.trim().length >= SUCHE_MIN_ZEICHEN) this.suchen(text.trim());
    },
    leeren() {
      this.dispatch({ typ: "leeren" });
      this.sucheLeeren();
    },

    feldAendern(feld, wert) {
      this.dispatch({ typ: "feldGeaendert", feld, wert: wert || "" });
      if (feld === "zusatz") return;
      clearTimeout(this.anschriftTimer);
      this.anschriftTimer = setTimeout(
        () => this.anschriftFertig(),
        ANSCHRIFT_PAUSE_MS
      );
    },
    anschriftFertig() {
      clearTimeout(this.anschriftTimer);
      this.dispatch({ typ: "anschriftFertig" });
    },

    ausland(t) {
      const land = t.address?.country_code;
      return !!land && land.toUpperCase() !== "DE";
    },
    landName(code) {
      try {
        return (
          new Intl.DisplayNames([this.sprache], { type: "region" }).of(
            code.toUpperCase()
          ) || code
        );
      } catch (error) {
        return code;
      }
    },
    meldung() {
      const grund = this.pruefung.grund;
      return !grund || this.$t(`location.reason.${grund}`);
    },
  },
};
</script>

<style scoped>
.standort__suche {
  position: relative;
}
.standort__liste {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 2px);
  z-index: 1200;
  max-height: 320px;
  overflow-y: auto;
}
.standort__hinweis {
  margin: var(--scb-space-2) 0 0;
}
.standort__vorschlag {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--scb-space-2);
}
.standort__vorschlag-text {
  flex: 1 1 180px;
  min-width: 0;
}
.standort__raster {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--scb-space-4);
  align-items: start;
  margin-top: var(--scb-space-3);
}
.standort--schmal .standort__raster {
  grid-template-columns: minmax(0, 1fr);
}
.standort__felder {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: var(--scb-space-2);
}
.standort__felder > * {
  grid-column: span 6;
}
.standort__felder > .standort__feld--strasse,
.standort__felder > .standort__feld--ort {
  grid-column: span 4;
}
.standort__felder > .standort__feld--hausnummer,
.standort__felder > .standort__feld--plz {
  grid-column: span 2;
}
.standort__karte {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--scb-border, rgba(0, 0, 0, 0.12));
  border-radius: 4px;
  background: #e8eef2;
}
.standort__banner {
  position: absolute;
  top: var(--scb-space-2);
  left: var(--scb-space-2);
  right: var(--scb-space-2);
  z-index: 1100;
  display: flex;
  align-items: center;
  gap: var(--scb-space-2);
  padding: var(--scb-space-1) var(--scb-space-2);
  border-radius: 4px;
  background: rgba(31, 35, 40, 0.88);
  color: #fff;
  font-size: var(--scb-font-size-sm);
}
.standort__banner-text {
  flex: 1;
  min-width: 0;
}
.standort__herkunft {
  display: flex;
  align-items: center;
  gap: var(--scb-space-1);
  margin-top: var(--scb-space-1);
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}
.standort__herkunft .v-icon {
  color: inherit;
}
.standort__meldung {
  margin-top: var(--scb-space-1);
}
</style>
