<template>
  <PdfTemplateEditorDialog
    :open="open"
    template-type="receipt"
    :value="receiptTemplate"
    :tenant-id="tenantId"
    :pdf-booking-layout="pdfBookingLayout"
    :pdf-booking-table-meta="pdfBookingTableMeta"
    @close="$emit('close')"
    @submit="onSubmit"
  />
</template>

<script>
import PdfTemplateEditorDialog from "@/components/PDF/PdfTemplateEditorDialog.vue";
import { DEFAULT_PDF_BOOKING_LAYOUT } from "@/components/PDF/pdfBookingLayoutConstants.js";

export default {
  name: "ReceiptTemplateDialog",
  components: { PdfTemplateEditorDialog },
  props: {
    open: { type: Boolean, required: true },
    receiptTemplate: { type: String, default: "" },
    tenantId: { type: String, default: "" },
    pdfBookingLayout: { type: String, default: DEFAULT_PDF_BOOKING_LAYOUT },
    pdfBookingTableMeta: { type: Object, default: null },
  },
  methods: {
    onSubmit(value) {
      this.$emit("submit", value);
    },
  },
};
</script>
