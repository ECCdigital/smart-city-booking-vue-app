<script>
import eventEditing from "@/mixins/eventEditing";
import SectionCard from "@/components/commons/SectionCard.vue";
import DateField from "@/components/commons/DateField.vue";
import TimeField from "@/components/commons/TimeField.vue";

/** The tab „Termin“: begin and end, each with date and time. */
export default {
  name: "EventEditDate",
  components: { SectionCard, DateField, TimeField },
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
    /** „1 Tag 2 Std. 30 Min.“: whole days, hours and minutes, the empty ones left out. */
    duration(ms) {
      const total = Math.round(ms / 60000);
      const days = Math.floor(total / (24 * 60));
      const hours = Math.floor((total % (24 * 60)) / 60);
      const minutes = total % 60;
      const parts = [];
      if (days) parts.push(this.$tc("event.edit.date.days", days, { days }));
      if (hours) parts.push(this.$t("event.edit.date.hours", { hours }));
      if (minutes) parts.push(this.$t("event.edit.date.minutes", { minutes }));
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
        <DateField
          :value="info.startDate"
          :label="$t('event.edit.date.startDate') + ' *'"
          :error-messages="errorsFor('start')"
          data-test="event-start-date"
          @input="update('information', 'startDate', $event)"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <TimeField
          :value="info.startTime"
          :label="$t('event.edit.date.startTime') + ' *'"
          :error="errorsFor('start').length > 0"
          data-test="event-start-time"
          @input="update('information', 'startTime', $event)"
        />
      </v-col>
    </v-row>
    <v-row dense data-field="end">
      <v-col cols="12" sm="6">
        <DateField
          :value="info.endDate"
          :label="$t('event.edit.date.endDate') + ' *'"
          :error-messages="errorsFor('end')"
          :min="info.startDate || undefined"
          data-test="event-end-date"
          @input="update('information', 'endDate', $event)"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <TimeField
          :value="info.endTime"
          :label="$t('event.edit.date.endTime') + ' *'"
          :error="errorsFor('end').length > 0"
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
