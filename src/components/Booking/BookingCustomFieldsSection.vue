<template>
  <BaseSection
    v-if="fields.length"
    title="Zusatzfelder"
    icon="mdi-form-textbox"
  >
    <div class="custom-fields-stack">
      <CustomFieldInput
        v-for="field in fields"
        :key="field.id"
        :field="field"
        :value="getValue(field.id)"
        :required="isRequired(field)"
        inline
        @input="onInput(field.id, $event)"
      />
    </div>
  </BaseSection>
</template>

<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import CustomFieldInput from "@/components/Booking/CustomFieldInput.vue";
import { isCheckoutRequiredField } from "@/utils/bookingCustomFields";

export default {
  name: "BookingCustomFieldsSection",
  components: { BaseSection, CustomFieldInput },
  props: {
    fields: { type: Array, default: () => [] },
    values: { type: Array, default: () => [] },
  },
  methods: {
    getValue(fieldId) {
      const entry = this.values.find((v) => v.fieldId === fieldId);
      return entry?.value ?? null;
    },
    onInput(fieldId, value) {
      this.$emit("update:values", { fieldId, value });
    },
    isRequired(field) {
      return isCheckoutRequiredField(field);
    },
  },
};
</script>

<style scoped>
.custom-fields-stack > * + * {
  margin-top: 4px;
}

.custom-fields-stack >>> .v-input--switch {
  margin-top: 0;
  padding-top: 4px;
}
</style>
