<script>
import { v4 as uuidv4 } from "uuid";
import TenantEditWorkflowStatusDialog from "@/components/Tenant/TenantEditWorkflowStatusDialog.vue";
import BaseSection from "@/components/commons/BaseSection.vue";

import ApiRolesService from "@/services/api/ApiRolesService";
import ApiUsersService from "@/services/api/ApiUsersService";

export default {
  name: "TenantEditWorkflow",
  components: { BaseSection, TenantEditWorkflowStatusDialog },
  props: {
    tenant: { type: Object, required: true },
    workflow: { type: Object, required: true },
  },
  data() {
    return {
      valid: false,
      localTenant: { ...this.tenant },
      localWorkflow: JSON.parse(JSON.stringify(this.workflow)),
      selectedSatus: {},
      statusToRemove: null,
      confirmOpen: false,
      creatingStatusId: null,
      availableRoles: [],
      availableUsers: [],
      showEditStatusDialog: false,
      validationRules: {
        required: [(v) => !!v || "Pflichtfeld"],
        mail: [
          (v) => !!v || "Pflichtfeld",
          (v) => /.+@.+\..+/.test(v) || "Muss gültige Email-Adresse sein.",
        ],
        paymentPurposeSuffix: [
          (v) => !v || v.length <= 12 || "Maximal 12 Zeichen erlaubt.",
        ],
        weblink: [
          (v) =>
            !v ||
            /https?\:\/\/([a-z\.A-Z\-]+)\/.*/g.test(v) ||
            "Ungültige URL.",
        ],
      },
    };
  },
  computed: {
    workflowEvents() {
      return [
        {
          key: "onCreate",
          label: "Bei Erstellung",
          hint: "Neuerstellung einer Buchung",
        },
        {
          key: "onCommit",
          label: "Bei Freigabe",
          hint: "Wenn eine Buchung freigegeben wird",
        },
        {
          key: "onReject",
          label: "Bei Ablehnung",
          hint: "Wenn eine Buchung abgelehnt wird",
        },
        {
          key: "onPay",
          label: "Bei Zahlung",
          hint: "Wenn eine Buchung als bezahlt markiert wird",
        },
      ];
    },
  },
  watch: {
    tenant: {
      deep: true,
      handler(v) {
        this.localTenant = { ...v };
      },
    },
    workflow: {
      deep: true,
      handler(v) {
        this.localWorkflow = JSON.parse(JSON.stringify(v));
      },
    },
  },
  methods: {
    async fetchRoles() {
      try {
        const result = await ApiRolesService.getTenantRoles();
        this.availableRoles = result?.data || [];
      } catch (e) {
        this.availableRoles = [];
      }
    },
    async fetchUsers() {
      try {
        const result = await ApiUsersService.getUsers();
        this.availableUsers = Array.isArray(result)
          ? result
          : Array.isArray(result?.data)
          ? result.data
          : [];
      } catch (e) {
        this.availableUsers = [];
      }
    },
    emitTenant() {
      this.$emit("update:tenant", this.localTenant);
    },
    emitWorkflow() {
      this.$emit("update:workflow", this.localWorkflow);
    },
    async validate() {
      return this.$refs.form ? this.$refs.form.validate() : true;
    },
    resetValidation() {
      if (this.$refs.form) this.$refs.form.resetValidation();
    },
    addStatus() {
      const id = uuidv4();
      const newState = {
        id: id,
        name: "",
        tasks: [],
        actions: [],
      };
      this.localWorkflow.states.push(newState);
      this.selectedSatus = this.localWorkflow.states.find((s) => s.id === id);
      this.creatingStatusId = id;
      this.showEditStatusDialog = true;
      this.emitWorkflow();
    },
    editStatus(idx) {
      this.showEditStatusDialog = true;
      this.selectedSatus = this.localWorkflow.states[idx];
      this.creatingStatusId = null;
    },
    confirmRemove(idx) {
      this.statusToRemove = idx;
      this.confirmOpen = true;
    },
    removeStatus() {
      const removed = this.localWorkflow.states.splice(
        this.statusToRemove,
        1
      )[0];
      this.confirmOpen = false;
      if (removed?.id === this.selectedSatus?.id) {
        this.showEditStatusDialog = false;
      }
      if (removed?.id === this.creatingStatusId) {
        this.creatingStatusId = null;
      }
      this.emitWorkflow();
    },
    updateStatus(status) {
      const idx = this.localWorkflow.states.findIndex(
        (s) => s.id === status.id
      );
      if (idx !== -1) {
        this.localWorkflow.states.splice(idx, 1, status);
        this.showEditStatusDialog = false;
        if (status?.id === this.creatingStatusId) {
          this.creatingStatusId = null;
        }
        this.emitWorkflow();
      }
    },
    cancelEditStatus() {
      if (this.creatingStatusId) {
        const i = this.localWorkflow.states.findIndex(
          (s) => s.id === this.creatingStatusId
        );
        if (i !== -1) {
          this.localWorkflow.states.splice(i, 1);
          this.emitWorkflow();
        }
        this.creatingStatusId = null;
      }
      this.showEditStatusDialog = false;
    },
    moveUp(idx) {
      this.localWorkflow.states.splice(
        idx - 1,
        0,
        this.localWorkflow.states.splice(idx, 1)[0]
      );
      this.emitWorkflow();
    },
    moveDown(idx) {
      this.localWorkflow.states.splice(
        idx + 1,
        0,
        this.localWorkflow.states.splice(idx, 1)[0]
      );
      this.emitWorkflow();
    },
    availableStatesFor(eventKey) {
      const mapping = this.localWorkflow?.eventStateMapping || {};
      const states = this.localWorkflow?.states || [];
      const usedStates = Object.entries(mapping)
        .filter(([k, v]) => k !== eventKey && !!v)
        .map(([k, v]) => v);

      return states.filter((s) => !usedStates.includes(s.id));
    },
    actionTypeLabel(type) {
      return (
        {
          email: "E-Mail-Benachrichtigung",
          bookingStatus: "Buchungsstatus ändern",
        }[type] ||
        type ||
        "Unbekannt"
      );
    },
    receiverTypeLabel(v) {
      return { user: "Benutzer", role: "Rolle" }[v] || v || "Unbekannt";
    },
    bookingStatusLabel(v) {
      return (
        {
          commit: "Buchung freigeben",
          paid: "Buchung bezahlt",
          reject: "Buchung storniert",
        }[v] || v
      );
    },
    roleName(roleId) {
      const r = this.availableRoles.find((x) => x.id === roleId);
      return r?.name || `Rolle ${roleId}`;
    },
    userName(userId) {
      const u = this.availableUsers.find((x) => x.id === userId);
      return u?.name || u?.displayName || u?.email || `User ${userId}`;
    },
    actionSummary(action) {
      if (!action || !action.type) return "Unbekannte Aktion";
      if (action.type === "email") {
        const count = Array.isArray(action.sendTo) ? action.sendTo.length : 0;
        return `E-Mail an ${this.receiverTypeLabel(
          action.receiverType
        )} (${count})`;
      }
      if (action.type === "bookingStatus") {
        const count = Array.isArray(action.bookingStatus)
          ? action.bookingStatus.length
          : 0;
        return `Setzt Buchungsstatus (${count})`;
      }
      return this.actionTypeLabel(action.type);
    },
  },
  mounted() {
    this.fetchRoles();
    this.fetchUsers();
  },
};
</script>

