<template>
  <BaseSection title="Buchungsobjekte" icon="mdi-calendar-check">
    <SubSection
      title="Benutzerdefinierte Felder"
      icon="mdi-form-textbox"
      description="Definiere benutzerdefinierte Felder, die in allen
                   Buchungsobjekten verfügbar sind. Mandanten können die
                   Werte überschreiben, wenn erlaubt."
      no-margin
    >
      <CustomFieldList
        :fields="instance.bookableCustomFields || []"
        @update:fields="onFieldsChanged"
      />
    </SubSection>
  </BaseSection>
</template>

<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import SubSection from "@/components/commons/SubSection.vue";
import CustomFieldList from "@/components/CustomFields/CustomFieldList.vue";

export default {
  name: "InstanceEditBookables",
  components: { BaseSection, SubSection, CustomFieldList },
  props: {
    instance: { type: Object, required: true },
  },
  methods: {
    onFieldsChanged(fields) {
      this.$emit("update:instance", {
        ...this.instance,
        bookableCustomFields: fields,
      });
    },
    validate() {
      return true;
    },
    resetValidation() {},
  },
};
</script>
