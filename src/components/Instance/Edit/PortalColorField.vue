<template>
  <v-text-field
    ref="field"
    :value="value"
    :label="label"
    :placeholder="placeholder || undefined"
    :persistent-placeholder="!!placeholder"
    :clearable="clearable"
    :rules="rules"
    :hide-details="!rules.length"
    background-color="accent"
    filled
    dense
    @input="emit"
  >
    <template v-slot:append>
      <v-menu offset-y :close-on-content-click="false">
        <template v-slot:activator="{ on, attrs }">
          <v-btn
            icon
            small
            v-bind="attrs"
            v-on="on"
            :class="{ 'portal-color-field__swatch--empty': !value }"
            :style="{ backgroundColor: value || 'transparent' }"
          >
            <v-icon small :color="value ? contrast : undefined">
              mdi-palette
            </v-icon>
          </v-btn>
        </template>
        <v-color-picker
          :value="pickerValue"
          mode="hexa"
          show-swatches
          swatches-max-height="200px"
          @input="onPick"
        ></v-color-picker>
      </v-menu>
    </template>
  </v-text-field>
</template>

<script>
import { contrastOf } from "@/utils/brandingContrast";

// What the picker opens on while the field is empty. Upper case, as the
// picker writes hex: a value it would rewrite on opening would read as an
// edit, and an empty field would be filled without a pick.
const EMPTY_PICKER_VALUE = "#FFFFFF";
const HEX_LONG = /^#[0-9a-f]{6}$/i;

/**
 * A colour of the branding: a text field with a colour picker. An `opaque`
 * colour is stored as `#rrggbb`, so the picker's alpha never reaches it.
 */
export default {
  name: "PortalColorField",
  props: {
    value: { type: String, default: "" },
    label: { type: String, required: true },
    placeholder: { type: String, default: "" },
    clearable: { type: Boolean, default: false },
    opaque: { type: Boolean, default: false },
    rules: { type: Array, default: () => [] },
  },
  computed: {
    contrast() {
      return contrastOf(this.value);
    },
    pickerValue() {
      if (!this.value) {
        return EMPTY_PICKER_VALUE;
      }
      return HEX_LONG.test(this.value) ? this.value.toUpperCase() : this.value;
    },
  },
  methods: {
    emit(value) {
      // A cleared field reads `null`; the branding stores an empty string.
      this.$emit("input", value || "");
    },
    onPick(value) {
      if (typeof value !== "string") {
        return;
      }
      this.emit(this.opaque ? value.slice(0, 7) : value);
    },
    validate(force) {
      return this.$refs.field.validate(force);
    },
    resetValidation() {
      this.$refs.field.resetValidation();
    },
  },
};
</script>

<style scoped>
.portal-color-field__swatch--empty {
  border: 1px dashed var(--scb-surface-border);
}
</style>
