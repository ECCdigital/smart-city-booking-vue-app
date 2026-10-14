<template>
  <div
    class="location-input"
    :class="{ 'location-input--narrow': isNarrow }"
    data-test="location-input"
  >
    <div class="location-input__search">
      <v-text-field
        ref="search"
        :value="searchText"
        :label="$t('location.search.label')"
        :loading="searching"
        prepend-inner-icon="mdi-magnify"
        autocomplete="off"
        clearable
        outlined
        dense
        hide-details
        role="combobox"
        :aria-expanded="String(listShown)"
        data-test="location-search"
        @input="onSearchInput"
        @focus="listOpen = true"
        @blur="listOpen = false"
        @keydown="onSearchKey"
      />
      <v-card
        v-if="listShown"
        class="location-input__list"
        elevation="8"
        role="listbox"
      >
        <v-list dense>
          <v-list-item
            v-for="(hit, i) in hits"
            :key="i"
            :input-value="i === active"
            role="option"
            :aria-selected="String(i === active)"
            data-test="location-hit"
            @mousedown.prevent
            @click="choose(i)"
          >
            <v-list-item-icon class="mr-3">
              <v-icon small>mdi-map-marker-outline</v-icon>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title>
                {{ hit.display_address }}
                <v-chip
                  v-if="isAbroad(hit)"
                  x-small
                  label
                  class="ml-1"
                  color="orange lighten-4"
                >
                  {{ countryName(hit.address.country_code) }}
                </v-chip>
              </v-list-item-title>
            </v-list-item-content>
          </v-list-item>
          <v-divider v-if="hits.length && withoutHitShown" />
          <v-list-item
            v-if="withoutHitShown"
            :input-value="active === hits.length"
            role="option"
            :aria-selected="String(active === hits.length)"
            data-test="location-without-hit"
            @mousedown.prevent
            @click="choose(hits.length)"
          >
            <v-list-item-icon class="mr-3">
              <v-icon small color="primary">mdi-map-marker-plus-outline</v-icon>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title class="primary--text">
                {{
                  $t(
                    hits.length
                      ? "location.search.notListed"
                      : "location.search.noHit",
                    { text: searchText.trim() }
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
      v-if="searchUnavailable"
      dense
      text
      type="warning"
      class="location-input__notice"
      data-test="location-search-unavailable"
    >
      {{ $t("location.search.unavailable") }}
    </v-alert>

    <v-alert
      v-if="checkResult.pointMissing && !state.placing"
      dense
      text
      type="warning"
      class="location-input__notice"
      data-test="location-point-missing"
    >
      <strong>{{ $t("location.point.missing") }}</strong>
      <template v-if="state.oldText">
        {{ $t("location.point.missingText", { text: state.oldText }) }}
        <v-btn
          x-small
          text
          color="primary"
          data-test="location-search-text"
          @click="searchOldText"
        >
          {{ $t("location.search.searchText") }}
        </v-btn>
      </template>
      <template v-else>{{ $t("location.point.missingAddress") }}</template>
    </v-alert>

    <v-progress-linear
      v-if="state.request"
      indeterminate
      height="2"
      class="location-input__notice"
    />
    <v-alert
      v-if="state.suggestion"
      dense
      text
      color="primary"
      class="location-input__notice"
      data-test="location-suggestion"
    >
      <div class="location-input__suggestion">
        <span class="location-input__suggestion-text">{{
          suggestionText
        }}</span>
        <v-btn
          x-small
          depressed
          color="primary"
          data-test="location-suggestion-accept"
          @click="dispatch({ type: 'suggestionAccepted' })"
        >
          {{
            $t(
              state.suggestion.kind === "point"
                ? "location.suggestion.move"
                : "location.suggestion.adopt"
            )
          }}
        </v-btn>
        <v-btn
          x-small
          text
          data-test="location-suggestion-dismiss"
          @click="dispatch({ type: 'suggestionDismissed' })"
        >
          {{
            $t(
              state.suggestion.kind === "point"
                ? "location.suggestion.keepPoint"
                : "location.suggestion.keepAddress"
            )
          }}
        </v-btn>
      </div>
    </v-alert>

    <div class="location-input__grid">
      <div class="location-input__fields">
        <v-text-field
          v-for="field in fields"
          :key="field.name"
          :class="`location-input__field--${field.name}`"
          :value="state.address[field.name]"
          :label="$t(field.label)"
          :placeholder="field.placeholder && $t(field.placeholder)"
          :persistent-placeholder="!!field.placeholder"
          outlined
          dense
          hide-details
          :data-test="`location-${field.name}`"
          @input="onFieldInput(field.name, $event)"
          @blur="addressDone"
        />
      </div>

      <div class="location-input__map-column">
        <div class="location-input__map" :style="{ height: `${mapHeight}px` }">
          <LocationMap
            :point="state.point"
            :suggested-point="suggestedPoint"
            :view="view"
            :tenant-id="tenant"
            @point-set="onPointSet($event, 'map')"
            @moved="middle = $event"
            @tiles-unavailable="mapUnavailable = true"
          />
          <div
            v-if="state.placing"
            class="location-input__banner"
            data-test="location-placing"
          >
            <v-icon small>mdi-gesture-tap</v-icon>
            <span class="location-input__banner-text">
              {{ $t("location.map.place", { text: state.placing.text }) }}
            </span>
            <v-btn
              x-small
              text
              data-test="location-placing-cancel"
              @click="cancelPlacing"
            >
              {{ $t("location.map.cancel") }}
            </v-btn>
          </div>
          <div
            v-else-if="mapUnavailable"
            class="location-input__banner"
            data-test="location-map-unavailable"
          >
            <v-icon small>mdi-map-marker-off-outline</v-icon>
            <span class="location-input__banner-text">
              {{ $t("location.map.unavailable") }}
            </span>
          </div>
        </div>
        <div class="location-input__origin" data-test="location-origin">
          <v-icon x-small>mdi-map-marker</v-icon>
          <span>{{ originText }}</span>
          <v-spacer />
          <a
            v-if="!isEmpty"
            class="location-input__clear"
            data-test="location-clear"
            @click="clear"
          >
            {{ $t("location.point.clear") }}
          </a>
        </div>
      </div>
    </div>

    <!-- Registers with a surrounding v-form: a refused save shows the
         reason here. -->
    <v-input
      :value="checkResult.reason"
      :rules="[message]"
      hide-details="auto"
      class="location-input__message"
    />
  </div>
</template>

<script>
import _ from "lodash";
import ApiGeoService from "@/services/api/ApiGeoService";
import LocationMap from "@/components/commons/Location/LocationMap.vue";
import {
  check,
  displayAddress,
  fromStored,
  reducer,
  refusalOf,
  toStored,
} from "@/utils/locationLogic";

// The search waits this long after the last keystroke, and asks from this
// many characters on (#372, user story 2).
const SEARCH_PAUSE_MS = 300;
const SEARCH_MIN_CHARS = 3;
const SEARCH_MAX_HITS = 5;
// After this pause in a field of the address, the address counts as typed.
const ADDRESS_PAUSE_MS = 1200;
// Only if `geo/start` cannot be read: the map needs a view to be usable.
const GERMANY = Object.freeze({ lat: 51.2, lon: 9.4, zoom: 5 });

const FIELDS = Object.freeze([
  { name: "street", label: "location.fields.street" },
  { name: "houseNumber", label: "location.fields.houseNumber" },
  { name: "postcode", label: "location.fields.postcode" },
  { name: "city", label: "location.fields.city" },
  {
    name: "addition",
    label: "location.fields.additional",
    placeholder: "location.fields.additionalPlaceholder",
  },
]);
const COUNTRY = Object.freeze({
  name: "countryCode",
  label: "location.fields.country",
});

const isUnavailable = (error) => error?.response?.status === 503;

/**
 * The input of a location (map ECCdigital/tickets#372, #471): the search on
 * top, the fields of the address and the addition beneath, the map beside
 * them - one under the other where it is narrow. Address and point never
 * change each other silently; the rules are the location logic's
 * (`src/utils/locationLogic.js`), this component draws its state, sends its
 * actions and runs the requests it asks for.
 *
 * `v-model` is the location in the stored form. An untouched location goes
 * out as the stored one, word for word: only so does the backend let an old
 * one without point pass. `check` reports whether it may be saved and why
 * not (`{ storable, reason, pointMissing }`); a surrounding `v-form` shows
 * the reason here once it validates.
 *
 * `setPoint(point, origin)` sets the point from outside, e.g. NUKI's
 * „Vorbelegen“ with `origin` `"nuki"`: the reverse search then suggests an
 * address. See notes of #471 for the interface.
 */
export default {
  name: "LocationInput",
  components: { LocationMap },
  props: {
    /** The location in the stored form: an object, a text, `null`. */
    value: { type: [Object, String], default: null },
    /**
     * The location as stored, against which „unchanged“ is measured; by
     * default the `value` the input opened with. `null`: nothing stored yet.
     */
    stored: { type: [Object, String], default: undefined },
    /** The tenant whose geo routes are asked; by default the current one. */
    tenantId: { type: String, default: null },
    /** Fields and map one under the other, whatever the width. */
    narrow: { type: Boolean, default: false },
  },
  data() {
    const opened = this.value;
    return {
      opened,
      state: fromStored(
        this.value,
        this.stored === undefined ? opened : this.stored
      ),
      // The location last handed out or in; another one from outside is
      // read anew.
      handedOut: this.value,
      searchText: "",
      hits: [],
      searching: false,
      searchDone: false,
      searchNumber: 0,
      listOpen: false,
      active: 0,
      searchUnavailable: false,
      mapUnavailable: false,
      runningRequest: null,
      middle: null,
      view: null,
      width: Infinity,
    };
  },
  computed: {
    base() {
      return this.stored === undefined ? this.opened : this.stored;
    },
    tenant() {
      return (
        this.tenantId ||
        this.$store?.getters?.["tenants/currentTenantId"] ||
        null
      );
    },
    language() {
      return this.$i18n?.locale || "de";
    },
    focus() {
      return this.middle ? { lat: this.middle.lat, lon: this.middle.lon } : {};
    },
    fields() {
      const country = this.state.address.countryCode;
      return country && country.toUpperCase() !== "DE"
        ? [...FIELDS.slice(0, 4), COUNTRY, FIELDS[4]]
        : FIELDS;
    },
    checkResult() {
      return check(this.state);
    },
    withoutHitShown() {
      return (
        this.searchDone && this.searchText.trim().length >= SEARCH_MIN_CHARS
      );
    },
    entries() {
      return this.hits.length + (this.withoutHitShown ? 1 : 0);
    },
    listShown() {
      return this.listOpen && this.entries > 0;
    },
    suggestedPoint() {
      const v = this.state.suggestion;
      return v && v.kind === "point" ? v.point : null;
    },
    suggestionText() {
      const v = this.state.suggestion;
      if (!v) return "";
      if (v.kind === "point") {
        return this.$t("location.suggestion.point", { distance: v.distance });
      }
      return this.$t("location.suggestion.address", {
        address: displayAddress(v.address) || v.address.city,
      });
    },
    originText() {
      const origin = this.state.point && this.state.pointOrigin;
      return this.$t(
        origin ? `location.point.${origin}` : "location.point.none"
      );
    },
    isEmpty() {
      const { address, point, oldText } = this.state;
      return (
        !point && !displayAddress(address) && !address.addition && !oldText
      );
    },
    // On a small screen, and where the input itself is narrower than
    // Vuetify's edge of `xs` (600px, `$scb-bp-xs` in tokens.scss), fields
    // and map stand one under the other.
    isNarrow() {
      return (
        this.narrow ||
        this.$vuetify.breakpoint.xsOnly ||
        this.width < this.$vuetify.breakpoint.thresholds.xs
      );
    },
    mapHeight() {
      return this.isNarrow ? 220 : 260;
    },
  },
  watch: {
    value(value) {
      if (value === this.handedOut || _.isEqual(value, this.handedOut)) {
        this.handedOut = value;
        return;
      }
      this.readAnew(value);
    },
    base() {
      this.readAnew(this.value);
    },
    checkResult: {
      immediate: true,
      handler(result, before) {
        if (!_.isEqual(result, before)) this.$emit("check", result);
      },
    },
  },
  created() {
    this.searchText = this.state.oldText;
    if (!this.state.point) this.loadView();
  },
  mounted() {
    if (typeof ResizeObserver === "undefined") return;
    this.observer = new ResizeObserver(([entry]) => {
      this.width = entry.contentRect.width;
    });
    this.observer.observe(this.$el);
  },
  beforeDestroy() {
    clearTimeout(this.searchTimer);
    clearTimeout(this.addressTimer);
    this.observer?.disconnect();
  },
  methods: {
    /**
     * Sets the point from outside, as a click on the map does: the reverse
     * search then suggests an address.
     *
     * @param {{ lat: number, lon: number }} point
     * @param {"nuki"|"map"} [origin] - Where it comes from; NUKI by default.
     */
    setPoint(point, origin = "nuki") {
      this.onPointSet(point, origin);
    },
    onPointSet(point, origin) {
      this.dispatch({ type: "pointSet", point, origin });
    },
    dispatch(action) {
      this.state = reducer(this.state, action);
      this.handOut();
      this.runRequest();
    },
    handOut() {
      const value = toStored(this.state);
      if (value === this.handedOut || _.isEqual(value, this.handedOut)) return;
      this.handedOut = value;
      this.$emit("input", value);
    },
    readAnew(value) {
      this.state = fromStored(value, this.base);
      this.handedOut = value;
    },
    /**
     * Runs the request the state asks for and sends the answer back. A
     * request is told apart by itself, not its id: the ids start over when
     * the location is read anew. An answer no longer asked for is dropped.
     */
    async runRequest() {
      const request = this.state.request;
      if (!request || request === this.runningRequest) return;
      this.runningRequest = request;
      const result =
        request.kind === "reverse"
          ? await this.reverseSearch(request)
          : await this.searchAddress(request);
      if (this.state.request === request) this.dispatch(result);
    },
    async reverseSearch({ id, point }) {
      const hit = await this.geo(() =>
        ApiGeoService.reverse(this.tenant, { ...point, lang: this.language })
      );
      return { type: "reverseResult", id, hit };
    },
    async searchAddress({ id, address }) {
      const hits = await this.geo(() =>
        ApiGeoService.search(this.tenant, {
          q: displayAddress(address),
          ...this.focus,
          lang: this.language,
        })
      );
      return { type: "searchResult", id, hit: (hits && hits[0]) || null };
    },
    /** A call of search or reverse search; a failure answers `null`. */
    async geo(call) {
      try {
        const answer = await call();
        this.searchUnavailable = false;
        return answer;
      } catch (error) {
        if (isUnavailable(error)) this.searchUnavailable = true;
        else console.error(error);
        return null;
      }
    },
    async loadView() {
      try {
        this.view = await ApiGeoService.start(this.tenant);
      } catch (error) {
        console.error(error);
        this.view = GERMANY;
      }
    },

    onSearchInput(text) {
      this.searchText = text || "";
      this.listOpen = true;
      this.active = 0;
      clearTimeout(this.searchTimer);
      this.searchDone = false;
      const q = this.searchText.trim();
      if (q.length < SEARCH_MIN_CHARS) {
        this.searchNumber += 1;
        this.hits = [];
        this.searching = false;
        return;
      }
      this.searchTimer = setTimeout(() => this.search(q), SEARCH_PAUSE_MS);
    },
    async search(q) {
      this.searchNumber += 1;
      const number = this.searchNumber;
      this.searching = true;
      const hits = await this.geo(() =>
        ApiGeoService.search(this.tenant, {
          q,
          ...this.focus,
          lang: this.language,
        })
      );
      if (number !== this.searchNumber) return;
      this.hits = (hits || []).slice(0, SEARCH_MAX_HITS);
      this.searching = false;
      this.searchDone = true;
    },
    onSearchKey(event) {
      const keys = {
        ArrowDown: () => this.move(1),
        ArrowUp: () => this.move(-1),
        Enter: () => this.listShown && this.choose(this.active),
        Escape: () => {
          this.listOpen = false;
        },
      };
      const key = keys[event.key];
      if (!key) return;
      // Escape closes the list, not a dialog the input stands in.
      if (event.key === "Escape" && this.listShown) event.stopPropagation();
      event.preventDefault();
      key();
    },
    move(step) {
      if (!this.listOpen) {
        this.listOpen = true;
        return;
      }
      if (!this.entries) return;
      this.active = (this.active + step + this.entries) % this.entries;
    },
    choose(index) {
      if (index < this.hits.length) {
        this.dispatch({ type: "hitChosen", hit: this.hits[index] });
      } else if (this.withoutHitShown) {
        this.dispatch({ type: "withoutHit", text: this.searchText.trim() });
      } else {
        return;
      }
      this.clearSearch();
    },
    clearSearch() {
      clearTimeout(this.searchTimer);
      this.searchNumber += 1;
      this.searchText = "";
      this.hits = [];
      this.searching = false;
      this.searchDone = false;
      this.listOpen = false;
      this.active = 0;
    },
    /** „Text suchen“: the old text of a location without point, at once. */
    searchOldText() {
      this.searchText = this.state.oldText;
      this.listOpen = true;
      this.active = 0;
      this.search(this.searchText.trim());
    },
    /** Back to the search, with the text that found nothing. */
    cancelPlacing() {
      const text = this.state.placing?.text || "";
      this.dispatch({ type: "placingCancelled" });
      this.searchText = text;
      this.listOpen = true;
      this.$refs.search?.focus();
      if (text.trim().length >= SEARCH_MIN_CHARS) this.search(text.trim());
    },
    clear() {
      this.dispatch({ type: "cleared" });
      this.clearSearch();
    },

    onFieldInput(field, value) {
      this.dispatch({ type: "fieldChanged", field, value: value || "" });
      if (field === "addition") return;
      clearTimeout(this.addressTimer);
      this.addressTimer = setTimeout(
        () => this.addressDone(),
        ADDRESS_PAUSE_MS
      );
    },
    addressDone() {
      clearTimeout(this.addressTimer);
      this.dispatch({ type: "addressDone" });
    },

    isAbroad(hit) {
      const country = hit.address?.country_code;
      return !!country && country.toUpperCase() !== "DE";
    },
    countryName(code) {
      try {
        return (
          new Intl.DisplayNames([this.language], { type: "region" }).of(
            code.toUpperCase()
          ) || code
        );
      } catch (error) {
        return code;
      }
    },
    // The message of the one rule of a location, as every page refuses it.
    message() {
      const key = refusalOf(this.state);
      return !key || this.$t(key);
    },
  },
};
</script>

<style scoped>
.location-input__search {
  position: relative;
}
.location-input__list {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 2px);
  /* Above the map, whose layers stay in its own stacking context, and below
     Vuetify's menus and dialogs. */
  z-index: 1;
  max-height: 320px;
  overflow-y: auto;
}
.location-input__notice {
  margin: var(--scb-space-2) 0 0;
}
.location-input__suggestion {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--scb-space-2);
}
.location-input__suggestion-text {
  flex: 1 1 180px;
  min-width: 0;
}
.location-input__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--scb-space-4);
  align-items: start;
  margin-top: var(--scb-space-3);
}
.location-input--narrow .location-input__grid {
  grid-template-columns: minmax(0, 1fr);
}
.location-input__fields {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: var(--scb-space-2);
}
.location-input__fields > * {
  grid-column: span 6;
}
.location-input__fields > .location-input__field--street,
.location-input__fields > .location-input__field--city {
  grid-column: span 4;
}
.location-input__fields > .location-input__field--houseNumber,
.location-input__fields > .location-input__field--postcode {
  grid-column: span 2;
}
.location-input__map {
  position: relative;
  /* Leaflet's layers reach z-index 1000, Vuetify's dialogs 202: they stay
     inside the map, below every overlay of the app. */
  isolation: isolate;
  overflow: hidden;
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-control);
  background: var(--scb-surface-raised);
}
.location-input__banner {
  position: absolute;
  top: var(--scb-space-2);
  left: var(--scb-space-2);
  right: var(--scb-space-2);
  z-index: 1100;
  display: flex;
  align-items: center;
  gap: var(--scb-space-2);
  padding: var(--scb-space-1) var(--scb-space-2);
  border-radius: var(--scb-radius-control);
  background: var(--scb-overlay);
  color: var(--scb-on-overlay);
  font-size: var(--scb-font-size-sm);
}
.location-input__banner .v-icon,
.location-input__banner .v-btn {
  color: inherit;
}
.location-input__banner-text {
  flex: 1;
  min-width: 0;
}
.location-input__origin {
  display: flex;
  align-items: center;
  gap: var(--scb-space-1);
  margin-top: var(--scb-space-1);
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}
.location-input__origin .v-icon {
  color: inherit;
}
.location-input__message {
  margin-top: var(--scb-space-1);
}
</style>
