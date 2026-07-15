<template>
  <v-dialog v-model="openDialog" persistent max-width="800px">
    <v-card color="accent">
      <v-form ref="form" v-model="valid" @submit.prevent="onReject">
        <v-card-title>
          <v-icon class="mr-2" color="error">mdi-alert</v-icon>
          <span class="text-h5">Buchung stornieren</span>
        </v-card-title>
        <v-card-text>
          <span class="text-h6">
            Die Buchung
            <strong>{{ toReject.id }}</strong> ist Teil einer Serienbuchung.
          </span>
          <v-radio-group v-model="cancellationScope" class="mt-4">
            <v-radio
              value="group"
              :label="$t('booking.cancellationRefund.cancelGroup')"
            />
            <v-radio
              value="single"
              :label="$t('booking.cancellationRefund.cancelSingle')"
            />
          </v-radio-group>
        </v-card-text>
        <v-card-text v-if="error" class="text-center">
          <v-alert type="error" border="left" elevation="2">
            {{ error }}
          </v-alert>
        </v-card-text>
        <v-card-text>
          <v-textarea
            outlined
            v-model="rejectReason"
            label="Begründung der Stornierung"
            placeholder="Aus welchem Grund wird die Stornierung durchgeführt?"
            :rules="[
              (value) => !!value?.trim() || 'Begründung ist erforderlich',
            ]"
            rows="2"
          ></v-textarea>
          <v-checkbox
            v-model="skipCancellation"
            label="Kein Stornobeleg erstellen"
          ></v-checkbox>
          <CancellationRefundPreview
            v-if="!skipCancellation"
            :preview="refundPreview"
            :loading="previewLoading"
            :error="previewError"
            @update:refund-percentage="refundPercentage = $event"
            @update:valid="refundValid = $event"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="primary"
            :loading="inProgress || previewLoading"
            :disabled="!canSubmit"
            type="submit"
          >
            {{
              cancellationScope === "group"
                ? $t("booking.cancellationRefund.cancelGroup")
                : $t("booking.cancellationRefund.cancelSingle")
            }}
          </v-btn>
          <v-btn outlined @click="closeDialog">Abbrechen</v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>
</template>

<script>
import ApiBookingService from "@/services/api/ApiBookingService";
import ApiGroupBookingService from "@/services/api/ApiGroupBookingService";
import CancellationRefundPreview from "@/components/Booking/CancellationRefundPreview.vue";
import { getApiErrorMessage } from "@/services/api/apiErrorMessage";

export default {
  name: "GroupBookingRejectConformationDialog",
  components: { CancellationRefundPreview },
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    toReject: {
      type: Object,
      required: true,
    },
    groupBookingId: {
      type: String,
      default: null,
    },
    inProgress: {
      type: Boolean,
      default: false,
    },
    error: {
      type: String,
      default: null,
    },
  },

  data() {
    return {
      rejectReason: null,
      skipCancellation: false,
      cancellationScope: "group",
      valid: false,
      refundPreview: null,
      previewLoading: false,
      previewError: null,
      refundPercentage: undefined,
      refundValid: true,
    };
  },
  computed: {
    openDialog: {
      get() {
        return this.open;
      },
    },
    canSubmit() {
      return (
        this.valid &&
        !this.previewLoading &&
        (this.skipCancellation ||
          (!!this.refundPreview && !this.previewError && this.refundValid))
      );
    },
  },
  watch: {
    open(value) {
      if (value) {
        this.loadRefundPreview();
      } else {
        this.resetDialog();
      }
    },
    cancellationScope() {
      if (this.open && !this.skipCancellation) {
        this.loadRefundPreview();
      }
    },
    skipCancellation(value) {
      if (!value && this.open) {
        this.loadRefundPreview();
      }
      if (value) {
        this.refundPercentage = undefined;
      }
    },
    groupBookingId(value, oldValue) {
      if (this.open && value && value !== oldValue) {
        this.loadRefundPreview();
      }
    },
    "toReject.id"(value, oldValue) {
      if (this.open && value && value !== oldValue) {
        this.loadRefundPreview();
      }
    },
  },
  methods: {
    closeDialog() {
      this.resetDialog();
      this.$emit("close");
    },
    resetDialog() {
      this.rejectReason = null;
      this.skipCancellation = false;
      this.cancellationScope = "group";
      this.refundPreview = null;
      this.previewLoading = false;
      this.previewError = null;
      this.refundPercentage = undefined;
      this.refundValid = true;
      this.$nextTick(() => this.$refs.form?.resetValidation());
    },
    async loadRefundPreview() {
      if (this.skipCancellation || !this.toReject?.id) return;
      if (this.cancellationScope === "group" && !this.groupBookingId) return;
      this.previewLoading = true;
      this.previewError = null;
      this.refundPreview = null;
      try {
        if (this.cancellationScope === "group") {
          this.refundPreview =
            await ApiGroupBookingService.getCancellationRefundPreview(
              null,
              this.groupBookingId
            );
        } else {
          this.refundPreview =
            await ApiBookingService.getCancellationRefundPreview(
              this.toReject.id
            );
        }
      } catch (error) {
        this.previewError = getApiErrorMessage(
          error,
          this.$t("booking.cancellationRefund.previewError")
        );
      } finally {
        this.previewLoading = false;
      }
    },
    async onReject() {
      if (!this.canSubmit) return;
      const refundPercentage = this.skipCancellation
        ? undefined
        : this.refundPercentage;
      if (this.cancellationScope === "group") {
        this.$emit(
          "reject-group-booking",
          this.toReject.id,
          this.rejectReason,
          this.skipCancellation,
          refundPercentage
        );
        return;
      }
      this.$emit(
        "reject-single-booking",
        this.toReject.id,
        this.rejectReason,
        this.skipCancellation,
        undefined,
        refundPercentage
      );
    },
  },
};
</script>

<style scoped></style>
