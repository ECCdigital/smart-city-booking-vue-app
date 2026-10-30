<template>
  <v-dialog
    :value="open"
    max-width="600px"
    scrollable
    @click:outside="$emit('close')"
  >
    <v-card data-test="level-dialog">
      <v-card-title class="d-flex align-center py-4 px-6">
        <v-icon left>mdi-shield-account</v-icon>
        <div>
          <div class="text-h5">{{ $t(modeText.title) }}</div>
          <div class="text-caption text--secondary">
            {{ tenant.name || tenant.id }}
          </div>
        </div>
        <v-spacer />
        <v-btn icon :disabled="inProgress" @click="$emit('close')">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-6">
        <div class="mb-4">
          {{ $t("supervision.level.change.current") }}
          <SupervisionLevelChip :level="currentLevel" />
        </div>
        <v-radio-group
          v-model="level"
          :label="$t(modeText.target)"
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
      <v-divider />
      <v-card-actions class="justify-end px-6 py-4">
        <v-btn outlined :disabled="inProgress" @click="$emit('close')">
          {{ $t("supervision.level.change.cancel") }}
        </v-btn>
        <v-btn
          color="primary"
          :disabled="!level || inProgress"
          :loading="inProgress"
          data-test="level-submit"
          @click="submit"
        >
          <v-icon left small>mdi-check</v-icon>
          {{ $t(modeText.submit) }}
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
  SUPERVISION_LEVELS,
  effectiveLevel,
  levelLabelKey,
  selectableLevels,
} from "@/utils/supervision";

const MODE_TEXT = Object.freeze({
  change: {
    title: "supervision.level.change.title",
    target: "supervision.level.change.target",
    submit: "supervision.level.change.submit",
  },
  reinstate: {
    title: "supervision.reinstate.title",
    target: "supervision.reinstate.target",
    submit: "supervision.reinstate.submit",
  },
});

/**
 * The instance owner's explicit level change (glossary "Aufsichtsstufe"):
 * free, supervised and pending in every direction, with an optional reason;
 * declined is never a target here. The level the tenant already has is not
 * offered - setting it is a no-op on the backend. For a declined tenant the
 * same dialog takes the decline back ("Abweisung zurücknehmen"): it asks
 * which of the three regular levels the tenant returns to.
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
    // Title, question and button name what the change does.
    modeText() {
      return this.currentLevel === SUPERVISION_LEVELS.DECLINED
        ? MODE_TEXT.reinstate
        : MODE_TEXT.change;
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
          supervisionReason: answer.supervisionReason,
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
