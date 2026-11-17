<script>
import { mask } from "vue-the-mask";
import { parseTime } from "@/utils/dateInput";

/**
 * A time to type or to pick, as the old checkout takes it: the field takes
 * „10:30“ from the keyboard (masked `##:##`) with „Uhr“ behind it, and a
 * click opens Vuetify's time picker just beneath it, 24 hours, closed once
 * the minute is picked. The value is `HH:MM`; a typed text is handed on once
 * it names a time of day, an emptied field as `null`. A text that names
 * none says so when the field is left, unless the caller checks the text
 * itself (`rules`). Other attributes (`label`, `rules`, `error`,
 * `data-test` …) land on the field.
 */
export default {
  name: "TimeField",
  directives: { mask },
  inheritAttrs: false,
  props: {
    value: { type: String, default: null },
    // The earliest and latest time to pick, `HH:MM`, and the minutes offered.
    min: { type: String, default: undefined },
    max: { type: String, default: undefined },
    allowedMinutes: { type: Array, default: undefined },
  },
  data() {
    return { open: false, text: this.value || "", invalid: false };
  },
  computed: {
    errorMessages() {
      // Where the caller checks the text with `rules`, its message is enough.
      if (this.invalid && !this.$attrs.rules) {
        return [this.$t("validation.time")];
      }
      return this.$attrs["error-messages"] || [];
    },
  },
  watch: {
    // A value from outside - the picker, a restore - shows as it is.
    value(value) {
      if (parseTime(this.text) !== value) {
        this.text = value || "";
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
      const time = parseTime(text);
      if (time && time !== this.value) this.$emit("input", time);
    },
    onLeave() {
      this.invalid = !!this.text && !parseTime(this.text);
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
    max-width="290px"
    min-width="290px"
  >
    <template v-slot:activator="{ on, attrs }">
      <v-text-field
        v-mask="'##:##'"
        :value="text"
        prepend-inner-icon="mdi-clock-outline"
        :suffix="text ? $t('bookable.edit.common.clock') : ''"
        placeholder="HH:MM"
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
    <v-time-picker
      v-if="open"
      :value="value"
      :min="min"
      :max="max"
      :allowed-minutes="allowedMinutes"
      format="24hr"
      full-width
      @input="$emit('input', $event)"
      @click:minute="open = false"
    />
  </v-menu>
</template>
