<script>
/**
 * PROTOTYPE (tickets#1087) — Variante C: Eine eigene Seite je Schließsystem.
 *
 * - Ort: „Verbinden“, „Einstellungen“ und „IQs aktivieren“ führen auf eine
 *   Unterseite (`?system=<anbieter>`), mit Weg zurück zur Übersicht.
 * - Verbinden: drei Schritte untereinander, Vorbereiten, Zugangsdaten,
 *   Verbinden; bei Salto KS dazu IQs aktivieren. Scheitert der Test, kann man
 *   trotzdem speichern; das Schließsystem steht dann als „Gestört“ da.
 * - Einstellungen: Zugangsdaten, IQs, Ausschalten untereinander; rechts der
 *   Stand der Verbindung mit „Jetzt testen“. Gespeichert wird über die
 *   SaveBar unten, wie heute, aber nur für dieses Schließsystem; sie prüft vor
 *   dem Speichern.
 * - Ausschalten und Entfernen: eigener Block unten auf der Seite.
 */
import SystemsPage from "../SystemsPage.vue";
import ProviderForm from "../ProviderForm.vue";
import TestResult from "../TestResult.vue";
import IqList from "../IqList.vue";
import {
  STATUS_CHIP,
  FORMS,
  newForm,
  validate,
  runTest,
  save,
  connection,
  isConnected,
  isDirty,
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
  name: "VariantC",
  components: { SystemsPage, ProviderForm, TestResult, IqList },
  data() {
    return {
      form: null,
      formKey: 0,
      errors: {},
      running: false,
      result: null,
      failedSave: null,
      justConnected: false,
      fresh: null,
      confirmRemove: false,
    };
  },
  computed: {
    systemId() {
      const id = this.$route.query.system;
      return provider(id) ? id : null;
    },
    p() {
      return provider(this.systemId) || {};
    },
    spec() {
      return FORMS[this.systemId];
    },
    connected() {
      return isConnected(this.systemId);
    },
    saved() {
      return connection(this.systemId);
    },
    setup() {
      return !this.connected || this.justConnected;
    },
    dirty() {
      return (
        this.form &&
        this.connected &&
        !this.justConnected &&
        isDirty(this.systemId, this.form)
      );
    },
    apCount() {
      return accessPointsOf(this.systemId).length;
    },
    chip() {
      if (!this.saved) return null;
      return STATUS_CHIP[this.saved.paused ? "paused" : this.saved.status];
    },
    iq() {
      return iqSummary();
    },
  },
  watch: {
    systemId: {
      immediate: true,
      handler(id) {
        if (!id) return;
        this.reset();
        this.justConnected = false;
        this.$nextTick(() => {
          if (this.$route.query.teil === "iqs") this.scrollTo("c-iqs");
          else window.scrollTo({ top: 0 });
        });
      },
    },
  },
  methods: {
    go(id, teil) {
      const query = {
        ...this.$route.query,
        system: id || undefined,
        teil: teil || undefined,
      };
      if (!id) this.fresh = this.justConnected ? this.systemId : null;
      this.$router.push({ query }).catch(() => {});
    },
    scrollTo(ref) {
      const el = this.$refs[ref];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    reset() {
      this.form = newForm(this.systemId);
      this.errors = {};
      this.result = null;
      this.failedSave = null;
      this.running = false;
      this.formKey++;
    },
    async check() {
      this.errors = validate(this.systemId, this.form);
      if (Object.keys(this.errors).length) return null;
      this.result = null;
      this.failedSave = null;
      this.running = true;
      const result = await runTest(this.systemId);
      this.running = false;
      this.result = result;
      if (!result.ok && result.field)
        this.errors = { [result.field]: "Abgelehnt." };
      return result;
    },
    async connectNow() {
      const result = await this.check();
      if (!result) return;
      if (result.ok) {
        save(this.systemId, this.form, "ok");
        this.justConnected = true;
      } else {
        this.failedSave = result.message;
      }
    },
    saveAnyway() {
      const first = save(this.systemId, this.form, "error", this.failedSave);
      if (first) this.justConnected = true;
      else {
        this.reset();
        stub(`${this.p.name}: Gespeichert, aber als gestört markiert.`);
      }
      this.failedSave = null;
    },
    async saveSettings() {
      const result = await this.check();
      if (!result) return;
      if (result.ok) {
        save(this.systemId, this.form, "ok");
        this.reset();
        this.result = result;
        stub(`${this.p.name}: Gespeichert. Die Verbindung ist geprüft.`);
      } else {
        this.failedSave = result.message;
      }
    },
    async testSaved() {
      this.running = true;
      this.result = null;
      const result = await runTest(this.systemId);
      this.running = false;
      this.result = result;
    },
    togglePause() {
      if (this.saved.paused) resume(this.systemId);
      else pause(this.systemId);
    },
    doRemove() {
      const id = this.systemId;
      remove(id);
      this.confirmRemove = false;
      this.go(null);
      stub(`Verbindung zu ${provider(id).name} entfernt.`);
    },
  },
};
</script>

<template>
  <div>
    <!-- ================= Übersicht ================= -->
    <SystemsPage
      v-if="!systemId"
      :fresh="fresh"
      settings-label="Verwalten"
      @connect="(id) => go(id)"
      @settings="(id) => go(id)"
      @iqs="(id) => go(id, 'iqs')"
      @resume="(id) => go(id)"
    />

    <!-- ================= Seite eines Schließsystems ================= -->
    <div v-else class="c-page">
      <button type="button" class="c-back" @click="go(null)">
        <v-icon small class="mr-1">mdi-arrow-left</v-icon>
        Zutritt & Schließsysteme
      </button>

      <header class="c-head">
        <v-icon large color="primary" class="mr-3">{{ p.icon }}</v-icon>
        <div>
          <div class="c-head__title">
            {{ setup && !justConnected ? `${p.name} verbinden` : p.name }}
            <v-chip
              v-if="chip && !setup"
              x-small
              :color="chip.color"
              :text-color="chip.dark ? 'white' : undefined"
              class="ml-2"
            >
              {{ chip.text }}
            </v-chip>
          </div>
          <div class="c-head__sub">
            <template v-if="setup">{{ p.hint }}</template>
            <template v-else>
              {{ apCount }} {{ apCount === 1 ? p.noun : p.nounPlural
              }}{{
                saved.checkedAt ? `, zuletzt geprüft ${saved.checkedAt}` : ""
              }}
            </template>
          </div>
        </div>
      </header>

      <!-- ---------- Einrichten: Schritte ---------- -->
      <ol v-if="setup" class="c-steps">
        <li class="c-step" :class="{ 'c-step--done': justConnected }">
          <div class="c-step__num">1</div>
          <div class="c-step__body">
            <div class="c-step__title">Vorbereiten in {{ p.name }}</div>
            <template v-if="spec.help">
              <p class="c-step__text">{{ spec.help.intro }}</p>
              <ul v-if="spec.help.items.length" class="c-step__list">
                <li v-for="i in spec.help.items" :key="i">{{ i }}</li>
              </ul>
              <p v-if="spec.help.note" class="c-step__text text--secondary">
                {{ spec.help.note }}
              </p>
            </template>
            <p v-else class="c-step__text">
              Sie brauchen die Zugangsdaten, die {{ p.name }} für den Mandanten
              vergeben hat.
            </p>
          </div>
        </li>
        <li class="c-step" :class="{ 'c-step--done': justConnected }">
          <div class="c-step__num">2</div>
          <div class="c-step__body">
            <div class="c-step__title">Zugangsdaten eintragen</div>
            <div v-if="!justConnected" class="c-step__form">
              <ProviderForm
                :key="formKey"
                :provider-id="systemId"
                :form="form"
                :errors="errors"
                mode="connect"
                hide-help
              />
            </div>
          </div>
        </li>
        <li class="c-step" :class="{ 'c-step--done': justConnected }">
          <div class="c-step__num">3</div>
          <div class="c-step__body">
            <div class="c-step__title">Verbinden</div>
            <template v-if="!justConnected">
              <p class="c-step__text">
                Biletado prüft die Zugangsdaten bei {{ p.name }} und speichert
                sie.
              </p>
              <v-btn
                depressed
                color="primary"
                :loading="running"
                @click="connectNow"
              >
                Verbinden
              </v-btn>
              <TestResult
                class="mt-3 c-narrow"
                :running="running"
                :result="result"
              />
              <div v-if="failedSave" class="mt-2 c-anyway">
                Sie können trotzdem speichern. {{ p.name }} steht dann als
                „Gestört“ in der Übersicht, bis ein Test gelingt.
                <v-btn x-small text color="error" @click="saveAnyway">
                  Trotzdem speichern
                </v-btn>
              </div>
            </template>
            <p v-else class="c-step__text">
              <v-icon small color="success">mdi-check-circle</v-icon>
              {{ p.name }} ist verbunden.
            </p>
          </div>
        </li>
        <li v-if="systemId === 'salto-ks'" ref="c-iqs" class="c-step">
          <div class="c-step__num">4</div>
          <div class="c-step__body">
            <div class="c-step__title">IQs aktivieren</div>
            <p class="c-step__text">
              Biletado öffnet eine Tür erst, wenn ihr IQ aktiviert ist. Salto
              schickt dafür je IQ eine PIN an den System-User. Das geht auch
              später, über die Zeile im Abschnitt.
            </p>
            <IqList v-if="justConnected" class="c-narrow" />
          </div>
        </li>
        <li v-if="justConnected" class="c-done">
          <v-btn depressed color="primary" @click="go(null)">
            Zur Übersicht:
            {{
              p.fromProvider ? "Anlagen übernehmen" : `${p.nounPlural} anlegen`
            }}
          </v-btn>
        </li>
      </ol>

      <!-- ---------- Einstellungen ---------- -->
      <div v-else class="c-grid">
        <div class="c-main">
          <div v-if="saved.paused" class="c-banner c-banner--paused">
            Ausgeschaltet. Seine {{ p.nounPlural }} öffnen nicht.
            <v-btn x-small outlined class="ml-2" @click="togglePause"
              >Einschalten</v-btn
            >
          </div>

          <section class="c-block">
            <h3 class="c-block__title">Zugangsdaten</h3>
            <ProviderForm
              :key="formKey"
              :provider-id="systemId"
              :form="form"
              :errors="errors"
              mode="edit"
              hide-help
            />
          </section>

          <section v-if="systemId === 'salto-ks'" ref="c-iqs" class="c-block">
            <h3 class="c-block__title">
              IQs
              <span class="c-block__meta"
                >{{ iq.active }} von {{ iq.total }} aktiviert</span
              >
            </h3>
            <IqList />
          </section>

          <section class="c-block">
            <h3 class="c-block__title">Ausschalten oder entfernen</h3>
            <div class="c-row">
              <div class="flex-grow-1">
                <div class="font-weight-medium">
                  {{ saved.paused ? "Wieder einschalten" : "Ausschalten" }}
                </div>
                <div class="c-row__text">
                  {{
                    saved.paused
                      ? `Die ${p.nounPlural} öffnen wieder für ihre Buchungen.`
                      : `${
                          apCount === 1
                            ? `Die ${p.noun} öffnet`
                            : `Die ${apCount} ${p.nounPlural} öffnen`
                        } nicht mehr, auch nicht für laufende Buchungen. Zugangsdaten, ${
                          p.nounPlural
                        } und Zuordnungen bleiben.`
                  }}
                </div>
              </div>
              <v-btn
                small
                outlined
                :color="saved.paused ? 'primary' : 'error'"
                @click="togglePause"
              >
                {{ saved.paused ? "Einschalten" : "Ausschalten" }}
              </v-btn>
            </div>
            <div class="c-row">
              <div class="flex-grow-1">
                <div class="font-weight-medium">Verbindung entfernen</div>
                <div class="c-row__text">
                  Löscht die Zugangsdaten.
                  <template v-if="apCount">
                    Geht erst, wenn keine {{ p.nounPlural }} mehr angelegt sind.
                  </template>
                </div>
              </div>
              <v-btn
                small
                outlined
                color="error"
                :disabled="apCount > 0"
                @click="confirmRemove = true"
              >
                Entfernen
              </v-btn>
            </div>
          </section>
        </div>

        <aside class="c-side">
          <div class="c-side__card">
            <div class="c-side__title">Verbindung</div>
            <div class="c-side__text">
              <template v-if="saved.status === 'ok'"
                >Zuletzt geprüft {{ saved.checkedAt }}: in Ordnung.</template
              >
              <template v-else-if="saved.status === 'error'"
                >Letzte Prüfung gescheitert: {{ saved.lastError }}</template
              >
              <template v-else>Noch nicht geprüft.</template>
            </div>
            <v-btn
              small
              outlined
              color="primary"
              :loading="running && !dirty"
              :disabled="dirty"
              @click="testSaved"
            >
              Jetzt testen
            </v-btn>
            <div v-if="dirty" class="c-side__text mt-1">
              Testet die gespeicherten Daten. Ihre Änderungen prüft „Speichern“.
            </div>
            <TestResult class="mt-3" :running="running" :result="result" />
          </div>
          <div v-if="spec.help" class="c-side__card">
            <div class="c-side__title">{{ spec.help.title }}</div>
            <ul class="c-step__list">
              <li v-for="i in spec.help.items" :key="i">{{ i }}</li>
            </ul>
            <p v-if="!spec.help.items.length" class="c-side__text">
              {{ spec.help.intro }}
            </p>
          </div>
        </aside>
      </div>

      <!-- SaveBar nur für dieses Schließsystem -->
      <div v-if="dirty || failedSave" class="c-savebar">
        <template v-if="failedSave">
          <v-icon small color="error" class="mr-2">mdi-close-circle</v-icon>
          <span class="flex-grow-1">Nicht gespeichert: {{ failedSave }}</span>
          <v-btn small text @click="reset">Verwerfen</v-btn>
          <v-btn small text color="error" @click="saveAnyway"
            >Trotzdem speichern</v-btn
          >
          <v-btn
            small
            depressed
            color="primary"
            :loading="running"
            @click="saveSettings"
            >Erneut prüfen</v-btn
          >
        </template>
        <template v-else>
          <span class="flex-grow-1"
            >Ungespeicherte Änderungen an {{ p.name }}. Speichern prüft zuerst
            die Verbindung.</span
          >
          <v-btn small text @click="reset">Verwerfen</v-btn>
          <v-btn
            small
            depressed
            color="primary"
            :loading="running"
            @click="saveSettings"
            >Speichern</v-btn
          >
        </template>
      </div>

      <v-dialog v-model="confirmRemove" max-width="420">
        <v-card>
          <v-card-title>Verbindung zu {{ p.name }} entfernen?</v-card-title>
          <v-card-text>Die Zugangsdaten werden gelöscht.</v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn text @click="confirmRemove = false">Abbrechen</v-btn>
            <v-btn depressed color="error" @click="doRemove">Entfernen</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </div>
  </div>
</template>

<style scoped>
.c-back {
  display: inline-flex;
  align-items: center;
  font-size: var(--scb-font-size-sm);
  color: var(--v-primary-base);
  margin-bottom: 12px;
}

.c-head {
  display: flex;
  align-items: center;
  padding-bottom: 16px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--scb-rule-strong);
}

