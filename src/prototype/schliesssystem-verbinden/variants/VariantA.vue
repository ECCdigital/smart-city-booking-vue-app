<script>
/**
 * PROTOTYPE (tickets#1087) — Variante A: Ein Dialog je Schließsystem.
 *
 * - Ort: „Verbinden“ und „Einstellungen“ öffnen denselben Dialog.
 * - Test und Speichern: ein Knopf. „Verbinden“ bzw. „Speichern“ prüft erst
 *   und speichert nur, wenn die Prüfung gelingt. Scheitert sie, bleibt der
 *   Dialog offen, der Fehler steht am Feld, nichts ist gespeichert.
 * - Salto KS: eigener Dialog „IQs“, aus der Zeile im Abschnitt, aus dem
 *   Einstellungs-Dialog und direkt nach dem ersten Verbinden.
 * - Ausschalten: im Fuß des Einstellungs-Dialogs, mit Rückfrage. Entfernen
 *   (Zugangsdaten löschen) nur ohne Zugangspunkte.
 */
import SystemsPage from "../SystemsPage.vue";
import ProviderForm from "../ProviderForm.vue";
import TestResult from "../TestResult.vue";
import IqList from "../IqList.vue";
import {
  newForm,
  validate,
  runTest,
  save,
  connection,
  isConnected,
  pause,
  resume,
  canRemove,
  remove,
  iqSummary,
} from "../connections";
import {
  provider,
  accessPointsOf,
  stub,
} from "../../zugangspunkte-fuehrung/data";

export default {
  name: "VariantA",
  components: { SystemsPage, ProviderForm, TestResult, IqList },
  data() {
    return {
      open: false,
      providerId: null,
      form: null,
      errors: {},
      running: false,
      result: null,
      iqOpen: false,
      confirm: null, // pause | remove
      fresh: null,
      formKey: 0,
    };
  },
  computed: {
    p() {
      return provider(this.providerId) || {};
    },
    editing() {
      return this.providerId && isConnected(this.providerId);
    },
    saved() {
      return connection(this.providerId);
    },
    apCount() {
      return this.providerId ? accessPointsOf(this.providerId).length : 0;
    },
    iq() {
      return iqSummary();
    },
    removable() {
      return this.providerId && canRemove(this.providerId);
    },
  },
  methods: {
    openDialog(id) {
      this.providerId = id;
      this.form = newForm(id);
      this.errors = {};
      this.result = null;
      this.running = false;
      this.formKey++;
      this.open = true;
    },
    async submit() {
      this.result = null;
      this.errors = validate(this.providerId, this.form);
      if (Object.keys(this.errors).length) return;
      this.running = true;
      const result = await runTest(this.providerId);
      this.running = false;
      if (!result.ok) {
        this.result = result;
        if (result.field) this.errors = { [result.field]: "Abgelehnt." };
        return;
      }
      const first = save(this.providerId, this.form, "ok");
      this.open = false;
      if (first) {
        this.fresh = this.providerId;
        if (this.providerId === "salto-ks") this.iqOpen = true;
      } else {
        stub(`${this.p.name}: Gespeichert. Die Verbindung ist geprüft.`);
      }
    },
    openIqs() {
      this.iqOpen = true;
    },
    doPause() {
      pause(this.providerId);
      this.confirm = null;
      this.open = false;
      stub(`${this.p.name} ist ausgeschaltet.`);
    },
    doResume(id) {
      resume(id);
      stub(`${provider(id).name} ist wieder eingeschaltet.`);
    },
    doRemove() {
      remove(this.providerId);
      this.confirm = null;
      this.open = false;
      stub(`Verbindung zu ${this.p.name} entfernt.`);
    },
  },
};
</script>

