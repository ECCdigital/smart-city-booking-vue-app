<template>
  <v-expansion-panel class="realm-guide-step" data-test="guide-step">
    <v-expansion-panel-header class="realm-guide-step__header">
      <div class="realm-guide-step__heading">
        <!-- The number; after „Realm prüfen“ the worst state of the step's
             results. -->
        <v-avatar
          v-if="result"
          size="26"
          :color="look.color"
          class="realm-guide-step__badge"
        >
          <v-icon small dark>{{ look.icon }}</v-icon>
        </v-avatar>
        <span
          v-else
          class="realm-guide-step__number"
          data-test="guide-step-number"
        >
          {{ step.number }}
        </span>
        <div>
          <div class="realm-guide-step__title" data-test="guide-step-title">
            {{ $t(`instance.edit.sso.guide.steps.${step.key}.title`) }}
          </div>
          <div
            v-if="result"
            class="realm-guide-step__state"
            data-test="guide-step-state"
          >
            {{ stateLabel }}
          </div>
        </div>
      </div>
    </v-expansion-panel-header>
    <v-expansion-panel-content>
      <RealmCheckRows v-if="result" :rows="result.rows" />

      <v-alert
        v-for="note in warnings"
        :key="note.id"
        type="warning"
        text
        dense
        data-test="guide-step-warning"
      >
        {{ noteText(note) }}
      </v-alert>

      <div
        v-if="step.roles && step.roles.length"
        class="realm-guide-step__roles"
      >
        <div class="realm-guide-step__roles-label">
          {{ $t("instance.edit.sso.guide.labels.keycloakRoles") }}
        </div>
        <span
          v-for="role in step.roles"
          :key="role.text"
          class="realm-guide-step__role"
          data-test="guide-role"
        >
          <RealmGuideValue :value="role" />
        </span>
      </div>

      <dl v-if="step.settings.length" class="realm-guide-step__settings">
        <div
          v-for="setting in step.settings"
          :key="setting.id"
          class="realm-guide-step__setting"
          data-test="guide-setting"
        >
          <dt data-test="guide-setting-name">{{ settingName(setting) }}</dt>
          <dd data-test="guide-setting-value">
            <RealmGuideValue :value="setting.value" :copy="setting.copy" />
          </dd>
        </div>
      </dl>

      <div
        v-for="section in step.sections || []"
        :key="section.app"
        class="realm-guide-step__section"
        data-test="guide-section"
      >
        <div
          v-for="address in section.addresses"
          :key="address.origin.text"
          class="realm-guide-step__address"
          data-test="guide-address"
        >
          <div class="realm-guide-step__address-head">
            <span data-test="guide-address-app">{{
              appName(address.app)
            }}</span>
            <span class="realm-guide-step__origin">{{
              address.origin.text
            }}</span>
          </div>
          <dl class="realm-guide-step__settings">
            <div
              v-for="field in address.fields"
              :key="field.id"
              class="realm-guide-step__setting"
              data-test="guide-address-field"
            >
              <dt data-test="guide-setting-name">{{ field.name }}</dt>
              <dd>
                <div
                  v-for="value in field.values"
                  :key="value.text"
                  class="realm-guide-step__entry"
                >
                  <RealmGuideValue :value="value" />
                  <span
                    v-if="value.switchUser"
                    class="realm-guide-step__entry-note"
                  >
                    {{ $t("instance.edit.sso.guide.switchUser") }}
                  </span>
                </div>
              </dd>
            </div>
          </dl>
        </div>
        <div
          v-if="!section.addresses.length"
          class="realm-guide-step__address-head"
        >
          {{ appName(section.app) }}
        </div>
        <p
          v-for="note in section.notes"
          :key="note.id"
          class="realm-guide-step__note"
        >
          {{ noteText(note) }}
        </p>
      </div>

      <p
        v-for="note in infos"
        :key="note.id"
        class="realm-guide-step__note"
        data-test="guide-step-note"
      >
        {{ noteText(note) }}
      </p>
    </v-expansion-panel-content>
  </v-expansion-panel>
