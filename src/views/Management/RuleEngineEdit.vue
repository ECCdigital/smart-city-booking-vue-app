<template>
  <AdminLayout>
    <div class="page-content">
      <div class="d-flex align-center mb-4">
        <v-btn icon class="mr-2" :to="{ name: 'rules' }">
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>
        <span class="text-body-2 grey--text">Zurück zur Übersicht</span>
      </div>

      <v-progress-linear v-if="loading" indeterminate color="primary" />

      <v-alert
        v-if="meta.engineEnabled === false"
        type="warning"
        text
        border="left"
        colored-border
        class="mb-4 text-body-2"
      >
        Die automatische Ausführung ist auf dem Server deaktiviert
        (<code>RULE_ENGINE_ENABLED=false</code>). Regeln werden nicht nach
        Zeitplan ausgeführt – Speichern und manuelles Testen funktionieren
        trotzdem.
      </v-alert>

      <v-alert
        v-if="formErrors.length"
        type="error"
        text
        border="left"
        colored-border
        class="mb-4"
      >
        <ul class="mb-0">
          <li v-for="(err, i) in formErrors" :key="i">{{ err }}</li>
        </ul>
      </v-alert>

      <v-form v-if="!loading" ref="form" v-model="valid">
        <BaseSection title="Allgemein" icon="mdi-cog">
          <v-text-field
            v-model="rule.name"
            label="Name *"
            :rules="[(v) => !!v || 'Name ist erforderlich']"
            outlined
            dense
          />
          <v-textarea
            v-model="rule.description"
            label="Beschreibung"
            rows="2"
            auto-grow
            outlined
            dense
          />
          <v-switch
            v-model="rule.enabled"
            color="primary"
            label="Regel aktiv (wird eingeplant)"
            hide-details
          />
        </BaseSection>

        <BaseSection
          title="Zeitplan & Ressource"
          icon="mdi-clock-outline"
          hint="Wählen Sie eine Häufigkeit – sie wird automatisch in einen Cron-Ausdruck umgewandelt."
        >
          <div class="mb-4">
            <div class="text-subtitle-2 mb-2">Zeitplan *</div>
            <RuleScheduleBuilder
              ref="scheduleBuilder"
              v-model="rule.schedule"
            />
          </div>

          <v-divider class="my-4" />

          <v-select
            v-model="rule.resource"
            :items="resourceItems"
            label="Ressource *"
            :rules="[(v) => !!v || 'Ressource ist erforderlich']"
            outlined
            dense
            @change="onResourceChange"
          />
        </BaseSection>

        <BaseSection
          title="Filter (query)"
          icon="mdi-filter-variant"
          hint="Schränkt ein, welche Dokumente geladen werden."
        >
          <RuleQueryBuilder
            ref="queryBuilder"
            v-model="rule.query"
            :fields="resourceFields"
            :query-operators="meta.queryOperators"
            :placeholders="meta.placeholders"
          />
        </BaseSection>

        <BaseSection
          title="Bedingungen (conditions)"
          icon="mdi-check-decagram"
          hint="Jedes geladene Dokument wird gegen diese Bedingungen geprüft."
        >
          <RuleConditionBuilder
            ref="conditionBuilder"
            v-model="rule.conditions"
            :fields="conditionFields"
            :condition-operators="meta.conditionOperators"
          />
        </BaseSection>

        <BaseSection title="Aktionen" icon="mdi-flash">
          <RuleActionsEditor
            ref="actionsEditor"
            v-model="rule.actions"
            :action-defs="meta.actions"
            :allowed-actions="meta.allowedActions"
          />
        </BaseSection>

        <div class="d-flex flex-wrap mt-4">
          <v-spacer />
          <v-btn outlined class="mr-2 mb-2" :to="{ name: 'rules' }">
            Abbrechen
          </v-btn>
          <v-btn color="primary" class="mb-2" :loading="saving" @click="onSave">
            <v-icon left>mdi-content-save</v-icon>
            Speichern
          </v-btn>
        </div>
      </v-form>
    </div>
  </AdminLayout>
</template>

<script>
import AdminLayout from "@/layouts/Admin.vue";
import { mapActions } from "vuex";
import BaseSection from "@/components/commons/BaseSection.vue";
import ApiRuleEngineService from "@/services/api/ApiRuleEngineService";
import RuleActionsEditor from "@/components/Instance/RuleEngine/RuleActionsEditor.vue";
import RuleQueryBuilder from "@/components/Instance/RuleEngine/RuleQueryBuilder.vue";
import RuleConditionBuilder from "@/components/Instance/RuleEngine/RuleConditionBuilder.vue";
import RuleScheduleBuilder from "@/components/Instance/RuleEngine/RuleScheduleBuilder.vue";