.c-head__title {
  font-size: 22px;
  font-weight: var(--scb-font-weight-semibold);
  display: flex;
  align-items: center;
}

.c-head__sub {
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text-muted);
}

/* Einrichten: eine echte Reihenfolge, die Nummern tragen Bedeutung. */
.c-steps {
  list-style: none;
  padding: 0;
  max-width: 720px;
}

.c-step {
  display: flex;
  gap: 16px;
  padding-bottom: 24px;
  position: relative;
}

.c-step:not(:last-child)::before {
  content: "";
  position: absolute;
  left: 13px;
  top: 30px;
  bottom: 4px;
  width: 2px;
  background: var(--scb-rule-strong);
}

.c-step__num {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 2px solid var(--v-primary-base);
  color: var(--v-primary-base);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--scb-font-weight-semibold);
  font-size: var(--scb-font-size-sm);
  background: var(--v-background-base, #fff);
}

.c-step--done .c-step__num {
  background: var(--v-success-base);
  border-color: var(--v-success-base);
  color: #fff;
}

.c-step__body {
  flex: 1;
  min-width: 0;
  padding-top: 3px;
}

.c-step__title {
  font-weight: var(--scb-font-weight-semibold);
  margin-bottom: 6px;
}

.c-step__text {
  font-size: var(--scb-font-size-sm);
  max-width: 64ch;
  margin-bottom: 8px;
}

