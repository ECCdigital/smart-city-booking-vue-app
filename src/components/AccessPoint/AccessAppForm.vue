<script>
import AccessAppCustomerServiceFields from "@/components/Tenant/Edit/AccessAppCustomerServiceFields.vue";
import { secretStored, settingsForm } from "@/utilities/access-app-settings";

const T = "accessPoint.management.settings";

/**
 * The form of a provider's settings (ECCdigital/tickets#1104): first only
 * what the connection needs, the rarer settings folded under „Weitere
 * Einstellungen“ with a line that names what differs from the standard, and
 * the help folded above. A stored secret is never shown: its row says
 * „Gespeichert“, and „Ändern“ opens an empty field instead.
 *
 * The form holds no state of its own: the settings hand in the values and
 * take every change back through `update`, `change-secret` and
 * `keep-secret`.
 */
export default {
  name: "AccessAppForm",
  components: { AccessAppCustomerServiceFields },
  props: {
    providerId: { type: String, required: true },
    // `{ values, changing }` as `newSettings` builds it.
    settings: { type: Object, required: true },
    // The stored access application, which tells what secret is stored.
    app: { type: Object, default: null },
    // The faults per field, as the last test named them.
    errors: { type: Object, default: () => ({}) },
  },
  data() {
    return {
      helpOpen: false,
      moreOpen: false,
    };
  },
  computed: {
    form() {
      return settingsForm(this.providerId);
    },
    helpTitle() {
      return this.$t(`${T}.help.${this.form.help}`);
    },
    hasMore() {
      return this.form.advanced.length > 0 || !!this.form.customerService;
    },
    // What differs from the standard, in one line for the folded settings.
    moreSummary() {
      const values = this.settings.values;
      const parts = this.form.advanced
        .map((field) => {
          const value = values[field.key];
          if (field.secret) {
            if (value)
              return `${this.label(field)}: ${this.$t(`${T}.changed`)}`;
            return this.stored(field)
              ? `${this.label(field)}: ${this.$t(`${T}.stored`)}`
              : null;
          }
          if (!value || value === field.standard) return null;
          return `${this.label(field)}: ${
            field.choices ? this.choiceText(field, value) : value
          }`;
        })
        .filter(Boolean);
      const contact = values.customerService;
      if (contact && Object.values(contact).some(Boolean)) {
        parts.push(
          `${this.$t("accessPoint.tenant.customerService.title")}: ${this.$t(
            `${T}.given`
          )}`
        );
      }
      return parts.join(" · ") || this.$t(`${T}.allStandard`);
    },
  },
  methods: {
    label(field) {
      return this.$t(`${T}.fields.${field.label || field.key}`);
    },
    hint(field) {
      if (field.hint) return this.$t(`${T}.hints.${field.label || field.key}`);
      if (field.standard && !field.choices) {
        return this.$t(`${T}.standard`, { value: field.standard });
      }
      return "";
    },
    choiceText(field, value) {
      return this.$t(`${T}.choices.${field.key}.${value}`);
    },
    choices(field) {
      return field.choices.map((value) => ({
        value,
        text: this.choiceText(field, value),
      }));
    },
    stored(field) {
      return field.secret && secretStored(this.app, field.key);
    },
    // A stored secret shows as „Gespeichert“ until „Ändern“ opens a field.
    showsStored(field) {
      return this.stored(field) && !this.settings.changing[field.key];
    },
    fieldErrors(field) {
      const error = this.errors[field.key];
      return error ? [error] : [];
    },
    update(key, value) {
      this.$emit("update", key, value);
    },
  },
};
</script>

