<script>
/**
 * PROTOTYPE (tickets#1095) — the dialog to edit a Schließfachanlage as decided
 * in tickets#1085 (Variante A), cut down to what this question needs: the
 * Fächer. Fixed frame, the same in all variants. What a variant says about
 * the bookings comes in through `markFor`, `intercept` and the slots.
 */
import FachGrid from "./FachGrid.vue";
import { faecherOf } from "./folgen";

export default {
  name: "AnlageEdit",
  components: { FachGrid },
  props: {
    value: { type: Boolean, default: false },
    row: { type: Object, default: null },
    initial: { type: Array, default: null }, // kept ids from a case preset
    markFor: { type: Function, default: () => null }, // (fach, kept)
    activeFor: { type: Function, default: () => false },
    // (fach, event, kept) → true when the variant handles the click itself
    intercept: { type: Function, default: () => false },
    saveLabel: { type: String, default: "Speichern" },
  },
  data() {
    return { kept: [] };
  },
  computed: {
    faecher() {
      return this.row ? faecherOf(this.row) : [];
    },
    count() {
      return this.kept.length;
    },
  },
  watch: {
    value: {
      immediate: true,
      handler(open) {
        if (!open || !this.row) return;
        this.kept =
          this.initial ||
          this.faecher.filter((f) => f.inAnlage).map((f) => f.id);
      },
    },
  },
  methods: {
    toggle(fach, e) {
      if (this.intercept(fach, e, this.kept)) return;
      this.set(fach, !this.kept.includes(fach.id));
    },
    set(fach, on) {
      this.kept = on
        ? [...new Set([...this.kept, fach.id])]
        : this.kept.filter((id) => id !== fach.id);
    },
    save() {
      this.$emit("save", [...this.kept]);
    },
  },
};
</script>

<template>
  <v-dialog
    :value="value"
    max-width="640"
    scrollable
    @input="$emit('input', $event)"
  >
    <v-card v-if="row">
      <v-card-title class="d-block pb-2">
        <div class="text-h6">{{ row.label }} bearbeiten</div>
        <div class="text-caption text--secondary">
          Schließfachanlage · Open Locker · {{ count }} Fächer
        </div>
      </v-card-title>
      <v-divider />
      <v-card-text class="pt-4">
        <v-text-field
          :value="row.label"
          label="Bezeichnung"
          outlined
          dense
          hide-details
          class="mb-4"
        />
        <div class="d-flex align-center mb-2">
          <span class="text-body-2 font-weight-medium">Fächer der Anlage</span>
          <v-spacer />
          <span class="text-caption text--secondary">
            Biletado teilt jeder Buchung ein freies Fach zu.
          </span>
        </div>
        <FachGrid
          :faecher="faecher"
          :value="kept"
          :mark-for="(f) => markFor(f, kept)"
          :active-for="activeFor"
          @toggle="toggle"
        />
        <slot name="below-grid" :kept="kept" />
        <div class="more-settings mt-4">
          <v-icon small class="mr-1">mdi-chevron-right</v-icon>
          Weitere Einstellungen
          <span class="text-caption text--secondary ml-2"
            >QR-Scan verlangt · Standort</span
          >
        </div>
      </v-card-text>
      <v-divider />
      <slot name="footer" :kept="kept" :save="save">
        <v-card-actions class="px-6 py-3">
          <v-spacer />
          <v-btn text @click="$emit('input', false)">Abbrechen</v-btn>
          <v-btn color="primary" depressed @click="save">{{ saveLabel }}</v-btn>
        </v-card-actions>
      </slot>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.more-settings {
  display: flex;
  align-items: center;
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text-muted);
}
</style>
