<!-- PROTOTYPE (ECCdigital/tickets#341), throwaway: never merge.
     The one chip input for Merkmale and Interne Tags; `variant` is only the
     Vuetify look (filled or outlined) the variant under test uses. -->
<template>
  <v-combobox
    :value="value"
    :items="items"
    :label="label"
    :hint="hint"
    :persistent-hint="!!hint"
    :hide-details="!hint"
    :filled="variant === 'filled'"
    :outlined="variant === 'outlined'"
    :background-color="variant === 'filled' ? 'accent' : undefined"
    no-data-text="Eingeben und mit Enter übernehmen"
    multiple
    chips
    small-chips
    deletable-chips
    hide-selected
    dense
    @change="$emit('change', $event)"
  />
</template>

<script>
export default {
  name: "ChipCombobox",
  props: {
    value: { type: Array, default: () => [] },
    items: { type: Array, default: () => [] },
    label: { type: String, default: "" },
    hint: { type: String, default: "" },
    variant: { type: String, default: "outlined" },
  },
};
</script>
