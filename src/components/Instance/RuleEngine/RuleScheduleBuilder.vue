<template>
  <div>
    <v-row dense align="start">
      <v-col cols="12" md="4">
        <v-select
          v-model="frequency"
          :items="frequencyItems"
          label="Häufigkeit"
          dense
          outlined
          hide-details="auto"
          @change="onFrequencyChange"
        />
      </v-col>

      <v-col v-if="frequency === 'minutely'" cols="12" md="4">
        <v-text-field
          v-model.number="everyMinutes"
          type="number"
          min="1"
          max="59"
          label="alle ... Minuten"
          dense
          outlined
          hide-details="auto"
          @input="emitChange"
        />
      </v-col>

      <v-col v-if="frequency === 'hourly'" cols="12" md="4">
        <v-text-field
          v-model.number="minute"
          type="number"
          min="0"
          max="59"
          label="zur Minute"
          dense
          outlined
          hide-details="auto"
          @input="emitChange"
        />
      </v-col>

      <v-col
        v-if="['daily', 'weekly', 'monthly'].includes(frequency)"
        cols="12"
        md="4"
      >
        <v-text-field
          v-model="time"
          type="time"
          label="Uhrzeit"
          dense
          outlined
          hide-details="auto"
          @input="emitChange"
        />
      </v-col>

      <v-col v-if="frequency === 'monthly'" cols="12" md="4">
        <v-text-field
          v-model.number="dayOfMonth"
          type="number"
          min="1"
          max="31"
          label="am Tag des Monats"
          dense
          outlined
          hide-details="auto"
          @input="emitChange"
        />
      </v-col>

      <v-col v-if="frequency === 'custom'" cols="12" md="8">
        <v-text-field
          v-model="customCron"
          label="Cron-Ausdruck"
          placeholder="*/5 * * * *"
          dense
          outlined
          hide-details="auto"
          @input="emitChange"
        >
          <template v-slot:append-outer>
            <v-tooltip bottom>
              <template v-slot:activator="{ on, attrs }">
                <v-icon v-bind="attrs" v-on="on"
                  >mdi-help-circle-outline</v-icon
                >
              </template>
              <span>
                Format: Minute Stunde Tag Monat Wochentag<br />
                */5 * * * * = alle 5 Minuten<br />
                0 3 * * * = täglich um 03:00 Uhr
              </span>
            </v-tooltip>
          </template>
        </v-text-field>
      </v-col>
    </v-row>

    <div v-if="frequency === 'weekly'" class="mt-2">
      <div class="text-caption grey--text mb-1">An welchen Wochentagen?</div>
      <v-chip-group
        v-model="weekdays"
        multiple
        column
        active-class="primary--text"
        @change="emitChange"
      >
        <v-chip
          v-for="day in weekdayItems"
          :key="day.value"
          :value="day.value"
          filter
          small
          outlined
        >
          {{ day.text }}
        </v-chip>
      </v-chip-group>
    </div>

    <div class="text-caption grey--text mt-2">
      Erzeugter Cron-Ausdruck: <code>{{ cron }}</code>
      <span class="ml-2">{{ humanReadable }}</span>
    </div>
  </div>
</template>

<script>
const WEEKDAYS = [
  { value: 1, text: "Mo" },
  { value: 2, text: "Di" },
  { value: 3, text: "Mi" },
  { value: 4, text: "Do" },
  { value: 5, text: "Fr" },
  { value: 6, text: "Sa" },
  { value: 0, text: "So" },
];

function isInt(str) {
  return /^\d+$/.test(str);
}

