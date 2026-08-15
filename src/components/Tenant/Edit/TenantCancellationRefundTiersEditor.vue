<template>
  <BaseSection
    :title="$t('tenant.cancellationRefundTiers.title')"
    icon="mdi-cash-refund"
  >
    <v-row class="mb-1">
      <v-col class="col-12 col-md-8">
        <p class="text--secondary body-2 mb-0">
          {{ $t("tenant.cancellationRefundTiers.description") }}
        </p>
      </v-col>
      <v-col class="col-12 col-md-4 d-flex justify-end align-center">
        <v-btn color="primary" @click="openCreate">
          <v-icon left>mdi-plus</v-icon>
          {{ $t("tenant.cancellationRefundTiers.add") }}
        </v-btn>
      </v-col>
    </v-row>

    <v-alert type="info" dense text icon="mdi-information-outline" class="mb-4">
      {{ $t("tenant.cancellationRefundTiers.orderHint") }}
    </v-alert>

    <v-expansion-panels multiple>
      <v-expansion-panel
        v-for="(tier, index) in localTiers"
        :key="`cancellation-refund-tier-${tier.daysBeforeStart}`"
      >
        <v-expansion-panel-header color="accent" expand-icon="mdi-menu-down">
          <template v-slot:default>
            <v-row no-gutters align="center" class="w-100">
              <v-col class="col-5 d-flex align-center min-width-0">
                <v-chip
                  x-small
                  color="indigo"
                  text-color="white"
                  label
                  class="mr-2 flex-shrink-0"
                >
                  <v-icon x-small>mdi-calendar-clock</v-icon>
                </v-chip>
                <strong class="text-truncate min-width-0">
                  {{
                    $t("tenant.cancellationRefundTiers.tierTitle", {
                      days: tier.daysBeforeStart,
                    })
                  }}
                </strong>
              </v-col>

              <v-col class="col-4 d-flex align-center">
                <v-chip
                  x-small
                  :color="refundColor(tier.refundPercentage)"
                  text-color="white"
                  label
                >
                  {{ tier.refundPercentage }} %
                  {{ $t("tenant.cancellationRefundTiers.refundPercentage") }}
                </v-chip>
              </v-col>

              <v-col class="col-3 d-flex justify-end align-center">
                <v-tooltip bottom>
                  <template v-slot:activator="{ on, attrs }">
                    <v-btn
                      icon
                      small
                      v-bind="attrs"
                      v-on="on"
                      @click.stop="openEdit(index)"
                    >
                      <v-icon>mdi-pencil</v-icon>
                    </v-btn>
                  </template>
                  <span>{{ $t("tenant.cancellationRefundTiers.edit") }}</span>
                </v-tooltip>
                <v-tooltip bottom>
                  <template v-slot:activator="{ on, attrs }">
                    <v-btn
                      icon
                      small
                      color="error"
                      v-bind="attrs"
                      v-on="on"
                      @click.stop="askRemove(index)"
                    >
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </template>
                  <span>{{ $t("tenant.cancellationRefundTiers.remove") }}</span>
                </v-tooltip>
              </v-col>
            </v-row>
          </template>
        </v-expansion-panel-header>

        <v-expansion-panel-content class="pt-2">
          <div class="text-body-2">
            {{
              $t("tenant.cancellationRefundTiers.tierDescription", {
                days: tier.daysBeforeStart,
                percentage: tier.refundPercentage,
              })
            }}
          </div>
          <div
            v-if="index === localTiers.length - 1"
            class="text-caption text--secondary mt-2"
          >
            {{ $t("tenant.cancellationRefundTiers.lowestTierHint") }}
          </div>
        </v-expansion-panel-content>
      </v-expansion-panel>

      <v-expansion-panel v-if="!localTiers.length" disabled>
        <v-expansion-panel-header>
          {{ $t("tenant.cancellationRefundTiers.empty") }}
        </v-expansion-panel-header>
      </v-expansion-panel>
    </v-expansion-panels>

    <v-dialog v-model="dialogOpen" max-width="650" persistent>
      <v-card class="refund-tier-dialog">
        <v-card-title class="subtitle-1">
          <v-icon left color="primary" small>mdi-cash-refund</v-icon>
          {{
            editingIndex >= 0
              ? $t("tenant.cancellationRefundTiers.editTitle")
              : $t("tenant.cancellationRefundTiers.createTitle")
          }}
        </v-card-title>
        <v-divider />

        <v-card-text class="pt-4">
          <v-form ref="dialogForm" v-model="dialogValid">
            <v-row dense>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="editingTier.daysBeforeStart"
                  :label="$t('tenant.cancellationRefundTiers.daysBeforeStart')"
                  :rules="daysRules"
                  type="number"
                  min="0"
                  step="1"
                  suffix="Tage"
                  background-color="accent"
                  filled
                  dense
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="editingTier.refundPercentage"
                  :label="$t('tenant.cancellationRefundTiers.refundPercentage')"
                  :rules="refundRules"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  suffix="%"
                  background-color="accent"
                  filled
                  dense
                />
              </v-col>
            </v-row>

            <v-card outlined class="tier-preview pa-3 mt-2">
              <div class="text-caption text--secondary mb-1">
                <v-icon small left color="primary">mdi-eye-outline</v-icon>
                {{ $t("tenant.cancellationRefundTiers.preview") }}
              </div>
              <div class="text-body-2">
                {{
                  $t("tenant.cancellationRefundTiers.tierDescription", {
                    days: editingTier.daysBeforeStart ?? "–",
                    percentage: editingTier.refundPercentage ?? "–",
                  })
                }}
              </div>
            </v-card>
          </v-form>
        </v-card-text>

        <v-divider />
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="closeDialog">
            {{ $t("tenant.cancellationRefundTiers.cancel") }}
          </v-btn>
          <v-btn color="primary" text :disabled="!canSave" @click="saveTier">
            {{
              editingIndex >= 0
                ? $t("tenant.cancellationRefundTiers.save")
                : $t("tenant.cancellationRefundTiers.create")
            }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="confirmDelete.open" max-width="420">
      <v-card>
        <v-card-title class="subtitle-1">
          {{ $t("tenant.cancellationRefundTiers.deleteTitle") }}
        </v-card-title>
        <v-card-text>
          {{
            $t("tenant.cancellationRefundTiers.deleteDescription", {
              days: deletingTier?.daysBeforeStart,
            })
          }}
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="confirmDelete.open = false">
            {{ $t("tenant.cancellationRefundTiers.cancel") }}
          </v-btn>
          <v-btn color="error" text @click="removeTier">
            {{ $t("tenant.cancellationRefundTiers.remove") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </BaseSection>
</template>

<script>
import BaseSection from "@/components/commons/BaseSection.vue";

function cloneTiers(tiers) {
  return (Array.isArray(tiers) ? tiers : []).map((tier) => ({
    daysBeforeStart: tier.daysBeforeStart,
    refundPercentage: tier.refundPercentage,
  }));
}

function sortTiers(tiers) {
  return [...tiers].sort(
    (left, right) =>
      Number(right.daysBeforeStart) - Number(left.daysBeforeStart)
  );
}

export default {
  name: "TenantCancellationRefundTiersEditor",
  components: { BaseSection },
  props: {
    tiers: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      localTiers: cloneTiers(this.tiers),
      dialogOpen: false,
      dialogValid: false,
      editingIndex: -1,
      editingTier: {
        daysBeforeStart: 0,
        refundPercentage: 100,
      },
      confirmDelete: {
        open: false,
        index: -1,
      },
    };
  },
  computed: {
    deletingTier() {
      return this.localTiers[this.confirmDelete.index] || null;
    },
    daysRules() {
      return [
        (value) => this.isPresent(value) || this.$t("validation.required"),
        (value) =>
          Number.isInteger(Number(value)) ||
          this.$t("validation.integerRequired"),
        (value) =>
          Number(value) >= 0 ||
          this.$t("tenant.cancellationRefundTiers.nonNegativeDays"),
        (value) =>
          !this.hasDuplicateDays(value) ||
          this.$t("tenant.cancellationRefundTiers.uniqueDays"),
      ];
    },
    refundRules() {
      return [
        (value) => this.isPresent(value) || this.$t("validation.required"),
        (value) =>
          Number.isInteger(Number(value)) ||
          this.$t("validation.integerRequired"),
        (value) =>
          (Number(value) >= 0 && Number(value) <= 100) ||
          this.$t("tenant.cancellationRefundTiers.percentageRange"),
        () =>
          this.isCandidateMonotonic ||
          this.$t("tenant.cancellationRefundTiers.monotonic"),
      ];
    },
    candidateTiers() {
      const tiers = cloneTiers(this.localTiers);
      const candidate = {
        daysBeforeStart: Number(this.editingTier.daysBeforeStart),
        refundPercentage: Number(this.editingTier.refundPercentage),
      };
      if (this.editingIndex >= 0) {
        tiers.splice(this.editingIndex, 1, candidate);
      } else {
        tiers.push(candidate);
      }
      return sortTiers(tiers);
    },
    isCandidateMonotonic() {
      return this.candidateTiers.every((tier, index, tiers) => {
        if (index === 0) return true;
        return (
          Number(tier.refundPercentage) <=
          Number(tiers[index - 1].refundPercentage)
        );
      });
    },
    canSave() {
      return (
        this.dialogValid &&
        !this.hasDuplicateDays(this.editingTier.daysBeforeStart) &&
        this.isCandidateMonotonic
      );
    },
  },
  watch: {
    tiers: {
      deep: true,
      handler(tiers) {
        const normalized = cloneTiers(tiers);
        if (JSON.stringify(normalized) !== JSON.stringify(this.localTiers)) {
          this.localTiers = normalized;
        }
      },
    },
  },
  methods: {
    isPresent(value) {
      return value !== "" && value !== null && value !== undefined;
    },
    hasDuplicateDays(value) {
      return this.localTiers.some(
        (tier, index) =>
          index !== this.editingIndex &&
          Number(tier.daysBeforeStart) === Number(value)
      );
    },
    refundColor(percentage) {
      if (percentage >= 100) return "success";
      if (percentage <= 0) return "error";
      return "primary";
    },
    openCreate() {
      const sorted = sortTiers(this.localTiers);
      const highest = sorted[0];
      this.editingIndex = -1;
      this.editingTier = {
        daysBeforeStart: highest ? Number(highest.daysBeforeStart || 0) + 1 : 0,
        refundPercentage: highest
          ? Number(highest.refundPercentage ?? 100)
          : 100,
      };
      this.dialogOpen = true;
      this.$nextTick(() => this.$refs.dialogForm?.resetValidation());
    },
    openEdit(index) {
      this.editingIndex = index;
      this.editingTier = { ...this.localTiers[index] };
      this.dialogOpen = true;
      this.$nextTick(() => this.$refs.dialogForm?.resetValidation());
    },
    closeDialog() {
      this.dialogOpen = false;
      this.editingIndex = -1;
      this.$refs.dialogForm?.resetValidation();
    },
    saveTier() {
      if (!this.$refs.dialogForm?.validate() || !this.canSave) return;
      const tier = {
        daysBeforeStart: Number(this.editingTier.daysBeforeStart),
        refundPercentage: Number(this.editingTier.refundPercentage),
      };
      if (this.editingIndex >= 0) {
        this.localTiers.splice(this.editingIndex, 1, tier);
      } else {
        this.localTiers.push(tier);
      }
      this.emitTiers();
      this.closeDialog();
    },
    askRemove(index) {
      this.confirmDelete = { open: true, index };
    },
    removeTier() {
      if (this.confirmDelete.index >= 0) {
        this.localTiers.splice(this.confirmDelete.index, 1);
        this.emitTiers();
      }
      this.confirmDelete = { open: false, index: -1 };
    },
    emitTiers() {
      this.localTiers = sortTiers(this.localTiers);
      this.$emit("update:tiers", cloneTiers(this.localTiers));
    },
  },
};
</script>

<style scoped>
.min-width-0 {
  min-width: 0;
}

.flex-shrink-0 {
  flex-shrink: 0;
}

.tier-preview {
  background: rgba(0, 0, 0, 0.02);
  border-radius: 4px !important;
}

.theme--dark .tier-preview {
  background: rgba(255, 255, 255, 0.04);
}

.refund-tier-dialog >>> .v-input__control > .v-input__slot {
  border-radius: 4px !important;
}
</style>
