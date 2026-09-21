<template>
  <v-dialog :value="open" max-width="600px" @click:outside="$emit('close')">
    <v-card data-test="level-dialog">
      <v-card-title class="mx-3">
        <span class="text-h5">{{ $t("supervision.level.change.title") }}</span>
      </v-card-title>
      <v-card-subtitle class="mx-3">
        {{ tenant.name || tenant.id }}
      </v-card-subtitle>
      <v-divider class="mx-9 mb-5" />
      <v-card-text>
        <div class="mb-4">
          {{ $t("supervision.level.change.current") }}
          <SupervisionLevelChip :level="currentLevel" />
        </div>
        <v-radio-group
          v-model="level"
          :label="$t('supervision.level.change.target')"
          class="mt-0"
          hide-details
        >
          <v-radio
            v-for="option in options"
            :key="option"
            :value="option"
            :label="$t(levelLabelKey(option))"
            :data-test="`level-option-${option}`"
          />
        </v-radio-group>
        <v-alert
          v-if="level"
          :type="level === 'free' ? 'info' : 'warning'"
          text
          dense
          class="mt-4"
          data-test="level-consequence"
        >
          {{ $t(`supervision.level.change.consequence.${level}`) }}
        </v-alert>
        <v-textarea
          ref="reason"
          v-model="reason"
          :label="$t('supervision.level.change.reason')"
          :hint="$t('supervision.level.change.reason-hint')"
          persistent-hint
          outlined
          rows="3"
          class="mt-4"
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
          color="primary"
          :disabled="!level || inProgress"
          :loading="inProgress"
          data-test="level-submit"
          @click="submit"
        >
          {{ $t("supervision.level.change.submit") }}
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
import SupervisionLevelChip from "@/components/Supervision/SupervisionLevelChip.vue";
import {
  effectiveLevel,
  levelLabelKey,
  selectableLevels,
} from "@/utils/supervision";

/**
 * The instance owner's explicit level change (glossary "Aufsichtsstufe"):
 * every level in every direction, with an optional reason. The level the
 * tenant already has is not offered - setting it is a no-op on the backend.
 * The level travels through its own route, never with a tenant write.
 */
export default {
  name: "SupervisionLevelDialog",
  components: { SupervisionLevelChip },
  props: {
    open: { type: Boolean, default: false },
    tenant: { type: Object, default: () => ({}) },
  },
  data() {
    return { level: null, reason: "", inProgress: false, errorMessage: "" };
  },
  computed: {
    currentLevel() {
      return effectiveLevel(this.tenant);
    },
    options() {
      return selectableLevels(this.currentLevel);
    },
  },
  watch: {
    open(isOpen) {
      if (isOpen) this.reset();
    },
    // The host reloads the tenant after a conflict: a choice that became the
    // effective level is no change any more.
    currentLevel(current) {
      if (this.level === current) this.level = null;
    },
  },
  methods: {
    levelLabelKey,
    reset() {
      this.level = null;
      this.reason = "";
      this.errorMessage = "";
    },
    async submit() {
      if (!this.level || this.inProgress) return;
      this.inProgress = true;
      this.errorMessage = "";
      try {
        const answer = await ApiSupervisionService.setTenantLevel(
          this.tenant.id,
          { level: this.level, reason: this.reason.trim() || null }
        );
        // The answer is the effective level - what the list shows from now on.
        this.$emit("changed", {
          tenantId: this.tenant.id,
          supervisionLevel: answer.supervisionLevel,
          supervisionChangedAt: answer.supervisionChangedAt,
        });
      } catch (error) {
        console.error(error);
        this.errorMessage = getApiErrorMessage(
          error,
          this.$t("supervision.level.change.failed")
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
