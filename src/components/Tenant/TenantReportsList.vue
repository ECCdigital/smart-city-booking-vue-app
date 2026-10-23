<template>
  <div class="tenant-reports">
    <p class="tenant-reports__lead">{{ $t("tenant.reports.hint") }}</p>
    <v-alert
      v-if="actionError"
      type="warning"
      text
      dense
      dismissible
      data-test="tenant-reports-action-error"
      @input="actionError = ''"
    >
      {{ actionError }}
    </v-alert>
    <v-alert
      v-if="errorMessage"
      type="warning"
      text
      dense
      class="mb-0"
      data-test="tenant-reports-error"
    >
      {{ errorMessage }}
    </v-alert>
    <v-progress-linear v-else-if="loading" indeterminate />
    <p
      v-else-if="rows.length === 0"
      class="tenant-reports__lead"
      data-test="tenant-reports-empty"
    >
      {{ $t("tenant.reports.empty") }}
    </p>
    <div v-else class="booking-rows">
      <div
        v-for="row in rows"
        :key="row.report.id"
        class="booking-row tenant-reports__row"
        data-test="tenant-reports-row"
      >
        <div class="booking-row__main">
          <div class="booking-row__title">
            {{ row.name }}
            <v-chip
              x-small
              outlined
              :color="standingColors[row.standing]"
              class="ml-1"
              data-test="tenant-reports-standing"
            >
              {{ $t(`tenant.reports.standing.${row.standing}`) }}
            </v-chip>
          </div>
          <div class="booking-row__subtitle">
            {{
              row.report.targetUserId || $t("supervision.reports.guest-address")
            }}
          </div>
          <ReportReasons :report="row.report" class="tenant-reports__reasons" />
          <div
            v-if="row.rejectionReason"
            class="tenant-reports__rejection"
            data-test="tenant-reports-rejection"
          >
            {{
              $t("tenant.reports.rejection", {
                reason: row.rejectionReason,
              })
            }}
          </div>
        </div>
        <div v-if="row.editable" class="tenant-reports__actions">
          <v-btn
            small
            outlined
            :disabled="working"
            class="tenant-reports__action"
            data-test="tenant-reports-add"
            @click="startAdd(row)"
          >
            <v-icon left small>mdi-text-box-plus-outline</v-icon>
            {{ $t("tenant.reports.add") }}
          </v-btn>
          <v-btn
            small
            text
            :disabled="working"
            class="tenant-reports__action"
            data-test="tenant-reports-withdraw"
            @click="withdrawing = row"
          >
            <v-icon left small>mdi-undo</v-icon>
            {{ $t("tenant.reports.withdraw") }}
          </v-btn>
        </div>
      </div>
    </div>

    <v-dialog :value="!!adding" max-width="480" persistent>
      <v-card v-if="adding">
        <v-card-title class="text-h6 text-break">
          {{ $t("tenant.reports.add-title", { name: adding.name }) }}
        </v-card-title>
        <v-card-text>
          <v-textarea
            v-model="addReason"
            :label="$t('tenant.reports.add-reason')"
            outlined
            rows="3"
            auto-grow
            hide-details
            data-test="tenant-reports-add-reason"
          />
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn text :disabled="working" @click="adding = null">
            {{ $t("tenant.reports.cancel") }}
          </v-btn>
          <v-btn
            color="primary"
            depressed
            :disabled="!addReason.trim()"
            :loading="working"
            data-test="tenant-reports-add-confirm"
            @click="add"
          >
            {{ $t("tenant.reports.add") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog :value="!!withdrawing" max-width="480" persistent>
      <v-card v-if="withdrawing">
        <v-card-title class="text-h6 text-break">
          {{ $t("tenant.reports.withdraw-title", { name: withdrawing.name }) }}
        </v-card-title>
        <v-card-text class="text-body-2">
          {{ $t("tenant.reports.withdraw-text", { name: withdrawing.name }) }}
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn text :disabled="working" @click="withdrawing = null">
            {{ $t("tenant.reports.cancel") }}
          </v-btn>
          <v-btn
            color="primary"
            depressed
            :loading="working"
            data-test="tenant-reports-withdraw-confirm"
            @click="withdraw"
          >
            {{ $t("tenant.reports.withdraw") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { mapGetters } from "vuex";
import ReportReasons from "@/components/Supervision/ReportReasons.vue";
import ApiReportService from "@/services/api/ApiReportService";
import { getApiErrorMessage } from "@/services/api/apiErrorMessage";
import UserPermissionService from "@/services/permissions/UserPermissionService";
import { REPORT_STATUS, tenantReportRows } from "@/utils/reports";

/**
 * „Meldungen“ of the tenant (glossary „Meldung“),
 * the second tab of „Mitglieder“: the reports the current tenant made, each
 * with its standing. An open one the tenant may add a reason to or
 * withdraw; a settled one stays as it was settled, and a new report about
 * the same user is possible again. Only for roles with
 * `manageUsers.updateAny`, which the page checks; one about a tenant owner
 * only a tenant owner changes. Emits `count` with the open reports after
 * every load.
 */
export default {
  name: "TenantReportsList",
  components: { ReportReasons },
  data() {
    return {
      reports: [],
      loading: false,
      errorMessage: "",
      working: false,
      actionError: "",
      adding: null,
      addReason: "",
      withdrawing: null,
      standingColors: {
        [REPORT_STATUS.OPEN]: "warning",
        [REPORT_STATUS.SUSPENDED]: "error",
        [REPORT_STATUS.BLACKLISTED]: "error",
        [REPORT_STATUS.REJECTED]: "grey darken-1",
        [REPORT_STATUS.WITHDRAWN]: "grey darken-1",
      },
    };
  },
  computed: {
    ...mapGetters({ tenantId: "tenants/currentTenantId" }),
    rows() {
      return tenantReportRows(this.reports, {
        mayChangeOwnerReports: UserPermissionService.allowReportOwner(
          this.tenantId
        ),
      });
    },
  },
  watch: {
    tenantId() {
      this.load();
    },
  },
  created() {
    this.load();
  },
  methods: {
    async load() {
      if (!this.tenantId) return;
      this.loading = true;
      this.errorMessage = "";
      try {
        this.reports = await ApiReportService.getTenantReports(this.tenantId);
        this.$emit(
          "count",
          this.reports.filter((report) => report.status === REPORT_STATUS.OPEN)
            .length
        );
      } catch (error) {
        console.error(error);
        this.errorMessage = this.$t("tenant.reports.load-failed");
      } finally {
        this.loading = false;
      }
    },
    startAdd(row) {
      this.adding = row;
      this.addReason = "";
    },
    async add() {
      await this.act(
        () =>
          ApiReportService.addReason(
            this.tenantId,
            this.adding.report.id,
            this.addReason.trim()
          ),
        "tenant.reports.add-failed"
      );
      this.adding = null;
    },
    async withdraw() {
      await this.act(
        () =>
          ApiReportService.withdraw(this.tenantId, this.withdrawing.report.id),
        "tenant.reports.withdraw-failed"
      );
      this.withdrawing = null;
    },
    /**
     * Runs a change and reads the list anew either way: a 409 says the
     * report was settled or withdrawn meanwhile.
     */
    async act(change, failedKey) {
      this.working = true;
      this.actionError = "";
      try {
        await change();
      } catch (error) {
        console.error(error);
        this.actionError = getApiErrorMessage(error, this.$t(failedKey));
      } finally {
        this.working = false;
      }
      await this.load();
    },
  },
};
</script>

<style scoped>
.tenant-reports__lead {
  font-size: var(--scb-font-size-md);
  color: var(--scb-text-muted);
}

.tenant-reports__row {
  align-items: flex-start;
  padding: var(--scb-space-3) 0;
}

.tenant-reports__reasons {
  margin-top: var(--scb-space-2);
}

.tenant-reports__rejection {
  margin-top: var(--scb-space-1);
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text);
  white-space: pre-line;
}

.tenant-reports__actions {
  flex: none;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--scb-space-2);
}

.tenant-reports__action {
  text-transform: none;
  letter-spacing: normal;
}

/* $scb-bp-xs of tokens.scss. */
@media (max-width: 599px) {
  .tenant-reports__row {
    flex-direction: column;
    align-items: stretch;
  }
  .tenant-reports__actions {
    justify-content: flex-start;
  }
}
</style>
