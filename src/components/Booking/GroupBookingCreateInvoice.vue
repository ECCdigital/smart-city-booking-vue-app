<template>
  <GroupBookingAggregatedChoiceDialog
    :open="open"
    :booking-id="bookingId"
    :error="error"
    :in-progress="inProgress"
    title="Rechnung erstellen"
    question="Möchten Sie eine Sammel- oder Einzelrechnung erstellen?"
    :primary-label="primaryLabel"
    secondary-label="Einzelrechnung"
    @choose-primary="$emit('create-group-invoice')"
    @choose-secondary="$emit('create-single-invoice')"
    @close="$emit('close')"
  />
</template>

<script>
import GroupBookingAggregatedChoiceDialog from "@/components/Booking/GroupBookingAggregatedChoiceDialog.vue";

export default {
  name: "GroupBookingCreateInvoice",
  components: {
    GroupBookingAggregatedChoiceDialog,
  },
  props: {
    bookingId: {
      type: String,
      required: true,
    },
    open: {
      type: Boolean,
      required: true,
    },
    sendEmail: {
      type: Boolean,
      default: false,
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
  computed: {
    primaryLabel() {
      return this.sendEmail
        ? "Sammelrechnung erstellen & versenden"
        : "Sammelrechnung";
    },
  },
};
</script>
