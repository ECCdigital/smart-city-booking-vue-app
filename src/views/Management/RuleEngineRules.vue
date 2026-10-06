<template>
  <AdminLayout>
    <!-- Room beneath the last rule for the floating button. -->
    <div class="page-content mb-16">
      <!-- The search band (SearchBar), the history in the row beneath it. -->
      <SearchBar v-model="search" :fields="$t('rule.list.search')">
        <template #actions>
          <ToolbarRow>
            <template #actions>
              <ToolbarAction
                icon="mdi-history"
                :to="{ name: 'rule-executions' }"
              >
                Historie
              </ToolbarAction>
            </template>
          </ToolbarRow>
        </template>
      </SearchBar>

      <v-alert
        v-if="engineEnabled === false"
        type="warning"
        text
        border="left"
        colored-border
        class="mb-4 text-body-2"
      >
        Die automatische Ausführung ist auf dem Server deaktiviert
        (<code>RULE_ENGINE_ENABLED=false</code>). Regeln werden derzeit
        <strong>nicht</strong> nach Zeitplan ausgeführt. Testen ist weiterhin möglich.
      </v-alert>

      <v-alert
        v-else
        type="info"
        text
        border="left"
        colored-border
        class="mb-4 text-body-2"
      >
        Regeln führen zeitgesteuerte Aktionen (Cronjobs) gegen Datenobjekte aus.
      </v-alert>

      <v-progress-linear v-if="loading" indeterminate color="primary" />

      <v-data-table
        :headers="headers"
        :items="filteredRules"
        :items-per-page="10"
        class="elevation-1"
        item-key="_id"
      >
        <template v-slot:[`item.enabled`]="{ item }">
          <v-switch
            :input-value="item.enabled"
            color="primary"
            hide-details
            dense
            :loading="togglingId === item._id"
            class="mt-0 pt-0"
            @change="onToggleEnabled(item)"
          />
        </template>

        <template v-slot:[`item.name`]="{ item }">
          <div class="font-weight-medium">{{ item.name }}</div>
          <div v-if="item.description" class="text-caption grey--text">
            {{ item.description }}
          </div>
        </template>

        <template v-slot:[`item.schedule`]="{ item }">
          <code>{{ item.schedule }}</code>
        </template>

        <template v-slot:[`item.lastRunStatus`]="{ item }">
          <RuleStatusBadge :status="item.lastRunStatus" />
        </template>

        <template v-slot:[`item.lastRunAt`]="{ item }">
          {{ formatDate(item.lastRunAt) }}
        </template>

        <template v-slot:[`item.actions`]="{ item }">
          <v-menu offset-y>
            <template v-slot:activator="{ on, attrs }">
              <v-btn icon v-bind="attrs" v-on="on" small>
                <v-icon small>mdi-dots-vertical</v-icon>
              </v-btn>
            </template>
            <v-list dense>
              <v-list-item
                link
                :to="{ name: 'rule-edit', params: { id: item._id } }"
              >
                <v-list-item-icon
                  ><v-icon small>mdi-pencil</v-icon></v-list-item-icon
                >
                <v-list-item-title>Bearbeiten</v-list-item-title>
              </v-list-item>
              <v-list-item link @click="onRun(item)">
                <v-list-item-icon
                  ><v-icon small>mdi-play</v-icon></v-list-item-icon
                >
                <v-list-item-title>Jetzt ausführen</v-list-item-title>
              </v-list-item>
              <v-list-item link @click="onDryRun(item)">
                <v-list-item-icon
                  ><v-icon small>mdi-test-tube</v-icon></v-list-item-icon
                >
                <v-list-item-title>Test (Dry-Run)</v-list-item-title>
              </v-list-item>
              <v-list-item
                link
                :disabled="duplicatingId === item._id"
                @click="onDuplicate(item)"
              >
                <v-list-item-icon
                  ><v-icon small>mdi-content-copy</v-icon></v-list-item-icon
                >
                <v-list-item-title>Kopieren</v-list-item-title>
              </v-list-item>
              <v-list-item
                link
                :to="{ name: 'rule-executions', query: { ruleId: item._id } }"
              >
                <v-list-item-icon
                  ><v-icon small>mdi-history</v-icon></v-list-item-icon
                >
                <v-list-item-title>Historie</v-list-item-title>
              </v-list-item>
              <v-divider />
              <v-list-item link @click="onOpenDelete(item)">
                <v-list-item-icon
                  ><v-icon small color="red"
                    >mdi-delete</v-icon
                  ></v-list-item-icon
                >
                <v-list-item-title>Löschen</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </template>

        <template v-slot:no-data>
          <div class="text-center py-8 grey--text">
            <v-icon size="48" color="grey lighten-2"
              >mdi-cog-off-outline</v-icon
            >
            <div>Keine Regeln vorhanden</div>
          </div>
        </template>
      </v-data-table>
    </div>

    <!-- The creation floats bottom right, as it does on every main page. -->
    <v-btn
      color="primary"
      fixed
      large
      bottom
      right
      rounded
      :to="{ name: 'rule-create' }"
      data-test="open-create"
    >
      <v-icon>mdi-plus</v-icon>Regel anlegen
    </v-btn>

    <RuleDeleteDialog
      :open="deleteDialog"
      :to-delete="selectedRule"
      :in-progress="deleting"
      @confirm="onConfirmDelete"
      @close="deleteDialog = false"
    />
  </AdminLayout>
</template>

