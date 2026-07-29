<template>
  <v-form ref="form" v-model="valid">
    <BaseSection
      title="E-Mail Konfiguration"
      icon="mdi-email"
      :hint="
        model.useInstanceMail
          ? 'Es wird die Instanz-Konfiguration verwendet.'
          : ''
      "
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
      hint="Pro Mail-Typ lassen sich Betreff, Einleitung (vor den Buchungsdetails) und optional ein Abschluss (nach Buttons, QR und System-Footer) anpassen. Strukturelle Bestandteile wie Buchungsdetails, Buttons und Footer werden automatisch ergänzt."
      class="mt-6"
    >
      <v-switch
        :input-value="mailShowSupportFooter"
        color="primary"
        class="mt-0 mb-4"
        label="System-Footer mit Support-Kontakt anzeigen"
        hint="Blendet den automatischen Hinweis „Falls Sie Fragen haben … kontaktieren“ ein oder aus. In eigenen Texten kannst du supportEmail weiterhin als Variable nutzen."
        persistent-hint
        @change="onSupportFooterChange"
      />
      <SnippetList
        :mail-snippets="tenant.mailSnippets || {}"
        :mail-subjects="tenant.mailSubjects || {}"
        :default-mail-snippets="defaultMailSnippets"
        :layout-template="tenant.genericMailTemplate || ''"
        :tenant-name="tenant.name || ''"
        :show-support-footer="mailShowSupportFooter"
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
import ApiTenantService from "@/services/api/ApiTenantService";

export default {
  name: "TenantEditEmail",
  components: { SnippetList, MailKonfiguration, BaseSection },
  props: { tenant: Object },
  data: () => ({
    valid: false,
    defaultMailSnippets: {},
  }),
  created() {
    this._emitDebounced = debounce((val) => {
      this.$emit("update:tenant", { ...val });
    }, 200);
    this.fetchDefaultMailTemplates();
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
    mailShowSupportFooter() {
      return this.tenant.mailShowSupportFooter !== false;
    },
  },
  methods: {
    async fetchDefaultMailTemplates() {
      const tenantId = this.tenant && this.tenant.id;
      if (!tenantId) return;
      try {
        const data = await ApiTenantService.getDefaultMailTempaltes(tenantId);
        this.defaultMailSnippets = (data && data.mailSnippets) || {};
      } catch (e) {
        console.error("Standard-Mailvorlagen konnten nicht geladen werden", e);
      }
    },
    updateMailConfig(cfg) {
      this.model = { ...this.tenant, ...cfg };
    },
    onSupportFooterChange(value) {
      this.model = {
        ...this.tenant,
        mailShowSupportFooter: !!value,
      };
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