.c-step__list {
  font-size: var(--scb-font-size-sm);
  padding-left: 18px;
  margin-bottom: 8px;
  max-width: 64ch;
}

.c-step__form {
  max-width: 460px;
}

.c-narrow {
  max-width: 560px;
}

.c-anyway {
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
  max-width: 560px;
}

.c-done {
  padding-left: 44px;
}

/* Einstellungen */
.c-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 32px;
  padding-bottom: 72px;
}

.c-main {
  max-width: 620px;
}

.c-block {
  padding-bottom: 20px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--scb-rule);
}

.c-block__title {
  font-size: var(--scb-font-size-header);
  font-weight: var(--scb-font-weight-semibold);
  margin-bottom: 12px;
}

.c-block__meta {
  font-size: var(--scb-font-size-sm);
  font-weight: normal;
  color: var(--scb-text-muted);
  margin-left: 8px;
}

.c-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 0;
  font-size: var(--scb-font-size-sm);
}

.c-row + .c-row {
  border-top: 1px solid var(--scb-rule);
}

.c-row__text {
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
  max-width: 60ch;
}

.c-banner {
  padding: 8px 12px;
  border-radius: var(--scb-radius-surface);
  font-size: var(--scb-font-size-sm);
  margin-bottom: 16px;
}

.c-banner--paused {
  background: var(--scb-surface-tint);
}

.c-side__card {
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-surface);
  padding: 14px 16px;
  margin-bottom: 16px;
}

.c-side__title {
  font-weight: var(--scb-font-weight-semibold);
  font-size: var(--scb-font-size-sm);
  margin-bottom: 4px;
}

.c-side__text {
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
  margin-bottom: 10px;
}

.c-savebar {
  position: sticky;
  bottom: 72px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--v-background-base, #fff);
  border: 1px solid var(--v-primary-base);
  border-radius: var(--scb-radius-surface);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  font-size: var(--scb-font-size-sm);
  z-index: 3;
}

@media (max-width: 960px) {
  .c-grid {
    grid-template-columns: 1fr;
  }
}
</style>
