<template>
  <v-row justify="center">
    <v-dialog v-model="openDialog" persistent scrollable max-width="800px">
      <v-card>
        <v-card-title class="d-flex align-center py-4 px-6">
          <v-icon left>
            {{ selectedRole.id ? "mdi-pencil" : "mdi-plus" }}
          </v-icon>
          <span v-if="selectedRole.id" class="text-h5">Rolle bearbeiten</span>
          <span v-else class="text-h5">Neue Rolle erstellen</span>
          <v-spacer />
          <v-btn icon @click="closeDialog">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-6">
          <v-container>
            <v-form ref="form" v-model="valid">
              <v-row>
                <v-col class="col-6">
                  <v-text-field
                    background-color="accent"
                    filled
                    hide-details
                    label="Bezeichnung"
                    :rules="[rules.required]"
                    v-model="selectedRole.name"
                  ></v-text-field>
                </v-col>
              </v-row>

              <!-- Access to administrative Interfaces -->
              <v-row>
                <v-col class="col">
                  <span class="text-h6">Zugriff auf Admin-Bereiche</span>
                </v-col>
                <v-col class="col-auto">
                  <v-btn outlined small @click="addAllAdminInterfaces">
                    Alle zuweisen
                  </v-btn>
                </v-col>
              </v-row>
              <v-divider />
              <v-row no-gutters>
                <v-col>
                  <v-select
                    class="filter-field mt-5"
                    v-model="selectedRole.adminInterfaces"
                    :items="adminInterfaceProps"
                    label="Admin-Bereiche"
                    item-text="name"
                    item-value="value"
                    no-data-text="Kein Admin-Bereich gefunden"
                    hide-selected
                    multiple
                    clearable
                    chips
                    solo
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
                        @click:close="removeAdminInterface(item.value)"
                      >
                        <strong>{{ item.name }}</strong>
                      </v-chip>
                    </template>
                  </v-select>
                </v-col>
              </v-row>

              <v-row>
                <v-col class="col-6">
                  <span class="text-h6">Objekt-Berechtigungen</span>
                </v-col>
              </v-row>
              <v-divider />

              <div v-for="ps in permissionStructure" :key="ps.value">
                <div v-if="selectedRole[ps.value]">
                  <v-row class="mt-3">
                    <v-col>
                      <div class="font-weight-bold">{{ ps.name }}</div>
                    </v-col>
                    <v-col class="col-auto">
                      <v-btn
                        small
                        outlined
                        @click="setAllAccessLevels(ps.value, true)"
                        class="me-2"
                      >
                        Alle
                      </v-btn>
                      <v-btn
                        small
                        outlined
                        @click="setAllAccessLevels(ps.value, false)"
                      >
                        Keine
                      </v-btn>
                    </v-col>
                  </v-row>

                  <!--
                    Known gap, deliberately left open: these access levels are
                    free-standing, so "Erstellen" without "Eigene/Alle
                    Bearbeiten" is two clicks away and yields a role the API
                    rejects with 403 - the obsolete PUT store routes are
                    authorised as `update`. Not coupled here on purpose; see
                    docs/agents/components.md, "Known gap: `create` without
                    `update` in the role editor".
                  -->
                  <v-row no-gutters>
                    <v-col>
                      <v-checkbox
                        v-model="selectedRole[ps.value].create"
                        color="primary"
                        label="Erstellen"
                        hide-details
                      ></v-checkbox>
                    </v-col>
                    <v-col> </v-col>
                  </v-row>
                  <v-row no-gutters>
                    <v-col>
                      <v-checkbox
                        v-model="selectedRole[ps.value].readOwn"
                        color="primary"
                        label="Eigene Lesen"
                        hide-details
                      ></v-checkbox>
                    </v-col>
                    <v-col>
                      <v-checkbox
                        v-model="selectedRole[ps.value].readAny"
                        color="primary"
                        label="Alle Lesen"
                        hide-details
                      ></v-checkbox>
                    </v-col>
                  </v-row>
                  <v-row no-gutters>
                    <v-col>
                      <v-checkbox
                        v-model="selectedRole[ps.value].updateOwn"
                        color="primary"
                        label="Eigene Bearbeiten"
                        hide-details
                      ></v-checkbox>
                    </v-col>
                    <v-col>
                      <v-checkbox
                        v-model="selectedRole[ps.value].updateAny"
                        color="primary"
                        label="Alle Bearbeiten"
                        hide-details
                      ></v-checkbox>
                    </v-col>
                  </v-row>
                  <v-row no-gutters>
                    <v-col>
                      <v-checkbox
                        v-model="selectedRole[ps.value].deleteOwn"
                        color="primary"
                        label="Eigene Löschen"
                        hide-details
                      ></v-checkbox>
                    </v-col>
                    <v-col>
                      <v-checkbox
                        v-model="selectedRole[ps.value].deleteAny"
                        color="primary"
                        label="Alle Löschen"
                        hide-details
                      ></v-checkbox>
                    </v-col>
                  </v-row>
                </div>
              </div>
            </v-form>
          </v-container>
        </v-card-text>
        <v-divider />
        <v-card-actions class="justify-end px-6 py-4">
          <v-btn outlined @click="closeDialog">Abbrechen</v-btn>
          <v-btn color="primary" @click="submitChanges" :loading="inProgress">
            <v-icon left small>mdi-content-save</v-icon>
            Speichern
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-row>
</template>

<script>
import ApiRolesService from "@/services/api/ApiRolesService";
import { adminInterfaceOptions } from "@/entities/role";

export default {
  name: "RoleEdit",
  components: {},
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    role: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      valid: true,
      inProgress: false,
      adminInterfaceProps: adminInterfaceOptions,
      permissionStructure: [
        {
          name: "Rollen",
          value: "manageRoles",
        },
        {
          name: "Benutzer",
          value: "manageUsers",
        },
        {
          name: "Buchungen",
          value: "manageBookings",
        },
        {
          name: "Rabatte",
          value: "manageCoupons",
        },
        {
          name: "Buchungsobjekte",
          value: "manageBookables",
        },
        {
          name: "Mediathek",
          value: "manageMedia",
        },
      ],
      rules: {
        required: (value) => !!value || "Pflichtfeld",
      },
    };
  },
  computed: {
    openDialog: {
      get() {
        return this.open;
      },
    },
    selectedRole: {
      get() {
        return this.role;
      },
    },
  },
  methods: {
    closeDialog() {
      this.$emit("close");
    },
    removeAdminInterface(value) {
      this.selectedRole.adminInterfaces =
        this.selectedRole.adminInterfaces.filter((item) => item !== value);
    },
    addAllAdminInterfaces() {
      this.selectedRole.adminInterfaces = this.adminInterfaceProps.map(
        (item) => item.value
      );
    },
    setAllAccessLevels(permission, value) {
      this.selectedRole[permission] = {
        create: value,
        readOwn: value,
        readAny: value,
        updateOwn: value,
        updateAny: value,
        deleteOwn: value,
        deleteAny: value,
      };
    },
    async submitChanges() {
      this.inProgress = true;
      if (this.$refs.form.validate()) {
        try {
          await ApiRolesService.submitRole(this.selectedRole);
          this.closeDialog();
        } finally {
          this.inProgress = false;
        }
      } else {
        this.inProgress = false;
        // reset form after 2 seconds
        setTimeout(() => {
          this.$refs.form.resetValidation();
        }, 4000);
      }
    },
  },
};
</script>

<style scoped></style>
