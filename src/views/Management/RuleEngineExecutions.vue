<template>
  <AdminLayout>
    <div class="page-content">
      <div class="d-flex align-center mb-4">
        <v-btn icon class="mr-2" :to="{ name: 'rules' }">
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>
        <span class="text-body-2 grey--text">Zurück zur Übersicht</span>
      </div>

      <v-card flat class="mb-4">
        <v-card-text>
          <v-row dense align="center">
            <v-col cols="12" sm="3">
              <v-select
                v-model="filters.status"
                :items="statusOptions"
                label="Status"
                clearable
                dense
                outlined
                hide-details
                @change="reload"
              />
            </v-col>
            <v-col cols="12" sm="3">
              <v-text-field
                v-model="filters.from"
                label="Von"
                type="datetime-local"
                dense
                outlined
                hide-details
                clearable
                @change="reload"
              />
            </v-col>
            <v-col cols="12" sm="3">
              <v-text-field
                v-model="filters.to"
                label="Bis"
                type="datetime-local"
                dense
                outlined
                hide-details
                clearable
                @change="reload"
              />
            </v-col>
            <v-col cols="12" sm="3" class="text-right">
              <v-btn outlined small @click="reload">
                <v-icon left small>mdi-refresh</v-icon>
                Aktualisieren
              </v-btn>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <v-data-table
        :headers="headers"
        :items="items"
        :loading="loading"
        :server-items-length="total"
        :options.sync="options"
        :footer-props="{ 'items-per-page-options': [25, 50, 100, 200] }"
        show-expand
        single-expand
        :expanded.sync="expanded"
        item-key="_id"
        class="elevation-1"
      >
        <template v-slot:[`item.status`]="{ item }">
          <RuleStatusBadge :status="item.status" />
        </template>
        <template v-slot:[`item.trigger`]="{ item }">
          <v-chip x-small label outlined>
            <v-icon left x-small>
              {{
                item.trigger === "manual"
                  ? "mdi-gesture-tap"
                  : "mdi-clock-outline"
              }}
            </v-icon>
            {{ item.trigger === "manual" ? "Manuell" : "Geplant" }}
          </v-chip>
        </template>
        <template v-slot:[`item.startedAt`]="{ item }">
          {{ formatDate(item.startedAt) }}
        </template>
        <template v-slot:[`item.durationMs`]="{ item }">
          {{ item.durationMs }} ms
        </template>
        <template v-slot:expanded-item="{ headers: cols, item }">
          <td :colspan="cols.length" class="py-3">
            <div v-if="item.error" class="red--text mb-2">
              <strong>Fehler:</strong> {{ item.error }}
            </div>
            <div v-if="item.actionResults && item.actionResults.length">
              <div class="text-subtitle-2 mb-1">Aktionsergebnisse</div>
              <v-simple-table dense>
                <thead>
                  <tr>
                    <th>Aktion</th>
                    <th>Dokument</th>
                    <th>Status</th>
                    <th>Meldung</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(res, i) in item.actionResults" :key="i">
                    <td>{{ res.actionType }}</td>
                    <td>
                      <code>{{ res.docId }}</code>
                    </td>
                    <td><RuleStatusBadge :status="res.status" /></td>
                    <td>{{ res.message || "—" }}</td>
                  </tr>
                </tbody>
              </v-simple-table>
            </div>
            <div v-else class="grey--text font-italic">
              Keine Aktionsergebnisse.
            </div>
          </td>
        </template>
        <template v-slot:no-data>
          <div class="text-center py-8 grey--text">
            <v-icon size="48" color="grey lighten-2">mdi-history</v-icon>
            <div>Keine Ausführungen gefunden</div>
          </div>
        </template>
      </v-data-table>
    </div>
  </AdminLayout>
</template>

<script>
import AdminLayout from "@/layouts/Admin.vue";
import { mapActions } from "vuex";
import ApiRuleEngineService from "@/services/api/ApiRuleEngineService";
import RuleStatusBadge from "@/components/Instance/RuleEngine/RuleStatusBadge.vue";

export default {
  name: "RuleEngineExecutions",
  components: { AdminLayout, RuleStatusBadge },
  data() {
    return {
      items: [],
      total: 0,
      loading: false,
      expanded: [],
      options: {
        page: 1,
        itemsPerPage: 50,
      },
      filters: {
        status: null,
        from: null,
        to: null,
      },
      statusOptions: [
        { text: "Erfolg", value: "success" },
        { text: "Teilweise", value: "partial" },
        { text: "Fehler", value: "error" },
        { text: "Dry-Run", value: "skipped" },
      ],
      headers: [
        { text: "Regel", value: "ruleName" },
        { text: "Auslöser", value: "trigger" },
        { text: "Status", value: "status" },
        { text: "Start", value: "startedAt" },
        { text: "Dauer", value: "durationMs" },
        { text: "Treffer", value: "matchedCount" },
        { text: "Verarbeitet", value: "processedCount" },
        { text: "", value: "data-table-expand" },
      ],
    };
  },
  computed: {
    ruleId() {
      return this.$route.query.ruleId || null;
    },
  },
  watch: {
    options: {
      handler() {
        this.fetchExecutions();
      },
      deep: true,
      immediate: true,
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
        timeStyle: "medium",
      }).format(new Date(value));
    },
    extractError(error, fallback) {
      return error?.response?.data?.message || fallback;
    },
    buildParams() {
      const params = {
        limit: this.options.itemsPerPage,
        offset: (this.options.page - 1) * this.options.itemsPerPage,
      };
      if (this.filters.status) params.status = this.filters.status;
      if (this.filters.from)
        params.from = new Date(this.filters.from).toISOString();
      if (this.filters.to) params.to = new Date(this.filters.to).toISOString();
      return params;
    },
    reload() {
      if (this.options.page !== 1) {
        this.options.page = 1;
      } else {
        this.fetchExecutions();
      }
    },
    async fetchExecutions() {
      this.loading = true;
      try {
        const params = this.buildParams();
        const data = this.ruleId
          ? await ApiRuleEngineService.getRuleExecutions(this.ruleId, params)
          : await ApiRuleEngineService.getExecutions(params);
        this.items = data.items || [];
        this.total = data.total || 0;
      } catch (error) {
        await this.addToast({
          message: this.extractError(
            error,
            "Historie konnte nicht geladen werden"
          ),
          type: "error",
        });
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped></style>
