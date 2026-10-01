<template>
  <!-- PROTOTYPE (ECCdigital/tickets#86), Variante A „Abschnitte“: Formular,
       Anleitung und Prüfung untereinander, jedes ein eigener Abschnitt. -->
  <div>
    <InstanceEditKeycloak
      :instance="instance"
      :tenants="tenants"
      :available-roles="availableRoles"
      @update:instance="$emit('update:instance', $event)"
    />

    <v-alert v-if="justSaved" type="info" text dense class="mt-2">
      Gespeichert. Die Anmeldung läuft bis zu einer Minute noch mit den alten
      Werten.
    </v-alert>

    <v-divider class="my-8" />

    <SubSection
      title="Realm in Keycloak einrichten"
      icon="mdi-book-open-variant"
      no-margin
      :description="`So richtest du den Realm für diese Instanz ein. ${guide.version}. Die Werte gelten für das Admin UI im Modus ${modeLabel} und für die Storefront.`"
    >
      <template #actions>
        <v-btn small text color="primary" @click="textOpen = 'guide'">
          <v-icon left small>mdi-content-copy</v-icon>
          Als Text kopieren
        </v-btn>
      </template>

      <v-alert v-if="!guide.complete" type="warning" text dense>
        SSO ist noch nicht eingerichtet. Wo noch Werte fehlen, zeigt die
        Anleitung Platzhalter wie
        <KcValue :text="guide.missing[0]" missing :copy="false" />. Die
        Adressen stehen schon fest.
      </v-alert>
      <template v-for="app in guide.apps">
        <v-alert
          v-if="app.hint"
          :key="'hint-' + app.label"
          type="warning"
          text
          dense
          icon="mdi-alert"
        >
          <strong>{{ app.label }}:</strong> {{ app.hint }}
        </v-alert>
      </template>

      <v-simple-table dense class="mb-6 guide-table">
        <tbody>
          <tr>
            <td>Keycloak-URL</td>
            <td><KcValue v-bind="guide.serverUrl" /></td>
          </tr>
          <tr>
            <td>Realm</td>
            <td><KcValue v-bind="guide.realm" /></td>
          </tr>
          <tr>
            <td>Issuer</td>
            <td><KcValue v-bind="guide.issuer" /></td>
          </tr>
        </tbody>
      </v-simple-table>

      <h4 class="guide-h">
        1. Web-Client
        <KcValue v-bind="guide.publicClient" />
        <span class="text--secondary font-weight-regular"
          >public, für Admin UI und Storefront</span
        >
      </h4>
      <v-simple-table dense class="mb-2 guide-table">
        <tbody>
          <tr v-for="s in guide.publicSettings" :key="s.name">
            <td>{{ s.name }}</td>
            <td>
              <KcValue :text="s.value" :missing="s.missing" :copy="!!s.copy" />
            </td>
          </tr>
        </tbody>
      </v-simple-table>
      <v-simple-table dense class="mb-6 guide-table">
        <tbody>
          <template v-for="kind in uriKinds">
            <tr v-for="(app, i) in guide.apps" :key="kind.key + app.label">
              <td>
                <template v-if="i === 0">{{ kind.label }}</template>
              </td>
              <td class="text--secondary">{{ app.label }}</td>
              <td>
                <div v-if="!app[kind.key].length" class="text--secondary">
                  – siehe Hinweis
                </div>
                <div v-for="uri in app[kind.key]" :key="uri">
                  <KcValue :text="uri" />
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </v-simple-table>

      <h4 class="guide-h">
        2. Audience-Mapper am Web-Client
      </h4>
      <v-simple-table dense class="mb-6 guide-table">
        <tbody>
          <tr v-for="s in guide.audienceMapper" :key="s.name">
            <td>{{ s.name }}</td>
            <td>
              <KcValue :text="s.value" :missing="s.missing" :copy="!!s.copy" />
            </td>
          </tr>
        </tbody>
      </v-simple-table>

      <h4 class="guide-h">
        3. API-Client
        <KcValue v-bind="guide.privateClient" />
        <span class="text--secondary font-weight-regular"
          >confidential, nur für Token-Introspection</span
        >
      </h4>
      <v-simple-table dense class="mb-6 guide-table">
        <tbody>
          <tr v-for="s in guide.confidentialSettings" :key="s.name">
            <td>{{ s.name }}</td>
            <td>
              <KcValue :text="s.value" :missing="s.missing" :copy="!!s.copy" />
            </td>
          </tr>
        </tbody>
      </v-simple-table>

      <template v-if="guide.roles">
        <h4 class="guide-h">4. Client-Rollen für die Rollenzuordnung</h4>
        <v-alert type="warning" text dense icon="mdi-account-switch">
          {{ guide.roles.warning }}
        </v-alert>
        <div class="mb-2">
          <span class="text-body-2 mr-2">Rollen:</span>
          <KcValue
            v-for="r in guide.roles.names"
            :key="r"
            :text="r"
            class="mr-2"
          />
          <span v-if="!guide.roles.names.length" class="text--secondary"
            >Lege oben zuerst Rollenzuweisungen an.</span
          >
        </div>
        <v-simple-table dense class="mb-6 guide-table">
          <tbody>
            <tr v-for="s in guide.roles.settings" :key="s.name">
              <td>{{ s.name }}</td>
              <td>
                <KcValue
                  :text="s.value"
                  :missing="s.missing"
                  :copy="!!s.copy"
                />
              </td>
            </tr>
          </tbody>
        </v-simple-table>
      </template>

      <h4 class="guide-h">Hinweise</h4>
      <ul class="text-body-2">
        <li v-for="n in guide.notes" :key="n">{{ n }}</li>
        <li v-if="guide.apps[0].note">{{ guide.apps[0].note }}</li>
      </ul>
    </SubSection>

    <v-divider class="my-8" />

    <SubSection
      title="Realm prüfen"
      icon="mdi-stethoscope"
      no-margin
      description="Biletado fragt Keycloak mit den gespeicherten Werten ab und zeigt je Anforderung, ob der Realm sie erfüllt. Keycloak bleibt dabei unverändert."
    >
      <template #actions>
        <v-btn
          v-if="check.state === 'done'"
          small
          text
          color="primary"
          @click="textOpen = 'check'"
        >
          <v-icon left small>mdi-content-copy</v-icon>
          Ergebnis als Text kopieren
        </v-btn>
      </template>

      <div class="d-flex align-center mb-4">
        <v-btn
          color="primary"
          :disabled="!!lock"
          :loading="check.state === 'running'"
          @click="run"
        >
          <v-icon left>mdi-play</v-icon>
          Prüfen
        </v-btn>
        <span v-if="lock" class="ml-4 text-body-2 text--secondary">{{
          lock
        }}</span>
        <span v-else-if="check.state === 'done'" class="ml-4 text-body-2">
          {{ summaryText }} · {{ checkedAt }}
        </span>
      </div>

      <v-simple-table v-if="check.state === 'done'" class="check-table">
        <tbody>
          <tr v-for="row in check.rows" :key="row.id">
            <td class="check-table__status">
              <v-icon :color="STATUS[row.status].color" small>{{
                STATUS[row.status].icon
              }}</v-icon>
              <span class="ml-1 text-caption">{{
                STATUS[row.status].label
              }}</span>
            </td>
            <td>
              <div class="font-weight-medium">{{ row.title }}</div>
              <div class="text-body-2 text--secondary">{{ row.reason }}</div>
              <div
                v-for="p in row.parts || []"
                :key="p.label"
                class="text-caption"
              >
                <v-icon x-small :color="STATUS[p.status].color">{{
                  STATUS[p.status].icon
                }}</v-icon>
                {{ p.label }}: {{ p.reason }}
              </div>
            </td>
          </tr>
        </tbody>
      </v-simple-table>
    </SubSection>

    <TextDialog
      :value="!!textOpen"
      :title="
        textOpen === 'check' ? 'Ergebnis als Text kopiert' : 'Anleitung als Text kopiert'
      "
      :text="textOpen === 'check' ? checkText : guideText"
      @input="textOpen = null"
    />
  </div>
</template>

<script>
import InstanceEditKeycloak from "@/components/Instance/Edit/InstanceEditKeycloak.vue";
import SubSection from "@/components/commons/SubSection.vue";
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

export default {
  name: "KeycloakGuideA",
  components: { InstanceEditKeycloak, SubSection, KcValue, TextDialog },
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
    guideText() {
      return guideAsText(this.guide);
    },
    checkText() {
      return checkAsText(this.guide, check.rows, check.at);
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
.guide-h {
  font-size: 0.95rem;
  font-weight: 600;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.guide-table td:first-child {
  width: 34%;
  white-space: nowrap;
}
.check-table td {
  vertical-align: top;
  padding-top: 8px !important;
  padding-bottom: 8px !important;
}
.check-table__status {
  width: 150px;
  white-space: nowrap;
}
</style>
