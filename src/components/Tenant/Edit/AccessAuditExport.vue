<script>
import { mapActions } from "vuex";
import ApiAccessService from "@/services/api/ApiAccessService";
import ToastService from "@/services/ToastService";

export default {
  name: "AccessAuditExport",
  props: {
    tenant: { type: String, required: true },
  },
  data() {
    return {
      exporting: null,
      filters: {
        from: "",
        to: "",
        provider: null,
        action: null,
        result: null,
        accessPointId: "",
        bookingId: "",
      },
    };
  },
  computed: {
    providerOptions() {
      return [
        { value: "nuki", text: "Nuki" },
        { value: "salto-ks", text: "Salto KS" },
        { value: "ifbs", text: "IFBS" },
      ];
    },
    actionOptions() {
      return ["open", "close", "provision", "revoke", "status", "webhook"].map(
        (value) => ({
          value,
          text: this.$t(`accessPoint.audit.actions.${value}`),
        })
      );
    },
    resultOptions() {
      return ["success", "failure", "pending"].map((value) => ({
        value,
        text: this.$t(`accessPoint.audit.results.${value}`),
      }));
    },
  },
  methods: {
    ...mapActions({
      addToast: "toasts/add",
    }),
    resetFilters() {
      this.filters = {
        from: "",
        to: "",
        provider: null,
        action: null,
        result: null,
        accessPointId: "",
        bookingId: "",
      };
    },
    parseFilename(disposition, format) {
      const match = (disposition || "").match(/filename=([^;]+)/i);
      if (match) {
        return match[1].trim().replace(/"/g, "");
      }
      return `access-audit-${this.tenant}.${format}`;
    },
    async exportAudit(format) {
      if (this.exporting) return;
      this.exporting = format;

      try {
        const response = await ApiAccessService.exportAudit(
          { format, ...this.filters },
          this.tenant
        );

        const filename = this.parseFilename(
          response.headers?.["content-disposition"],
          format
        );

        const blob = new Blob([response.data], {
          type:
            format === "pdf"
              ? "application/pdf"
              : "text/csv;charset=utf-8",
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        const status = error.response?.status;
        const key =
          status === 403
            ? "accessPoint.audit.error.forbidden"
            : "accessPoint.audit.error.failed";
        await this.addToast(ToastService.createToast(key, "error"));
      } finally {
        this.exporting = null;
      }
    },
  },
};
</script>

<template>
  <div class="audit-export">
    <div class="section-title mt-2 mb-3">
      <v-icon small left>mdi-clipboard-text-clock</v-icon>
      <span class="font-weight-medium">{{
        $t("accessPoint.audit.title")
      }}</span>
    </div>

    <v-alert type="info" text dense class="mb-4">
      {{ $t("accessPoint.audit.info") }}
    </v-alert>

    <v-row dense>
      <v-col cols="12" sm="6" md="3">
        <v-text-field
          background-color="accent"
          filled
          dense
          type="date"
          clearable
          :label="$t('accessPoint.audit.from')"
          v-model="filters.from"
          hide-details
        />
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-text-field
          background-color="accent"
          filled
          dense
          type="date"
          clearable
          :label="$t('accessPoint.audit.to')"
          v-model="filters.to"
          hide-details
        />
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-select
          background-color="accent"
          filled
          dense
          clearable
          :items="providerOptions"
          :label="$t('accessPoint.audit.provider')"
          v-model="filters.provider"
          hide-details
        />
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-select
          background-color="accent"
          filled
          dense
          clearable
          :items="actionOptions"
          :label="$t('accessPoint.audit.action')"
          v-model="filters.action"
          hide-details
        />
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-select
          background-color="accent"
          filled
          dense
          clearable
          :items="resultOptions"
          :label="$t('accessPoint.audit.result')"
          v-model="filters.result"
          hide-details
        />
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-text-field
          background-color="accent"
          filled
          dense
          clearable
          :label="$t('accessPoint.audit.bookingId')"
          v-model="filters.bookingId"
          hide-details
        />
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-text-field
          background-color="accent"
          filled
          dense
          clearable
          :label="$t('accessPoint.audit.accessPointId')"
          v-model="filters.accessPointId"
          hide-details
        />
      </v-col>
    </v-row>

    <v-row dense class="mt-2">
      <v-col class="d-flex align-center flex-wrap" style="gap: 8px">
        <v-btn
          text
          small
          :disabled="!!exporting"
          @click="resetFilters"
        >
          <v-icon left small>mdi-filter-remove-outline</v-icon>
          {{ $t("accessPoint.audit.reset") }}
        </v-btn>
        <v-spacer />
        <v-btn
          color="primary"
          outlined
          :loading="exporting === 'csv'"
          :disabled="!!exporting"
          @click="exportAudit('csv')"
        >
          <v-icon left>mdi-file-delimited-outline</v-icon>
          {{ $t("accessPoint.audit.exportCsv") }}
        </v-btn>
        <v-btn
          color="primary"
          :loading="exporting === 'pdf'"
          :disabled="!!exporting"
          @click="exportAudit('pdf')"
        >
          <v-icon left>mdi-file-pdf-box</v-icon>
          {{ $t("accessPoint.audit.exportPdf") }}
        </v-btn>
      </v-col>
    </v-row>
  </div>
</template>

<style scoped>
.section-title {
  display: flex;
  align-items: center;
  font-size: 0.95rem;
  color: rgba(0, 0, 0, 0.7);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  padding-bottom: 4px;
}
.theme--dark .section-title {
  color: rgba(255, 255, 255, 0.8);
  border-bottom-color: rgba(255, 255, 255, 0.1);
}
</style>
