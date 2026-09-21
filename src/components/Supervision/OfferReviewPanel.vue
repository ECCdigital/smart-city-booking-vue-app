<template>
  <div v-if="visible" class="offer-review-panel" data-test="review-panel">
    <div class="d-flex align-center flex-wrap">
      <span class="text-subtitle-2 mr-3">
        {{ $t("supervision.review.title") }}
      </span>
      <v-chip
        small
        label
        outlined
        class="mr-3"
        :color="statusView.color"
        data-test="review-status"
      >
        {{ $t(statusView.labelKey) }}
      </v-chip>
      <span
        v-if="submittedAtLabel"
        class="text-caption text--secondary mr-3"
        data-test="review-submitted-at"
      >
        {{ $t("supervision.review.submitted-at", { time: submittedAtLabel }) }}
      </span>
      <span
        v-if="decidedAtLabel"
        class="text-caption text--secondary"
        data-test="review-decided-at"
      >
        {{ $t("supervision.review.decided-at", { time: decidedAtLabel }) }}
      </span>
    </div>

    <p v-if="reason" class="text-body-2 mt-2 mb-0" data-test="review-reason">
      {{ $t("supervision.review.reason", { reason }) }}
    </p>
    <p
      v-if="effectKey"
      class="text-body-2 text--secondary mt-2 mb-0"
      data-test="review-effect"
    >
      {{ $t(effectKey) }}
    </p>

    <v-alert
      v-if="errorKey"
      type="warning"
      text
      dense
      class="mt-2 mb-0"
      data-test="review-error"
    >
      {{ $t(errorKey) }}
    </v-alert>

    <p
      v-if="!offerId"
      class="text-caption text--secondary mt-2 mb-0"
      data-test="review-unsaved"
    >
      {{ $t("supervision.review.unsaved") }}
    </p>
    <div v-else-if="actions.length" class="mt-2">
      <v-btn
        v-for="action in actions"
        :key="action"
        small
        outlined
        class="mr-2"
        :color="actionColor(action)"
        :disabled="inProgress"
        :data-test="`review-action-${action}`"
        @click="start(action)"
      >
        {{ $t(`supervision.review.actions.${action}`) }}
      </v-btn>
    </div>

    <v-dialog v-model="dialog" max-width="480">
      <v-card v-if="pendingAction">
        <v-card-title class="text-h6">
          {{ $t(`supervision.review.actions.${pendingAction}`) }}
        </v-card-title>
        <v-card-text>
          <v-textarea
            v-model="reasonInput"
            :label="$t('supervision.review.dialog.reason-label')"
            :hint="$t('supervision.review.dialog.reason-hint')"
            persistent-hint
            outlined
            rows="3"
            auto-grow
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="dialog = false">
            {{ $t("supervision.review.dialog.cancel") }}
          </v-btn>
          <v-btn
            text
            :color="actionColor(pendingAction)"
            :disabled="inProgress"
            @click="confirm"
          >
            {{ $t(`supervision.review.actions.${pendingAction}`) }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import ApiReviewService from "@/services/api/ApiReviewService";
import TenantPermissionService from "@/services/permissions/TenantPermissionService";
import {
  REVIEW_ACTIONS,
  isSubmission,
  reviewActions,
  reviewEffectKey,
  reviewStatusView,
  showsReview,
  showsReviewEffect,
} from "@/utils/offerReview";

/** The decisions that ask for a reason first. */
const ACTIONS_WITH_REASON = [REVIEW_ACTIONS.REJECT, REVIEW_ACTIONS.WITHDRAW];

/**
 * The review of one offer (glossary "Prüfstatus") outside the wizard: status,
 * what it means right now, and the actions of spec §4 the viewer may take.
 * Offer-type agnostic - a bookable and an event dock it the same way. The new
 * review goes up as `update:review`, so the host patches its offer without
 * reloading a form that may hold unsaved edits.
 */
export default {
  name: "OfferReviewPanel",
  props: {
    tenantId: { type: String, default: null },
    offerType: { type: String, required: true },
    offerId: { type: String, default: null },
    review: { type: Object, default: null },
    isPublic: { type: Boolean, default: false },
    supervisionLevel: { type: String, default: null },
  },
  data() {
    return {
      inProgress: false,
      errorKey: null,
      dialog: false,
      pendingAction: null,
      reasonInput: "",
    };
  },
  computed: {
    viewer() {
      return TenantPermissionService.reviewViewer(this.tenantId);
    },
    visible() {
      return showsReview(this.review, this.supervisionLevel, this.viewer);
    },
    statusView() {
      return reviewStatusView(this.review);
    },
    actions() {
      return reviewActions(this.review, this.viewer);
    },
    effectKey() {
      if (!showsReviewEffect(this.supervisionLevel, this.viewer)) return null;
      return reviewEffectKey(
        { review: this.review, isPublic: this.isPublic },
        this.supervisionLevel
      );
    },
    reason() {
      return this.review?.reason || null;
    },
    submittedAtLabel() {
      return this.timeLabel(this.review?.submittedAt);
    },
    decidedAtLabel() {
      return this.timeLabel(this.review?.decidedAt);
    },
  },
  methods: {
    timeLabel(value) {
      if (!value) return null;
      return new Date(value).toLocaleString("de-DE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    actionColor(action) {
      return ACTIONS_WITH_REASON.includes(action) ? "error" : "primary";
    },
    start(action) {
      if (!ACTIONS_WITH_REASON.includes(action)) {
        return this.run(action);
      }
      this.pendingAction = action;
      this.reasonInput = "";
      this.dialog = true;
    },
    async confirm() {
      await this.run(this.pendingAction, this.reasonInput);
      this.dialog = false;
    },
    async run(action, reason) {
      this.inProgress = true;
      this.errorKey = null;
      const target = [this.tenantId, this.offerType, this.offerId];
      try {
        const review = isSubmission(action)
          ? await ApiReviewService.submit(...target)
          : await ApiReviewService.decide(...target, { action, reason });
        this.$emit("update:review", review);
      } catch (error) {
        if (error?.response?.status === 409) {
          this.errorKey = "supervision.review.conflict";
          await this.catchUp(target);
        } else {
          this.errorKey = "supervision.review.failed";
        }
      } finally {
        this.inProgress = false;
      }
    },
    /** A 409 says the review moved under the viewer: show the server's state. */
    async catchUp(target) {
      try {
        this.$emit(
          "update:review",
          await ApiReviewService.getReview(...target)
        );
      } catch (error) {
        // The conflict text stands; the stale status stays until a reload.
      }
    },
  },
};
</script>
