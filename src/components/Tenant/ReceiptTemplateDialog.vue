<template>
  <PdfTemplateEditorDialog
    :open="open"
    template-type="receipt"
    :value="receiptTemplate"
    @close="$emit('close')"
    @submit="onSubmit"
  />
</template>

<script>
import PdfTemplateEditorDialog from "@/components/PDF/PdfTemplateEditorDialog.vue";

export default {
  name: "ReceiptTemplateDialog",
  components: { PdfTemplateEditorDialog },
  props: {
    open: { type: Boolean, required: true },
    receiptTemplate: { type: String, default: "" },
  },
  methods: {
    onSubmit(value) {
      this.$emit("submit", value);
    },
  },
};
</script>
