<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import ApiRolesService from "@/services/api/ApiRolesService";
import {
  CUSTOMER_UPLOAD_FORMATS,
  MAX_RETENTION_DAYS,
  customerUploadSettingsIssues,
  customerUploadSettingsOf,
  instanceCustomerUploadsEnabled,
  orderedFormats,
} from "@/utils/customerUploads";

const COPY = "tenant.customerUploads";

/**
 * „Nachweise von Buchenden“, a section of the tab „Buchung“: whether bookers
 * may hand in customer uploads at bookings of the tenant, which formats, how
 * long they are kept, which mails go out and to the members of which
 * roles. Only the settings - the
 * upload fields are defined at each bookable. It has no form of its own:
 * its rules count in the form of the tab around it.
 */
export default {
  name: "TenantEditCustomerUploads",
  components: { BaseSection },
  props: {
    tenant: { type: Object, required: true },
  },
  data() {
    return { roles: [] };
  },
  watch: {
    "tenant.id": {
      immediate: true,
      handler: "loadRoles",
    },
  },
  computed: {
    settings() {
      return customerUploadSettingsOf(this.tenant);
    },
    /** Whether the instance has cleared customer uploads for the tenants. */
    instanceCleared() {
      return instanceCustomerUploadsEnabled(
        this.$store?.getters["instance/instance"]
      );
    },
    formatOptions() {
      return CUSTOMER_UPLOAD_FORMATS.map((format) => ({
        value: format,
        text: this.$t(`${COPY}.formats.${format}`),
      }));
    },
    issues() {
      return customerUploadSettingsIssues(this.settings);
    },
    maxRetentionDays() {
      return MAX_RETENTION_DAYS;
    },
    roleOptions() {
      return this.roles.map((role) => ({ text: role.name, value: role.id }));
    },
    staffMailsOn() {
      return this.settings.notifyOnSubmitted || this.settings.notifyOnOverdue;
    },
    withoutRole() {
      return this.staffMailsOn && !(this.settings.notifyRoleIds || []).length;
    },
  },
  methods: {
    /** The roles of the tenant, to pick who gets the staff's mails. */
    async loadRoles(tenantId) {
      if (!tenantId) return;
      try {
        const response = await ApiRolesService.getTenantRoles(false, tenantId);
        this.roles = response?.data || [];
      } catch (error) {
        console.error(`Could not read the roles of tenant ${tenantId}`, error);
        this.roles = [];
      }
    },
    rule(name) {
      return [() => (this.issues[name] ? this.$t(this.issues[name]) : true)];
    },
    change(changes) {
      this.$emit("update:tenant", {
        customerUploads: { ...this.settings, ...changes },
      });
    },
    changeNumber(name, value) {
      this.change({
        [name]: value === "" || value === null ? null : Number(value),
      });
    },
    changeFormats(formats) {
      this.change({ formats: orderedFormats(formats) });
    },
  },
};
</script>

