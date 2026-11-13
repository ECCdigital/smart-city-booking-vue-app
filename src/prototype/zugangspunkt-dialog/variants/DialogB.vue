<script>
/**
 * PROTOTYPE (tickets#1085) — Variante B: Schritte.
 *
 * Anlegen ist ein Stepper im Dialog, ein Thema je Schritt, nur die Schritte,
 * die der Anbieter braucht: Schloss wählen → Öffnen (nur wo es etwas zu
 * wählen gibt) → Standort (überspringbar) → Prüfen mit Bezeichnung.
 * Bearbeiten ist kein Stepper, sondern ein Einstellungs-Dialog: links die
 * Themen, rechts eins davon. Jeder Hinweis steht einmal, oben im Schritt.
 */
import { provider } from "../../zugangspunkte-fuehrung/data";
import {
  OPEN_ACTIONS,
  openActionText,
  facts,
  listing,
  listed,
  blankForm,
  formOf,
  saveForm,
} from "../listing";
import CompartmentGrid from "../CompartmentGrid.vue";

export default {
  name: "DialogB",
  components: { CompartmentGrid },
  props: {
    value: Boolean,
    providerId: { type: String, default: null },
    accessPoint: { type: Object, default: null },
  },
  data() {
    return {
      form: blankForm("nuki"),
      step: 1,
      manual: false,
      section: "lock",
    };
  },
  computed: {
    isEdit() {
      return !!this.accessPoint;
    },
    pid() {
      return this.accessPoint?.provider || this.providerId;
    },
    p() {
      return provider(this.pid) || {};
    },
    f() {
      return facts(this.pid, this.form.lockerType);
    },
    entries() {
      return listing(this.pid);
    },
    entry() {
      return listed(this.pid, this.form.externalId);
    },
    steps() {
      const s = [
        {
          key: "lock",
          title: this.f.typeChoice ? "Fächer wählen" : `${this.f.noun} wählen`,
          intro: this.lockIntro,
        },
      ];
      if (this.f.openAction || this.f.qr) {
        s.push({
          key: "open",
          title: "Öffnen",
          intro: "Wie Buchende öffnen. Die Standards passen meistens.",
        });
      }
      s.push({
        key: "place",
        title: "Standort",
        intro: "Zeigt Buchenden den Weg. Können Sie auch später ergänzen.",
        optional: true,
      });
      if (!this.isEdit) {
        s.push({
          key: "check",
          title: "Prüfen",
          intro:
            "Die Bezeichnung sehen Buchende in der App und auf dem QR-Code.",
        });
      } else {
        s.push({
          key: "tech",
          title: "Technik",
          intro: "Selten nötig.",
        });
      }
      return s;
    },
    current() {
      return this.steps[this.step - 1];
    },
    lockIntro() {
      if (this.f.typeChoice) {
        return this.form.lockerType === "door"
          ? "Ein festes Fach: Alle Buchungen des Buchungsobjekts teilen es sich."
          : "Eine Schließfachanlage: Biletado teilt jeder Buchung ein freies Fach zu.";
      }
      if (!this.f.hasListing) return this.f.idHint;
      return `Was ${this.f.name} meldet. Schon angelegte sind ausgegraut.`;
    },
    openActions() {
      const supported = this.entry?.openActions;
      return OPEN_ACTIONS.map((o) => ({
        ...o,
        disabled: !!supported && !supported.includes(o.value),
      }));
    },
    lockDone() {
      if (this.f.compartments) return this.form.compartmentIds.length > 0;
      if (this.form.lockerType === "door") {
        return this.form.compartmentIds.length === 1;
      }
      return !!this.form.externalId;
    },
    isLast() {
      return this.step === this.steps.length;
    },
    review() {
      const rows = [];
      if (this.f.compartments) {
        rows.push(["Fächer", this.form.compartmentIds.join(", ")]);
      } else {
        rows.push([
          this.f.noun,
          this.entry
            ? `${this.entry.name} (${this.form.externalId})`
            : this.form.externalId,
        ]);
      }
      if (this.f.openAction) {
        rows.push(["Öffnungsart", openActionText(this.form.openAction)]);
      }
      if (this.f.qr) {
        rows.push([
          "QR-Scan",
          this.form.qrRequired ? "erforderlich" : "nicht nötig",
        ]);
      }
      rows.push(["Standort", this.form.address || "später"]);
      return rows;
    },
  },
  watch: {
    value: {
      immediate: true,
      handler(open) {
        if (!open) return;
        this.step = 1;
        this.section = "lock";
        if (this.isEdit) {
          this.form = formOf(this.accessPoint);
          this.manual = !this.entry;
        } else {
          this.form = blankForm(this.pid);
          this.manual = !this.f.hasListing;
        }
      },
    },
  },
  methods: {
    choose(e) {
      if (e.taken && e.id !== this.accessPoint?.externalId) return;
      this.form.externalId = e.id;
      this.form.providerLocationId = e.account || "";
      if (!this.isEdit) this.form.label = e.name;
    },
    chooseType(type) {
      this.form = blankForm(this.pid, type);
    },
    onFach(ids) {
      this.form.compartmentIds = ids;
      if (this.form.lockerType === "door") this.form.externalId = ids[0];
      if (!this.form.label && this.f.compartments) {
        this.form.label = "Schließfachanlage";
      }
    },
    next() {
      if (this.isLast) return this.save();
      this.step++;
    },
    close() {
      this.$emit("input", false);
    },
    save() {
      const ap = saveForm(this.form);
      this.$emit(this.isEdit ? "saved" : "created", ap);
      this.close();
    },
  },
};
</script>

