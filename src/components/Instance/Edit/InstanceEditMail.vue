<template>
  <BaseSection title="E-Mail Konfiguration" icon="mdi-email">
    <v-text-field
      background-color="accent"
      filled
      dense
      label="Empfangs-E-Mail"
      v-model="local.mailAddress"
      @input="emitUpdate"
    />

    <v-switch
      v-model="local.mailEnabled"
      color="primary"
      label="E-Mail aktivieren"
      class="mt-2"
      persistent-hint
      hint="E-Mails können nur versendet werden, wenn diese Option aktiviert ist."
      @change="emitUpdate"
    />

    <MailKonfiguration
      class="mt-4"
      v-if="local.mailEnabled"
      :mail-config="mailConfig"
      @update="onMailConfigUpdate"
    />
  </BaseSection>
</template>

<script>
import MailKonfiguration from "@/components/Tenant/MailKonfiguration.vue";
import BaseSection from "@/components/commons/BaseSection.vue";
export default {
  name: "InstanceEditMail",
  components: { BaseSection, MailKonfiguration },
  props: {
    instance: { type: Object, required: true },
  },
  data() {
    return { local: { ...this.instance } };
  },
  watch: {
    instance: {
      handler(n) {
        this.local = { ...n };
      },
      deep: true,
    },
  },
  computed: {
    mailConfig() {
      return {
        genericMailTemplate: this.local.mailTemplate,
        noreplyMail: this.local.noreplyMail,
        noreplyDisplayName: this.local.noreplyDisplayName,
        noreplyHost: this.local.noreplyHost,
        noreplyPort: this.local.noreplyPort,
        noreplyUser: this.local.noreplyUser,
        noreplyPassword: this.local.noreplyPassword,
        noreplyUseGraphApi: this.local.noreplyUseGraphApi,
        noreplyStarttls: this.local.noreplyStarttls,
        noreplyGraphTenantId: this.local.noreplyGraphTenantId,
        noreplyGraphClientId: this.local.noreplyGraphClientId,
        noreplyGraphClientSecret: this.local.noreplyGraphClientSecret,
      };
    },
  },
  methods: {
    emitUpdate() {
      this.$emit("update:instance", { ...this.local });
    },
    onMailConfigUpdate(cfg) {
      Object.assign(this.local, {
        noreplyDisplayName: cfg.noreplyDisplayName,
        noreplyMail: cfg.noreplyMail,
        noreplyHost: cfg.noreplyHost,
        noreplyPort: cfg.noreplyPort,
        noreplyUser: cfg.noreplyUser,
        noreplyPassword: cfg.noreplyPassword,
        noreplyUseGraphApi: cfg.noreplyUseGraphApi,
        noreplyStarttls: cfg.noreplyStarttls,
        noreplyGraphTenantId: cfg.noreplyGraphTenantId,
        noreplyGraphClientId: cfg.noreplyGraphClientId,
        noreplyGraphClientSecret: cfg.noreplyGraphClientSecret,
      });
      this.emitUpdate();
    },
    validate() {
      return true;
    },
    resetValidation() {},
  },
};
</script>

<style scoped></style>