<template>
  <BaseSection
    title="Workflow Konfiguration"
    icon="mdi-chart-tree"
    hint="Hier können Sie den Workflow für Buchungen konfigurieren. Ein Workflow besteht aus mehreren Status, die nacheinander durchlaufen werden können. Jedem Status können Aktionen zugewiesen werden."
  >
    <v-row>
      <v-col class="col-12 col-md-8">
        <v-switch
          v-model="localWorkflow.active"
          color="primary"
          hide-details
          label="Workflow aktivieren"
          class="mt-2"
          @change="emitWorkflow()"
        ></v-switch>
      </v-col>
      <v-col class="col-12 col-md-4 d-flex justify-end align-center">
        <v-btn color="primary" @click="addStatus">
          <v-icon left>mdi-plus</v-icon>
          Workflow-Status hinzufügen
        </v-btn>
      </v-col>
    </v-row>

    <v-expansion-panels
      v-if="localWorkflow.states.length"
      multiple
      class="mt-4"
    >
      <v-expansion-panel
        v-for="(status, idx) in localWorkflow.states"
        :key="status.id"
      >
        <v-expansion-panel-header color="accent" expand-icon="mdi-menu-down">
          <template v-slot:default="{ open }">
            <v-row no-gutters align="center" class="w-100">
              <v-col cols="1" class="text-right">
                <v-btn
                  icon
                  :disabled="idx === 0"
                  @click.stop="moveUp(idx)"
                  :aria-label="`Nach oben verschieben: ${status.name}`"
                >
                  <v-icon>mdi-arrow-up</v-icon>
                </v-btn>
                <v-btn
                  icon
                  :disabled="idx === localWorkflow.states.length - 1"
                  @click.stop="moveDown(idx)"
                  :aria-label="`Nach unten verschieben: ${status.name}`"
                >
                  <v-icon>mdi-arrow-down</v-icon>
                </v-btn>
              </v-col>

              <v-col class="d-flex align-center">
                <strong class="mr-2">
                  {{ status.name || "Unbenannt" }}
                </strong>
                <v-chip
                  x-small
                  class="mr-2"
                  color="secondary"
                  text-color="white"
                  label
                >
                  Aktionen: {{ (status.actions && status.actions.length) || 0 }}
                </v-chip>
              </v-col>

              <v-col class="col-auto d-flex justify-end align-center">
                <v-tooltip bottom>
                  <template #activator="{ on, attrs }">
                    <v-btn
                      icon
                      v-bind="attrs"
                      v-on="on"
                      @click.stop="editStatus(idx)"
                    >
                      <v-icon>mdi-pencil</v-icon>
                    </v-btn>
                  </template>
                  <span>Bearbeiten</span>
                </v-tooltip>
                <v-tooltip bottom>
                  <template #activator="{ on, attrs }">
                    <v-btn
                      icon
                      color="error"
                      v-bind="attrs"
                      v-on="on"
                      @click.stop="confirmRemove(idx)"
                    >
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </template>
                  <span>Löschen</span>
                </v-tooltip>
              </v-col>
            </v-row>
          </template>
        </v-expansion-panel-header>

        <v-expansion-panel-content class="pt-2">
          <div v-if="!status.actions || !status.actions.length">
            <v-alert type="info" outlined dense>
              Keine Aktionen konfiguriert.
            </v-alert>
          </div>
          <div v-else>
            <v-list dense>
              <v-list-item
                v-for="(action, aIdx) in status.actions"
                :key="aIdx"
                class="py-2"
              >
                <v-list-item-content>
                  <v-list-item-title class="font-weight-medium">
                    {{ actionSummary(action) }}
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    <div v-if="action.type === 'email'">
                      <div class="mb-1">
                        Typ:
                        <strong>{{ actionTypeLabel(action.type) }}</strong>
                      </div>
                      <div class="mb-1">
                        Empfängertyp:
                        <strong>{{
                          receiverTypeLabel(action.receiverType)
                        }}</strong>
                      </div>
                      <div>
                        Empfänger:
                        <template
                          v-if="
                            Array.isArray(action.sendTo) && action.sendTo.length
                          "
                        >
                          <v-chip
                            v-for="id in action.sendTo"
                            :key="id"
                            small
                            class="mr-1 mb-1"
                            color="grey lighten-3"
                          >
                            {{
                              action.receiverType === "user"
                                ? userName(id)
                                : roleName(id)
                            }}
                          </v-chip>
                        </template>
                        <span v-else>Keine Empfänger definiert</span>
                      </div>
                    </div>
                    <div v-else-if="action.type === 'bookingStatus'">
                      <div class="mb-1">
                        Typ:
                        <strong>{{ actionTypeLabel(action.type) }}</strong>
                      </div>
                      <div>
                        Setzt Status auf:
                        <template
                          v-if="
                            Array.isArray(action.bookingStatus) &&
                            action.bookingStatus.length
                          "
                        >
                          <v-chip
                            v-for="bs in action.bookingStatus"
                            :key="bs"
                            small
                            class="mr-1 mb-1"
                            color="secondary"
                            text-color="white"
                          >
                            {{ bookingStatusLabel(bs) }}
                          </v-chip>
                        </template>
                        <span v-else>Kein Zielstatus konfiguriert</span>
                      </div>
                    </div>
                    <div v-else>
                      Unbekannter Aktionstyp
                      <em>({{ action.type || "n/a" }})</em>
                    </div>
                  </v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>
            </v-list>
          </div>
        </v-expansion-panel-content>
      </v-expansion-panel>

      <v-expansion-panel
        v-if="!localWorkflow.states || !localWorkflow.states.length"
        disabled
      >
        <v-expansion-panel-header>
          Keine Workflow-Status definiert. Klicke auf „Workflow-Status
          hinzufügen“.
        </v-expansion-panel-header>
      </v-expansion-panel>
    </v-expansion-panels>
    <v-divider class="my-6" />

    <h3 class="mb-2">Status-Zuordnung</h3>

    <div class="text-body-2 mb-2">
      Weisen Sie jedem <strong>Ereignis</strong> (Buchungs‑Event) einen
      passenden <strong>Workflow‑Status</strong> zu.
    </div>

    <v-alert
      dense
      type="info"
      border="left"
      colored-border
      class="my-3"
      elevation="2"
    >
      <strong>Hinweis:</strong>
      Wenn eine Buchung einen neuen Status erhält, weil eine
      <em>Action</em> im Workflow dies auslöst, wird <strong>nicht</strong> der
      hier konfigurierte Workflow‑Status verwendet.
    </v-alert>
    <v-row dense no-gutters v-for="event in workflowEvents" :key="event.key">
      <v-col cols="12" md="4" class="font-weight-medium">
        {{ event.label }}
        <div class="text-caption text--secondary">
          {{ event.hint }}
        </div>
      </v-col>
      <v-col cols="12" md="4">
        <v-select
          :items="availableStatesFor(event.key)"
          item-text="name"
          item-value="id"
          v-model="localWorkflow.eventStateMapping[event.key]"
          label="Status auswählen"
          outlined
          dense
          persistent-hint
          @change="emitWorkflow()"
          clearable
        ></v-select>
      </v-col>
    </v-row>

    <v-dialog v-model="confirmOpen" max-width="420">
      <v-card>
        <v-card-title>Workflow-Status löschen?</v-card-title>
        <v-card-text
          >Dieser Schritt kann nicht rückgängig gemacht werden.</v-card-text
        >
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="confirmOpen = false">Abbrechen</v-btn>
          <v-btn color="error" @click="removeStatus">Löschen</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <TenantEditWorkflowStatusDialog
      :open="showEditStatusDialog"
      :states="selectedSatus"
      @close="cancelEditStatus"
      @save="updateStatus"
    />
  </BaseSection>
</template>

<style scoped></style>
