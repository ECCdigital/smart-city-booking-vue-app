<template>
  <PdfTemplateEditorDialog
    :open="open"
    template-type="invoice"
    :value="invoiceTemplate"
    :tenant-id="tenantId"
    :pdf-booking-layout="pdfBookingLayout"
    :pdf-booking-table-meta="pdfBookingTableMeta"
    @close="$emit('close')"
    @submit="onSubmit"
  />
</template>

<script>
import PdfTemplateEditorDialog from "@/components/PDF/PdfTemplateEditorDialog.vue";

export default {
  name: "InvoiceTemplateDialog",
  components: { PdfTemplateEditorDialog },
  props: {
    open: { type: Boolean, required: true },
    invoiceTemplate: { type: String, default: "" },
    tenantId: { type: String, default: "" },
    pdfBookingLayout: { type: String, default: "detailed" },
    pdfBookingTableMeta: { type: Object, default: null },
  },
  methods: {
    onSubmit(value) {
      this.$emit("submit", value);
    },
  },
};
</script>
