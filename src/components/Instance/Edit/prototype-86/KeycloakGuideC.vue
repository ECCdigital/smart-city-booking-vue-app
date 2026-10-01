<template>
  <!-- PROTOTYPE (ECCdigital/tickets#86), Variante C „Assistent“: Der Tab
       bleibt das Formular. Anleitung und Prüfung öffnen sich als Assistent
       in einem eigenen Fenster, Schritt für Schritt. -->
  <div>
    <v-sheet
      rounded
      class="assistant-teaser pa-4 mb-2 d-flex align-center flex-wrap"
      :class="guide.complete ? 'assistant-teaser--ready' : 'assistant-teaser--new'"
      style="gap: 12px"
    >
      <v-icon large :color="guide.complete ? 'primary' : 'warning'">
        {{ guide.complete ? "mdi-shield-check-outline" : "mdi-shield-plus-outline" }}
      </v-icon>
      <div class="flex-grow-1">
        <div class="font-weight-medium">
          {{
            guide.complete
              ? "Keycloak-Realm einrichten und prüfen"
              : "SSO ist noch nicht eingerichtet"
          }}
        </div>
        <div class="text-body-2 text--secondary">
          <template v-if="!guide.complete">
            Der Assistent zeigt Schritt für Schritt, was in Keycloak anzulegen
            ist. Die Adressen dieser Instanz kennt er schon.
          </template>
          <template v-else-if="check.state === 'done'">
            Letzte Prüfung um {{ checkedAt }}: {{ summaryText }}
          </template>
          <template v-else>
            Anleitung mit den Werten dieser Instanz und Prüfung des Realms.
          </template>
        </div>
      </div>
      <v-btn
        v-if="guide.complete"
        outlined
        color="primary"
        :disabled="!!lock"
        :loading="check.state === 'running'"
        @click="runAndOpen"
      >
        Prüfen
      </v-btn>
      <v-btn color="primary" @click="openAt(1)">
        {{ guide.complete ? "Assistent öffnen" : "Einrichtung starten" }}
      </v-btn>
    </v-sheet>
    <div v-if="lock && guide.complete" class="text-caption text--secondary mb-2">
      {{ lock }}
    </div>
    <v-alert v-if="justSaved" type="info" text dense>
      Gespeichert. Die Anmeldung läuft bis zu einer Minute noch mit den alten
      Werten.
    </v-alert>

    <InstanceEditKeycloak
      :instance="instance"
      :tenants="tenants"
      :available-roles="availableRoles"
      @update:instance="$emit('update:instance', $event)"
    />

    <v-dialog v-model="open" fullscreen hide-overlay transition="dialog-bottom-transition">
      <v-card tile>
        <v-toolbar flat dark color="primary">
          <v-btn icon dark @click="open = false"><v-icon>mdi-close</v-icon></v-btn>
          <v-toolbar-title>
            Keycloak-Realm für {{ guide.instanceName }}
            <span class="text-body-2 ml-2" style="opacity: 0.8"
              >{{ guide.version }} · Admin UI im Modus {{ modeLabel }}</span
            >
          </v-toolbar-title>
          <v-spacer />
          <v-btn text dark @click="textOpen = true">
            <v-icon left>mdi-content-copy</v-icon>
            Als Text kopieren
          </v-btn>
        </v-toolbar>

        <div class="assistant-body">
          <v-alert v-if="!guide.complete" type="warning" text dense>
            In Biletado fehlen noch {{ guide.missing.join(", ") }}. Die
            Anleitung zeigt dafür Platzhalter. Lege in Keycloak an, trage die
            Werte unter „Authentifizierung“ ein und speichere, dann kannst du
            prüfen.
          </v-alert>

          <v-stepper v-model="step" vertical non-linear class="elevation-0">
            <template v-for="(s, i) in steps">
              <v-stepper-step
                :key="'s' + s.key"
                :step="i + 1"
                editable
                :complete="s.status === 'ok' || s.status === 'info'"
                :rules="[() => s.status !== 'fail']"
                :edit-icon="s.status === 'ok' ? 'mdi-check' : 'mdi-pencil'"
              >
                {{ s.title }}
                <small v-if="s.status === 'fail'">{{ s.failText }}</small>
                <small v-else>{{ s.sub }}</small>
              </v-stepper-step>

              <v-stepper-content :key="'c' + s.key" :step="i + 1">
                <!-- Realm -->
                <template v-if="s.key === 'realm'">
                  <p class="text-body-2">
                    Lege in Keycloak einen Realm an oder nimm einen
                    bestehenden. Biletado braucht diese Werte:
                  </p>
                  <div class="field-grid">
                    <div class="field-label">Keycloak-URL</div>
                    <KcValue v-bind="guide.serverUrl" />
                    <div class="field-label">Realm</div>
                    <KcValue v-bind="guide.realm" />
                    <div class="field-label">Issuer</div>
                    <KcValue v-bind="guide.issuer" />
                  </div>
                  <p class="text-body-2 text--secondary mt-2">{{ guide.notes[1] }}</p>
                </template>

                <!-- Public client -->
                <template v-else-if="s.key === 'public'">
                  <p class="text-body-2">
                    Ein Client für die Anmeldung. Admin UI und Storefront
                    nutzen ihn gemeinsam.
                  </p>
                  <div class="field-grid">
                    <template v-for="x in guide.publicSettings">
                      <div :key="'l' + x.name" class="field-label">{{ x.name }}</div>
                      <KcValue
                        :key="'v' + x.name"
                        :text="x.value"
                        :missing="x.missing"
                        :copy="!!x.copy"
                      />
                    </template>
                  </div>
                </template>

                <!-- Addresses -->
                <template v-else-if="s.key === 'addresses'">
                  <p class="text-body-2">
                    Am Web-Client
                    <KcValue v-bind="guide.publicClient" :copy="false" />,
                    Tab „Settings“, Abschnitt „Access settings“.
                  </p>
                  <v-tabs v-model="appTab" height="36" class="mb-2">
                    <v-tab v-for="app in guide.apps" :key="app.label">
                      {{ app.label }}
                      <v-icon v-if="app.hint" small right color="warning">mdi-alert</v-icon>
                    </v-tab>
                  </v-tabs>
                  <div v-for="(app, ai) in guide.apps" v-show="appTab === ai" :key="app.label">
                    <v-alert v-if="app.hint" type="warning" text dense>{{ app.hint }}</v-alert>
                    <div v-for="kind in uriKinds" :key="kind.key" class="mb-3">
                      <div class="field-label">{{ kind.label }}</div>
                      <div v-for="uri in app[kind.key]" :key="uri">
                        <KcValue :text="uri" />
                      </div>
                    </div>
                    <p v-if="app.note" class="text-body-2 text--secondary">{{ app.note }}</p>
                  </div>
                </template>

                <!-- Audience -->
                <template v-else-if="s.key === 'audience'">
                  <p class="text-body-2">
                    Damit Biletado die Tokens des Web-Clients prüfen kann, nennen
                    sie den API-Client als Audience.
                  </p>
                  <div class="field-grid">
                    <template v-for="x in guide.audienceMapper">
                      <div :key="'l' + x.name" class="field-label">{{ x.name }}</div>
                      <KcValue
                        :key="'v' + x.name"
                        :text="x.value"
                        :missing="x.missing"
                        :copy="!!x.copy"
                      />
                    </template>
                  </div>
                  <p class="text-body-2 text--secondary mt-2">{{ guide.notes[0] }}</p>
                </template>

                <!-- Confidential -->
                <template v-else-if="s.key === 'confidential'">
                  <p class="text-body-2">
                    Ein zweiter Client, nur damit Biletado Tokens prüfen kann.
                    Niemand meldet sich darüber an.
                  </p>
                  <div class="field-grid">
                    <template v-for="x in guide.confidentialSettings">
                      <div :key="'l' + x.name" class="field-label">{{ x.name }}</div>
                      <KcValue
                        :key="'v' + x.name"
                        :text="x.value"
                        :missing="x.missing"
                        :copy="!!x.copy"
                      />
                    </template>
                  </div>
                </template>

                <!-- Roles -->
                <template v-else-if="s.key === 'roles'">
                  <v-alert type="warning" text dense>{{ guide.roles.warning }}</v-alert>
                  <p class="text-body-2 mb-1">Diese Client-Rollen anlegen und Personen zuweisen:</p>
                  <div class="mb-3">
                    <KcValue v-for="r in guide.roles.names" :key="r" :text="r" class="mr-2" />
                    <span v-if="!guide.roles.names.length" class="text--secondary"
                      >Noch keine Rollenzuweisung in Biletado.</span
                    >
                  </div>
                  <div class="field-grid">
                    <template v-for="x in guide.roles.settings">
                      <div :key="'l' + x.name" class="field-label">{{ x.name }}</div>
                      <KcValue
                        :key="'v' + x.name"
                        :text="x.value"
                        :missing="x.missing"
                        :copy="!!x.copy"
                      />
                    </template>
                  </div>
                </template>

                <!-- Check -->
                <template v-else-if="s.key === 'check'">
                  <p class="text-body-2">
                    Biletado fragt Keycloak mit den gespeicherten Werten ab.
                    Keycloak bleibt dabei unverändert. {{ guide.notes[2] }}
                  </p>
                  <div class="d-flex align-center mb-4" style="gap: 12px">
                    <v-btn
                      color="primary"
                      :disabled="!!lock"
                      :loading="check.state === 'running'"
                      @click="run"
                    >
                      <v-icon left>mdi-stethoscope</v-icon>
                      Jetzt prüfen
                    </v-btn>
                    <span v-if="lock" class="text-body-2 text--secondary">{{ lock }}</span>
                    <span v-else-if="check.state === 'done'" class="text-body-2">
                      {{ summaryText }}
                    </span>
                  </div>
                  <v-card
                    v-for="row in check.state === 'done' ? check.rows : []"
                    :key="row.id"
                    outlined
                    class="mb-2 pa-3 d-flex"
                    style="gap: 10px"
                  >
                    <v-icon :color="STATUS[row.status].color">{{ STATUS[row.status].icon }}</v-icon>
                    <div class="flex-grow-1">
                      <div class="font-weight-medium">
                        {{ row.title }}
                        <span class="text-caption text--secondary ml-1">{{
                          STATUS[row.status].label
                        }}</span>
                      </div>
                      <div class="text-body-2">{{ row.reason }}</div>
                      <div v-for="p in row.parts || []" :key="p.label" class="text-caption">
                        {{ p.label }}: {{ STATUS[p.status].label }}, {{ p.reason }}
                      </div>
                    </div>
                    <v-btn
                      v-if="row.status === 'fail' && stepIndex(row.step) !== null"
                      small
                      text
                      color="primary"
                      @click="step = stepIndex(row.step) + 1"
                    >
                      Zu Schritt {{ stepIndex(row.step) + 1 }}
                    </v-btn>
                  </v-card>
                  <v-btn
                    v-if="check.state === 'done'"
                    text
                    small
                    color="primary"
                    @click="checkTextOpen = true"
                  >
                    <v-icon left small>mdi-content-copy</v-icon>
                    Ergebnis als Text kopieren
                  </v-btn>
                </template>

                <div v-if="s.key !== 'check'" class="mt-4">
                  <v-btn color="primary" small @click="step = i + 2">Weiter</v-btn>
                </div>
              </v-stepper-content>
            </template>
          </v-stepper>
        </div>
      </v-card>
    </v-dialog>

    <TextDialog v-model="textOpen" title="Anleitung als Text kopiert" :text="guideText" />
    <TextDialog v-model="checkTextOpen" title="Ergebnis als Text kopiert" :text="checkText" />
  </div>
</template>

<script>
import InstanceEditKeycloak from "@/components/Instance/Edit/InstanceEditKeycloak.vue";
import KcValue from "./KcValue.vue";
import TextDialog from "./TextDialog.vue";
import {
  scenario,
  check,
  effectiveConfig,
  buildGuide,
  checkLock,
  runCheck,
  summary,
  STATUS,
  guideAsText,
  checkAsText,
} from "./scenario";

const RANK = { fail: 4, na: 3, info: 2, ok: 1 };

export default {
  name: "KeycloakGuideC",
  components: { InstanceEditKeycloak, KcValue, TextDialog },
  props: {
    instance: { type: Object, required: true },
    tenants: { type: Array, default: () => [] },
    availableRoles: { type: Array, default: () => [] },
    hasUnsavedChanges: { type: Boolean, default: false },
  },
  data() {
    return {
      scenario,
      check,
      STATUS,
      open: false,
      step: 1,
      appTab: 0,
      textOpen: false,
      checkTextOpen: false,
      uriKinds: [
        { key: "redirectUris", label: "Valid redirect URIs" },
        { key: "postLogoutUris", label: "Valid post logout redirect URIs" },
        { key: "webOrigins", label: "Web origins" },
      ],
    };
  },
  computed: {
    guide() {
      return buildGuide(effectiveConfig(this.instance));
    },
    modeLabel() {
      return this.guide.mode === "bff" ? "BFF" : "direct";
    },
    lock() {
      return checkLock(this.guide, this.hasUnsavedChanges);
    },
    justSaved() {
      return scenario.justSaved === "yes";
    },
    summaryText() {
      return summary(check.rows);
    },
    checkedAt() {
      return check.at ? check.at.toLocaleTimeString("de-DE") : "";
    },
    steps() {
      const g = this.guide;
      const defs = [
        { key: "realm", title: "Realm", sub: "Keycloak-URL und Realm" },
        { key: "public", title: `Web-Client ${g.publicClient.text}`, sub: "public, Code mit PKCE S256" },
        { key: "addresses", title: "Adressen", sub: "Rücksprungadressen und Web Origins" },
        { key: "audience", title: "Audience-Mapper", sub: `im Scope ${g.publicClient.text}-dedicated` },
        { key: "confidential", title: `API-Client ${g.privateClient.text}`, sub: "confidential, nur Token-Introspection" },
      ];
      if (g.roles) defs.push({ key: "roles", title: "Client-Rollen", sub: "für die Rollenzuordnung" });
      defs.push({ key: "check", title: "Prüfen", sub: "Biletado fragt Keycloak ab" });
      return defs.map((d) => {
        const rows =
          check.state === "done"
            ? check.rows.filter(
              (r) => r.step === d.key || (d.key === "addresses" && r.step === "portal")
            )
            : [];
        let status = "open";
        if (rows.length)
          status = rows.reduce((w, r) => (RANK[r.status] > RANK[w] ? r.status : w), "ok");
        const fails = rows.filter((r) => r.status === "fail");
        return {
          ...d,
          status,
          failText: fails.map((r) => r.title).join(", ") + ": nicht erfüllt",
        };
      });
    },
    guideText() {
      return guideAsText(this.guide);
    },
    checkText() {
      return checkAsText(this.guide, check.rows, check.at);
    },
  },
  methods: {
    openAt(n) {
      this.step = n;
      this.open = true;
    },
    run() {
      runCheck(this.guide);
    },
    runAndOpen() {
      this.run();
      this.openAt(this.steps.length);
    },
    stepIndex(key) {
      const k = key === "portal" ? "addresses" : key;
      const i = this.steps.findIndex((s) => s.key === k);
      return i === -1 ? null : i;
    },
  },
};
</script>

<style scoped>
.assistant-teaser--new {
  background: rgba(255, 152, 0, 0.08);
  border: 1px solid rgba(255, 152, 0, 0.4);
}
.assistant-teaser--ready {
  background: rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.12);
}
.assistant-body {
  max-width: 920px;
  margin: 0 auto;
  padding: 24px 16px 96px;
}
.field-grid {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 6px 16px;
  align-items: center;
}
.field-label {
  font-size: 0.8125rem;
  color: rgba(0, 0, 0, 0.6);
}
</style>
