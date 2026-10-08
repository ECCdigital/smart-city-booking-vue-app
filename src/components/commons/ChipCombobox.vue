<script>
/**
 * The one chip input of a list of short texts, such as the Merkmale and the
 * Interne Tags of a bookable: a text is typed and taken with Enter, a chip
 * goes with its cross. `items` are suggestions only; any text can be taken.
 * Every change hands on the whole new list as `change`, the `value` handed
 * in is never changed. `emptyText` says how to take a text while no
 * suggestion fits. Attributes such as `data-test` land on the field.
 */
export default {
  name: "ChipCombobox",
  props: {
    value: { type: Array, default: () => [] },
    items: { type: Array, default: () => [] },
    label: { type: String, required: true },
    hint: { type: String, default: "" },
    emptyText: { type: String, default: "" },
  },
};
</script>

<template>
  <v-combobox
    :value="value"
    :items="items"
    :label="label"
    :hint="hint"
    :no-data-text="emptyText"
    persistent-hint
    multiple
    small-chips
    deletable-chips
    hide-selected
    outlined
    dense
    @change="$emit('change', $event)"
  />
</template>
