<script>
/**
 * PROTOTYPE (tickets#1084) — assign one Zugangspunkt to Buchungsobjekte
 * right here, instead of on the Buchungsobjekt. Writes only to the stub store.
 */
import { BOOKABLES, assign } from "./data";

export default {
  name: "AssignDialog",
  props: {
    value: Boolean,
    accessPoint: { type: Object, default: null },
  },
  data() {
    return { selected: [] };
  },
  computed: {
    bookables() {
      return BOOKABLES;
    },
  },
  watch: {
    value(open) {
      if (open) this.selected = [...(this.accessPoint?.bookableIds || [])];
    },
  },
  methods: {
    close() {
      this.$emit("input", false);
    },
    submit() {
      assign(this.accessPoint.id, this.selected);
      this.$emit("assigned", this.accessPoint);
      this.close();
    },
  },
};
</script>

<template>
  <v-dialog :value="value" max-width="480" @input="$emit('input', $event)">
    <v-card v-if="accessPoint">
      <v-card-title>Buchungsobjekte für {{ accessPoint.label }}</v-card-title>
      <v-card-subtitle class="pt-1">
        Wer eines davon bucht, bekommt für die Buchungszeit Zutritt.
      </v-card-subtitle>
      <v-card-text class="pb-0">
        <v-checkbox
          v-for="b in bookables"
          :key="b.id"
          v-model="selected"
          :value="b.id"
          dense
          hide-details
          class="mt-1"
        >
          <template #label>
            <span>{{ b.name }}</span>
            <span class="text--secondary ml-2">{{ b.place }}</span>
          </template>
        </v-checkbox>
      </v-card-text>
      <v-card-actions class="mt-4">
        <v-spacer />
        <v-btn text @click="close">Abbrechen</v-btn>
        <v-btn color="primary" depressed @click="submit">Zuordnen</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
