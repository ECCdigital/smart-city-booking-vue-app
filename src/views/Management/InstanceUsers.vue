<template>
  <AdminLayout>
    <v-row gutters align="stretch" class="mb-16">
      <v-col cols="12" class="mx-xs-auto d-flex flex-column" height="100%">
        <v-text-field
          v-model="search"
          label="Benutzer suchen..."
          append-icon="mdi-magnify"
          solo
          clearable
          class="search-field"
        ></v-text-field>
        <v-skeleton-loader type="table" class="flex">
          <v-data-table
            :headers="headers"
            :sort-by="['created']"
            :sort-desc="[true]"
            :search="search"
            :custom-filter="customFilter"
            :footer-props="{
              'items-per-page-all-text': 'Alle',
              'items-per-page-text': 'Benutzer pro Seite',
            }"
            :items="api.users"
            class="accent elevation-1"
            :loading="loading"
            loading-text="Daten werden geladen..."
            no-data-text="Keine Daten vorhanden"
            fixed-header
          >
            <template v-slot:header.name="{ header }">
              {{ header.text.toUpperCase() }}
            </template>
            <template v-slot:item.isVerified="{ item }">
              <v-checkbox
                v-model="item.isVerified"
                color="primary"
                readonly
              ></v-checkbox>
            </template>
            <template v-slot:item.isSuspended="{ item }">
              <v-checkbox
                v-model="item.isSuspended"
                color="primary"
                readonly
              ></v-checkbox>
            </template>
            <template v-slot:item.roles="{ item }">
              <v-chip
                v-for="(role, index) in item.roles"
                class="ma-2"
                color="secondary"
                text-color="black"
                :key="index"
              >
                {{ getRoleName(role) }}
              </v-chip>
            </template>
            <template v-slot:item.created="{ item }">
              <span>{{
                Intl.DateTimeFormat("de-DE", {
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(new Date(item.created))
              }}</span>
            </template>
            <template v-slot:item.controls="{ item }">
              <span v-if="item.id !== 'super-admin'">
                <v-menu offset-y>
                  <template v-slot:activator="{ on, attrs }">
                    <v-btn icon v-bind="attrs" v-on="on" small>
                      <v-icon>mdi-dots-horizontal</v-icon>
                    </v-btn>
                  </template>
                  <v-list>
                    <v-list-item
                      link
                      @click="onOpenEditUser(item.id)"
                      :disabled="!UserPermissionService.allowUpdate(item)"
                    >
                      <v-list-item-icon>
                        <v-icon>mdi-pencil</v-icon>
                      </v-list-item-icon>
                      <v-list-item-title>Benutzer bearbeiten</v-list-item-title>
                    </v-list-item>
                    <v-list-item
                      link
                      @click="onOpenDeleteDialog(item.id)"
                      :disabled="!UserPermissionService.allowDelete(item)"
                    >
                      <v-list-item-icon>
                        <v-icon>mdi-delete</v-icon>
                      </v-list-item-icon>
                      <v-list-item-title>Benutzer löschen</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </span>
            </template>
          </v-data-table>
        </v-skeleton-loader>
      </v-col>
    </v-row>
    <UserEdit
      :user="selectedUser"
      :roles="api.roles"
      :open="openEditDialog"
      @close="onCloseDialog"
    />
    <UserDeleteConformationDialog
      :toDelete="selectedUser"
      :open="openDeleteDialog"
      @close="onCloseDeleteDialog"
    />
  </AdminLayout>
</template>

<script>
import AdminLayout from "@/layouts/Admin.vue";
import { mapActions, mapGetters } from "vuex";
import ApiUsersService from "@/services/api/ApiUsersService";
import UserEdit from "@/components/User/UserEdit";
import UserDeleteConformationDialog from "@/components/User/userDeleteConformationDialog";
import UserPermissionService from "@/services/permissions/UserPermissionService";

export default {
  components: {
    UserDeleteConformationDialog,
    AdminLayout,
    UserEdit,
  },
  data() {
    return {
      api: {
        users: [],
      },
      headers: [
        {
          text: "Id",
          align: "start",
          value: "id",
        },
        { text: "Vorname", value: "firstName" },
        { text: "Nachname", value: "lastName" },
        { text: "E-Mail Adresse", value: "id" },
        { text: "Verifiziert", value: "isVerified" },
        { text: "Suspendiert", value: "isSuspended" },
        { text: "Beigetreten", value: "created" },
        { text: "", value: "controls", sortable: false },
      ],
      search: "",
      openEditDialog: false,
      openDeleteDialog: false,
      selectedUser: {},
    };
  },
  computed: {
    ...mapGetters({
      loading: "loading/isLoading",
    }),
    UserPermissionService() {
      return UserPermissionService;
    },
  },
  methods: {
    ...mapActions({
      startLoading: "loading/start",
      stopLoading: "loading/stop",
    }),

    fetchUsers() {
      this.startLoading("fetch-users");

      ApiUsersService.getUsers()
        .then((response) => {
          this.api.users = response;
        })
        .finally(() => {
          this.stopLoading("fetch-users");
        })
        .catch((error) => {
          console.log(error);
        });
    },
    onOpenEditUser(userId) {
      this.selectedUser = Object.assign(
        {},
        this.api.users.find((user) => user.id === userId)
      );
      this.openEditDialog = true;
    },
    onOpenDeleteDialog(userId) {
      this.selectedUser = Object.assign(
        {},
        this.api.users.find((user) => user.id === userId)
      );
      this.openDeleteDialog = true;
    },
    onCloseDialog() {
      this.fetchUsers();
      this.openEditDialog = false;
    },
    onCloseDeleteDialog() {
      this.fetchUsers();
      this.openDeleteDialog = false;
    },
    getRoleName(roleId) {
      return this.api.roles.find((role) => role.id === roleId)?.name;
    },
    customFilter(value, search) {
      if (value?.toString().toLowerCase().includes(search.toLowerCase())) {
        return true;
      } else if (typeof value === "object" && value?.length > 0) {
        const roleIds = this.api.roles.map((role) => role.id);
        for (const key in value) {
          if (roleIds.includes(value[key])) {
            if (
              this.getRoleName(value[key])
                .toLowerCase()
                .includes(search.toLowerCase())
            ) {
              return true;
            }
          }
        }
      }
    },
  },
  created() {
    this.fetchUsers();
  },
};
</script>

<style scoped>
.search-field {
  border-radius: 15px;
}
</style>
