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

    <BaseSection
      title="E-Mail-Inhalte (Text & Betreff pro E-Mail)"
      icon="mdi-text-box-edit-outline"
      hint="Pro Mail-Typ lassen sich der Betreff (Subject) und der Mail-Body individuell anpassen. Strukturelle Bestandteile wie Buchungsdetails, Buttons und Footer werden automatisch ergänzt."
      class="mt-6"
    >
      <SnippetList
        :mail-snippets="tenant.mailSnippets || {}"
        :mail-subjects="tenant.mailSubjects || {}"
        :layout-template="tenant.genericMailTemplate || ''"
        :tenant-name="tenant.name || ''"
        @update="updateMailOverrides"
      />
    </BaseSection>
  </v-form>
</template>

<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import debounce from "lodash/debounce";
import MailKonfiguration from "@/components/Tenant/MailKonfiguration.vue";
import SnippetList from "@/components/Mail/SnippetList.vue";

export default {
  name: "TenantEditEmail",
  components: { SnippetList, MailKonfiguration, BaseSection },
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
    updateMailOverrides({ mailSnippets, mailSubjects }) {
      this.model = {
        ...this.tenant,
        mailSnippets: mailSnippets || {},
        mailSubjects: mailSubjects || {},
      };
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
