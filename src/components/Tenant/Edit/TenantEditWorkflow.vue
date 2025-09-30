<script>
import { v4 as uuidv4 } from "uuid";
import TenantEditWorkflowStatusDialog from "@/components/Tenant/TenantEditWorkflowStatusDialog.vue";
import BaseSection from "@/components/commons/BaseSection.vue";

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
      this.showEditStatusDialog = true;
      this.emitWorkflow();
    },
    editStatus(idx) {
      this.showEditStatusDialog = true;
      this.selectedSatus = this.localWorkflow.states[idx];
    },
    confirmRemove(idx) {
      this.statusToRemove = idx;
      this.confirmOpen = true;
    },
    removeStatus() {
      this.localWorkflow.states.splice(this.statusToRemove, 1);
      this.confirmOpen = false;
      this.emitWorkflow();
    },
    updateStatus(status) {
      const idx = this.localWorkflow.states.findIndex(
        (s) => s.id === status.id
      );
      if (idx !== -1) {
        this.localWorkflow.states.splice(idx, 1, status);
        this.showEditStatusDialog = false;
        this.emitWorkflow();
      }
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
  },
};
</script>

<template>
  <BaseSection
    title="Workflow Konfiguration"
    icon="mdi-chart-tree"
    hint="Hier können Sie den Workflow für Buchungen konfigurieren. Ein Workflow besteht aus mehreren Status, die nacheinander durchlaufen werden können. Jedem Status können Aktionen zugewiesen werden."
  >
    <v-row class="mb-3">
      <v-col class="col-12 col-md-8"> </v-col>
      <v-col class="col-12 col-md-4 d-flex justify-end align-center">
        <v-btn color="primary" @click="addStatus">
          <v-icon left>mdi-plus</v-icon>
          Workflow-Status hinzufügen
        </v-btn>
      </v-col>
    </v-row>
    <v-row>
      <v-col class="col-12">
        <v-switch
          v-model="localWorkflow.active"
          color="primary"
          hide-details
          label="Workflow aktivieren"
          class="mt-2"
          @change="emitWorkflow()"
        ></v-switch>
      </v-col>
    </v-row>
    <v-row v-if="localWorkflow.states" no-gutters class="mt-4">
      <v-col cols="2">
        <span class="text-caption"> Status für neue Buchungen</span>
      </v-col>
    </v-row>
    <v-row
      v-for="(status, idx) in localWorkflow.states"
      :key="status.id"
      class="align-center"
    >
      <v-col cols="1" class="text-center">
        <v-radio-group
          v-model="localWorkflow.defaultState"
          @change="emitWorkflow"
          row
        >
          <v-radio :value="status.id" :label="''" color="primary" />
        </v-radio-group>
      </v-col>
      <v-col cols="1" class="text-right">
        <v-btn icon :disabled="idx === 0" @click="moveUp(idx)">
          <v-icon>mdi-arrow-up</v-icon>
        </v-btn>
        <v-btn
          icon
          :disabled="idx === localWorkflow.states.length - 1"
          @click="moveDown(idx)"
        >
          <v-icon>mdi-arrow-down</v-icon>
        </v-btn>
      </v-col>
      <v-col class="d-flex align-center">
        <v-chip
          v-if="localWorkflow.defaultState === status.id"
          small
          color="primary"
          text-color="white"
          class="mr-2"
          label
        >
          Default
        </v-chip>
        <strong>{{ status.name || "Unbenannt" }}</strong>
      </v-col>
      <v-col class="col-auto">
        <v-tooltip bottom>
          <template #activator="{ on, attrs }">
            <v-btn icon v-bind="attrs" v-on="on" @click="editStatus(idx)">
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
              @click="confirmRemove(idx)"
            >
              <v-icon>mdi-delete</v-icon>
            </v-btn>
          </template>
          <span>Löschen</span>
        </v-tooltip>
      </v-col>
    </v-row>
    <v-divider class="my-2" />

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
      @close="showEditStatusDialog = false"
      @save="updateStatus"
    />
  </BaseSection>
</template>

<style scoped></style>
