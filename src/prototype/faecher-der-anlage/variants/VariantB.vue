<script>
/**
 * PROTOTYPE (ECCdigital/tickets#1159) — Variante B „Vom Buchungsobjekt her“.
 * Throwaway, never merged.
 *
 * The Fächer are chosen where the Buchungsobjekt is edited, as three
 * questions: what lies in the Fach, how many book at the same time (that is
 * the Anzahl), which Fächer. The Anlage is a by-product: Biletado creates it
 * under the name of the Buchungsobjekt and assigns it.
 */
import FachGrid from "../FachGrid.vue";
import { clone, faecher, inService } from "../data";

export default {
  name: "VariantB",
  components: { FachGrid },
  props: {
    scenario: { type: Object, required: true },
  },
  data() {
    const b = this.scenario.bookable;
    const isEdit = this.scenario.compartments.length > 0;
    return {
      bookable: clone(b),
      storedAmount: b.amount,
      // A new Anlage starts unanswered; a stored one with its answer.
      use: isEdit ? this.scenario.use : null,
      amount: b.amount || null,
      compartments: clone(this.scenario.compartments),
    };
  },
  computed: {
    isEdit() {
      return this.scenario.compartments.length > 0;
    },
    want() {
      if (this.use === "key") return 1;
      if (this.use === "item") return Number(this.amount) || 0;
      return 0;
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
    progress() {
      if (!this.want) return 0;
      return Math.min(100, (this.inService / this.want) * 100);
    },
    amountNote() {
      const stored = this.storedAmount;
      if (this.use === "key") {
        if (stored === 1) return "Die Anzahl bleibt 1.";
        return `Die Anzahl wird 1 (bisher ${stored || "unbegrenzt"}).`;
      }
      if (!stored) {
        return "Bisher ist die Anzahl unbegrenzt. Mit Fächern braucht sie eine Zahl, denn jede Buchung braucht ein eigenes Fach.";
      }
      if (Number(this.amount) !== stored) {
        return `Das ist die Anzahl dieses Buchungsobjekts. Sie ändert sich von ${stored} auf ${this.amount}.`;
      }
      return "Das ist die Anzahl dieses Buchungsobjekts.";
    },
    fit() {
      const want = this.want;
      const n = this.inService;
      if (!want) return null;
      if (!this.count) {
        return {
          tone: "neutral",
          text: `Wählen Sie ${faecher(want)}.`,
        };
      }
      if (n === want) {
        return {
          tone: "ok",
          text:
            want === 1
              ? "Passt: 1 Fach für den Schlüssel."
              : `Passt: ${want} Fächer für ${want} Buchungen zur selben Zeit.`,
        };
      }
      if (n < want) {
        const missing = want - n;
        return {
          tone: "warn",
          text: `Es ${
            missing === 1
              ? "fehlt noch 1 Fach"
              : `fehlen noch ${missing} Fächer`
          }${this.off ? " in Betrieb" : ""}. Bis dahin ist „${
            this.bookable.name
          }“ nur ${n}-mal zur selben Zeit buchbar.`,
        };
      }
      return {
        tone: "info",
        text: `${faecher(n)} in Betrieb, gebraucht ${
          want === 1 ? "wird 1" : `werden ${want}`
        }. ${
          n - want === 1 ? "1 Fach bleibt" : `${n - want} Fächer bleiben`
        } frei und springt ein, wenn ein Fach außer Betrieb geht.`,
      };
    },
    faecherText() {
      return faecher(this.want);
    },
    canSave() {
      return this.use && this.want > 0 && this.count > 0;
    },
  },
  watch: {
    use(use) {
      if (use === "key") this.amount = 1;
      if (use === "item" && this.amount === 1 && this.storedAmount !== 1) {
        this.amount = this.storedAmount || null;
      }
    },
  },
  methods: {
    step(n) {
      this.amount = Math.max(1, (Number(this.amount) || 0) + n);
    },
    save() {
      this.$emit(
        "stub",
        this.isEdit
          ? `Prototyp: Anzahl ${this.want} und ${faecher(
              this.count
            )} gespeichert.`
          : `Prototyp: Schließfachanlage „${this.bookable.name}“ mit ${faecher(
              this.count
            )} angelegt und zugeordnet, Anzahl ${this.want}.`
      );
    },
  },
};
</script>

<template>
  <div class="bookable-page">
    <!-- Mock of the editing page of the Buchungsobjekt -->
    <div class="text-caption text--secondary mb-1">
      Buchungsobjekte › {{ bookable.typeLabel }}
    </div>
    <div class="d-flex align-center mb-3">
      <span class="text-h5">{{ bookable.name }}</span>
    </div>
    <div class="fake-tabs mb-4">
      <span>Grunddaten</span>
      <span>Preise &amp; Kapazität</span>
      <span>Buchung</span>
      <span class="fake-tabs__active">Zugang</span>
    </div>

    <v-card outlined class="pa-5">
      <div class="d-flex align-center mb-1">
        <v-icon class="mr-2">mdi-locker-multiple</v-icon>
        <span class="text-h6">Fächer von Open Locker</span>
      </div>
      <div class="text-body-2 text--secondary mb-5">
        Buchende öffnen in der App ihr Fach. Jede Buchung bekommt für ihre Zeit
        ein eigenes.
      </div>

      <!-- 1 -->
      <div class="step">
        <div class="step__no">1</div>
        <div class="step__body">
          <div class="step__q">Was liegt im Fach?</div>
          <div class="choices">
            <div
              class="choice"
              :class="{ 'choice--on': use === 'key' }"
              @click="use = 'key'"
            >
              <v-icon large class="mb-1">mdi-key-variant</v-icon>
              <div class="font-weight-medium">Ein Schlüssel</div>
              <div class="text-caption text--secondary">
                etwa für einen Raum. Wer bucht, holt ihn ab und legt ihn zurück.
              </div>
            </div>
            <div
              class="choice"
              :class="{ 'choice--on': use === 'item' }"
              @click="use = 'item'"
            >
              <v-icon large class="mb-1">mdi-bike</v-icon>
              <div class="font-weight-medium">Das Gebuchte selbst</div>
              <div class="text-caption text--secondary">
                Fahrrad, Tablet, Werkzeug: je Stück ein Fach.
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 2 -->
      <div class="step" :class="{ 'step--dim': !use }">
        <div class="step__no">2</div>
        <div class="step__body">
          <div class="step__q">Wie viele können zur selben Zeit buchen?</div>
          <template v-if="use === 'key'">
            <div class="text-body-2">
              <strong>1</strong>. Den Schlüssel hat immer nur eine Person.
            </div>
          </template>
          <template v-else-if="use === 'item'">
            <div class="d-flex align-center">
              <v-btn icon outlined small @click="step(-1)">
                <v-icon>mdi-minus</v-icon>
              </v-btn>
              <v-text-field
                v-model.number="amount"
                type="number"
                min="1"
                outlined
                dense
                hide-details
                placeholder="?"
                class="amount-field mx-2"
              />
              <v-btn icon outlined small @click="step(1)">
                <v-icon>mdi-plus</v-icon>
              </v-btn>
              <span class="ml-3 text-body-2">
                {{ Number(amount) === 1 ? "Buchung" : "Buchungen" }} zur selben
                Zeit
              </span>
            </div>
          </template>
          <div v-if="use" class="text-caption text--secondary mt-2">
            <v-icon x-small class="mr-1">mdi-layers-outline</v-icon>
            {{ amountNote }}
          </div>
        </div>
      </div>

      <!-- 3 -->
      <div class="step" :class="{ 'step--dim': !want }">
        <div class="step__no">3</div>
        <div class="step__body">
          <div class="step__q">
            Dafür braucht es {{ want ? faecherText : "Fächer" }}. Welche?
          </div>
          <template v-if="want">
            <div class="d-flex align-center mb-2">
              <v-progress-linear
                :value="progress"
                height="8"
                rounded
                :color="inService >= want ? 'success' : 'primary'"
                class="mr-3"
                style="max-width: 240px"
              />
              <span class="text-body-2">
                {{ inService }} von {{ want }}
                <span v-if="off" class="text--secondary"
                  >(+{{ off }} außer Betrieb)</span
                >
              </span>
            </div>
            <FachGrid v-model="compartments" :want="want" />
            <div v-if="fit" class="fit mt-2" :class="`fit--${fit.tone}`">
              {{ fit.text }}
            </div>
          </template>
        </div>
      </div>

      <v-divider class="my-4" />
      <div class="d-flex align-center">
        <div class="text-caption text--secondary mr-4">
          <template v-if="!isEdit">
            Beim Speichern legt Biletado die Schließfachanlage „{{
              bookable.name
            }}“ an und ordnet sie zu. Unter Zugangspunkte finden Sie sie mit den
            QR-Codes zum Drucken.
          </template>
          <template v-else>
            Die Schließfachanlage „{{ scenario.anlageLabel }}“ steht auch unter
            Zugangspunkte.
          </template>
        </div>
        <v-spacer />
        <v-btn color="primary" depressed :disabled="!canSave" @click="save">
          Speichern
        </v-btn>
      </div>
    </v-card>
  </div>
</template>

<style scoped>
.bookable-page {
  max-width: 820px;
  margin: 0 auto;
}

.fake-tabs {
  display: flex;
  gap: 24px;
  border-bottom: 1px solid #e0e0e0;
  font-size: 14px;
  color: #777;
}

.fake-tabs span {
  padding: 8px 0;
}

.fake-tabs__active {
  color: var(--v-primary-base);
  border-bottom: 2px solid var(--v-primary-base);
  font-weight: 500;
}

.step {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  transition: opacity 0.2s;
}

.step--dim {
  opacity: 0.35;
  pointer-events: none;
}

.step__no {
  flex: 0 0 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--v-primary-base);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.step__body {
  flex: 1;
}

.step__q {
  font-weight: 500;
  font-size: 16px;
  margin-bottom: 10px;
}

.choices {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.choice {
  flex: 1 1 200px;
  max-width: 280px;
  padding: 14px;
  border: 1px solid #ccc;
  border-radius: 8px;
  cursor: pointer;
}

.choice--on {
  border: 2px solid var(--v-primary-base);
  background: rgba(25, 118, 210, 0.05);
  padding: 13px;
}

.amount-field {
  max-width: 80px;
}

.fit {
  font-size: 13px;
  padding: 8px 10px;
  border-radius: 6px;
  max-width: 560px;
}

.fit--ok {
  background: #e8f5e9;
}

.fit--warn {
  background: #fff4e5;
}

.fit--info,
.fit--neutral {
  background: #f6f7f9;
}
</style>
