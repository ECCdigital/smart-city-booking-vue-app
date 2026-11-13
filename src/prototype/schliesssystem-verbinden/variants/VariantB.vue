<script>
/**
 * PROTOTYPE (tickets#1087) — Variante B: Im Abschnitt aufklappen.
 *
 * - Ort: Die Einstellungen klappen im Kopf des Abschnitts auf, die
 *   Zugangspunkte bleiben darunter sichtbar. „Verbinden“ legt einen
 *   gestrichelten Abschnitt „Nicht verbunden“ an, mit offenem Formular.
 * - Test und Speichern: zwei Knöpfe. „Verbindung testen“ rechts neben dem
 *   Formular, „Speichern“ im Fuß, je Schließsystem. Speichern geht auch ohne
 *   oder nach gescheitertem Test; der Abschnitt zeigt dann „Nicht geprüft“
 *   oder „Gestört“.
 * - Salto KS: Die IQs sind eine aufklappbare Zeile im Abschnitt, mit der
 *   Liste darin.
 * - Ausschalten: Schalter „Aktiv“ im Kopf, die Rückfrage steht als Zeile im
 *   Abschnitt. Entfernen im Fuß der Einstellungen, nur ohne Zugangspunkte.
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
  isConnected,
  isPaused,
  pause,
  resume,
  canRemove,
  remove,
  iqSummary,
  connection,
} from "../connections";
import {
  provider,
  accessPointsOf,
  stub,
} from "../../zugangspunkte-fuehrung/data";

export default {
  name: "VariantB",
  components: { SystemsPage, ProviderForm, TestResult, IqList },
  data() {
    return {
      drafts: [],
      panelId: null,
      form: null,
      formKey: 0,
      errors: {},
      running: false,
      result: null,
      testedSnapshot: null,
      iqOpen: false,
      confirmPause: null,
      fresh: null,
    };
  },
  computed: {
    iq() {
      return iqSummary();
    },
    stale() {
      // Ein Test gilt nur für die Werte, mit denen er lief.
      return (
        this.result && this.testedSnapshot !== JSON.stringify(this.form?.values)
      );
    },
  },
  methods: {
    provider,
    isPaused,
    isConnected,
    canRemove,
    apCount(id) {
      return accessPointsOf(id).length;
    },
    openPanel(id) {
      this.panelId = id;
      this.form = newForm(id);
      this.errors = {};
      this.result = null;
      this.running = false;
      this.formKey++;
    },
    connect(id) {
      if (!this.drafts.includes(id)) this.drafts.push(id);
      this.openPanel(id);
    },
    toggleSettings(id) {
      if (this.panelId === id) this.panelId = null;
      else this.openPanel(id);
    },
    discardDraft(id) {
      this.drafts = this.drafts.filter((d) => d !== id);
      if (this.panelId === id) this.panelId = null;
    },
    async test() {
      this.errors = validate(this.panelId, this.form);
      if (Object.keys(this.errors).length) return;
      this.result = null;
      this.running = true;
      const result = await runTest(this.panelId);
      this.running = false;
      this.result = result;
      this.testedSnapshot = JSON.stringify(this.form.values);
      if (!result.ok && result.field)
        this.errors = { [result.field]: "Abgelehnt." };
    },
    submit() {
      const id = this.panelId;
      this.errors = validate(id, this.form);
      if (Object.keys(this.errors).length) return;
      let status = "untested";
      if (this.result && !this.stale) status = this.result.ok ? "ok" : "error";
      const first = save(id, this.form, status, this.result?.message);
      this.drafts = this.drafts.filter((d) => d !== id);
      this.panelId = null;
      if (first) this.fresh = id;
      const word = {
        ok: "geprüft",
        untested: "nicht geprüft",
        error: "Test gescheitert",
      }[status];
      stub(`${provider(id).name}: Gespeichert (${word}).`);
    },
    onActive(id, on) {
      if (on) {
        resume(id);
        this.confirmPause = null;
      } else {
        this.confirmPause = id;
      }
    },
    doPause(id) {
      pause(id);
      this.confirmPause = null;
    },
    doRemove(id) {
      remove(id);
      this.panelId = null;
      stub(`Verbindung zu ${provider(id).name} entfernt.`);
    },
    saveCaption() {
      if (this.running) return "";
      if (!this.result || this.stale)
        return "Ungeprüft. Speichern geht trotzdem.";
      return this.result.ok
        ? "Geprüft."
        : "Test gescheitert. Speichern markiert es als gestört.";
    },
    lastChecked(id) {
      const c = connection(id);
      return c?.checkedAt
        ? `zuletzt geprüft ${c.checkedAt}`
        : "noch nie geprüft";
    },
  },
};
</script>

<template>
  <SystemsPage
    :drafts="drafts"
    :fresh="fresh"
    @connect="connect"
    @settings="openPanel"
    @resume="(id) => onActive(id, true)"
  >
    <!-- Kopf: Schalter Aktiv und Einstellungen -->
    <template #head-actions="{ p }">
      <v-switch
        :input-value="!isPaused(p.id) && confirmPause !== p.id"
        dense
        hide-details
        inset
        class="mt-0 pt-0 mr-1"
        :label="isPaused(p.id) ? 'Aus' : 'Aktiv'"
        @change="(on) => onActive(p.id, on)"
      />
      <v-btn small text class="mr-1" @click="toggleSettings(p.id)">
        <v-icon left small>mdi-cog-outline</v-icon>
        Einstellungen
        <v-icon right small>
          {{ panelId === p.id ? "mdi-chevron-up" : "mdi-chevron-down" }}
        </v-icon>
      </v-btn>
    </template>

    <!-- Rückfrage Ausschalten und Panel Einstellungen -->
    <template #below-head="{ p }">
      <div v-if="confirmPause === p.id" class="b-confirm">
        <v-icon small color="error" class="mr-2">mdi-power</v-icon>
        <span>
          {{ p.name }} ausschalten?
          <template v-if="apCount(p.id)">
            {{ apCount(p.id) }}
            {{ apCount(p.id) === 1 ? p.noun : p.nounPlural }}
            öffnen dann nicht mehr, auch nicht für laufende Buchungen.
          </template>
          Alles bleibt gespeichert.
        </span>
        <v-spacer />
        <v-btn x-small text @click="confirmPause = null">Abbrechen</v-btn>
        <v-btn x-small depressed color="error" @click="doPause(p.id)">
          Ausschalten
        </v-btn>
      </div>
      <div v-if="panelId === p.id && form" class="b-panel">
        <div class="b-panel__grid">
          <ProviderForm
            :key="formKey"
            :provider-id="p.id"
            :form="form"
            :errors="errors"
            mode="edit"
          />
          <aside class="b-panel__test">
            <div class="b-panel__test-title">Verbindung</div>
            <div class="b-panel__test-sub">{{ lastChecked(p.id) }}</div>
            <v-btn
              small
              outlined
              color="primary"
              :loading="running"
              @click="test"
            >
              <v-icon left small>mdi-connection</v-icon>
              Verbindung testen
            </v-btn>
            <TestResult
              class="mt-3"
              :running="running"
              :result="stale ? null : result"
            />
          </aside>
        </div>
        <div class="b-panel__foot">
          <v-btn
            v-if="isConnected(p.id)"
            x-small
            text
            :disabled="!canRemove(p.id)"
            :title="canRemove(p.id) ? '' : `Erst alle ${p.nounPlural} löschen`"
            @click="doRemove(p.id)"
          >
            Verbindung entfernen
          </v-btn>
          <v-spacer />
          <span class="b-caption mr-3">{{ saveCaption() }}</span>
          <v-btn small text @click="panelId = null">Abbrechen</v-btn>
          <v-btn small depressed color="primary" @click="submit"
            >Speichern</v-btn
          >
        </div>
      </div>
    </template>

    <!-- Salto KS: IQs als aufklappbare Zeile -->
    <template #iq-row="{ p }">
      <div v-if="p.id === 'salto-ks'" class="b-iq">
        <button
          type="button"
          class="b-iq__head"
          :class="{ 'b-iq__head--warn': iq.open }"
          @click="iqOpen = !iqOpen"
        >
          <v-icon small class="mr-2" :color="iq.open ? 'warning' : 'success'">
            {{ iq.open ? "mdi-alert-circle" : "mdi-check-circle" }}
          </v-icon>
          IQs: {{ iq.active }} von {{ iq.total }} aktiviert
          <span v-if="iq.open" class="ml-1">
            · Türen an {{ iq.open === 1 ? "diesem IQ" : "diesen IQs" }} öffnen
            noch nicht
          </span>
          <v-spacer />
          <v-icon small>{{
            iqOpen ? "mdi-chevron-up" : "mdi-chevron-down"
          }}</v-icon>
        </button>
        <IqList v-if="iqOpen" flat class="b-iq__list" />
      </div>
    </template>

    <!-- Neuer Abschnitt: Formular zum Verbinden -->
    <template #draft-actions="{ p }">
      <v-btn small text @click="discardDraft(p.id)">Verwerfen</v-btn>
    </template>
    <template #draft="{ p }">
      <div v-if="panelId === p.id && form" class="b-panel">
        <div class="b-panel__grid">
          <ProviderForm
            :key="formKey"
            :provider-id="p.id"
            :form="form"
            :errors="errors"
            mode="connect"
          />
          <aside class="b-panel__test">
            <div class="b-panel__test-title">Verbindung</div>
            <div class="b-panel__test-sub">
              Testen prüft die Zugangsdaten bei {{ p.name }}, ohne zu speichern.
            </div>
            <v-btn
              small
              outlined
              color="primary"
              :loading="running"
              @click="test"
            >
              <v-icon left small>mdi-connection</v-icon>
              Verbindung testen
            </v-btn>
            <TestResult
              class="mt-3"
              :running="running"
              :result="stale ? null : result"
            />
          </aside>
        </div>
        <div class="b-panel__foot">
          <v-spacer />
          <span class="b-caption mr-3">{{ saveCaption() }}</span>
          <v-btn small depressed color="primary" @click="submit">
            Speichern und aktivieren
          </v-btn>
        </div>
      </div>
      <div v-else class="system__empty pa-4 text-body-2">
        <v-btn small text color="primary" @click="openPanel(p.id)">
          Zugangsdaten eingeben
        </v-btn>
      </div>
    </template>
  </SystemsPage>
</template>

<style scoped>
.b-confirm {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  font-size: var(--scb-font-size-sm);
  background: var(--scb-error-tint, rgba(244, 67, 54, 0.08));
}

.b-panel {
  border-bottom: 1px solid var(--scb-rule-strong);
  box-shadow: inset 3px 0 0 var(--v-primary-base);
}

.b-panel__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 24px;
  padding: 16px 16px 4px 20px;
}

.b-panel__test {
  border-left: 1px solid var(--scb-rule);
  padding-left: 20px;
}

.b-panel__test-title {
  font-weight: var(--scb-font-weight-semibold);
  font-size: var(--scb-font-size-sm);
}

.b-panel__test-sub {
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
  margin-bottom: 10px;
}

.b-panel__foot {
  display: flex;
  align-items: center;
  padding: 8px 16px 12px 20px;
}

.b-caption {
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}

.b-iq {
  border-bottom: 1px solid var(--scb-rule);
}

.b-iq__head {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 8px 16px;
  font-size: var(--scb-font-size-sm);
  text-align: left;
}

.b-iq__head--warn {
  background: var(--scb-warning-tint);
}

.b-iq__list {
  border-top: 1px solid var(--scb-rule);
  padding-left: 16px;
}

@media (max-width: 860px) {
  .b-panel__grid {
    grid-template-columns: 1fr;
  }

  .b-panel__test {
    border-left: 0;
    padding-left: 0;
  }
}
</style>