export default {
  name: "RuleScheduleBuilder",
  props: {
    value: {
      type: String,
      default: "",
    },
  },
  data() {
    const parsed = this.parse(this.value);
    return {
      frequency: parsed.frequency,
      everyMinutes: parsed.everyMinutes,
      minute: parsed.minute,
      time: parsed.time,
      dayOfMonth: parsed.dayOfMonth,
      weekdays: parsed.weekdays,
      customCron: parsed.customCron,
      frequencyItems: [
        { text: "Minütlich", value: "minutely" },
        { text: "Stündlich", value: "hourly" },
        { text: "Täglich", value: "daily" },
        { text: "Wöchentlich", value: "weekly" },
        { text: "Monatlich", value: "monthly" },
        { text: "Benutzerdefiniert (Cron)", value: "custom" },
      ],
      weekdayItems: WEEKDAYS,
    };
  },
  computed: {
    cron() {
      return this.build();
    },
    humanReadable() {
      const [h, m] = (this.time || "00:00").split(":");
      if (this.frequency === "minutely") {
        return this.everyMinutes > 1
          ? `(alle ${this.everyMinutes} Minuten)`
          : "(jede Minute)";
      }
      if (this.frequency === "hourly") {
        return `(stündlich zur Minute ${this.minute})`;
      }
      if (this.frequency === "daily") {
        return `(täglich um ${h}:${m} Uhr)`;
      }
      if (this.frequency === "weekly") {
        return this.weekdays.length
          ? `(wöchentlich ${this.selectedWeekdayLabels} um ${h}:${m} Uhr)`
          : "(bitte Wochentage wählen)";
      }
      if (this.frequency === "monthly") {
        return `(monatlich am ${this.dayOfMonth}. um ${h}:${m} Uhr)`;
      }
      return "";
    },
    selectedWeekdayLabels() {
      return WEEKDAYS.filter((d) => this.weekdays.includes(d.value))
        .map((d) => d.text)
        .join(", ");
    },
  },
  watch: {
    value(newVal) {
      if (newVal === this.build()) return;
      const parsed = this.parse(newVal);
      this.frequency = parsed.frequency;
      this.everyMinutes = parsed.everyMinutes;
      this.minute = parsed.minute;
      this.time = parsed.time;
      this.dayOfMonth = parsed.dayOfMonth;
      this.weekdays = parsed.weekdays;
      this.customCron = parsed.customCron;
    },
  },
  methods: {
    defaults() {
      return {
        frequency: "daily",
        everyMinutes: 5,
        minute: 0,
        time: "09:00",
        dayOfMonth: 1,
        weekdays: [1],
        customCron: "",
      };
    },
    parse(value) {
      const base = this.defaults();
      if (!value || !value.trim()) {
        return base;
      }
      const parts = value.trim().split(/\s+/);
      if (parts.length !== 5) {
        return { ...base, frequency: "custom", customCron: value };
      }
      const [min, hour, dom, mon, dow] = parts;

      if (mon !== "*") {
        return { ...base, frequency: "custom", customCron: value };
      }

      if (min === "*" && hour === "*" && dom === "*" && dow === "*") {
        return { ...base, frequency: "minutely", everyMinutes: 1 };
      }
      if (/^\*\/\d+$/.test(min) && hour === "*" && dom === "*" && dow === "*") {
        return {
          ...base,
          frequency: "minutely",
          everyMinutes: Number(min.split("/")[1]),
        };
      }
      if (isInt(min) && hour === "*" && dom === "*" && dow === "*") {
        return { ...base, frequency: "hourly", minute: Number(min) };
      }
      if (isInt(min) && isInt(hour) && dom === "*" && dow === "*") {
        return {
          ...base,
          frequency: "daily",
          time: this.toTime(hour, min),
        };
      }
      if (isInt(min) && isInt(hour) && dom === "*" && dow !== "*") {
        const days = dow
          .split(",")
          .map((d) => Number(d === "7" ? 0 : d))
          .filter((d) => !Number.isNaN(d));
        return {
          ...base,
          frequency: "weekly",
          time: this.toTime(hour, min),
          weekdays: days,
        };
      }
      if (isInt(min) && isInt(hour) && isInt(dom) && dow === "*") {
        return {
          ...base,
          frequency: "monthly",
          time: this.toTime(hour, min),
          dayOfMonth: Number(dom),
        };
      }
      return { ...base, frequency: "custom", customCron: value };
    },
    toTime(hour, min) {
      const pad = (n) => String(n).padStart(2, "0");
      return `${pad(Number(hour))}:${pad(Number(min))}`;
    },
    splitTime() {
      const [h, m] = (this.time || "00:00").split(":");
      return { h: Number(h) || 0, m: Number(m) || 0 };
    },
    build() {
      const { h, m } = this.splitTime();
      if (this.frequency === "minutely") {
        const n = Math.max(1, Number(this.everyMinutes) || 1);
        return n === 1 ? "* * * * *" : `*/${n} * * * *`;
      }
      if (this.frequency === "hourly") {
        return `${Number(this.minute) || 0} * * * *`;
      }
      if (this.frequency === "daily") {
        return `${m} ${h} * * *`;
      }
      if (this.frequency === "weekly") {
        const days = this.weekdays.length
          ? [...this.weekdays].sort((a, b) => a - b).join(",")
          : "*";
        return `${m} ${h} * * ${days}`;
      }
      if (this.frequency === "monthly") {
        return `${m} ${h} ${Number(this.dayOfMonth) || 1} * *`;
      }
      return this.customCron || "";
    },
    onFrequencyChange() {
      this.emitChange();
    },
    emitChange() {
      this.$emit("input", this.build());
    },
  },
};
</script>
