<script>
import { mask } from "vue-the-mask";
import { formatGermanDate, parseGermanDate } from "@/utils/dateInput";

/**
 * A date to type or to pick, as the old checkout takes it: the field takes
 * „21.11.2026“ from the keyboard (masked `##.##.####`), and a click opens
 * Vuetify's date picker just beneath it (German, the week from Monday),
 * where a click on a day takes it. The value is `YYYY-MM-DD`; a typed text
 * is handed on once it names a real day, an emptied field as `null`. A text
 * that names none says so when the field is left, unless the caller checks
 * the text itself (`rules`). Other attributes (`label`, `rules`,
 * `error-messages`, `data-test` …) land on the field.
 */
export default {
  name: "DateField",
  directives: { mask },
  inheritAttrs: false,
  props: {
    value: { type: String, default: null },
    // The earliest date to pick, `YYYY-MM-DD`.
    min: { type: String, default: undefined },
    // The day the picker marks as today.
    showCurrent: { type: [Boolean, String], default: true },
  },
  data() {
    return {
      open: false,
      text: formatGermanDate(this.value),
      invalid: false,
    };
  },
  computed: {
    errorMessages() {
      // Where the caller checks the text with `rules`, its message is enough.
      if (this.invalid && !this.$attrs.rules) {
        return [this.$t("validation.date")];
      }
      return this.$attrs["error-messages"] || [];
    },
  },
  watch: {
    // A value from outside - the picker, a restore - shows as it is.
    value(value) {
      if (parseGermanDate(this.text) !== value) {
        this.text = formatGermanDate(value);
        this.invalid = false;
      }
    },
  },
  methods: {
    /**
     * The menu's own listeners, but the keyboard stays with the field:
     * typing hides the picker, Escape closes it and keeps the focus here,
     * the down arrow opens it.
     */
    fieldListeners(on) {
      return {
        ...on,
        keydown: (event) => {
          if (event.key === "ArrowDown") {
            this.open = true;
          } else if (event.key === "Escape") {
            event.stopPropagation();
            this.open = false;
          } else if (event.key !== "Tab") {
            this.open = false;
          }
        },
      };
    },
    onType(text) {
      this.text = text;
      this.invalid = false;
      if (!text) {
        if (this.value) this.$emit("input", null);
        return;
      }
      const iso = parseGermanDate(text);
      if (iso && iso !== this.value) this.$emit("input", iso);
    },
    onLeave() {
      this.invalid = !!this.text && !parseGermanDate(this.text);
    },
    pick(date) {
      this.open = false;
      this.text = formatGermanDate(date);
      this.invalid = false;
      if (date !== this.value) this.$emit("input", date);
    },
  },
};
</script>

<template>
  <v-menu
    v-model="open"
    :close-on-content-click="false"
    transition="scale-transition"
    offset-y
    min-width="auto"
  >
    <template v-slot:activator="{ on, attrs }">
      <v-text-field
        v-mask="'##.##.####'"
        :value="text"
        prepend-inner-icon="mdi-calendar"
        placeholder="TT.MM.JJJJ"
        inputmode="numeric"
        outlined
        dense
        v-bind="{ ...attrs, ...$attrs }"
        :error-messages="errorMessages"
        v-on="fieldListeners(on)"
        @input="onType"
        @blur="onLeave"
      />
    </template>
    <v-date-picker
      v-if="open"
      :value="value"
      :min="min"
      :show-current="showCurrent"
      scrollable
      locale="de"
      :first-day-of-week="1"
      @input="pick"
    />
  </v-menu>
</template>
