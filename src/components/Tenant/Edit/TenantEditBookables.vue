<template>
  <v-form ref="form" @submit.prevent>
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

      <TenantEditCustomerUploads
        :tenant="tenant"
        class="mt-12"
        @update:tenant="$emit('update:tenant', $event)"
      />
    </BaseSection>
  </v-form>
</template>

<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import CustomFieldList from "@/components/CustomFields/CustomFieldList.vue";
import SubSection from "@/components/commons/SubSection.vue";
import TenantEditCustomerUploads from "@/components/Tenant/Edit/TenantEditCustomerUploads.vue";

export default {
  name: "TenantEditBookables",
  components: {
    SubSection,
    BaseSection,
    CustomFieldList,
    TenantEditCustomerUploads,
  },
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
      return this.$refs.form ? this.$refs.form.validate() : true;
    },
    resetValidation() {
      if (this.$refs.form) this.$refs.form.resetValidation();
    },
  },
};
</script>
