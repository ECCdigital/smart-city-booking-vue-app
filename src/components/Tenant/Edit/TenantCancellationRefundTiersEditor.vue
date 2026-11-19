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
        :key="`cancellation-refund-tier-${tier.hoursBeforeStart}`"
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
                  {{ tierTitle(tier.hoursBeforeStart) }}
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
                rule: formatTierRule(tier.hoursBeforeStart),
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

    <v-row class="mt-4">
      <v-col class="col-12 col-md-8">
        <p class="text--secondary body-2 mb-0">
          {{ $t("tenant.cancellationRefundTiers.withoutTimeSpanHint") }}
        </p>
      </v-col>
      <v-col class="col-12 col-md-4">
        <v-text-field
          :value="withoutTimeSpanPercentage"
          :label="$t('tenant.cancellationRefundTiers.withoutTimeSpanLabel')"
          :rules="percentageRules"
          type="number"
          min="0"
          max="100"
          step="1"
          suffix="%"
          background-color="accent"
          filled
          dense
          @input="updateWithoutTimeSpanPercentage"
        />
      </v-col>
    </v-row>

    <v-dialog v-model="dialogOpen" max-width="650" persistent scrollable>
      <v-card class="refund-tier-dialog">
        <v-card-title class="d-flex align-center py-4 px-6">
          <v-icon left>{{
            editingIndex >= 0 ? "mdi-pencil" : "mdi-plus"
          }}</v-icon>
          <span class="text-h5">
            {{
              editingIndex >= 0
                ? $t("tenant.cancellationRefundTiers.editTitle")
                : $t("tenant.cancellationRefundTiers.createTitle")
            }}
          </span>
          <v-spacer />
          <v-btn icon @click="closeDialog"><v-icon>mdi-close</v-icon></v-btn>
        </v-card-title>
        <v-divider />

        <v-card-text class="pa-6">
          <v-form ref="dialogForm" v-model="dialogValid">
            <v-row dense>
              <v-col cols="7" md="4">
                <v-text-field
                  v-model.number="editingTier.amount"
                  :label="$t('tenant.cancellationRefundTiers.deadline')"
                  :rules="deadlineRules"
                  type="number"
                  min="0"
                  step="1"
                  background-color="accent"
                  filled
                  dense
                />
              </v-col>
              <v-col cols="5" md="3">
                <v-select
                  v-model="editingTier.unit"
                  :items="unitItems"
                  :label="$t('tenant.cancellationRefundTiers.unit')"
                  background-color="accent"
                  filled
                  dense
                />
              </v-col>
              <v-col cols="12" md="5">
                <v-text-field
                  v-model.number="editingTier.refundPercentage"
                  :label="$t('tenant.cancellationRefundTiers.refundPercentage')"
                  :rules="refundRules"
                  :hint="refundRangeHint"
                  persistent-hint
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

            <v-alert
              v-if="preferDaysHint"
              type="info"
              dense
              text
              icon="mdi-lightbulb-outline"
              class="mt-2 mb-0 text-body-2"
            >
              {{ preferDaysHint }}
            </v-alert>

            <v-card outlined class="tier-preview pa-3 mt-2">
              <div class="text-caption text--secondary mb-1">
                <v-icon small left color="primary">mdi-eye-outline</v-icon>
                {{ $t("tenant.cancellationRefundTiers.preview") }}
              </div>
              <div class="text-body-2">
                {{
                  $t("tenant.cancellationRefundTiers.tierDescription", {
                    rule: editingRuleText,
                    percentage: editingTier.refundPercentage ?? "–",
                  })
                }}
              </div>
            </v-card>
          </v-form>
        </v-card-text>

        <v-divider />
        <v-card-actions class="justify-end px-6 py-4">
          <v-btn outlined @click="closeDialog">
            {{ $t("tenant.cancellationRefundTiers.cancel") }}
          </v-btn>
          <v-btn color="primary" :disabled="!canSave" @click="saveTier">
            <v-icon left small>
              {{ editingIndex >= 0 ? "mdi-content-save" : "mdi-plus" }}
            </v-icon>
            {{
              editingIndex >= 0
                ? $t("tenant.cancellationRefundTiers.save")
                : $t("tenant.cancellationRefundTiers.create")
            }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog
      v-model="confirmDelete.open"
      persistent
      scrollable
      max-width="420"
    >
      <v-card>
        <v-card-title class="d-flex align-center py-4 px-6">
          <v-icon left color="error">mdi-alert</v-icon>
          <span class="text-h5">
            {{ $t("tenant.cancellationRefundTiers.deleteTitle") }}
          </span>
          <v-spacer />
          <v-btn icon @click="confirmDelete.open = false"
            ><v-icon>mdi-close</v-icon></v-btn
          >
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-6">
          {{
            $t("tenant.cancellationRefundTiers.deleteDescription", {
              rule: deletingTier
                ? formatTierRule(deletingTier.hoursBeforeStart)
                : "",
            })
          }}
        </v-card-text>
        <v-divider />
        <v-card-actions class="justify-end px-6 py-4">
          <v-btn outlined @click="confirmDelete.open = false">
            {{ $t("tenant.cancellationRefundTiers.cancel") }}
          </v-btn>
          <v-btn color="error" @click="removeTier">
            <v-icon left small>mdi-delete</v-icon>
            {{ $t("tenant.cancellationRefundTiers.remove") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </BaseSection>
</template>

<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import {
  HOURS_PER_DAY,
  formatTierDeadline,
  formatTierRule,
  tierDeadline,
} from "@/utils/cancellationRefund";

function cloneTiers(tiers) {
  return (Array.isArray(tiers) ? tiers : []).map((tier) => ({
    hoursBeforeStart: tier.hoursBeforeStart,
    refundPercentage: tier.refundPercentage,
  }));
}

function sortTiers(tiers) {
  return [...tiers].sort(
    (left, right) =>
      Number(right.hoursBeforeStart) - Number(left.hoursBeforeStart)
  );
}

/** The tier being edited: its deadline as amount and unit, as entered. */
function toEditingTier(tier) {
  return {
    ...tierDeadline(tier.hoursBeforeStart),
    refundPercentage: tier.refundPercentage,
  };
}

export default {
  name: "TenantCancellationRefundTiersEditor",
  components: { BaseSection },
  props: {
    tiers: {
      type: Array,
      default: () => [],
    },
    withoutTimeSpanPercentage: {
      type: Number,
      default: 100,
    },
  },
  data() {
    return {
      localTiers: cloneTiers(this.tiers),
      dialogOpen: false,
      dialogValid: false,
      editingIndex: -1,
      editingTier: {
        amount: 0,
        unit: "days",
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
    unitItems() {
      return [
        {
          value: "days",
          text: this.$t("tenant.cancellationRefundTiers.unitDays"),
        },
        {
          value: "hours",
          text: this.$t("tenant.cancellationRefundTiers.unitHours"),
        },
      ];
    },
    /** The deadline being edited in hours, as it is stored; a day is 24. */
    editingHours() {
      const factor = this.editingTier.unit === "days" ? HOURS_PER_DAY : 1;
      return Number(this.editingTier.amount) * factor;
    },
    editingRuleText() {
      return this.isValidDeadline(this.editingTier.amount)
        ? formatTierRule(this.editingHours)
        : "–";
    },
    deadlineRules() {
      return [
        (value) => this.isPresent(value) || this.$t("validation.required"),
        (value) =>
          Number.isInteger(Number(value)) ||
          this.$t("validation.integerRequired"),
        (value) =>
          Number(value) >= 0 ||
          this.$t("tenant.cancellationRefundTiers.nonNegativeDeadline"),
        () =>
          !this.hasDuplicateDeadline(this.editingHours) ||
          this.$t("tenant.cancellationRefundTiers.uniqueDeadline"),
      ];
    },
    percentageRules() {
      return [
        (value) => this.isPresent(value) || this.$t("validation.required"),
        (value) =>
          Number.isInteger(Number(value)) ||
          this.$t("validation.integerRequired"),
        (value) =>
          (Number(value) >= 0 && Number(value) <= 100) ||
          this.$t("tenant.cancellationRefundTiers.percentageRange"),
      ];
    },
    /**
     * Past 48 hours a deadline in hours reads harder for the booker than one
     * in days: the whole days it comes nearest to, as text; `null` otherwise.
     */
    daysSuggestion() {
      if (
        this.editingTier.unit !== "hours" ||
        !this.isValidDeadline(this.editingTier.amount) ||
        this.editingHours <= 2 * HOURS_PER_DAY
      ) {
        return null;
      }
      const days = Math.round(this.editingHours / HOURS_PER_DAY);
      return formatTierDeadline(days * HOURS_PER_DAY);
    },
    preferDaysHint() {
      return this.daysSuggestion
        ? this.$t("tenant.cancellationRefundTiers.preferDays", {
            hours: this.$tc(
              "booking.cancellationRefund.timeHours",
              this.editingHours,
              { n: this.editingHours }
            ),
            days: this.daysSuggestion,
          })
        : "";
    },
    /**
     * The refunds the tier being edited may name so that more notice never
     * refunds less: at most that of the next longer deadline, at least that
     * of the next shorter one.
     *
     * @returns {{ min: number, max: number, longer: Object|null, shorter: Object|null }}
     */
    allowedRefundRange() {
      const others = sortTiers(
        this.localTiers.filter((tier, index) => index !== this.editingIndex)
      );
      const hours = this.editingHours;
      const longer =
        [...others]
          .reverse()
          .find((tier) => Number(tier.hoursBeforeStart) > hours) || null;
      const shorter =
        others.find((tier) => Number(tier.hoursBeforeStart) < hours) || null;
      return {
        min: shorter ? Number(shorter.refundPercentage) : 0,
        max: longer ? Number(longer.refundPercentage) : 100,
        longer,
        shorter,
      };
    },
    refundRangeHint() {
      const { min, max } = this.allowedRefundRange;
      if (min === 0 && max === 100) return "";
      return this.$t("tenant.cancellationRefundTiers.refundRangeHint", {
        min,
        max,
      });
    },
    refundRangeMessage() {
      const { min, max, longer, shorter } = this.allowedRefundRange;
      const values = {
        min,
        max,
        longer: longer ? formatTierRule(longer.hoursBeforeStart) : "",
        shorter: shorter ? formatTierRule(shorter.hoursBeforeStart) : "",
      };
      let key = "refundRangeBoth";
      if (!shorter) key = "refundRangeMax";
      else if (!longer) key = "refundRangeMin";
      return this.$t(`tenant.cancellationRefundTiers.${key}`, values);
    },
    refundRules() {
      return [
        ...this.percentageRules,
        () => this.isCandidateMonotonic || this.refundRangeMessage,
      ];
    },
    candidateTiers() {
      const tiers = cloneTiers(this.localTiers);
      const candidate = {
        hoursBeforeStart: this.editingHours,
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
        !this.hasDuplicateDeadline(this.editingHours) &&
        this.isCandidateMonotonic
      );
    },
  },
  watch: {
    editingHours() {
      // The allowed refund follows the deadline: check it again.
      if (this.dialogOpen)
        this.$nextTick(() => this.$refs.dialogForm?.validate());
    },
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
    isValidDeadline(value) {
      return (
        this.isPresent(value) &&
        Number.isInteger(Number(value)) &&
        Number(value) >= 0
      );
    },
    hasDuplicateDeadline(hours) {
      return this.localTiers.some(
        (tier, index) =>
          index !== this.editingIndex &&
          Number(tier.hoursBeforeStart) === Number(hours)
      );
    },
    formatTierRule,
    /** A tier's title in the list: „Bis 2 Tage vor Beginn“, „Bis zum Beginn“. */
    tierTitle(hoursBeforeStart) {
      return Number(hoursBeforeStart) === 0
        ? this.$t("tenant.cancellationRefundTiers.tierTitleAtStart")
        : this.$t("tenant.cancellationRefundTiers.tierTitle", {
            deadline: formatTierDeadline(hoursBeforeStart),
          });
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
      this.editingTier = toEditingTier({
        hoursBeforeStart: highest
          ? Number(highest.hoursBeforeStart || 0) + HOURS_PER_DAY
          : 0,
        refundPercentage: highest
          ? Number(highest.refundPercentage ?? 100)
          : 100,
      });
      this.dialogOpen = true;
      this.$nextTick(() => this.$refs.dialogForm?.resetValidation());
    },
    openEdit(index) {
      this.editingIndex = index;
      this.editingTier = toEditingTier(this.localTiers[index]);
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
        hoursBeforeStart: this.editingHours,
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
    updateWithoutTimeSpanPercentage(value) {
      if (!this.percentageRules.every((rule) => rule(value) === true)) return;
      this.$emit("update:withoutTimeSpanPercentage", Number(value));
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
