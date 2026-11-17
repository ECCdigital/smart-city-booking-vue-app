<script>
import { mapGetters } from "vuex";
import ApiBookablesService from "@/services/api/ApiBookablesService";
import { isForbiddenError } from "@/services/api/apiErrorMessage";
import LocationInput from "@/components/commons/Location/LocationInput.vue";
import eventEditing from "@/mixins/eventEditing";
import {
  EVENT_FORMATS,
  needsParticipationLink,
} from "@/utils/eventParticipationLink";
import { locationToAdopt } from "@/utils/eventEditing";
import SectionCard from "@/components/commons/SectionCard.vue";

const FORMAT_KEYS = Object.freeze({
  [EVENT_FORMATS.PRESENCE]: "presence",
  [EVENT_FORMATS.HYBRID]: "hybrid",
  [EVENT_FORMATS.ONLINE]: "online",
});
const FORMAT_ICONS = Object.freeze({
  [EVENT_FORMATS.PRESENCE]: "mdi-map-marker-outline",
  [EVENT_FORMATS.HYBRID]: "mdi-devices",
  [EVENT_FORMATS.ONLINE]: "mdi-video-outline",
});

/**
 * The tab „Ort & Format“. The format comes first: it decides whether the
 * event asks for a place, a participation link or both.
 */
export default {
  name: "EventEditPlace",
  components: { SectionCard, LocationInput },
  mixins: [eventEditing],
  data() {
    return {
      bookables: [],
      forbidden: false,
      formats: Object.values(EVENT_FORMATS),
    };
  },
  computed: {
    ...mapGetters({ storedLocation: "events/storedLocation" }),
    place() {
      return this.form.eventLocation;
    },
    // The location in its stored form; the input reads every form of it.
    location() {
      return this.form.location ?? null;
    },
    format() {
      return this.form.format ?? EVENT_FORMATS.PRESENCE;
    },
    formatKey() {
      return FORMAT_KEYS[this.format];
    },
    hasPlace() {
      return this.format !== EVENT_FORMATS.ONLINE;
    },
    needsUrl() {
      return needsParticipationLink(this.format);
    },
    venues() {
      return this.bookables.filter((b) => b.type === "event-location");
    },
    rooms() {
      return this.bookables.filter((b) => b.type === "room");
    },
    forbiddenHint() {
      return this.forbidden ? this.$t("bookable.select.forbidden") : "";
    },
  },
  created() {
    ApiBookablesService.getBookables()
      .then((response) => {
        this.bookables = response.data || [];
      })
      .catch((error) => {
        // An empty select is not the place for a dialog: the fields stay
        // empty and carry the reason as a hint.
        this.forbidden = isForbiddenError(error);
      });
  },
  methods: {
    /**
     * A venue or room chosen from this administration (`field`: `select` or
     * `room`): the event takes its address as its location.
     */
    choose(field, id) {
      this.update("eventLocation", field, id || null);
      const location = locationToAdopt(
        this.bookables.find((bookable) => bookable.id === id)
      );
      if (location) this.update(null, "location", location);
    },
    formatLabel(format) {
      return this.$t(`event.edit.place.formats.${FORMAT_KEYS[format]}`);
    },
    formatIcon(format) {
      return FORMAT_ICONS[format];
    },
  },
};
</script>

<template>
  <SectionCard
    id="event-section-place"
    icon="mdi-map-marker-outline"
    :title="$t('event.edit.cards.place')"
  >
    <div class="event-edit__field">
      <div class="event-edit__label">
        {{ $t("event.edit.place.format") }}
        <span class="event-edit__required">{{
          $t("event.edit.required")
        }}</span>
      </div>
      <v-btn-toggle
        :value="format"
        mandatory
        color="primary"
        class="event-edit-place__formats"
        data-test="event-format"
        @change="update(null, 'format', $event)"
      >
        <v-btn
          v-for="option in formats"
          :key="option"
          :value="option"
          :data-test="`event-format-${option}`"
          outlined
        >
          <v-icon small left>{{ formatIcon(option) }}</v-icon>
          {{ formatLabel(option) }}
        </v-btn>
      </v-btn-toggle>
      <v-alert dense text color="primary" class="mt-3 mb-0 text-body-2">
        <v-icon small color="primary" class="mr-1"
          >mdi-lightbulb-outline</v-icon
        >
        {{ $t(`event.edit.place.explain.${formatKey}`) }}
      </v-alert>
    </div>

    <template v-if="hasPlace">
      <div class="event-edit__field" data-field="placeName">
        <v-text-field
          :value="place.name"
          :label="$t('event.edit.place.name') + ' *'"
          :hint="$t('event.edit.place.nameHint')"
          :error-messages="errorsFor('placeName')"
          persistent-hint
          outlined
          dense
          data-test="event-place-name"
          @input="update('eventLocation', 'name', $event)"
        />
      </div>
      <v-row dense>
        <v-col cols="12" sm="6">
          <v-select
            :value="place.select"
            :items="venues"
            item-text="title"
            item-value="id"
            :label="$t('event.edit.place.venue')"
            :hint="forbiddenHint || $t('event.edit.place.venueHint')"
            persistent-hint
            clearable
            outlined
            dense
            @change="choose('select', $event)"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-select
            :value="place.room"
            :items="rooms"
            item-text="title"
            item-value="id"
            :label="$t('event.edit.place.room')"
            :hint="forbiddenHint || $t('event.edit.place.roomHint')"
            persistent-hint
            clearable
            outlined
            dense
            @change="choose('room', $event)"
          />
        </v-col>
      </v-row>
      <div class="event-edit__field mt-5" data-field="location">
        <div class="event-edit__label">
          {{ $t("event.edit.place.location") }}
        </div>
        <LocationInput
          :value="location"
          :stored="storedLocation"
          :tenant-id="form.tenantId || null"
          @input="update(null, 'location', $event)"
        />
        <div
          v-for="message in errorsFor('location')"
          :key="message"
          class="event-edit__error"
        >
          {{ message }}
        </div>
      </div>
    </template>

    <div v-if="needsUrl" class="event-edit__field" data-field="url">
      <v-text-field
        :value="place.url"
        :label="$t('event.edit.place.url') + ' *'"
        :hint="$t('event.edit.place.urlHint')"
        :error-messages="errorsFor('url')"
        placeholder="https://"
        type="url"
        persistent-hint
        outlined
        dense
        data-test="event-url"
        @input="update('eventLocation', 'url', $event)"
      />
    </div>
  </SectionCard>
</template>

<style scoped>
.event-edit-place__formats {
  display: grid !important;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  width: 100%;
}

.event-edit-place__formats .v-btn {
  height: 40px !important;
  text-transform: none;
  letter-spacing: normal;
}
</style>
