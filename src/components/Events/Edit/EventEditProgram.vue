<script>
import uniqueId from "lodash/uniqueId";
import eventEditing from "@/mixins/eventEditing";
import { eventDays, isMultiDay } from "@/utils/eventEditing";
import SectionCard from "@/components/commons/SectionCard.vue";
import TimeField from "@/components/commons/TimeField.vue";

/**
 * The tab „Programm“: the program points (`schedules`), each with a time and
 * what happens, and on an event over several days with its day. A point may
 * carry sub-points (`schedules[].schedules`), as stored events do.
 * „Ohne festgelegtes Programm“ is no field of its own: it is on while there
 * is no point, and switching it on removes them.
 */
export default {
  name: "EventEditProgram",
  components: { SectionCard, TimeField },
  mixins: [eventEditing],
  computed: {
    schedules() {
      return this.form.schedules || [];
    },
    noProgram() {
      return this.schedules.length === 0;
    },
    multiDay() {
      return isMultiDay(this.form);
    },
    days() {
      return eventDays(this.form).map((day) => ({
        value: day,
        text: new Date(`${day}T00:00:00`).toLocaleDateString("de-DE", {
          weekday: "short",
          day: "numeric",
          month: "short",
        }),
      }));
    },
  },
  methods: {
    setSchedules(schedules) {
      this.update(null, "schedules", schedules);
    },
    setNoProgram(on) {
      this.setSchedules(on ? [] : [this.newPoint()]);
    },
    newPoint() {
      const last = this.schedules[this.schedules.length - 1];
      return {
        id: uniqueId(),
        date: last?.date || this.form.information.startDate || "",
        time: "",
        description: "",
        schedules: [],
      };
    },
    addPoint() {
      this.setSchedules([...this.schedules, this.newPoint()]);
    },
    changePoint(index, patch) {
      this.setSchedules(
        this.schedules.map((point, i) =>
          i === index ? { ...point, ...patch } : point
        )
      );
    },
    removePoint(index) {
      this.setSchedules(this.schedules.filter((_, i) => i !== index));
    },
    addSub(index) {
      const subs = this.schedules[index].schedules || [];
      this.changePoint(index, {
        schedules: [...subs, { id: uniqueId(), time: "", description: "" }],
      });
    },
    changeSub(index, subIndex, patch) {
      const subs = this.schedules[index].schedules || [];
      this.changePoint(index, {
        schedules: subs.map((sub, i) =>
          i === subIndex ? { ...sub, ...patch } : sub
        ),
      });
    },
    removeSub(index, subIndex) {
      const subs = this.schedules[index].schedules || [];
      this.changePoint(index, {
        schedules: subs.filter((_, i) => i !== subIndex),
      });
    },
  },
};
</script>

<template>
  <SectionCard
    id="event-section-program"
    icon="mdi-clock-outline"
    :title="$t('event.edit.cards.program')"
    :hint="$t('event.edit.program.hint')"
    :badge="$t('event.edit.optional')"
  >
    <v-switch
      :input-value="noProgram"
      :label="$t('event.edit.program.none')"
      :hint="noProgram ? '' : $t('event.edit.program.noneHint')"
      persistent-hint
      inset
      class="mt-0 pt-0 mb-4"
      data-test="event-no-program"
      @change="setNoProgram($event === true)"
    />

    <template v-if="!noProgram">
      <v-alert v-if="multiDay" dense text type="info" class="text-body-2">
        {{ $t("event.edit.program.multiDay") }}
      </v-alert>
      <div
        v-for="(point, index) in schedules"
        :key="point.id || index"
        class="event-program__point"
        data-test="event-program-point"
      >
        <div
          class="event-program__row"
          :class="{ 'event-program__row--days': multiDay }"
        >
          <v-select
            v-if="multiDay"
            :value="point.date"
            :items="days"
            :label="$t('event.edit.program.day')"
            outlined
            dense
            hide-details
            @change="changePoint(index, { date: $event })"
          />
          <TimeField
            :value="point.time"
            :label="$t('event.edit.program.time')"
            hide-details
            @input="changePoint(index, { time: $event })"
          />
          <v-text-field
            :value="point.description"
            :label="$t('event.edit.program.description')"
            outlined
            dense
            hide-details
            @input="changePoint(index, { description: $event })"
          />
          <v-btn
            icon
            small
            :title="$t('event.edit.program.remove')"
            :aria-label="$t('event.edit.program.remove')"
            @click="removePoint(index)"
          >
            <v-icon small>mdi-delete-outline</v-icon>
          </v-btn>
        </div>
        <div
          v-for="(sub, subIndex) in point.schedules || []"
          :key="sub.id || subIndex"
          class="event-program__row event-program__row--sub"
        >
          <TimeField
            :value="sub.time"
            :label="$t('event.edit.program.time')"
            hide-details
            @input="changeSub(index, subIndex, { time: $event })"
          />
          <v-text-field
            :value="sub.description"
            :label="$t('event.edit.program.description')"
            outlined
            dense
            hide-details
            @input="changeSub(index, subIndex, { description: $event })"
          />
          <v-btn
            icon
            small
            :title="$t('event.edit.program.removeSub')"
            :aria-label="$t('event.edit.program.removeSub')"
            @click="removeSub(index, subIndex)"
          >
            <v-icon small>mdi-delete-outline</v-icon>
          </v-btn>
        </div>
        <v-btn
          x-small
          text
          color="primary"
          class="event-program__sub-add"
          @click="addSub(index)"
        >
          <v-icon x-small left>mdi-subdirectory-arrow-right</v-icon>
          {{ $t("event.edit.program.addSub") }}
        </v-btn>
      </div>
      <v-btn
        small
        outlined
        color="primary"
        data-test="event-add-program-point"
        @click="addPoint"
      >
        <v-icon small left>mdi-plus</v-icon>
        {{ $t("event.edit.program.add") }}
      </v-btn>
    </template>
  </SectionCard>
</template>

<style scoped>
.event-program__point {
  margin-bottom: var(--scb-space-3);
}

.event-program__row {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr) auto;
  gap: var(--scb-space-2);
  align-items: center;
}

.event-program__row--days {
  grid-template-columns: 150px 150px minmax(0, 1fr) auto;
}

.event-program__row--sub {
  margin: var(--scb-space-2) 0 0 var(--scb-space-6);
}

.event-program__sub-add {
  margin: var(--scb-space-1) 0 0 var(--scb-space-6);
}

@media (max-width: 599px) {
  .event-program__row,
  .event-program__row--days {
    grid-template-columns: 140px minmax(0, 1fr) auto;
  }

  .event-program__row--days > :first-child {
    grid-column: 1 / -1;
  }
}
</style>
