<template>
  <v-dialog :value="open" max-width="480" @click:outside="$emit('close')">
    <v-card class="section-card">
      <v-card-title class="section-header">
        <v-icon>mdi-close-circle-outline</v-icon>
        <span>{{ $t("supervision.tenant-approval-queue.decline") }}</span>
      </v-card-title>
      <v-divider />
      <v-card-text class="pt-4">
        <p>{{ tenant.name || tenant.id }}</p>
        <v-textarea
          v-model="reason"
          :label="$t('supervision.level.change.reason')"
          outlined
          rows="3"
        />
        <v-alert v-if="errorMessage" type="error" text dense class="mb-0">
          {{ errorMessage }}
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text :disabled="inProgress" @click="$emit('close')">
          {{ $t("supervision.level.change.cancel") }}
        </v-btn>
        <v-btn
          color="error"
          depressed
          :loading="inProgress"
          :disabled="inProgress"
          @click="submit"
        >
          {{ $t("supervision.tenant-approval-queue.decline") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import ApiSupervisionService from "@/services/api/ApiSupervisionService";
import {
  getApiErrorMessage,
  shouldRefetch,
} from "@/services/api/apiErrorMessage";
import { SUPERVISION_LEVELS } from "@/utils/supervision";

// Placeholder with the interface of ticket 03 (tenant approval), which replaces this file.
export default {
  name: "TenantDeclineDialog",
  props: {
    open: { type: Boolean, default: false },
    tenant: { type: Object, default: () => ({}) },
  },
  data() {
    return { reason: "", inProgress: false, errorMessage: "" };
  },
  watch: {
    open(isOpen) {
      if (!isOpen) return;
      this.reason = "";
      this.errorMessage = "";
    },
  },
  methods: {
    async submit() {
      this.inProgress = true;
      this.errorMessage = "";
      try {
        const answer = await ApiSupervisionService.setTenantLevel(
          this.tenant.id,
          {
            level: SUPERVISION_LEVELS.DECLINED,
            reason: this.reason.trim() || null,
          }
        );
        this.$emit("declined", {
          tenantId: this.tenant.id,
          supervisionLevel: answer.supervisionLevel,
          supervisionChangedAt: answer.supervisionChangedAt,
          supervisionReason: answer.supervisionReason,
        });
      } catch (error) {
        console.error(error);
        this.errorMessage = getApiErrorMessage(
          error,
          this.$t("supervision.level.change.failed")
        );
        if (shouldRefetch(error)) this.$emit("stale");
      } finally {
        this.inProgress = false;
      }
    },
  },
};
</script>
