<script>
/**
 * PROTOTYPE (ECCdigital/tickets#1159) — Variante A „Beispiel im Dialog“.
 * Throwaway, never merged.
 *
 * The dialog of the Schließfachanlage explains the Einsatzfall with examples
 * rather than with what Biletado does, asks (optionally) for the
 * Buchungsobjekt, and shows beside the Fächer what its `amount` makes of
 * them. `amount` stays independent; the dialog only offers to align it.
 */
import FachGrid from "../FachGrid.vue";
import { BOOKABLES, clone, faecher, inService } from "../data";

export default {
  name: "VariantA",
  components: { FachGrid },
  props: {
    scenario: { type: Object, required: true },
  },
  data() {
    return {
      label: this.scenario.anlageLabel,
      bookableId: this.scenario.bookable.id,
      bookables: clone(BOOKABLES),
      compartments: clone(this.scenario.compartments),
    };
  },
  computed: {
    isEdit() {
      return this.scenario.compartments.length > 0;
    },
    bookableItems() {
      return [
        { value: null, text: "Später zuordnen" },
        ...this.bookables.map((b) => ({
          value: b.id,
          text: b.name,
          b,
        })),
      ];
    },
    bookable() {
      return this.bookables.find((b) => b.id === this.bookableId) || null;
    },
    amount() {
      return this.bookable ? this.bookable.amount : undefined;
    },
    unlimited() {
      return this.bookable && !this.amount;
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
    // How many bookings can run at the same time.
    concurrent() {
      if (!this.bookable || this.unlimited) return this.inService;
      return Math.min(this.amount, this.inService);
    },
    // The slots the meter draws: every Fach, and the Anzahl beyond them.
    slots() {
      const total = Math.max(
        this.count,
        this.bookable && !this.unlimited ? this.amount : 0
      );
      const out = [];
      let i = 0;
      this.compartments
        .filter((c) => !c.outOfService)
        .forEach((c) => {
          i++;
          const used = this.unlimited || !this.bookable || i <= this.amount;
          out.push({ key: c.id, kind: used ? "used" : "spare", text: "" });
        });
      this.compartments
        .filter((c) => c.outOfService)
        .forEach((c) => out.push({ key: c.id, kind: "off" }));
      while (out.length < total) {
        out.push({ key: `missing-${out.length}`, kind: "missing" });
      }
      return out;
    },
    verdict() {
      const n = this.inService;
      if (!this.count) {
        return {
          tone: "neutral",
          icon: "mdi-gesture-tap",
          text: "Noch kein Fach gewählt. Klicken Sie links die Fächer an, die zu dieser Anlage gehören.",
        };
      }
      if (!this.bookable) {
        return {
          tone: "neutral",
          icon: "mdi-information-outline",
          text: `Zur selben Zeit buchbar: ${n}, je Fach in Betrieb eine Buchung. Ordnen Sie die Anlage danach einem Buchungsobjekt zu. Seine Anzahl sollte ${n} sein.`,
        };
      }
      const name = this.bookable.name;
      if (this.unlimited) {
        return {
          tone: "warn",
          icon: "mdi-alert-outline",
          text: `Die Anzahl von „${name}“ ist unbegrenzt. Zur selben Zeit buchbar sind trotzdem nur ${n}, weil jede Buchung ein eigenes Fach braucht.`,
          fix: n,
        };
      }
      const a = this.amount;
      if (a === n) {
        return {
          tone: "ok",
          icon: "mdi-check-circle-outline",
          text:
            a === 1
              ? `Passt: „${name}“ wird immer nur einmal zur selben Zeit gebucht, und dafür gibt es ein Fach.`
              : `Passt: „${name}“ kann ${a}-mal zur selben Zeit gebucht werden, und jede dieser Buchungen bekommt ihr eigenes Fach.`,
        };
      }
      if (a > n) {
        return {
          tone: "warn",
          icon: "mdi-alert-outline",
          text: `„${name}“ hat die Anzahl ${a}, aber nur ${faecher(
            n
          )} in Betrieb. Zur selben Zeit buchbar sind deshalb nur ${n}. Wählen Sie ${
            a - n
          } weitere Fächer, oder setzen Sie die Anzahl auf ${n}.`,
          fix: n,
        };
      }
      return {
        // tickets#1159: no Reserve - a Fach never needed is a mismatch too.
        tone: "warn",
        icon: "mdi-alert-outline",
        text: `„${name}“ hat die Anzahl ${a}, in Betrieb sind ${faecher(n)}. ${
          n - a === 1 ? "1 Fach wird" : `${n - a} Fächer werden`
        } nie gebraucht. Setzen Sie die Anzahl auf ${n}, oder nehmen Sie ${
          n - a === 1 ? "1 Fach" : `${n - a} Fächer`
        } heraus.`,
        fix: n,
      };
    },
  },
  methods: {
    setAmount(n) {
      this.bookable.amount = n;
      this.$emit(
        "stub",
        `Prototyp: Anzahl von „${this.bookable.name}“ ist jetzt ${n}.`
      );
    },
    save() {
      this.$emit(
        "stub",
        `Prototyp: „${this.label}“ mit ${faecher(this.count)} ${
          this.isEdit ? "gespeichert" : "angelegt"
        }.`
      );
    },
  },
};
</script>

<template>
  <v-card class="dialog-frame" outlined>
    <v-card-title class="d-flex align-center py-4 px-6">
      <v-icon left>mdi-locker-multiple</v-icon>
      <span class="text-h5">
        Schließfachanlage {{ isEdit ? "bearbeiten" : "anlegen" }}
      </span>
      <span class="text-body-2 text--secondary ml-3">Open Locker</span>
      <v-spacer />
      <v-btn icon><v-icon>mdi-close</v-icon></v-btn>
    </v-card-title>
    <v-divider />

    <v-card-text class="pa-6">
      <!-- Wofür: examples instead of the mechanism -->
      <div class="uses mb-5">
        <div class="text-body-2 mb-3">
          Jede Buchung bekommt für ihre Zeit ein eigenes Fach. Wählen Sie so
          viele Fächer, wie zur selben Zeit gebucht werden können.
        </div>
        <div
          class="use"
          :class="{ 'use--active': bookable && bookable.type === 'room' }"
        >
          <v-icon class="mr-3">mdi-key-variant</v-icon>
          <div>
            <div class="font-weight-medium">
              Schlüssel für einen Raum: 1 Fach
            </div>
            <div class="text-caption text--secondary">
              Im Fach liegt der Schlüssel. Wer den Raum bucht, holt ihn ab und
              legt ihn wieder hinein.
            </div>
          </div>
        </div>
        <div
          class="use"
          :class="{ 'use--active': bookable && bookable.type !== 'room' }"
        >
          <v-icon class="mr-3">mdi-bike</v-icon>
          <div>
            <div class="font-weight-medium">
              Fahrradboxen, Geräte: je Box oder Gerät ein Fach
            </div>
            <div class="text-caption text--secondary">
              Im Fach steht, was gebucht wird. 6 Fahrradboxen oder 6 Tablets
              brauchen 6 Fächer.
            </div>
          </div>
        </div>
      </div>

      <v-row>
        <v-col cols="12" md="7">
          <v-text-field
            v-model="label"
            label="Bezeichnung"
            outlined
            dense
            class="mb-1"
          />
          <v-select
            v-model="bookableId"
            :items="bookableItems"
            label="Für welches Buchungsobjekt?"
            hint="Eine Schließfachanlage gehört zu genau einem Buchungsobjekt."
            persistent-hint
            outlined
            dense
            class="mb-4"
          >
            <template #item="{ item }">
              <div class="py-1">
                <div>{{ item.text }}</div>
                <div v-if="item.b" class="text-caption text--secondary">
                  {{ item.b.typeLabel }} · Anzahl
                  {{ item.b.amount || "unbegrenzt" }}
                </div>
              </div>
            </template>
          </v-select>

          <div class="field-title">Fächer der Schließfachanlage</div>
          <FachGrid v-model="compartments" />
        </v-col>

        <!-- Was daraus wird -->
        <v-col cols="12" md="5">
          <div class="outcome">
            <div class="text-overline mb-1">Was daraus wird</div>
            <div class="numbers mb-3">
              <div>
                <div class="numbers__value">{{ count }}</div>
                <div class="text-caption">
                  {{ count === 1 ? "Fach" : "Fächer" }}
                  <span v-if="off">({{ off }} außer Betrieb)</span>
                </div>
              </div>
              <div class="numbers__op">·</div>
              <div>
                <div class="numbers__value">
                  {{ bookable ? amount || "∞" : "–" }}
                </div>
                <div class="text-caption">Anzahl</div>
              </div>
              <div class="numbers__op">→</div>
              <div>
                <div class="numbers__value">{{ concurrent }}</div>
                <div class="text-caption">zur selben Zeit buchbar</div>
              </div>
            </div>

            <div v-if="slots.length" class="slots mb-3">
              <span
                v-for="s in slots"
                :key="s.key"
                class="slot"
                :class="`slot--${s.kind}`"
              />
            </div>

            <div class="verdict" :class="`verdict--${verdict.tone}`">
              <v-icon small class="mr-2">{{ verdict.icon }}</v-icon>
              <span>{{ verdict.text }}</span>
            </div>
            <v-btn
              v-if="verdict.fix !== undefined && verdict.fix > 0"
              small
              text
              color="primary"
              class="mt-2 px-1"
              @click="setAmount(verdict.fix)"
            >
              Anzahl auf {{ verdict.fix }} setzen
            </v-btn>

            <div class="text-caption text--secondary mt-4">
              <span class="slot slot--used slot--mini" /> Fach für eine Buchung
              <span class="slot slot--spare slot--mini ml-2" /> frei
              <span class="slot slot--off slot--mini ml-2" /> außer Betrieb
              <span class="slot slot--missing slot--mini ml-2" /> fehlt
            </div>
          </div>
        </v-col>
      </v-row>
    </v-card-text>

    <v-divider />
    <v-card-actions class="px-6 py-3">
      <span class="text-caption text--secondary">
        Danach: zuordnen und QR-Codes drucken
      </span>
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
</template>

<style scoped>
.dialog-frame {
  max-width: 960px;
  margin: 0 auto;
  box-shadow: 0 11px 15px -7px rgba(0, 0, 0, 0.2),
    0 24px 38px 3px rgba(0, 0, 0, 0.14) !important;
}

.field-title {
  font-weight: 500;
  margin-bottom: 8px;
}

.use {
  display: flex;
  align-items: flex-start;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid transparent;
  margin-bottom: 4px;
}

.use--active {
  border-color: var(--v-primary-lighten3, #b3c7e6);
  background: rgba(25, 118, 210, 0.05);
}

.outcome {
  position: sticky;
  top: 16px;
  padding: 16px;
  border-radius: 8px;
  background: #f6f7f9;
}

.numbers {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.numbers__value {
  font-size: 26px;
  font-weight: 600;
  line-height: 1.1;
}

.numbers__op {
  font-size: 20px;
  padding-top: 2px;
  color: #888;
}

.slots {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.slot {
  display: inline-block;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  vertical-align: middle;
}

.slot--mini {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.slot--used {
  background: var(--v-primary-base);
}

.slot--spare {
  background: #fff;
  border: 2px solid var(--v-primary-base);
}

.slot--off {
  background: #e09a2a;
}

.slot--missing {
  background: #fff;
  border: 2px dashed #c62828;
}

.verdict {
  display: flex;
  align-items: flex-start;
  font-size: 13px;
  padding: 8px 10px;
  border-radius: 6px;
}

.verdict--ok {
  background: #e8f5e9;
}

.verdict--warn {
  background: #fff4e5;
}

.verdict--info,
.verdict--neutral {
  background: #fff;
}
</style>
