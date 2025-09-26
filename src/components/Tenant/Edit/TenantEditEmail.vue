<template>
  <v-form ref="form" v-model="valid">
    <BaseSection
      title="E-Mail Konfiguration"
      icon="mdi-email"
      :hint="model.useInstanceMail ? 'Es wird die Instanz-Konfiguration verwendet.' : ''"
    >
      <v-switch
        v-model="model.useInstanceMail"
        color="primary"
        label="Instanz E-Mail-Konfiguration verwenden"
        class="mt-2"
      />
      <MailKonfiguration
        :mail-config="tenantMailConfig"
        :disabled="model.useInstanceMail"
        :show-validation="!model.useInstanceMail"
        @update="updateMailConfig"
      />
    </BaseSection>
  </v-form>
</template>

<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import debounce from "lodash/debounce";
import MailKonfiguration from "@/components/Tenant/MailKonfiguration.vue";

export default {
  name: "TenantEditEmail",
  components: { MailKonfiguration, BaseSection },
  props: { tenant: Object },
  data: () => ({ valid: false }),
  created() {
    this._emitDebounced = debounce((val) => {
      this.$emit("update:tenant", { ...val });
    }, 200);
  },
  computed: {
    model: {
      get() {
        return this.tenant;
      },
      set(v) {
        this._emitDebounced(v);
      },
    },
    tenantMailConfig() {
      const t = this.tenant;
      return {
        genericMailTemplate: t.genericMailTemplate,
        noreplyMail: t.noreplyMail,
        noreplyDisplayName: t.noreplyDisplayName,
        noreplyHost: t.noreplyHost,
        noreplyPort: t.noreplyPort,
        noreplyUser: t.noreplyUser,
        noreplyPassword: t.noreplyPassword,
        noreplyUseGraphApi: t.noreplyUseGraphApi,
        noreplyStarttls: t.noreplyStarttls,
        noreplyGraphTenantId: t.noreplyGraphTenantId,
        noreplyGraphClientId: t.noreplyGraphClientId,
        noreplyGraphClientSecret: t.noreplyGraphClientSecret,
      };
    },
  },
  methods: {
    updateMailConfig(cfg) {
      this.model = { ...this.tenant, ...cfg };
    },
    async validate() {
      return this.$refs.form ? this.$refs.form.validate() : true;
    },
    resetValidation() {
      this.$refs.form?.resetValidation();
    },
  },
};
</script>
