<template>
  <div class="reports-queue">
    <p class="reports-queue__lead">{{ $t("supervision.reports.hint") }}</p>
    <v-alert
      v-if="decisionError"
      type="warning"
      text
      dense
      dismissible
      data-test="reports-queue-decision-error"
      @input="decisionError = ''"
    >
      {{ decisionError }}
    </v-alert>
    <v-alert
      v-if="errorMessage"
      type="warning"
      text
      dense
      class="mb-0"
      data-test="reports-queue-error"
    >
      {{ errorMessage }}
    </v-alert>
    <v-progress-linear v-else-if="loading" indeterminate />
    <p
      v-else-if="groups.length === 0"
      class="reports-queue__empty"
      data-test="reports-queue-empty"
    >
      {{ $t("supervision.reports.empty") }}
    </p>
    <div v-else class="booking-rows">
      <div
        v-for="group in groups"
        :key="group.userId"
        class="booking-row reports-queue__row"
        data-test="reports-queue-row"
      >
        <div class="booking-row__main">
          <div class="booking-row__title">
            {{ group.name }}
            <v-chip
              v-if="group.suspended"
              x-small
              color="error"
              outlined
              class="ml-1"
            >
              {{ $t("supervision.reports.already-suspended") }}
            </v-chip>
          </div>
          <div class="booking-row__subtitle">
            {{ group.userId }} ·
            {{ $tc("supervision.reports.count", group.reports.length) }}
          </div>
          <!-- Every report of the user, one per tenant, with all its
               reasons: the instance owner decides on all of them. -->
          <ReportReasons
            v-for="report in group.reports"
            :key="report.id"
            :report="report"
            class="reports-queue__report"
          />
          <v-btn
            text
            x-small
            color="primary"
            class="reports-queue__open px-0"
            data-test="reports-queue-open-user"
            @click="openUser(group)"
          >
            <v-icon left x-small>mdi-account-edit-outline</v-icon>
            {{ $t("supervision.reports.open-user") }}
          </v-btn>
        </div>
        <div class="reports-queue__decision">
          <v-btn
            small
            depressed
            color="error"
            :disabled="deciding || group.suspended"
            class="reports-queue__decide"
            data-test="reports-queue-suspend"
            @click="startSuspend(group)"
          >
            <v-icon left small>mdi-cancel</v-icon>
            {{ $t("supervision.reports.suspend") }}
          </v-btn>
          <v-btn
            small
            outlined
            :disabled="deciding"
            class="reports-queue__decide"
            data-test="reports-queue-reject"
            @click="startReject(group)"
          >
            <v-icon left small>mdi-close</v-icon>
            {{ $t("supervision.reports.reject") }}
          </v-btn>
        </div>
      </div>
    </div>

    <UserSuspendConformationDialog
      :open="!!suspending"
      :name="suspending ? suspending.name : ''"
      :address="suspending ? suspending.userId : ''"
      :preview="preview"
      :in-progress="deciding"
      :error="suspendError"
      @confirm="suspend"
      @cancel="suspending = null"
    />

    <v-dialog :value="!!rejecting" max-width="480" persistent>
      <v-card v-if="rejecting">
        <v-card-title class="text-h6 text-break">
          {{ $t("supervision.reports.reject-title", { name: rejecting.name }) }}
        </v-card-title>
        <v-card-text>
          <p class="text-body-2">
            {{
              $t("supervision.reports.reject-text", { name: rejecting.name })
            }}
          </p>
          <v-textarea
            v-model="rejectReason"
            :label="$t('supervision.reports.reject-reason')"
            outlined
            rows="3"
            auto-grow
            hide-details
            data-test="reports-queue-reject-reason"
          />
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn text :disabled="deciding" @click="rejecting = null">
            {{ $t("supervision.reports.cancel") }}
          </v-btn>
          <v-btn
            color="error"
            depressed
            :disabled="!rejectReason.trim()"
            :loading="deciding"
            data-test="reports-queue-reject-confirm"
            @click="reject"
          >
            {{ $t("supervision.reports.reject") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import ApiReportService from "@/services/api/ApiReportService";
import ApiUsersService from "@/services/api/ApiUsersService";
import { getApiErrorMessage } from "@/services/api/apiErrorMessage";
import UserSuspendConformationDialog from "@/components/User/UserSuspendConformationDialog.vue";
import ReportReasons from "@/components/Supervision/ReportReasons.vue";
import { REPORT_STATUS, groupOpenReports } from "@/utils/reports";

/**
 * „Offene Meldungen“ (glossary „Meldung“, ECCdigital/tickets#630): the open
 * reports of every tenant for the instance owner, one row per reported user
 * with the reports of each tenant apart. „Sperren“ suspends over the
 * suspension's own dialog, which settles every open report about the user;
 * „Ablehnen“ settles them with a reason the tenant owners read. Emits
 * `count` with the number of users waiting.
 */
export default {
  name: "OpenReportsQueue",
  components: { UserSuspendConformationDialog, ReportReasons },
  data() {
    return {
      groups: [],
      loading: false,
      errorMessage: "",
      deciding: false,
      decisionError: "",
      suspending: null,
      preview: null,
      suspendError: null,
      rejecting: null,
      rejectReason: "",
    };
  },
  created() {
    this.load();
  },
  methods: {
    async load() {
      this.loading = true;
      this.errorMessage = "";
      try {
        this.groups = groupOpenReports(
          await ApiReportService.getReports({ status: REPORT_STATUS.OPEN })
        );
        this.$emit("count", this.groups.length);
      } catch (error) {
        console.error(error);
        this.errorMessage = this.$t("supervision.reports.load-failed");
        this.$emit("count", null);
      } finally {
        this.loading = false;
      }
    },
    openUser(group) {
      this.$router.push({
        name: "instance-users",
        query: { user: group.userId },
      });
    },
    async startSuspend(group) {
      this.suspending = group;
      this.preview = null;
      this.suspendError = null;
      try {
        this.preview = (
          await ApiUsersService.getSuspensionPreview(group.userId)
        ).data;
      } catch (error) {
        console.error(error);
        this.suspendError = getApiErrorMessage(
          error,
          this.$t("user.suspension.suspend.preview-error")
        );
      }
    },
    async suspend({ reason, blacklist }) {
      this.deciding = true;
      this.suspendError = null;
      try {
        await ApiUsersService.suspendUser(
          this.suspending.userId,
          reason,
          blacklist
        );
        this.suspending = null;
        await this.load();
      } catch (error) {
        console.error(error);
        this.suspendError = getApiErrorMessage(
          error,
          this.$t("user.suspension.suspend.error")
        );
      } finally {
        this.deciding = false;
      }
    },
    startReject(group) {
      this.rejecting = group;
      this.rejectReason = "";
    },
    /** A 404 says someone else settled them meanwhile: the list is read anew. */
    async reject() {
      this.deciding = true;
      this.decisionError = "";
      try {
        await ApiReportService.reject(
          this.rejecting.userId,
          this.rejectReason.trim()
        );
      } catch (error) {
        console.error(error);
        this.decisionError = getApiErrorMessage(
          error,
          this.$t("supervision.reports.failed")
        );
      } finally {
        this.deciding = false;
        this.rejecting = null;
      }
      await this.load();
    },
  },
};
</script>

<style scoped>
.reports-queue__lead,
.reports-queue__empty {
  font-size: var(--scb-font-size-md);
  color: var(--scb-text-muted);
}

.reports-queue__row {
  align-items: flex-start;
  padding: var(--scb-space-3) 0;
}

.reports-queue__row .booking-row__subtitle {
  white-space: normal;
}

.reports-queue__report {
  margin-top: var(--scb-space-2);
}

.reports-queue__open {
  margin-top: var(--scb-space-1);
  text-transform: none;
  letter-spacing: normal;
}

.reports-queue__decision {
  flex: none;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--scb-space-2);
}

.reports-queue__decide {
  text-transform: none;
  letter-spacing: normal;
  font-weight: var(--scb-font-weight-semibold);
}

/* $scb-bp-xs of tokens.scss. */
@media (max-width: 599px) {
  .reports-queue__row {
    flex-direction: column;
    align-items: stretch;
  }
  .reports-queue__decision {
    justify-content: flex-start;
  }
}
</style>