export default {
  name: "RuleEngineEdit",
  components: {
    AdminLayout,
    BaseSection,
    RuleActionsEditor,
    RuleQueryBuilder,
    RuleConditionBuilder,
    RuleScheduleBuilder,
  },
  data() {
    return {
      loading: false,
      saving: false,
      testing: false,
      valid: true,
      meta: {
        engineEnabled: null,
        allowedResources: [],
        allowedActions: [],
        resources: [],
        actions: [],
        conditionOperators: [],
        queryOperators: [],
        computedFacts: [],
        placeholders: [],
      },
      rule: {
        name: "",
        description: "",
        enabled: true,
        schedule: "",
        resource: "",
        query: null,
        conditions: null,
        actions: [],
      },
      formErrors: [],
    };
  },
  computed: {
    ruleId() {
      return this.$route.params.id;
    },
    isEdit() {
      return !!this.ruleId;
    },
    resourceItems() {
      if (this.meta.resources && this.meta.resources.length) {
        return this.meta.resources.map((r) => ({
          text: r.label || r.name,
          value: r.name,
        }));
      }
      return (this.meta.allowedResources || []).map((r) => ({
        text: r,
        value: r,
      }));
    },
    resourceFields() {
      const res = (this.meta.resources || []).find(
        (r) => r.name === this.rule.resource
      );
      return res && res.fields ? res.fields : [];
    },
    conditionFields() {
      const facts = (this.meta.computedFacts || []).map((f) => ({
        name: f.name,
        label: f.label ? `${f.label} (berechnet)` : f.name,
        type: f.type || "string",
      }));
      return [...this.resourceFields, ...facts];
    },
  },
  methods: {
    ...mapActions({
      addToast: "toasts/add",
    }),
    extractError(error, fallback) {
      return error?.response?.data?.message || fallback;
    },
    async fetchMeta() {
      try {
        const data = await ApiRuleEngineService.getMeta();
        this.meta = { ...this.meta, ...data };
      } catch (error) {
        await this.addToast({
          message: this.extractError(
            error,
            "Metadaten konnten nicht geladen werden"
          ),
          type: "error",
        });
      }
    },
    async fetchRule() {
      if (!this.isEdit) {
        this.rule.resource = this.resourceItems.length
          ? this.resourceItems[0].value
          : "";
        return;
      }
      this.loading = true;
      try {
        const data = await ApiRuleEngineService.getRule(this.ruleId);
        this.rule = {
          name: data.name || "",
          description: data.description || "",
          enabled: data.enabled !== false,
          schedule: data.schedule || "",
          resource: data.resource || "",
          query: data.query || null,
          conditions: data.conditions || null,
          actions: data.actions || [],
        };
      } catch (error) {
        await this.addToast({
          message: this.extractError(
            error,
            "Regel konnte nicht geladen werden"
          ),
          type: "error",
        });
        this.$router.push({ name: "rules" });
      } finally {
        this.loading = false;
      }
    },
    onResourceChange() {
      this.rule.query = null;
      this.rule.conditions = null;
    },
    validateForm() {
      this.formErrors = [];
      const formOk = this.$refs.form.validate();
      const scheduleOk = !!(this.rule.schedule && this.rule.schedule.trim());
      if (!scheduleOk) {
        this.formErrors.push(
          "Bitte einen Zeitplan wählen bzw. einen gültigen Cron-Ausdruck eingeben."
        );
      }
      const queryOk = this.$refs.queryBuilder
        ? this.$refs.queryBuilder.isValid()
        : true;
      const conditionsOk = this.$refs.conditionBuilder
        ? this.$refs.conditionBuilder.isValid()
        : true;
      const actionsOk = this.$refs.actionsEditor
        ? this.$refs.actionsEditor.isValid()
        : true;
      if (!queryOk)
        this.formErrors.push("Der Filter (query) enthält ungültiges JSON.");
      if (!conditionsOk)
        this.formErrors.push("Die Bedingungen enthalten ungültiges JSON.");
      if (!actionsOk)
        this.formErrors.push(
          "Bitte alle Pflichtfelder der Aktionen ausfüllen (bzw. ungültiges JSON korrigieren)."
        );
      return formOk && scheduleOk && queryOk && conditionsOk && actionsOk;
    },
    async onSave() {
      if (!this.validateForm()) return;
      this.saving = true;
      this.formErrors = [];
      try {
        const payload = { ...this.rule };
        if (this.isEdit) {
          await ApiRuleEngineService.updateRule(this.ruleId, payload);
        } else {
          await ApiRuleEngineService.createRule(payload);
        }
        await this.addToast({
          message: this.isEdit ? "Regel aktualisiert" : "Regel angelegt",
          type: "success",
        });
        this.$router.push({ name: "rules" });
      } catch (error) {
        const data = error?.response?.data;
        if (data?.errors?.length) {
          this.formErrors = data.errors;
        } else {
          this.formErrors = [
            this.extractError(error, "Regel konnte nicht gespeichert werden"),
          ];
        }
      } finally {
        this.saving = false;
      }
    },
    async onTest() {
      this.testing = true;
      try {
        const log = await ApiRuleEngineService.dryRunRule(this.ruleId);
        await this.addToast({
          message: `Test abgeschlossen: ${log.matchedCount} Treffer (keine Aktionen ausgeführt)`,
          type: "info",
        });
      } catch (error) {
        await this.addToast({
          message: this.extractError(error, "Test fehlgeschlagen"),
          type: "error",
        });
      } finally {
        this.testing = false;
      }
    },
  },
  async created() {
    await this.fetchMeta();
    await this.fetchRule();
  },
};
</script>

<style scoped></style>
