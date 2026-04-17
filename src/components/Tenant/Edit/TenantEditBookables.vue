<template>
  <BaseSection title="Buchungsobjekte" icon="mdi-calendar-check">
    <SubSection
      title="Benutzerdefinierte Felder"
      icon="mdi-form-textbox"
      description="Felder, die auf Instanz-Ebene definiert wurden, können hier mit
          eigenen Werten überschrieben werden."
      no-margin
    >
      <template v-if="inheritedFields.length">
        <div class="text-subtitle-2 mb-2">Von der Instanz geerbte Felder</div>
        <CustomFieldList
          :fields="inheritedFields"
          description=""
          readonly
          hide-usage-options
          hide-override
        />
        <v-divider class="my-4" />
      </template>

      <div class="text-subtitle-2 mb-2">Mandanten-eigene Felder</div>
      <CustomFieldList
        :fields="tenant.bookableCustomFields || []"
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
    inheritedFields() {
      return this.instanceCustomFields.filter((f) => f.allowOverride);
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
