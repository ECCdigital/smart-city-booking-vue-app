<template>
  <GroupBookingAggregatedChoiceDialog
    :open="open"
    :booking-id="bookingId"
    :error="error"
    :in-progress="inProgress"
    title="Buchungsbeleg erstellen"
    question="Möchten Sie für die gesamte Serie einen Buchungsbeleg erstellen?"
    primary-label="Sammelbeleg"
    secondary-label="Einzelbeleg"
    @choose-primary="$emit('create-group-booking-receipt')"
    @choose-secondary="$emit('create-single-booking-receipt')"
    @close="$emit('close')"
  />
</template>

<script>
import GroupBookingAggregatedChoiceDialog from "@/components/Booking/GroupBookingAggregatedChoiceDialog.vue";

export default {
  name: "GroupBookingCreateReceipt",
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
    inProgress: {
      type: Boolean,
      default: false,
    },
    error: {
      type: String,
      default: null,
    },
  },
};
</script>
