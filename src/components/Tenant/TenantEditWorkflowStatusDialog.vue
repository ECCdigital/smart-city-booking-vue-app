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
        <v-alert type="info" border="left" elevation="1" colored-border>
          <strong>Hinweis zur Workflow-Konfiguration:</strong><br />
          Hier können Sie definieren, welche Aktionen ausgeführt werden sollen,
          wenn eine Buchung in diesen Workflow-Status wechselt.
          <ul class="mt-2 mb-2">
            <li>
              <strong>E-Mail-Aktion:</strong> Versendet eine Nachricht entweder
              an bestimmte Benutzer der ausgewählte Rolle, oder direkt an eine
              benutzerdefinierte E-Mail-Adresse.
            </li>
            <li>
              <strong>Buchungsstatus-Aktion:</strong> Ändert den Status einer
              Buchung, z.B. auf <em>freigegeben</em>,
              <em>abgelehnt/storniert</em> oder <em>bezahlt</em>.
            </li>
          </ul>
          Mehrere Aktionen können kombiniert werden. Als Benutzer stehen nur
          Mitglieder dieses Mandanten zur Auswahl; bereits gespeicherte
          Empfänger von außerhalb bleiben erhalten und sind als
          <em>Unbekannter Empfänger</em> gekennzeichnet.
        </v-alert>
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
                    item-text="label"
                    item-value="userId"
                    :return-object="false"
                  >
                    <template
                      v-slot:selection="{ attrs, item, select, selected }"
                    >
                      <v-chip
                        v-bind="attrs"
                        :input-value="selected.value"
                        close
                        :color="isKnownUser(item) ? 'secondary' : 'warning'"
                        @click="select"
                        @click:close="removeUser(idx, item)"
                      >
                        <strong>{{ userLabel(item) }}</strong>
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
import ApiTenantService from "@/services/api/ApiTenantService";

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
    tenantId: {
      type: String,
      default: "",
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
        { label: "Buchung freigegeben", value: "commit" },
        { label: "Buchung bezahlt", value: "paid" },
        { label: "Buchung storniert", value: "reject" },
      ],
    };
  },

  watch: {
    states: {
      handler: async function (newVal) {
        this.workflowStatus = JSON.parse(JSON.stringify(newVal));
        await this.fetchRoles();
        await this.fetchUsers();
      },
      immediate: true,
    },
    tenantId() {
      this.fetchUsers();
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
    /**
     * Recipients are the members of *this* tenant. The instance-wide user list
     * is owner-only from 4.3.x on, and a workflow of tenant A notifying a user
     * of tenant B was a leak rather than a feature.
     */
    async fetchUsers() {
      if (!this.tenantId) {
        this.availableUsers = [];
        return;
      }

      try {
        const response = await ApiTenantService.getTenantUsers(this.tenantId);
        const userDetails = response?.userDetails || [];

        this.availableUsers = (response?.users || [])
          .map((user) => {
            const details = userDetails.find(
              (detail) => detail.id === user.userId
            );
            const firstName = details?.firstName || user.firstName || "";
            const lastName = details?.lastName || user.lastName || "";
            const fullName = `${firstName} ${lastName}`.trim();

            return {
              userId: user.userId,
              label: fullName || user.userId,
            };
          })
          .filter((user) => !!user.userId);
      } catch (error) {
        console.error("Error fetching tenant users:", error);
        this.availableUsers = [];
      }
    },
    isKnownUser(userId) {
      return this.availableUsers.some((user) => user.userId === userId);
    },
    /**
     * A recipient that is not a member of this tenant stays in `sendTo` and
     * stays visible - only removing the chip drops it. Hiding it would delete
     * a notification recipient on the next save without anyone noticing.
     */
    userLabel(userId) {
      const user = this.availableUsers.find((u) => u.userId === userId);
      return user ? user.label : `${userId} (Unbekannter Empfänger)`;
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
