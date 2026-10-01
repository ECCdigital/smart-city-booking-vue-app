<template>
  <!-- PROTOTYPE (ECCdigital/tickets#86), Variante B „Checkliste“: Anleitung
       und Prüfung sind eine Liste. Jeder Schritt sagt, was einzustellen ist,
       und trägt das Ergebnis der Prüfung dafür. -->
  <div>
    <v-card outlined class="pa-4 mb-4">
      <div class="d-flex align-center flex-wrap" style="gap: 12px">
        <v-icon color="primary">mdi-lock</v-icon>
        <div class="flex-grow-1">
          <div class="text-subtitle-1 font-weight-medium">
            Single Sign-On mit Keycloak
          </div>
          <div class="text-body-2 text--secondary">
            <template v-if="guide.complete">
              <KcValue v-bind="guide.issuer" :copy="false" /> · Admin UI im
              Modus {{ modeLabel }}
            </template>
            <template v-else>Noch nicht eingerichtet</template>
          </div>
        </div>
        <v-btn
          color="primary"
          :disabled="!!lock"
          :loading="check.state === 'running'"
          @click="run"
        >
          <v-icon left>mdi-stethoscope</v-icon>
          Realm prüfen
        </v-btn>
        <v-menu offset-y left>
          <template #activator="{ on }">
            <v-btn outlined v-on="on">
              <v-icon left>mdi-content-copy</v-icon>
              Als Text
              <v-icon right>mdi-menu-down</v-icon>
            </v-btn>
          </template>
          <v-list dense>
            <v-list-item @click="textOpen = 'guide'">
              <v-list-item-title>Anleitung kopieren</v-list-item-title>
            </v-list-item>
            <v-list-item
              :disabled="check.state !== 'done'"
              @click="textOpen = 'both'"
            >
              <v-list-item-title>Anleitung mit Ergebnis kopieren</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>

      <div class="mt-3 text-body-2">
        <template v-if="lock">
          <v-icon small class="mr-1">mdi-lock-outline</v-icon>{{ lock }}
        </template>
        <template v-else-if="check.state === 'done'">
          <v-chip
            v-for="s in chipCounts"
            :key="s.status"
            small
            label
            class="mr-2"
            :color="STATUS[s.status].color"
            text-color="white"
          >
            {{ s.count }} {{ STATUS[s.status].label }}
          </v-chip>
          <span class="text--secondary">geprüft um {{ checkedAt }}</span>
        </template>
        <template v-else>
          <span class="text--secondary"
            >Noch nicht geprüft. Die Prüfung nutzt die gespeicherten Werte und
            ändert nichts in Keycloak.</span
          >
        </template>
      </div>
      <v-alert v-if="justSaved" type="info" text dense class="mt-3 mb-0">
        Gespeichert. Die Anmeldung läuft bis zu einer Minute noch mit den alten
        Werten.
      </v-alert>
    </v-card>

    <v-expansion-panels v-model="formPanel" class="mb-6">
      <v-expansion-panel>
        <v-expansion-panel-header>
          <div>
            <div class="font-weight-medium">Verbindung zu Keycloak</div>
            <div class="text-caption text--secondary">
              Keycloak-URL, Realm, Clients, Secret, Rollenzuordnung
            </div>
          </div>
        </v-expansion-panel-header>
        <v-expansion-panel-content>
          <InstanceEditKeycloak
            :instance="instance"
            :tenants="tenants"
            :available-roles="availableRoles"
            @update:instance="$emit('update:instance', $event)"
          />
        </v-expansion-panel-content>
      </v-expansion-panel>
    </v-expansion-panels>

    <div class="d-flex align-baseline mb-2">
      <span class="text-subtitle-1 font-weight-medium"
        >Checkliste für den Realm</span
      >
      <span class="ml-2 text-body-2 text--secondary">{{ guide.version }}</span>
    </div>

    <template v-for="app in guide.apps">
      <v-alert
        v-if="app.hint"
        :key="'hint-' + app.label"
        type="warning"
        text
        dense
      >
        <strong>{{ app.label }}:</strong> {{ app.hint }}
      </v-alert>
    </template>

    <v-expansion-panels v-model="openSteps" multiple accordion>
      <v-expansion-panel v-for="(step, i) in steps" :key="step.key">
        <v-expansion-panel-header>
          <div class="d-flex align-center" style="gap: 12px">
            <v-avatar
              size="26"
              :color="step.status === 'open' ? 'grey lighten-3' : STATUS[step.status].color"
            >
              <span
                v-if="step.status === 'open'"
                class="text-caption font-weight-bold"
                >{{ i + 1 }}</span
              >
              <v-icon v-else small color="white">{{
                STATUS[step.status].icon
              }}</v-icon>
            </v-avatar>
            <div>
              <div class="font-weight-medium">{{ step.title }}</div>
              <div class="text-caption text--secondary">{{ step.sub }}</div>
            </div>
          </div>
        </v-expansion-panel-header>
        <v-expansion-panel-content>
          <div
            v-for="row in step.rows"
            :key="row.id"
            class="check-line"
            :class="'check-line--' + row.status"
          >
            <v-icon small :color="STATUS[row.status].color">{{
              STATUS[row.status].icon
            }}</v-icon>
            <div>
              <span class="font-weight-medium">{{ row.title }}</span>
              <span class="text-caption ml-1">({{ STATUS[row.status].label }})</span>
              <div class="text-body-2">{{ row.reason }}</div>
              <div
                v-for="p in row.parts || []"
                :key="p.label"
                class="text-caption"
              >
                {{ p.label }}: {{ STATUS[p.status].label }}, {{ p.reason }}
              </div>
            </div>
          </div>

          <!-- what to set -->
          <template v-if="step.key === 'realm'">
            <dl class="kv">
              <dt>Keycloak-URL</dt>
              <dd><KcValue v-bind="guide.serverUrl" /></dd>
              <dt>Realm</dt>
              <dd><KcValue v-bind="guide.realm" /></dd>
              <dt>Issuer</dt>
              <dd><KcValue v-bind="guide.issuer" /></dd>
            </dl>
            <p class="text-body-2 text--secondary mb-0">
              {{ guide.notes[1] }}
            </p>
          </template>

          <dl v-else-if="step.key === 'public'" class="kv">
            <template v-for="s in guide.publicSettings">
              <dt :key="'t' + s.name">{{ s.name }}</dt>
              <dd :key="'d' + s.name">
                <KcValue :text="s.value" :missing="s.missing" :copy="!!s.copy" />
              </dd>
            </template>
          </dl>

          <template v-else-if="step.key === 'addresses'">
            <p class="text-body-2 text--secondary">
              Am Web-Client
              <KcValue v-bind="guide.publicClient" :copy="false" />, je Feld
              eine Zeile.
            </p>
            <div v-for="kind in uriKinds" :key="kind.key" class="mb-3">
              <div class="text-body-2 font-weight-medium">{{ kind.label }}</div>
              <template v-for="app in guide.apps">
                <div
                  v-for="uri in app[kind.key]"
                  :key="kind.key + app.label + uri"
                  class="d-flex align-center"
                  style="gap: 8px"
                >
                  <KcValue :text="uri" />
                  <span class="text-caption text--secondary">{{
                    app.label
                  }}</span>
                </div>
              </template>
            </div>
            <p v-if="guide.apps[0].note" class="text-body-2 text--secondary mb-0">
              {{ guide.apps[0].note }}
            </p>
          </template>

          <template v-else-if="step.key === 'audience'">
            <dl class="kv">
              <template v-for="s in guide.audienceMapper">
                <dt :key="'t' + s.name">{{ s.name }}</dt>
                <dd :key="'d' + s.name">
                  <KcValue
                    :text="s.value"
                    :missing="s.missing"
                    :copy="!!s.copy"
                  />
                </dd>
              </template>
            </dl>
            <p class="text-body-2 text--secondary mb-0">{{ guide.notes[0] }}</p>
          </template>

          <dl v-else-if="step.key === 'confidential'" class="kv">
            <template v-for="s in guide.confidentialSettings">
              <dt :key="'t' + s.name">{{ s.name }}</dt>
              <dd :key="'d' + s.name">
                <KcValue :text="s.value" :missing="s.missing" :copy="!!s.copy" />
              </dd>
            </template>
          </dl>

          <template v-else-if="step.key === 'roles'">
            <v-alert type="warning" text dense>{{ guide.roles.warning }}</v-alert>
            <div class="mb-2">
              <KcValue
                v-for="r in guide.roles.names"
                :key="r"
                :text="r"
                class="mr-2"
              />
              <span v-if="!guide.roles.names.length" class="text--secondary"
                >Noch keine Rollenzuweisung unter „Verbindung zu Keycloak“.</span
              >
            </div>
            <dl class="kv">
              <template v-for="s in guide.roles.settings">
                <dt :key="'t' + s.name">{{ s.name }}</dt>
                <dd :key="'d' + s.name">
                  <KcValue
                    :text="s.value"
                    :missing="s.missing"
                    :copy="!!s.copy"
                  />
                </dd>
              </template>
            </dl>
          </template>

          <template v-else-if="step.key === 'portal'">
            <p class="text-body-2 mb-1">
              Die Portal-URL im Tab „Allgemein“ muss die Adresse sein, unter
              der die Storefront läuft.
            </p>
            <KcValue
              v-if="guide.apps[1].origins.length"
              :text="guide.apps[1].origins[0]"
            />
            <span v-else class="text--secondary">Portal-URL ist leer.</span>
          </template>
        </v-expansion-panel-content>
      </v-expansion-panel>
    </v-expansion-panels>

    <p class="text-body-2 text--secondary mt-4">
      {{ guide.notes[2] }} {{ guide.notes[3] }}
    </p>

    <TextDialog
      :value="!!textOpen"
      :title="textOpen === 'both' ? 'Anleitung mit Ergebnis kopiert' : 'Anleitung als Text kopiert'"
      :text="textOpen === 'both' ? guideText + '\n\n' + checkText : guideText"
      @input="textOpen = null"
    />
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
  STATUS,
  guideAsText,
  checkAsText,
} from "./scenario";