<template>
  <div>
    <SystemsPage
      :fresh="fresh"
      @connect="openDialog"
      @settings="openDialog"
      @iqs="openIqs"
      @resume="doResume"
    />

    <!-- ================= Dialog Verbinden / Einstellungen ================= -->
    <v-dialog v-model="open" max-width="560" scrollable>
      <v-card v-if="form">
        <v-card-title class="pb-1">
          <v-icon class="mr-2" color="primary">{{ p.icon }}</v-icon>
          {{ editing ? `${p.name}: Einstellungen` : `${p.name} verbinden` }}
        </v-card-title>
        <div v-if="editing && saved" class="a-status px-6 pb-3">
          <template v-if="saved.paused">Ausgeschaltet.</template>
          <template v-else-if="saved.status === 'ok'">
            Verbunden, zuletzt geprüft {{ saved.checkedAt }}.
          </template>
          <template v-else>Letzte Prüfung gescheitert.</template>
          {{ apCount }} {{ apCount === 1 ? p.noun : p.nounPlural }}.
        </div>
        <v-card-text class="pt-2">
          <ProviderForm
            :key="formKey"
            :provider-id="providerId"
            :form="form"
            :errors="errors"
            :mode="editing ? 'edit' : 'connect'"
          />

          <div
            v-if="editing && providerId === 'salto-ks'"
            class="a-iq-line mt-2"
          >
            <v-icon small class="mr-2">mdi-router-wireless</v-icon>
            IQs: {{ iq.active }} von {{ iq.total }} aktiviert
            <v-spacer />
            <v-btn x-small text color="primary" @click="openIqs">
              IQs verwalten
            </v-btn>
          </div>

          <TestResult
            class="mt-3"
            :running="running"
            :result="result"
            :running-text="`Prüfe die Verbindung zu ${p.name} …`"
          />
        </v-card-text>
        <v-divider />
        <v-card-actions class="px-4">
          <v-menu v-if="editing" top offset-y>
            <template #activator="{ on, attrs }">
              <v-btn text small v-bind="attrs" v-on="on">
                <v-icon left small>mdi-power</v-icon>
                Ausschalten …
              </v-btn>
            </template>
            <v-list dense>
              <v-list-item v-if="!saved.paused" @click="confirm = 'pause'">
                <v-list-item-content>
                  <v-list-item-title>Ausschalten</v-list-item-title>
                  <v-list-item-subtitle>
                    Zugangsdaten und {{ p.nounPlural }} bleiben
                  </v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>
              <v-list-item :disabled="!removable" @click="confirm = 'remove'">
                <v-list-item-content>
                  <v-list-item-title>Verbindung entfernen</v-list-item-title>
                  <v-list-item-subtitle>
                    {{
                      removable
                        ? "Löscht die Zugangsdaten"
                        : `Erst alle ${p.nounPlural} löschen`
                    }}
                  </v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>
            </v-list>
          </v-menu>
          <v-spacer />
          <span v-if="!running" class="a-hint mr-3">
            {{
              editing
                ? "Speichern prüft zuerst die Verbindung."
                : "Prüft und speichert."
            }}
          </span>
          <v-btn text @click="open = false">Abbrechen</v-btn>
          <v-btn color="primary" depressed :loading="running" @click="submit">
            {{ editing ? "Speichern" : "Verbinden" }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ================= Rückfrage Ausschalten / Entfernen ================= -->
    <v-dialog :value="!!confirm" max-width="440" @input="confirm = null">
      <v-card v-if="confirm === 'pause'">
        <v-card-title>{{ p.name }} ausschalten?</v-card-title>
        <v-card-text>
          <template v-if="apCount">
            {{ apCount }} {{ apCount === 1 ? p.noun : p.nounPlural }} öffnen
            dann nicht mehr, auch nicht für laufende Buchungen.
          </template>
          Zugangsdaten, {{ p.nounPlural }} und Zuordnungen bleiben gespeichert.
          Einschalten stellt alles wieder her.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="confirm = null">Abbrechen</v-btn>
          <v-btn color="error" depressed @click="doPause">Ausschalten</v-btn>
        </v-card-actions>
      </v-card>
      <v-card v-else-if="confirm === 'remove'">
        <v-card-title>Verbindung zu {{ p.name }} entfernen?</v-card-title>
        <v-card-text>
          Die Zugangsdaten werden gelöscht. Um {{ p.name }} wieder zu nutzen,
          verbinden Sie es neu.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="confirm = null">Abbrechen</v-btn>
          <v-btn color="error" depressed @click="doRemove">Entfernen</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ================= IQs von Salto KS ================= -->
    <v-dialog v-model="iqOpen" max-width="640">
      <v-card>
        <v-card-title>IQs von Salto KS</v-card-title>
        <v-card-text>
          <p class="text-body-2">
            Ein IQ verbindet die Türen mit Salto KS. Biletado öffnet eine Tür
            erst, wenn ihr IQ aktiviert ist. Salto schickt dafür je IQ eine PIN
            an den System-User.
          </p>
          <IqList />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="iqOpen = false">Schließen</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.a-status {
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text-muted);
}

.a-iq-line {
  display: flex;
  align-items: center;
  font-size: var(--scb-font-size-sm);
  border-top: 1px solid var(--scb-rule);
  padding-top: 8px;
}

.a-hint {
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}
</style>
