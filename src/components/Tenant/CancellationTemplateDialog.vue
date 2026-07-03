<template>
  <PdfTemplateEditorDialog
    :open="open"
    template-type="cancellation"
    :value="cancellationTemplate"
    :tenant-id="tenantId"
    :pdf-booking-layout="pdfBookingLayout"
    @close="$emit('close')"
    @submit="onSubmit"
  />
</template>

<script>
import PdfTemplateEditorDialog from "@/components/PDF/PdfTemplateEditorDialog.vue";

export default {
  name: "CancellationTemplateDialog",
  components: { PdfTemplateEditorDialog },
  props: {
    open: { type: Boolean, required: true },
    cancellationTemplate: { type: String, default: "" },
    tenantId: { type: String, default: "" },
    pdfBookingLayout: { type: String, default: "detailed" },
  },
  methods: {
    onSubmit(value) {
      this.$emit("submit", value);
    },
  },
};
</script>
