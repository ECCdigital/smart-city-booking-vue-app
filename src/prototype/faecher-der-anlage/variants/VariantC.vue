<script>
/**
 * PROTOTYPE (ECCdigital/tickets#1159) — Variante C „Anzahl aus den Fächern“.
 * Throwaway, never merged.
 *
 * The Verwaltung only chooses Fächer. Biletado takes the Anzahl of the
 * Buchungsobjekt from the Fächer in Betrieb, so the card „Anzahl“ of the
 * Buchungsobjekt is read-only while an Anlage is assigned, like a provider
 * that handles the Anzahl. Left the dialog, right the card it feeds.
 */
import FachGrid from "../FachGrid.vue";
import { clone, faecher, inService } from "../data";

export default {
  name: "VariantC",
  components: { FachGrid },
  props: {
    scenario: { type: Object, required: true },
  },
  data() {
    return {
      label: this.scenario.anlageLabel,
      bookable: clone(this.scenario.bookable),
      compartments: clone(this.scenario.compartments),
      maxLimited: false,
    };
  },
  computed: {
    isEdit() {
      return this.scenario.compartments.length > 0;
    },
    count() {
      return this.compartments.length;
    },
    inService() {
      return inService(this.compartments);
    },
    off() {
      return this.count - this.inService;
    },
    stored() {
      return this.bookable.amount;
    },
    derivedLine() {
      if (!this.count) return "";
      const n = this.inService;
      const tail = this.off
        ? ` (${faecher(this.count)}, davon ${this.off} außer Betrieb)`
        : "";
      return n === 1
        ? `Damit ist „${this.bookable.name}“ einmal zur selben Zeit buchbar${tail}.`
        : `Damit ist „${this.bookable.name}“ ${n}-mal zur selben Zeit buchbar${tail}.`;
    },
    storedNote() {
      if (this.isEdit) return "";
      if (!this.count) return "";
      const before = this.stored ? this.stored : "unbegrenzt";
      if (this.stored === this.inService) return "";
      return `Bisher eingetragen: ${before}. Ab dem Speichern zählen die Fächer.`;
    },
  },
  methods: {
    save() {
      this.$emit(
        "stub",
        `Prototyp: „${this.label}“ mit ${faecher(
          this.count
        )} gespeichert. Anzahl von „${this.bookable.name}“: ${this.inService}.`
      );
    },
  },
};
</script>

<template>
  <div class="two">
    <!-- Left: the dialog of the Anlage -->
    <div>
      <div class="pane-title">Zugangspunkte › Dialog</div>
      <v-card outlined class="dialog-frame">
        <v-card-title class="d-flex align-center py-4 px-6">
          <v-icon left>mdi-locker-multiple</v-icon>
          <span class="text-h5">
            Schließfachanlage {{ isEdit ? "bearbeiten" : "anlegen" }}
          </span>
          <span class="text-body-2 text--secondary ml-3">Open Locker</span>
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-6">
          <v-text-field v-model="label" label="Bezeichnung" outlined dense />
          <div class="assigned mb-4">
            <v-icon small class="mr-2">mdi-link-variant</v-icon>
            <span>
              Für <strong>{{ bookable.name }}</strong>
            </span>
          </div>

          <div class="field-title">Fächer</div>
          <div class="text-caption text--secondary mb-3">
            Ein Fach je Buchung zur selben Zeit: für den Schlüssel eines Raums 1
            Fach, für Fahrradboxen oder Geräte je Box oder Gerät eins. Die
            Anzahl des Buchungsobjekts folgt daraus.
          </div>
          <FachGrid v-model="compartments" />

          <div v-if="derivedLine" class="derived mt-2">
            <v-icon small class="mr-2">mdi-arrow-right</v-icon>
            {{ derivedLine }}
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="px-6 py-3">
          <v-spacer />
          <v-btn text>Abbrechen</v-btn>
          <v-btn
            color="primary"
            depressed
            :disabled="!count || !label"
            @click="save"
          >
            {{ isEdit ? "Speichern" : "Anlegen" }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </div>

    <!-- Right: what the Buchungsobjekt then shows -->
    <div>
      <div class="pane-title">
        Buchungsobjekt „{{ bookable.name }}“ › Preise &amp; Kapazität
      </div>
      <div class="amount-box mb-3">
        <div class="amount-box__q">
          <v-icon small>mdi-layers-outline</v-icon>
          Anzahl / Kapazität
        </div>
        <template v-if="count">
          <div class="from-lockers">
            <div class="from-lockers__value">{{ inService }}</div>
            <div>
              <div class="font-weight-medium">
                Kommt aus der Schließfachanlage „{{ label }}“
              </div>
              <div class="text-caption text--secondary">
                Je Fach in Betrieb eine Buchung zur selben Zeit.
                <template v-if="off">
                  {{ off }} {{ off === 1 ? "Fach ist" : "Fächer sind" }}
                  außer Betrieb und
                  {{ off === 1 ? "zählt" : "zählen" }} nicht mit.
                </template>
                Mehr Fächer wählen Sie unter
                <a href="#" @click.prevent>Zugangspunkte</a>.
              </div>
            </div>
          </div>
          <div v-if="storedNote" class="text-caption text--secondary mt-2">
            <v-icon x-small class="mr-1">mdi-history</v-icon>{{ storedNote }}
          </div>
        </template>
        <template v-else>
          <div class="text-body-2">
            {{ stored ? stored : "Unbegrenzt" }}
            <span class="text-caption text--secondary ml-2">
              (von Hand, solange die Anlage kein Fach hat)
            </span>
          </div>
        </template>
      </div>

      <div class="amount-box">
        <div class="amount-box__q">
          <v-icon small>mdi-cart-arrow-down</v-icon>
          Höchstmenge je Buchung
        </div>
        <v-btn-toggle v-model="maxLimited" mandatory dense color="primary">
          <v-btn :value="true" small text>Begrenzt</v-btn>
          <v-btn :value="false" small text>Unbegrenzt</v-btn>
        </v-btn-toggle>
        <div class="text-caption text--secondary mt-2">
          Bleibt von Hand: Eine Buchung darf alle freien Einheiten nehmen, hier
          also alle freien Fächer.
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.two {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  gap: 32px;
  align-items: start;
}

@media (max-width: 1100px) {
  .two {
    grid-template-columns: 1fr;
  }
}

.pane-title {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #888;
  margin-bottom: 8px;
}

.dialog-frame {
  box-shadow: 0 11px 15px -7px rgba(0, 0, 0, 0.2),
    0 24px 38px 3px rgba(0, 0, 0, 0.14) !important;
}

.field-title {
  font-weight: 500;
  margin-bottom: 4px;
}

.assigned {
  display: flex;
  align-items: center;
  font-size: 14px;
  padding: 8px 12px;
  border-radius: 6px;
  background: #f6f7f9;
}

.derived {
  display: flex;
  align-items: flex-start;
  font-size: 13px;
  padding: 8px 10px;
  border-radius: 6px;
  background: #e8f0fb;
}

.amount-box {
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 16px;
  background: #fff;
}

.amount-box__q {
  font-weight: 500;
  margin-bottom: 10px;
}

.from-lockers {
  display: flex;
  align-items: center;
  gap: 16px;
}

.from-lockers__value {
  font-size: 34px;
  font-weight: 600;
  min-width: 44px;
  text-align: center;
  padding: 4px 8px;
  border-radius: 8px;
  background: #f6f7f9;
}
</style>
