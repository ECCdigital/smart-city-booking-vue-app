<script>
import { mapActions } from "vuex";
import eventEditing from "@/mixins/eventEditing";
import { REGISTRATION, registrationPatch } from "@/utils/eventEditing";
import SectionCard from "@/components/commons/SectionCard.vue";
import ApiBookablesService from "@/services/api/ApiBookablesService";

/**
 * The tab „Teilnahme“: one question - how people register - and what the
 * answer needs: places and who may register for the portal, an address for
 * another website, nothing without registration. Once a ticket of the event
 * has a number of its own, a changed number of places says so: those
 * numbers may need to follow.
 */
export default {
  name: "EventEditParticipation",
  components: { SectionCard },
  inject: {
    eventEditPage: { default: () => ({ stored: () => undefined }) },
  },
  mixins: [eventEditing],
  data() {
    return {
      modes: [REGISTRATION.PORTAL, REGISTRATION.EXTERNAL, REGISTRATION.NONE],
      REGISTRATION,
      // Whether a ticket of the event limits its own number (`amount`).
      ticketsLimited: false,
    };
  },
  created() {
    this.loadTickets();
  },
  // Kept alive between the tabs: tickets may have changed under „Tickets“.
  activated() {
    this.loadTickets();
  },
  computed: {
    attendees() {
      return this.form.attendees;
    },
    /** The places differ from the saved ones while a ticket limits its own. */
    placesChanged() {
      if (!this.ticketsLimited || !this.form.id) return false;
      const stored = this.eventEditPage.stored("attendees.maxAttendees");
      return (this.attendees.maxAttendees ?? null) !== (stored ?? null);
    },
  },
  methods: {
    ...mapActions({ setRegistrationMode: "events/setRegistrationMode" }),
    chooseMode(mode) {
      const patch = registrationPatch(mode, this.form);
      this.update("attendees", "needsRegistration", patch.needsRegistration);
      this.update(null, "externalBookingUrl", patch.externalBookingUrl);
      this.setRegistrationMode(mode);
    },
    async loadTickets() {
      if (!this.form.id) {
        this.ticketsLimited = false;
        return;
      }
      try {
        const response = await ApiBookablesService.getBookables();
        this.ticketsLimited = (response.data || []).some(
          (b) =>
            b.type === "ticket" &&
            b.eventId === this.form.id &&
            Number(b.amount) > 0
        );
      } catch (error) {
        this.ticketsLimited = false;
      }
    },
    setMax(value) {
      const number = parseInt(value, 10);
      this.update(
        "attendees",
        "maxAttendees",
        Number.isNaN(number) ? null : number
      );
    },
  },
};
</script>

<template>
  <SectionCard
    id="event-section-participation"
    icon="mdi-account-check-outline"
    :title="$t('event.edit.cards.participation')"
  >
    <div class="event-edit__field">
      <div class="event-edit__label">
        {{ $t("event.edit.participation.question") }}
      </div>
      <v-radio-group
        :value="registrationMode"
        hide-details
        class="mt-0 pt-0"
        data-test="event-registration"
        @change="chooseMode"
      >
        <v-radio
          v-for="mode in modes"
          :key="mode"
          :value="mode"
          :data-test="`event-registration-${mode}`"
          class="event-edit__choice"
        >
          <template #label>
            <div>
              <div class="font-weight-medium">
                {{ $t(`event.edit.participation.${mode}.label`) }}
              </div>
              <div class="text-caption text--secondary">
                {{ $t(`event.edit.participation.${mode}.hint`) }}
              </div>
            </div>
          </template>
        </v-radio>
      </v-radio-group>
    </div>

    <template v-if="registrationMode === REGISTRATION.PORTAL">
      <div class="event-edit__field" data-field="maxAttendees">
        <v-text-field
          :value="attendees.maxAttendees"
          :label="$t('event.edit.participation.max') + ' *'"
          :hint="$t('event.edit.participation.maxHint')"
          :error-messages="errorsFor('maxAttendees')"
          type="number"
          min="1"
          persistent-hint
          outlined
          dense
          data-test="event-max-attendees"
          @input="setMax"
        />
        <v-alert
          v-if="placesChanged"
          dense
          text
          type="warning"
          class="mt-3 mb-0 text-body-2"
          data-test="places-changed"
        >
          {{ $t("event.edit.participation.placesChanged") }}
        </v-alert>
      </div>
      <div class="event-edit__field">
        <div class="event-edit__label">
          {{ $t("event.edit.participation.audience") }}
        </div>
        <v-radio-group
          :value="attendees.publicEvent !== false"
          hide-details
          class="mt-0 pt-0"
          @change="update('attendees', 'publicEvent', $event)"
        >
          <v-radio :value="true" class="event-edit__choice">
            <template #label>
              <div>
                <div class="font-weight-medium">
                  {{ $t("event.edit.participation.audienceAll.label") }}
                </div>
                <div class="text-caption text--secondary">
                  {{ $t("event.edit.participation.audienceAll.hint") }}
                </div>
              </div>
            </template>
          </v-radio>
          <v-radio :value="false" class="event-edit__choice">
            <template #label>
              <div>
                <div class="font-weight-medium">
                  {{ $t("event.edit.participation.audienceLink.label") }}
                </div>
                <div class="text-caption text--secondary">
                  {{ $t("event.edit.participation.audienceLink.hint") }}
                </div>
              </div>
            </template>
          </v-radio>
        </v-radio-group>
      </div>
    </template>

    <div
      v-if="registrationMode === REGISTRATION.EXTERNAL"
      class="event-edit__field"
      data-field="externalBookingUrl"
    >
      <v-text-field
        :value="form.externalBookingUrl"
        :label="$t('event.edit.participation.externalUrl') + ' *'"
        :error-messages="errorsFor('externalBookingUrl')"
        placeholder="https://"
        type="url"
        outlined
        dense
        data-test="event-external-url"
        @input="update(null, 'externalBookingUrl', $event || '')"
      />
    </div>
  </SectionCard>
</template>
