<template>
  <BaseSection title="Buchungsobjekte" icon="mdi-calendar-check">
    <SubSection
      title="Benutzerdefinierte Felder"
      icon="mdi-form-textbox"
      no-margin
    >
      <div class="text-subtitle-2 mb-2">Mandanten-eigene Felder</div>
      <CustomFieldList
        :fields="tenant.bookableCustomFields || []"
        :inherited-field-groups="instanceInheritedGroups"
        own-fields-label="Eigene Felder auf Mandanten-Ebene"
        description="Zusätzliche Felder, die nur für diesen Mandanten gelten."
        hide-override
        @update:fields="onFieldsChanged"
      />
    </SubSection>
  </BaseSection>
</template>

<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import CustomFieldList from "@/components/CustomFields/CustomFieldList.vue";
import SubSection from "@/components/commons/SubSection.vue";

export default {
  name: "TenantEditBookables",
  components: { SubSection, BaseSection, CustomFieldList },
  props: {
    tenant: { type: Object, required: true },
    instanceCustomFields: { type: Array, default: () => [] },
  },
  computed: {
    instanceInheritedGroups() {
      if (!this.instanceCustomFields.length) return [];

      return [
        {
          originLabel: "Instanz",
          originIcon: "mdi-home-outline",
          fields: this.instanceCustomFields,
        },
      ];
    },
  },
  methods: {
    onFieldsChanged(fields) {
      this.$emit("update:tenant", {
        ...this.tenant,
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