<template>
  <BaseSection
    :title="$t('tenant.customerUploads.title')"
    icon="mdi-file-upload-outline"
  >
    <p class="text-body-2 text--secondary">
      {{ $t("tenant.customerUploads.intro") }}
    </p>
    <v-alert
      v-if="!instanceCleared"
      data-test="customer-uploads-instance-off"
      type="info"
      text
      dense
      class="mt-2 mb-0"
    >
      {{
        settings.enabled
          ? $t("tenant.customerUploads.instance-off-enabled")
          : $t("tenant.customerUploads.instance-off")
      }}
    </v-alert>
    <v-switch
      data-test="customer-uploads-enabled"
      :input-value="settings.enabled"
      :disabled="!instanceCleared && !settings.enabled"
      color="primary"
      :label="$t('tenant.customerUploads.enabled')"
      :hint="$t('tenant.customerUploads.enabled-hint')"
      persistent-hint
      class="mt-2"
      @change="change({ enabled: !!$event })"
    />

    <template v-if="settings.enabled">
      <div class="text-subtitle-2 mt-6 mb-1">
        {{ $t("tenant.customerUploads.formats.label") }}
      </div>
      <p class="text-caption text--secondary mb-1">
        {{ $t("tenant.customerUploads.formats.hint") }}
      </p>
      <div class="d-flex flex-wrap">
        <v-checkbox
          v-for="option in formatOptions"
          :key="option.value"
          :data-test="`customer-uploads-format-${option.value}`"
          :input-value="settings.formats"
          :value="option.value"
          :label="option.text"
          :rules="rule('formats')"
          :hide-details="!issues.formats"
          dense
          class="mr-6 mt-0"
          @change="changeFormats"
        />
      </div>

      <v-row class="mt-4">
        <v-col cols="12" md="6">
          <v-text-field
            data-test="customer-uploads-retention"
            :value="settings.retentionDays"
            :label="$t('tenant.customerUploads.retentionDays')"
            :hint="
              $t('tenant.customerUploads.retentionDays-hint', {
                max: maxRetentionDays,
              })
            "
            persistent-hint
            :suffix="$t('tenant.customerUploads.days')"
            type="number"
            min="0"
            :max="maxRetentionDays"
            :rules="rule('retentionDays')"
            background-color="accent"
            filled
            dense
            @input="changeNumber('retentionDays', $event)"
          />
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field
            data-test="customer-uploads-review-reminder"
            :value="settings.reviewReminderDaysBeforeDeletion"
            :label="$t('tenant.customerUploads.reviewReminderDays')"
            :hint="$t('tenant.customerUploads.reviewReminderDays-hint')"
            persistent-hint
            :suffix="$t('tenant.customerUploads.days')"
            type="number"
            min="0"
            :max="maxRetentionDays"
            :rules="rule('reviewReminderDaysBeforeDeletion')"
            background-color="accent"
            filled
            dense
            @input="changeNumber('reviewReminderDaysBeforeDeletion', $event)"
          />
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field
            data-test="customer-uploads-reminder"
            :value="settings.reminderDaysBeforeDeadline"
            :label="$t('tenant.customerUploads.reminderDays')"
            :hint="$t('tenant.customerUploads.reminderDays-hint')"
            persistent-hint
            :suffix="$t('tenant.customerUploads.days')"
            type="number"
            min="0"
            :rules="rule('reminderDaysBeforeDeadline')"
            background-color="accent"
            filled
            dense
            @input="changeNumber('reminderDaysBeforeDeadline', $event)"
          />
        </v-col>
      </v-row>

      <v-switch
        data-test="customer-uploads-notify-submitted"
        :input-value="settings.notifyOnSubmitted"
        color="primary"
        :label="$t('tenant.customerUploads.notifyOnSubmitted')"
        :hint="$t('tenant.customerUploads.notifyOnSubmitted-hint')"
        persistent-hint
        class="mt-4"
        @change="change({ notifyOnSubmitted: !!$event })"
      />
      <v-switch
        data-test="customer-uploads-notify-overdue"
        :input-value="settings.notifyOnOverdue"
        color="primary"
        :label="$t('tenant.customerUploads.notifyOnOverdue')"
        :hint="$t('tenant.customerUploads.notifyOnOverdue-hint')"
        persistent-hint
        class="mt-2"
        @change="change({ notifyOnOverdue: !!$event })"
      />
      <v-autocomplete
        v-if="staffMailsOn"
        data-test="customer-uploads-notify-roles"
        :value="settings.notifyRoleIds"
        :items="roleOptions"
        :label="$t('tenant.customerUploads.notifyRoles')"
        :hint="$t('tenant.customerUploads.notifyRoles-hint')"
        persistent-hint
        multiple
        chips
        small-chips
        deletable-chips
        background-color="accent"
        filled
        dense
        class="mt-4"
        @change="change({ notifyRoleIds: $event || [] })"
      />
      <v-alert
        v-if="withoutRole"
        data-test="customer-uploads-notify-roles-missing"
        type="warning"
        text
        dense
        class="mt-2"
      >
        {{ $t("tenant.customerUploads.notifyRoles-missing") }}
      </v-alert>
    </template>
  </BaseSection>
</template>