<script>
import AdminLayout from "@/layouts/Admin.vue";
import { mapActions } from "vuex";
import Fuse from "fuse.js";
import ApiRuleEngineService from "@/services/api/ApiRuleEngineService";
import RuleStatusBadge from "@/components/Instance/RuleEngine/RuleStatusBadge.vue";
import RuleDeleteDialog from "@/components/Instance/RuleEngine/RuleDeleteDialog.vue";
import SearchBar from "@/components/commons/SearchBar.vue";
import ToolbarRow from "@/components/commons/ToolbarRow.vue";
import ToolbarAction from "@/components/commons/ToolbarAction.vue";

export default {
  name: "RuleEngineRules",
  components: {
    AdminLayout,
    RuleStatusBadge,
    RuleDeleteDialog,
    SearchBar,
    ToolbarRow,
    ToolbarAction,
  },
  data() {
    return {
      rules: [],
      engineEnabled: null,
      loading: false,
      search: "",
      togglingId: null,
      duplicatingId: null,
      deleteDialog: false,
      deleting: false,
      selectedRule: {},
      headers: [
        { text: "Aktiv", value: "enabled", sortable: false, width: 90 },
        { text: "Name", value: "name" },
        { text: "Zeitplan", value: "schedule" },
        { text: "Ressource", value: "resource" },
        { text: "Letzter Status", value: "lastRunStatus" },
        { text: "Letzter Lauf", value: "lastRunAt" },
        { text: "", value: "actions", sortable: false, width: 60 },
      ],
    };
  },
  computed: {
    filteredRules() {
      if (!this.search) return this.rules;
      const fuse = new Fuse(this.rules, {
        keys: ["name", "description", "resource"],
        threshold: 0.4,
        ignoreLocation: true,
      });
      return fuse.search(this.search).map((result) => result.item);
    },
  },
  methods: {
    ...mapActions({
      addToast: "toasts/add",
    }),
    formatDate(value) {
      if (!value) return "—";
      return Intl.DateTimeFormat("de-DE", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(value));
    },
    extractError(error, fallback) {
      return error?.response?.data?.message || fallback;
    },
    async fetchMeta() {
      try {
        const meta = await ApiRuleEngineService.getMeta();
        this.engineEnabled = meta.engineEnabled;
      } catch (error) {
        // Banner ist nur ein Hinweis; Fehler hier ignorieren
      }
    },
    async fetchRules() {
      this.loading = true;
      try {
        this.rules = await ApiRuleEngineService.getRules();
      } catch (error) {
        await this.addToast({
          message: this.extractError(error, "Fehler beim Laden der Regeln"),
          type: "error",
        });
      } finally {
        this.loading = false;
      }
    },
    async onToggleEnabled(rule) {
      this.togglingId = rule._id;
      try {
        const updated = await ApiRuleEngineService.setEnabled(
          rule._id,
          !rule.enabled
        );
        const idx = this.rules.findIndex((r) => r._id === rule._id);
        if (idx !== -1) this.$set(this.rules, idx, updated);
        await this.addToast({
          message: updated.enabled ? "Regel aktiviert" : "Regel deaktiviert",
          type: "success",
        });
      } catch (error) {
        await this.addToast({
          message: this.extractError(
            error,
            "Status konnte nicht geändert werden"
          ),
          type: "error",
        });
      } finally {
        this.togglingId = null;
      }
    },
    async onRun(rule) {
      try {
        const log = await ApiRuleEngineService.runRule(rule._id);
        await this.addToast({
          message: `Regel ausgeführt: ${log.matchedCount} Treffer, ${log.processedCount} verarbeitet`,
          type: log.status === "error" ? "error" : "success",
        });
        await this.fetchRules();
      } catch (error) {
        await this.addToast({
          message: this.extractError(
            error,
            "Regel konnte nicht ausgeführt werden"
          ),
          type: "error",
        });
      }
    },
    async onDuplicate(rule) {
      this.duplicatingId = rule._id;
      try {
        const payload = {
          name: `${rule.name} (Kopie)`,
          description: rule.description || "",
          enabled: false,
          schedule: rule.schedule,
          resource: rule.resource,
          query: rule.query || null,
          conditions: rule.conditions || null,
          actions: rule.actions || [],
        };
        const created = await ApiRuleEngineService.createRule(payload);
        await this.addToast({
          message: "Regel kopiert (deaktiviert) – zum Bearbeiten geöffnet",
          type: "success",
        });
        this.$router.push({ name: "rule-edit", params: { id: created._id } });
      } catch (error) {
        await this.addToast({
          message: this.extractError(
            error,
            "Regel konnte nicht kopiert werden"
          ),
          type: "error",
        });
      } finally {
        this.duplicatingId = null;
      }
    },
    async onDryRun(rule) {
      try {
        const log = await ApiRuleEngineService.dryRunRule(rule._id);
        await this.addToast({
          message: `Test abgeschlossen: ${log.matchedCount} Treffer (keine Aktionen ausgeführt)`,
          type: "info",
        });
      } catch (error) {
        await this.addToast({
          message: this.extractError(error, "Test fehlgeschlagen"),
          type: "error",
        });
      }
    },
    onOpenDelete(rule) {
      this.selectedRule = rule;
      this.deleteDialog = true;
    },
    async onConfirmDelete() {
      this.deleting = true;
      try {
        await ApiRuleEngineService.deleteRule(this.selectedRule._id);
        this.rules = this.rules.filter((r) => r._id !== this.selectedRule._id);
        await this.addToast({
          message: "Regel gelöscht",
          type: "success",
        });
        this.deleteDialog = false;
      } catch (error) {
        await this.addToast({
          message: this.extractError(
            error,
            "Regel konnte nicht gelöscht werden"
          ),
          type: "error",
        });
      } finally {
        this.deleting = false;
      }
    },
  },
  async created() {
    await this.fetchMeta();
    await this.fetchRules();
  },
};
</script>

<style scoped></style>
