<template>
  <!-- PROTOTYPE (ECCdigital/tickets#519): das Farbfeld des Tabs „Portal“,
       hier mit „leer“ für die Akzentfarbe. -->
  <v-text-field
    :value="value || ''"
    :label="label"
    :placeholder="placeholder"
    :persistent-placeholder="!!placeholder"
    :hint="hint"
    :persistent-hint="!!hint"
    :hide-details="!hint"
    :clearable="clearable"
    background-color="accent"
    filled
    dense
    @input="$emit('input', $event || null)"
    @click:clear="$emit('input', null)"
  >
    <template #append>
      <v-menu offset-y :close-on-content-click="false">
        <template #activator="{ on, attrs }">
          <v-btn
            icon
            small
            v-bind="attrs"
            :style="{ backgroundColor: value || 'transparent' }"
            :class="{ 'proto-color-input__empty': !value }"
            v-on="on"
          >
            <v-icon small :color="value ? contrast : undefined">
              mdi-palette
            </v-icon>
          </v-btn>
        </template>
        <v-color-picker
          :value="value || '#4f46e5'"
          mode="hexa"
          hide-mode-switch
          show-swatches
          swatches-max-height="200px"
          @input="$emit('input', ($event || '').slice(0, 7))"
        />
      </v-menu>
    </template>
  </v-text-field>
</template>

<script>
import { contrastOf } from "./appearancePrototype";

export default {
  name: "ProtoColorInput",
  props: {
    value: { type: String, default: null },
    label: { type: String, default: "" },
    placeholder: { type: String, default: "" },
    hint: { type: String, default: "" },
    clearable: { type: Boolean, default: false },
  },
  computed: {
    contrast() {
      return contrastOf(this.value);
    },
  },
};
</script>

<style scoped>
.proto-color-input__empty {
  border: 1px dashed rgba(127, 127, 127, 0.6);
}
</style>
