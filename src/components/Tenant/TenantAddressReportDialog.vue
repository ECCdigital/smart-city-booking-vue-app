<template>
  <AppDialog
    :open="open"
    icon="mdi-email-alert-outline"
    color="warning"
    :title="$t('tenant.reports.address.title')"
    :busy="inProgress"
    @close="$emit('close')"
  >
    <p class="text-body-2">
      {{ $t("tenant.reports.address.text") }}
    </p>
    <v-text-field
      v-model="value"
      :label="$t('tenant.reports.address.value')"
      :hint="$t('tenant.reports.address.value-hint')"
      :error-messages="valueError"
      persistent-hint
      outlined
      dense
      autofocus
      data-test="address-report-value"
    />
    <v-alert
      v-if="isMember"
      type="info"
      text
      dense
      class="text-body-2 mt-3 mb-0"
      data-test="address-report-member"
    >
      {{ $t("tenant.reports.address.member") }}
    </v-alert>

    <v-textarea
      v-model="reason"
      :label="$t('tenant.reports.address.reason')"
      outlined
      rows="2"
      auto-grow
      hide-details="auto"
      class="mt-3"
      data-test="address-report-reason"
    />
    <v-alert v-if="error" type="error" dense text class="mt-3 mb-0">
      {{ error }}
    </v-alert>
    <template #actions>
      <v-btn outlined :disabled="inProgress" @click="$emit('close')">
        {{ $t("tenant.reports.address.cancel") }}
      </v-btn>
      <v-btn
        color="warning"
        depressed
        :disabled="!canConfirm"
        :loading="inProgress"
        data-test="address-report-confirm"
        @click="confirm"
      >
        {{ $t("tenant.reports.address.confirm") }}
      </v-btn>
    </template>
  </AppDialog>
</template>

<script>
import AppDialog from "@/components/commons/AppDialog.vue";
import { mapActions } from "vuex";
import ApiReportService from "@/services/api/ApiReportService";
import { getApiErrorMessage } from "@/services/api/apiErrorMessage";
import ToastService from "@/services/ToastService";
import { parseBlacklistValue } from "@/utils/blacklist";

/**
 * „E-Mailadresse melden“ in „Meldungen“: reports an address entered by
 * hand to the instance, without a booking. The
 * address of a member may be reported too; a hint points to the list of
 * members, where the member can be reported as such or its membership
 * ended. Emits `reported` after a report, and `close`.
 */
export default {
  name: "TenantAddressReportDialog",
  components: { AppDialog },
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    tenantId: {
      type: String,
      required: true,
    },
    /** The user ids of the tenant's members, which are their addresses. */
    memberIds: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      value: "",
      reason: "",
      error: null,
      inProgress: false,
    };
  },
  computed: {
    /** The address as the backend compares it; a domain is none. */
    address() {
      const parsed = parseBlacklistValue(this.value);
      return parsed?.kind === "address" ? parsed.value : null;
    },
    valueError() {
      return this.value.trim() && !this.address
        ? this.$t("tenant.reports.address.value-invalid")
        : [];
    },
    isMember() {
      return (
        !!this.address &&
        this.memberIds.some((id) => id?.toLowerCase() === this.address)
      );
    },
    canConfirm() {
      return !!this.address && !!this.reason.trim() && !this.inProgress;
    },
  },
  watch: {
    open(isOpen) {
      if (isOpen) {
        this.value = "";
        this.reason = "";
        this.error = null;
      }
    },
  },
  methods: {
    ...mapActions({ addToast: "toasts/add" }),
    async confirm() {
      this.inProgress = true;
      this.error = null;
      try {
        const response = await ApiReportService.report(this.tenantId, {
          addresses: [this.address],
          reason: this.reason.trim(),
        });
        this.addToast(
          ToastService.createToast(
            response.status === 201
              ? "user.report.created"
              : "user.report.supplemented-addresses",
            "success"
          )
        );
        this.$emit("reported");
        this.$emit("close");
      } catch (error) {
        console.error(error);
        this.error = getApiErrorMessage(error, this.$t("user.report.error"));
      } finally {
        this.inProgress = false;
      }
    },
  },
};
</script>
