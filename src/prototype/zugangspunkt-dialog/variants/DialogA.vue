<script>
/**
 * PROTOTYPE (tickets#1085) — Variante A: Ein Dialog, nur das Nötige.
 *
 * Anlegen fragt zwei Dinge: welches Schloss (aus der Liste des Anbieters,
 * als Liste zum Anklicken, „von Hand“ als letzte Zeile) und die Bezeichnung.
 * Alles andere hat einen Standard und steht eingeklappt unter „Weitere
 * Einstellungen“, mit einer Zeile, die den Standard nennt. Bearbeiten ist
 * derselbe Dialog: oben das Schloss als Zeile mit „Tauschen“, die
 * Einstellungen aufgeklappt.
 */
import { provider } from "../../zugangspunkte-fuehrung/data";
import {
  OPEN_ACTIONS,
  facts,
  listing,
  listed,
  blankForm,
  formOf,
  saveForm,
  summary,
} from "../listing";
import CompartmentGrid from "../CompartmentGrid.vue";

const MANUAL = "__manual";

export default {
  name: "DialogA",
  components: { CompartmentGrid },
  props: {
    value: Boolean,
    providerId: { type: String, default: null },
    accessPoint: { type: Object, default: null },
  },
  data() {
    return {
      form: blankForm("nuki"),
      pick: null,
      more: undefined,
      swapping: false,
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
    title() {
      return this.isEdit ? this.accessPoint.label : `${this.f.noun} anlegen`;
    },
    manual() {
      return this.pick === MANUAL || !this.f.hasListing;
    },
    showList() {
      return (
        this.f.hasListing &&
        !this.f.compartments &&
        (!this.isEdit || this.swapping)
      );
    },
    showIdField() {
      if (this.f.compartments) return false;
      if (this.isEdit) return this.swapping && this.manual;
      return this.manual;
    },
    entry() {
      return listed(this.pid, this.form.externalId);
    },
    openActions() {
      const supported = this.entry?.openActions;
      return OPEN_ACTIONS.map((o) => ({
        ...o,
        disabled: !!supported && !supported.includes(o.value),
      }));
    },
    summaryLine() {
      return summary(this.form);
    },
    iqWarning() {
      return this.f.iq && this.entry && this.entry.iqActive === false;
    },
    canSave() {
      if (this.f.compartments) return this.form.compartmentIds.length > 0;
      if (this.form.lockerType === "door") {
        return this.form.compartmentIds.length === 1;
      }
      return !!this.form.externalId;
    },
  },
  watch: {
    value: {
      immediate: true,
      handler(open) {
        if (!open) return;
        this.swapping = false;
        if (this.isEdit) {
          this.form = formOf(this.accessPoint);
          this.pick = this.form.externalId;
          this.more = 0;
        } else {
          this.form = blankForm(this.pid);
          this.pick = null;
          this.more = undefined;
        }
      },
    },
  },
  methods: {
    choose(entry) {
      if (entry === MANUAL) {
        this.pick = MANUAL;
        this.form.externalId = "";
        return;
      }
      if (entry.taken && entry.id !== this.accessPoint?.externalId) return;
      this.pick = entry.id;
      this.form.externalId = entry.id;
      this.form.providerLocationId = entry.account || "";
      if (!this.form.label || this.isEdit === false) {
        this.form.label = entry.name;
      }
      this.swapping = false;
    },
    chooseType(type) {
      const label = this.form.label;
      this.form = { ...blankForm(this.pid, type), label };
    },
    onFach(ids) {
      this.form.compartmentIds = ids;
      if (this.form.lockerType === "door") this.form.externalId = ids[0];
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
  <v-dialog :value="value" max-width="620" scrollable @input="close">
    <v-card>
      <v-card-title class="d-block pb-1">
        <div class="text-overline text--secondary">
          <v-icon x-small class="mr-1">{{ p.icon }}</v-icon
          >{{ p.name }}
        </div>
        <div class="text-h6">{{ title }}</div>
      </v-card-title>

      <v-card-text class="pt-3">
        <!-- Open Locker: the one real type choice -->
        <v-btn-toggle
          v-if="f.typeChoice && !isEdit"
          :value="form.lockerType"
          mandatory
          dense
          color="primary"
          class="d-flex mb-1"
          @change="chooseType"
        >
          <v-btn value="locker" class="flex-grow-1" text small>
            Schließfachanlage
          </v-btn>
          <v-btn value="door" class="flex-grow-1" text small>
            Festes Fach
          </v-btn>
        </v-btn-toggle>
        <div
          v-if="f.typeChoice && !isEdit"
          class="text-caption text--secondary mb-4"
        >
          {{
            form.lockerType === "door"
              ? "Alle Buchungen des Buchungsobjekts teilen sich dieses eine Fach."
              : "Biletado teilt jeder Buchung ein freies Fach der Anlage zu."
          }}
        </div>

        <!-- Edit: the lock as one line, swapped on demand -->
        <div
          v-if="isEdit && !f.compartments && !swapping"
          class="lock-line mb-4"
        >
          <v-icon small class="mr-2">mdi-link-variant</v-icon>
          <div class="flex-grow-1">
            <div class="font-weight-medium">
              {{ entry ? entry.name : "Von Hand eingetragen" }}
            </div>
            <div class="text-caption text--secondary">
              {{ f.idLabel }} {{ form.externalId }}
            </div>
          </div>
          <v-btn small text color="primary" @click="swapping = true">
            Tauschen
          </v-btn>
        </div>
        <div
          v-if="isEdit && swapping"
          class="text-caption text--secondary mb-2"
        >
          {{ f.idHint }}
        </div>

        <!-- Which lock: the listing as rows, "by hand" as the last one -->
        <template v-if="showList">
          <div class="field-title">Welche {{ f.noun }}?</div>
          <div class="pick-list mb-4">
            <div
              v-for="e in entries"
              :key="e.id"
              class="pick-row"
              :class="{
                'pick-row--on': pick === e.id,
                'pick-row--off': e.taken && e.id !== form.externalId,
              }"
              @click="choose(e)"
            >
              <v-icon small class="mr-3">
                {{
                  pick === e.id ? "mdi-radiobox-marked" : "mdi-radiobox-blank"
                }}
              </v-icon>
              <div class="flex-grow-1">
                <div>{{ e.name }}</div>
                <div class="text-caption text--secondary">
                  {{ e.detail || e.account }} · {{ e.id }}
                </div>
              </div>
              <v-chip v-if="e.taken && e.id !== form.externalId" x-small label>
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
            <div
              v-if="f.manual"
              class="pick-row pick-row--manual"
              :class="{ 'pick-row--on': pick === '__manual' }"
              @click="choose('__manual')"
            >
              <v-icon small class="mr-3">mdi-pencil-outline</v-icon>
              <div>Nicht in der Liste: von Hand eintragen</div>
            </div>
          </div>
        </template>

        <!-- Open Locker: the Fächer are the lock -->
        <template v-if="f.typeChoice">
          <div class="field-title">
            {{ f.compartments ? "Fächer der Anlage" : "Welches Fach?" }}
          </div>
          <CompartmentGrid
            :value="form.compartmentIds"
            :multiple="f.compartments"
            :own="accessPoint ? accessPoint.compartmentIds || [] : []"
            class="mb-4"
            @input="onFach"
          />
        </template>

        <v-text-field
          v-if="showIdField"
          v-model="form.externalId"
          :label="f.idLabel"
          :placeholder="f.idPlaceholder"
          :hint="f.idHint"
          persistent-hint
          outlined
          dense
          class="mb-3"
        />

        <v-alert v-if="iqWarning" type="warning" text dense class="mb-3">
          Der IQ dieser Tür ist nicht aktiviert. Sie öffnet erst danach. Das
          aktivieren Sie im Abschnitt Salto KS.
        </v-alert>

        <v-text-field
          v-model="form.label"
          label="Bezeichnung"
          hint="So heißt die Tür für Buchende und auf dem QR-Code."
          outlined
          dense
        />

        <!-- Everything with a default -->
        <v-expansion-panels v-model="more" flat class="more mt-2">
          <v-expansion-panel>
            <v-expansion-panel-header class="px-3">
              <div>
                <div class="font-weight-medium">Weitere Einstellungen</div>
                <div class="text-caption text--secondary mt-1">
                  {{ summaryLine }}
                </div>
              </div>
            </v-expansion-panel-header>
            <v-expansion-panel-content>
              <div class="fixed-line mb-4">
                <div class="text-caption text--secondary">Modus</div>
                <div>Öffnen per App</div>
                <div class="text-caption text--secondary">
                  Buchende öffnen per Knopfdruck in der App. PIN-Code kommt
                  später, dann wird daraus eine Auswahl.
                </div>
              </div>
              <v-select
                v-if="f.openAction"
                v-model="form.openAction"
                :items="openActions"
                item-text="text"
                item-value="value"
                label="Öffnungsart"
                :hint="
                  openActions.find((o) => o.value === form.openAction).hint
                "
                persistent-hint
                outlined
                dense
                class="mb-3"
              />
              <v-switch
                v-if="f.qr"
                v-model="form.qrRequired"
                inset
                dense
                class="mt-0"
                label="QR-Scan erforderlich"
                :hint="f.qrHint"
                persistent-hint
              />
              <v-text-field
                v-model="form.address"
                label="Standort"
                placeholder="Adresse, zeigt Buchenden den Weg"
                prepend-inner-icon="mdi-map-marker-outline"
                outlined
                dense
                class="mt-4"
                :hint="
                  isEdit && f.openAction
                    ? 'Oder: Standort von Nuki übernehmen'
                    : 'Die Karte bleibt wie heute (LocationInput).'
                "
                persistent-hint
              />
              <div class="field-title mt-4">Technik</div>
              <v-text-field
                v-if="f.accountField"
                v-model="form.providerLocationId"
                label="Standort-ID beim Anbieter"
                hint="Nur zur Information, kein Anbieter liest sie."
                persistent-hint
                outlined
                dense
                class="mb-2"
              />
              <v-textarea
                v-model="form.config"
                label="Konfiguration (JSON)"
                rows="2"
                outlined
                dense
                hide-details
              />
            </v-expansion-panel-content>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card-text>

      <v-divider />
      <v-card-actions class="px-6 py-3">
        <span v-if="!isEdit" class="text-caption text--secondary">
          Danach: zuordnen{{ f.qr ? " und QR-Code drucken" : "" }}.
        </span>
        <v-spacer />
        <v-btn text @click="close">Abbrechen</v-btn>
        <v-btn color="primary" depressed :disabled="!canSave" @click="save">
          {{ isEdit ? "Speichern" : `${f.noun} anlegen` }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.field-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
}
.pick-list {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 6px;
  max-height: 260px;
  overflow-y: auto;
}
.pick-row {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
.pick-row:last-child {
  border-bottom: 0;
}
.pick-row:hover {
  background: rgba(0, 0, 0, 0.03);
}
.pick-row--on {
  background: rgba(25, 118, 210, 0.08) !important;
}
.pick-row--off {
  color: #9e9e9e;
  cursor: not-allowed;
}
.pick-row--manual {
  color: var(--v-primary-base);
}
.lock-line {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 6px;
}
.more {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 6px;
}
</style>
