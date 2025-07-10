<template>
  <v-dialog v-model="openDialog" persistent max-width="800px">
    <v-card>
      <v-card-title> Workflow Status bearbeiten </v-card-title>
      <v-card-text>
        <v-text-field
          class="mx-1"
          background-color="accent"
          hide-details
          filled
          dense
          label="Statusname"
          v-model="workflowStatus.name"
        ></v-text-field>
      </v-card-text>
      <v-card-text>
        <h3>Workflow Aktionen</h3>
        <div v-for="(action, idx) in workflowStatus.actions" :key="idx">
          <v-divider class="my-2" />
          <div class="d-flex justify-space-between align-center">
            <div class="my-2" style="width: 100%">
              <v-row>
                <v-col class="col-12 col-md-6">
                  <v-select
                    class="mx-1"
                    background-color="accent"
                    hide-details
                    filled
                    dense
                    label="Aktion"
                    v-model="action.type"
                    :items="actionTypes"
                    item-text="label"
                    item-value="value"
                    @change="handleTypeChange(idx)"
                  ></v-select>
                </v-col>
              </v-row>
              <v-row v-if="action.type === 'email'">
                <v-col class="col-12 col-md-4">
                  <v-select
                    class="mx-1"
                    background-color="accent"
                    hide-details
                    filled
                    dense
                    label="Empfängertyp"
                    v-model="action.receiverType"
                    :items="receiverTypes"
                    item-text="label"
                    item-value="value"
                    @change="action.sendTo = []"
                  ></v-select>
                </v-col>
                <v-col class="col-12 col-md-8">
                  <v-combobox
                    v-if="action.receiverType === 'user'"
                    class="mx-1"
                    background-color="accent"
                    hide-details
                    filled
                    dense
                    multiple
                    hide-selected
                    chips
                    label="Benutzer"
                    v-model="action.sendTo"
                    :items="availableUsers"
                  >
                    <template
                      v-slot:selection="{ attrs, item, select, selected }"
                    >
                      <v-chip
                        v-bind="attrs"
                        :input-value="selected.value"
                        close
                        color="secondary"
                        @click="select"
                        @click:close="removeUser(idx, item)"
                      >
                        <strong>{{ item }}</strong>
                      </v-chip>
                    </template>
                  </v-combobox>
                  <v-select
                    v-if="action.receiverType === 'role'"
                    class="mx-1"
                    background-color="accent"
                    hide-details
                    filled
                    dense
                    multiple
                    hide-selected
                    chips
                    label="Rolle"
                    v-model="action.sendTo"
                    :items="availableRoles"
                    item-text="name"
                    item-value="id"
                  >
                    <template
                      v-slot:selection="{ attrs, item, select, selected }"
                    >
                      <v-chip
                        v-bind="attrs"
                        :input-value="selected.value"
                        close
                        color="secondary"
                        @click="select"
                        @click:close="removeRole(idx, item.id)"
                      >
                        <strong>{{ item.name }}</strong>
                      </v-chip>
                    </template>
                  </v-select>
                </v-col>
              </v-row>
              <v-row v-if="action.type === 'bookingStatus'">
                <v-col class="col-12">
                  <v-select
                    class="mx-1"
                    background-color="accent"
                    hide-details
                    filled
                    dense
                    chips
                    multiple
                    hide-selected
                    label="Buchungsstatus"
                    v-model="action.bookingStatus"
                    :items="bookingStatus"
                    item-text="label"
                    item-value="value"
                  >
                    <template
                      v-slot:selection="{ attrs, item, select, selected }"
                    >
                      <v-chip
                        v-bind="attrs"
                        :input-value="selected.value"
                        close
                        color="secondary"
                        @click="select"
                        @click:close="removeStatus(idx, item.value)"
                      >
                        <strong>{{ item.label }}</strong>
                      </v-chip>
                    </template>
                  </v-select>
                </v-col>
              </v-row>
            </div>
            <v-btn color="error" @click="removeAction(idx)" icon depressed>
              <v-icon>mdi-delete</v-icon>
            </v-btn>
          </div>
        </div>
        <v-divider class="my-2" />
        <div class="d-flex justify-center">
          <v-btn @click="addAction" class="mt-4" outlined>
            Workflow-Aktion hinzufügen
          </v-btn>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn outlined @click="closeDialog">Abbrechen</v-btn>
        <v-btn color="primary" @click="saveWorkflowStatus">Übernehmen</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import ApiRolesService from "@/services/api/ApiRolesService";
import ApiUsersService from "@/services/api/ApiUsersService";

export default {
  name: "TenantEditWorkflowStatusDialog",
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    states: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      workflowStatus: {
        name: "",
      },
      availableRoles: [],
      availableUsers: [],
      actionTypes: [
        { label: "Email-Benachrichtigung ", value: "email" },
        { label: "Buchung-Statusänderung", value: "bookingStatus" },
      ],
      receiverTypes: [
        { label: "User", value: "user" },
        { label: "Rolle", value: "role" },
      ],
      bookingStatus: [
        { label: "Buchung freigeben", value: "commit" },
        { label: "Buchung bezahlt", value: "paid" },
        { label: "Buchung storniert", value: "reject" },
      ],
    };
  },

  watch: {
    states: {
      handler: async function (newVal, oldVal) {
        this.workflowStatus = JSON.parse(JSON.stringify(newVal));
        await this.fetchRoles();
        await this.fetchUsers();
      },
      immediate: true,
    },
  },

  computed: {
    openDialog: {
      get() {
        return this.open;
      },
    },
  },

  methods: {
    async fetchRoles() {
      try {
        await ApiRolesService.getTenantRoles().then((result) => {
          this.availableRoles = result?.data;
        });
      } catch (error) {
        console.error("Error fetching roles:", error);
        this.availableRoles = [];
      }
    },
    async fetchUsers() {
      await ApiUsersService.getUsers().then((result) => {
        this.availableUsers = result.map((user) => user.id);
      });
    },
    addAction() {
      this.workflowStatus.actions.push({
        type: "",
        sendTo: [],
        bookingStatus: [],
        receiverType: "",
      });
    },
    removeAction(idx) {
      this.workflowStatus.actions.splice(idx, 1);
    },
    removeRole(idx, roleId) {
      this.workflowStatus.actions[idx].sendTo = this.workflowStatus.actions[
        idx
      ].sendTo.filter((role) => role !== roleId);
    },
    removeUser(idx, userId) {
      this.workflowStatus.actions[idx].sendTo = this.workflowStatus.actions[
        idx
      ].sendTo.filter((user) => user !== userId);
    },
    removeStatus(idx, statusId) {
      this.workflowStatus.actions[idx].bookingStatus =
        this.workflowStatus.actions[idx].bookingStatus.filter(
          (status) => status !== statusId
        );
    },
    closeDialog() {
      this.$emit("close");
    },
    saveWorkflowStatus() {
      this.$emit("save", this.workflowStatus);
    },
    handleTypeChange(idx) {
      const action = this.workflowStatus.actions[idx];
      if (action.type === "email") {
        action.sendTo = [];
        action.bookingStatus = [];
        action.receiverType = "";
      }
      if (action.type === "bookingStatus") {
        action.bookingStatus = [];
        action.sendTo = [];
        action.receiverType = "";
      }
    },
  },
};
</script>

<style scoped></style>