<template>
  <v-dialog :value="value" max-width="760" @input="close">
    <v-card class="b-card">
      <v-card-title class="pb-2">
        <v-icon class="mr-2">{{ p.icon }}</v-icon>
        <span>{{ isEdit ? accessPoint.label : `${f.noun} anlegen` }}</span>
        <span class="text-body-2 text--secondary ml-2">· {{ p.name }}</span>
        <v-spacer />
        <v-btn icon small @click="close"><v-icon>mdi-close</v-icon></v-btn>
      </v-card-title>

      <!-- ================= Anlegen: Stepper ================= -->
      <template v-if="!isEdit">
        <div class="stepper-head px-6">
          <div
            v-for="(s, i) in steps"
            :key="s.key"
            class="sh"
            :class="{
              'sh--on': step === i + 1,
              'sh--done': step > i + 1,
            }"
          >
            <span class="sh__num">
              <v-icon v-if="step > i + 1" x-small color="white"
                >mdi-check</v-icon
              >
              <template v-else>{{ i + 1 }}</template>
            </span>
            {{ s.title }}
            <span v-if="s.optional" class="text-caption ml-1">(optional)</span>
          </div>
        </div>
        <v-divider />
      </template>

      <div class="b-body" :class="{ 'b-body--edit': isEdit }">
        <!-- ================= Bearbeiten: Themen links ================= -->
        <div v-if="isEdit" class="side">
          <div
            v-for="(s, i) in steps"
            :key="s.key"
            class="side__item"
            :class="{ 'side__item--on': step === i + 1 }"
            @click="step = i + 1"
          >
            {{ s.title }}
          </div>
        </div>

        <div class="pane">
          <p class="text-body-2 text--secondary mb-4">{{ current.intro }}</p>

          <!-- Schloss / Fächer -->
          <template v-if="current.key === 'lock'">
            <v-btn-toggle
              v-if="f.typeChoice && !isEdit"
              :value="form.lockerType"
              mandatory
              dense
              color="primary"
              class="mb-4"
              @change="chooseType"
            >
              <v-btn value="locker" small text>Schließfachanlage</v-btn>
              <v-btn value="door" small text>Festes Fach</v-btn>
            </v-btn-toggle>

            <CompartmentGrid
              v-if="f.typeChoice"
              :value="form.compartmentIds"
              :multiple="f.compartments"
              :own="accessPoint ? accessPoint.compartmentIds || [] : []"
              @input="onFach"
            />

            <template v-else>
              <div v-if="isEdit" class="text-caption text--secondary mb-2">
                {{ f.idHint }}
              </div>
              <div v-if="!manual" class="cards">
                <div
                  v-for="e in entries"
                  :key="e.id"
                  class="lock-card"
                  :class="{
                    'lock-card--on': form.externalId === e.id,
                    'lock-card--off':
                      e.taken && e.id !== (accessPoint || {}).externalId,
                  }"
                  @click="choose(e)"
                >
                  <v-icon small class="mb-1">{{ p.icon }}</v-icon>
                  <div class="font-weight-medium">{{ e.name }}</div>
                  <div class="text-caption text--secondary">
                    {{ e.detail || e.account }}
                  </div>
                  <div class="mt-1">
                    <v-chip
                      v-if="e.taken && e.id !== (accessPoint || {}).externalId"
                      x-small
                      label
                    >
                      schon angelegt
                    </v-chip>
                    <v-chip
                      v-else-if="e.iqActive === false"
                      x-small
                      label
                      color="warning"
                      text-color="white"
                    >
                      IQ nicht aktiviert
                    </v-chip>
                  </div>
                </div>
              </div>
              <v-text-field
                v-else
                v-model="form.externalId"
                :label="f.idLabel"
                :placeholder="f.idPlaceholder"
                outlined
                dense
                autofocus
              />
              <v-btn
                v-if="f.manual && f.hasListing"
                x-small
                text
                color="primary"
                class="mt-2 px-0"
                @click="manual = !manual"
              >
                {{
                  manual
                    ? `Aus der Liste von ${f.name} wählen`
                    : "Nicht in der Liste? Von Hand eintragen"
                }}
              </v-btn>
              <v-alert
                v-if="f.iq && entry && entry.iqActive === false"
                type="warning"
                text
                dense
                class="mt-3 mb-0"
              >
                Diese Tür öffnet erst, wenn ihr IQ aktiviert ist.
              </v-alert>
            </template>
            <v-text-field
              v-if="isEdit"
              v-model="form.label"
              label="Bezeichnung"
              outlined
              dense
              class="mt-4"
            />
          </template>

          <!-- Öffnen -->
          <template v-if="current.key === 'open'">
            <v-radio-group
              v-if="f.openAction"
              v-model="form.openAction"
              class="mt-0"
              dense
            >
              <template #label>
                <span class="font-weight-medium">Öffnungsart</span>
              </template>
              <v-radio
                v-for="o in openActions"
                :key="o.value"
                :value="o.value"
                :disabled="o.disabled"
              >
                <template #label>
                  <div>
                    <div>{{ o.text }}</div>
                    <div class="text-caption text--secondary">
                      {{ o.disabled ? "Kann dieses Schloss nicht." : o.hint }}
                    </div>
                  </div>
                </template>
              </v-radio>
            </v-radio-group>
            <v-switch
              v-if="f.qr"
              v-model="form.qrRequired"
              inset
              dense
              label="QR-Scan erforderlich"
              :hint="f.qrHint"
              persistent-hint
            />
          </template>

          <!-- Standort -->
          <template v-if="current.key === 'place'">
            <v-text-field
              v-model="form.address"
              label="Adresse"
              prepend-inner-icon="mdi-map-marker-outline"
              outlined
              dense
            />
            <div class="map-stub">Karte wie heute (LocationInput)</div>
          </template>

          <!-- Prüfen -->
          <template v-if="current.key === 'check'">
            <v-text-field
              v-model="form.label"
              label="Bezeichnung"
              outlined
              dense
              autofocus
            />
            <table class="review">
              <tr v-for="r in review" :key="r[0]">
                <td class="text--secondary">{{ r[0] }}</td>
                <td>{{ r[1] }}</td>
              </tr>
            </table>
          </template>

          <!-- Technik (nur Bearbeiten) -->
          <template v-if="current.key === 'tech'">
            <v-text-field
              v-if="f.accountField"
              v-model="form.providerLocationId"
              label="Standort-ID beim Anbieter"
              hint="Nur zur Information, kein Anbieter liest sie."
              persistent-hint
              outlined
              dense
              class="mb-3"
            />
            <v-textarea
              v-model="form.config"
              label="Konfiguration (JSON)"
              rows="3"
              outlined
              dense
            />
          </template>
        </div>
      </div>

      <v-divider />
      <v-card-actions class="px-6 py-3">
        <template v-if="!isEdit">
          <v-btn v-if="step > 1" text @click="step--">Zurück</v-btn>
          <v-spacer />
          <v-btn v-if="current.optional" text @click="step++">
            Überspringen
          </v-btn>
          <v-btn
            color="primary"
            depressed
            :disabled="step === 1 && !lockDone"
            @click="next"
          >
            {{ isLast ? `${f.noun} anlegen` : "Weiter" }}
          </v-btn>
        </template>
        <template v-else>
          <v-spacer />
          <v-btn text @click="close">Abbrechen</v-btn>
          <v-btn color="primary" depressed :disabled="!lockDone" @click="save">
            Speichern
          </v-btn>
        </template>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.stepper-head {
  display: flex;
  gap: 18px;
  padding-bottom: 12px;
  font-size: 13px;
  color: #757575;
}
.sh {
  display: flex;
  align-items: center;
}
.sh--on {
  color: #212121;
  font-weight: 600;
}
.sh__num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  margin-right: 6px;
  background: #bdbdbd;
  color: #fff;
  font-size: 11px;
}
.sh--on .sh__num,
.sh--done .sh__num {
  background: var(--v-primary-base);
}
.b-body {
  display: flex;
  min-height: 340px;
}
.side {
  width: 160px;
  border-right: 1px solid rgba(0, 0, 0, 0.08);
  padding: 12px 0;
}
.side__item {
  padding: 8px 20px;
  cursor: pointer;
  font-size: 14px;
}
.side__item--on {
  background: rgba(25, 118, 210, 0.08);
  border-left: 3px solid var(--v-primary-base);
  font-weight: 600;
}
.pane {
  flex: 1;
  padding: 20px 24px;
  max-height: 60vh;
  overflow-y: auto;
}
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
}
.lock-card {
  border: 1px solid rgba(0, 0, 0, 0.14);
  border-radius: 8px;
  padding: 10px;
  cursor: pointer;
  font-size: 13px;
}
.lock-card--on {
  border: 2px solid var(--v-primary-base);
  background: rgba(25, 118, 210, 0.06);
}
.lock-card--off {
  opacity: 0.5;
  cursor: not-allowed;
}
.map-stub {
  height: 140px;
  border: 1px dashed #bdbdbd;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9e9e9e;
  font-size: 13px;
}
.review {
  width: 100%;
  font-size: 14px;
  border-collapse: collapse;
}
.review td {
  padding: 6px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
.review td:first-child {
  width: 130px;
}
</style>
