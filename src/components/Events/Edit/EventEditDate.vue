<script>
import eventEditing from "@/mixins/eventEditing";
import SectionCard from "@/components/commons/SectionCard.vue";

/** The tab „Termin“: begin and end, each with date and time. */
export default {
  name: "EventEditDate",
  components: { SectionCard },
  mixins: [eventEditing],
  computed: {
    info() {
      return this.form.information;
    },
    /** „Samstag, 21. November 2026, 10:00 bis 13:00 Uhr“, once both ends are set. */
    summary() {
      const { startDate, startTime, endDate, endTime } = this.info;
      if (!startDate || !startTime || !endDate || !endTime) return "";
      const begin = new Date(`${startDate}T${startTime}`);
      const end = new Date(`${endDate}T${endTime}`);
      if (isNaN(begin) || isNaN(end) || end <= begin) return "";
      const day = (date) =>
        date.toLocaleDateString("de-DE", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      const range =
        startDate === endDate
          ? `${day(begin)}, ${startTime} bis ${endTime} Uhr`
          : `${day(begin)}, ${startTime} Uhr bis ${day(end)}, ${endTime} Uhr`;
      return `${range}. ${this.$t("event.edit.date.summary", {
        duration: this.duration(end - begin),
      })}`;
    },
  },
  methods: {
    duration(ms) {
      const minutes = Math.round(ms / 60000);
      if (minutes >= 24 * 60) {
        const days = Math.round((minutes / (24 * 60)) * 10) / 10;
        return this.$t("event.edit.date.days", {
          days: String(days).replace(".", ","),
        });
      }
      const parts = [];
      if (Math.floor(minutes / 60)) {
        parts.push(
          this.$t("event.edit.date.hours", { hours: Math.floor(minutes / 60) })
        );
      }
      if (minutes % 60) {
        parts.push(
          this.$t("event.edit.date.minutes", { minutes: minutes % 60 })
        );
      }
      return parts.join(" ");
    },
  },
};
</script>

<template>
  <SectionCard
    id="event-section-date"
    icon="mdi-calendar"
    :title="$t('event.edit.cards.date')"
  >
    <v-row dense data-field="start">
      <v-col cols="12" sm="6">
        <v-text-field
          :value="info.startDate"
          :label="$t('event.edit.date.startDate') + ' *'"
          :error-messages="errorsFor('start')"
          type="date"
          outlined
          dense
          data-test="event-start-date"
          @input="update('information', 'startDate', $event)"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field
          :value="info.startTime"
          :label="$t('event.edit.date.startTime') + ' *'"
          :error="errorsFor('start').length > 0"
          type="time"
          outlined
          dense
          data-test="event-start-time"
          @input="update('information', 'startTime', $event)"
        />
      </v-col>
    </v-row>
    <v-row dense data-field="end">
      <v-col cols="12" sm="6">
        <v-text-field
          :value="info.endDate"
          :label="$t('event.edit.date.endDate') + ' *'"
          :error-messages="errorsFor('end')"
          :min="info.startDate || undefined"
          type="date"
          outlined
          dense
          data-test="event-end-date"
          @input="update('information', 'endDate', $event)"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field
          :value="info.endTime"
          :label="$t('event.edit.date.endTime') + ' *'"
          :error="errorsFor('end').length > 0"
          type="time"
          outlined
          dense
          data-test="event-end-time"
          @input="update('information', 'endTime', $event)"
        />
      </v-col>
    </v-row>
    <p
      v-if="summary"
      class="event-edit__summary"
      data-test="event-date-summary"
    >
      <v-icon small>mdi-calendar-check</v-icon>
      {{ summary }}
    </p>
  </SectionCard>
</template>
