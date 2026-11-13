<script>
/**
 * PROTOTYPE (tickets#1085) — Variante C: Übernehmen, Details im Seitenpanel.
 *
 * Anlegen hat kein Formular: Der Dialog listet, was der Anbieter meldet, zum
 * Ankreuzen, mehrere auf einmal, die Bezeichnung direkt in der Zeile. Alles
 * andere bekommt den Standard. „Von Hand“ ist ein kleines Formular mit ID und
 * Bezeichnung. Bearbeiten öffnet ein Panel rechts neben der Liste: je Thema
 * eine Zeile mit dem Stand, „Ändern“ klappt nur dieses Thema auf und
 * speichert es für sich. Es gibt kein großes Speichern.
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
  name: "DialogC",
  components: { CompartmentGrid },
  props: {
    value: Boolean,
    providerId: { type: String, default: null },
    accessPoint: { type: Object, default: null },
  },
  data() {
    return {
      // create
      lockerType: "locker",
      picked: {},
      labels: {},
      manual: false,
      manualForm: blankForm("nuki"),
      fachIds: [],
      anlageLabel: "",
      // edit
      form: blankForm("nuki"),
      editing: null,
      draft: null,
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
      return facts(
        this.pid,
        this.isEdit ? this.form.lockerType : this.lockerType
      );
    },
    entries() {
      return listing(this.pid);
    },
    pickedIds() {
      return Object.keys(this.picked).filter((id) => this.picked[id]);
    },
    createCount() {
      if (this.f.typeChoice) {
        return this.f.compartments
          ? this.fachIds.length
            ? 1
            : 0
          : this.fachIds.length;
      }
      if (this.manual || !this.f.hasListing) {
        return this.manualForm.externalId ? 1 : 0;
      }
      return this.pickedIds.length;
    },
    createText() {
      const n = this.createCount;
      if (this.f.compartments) return "Schließfachanlage anlegen";
      if (n <= 1) return `${this.f.noun} übernehmen`;
      return `${n} ${this.f.nounPlural} übernehmen`;
    },
    defaultsLine() {
      const parts = [];
      if (this.f.openAction) parts.push("Öffnungsart automatisch");
      if (this.f.qr) {
        parts.push(this.f.qrDefault ? "mit QR-Scan" : "ohne QR-Scan");
      }
      parts.push("ohne Standort");
      return `Jede bekommt den Standard: ${parts.join(
        ", "
      )}. Ändern können Sie das danach je ${this.f.noun}.`;
    },
    // edit
    entry() {
      return listed(this.pid, this.form.externalId);
    },
    sections() {
      if (!this.isEdit) return [];
      const f = this.f;
      const s = [];
      s.push({
        key: "label",
        title: "Bezeichnung",
        value: this.form.label,
      });
      if (f.compartments) {
        s.push({
          key: "fach",
          title: "Fächer",
          value: `${
            this.form.compartmentIds.length
          } Fächer: ${this.form.compartmentIds.join(", ")}`,
        });
      } else {
        s.push({
          key: "lock",
          title: f.typeChoice ? "Fach" : "Schloss beim Anbieter",
          value: this.entry
            ? `${this.entry.name} · ${this.form.externalId}`
            : `${this.form.externalId} (von Hand)`,
          hint: f.idHint,
          action: "Tauschen",
        });
      }
      if (f.openAction) {
        s.push({
          key: "openAction",
          title: "Öffnungsart",
          value: openActionText(this.form.openAction),
        });
      }
      if (f.qr) {
        s.push({
          key: "qr",
          title: "QR-Scan",
          value: this.form.qrRequired ? "erforderlich" : "nicht nötig",
          toggle: true,
        });
      }
      s.push({
        key: "address",
        title: "Standort",
        value: this.form.address || "—",
        action: this.form.address ? "Ändern" : "Ergänzen",
      });
      s.push({
        key: "tech",
        title: "Technik",
        value: [
          f.accountField && this.form.providerLocationId,
          this.form.config !== "{}"
            ? "eigene Konfiguration"
            : "keine Konfiguration",
        ]
          .filter(Boolean)
          .join(" · "),
      });
      return s;
    },
    openActions() {
      const supported = this.entry?.openActions;
      return OPEN_ACTIONS.map((o) => ({
        ...o,
        disabled: !!supported && !supported.includes(o.value),
      }));
    },
    swapEntries() {
      return this.entries.filter(
        (e) => !e.taken || e.id === this.accessPoint?.externalId
      );
    },
  },
  watch: {
    value: {
      immediate: true,
      handler(open) {
        if (!open) return;
        this.editing = null;
        if (this.isEdit) {
          this.form = formOf(this.accessPoint);
        } else {
          this.lockerType = "locker";
          this.picked = {};
          this.labels = {};
          this.manual = !facts(this.pid).hasListing;
          this.manualForm = blankForm(this.pid);
          this.fachIds = [];
          this.anlageLabel = "";
        }
      },
    },
  },
  methods: {
    togglePick(e) {
      if (e.taken) return;
      this.$set(this.picked, e.id, !this.picked[e.id]);
      if (this.labels[e.id] === undefined) this.$set(this.labels, e.id, e.name);
    },
    close() {
      this.$emit("input", false);
    },
    create() {
      let last = null;
      if (this.f.typeChoice && this.f.compartments) {
        last = saveForm({
          ...blankForm(this.pid, "locker"),
          compartmentIds: this.fachIds,
          label: this.anlageLabel || "Neue Schließfachanlage",
        });
      } else if (this.f.typeChoice) {
        this.fachIds.forEach((id) => {
          last = saveForm({
            ...blankForm(this.pid, "door"),
            compartmentIds: [id],
            externalId: id,
            label: `Fach ${id}`,
          });
        });
      } else if (this.manual || !this.f.hasListing) {
        last = saveForm({ ...this.manualForm });
      } else {
        this.pickedIds.forEach((id) => {
          const e = listed(this.pid, id);
          last = saveForm({
            ...blankForm(this.pid),
            externalId: id,
            providerLocationId: e.account || "",
            label: this.labels[id] || e.name,
          });
        });
      }
      if (last) this.$emit("created", last);
      this.close();
    },
    // edit: one section at a time, saved on its own
    startEdit(s) {
      if (s.toggle) {
        this.form.qrRequired = !this.form.qrRequired;
        this.commit();
        return;
      }
      this.editing = s.key;
      this.draft = JSON.parse(JSON.stringify(this.form));
    },
    cancelEdit() {
      this.editing = null;
      this.draft = null;
    },
    applyEdit() {
      this.form = this.draft;
      this.commit();
      this.cancelEdit();
    },
    commit() {
      const ap = saveForm(this.form);
      this.$emit("saved", ap);
    },
    swapTo(e) {
      this.draft.externalId = e.id;
      this.draft.providerLocationId = e.account || "";
    },
  },
};
</script>

<template>
  <div>
    <!-- ================= Anlegen: übernehmen ================= -->
    <v-dialog
      v-if="!isEdit"
      :value="value"
      max-width="680"
      scrollable
      @input="close"
    >
      <v-card>
        <v-card-title class="d-block">
          <div class="text-overline text--secondary">{{ p.name }}</div>
          <div class="text-h6">
            {{
              f.typeChoice
                ? "Aus Open Locker übernehmen"
                : manual
                ? `${f.noun} von Hand eintragen`
                : `${f.nounPlural} aus ${f.name} übernehmen`
            }}
          </div>
        </v-card-title>
        <v-card-text>
          <!-- Open Locker -->
          <template v-if="f.typeChoice">
            <v-btn-toggle
              v-model="lockerType"
              mandatory
              dense
              color="primary"
              class="mb-2"
              @change="fachIds = []"
            >
              <v-btn value="locker" small text>Als Schließfachanlage</v-btn>
              <v-btn value="door" small text>Als feste Fächer</v-btn>
            </v-btn-toggle>
            <div class="text-caption text--secondary mb-3">
              {{
                lockerType === "door"
                  ? "Jedes gewählte Fach wird ein eigener Zugangspunkt. Alle Buchungen eines Buchungsobjekts teilen sich ihr Fach."
                  : "Die gewählten Fächer werden eine Anlage. Biletado teilt jeder Buchung ein freies Fach zu."
              }}
            </div>
            <v-text-field
              v-if="lockerType === 'locker'"
              v-model="anlageLabel"
              label="Bezeichnung der Anlage"
              placeholder="z. B. Schließfächer Stadtbücherei"
              outlined
              dense
            />
            <CompartmentGrid v-model="fachIds" :multiple="true" />
          </template>

          <!-- Listing: tick several, name them in the row -->
          <template v-else-if="!manual">
            <div class="take-list">
              <div
                v-for="e in entries"
                :key="e.id"
                class="take-row"
                :class="{ 'take-row--off': e.taken }"
              >
                <v-simple-checkbox
                  :value="!!picked[e.id]"
                  :disabled="e.taken"
                  color="primary"
                  @input="togglePick(e)"
                />
                <div class="take-row__name" @click="togglePick(e)">
                  <template v-if="!picked[e.id]">
                    <div>{{ e.name }}</div>
                    <div class="text-caption text--secondary">
                      {{ e.detail || e.account }} · {{ e.id }}
                    </div>
                  </template>
                  <v-text-field
                    v-else
                    v-model="labels[e.id]"
                    dense
                    hide-details
                    outlined
                    label="Bezeichnung"
                    @click.stop
                  />
                </div>
                <v-chip v-if="e.taken" x-small label>schon angelegt</v-chip>
                <v-chip
                  v-else-if="e.iqActive === false"
                  x-small
                  label
                  color="warning"
                  text-color="white"
                  title="Öffnet erst, wenn der IQ aktiviert ist"
                >
                  IQ nicht aktiviert
                </v-chip>
              </div>
            </div>
            <div class="text-caption text--secondary mt-3">
              {{ defaultsLine }}
            </div>
          </template>

          <!-- By hand -->
          <template v-else>
            <v-text-field
              v-model="manualForm.externalId"
              :label="f.idLabel"
              :placeholder="f.idPlaceholder"
              :hint="f.idHint"
              persistent-hint
              outlined
              dense
              autofocus
              class="mb-3"
            />
            <v-text-field
              v-model="manualForm.label"
              label="Bezeichnung"
              outlined
              dense
            />
          </template>
        </v-card-text>
        <v-divider />
        <v-card-actions class="px-6 py-3">
          <v-btn
            v-if="f.manual && f.hasListing"
            small
            text
            color="primary"
            @click="manual = !manual"
          >
            {{ manual ? "Zurück zur Liste" : "Nicht in der Liste? Von Hand" }}
          </v-btn>
          <v-spacer />
          <v-btn text @click="close">Abbrechen</v-btn>
          <v-btn
            color="primary"
            depressed
            :disabled="createCount === 0"
            @click="create"
          >
            {{ createText }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ================= Bearbeiten: Seitenpanel ================= -->
    <v-navigation-drawer
      v-else
      :value="value"
      fixed
      right
      temporary
      width="460"
      @input="!$event && close()"
    >
      <div class="panel-head">
        <div>
          <div class="text-overline text--secondary">
            <v-icon x-small class="mr-1">{{ p.icon }}</v-icon
            >{{ p.name }} ·
            {{ f.noun }}
          </div>
          <div class="text-h6">{{ form.label }}</div>
        </div>
        <v-spacer />
        <v-btn icon @click="close"><v-icon>mdi-close</v-icon></v-btn>
      </div>
      <v-divider />

      <div
        v-for="s in sections"
        :key="s.key"
        class="sec"
        :class="{ 'sec--open': editing === s.key }"
      >
        <div class="sec__row">
          <div class="sec__title">{{ s.title }}</div>
          <div class="sec__value">{{ s.value }}</div>
          <v-switch
            v-if="s.toggle"
            :input-value="form.qrRequired"
            dense
            hide-details
            class="mt-0 pt-0"
            @change="startEdit(s)"
          />
          <v-btn
            v-else-if="editing !== s.key"
            x-small
            text
            color="primary"
            @click="startEdit(s)"
          >
            {{ s.action || "Ändern" }}
          </v-btn>
        </div>
        <div v-if="s.toggle" class="text-caption text--secondary sec__hint">
          {{ f.qrHint }}
        </div>

        <div v-if="editing === s.key" class="sec__edit">
          <v-text-field
            v-if="s.key === 'label'"
            v-model="draft.label"
            outlined
            dense
            hide-details
            autofocus
          />
          <template v-if="s.key === 'lock'">
            <div class="text-caption text--secondary mb-2">{{ s.hint }}</div>
            <template v-if="f.typeChoice">
              <CompartmentGrid
                :value="draft.compartmentIds"
                :multiple="false"
                :own="accessPoint.compartmentIds || []"
                @input="
                  draft.compartmentIds = $event;
                  draft.externalId = $event[0];
                "
              />
            </template>
            <template v-else-if="f.hasListing">
              <div
                v-for="e in swapEntries"
                :key="e.id"
                class="swap-row"
                :class="{ 'swap-row--on': draft.externalId === e.id }"
                @click="swapTo(e)"
              >
                {{ e.name }}
                <span class="text-caption text--secondary ml-1">{{
                  e.id
                }}</span>
              </div>
            </template>
            <v-text-field
              v-if="!f.typeChoice"
              v-model="draft.externalId"
              :label="f.idLabel"
              outlined
              dense
              hide-details
              class="mt-2"
            />
          </template>
          <CompartmentGrid
            v-if="s.key === 'fach'"
            v-model="draft.compartmentIds"
            :multiple="true"
            :own="accessPoint.compartmentIds || []"
          />
          <v-radio-group
            v-if="s.key === 'openAction'"
            v-model="draft.openAction"
            dense
            hide-details
            class="mt-0"
          >
            <v-radio
              v-for="o in openActions"
              :key="o.value"
              :value="o.value"
              :disabled="o.disabled"
            >
              <template #label>
                <div>
                  <div>{{ o.text }}</div>
                  <div class="text-caption text--secondary">{{ o.hint }}</div>
                </div>
              </template>
            </v-radio>
          </v-radio-group>
          <template v-if="s.key === 'address'">
            <v-text-field
              v-model="draft.address"
              label="Adresse"
              outlined
              dense
              hide-details
            />
            <v-btn
              v-if="f.openAction"
              x-small
              text
              color="primary"
              class="mt-1 px-0"
              @click="draft.address = 'Rathausplatz 1, 24103 Kiel'"
            >
              <v-icon left x-small>mdi-crosshairs-gps</v-icon>
              Von Nuki übernehmen
            </v-btn>
          </template>
          <template v-if="s.key === 'tech'">
            <v-text-field
              v-if="f.accountField"
              v-model="draft.providerLocationId"
              label="Standort-ID beim Anbieter"
              hint="Nur zur Information, kein Anbieter liest sie."
              persistent-hint
              outlined
              dense
              class="mb-2"
            />
            <v-textarea
              v-model="draft.config"
              label="Konfiguration (JSON)"
              rows="3"
              outlined
              dense
              hide-details
            />
          </template>
          <div class="d-flex mt-3">
            <v-spacer />
            <v-btn small text @click="cancelEdit">Abbrechen</v-btn>
            <v-btn small depressed color="primary" @click="applyEdit">
              Übernehmen
            </v-btn>
          </div>
        </div>
      </div>

      <div class="panel-foot text-caption text--secondary">
        Jede Änderung gilt sofort. Buchungsobjekte, QR-Code und Löschen stehen
        in der Zeile.
      </div>
    </v-navigation-drawer>
  </div>
</template>

<style scoped>
.take-list {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 6px;
}
.take-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  min-height: 56px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
.take-row:last-child {
  border-bottom: 0;
}
.take-row__name {
  flex: 1;
  cursor: pointer;
}
.take-row--off {
  color: #9e9e9e;
}
.panel-head {
  display: flex;
  align-items: flex-start;
  padding: 16px 20px;
}
.sec {
  padding: 12px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
.sec--open {
  background: rgba(25, 118, 210, 0.04);
}
.sec__row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.sec__title {
  width: 130px;
  flex-shrink: 0;
  font-size: 13px;
  color: #616161;
}
.sec__value {
  flex: 1;
  font-size: 14px;
}
.sec__hint {
  margin-left: 142px;
  margin-top: 2px;
}
.sec__edit {
  margin-top: 10px;
}
.swap-row {
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}
.swap-row--on {
  background: rgba(25, 118, 210, 0.1);
}
.panel-foot {
  padding: 16px 20px;
}
</style>
