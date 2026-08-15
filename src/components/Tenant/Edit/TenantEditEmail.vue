<template>
  <v-form ref="form" v-model="valid">
    <BaseSection
      title="Versand"
      icon="mdi-send"
      :hint="
        model.useInstanceMail
          ? 'Es wird die Instanz-Konfiguration für Absender und Versandmethode verwendet.'
          : 'Absenderkonto und Versandmethode (SMTP oder Graph API).'
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
        :show-template="false"
        @update="updateMailConfig"
      />
    </BaseSection>

    <BaseSection
      title="E-Mail-Layout"
      icon="mdi-palette-outline"
      hint="Äußeres Erscheinungsbild aller Mails (Logo, Farben, Header und Footer)."
      class="mt-6"
    >
      <MailTemplateStatus
        :mail-template="tenant.genericMailTemplate || ''"
        @submit="onSubmitLayoutTemplate"
      />
    </BaseSection>

    <BaseSection
      title="E-Mail-Inhalte (Text & Betreff pro E-Mail)"
      icon="mdi-text-box-edit-outline"
      hint="Pro Mail-Typ lassen sich Betreff, Einleitung (vor den Buchungsdetails) und optional ein Abschluss (nach Buttons, QR und System-Footer) anpassen. Strukturelle Bestandteile wie Buchungsdetails, Buttons und Footer werden automatisch ergänzt."
      class="mt-6"
    >
      <SnippetList
        :mail-snippets="tenant.mailSnippets || {}"
        :mail-subjects="tenant.mailSubjects || {}"
        :default-mail-snippets="defaultMailSnippets"
        :layout-template="tenant.genericMailTemplate || ''"
        :tenant-name="tenant.name || ''"
        :show-support-footer="mailShowSupportFooter"
        :booking-period-format="mailBookingPeriodFormat"
        @update="updateMailOverrides"
      />

      <v-expansion-panels flat class="mt-4">
        <v-expansion-panel>
          <v-expansion-panel-header class="px-0 subtitle-2">
            Erweitert
          </v-expansion-panel-header>
          <v-expansion-panel-content>
            <v-select
              :value="mailBookingPeriodFormat"
              :items="bookingPeriodFormatItems"
              item-text="text"
              item-value="value"
              label="Datumsformat des Buchungszeitraums in E-Mails"
              hint="Betrifft nur den automatisch erzeugten Zeitraum in den Buchungsdetails, nicht manuelle Snippet-Texte."
              persistent-hint
              dense
              filled
              background-color="accent"
              class="mb-4"
              @change="onBookingPeriodFormatChange"
            />
            <v-switch
              :input-value="mailShowSupportFooter"
              color="primary"
              class="mt-0"
              label="System-Footer mit Support-Kontakt anzeigen"
              hint="Blendet den automatischen Hinweis „Falls Sie Fragen haben … kontaktieren“ ein oder aus. In eigenen Texten kannst du supportEmail weiterhin als Variable nutzen."
              persistent-hint
              @change="onSupportFooterChange"
            />
          </v-expansion-panel-content>
        </v-expansion-panel>
      </v-expansion-panels>
    </BaseSection>
  </v-form>
</template>

<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import debounce from "lodash/debounce";
import MailKonfiguration from "@/components/Tenant/MailKonfiguration.vue";
import MailTemplateStatus from "@/components/Tenant/MailTemplateStatus.vue";
import SnippetList from "@/components/Mail/SnippetList.vue";
import ApiTenantService from "@/services/api/ApiTenantService";

const BOOKING_PERIOD_FORMATS = [
  "default",
  "fromTo",
  "timeFirst",
  "long",
  "compact",
];

export default {
  name: "TenantEditEmail",
  components: {
    SnippetList,
    MailKonfiguration,
    MailTemplateStatus,
    BaseSection,
  },
  props: { tenant: Object },
  data: () => ({
    valid: false,
    defaultMailSnippets: {},
    bookingPeriodFormatItems: [
      {
        value: "default",
        text: "Standard — 09.07.2026, 05:15 - 09.07.2026, 08:00",
      },
      {
        value: "fromTo",
        text: "Von–bis — von 05:15 Uhr am 09.07.2026 bis 08:00 Uhr am 09.07.2026",
      },
      {
        value: "timeFirst",
        text: "Uhrzeit zuerst — 05:15 Uhr, 09.07.2026 - 08:00 Uhr, 09.07.2026",
      },
      {
        value: "long",
        text: "Lang — Donnerstag, 9. Juli 2026, 05:15 Uhr - …",
      },
      {
        value: "compact",
        text: "Kompakt — 09.07.26, 05:15 - 09.07.26, 08:00",
      },
    ],
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
    mailBookingPeriodFormat() {
      const value = this.tenant.mailBookingPeriodFormat;
      return BOOKING_PERIOD_FORMATS.includes(value) ? value : "default";
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
    onSubmitLayoutTemplate(newTemplate) {
      this.model = {
        ...this.tenant,
        genericMailTemplate: newTemplate,
      };
    },
    onSupportFooterChange(value) {
      this.model = {
        ...this.tenant,
        mailShowSupportFooter: !!value,
      };
    },
    onBookingPeriodFormatChange(value) {
      this.model = {
        ...this.tenant,
        mailBookingPeriodFormat: BOOKING_PERIOD_FORMATS.includes(value)
          ? value
          : "default",
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
