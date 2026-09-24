<template>
  <v-dialog :value="open" max-width="600px" persistent>
    <v-card data-test="decline-dialog">
      <v-card-title class="mx-3">
        <span class="text-h5 error--text">
          {{ $t("supervision.decline.title") }}
        </span>
      </v-card-title>
      <v-card-subtitle class="mx-3">
        {{ tenant.name || tenant.id }}
      </v-card-subtitle>
      <v-divider class="mx-9 mb-5" />
      <v-card-text>
        <p class="mb-1">
          {{ $t("supervision.decline.lead") }}
        </p>
        <ul class="mb-2">
          <li v-for="consequence in consequences" :key="consequence">
            {{ $t(`supervision.decline.consequences.${consequence}`) }}
          </li>
        </ul>
        <!-- The link sits under the list, flush with its text. -->
        <div v-if="tenant.id" class="mb-4 ml-n2">
          <TenantBookingsLink :tenant="tenant">
            {{ $t("supervision.decline.bookings") }}
          </TenantBookingsLink>
        </div>
        <v-textarea
          v-model="reason"
          :label="$t('supervision.decline.reason')"
          :hint="$t('supervision.decline.reason-hint')"
          persistent-hint
          outlined
          rows="3"
        />
        <v-alert v-if="errorMessage" type="error" text dense class="mt-2 mb-0">
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
          :disabled="inProgress"
          :loading="inProgress"
          data-test="decline-submit"
          @click="submit"
        >
          {{ $t("supervision.decline.submit") }}
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
import TenantBookingsLink from "@/components/Supervision/TenantBookingsLink.vue";
import { SUPERVISION_LEVELS } from "@/utils/supervision";

/** What a decline does, in the order the dialog names it. */
const CONSEQUENCES = ["public", "access", "bookings", "reversible"];

/**
 * The instance owner declines a tenant (glossary "abgewiesen"): its own,
 * red action beside the level dialog, which never offers the level. It is
 * the same level change on the backend. One dialog for the tenant approval
 * queue and the panel of the tenant list.
 */
export default {
  name: "TenantDeclineDialog",
  components: { TenantBookingsLink },
  props: {
    open: { type: Boolean, default: false },
    /** `id` and `name` are read; the approval queue hands in its level too. */
    tenant: { type: Object, default: () => ({}) },
  },
  data() {
    return { reason: "", inProgress: false, errorMessage: "" };
  },
  computed: {
    consequences: () => CONSEQUENCES,
  },
  watch: {
    open(isOpen) {
      if (isOpen) this.reset();
    },
  },
  methods: {
    reset() {
      this.reason = "";
      this.errorMessage = "";
    },
    async submit() {
      if (this.inProgress) return;
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
          this.$t("supervision.decline.failed")
        );
        // The level moved or the tenant is gone: the list behind is stale.
        if (shouldRefetch(error)) this.$emit("stale");
      } finally {
        this.inProgress = false;
      }
    },
  },
};
</script>
