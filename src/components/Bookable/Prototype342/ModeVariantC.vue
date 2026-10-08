<!-- PROTOTYPE (ECCdigital/tickets#342), throwaway: never merge.
     Variant C, „Kacheln mit Vorschau“ (new): the modes grouped by how long a
     booking lasts - within a day, over several days, without a time - each
     as a tile with a sketch of what the booker picks. -->
<template>
  <div class="proto-c">
    <section v-for="group in groups" :key="group.title" class="proto-c__group">
      <div class="proto-c__caption">{{ group.title }}</div>
      <div class="proto-c__tiles">
        <button
          v-for="m in group.modes"
          :key="m"
          type="button"
          role="radio"
          :aria-checked="String(m === mode)"
          class="proto-c__tile"
          :class="{ 'proto-c__tile--on': m === mode }"
          @click="$emit('choose', m)"
        >
          <div class="proto-c__sketch">
            <!-- Freie Zeitwahl: a day with a free stretch picked -->
            <div v-if="m === 'schedule'" class="sk-day">
              <span
                v-for="h in 12"
                :key="h"
                :class="{ on: h >= 4 && h <= 7 }"
              />
            </div>
            <!-- Feste Zeitfenster: given slots, one picked -->
            <div v-else-if="m === 'timePeriod'" class="sk-slots">
              <span>9–12</span><span class="on">13–16</span><span>17–20</span>
            </div>
            <!-- Zeiträume: a week with Fr–So picked -->
            <div v-else-if="m === 'blockPeriod'" class="sk-week">
              <span v-for="(d, i) in DAYS" :key="d" :class="{ on: i >= 4 }">{{
                d
              }}</span>
            </div>
            <!-- Ganze Wochen: a month of weeks, one whole row picked -->
            <div v-else-if="m === 'week'" class="sk-weeks">
              <div v-for="w in 4" :key="w" :class="{ on: w === 2 }">
                <span v-for="d in 7" :key="d" />
              </div>
            </div>
            <!-- Ganze Monate: a year, one month picked -->
            <div v-else-if="m === 'month'" class="sk-months">
              <span
                v-for="(mo, i) in MONTHS"
                :key="mo"
                :class="{ on: i === 4 }"
                >{{ mo }}</span
              >
            </div>
            <!-- Ohne Zeit: a quantity -->
            <div v-else class="sk-count">
              <span>–</span><b>2</b><span>+</span>
            </div>
          </div>
          <div class="proto-c__name">
            {{ naming.labels[m] }}
            <span v-if="expertOnly(m)" class="proto-c__badge">Experte</span>
          </div>
          <div class="proto-c__explain">{{ EXPLAIN[m] }}</div>
        </button>
      </div>
    </section>
  </div>
</template>

<script>
import { EXPLAIN } from "./bookingModeShared";
import { isBookableExpertOnlyBookingType } from "@/utils/bookableExpertMode";

const GROUPS = [
  { title: "Innerhalb eines Tages", modes: ["schedule", "timePeriod"] },
  { title: "Über mehrere Tage", modes: ["blockPeriod", "week", "month"] },
  { title: "Ohne Zeit", modes: ["independent"] },
];

export default {
  name: "ModeVariantC",
  props: {
    mode: { type: String, required: true },
    modes: { type: Array, required: true },
    naming: { type: Object, required: true },
  },
  data: () => ({
    EXPLAIN,
    DAYS: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
    MONTHS: ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],
  }),
  computed: {
    groups() {
      return GROUPS.map((g) => ({
        ...g,
        modes: g.modes.filter((m) => this.modes.includes(m)),
      })).filter((g) => g.modes.length);
    },
  },
  methods: {
    expertOnly: isBookableExpertOnlyBookingType,
  },
};
</script>

<style scoped>
.proto-c__group + .proto-c__group {
  margin-top: var(--scb-space-4);
}
.proto-c__caption {
  margin-bottom: var(--scb-space-2);
  font-size: var(--scb-font-size-caption);
  font-weight: var(--scb-font-weight-semibold);
  letter-spacing: var(--scb-letter-spacing-caption);
  text-transform: uppercase;
  color: var(--scb-text-caption);
}
.proto-c__tiles {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: var(--scb-space-3);
}
.proto-c__tile {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: var(--scb-space-3);
  text-align: left;
  font: inherit;
  color: var(--scb-text);
  background: var(--scb-surface);
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-surface);
  cursor: pointer;
  transition: box-shadow var(--scb-motion-base),
    background-color var(--scb-motion-fast);
}
.proto-c__tile:hover {
  background: var(--scb-hover-tint);
}
.proto-c__tile--on {
  background: var(--scb-selected-tint);
  border-color: var(--v-primary-base);
  box-shadow: var(--scb-glow-selected);
}
.proto-c__sketch {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 56px;
  margin-bottom: var(--scb-space-2);
  background: var(--scb-surface-tint-faint);
  border-radius: var(--scb-radius-control);
}
.proto-c__name {
  font-size: var(--scb-font-size-md);
  font-weight: var(--scb-font-weight-semibold);
}
.proto-c__explain {
  margin-top: 2px;
  font-size: var(--scb-font-size-xs);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text-muted);
}
.proto-c__badge {
  margin-left: var(--scb-space-1);
  padding: 0 6px;
  font-size: var(--scb-font-size-caption);
  font-weight: normal;
  background: var(--scb-warning-tint);
  border-radius: var(--scb-radius-badge);
}

/* sketches */
.on {
  background: var(--v-primary-base) !important;
  color: #fff !important;
}
.sk-day {
  display: flex;
  gap: 2px;
}
.sk-day span {
  width: 10px;
  height: 20px;
  background: var(--scb-rule-strong);
  border-radius: 2px;
}
.sk-slots,
.sk-week,
.sk-months {
  display: flex;
  gap: 3px;
  font-size: 10px;
}
.sk-slots span,
.sk-week span,
.sk-months span {
  padding: 2px 4px;
  color: var(--scb-text-muted);
  background: var(--scb-surface);
  border: 1px solid var(--scb-surface-border);
  border-radius: 3px;
}
.sk-months span {
  padding: 2px 3px;
}
.sk-weeks div {
  display: flex;
  gap: 2px;
  margin: 1px 0;
  padding: 1px;
  border-radius: 2px;
}
.sk-weeks span {
  width: 9px;
  height: 7px;
  background: var(--scb-rule-strong);
  border-radius: 1px;
}
.sk-weeks div.on span {
  background: transparent;
}
.sk-count {
  display: flex;
  align-items: center;
  gap: var(--scb-space-2);
  font-size: 14px;
}
.sk-count span {
  width: 20px;
  text-align: center;
  border: 1px solid var(--scb-surface-border);
  border-radius: 3px;
}
</style>