const RANK = { fail: 4, na: 3, info: 2, ok: 1 };

export default {
  name: "KeycloakGuideB",
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
      textOpen: null,
      formPanel: undefined,
      openSteps: [],
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
    checkedAt() {
      return check.at ? check.at.toLocaleTimeString("de-DE") : "";
    },
    steps() {
      const g = this.guide;
      const defs = [
        { key: "realm", title: "Realm anlegen", sub: "Keycloak-URL, Realm, Issuer" },
        {
          key: "public",
          title: `Web-Client ${g.publicClient.text} anlegen`,
          sub: "public, nur Code mit PKCE S256",
        },
        {
          key: "addresses",
          title: "Rücksprungadressen und Web Origins eintragen",
          sub: `Admin UI (${this.modeLabel}) und Storefront`,
        },
        {
          key: "audience",
          title: "Audience-Mapper anlegen",
          sub: `im Scope ${g.publicClient.text}-dedicated`,
        },
        {
          key: "confidential",
          title: `API-Client ${g.privateClient.text} anlegen`,
          sub: "confidential, nur für Token-Introspection",
        },
      ];
      if (g.roles)
        defs.push({
          key: "roles",
          title: "Client-Rollen zuordnen",
          sub: "für die Rollenzuordnung",
        });
      defs.push({
        key: "portal",
        title: "Portal-URL prüfen",
        sub: "in Biletado, Tab „Allgemein“",
      });
      return defs.map((d) => {
        const rows = check.rows.filter((r) => r.step === d.key);
        let status = "open";
        if (check.state === "done" && rows.length) {
          status = rows.reduce(
            (worst, r) => (RANK[r.status] > RANK[worst] ? r.status : worst),
            "ok"
          );
        }
        return { ...d, rows: check.state === "done" ? rows : [], status };
      });
    },
    chipCounts() {
      return ["fail", "na", "info", "ok"]
        .map((s) => ({
          status: s,
          count: check.rows.filter((r) => r.status === s).length,
        }))
        .filter((s) => s.count);
    },
    guideText() {
      return guideAsText(this.guide);
    },
    checkText() {
      return checkAsText(this.guide, check.rows, check.at);
    },
  },
  watch: {
    "guide.complete": {
      immediate: true,
      handler(complete) {
        this.formPanel = complete ? undefined : 0;
        if (!complete) this.openSteps = [0, 1, 2, 3, 4];
      },
    },
    "check.state"(state) {
      if (state !== "done") return;
      this.openSteps = this.steps
        .map((s, i) => (s.status === "fail" || s.status === "na" ? i : null))
        .filter((i) => i !== null);
    },
  },
  methods: {
    run() {
      runCheck(this.guide);
    },
  },
};
</script>

<style scoped>
.kv {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 4px 16px;
  font-size: 0.875rem;
  margin-bottom: 8px;
}
.kv dt {
  color: rgba(0, 0, 0, 0.6);
}
.kv dd {
  margin: 0;
}
.check-line {
  display: flex;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  margin-bottom: 12px;
  background: rgba(0, 0, 0, 0.03);
}
.check-line--fail {
  background: rgba(244, 67, 54, 0.08);
}
.check-line--ok {
  background: rgba(76, 175, 80, 0.08);
}
.check-line--info {
  background: rgba(33, 150, 243, 0.08);
}
</style>