<template>
  <div class="access-app-form" data-test="access-app-form">
    <div
      v-if="form.help"
      class="access-app-form__help"
      data-test="access-app-help"
    >
      <button
        type="button"
        class="access-app-form__toggle"
        @click="helpOpen = !helpOpen"
      >
        <v-icon small color="primary" class="mr-1">
          {{ helpOpen ? "mdi-chevron-down" : "mdi-chevron-right" }}
        </v-icon>
        {{ helpTitle }}
      </button>
      <div v-if="helpOpen" class="access-app-form__help-body">
        <template v-if="form.help === 'nuki'">
          <p class="mb-1">{{ $t("accessPoint.tenant.permissionsIntro") }}</p>
          <ul>
            <li>{{ $t("accessPoint.tenant.permissionReadOnly") }}</li>
            <li>{{ $t("accessPoint.tenant.permissionAction") }}</li>
            <li>{{ $t("accessPoint.tenant.permissionAuth") }}</li>
            <li>{{ $t("accessPoint.tenant.permissionLog") }}</li>
          </ul>
          <p class="mb-0 mt-1">
            {{ $t("accessPoint.tenant.permissionsNote") }}
          </p>
        </template>
        <template v-else-if="form.help === 'salto'">
          <p class="mb-1">
            {{ $t("accessPoint.tenant.salto.prerequisites.intro") }}
          </p>
          <ul>
            <li>
              {{ $t("accessPoint.tenant.salto.prerequisites.systemUser") }}
            </li>
            <li>{{ $t("accessPoint.tenant.salto.prerequisites.role") }}</li>
            <li>
              {{ $t("accessPoint.tenant.salto.prerequisites.remoteOpening") }}
            </li>
            <li>{{ $t("accessPoint.tenant.salto.prerequisites.mailbox") }}</li>
            <li>{{ $t("accessPoint.tenant.salto.prerequisites.appBan") }}</li>
          </ul>
          <p class="mb-0 mt-1">
            {{ $t("accessPoint.tenant.salto.prerequisites.note") }}
          </p>
        </template>
        <p v-else class="mb-0">
          {{ $t("accessPoint.tenant.openLocker.accountHint") }}
        </p>
      </div>
    </div>

    <template v-for="field in form.primary">
      <div
        v-if="showsStored(field)"
        :key="field.key"
        class="access-app-form__secret"
        :class="{ 'access-app-form__secret--error': errors[field.key] }"
        data-test="stored-secret"
      >
        <div class="flex-grow-1">
          <div
            class="access-app-form__secret-label"
            data-test="stored-secret-label"
          >
            {{ label(field) }}
          </div>
          <div class="access-app-form__secret-value">
            <v-icon x-small color="success" class="mr-1">mdi-lock-check</v-icon>
            {{ $t("accessPoint.management.settings.storedSecret") }}
          </div>
          <div v-if="errors[field.key]" class="access-app-form__secret-error">
            {{ errors[field.key] }}
          </div>
        </div>
        <v-btn
          small
          text
          color="primary"
          @click="$emit('change-secret', field.key)"
        >
          {{ $t("accessPoint.management.settings.changeSecret") }}
        </v-btn>
      </div>
      <v-text-field
        v-else
        :key="field.key"
        :value="settings.values[field.key]"
        :label="label(field)"
        :type="field.secret ? 'password' : 'text'"
        :hint="hint(field)"
        :persistent-hint="!!hint(field)"
        :error-messages="fieldErrors(field)"
        autocomplete="off"
        outlined
        dense
        class="mb-1"
        @input="update(field.key, $event)"
      >
        <template v-if="stored(field)" #append-outer>
          <v-btn x-small text @click="$emit('keep-secret', field.key)">
            {{ $t("accessPoint.management.settings.keepSecret") }}
          </v-btn>
        </template>
      </v-text-field>
    </template>

    <div
      v-if="hasMore"
      class="access-app-form__more"
      data-test="access-app-more"
    >
      <button
        type="button"
        class="access-app-form__toggle"
        @click="moreOpen = !moreOpen"
      >
        <v-icon small class="mr-1">
          {{ moreOpen ? "mdi-chevron-down" : "mdi-chevron-right" }}
        </v-icon>
        {{ $t("accessPoint.management.settings.more") }}
        <span v-if="!moreOpen" class="access-app-form__more-summary">
          {{ moreSummary }}
        </span>
      </button>
      <div v-if="moreOpen" class="pt-3">
        <template v-for="field in form.advanced">
          <v-select
            v-if="field.choices"
            :key="field.key"
            :value="settings.values[field.key]"
            :items="choices(field)"
            :label="label(field)"
            outlined
            dense
            @change="update(field.key, $event)"
          />
          <div
            v-else-if="showsStored(field)"
            :key="field.key"
            class="access-app-form__secret"
            data-test="stored-secret"
          >
            <div class="flex-grow-1">
              <div
                class="access-app-form__secret-label"
                data-test="stored-secret-label"
              >
                {{ label(field) }}
              </div>
              <div class="access-app-form__secret-value">
                {{ $t("accessPoint.management.settings.storedSecret") }}
              </div>
            </div>
            <v-btn
              small
              text
              color="primary"
              @click="$emit('change-secret', field.key)"
            >
              {{ $t("accessPoint.management.settings.changeSecret") }}
            </v-btn>
          </div>
          <v-text-field
            v-else
            :key="field.key"
            :value="settings.values[field.key]"
            :label="label(field)"
            :type="field.secret ? 'password' : 'text'"
            :placeholder="field.standard"
            :hint="hint(field)"
            :persistent-hint="!!hint(field)"
            autocomplete="off"
            outlined
            dense
            class="mb-2"
            @input="update(field.key, $event)"
          >
            <template v-if="stored(field)" #append-outer>
              <v-btn x-small text @click="$emit('keep-secret', field.key)">
                {{ $t("accessPoint.management.settings.keepSecret") }}
              </v-btn>
            </template>
          </v-text-field>
        </template>
        <AccessAppCustomerServiceFields
          v-if="form.customerService"
          :value="settings.values.customerService"
          @input="update('customerService', $event)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.access-app-form__help {
  border-left: 3px solid var(--v-primary-base);
  padding: 6px 0 6px 12px;
  margin-bottom: 16px;
  background: var(--scb-surface-tint);
  border-radius: 0 var(--scb-radius-surface) var(--scb-radius-surface) 0;
}

.access-app-form__toggle {
  display: flex;
  align-items: center;
  width: 100%;
  text-align: left;
  font-size: var(--scb-font-size-sm);
  font-weight: var(--scb-font-weight-medium);
}

.access-app-form__help-body {
  font-size: var(--scb-font-size-xs);
  padding: 6px 12px 4px 22px;
  max-width: 68ch;
}

.access-app-form__help-body ul {
  padding-left: 16px;
}

.access-app-form__secret {
  display: flex;
  align-items: center;
  border: 1px solid var(--scb-surface-border);
  border-radius: 4px;
  padding: 6px 8px 6px 12px;
  margin-bottom: 18px;
}

.access-app-form__secret--error {
  border-color: var(--v-error-base);
}

.access-app-form__secret-label {
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}

.access-app-form__secret-value {
  font-size: var(--scb-font-size-sm);
}

.access-app-form__secret-error {
  font-size: var(--scb-font-size-xs);
  color: var(--v-error-base);
}

.access-app-form__more {
  border-top: 1px solid var(--scb-rule);
  padding-top: 10px;
  margin-top: 4px;
}

.access-app-form__more-summary {
  margin-left: 10px;
  font-weight: normal;
  color: var(--scb-text-muted);
  font-size: var(--scb-font-size-xs);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