</template>

<script>
import RealmCheckRows from "@/components/Instance/Edit/RealmCheckRows.vue";
import RealmGuideValue from "@/components/Instance/Edit/RealmGuideValue.vue";
import { CHECK_LOOK, statusLabel } from "@/services/keycloak/realmCheck";

/**
 * One step of the checklist: what to set in Keycloak, with the values. After
 * „Realm prüfen“ the step shows the worst state of its results instead of
 * its number, and the results on top.
 */
export default {
  name: "RealmGuideStep",
  components: { RealmCheckRows, RealmGuideValue },
  props: {
    step: { type: Object, required: true },
    /** The step's result of the check, `{ status, rows }`, or `null`. */
    result: { type: Object, default: null },
  },
  computed: {
    look() {
      return CHECK_LOOK[this.result.status] || CHECK_LOOK.na;
    },
    stateLabel() {
      return statusLabel(this.result.status);
    },
    warnings() {
      return this.step.notes.filter((note) => note.type === "warning");
    },
    infos() {
      return this.step.notes.filter((note) => note.type !== "warning");
    },
  },
  methods: {
    /** Keycloak's own name, or a label of Biletado's. */
    settingName(setting) {
      return (
        setting.name ||
        this.$t(`instance.edit.sso.guide.labels.${setting.label}`)
      );
    },
    appName(app) {
      return this.$t(`instance.edit.sso.guide.apps.${app}`);
    },
    noteText(note) {
      return this.$t(`instance.edit.sso.guide.notes.${note.id}`, note.params);
    },
  },
};
</script>

<style scoped>
.realm-guide-step__header {
  min-height: var(--scb-row-height) !important;
}

.realm-guide-step__heading {
  display: flex;
  align-items: center;
  gap: var(--scb-space-3);
}

.realm-guide-step__number {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--scb-surface-tint);
  border: 1px solid var(--scb-surface-border);
  font-size: var(--scb-font-size-xs);
  font-weight: var(--scb-font-weight-semibold);
  color: var(--scb-text);
}

.realm-guide-step__badge {
  flex: 0 0 auto;
}

.realm-guide-step__title {
  font-size: var(--scb-font-size-md);
  font-weight: var(--scb-font-weight-medium);
  color: var(--scb-text);
}

.realm-guide-step__state {
  margin-top: 2px;
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}

.realm-guide-step__settings {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: var(--scb-space-1) var(--scb-space-4);
  margin: 0 0 var(--scb-space-3);
  font-size: var(--scb-font-size-sm);
}

/* Each row is its own element for the tests and screen readers; the grid
   still lines names and values up across rows. */
.realm-guide-step__setting {
  display: contents;
}

.realm-guide-step__setting dt {
  color: var(--scb-text-muted);
  line-height: 24px;
}

.realm-guide-step__setting dd {
  margin: 0;
  min-width: 0;
}

.realm-guide-step__roles {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--scb-space-2);
  margin-bottom: var(--scb-space-3);
  font-size: var(--scb-font-size-sm);
}

.realm-guide-step__roles-label {
  flex: 0 0 100%;
  color: var(--scb-text-muted);
}

.realm-guide-step__section + .realm-guide-step__section,
.realm-guide-step__address + .realm-guide-step__address {
  margin-top: var(--scb-space-4);
}

.realm-guide-step__address-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--scb-space-2);
  margin-bottom: var(--scb-space-2);
  font-size: var(--scb-font-size-sm);
  font-weight: var(--scb-font-weight-semibold);
  color: var(--scb-text);
}

.realm-guide-step__origin {
  font-weight: 400;
  color: var(--scb-text-muted);
}

.realm-guide-step__entry {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--scb-space-2);
}

.realm-guide-step__entry + .realm-guide-step__entry {
  margin-top: 2px;
}

.realm-guide-step__entry-note {
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}

.realm-guide-step__note {
  margin: 0 0 var(--scb-space-2);
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text-muted);
}
</style>
