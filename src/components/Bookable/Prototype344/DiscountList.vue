<!-- PROTOTYPE (ECCdigital/tickets#344), throwaway: never merge.
     A discount list as rows (name, percent, remove) with an add row; every
     change goes out as an event, nothing is changed in place. -->
<template>
  <div class="p344-discounts">
    <div class="p344-discounts__label">
      <v-icon small class="mr-1">
        {{ type === "user" ? "mdi-account" : "mdi-account-group" }}
      </v-icon>
      {{ label }}
    </div>
    <div
      v-for="(entry, index) in entries"
      :key="entry[idKey] || index"
      class="p344-row"
    >
      <span class="p344-row__name">{{ labelOf(entry[idKey]) }}</span>
      <v-text-field
        class="p344-row__percent"
        :value="entry.discountPercent"
        type="number"
        min="0"
        max="100"
        step="1"
        suffix="%"
        outlined
        dense
        hide-details="auto"
        :error-messages="errorOf(entry.discountPercent)"
        :aria-label="percentLabel"
        @input="$emit('set', index, $event)"
      />
      <v-btn icon small title="Entfernen" @click="$emit('remove', index)">
        <v-icon small>mdi-close</v-icon>
      </v-btn>
    </div>
    <div class="p344-row">
      <v-autocomplete
        v-model="newId"
        class="p344-row__name"
        :items="addable"
        :item-text="type === 'user' ? 'label' : 'name'"
        :item-value="idKey === 'userId' ? 'userId' : 'id'"
        :label="type === 'user' ? 'Person wählen' : 'Rolle wählen'"
        outlined
        dense
        hide-details
      />
      <v-btn small text color="primary" :disabled="!newId" @click="add">
        <v-icon left small>mdi-plus</v-icon>{{ addLabel }}
      </v-btn>
    </div>
  </div>
</template>

<script>
import { percentError } from "./permShared";

export default {
  name: "DiscountList",
  props: {
    type: { type: String, required: true },
    entries: { type: Array, default: () => [] },
    items: { type: Array, default: () => [] },
    label: { type: String, required: true },
    percentLabel: { type: String, default: "Nachlass" },
    addLabel: { type: String, default: "Hinzufügen" },
    labelOf: { type: Function, required: true },
  },
  data() {
    return { newId: null };
  },
  computed: {
    idKey() {
      return this.type === "user" ? "userId" : "roleId";
    },
    addable() {
      const taken = this.entries.map((e) => e[this.idKey]);
      const key = this.type === "user" ? "userId" : "id";
      return this.items.filter((i) => !taken.includes(i[key]));
    },
  },
  methods: {
    errorOf(value) {
      const error = percentError(value);
      return error ? [error] : [];
    },
    add() {
      this.$emit("add", this.newId);
      this.newId = null;
    },
  },
};
</script>
