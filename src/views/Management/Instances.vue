<template>
  <AdminLayout>
    <v-row>
      <v-col cols="12" class="mx-xs-auto d-flex flex-column" height="100%">
        <v-row>
          <v-col>
            <h3 class="mb-5 mt-5">Allgemein</h3>
          </v-col>
        </v-row>
        <v-row>
          <v-col>
            <p class="text-subtitle-1">Kontaktangaben zu Ihrer Instanz</p>
          </v-col>
        </v-row>

        <!-- Kontakt -->
        <v-row>
          <v-col>
            <v-card outlined class="mx-auto pa-2">
              <v-card-title class="ml-3">
                <h4 class="mb-5 mt-5">Kontakt</h4>
              </v-card-title>
              <v-card-subtitle class="mt-1 ml-3">
                Ändern Sie Ihre Kontaktdaten.
              </v-card-subtitle>
              <v-card-text>
                <v-text-field
                  background-color="accent"
                  filled
                  dense
                  label="Kontaktadresse"
                  placeholder="Muster Amt, Musterstraße 1, 12345 Musterstadt"
                  v-model="instance.contactAddress"
                ></v-text-field>

                <v-text-field
                  background-color="accent"
                  filled
                  dense
                  placeholder="example.com"
                  label="Webseite"
                  v-model="instance.contactUrl"
                ></v-text-field>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Weiterleitungen -->
        <v-row>
          <v-col>
            <v-card outlined class="mx-auto pa-2">
              <v-card-title class="darkgrey--text ml-3">
                <h4 class="mb-5 mt-5">Weiterleitungen</h4>
              </v-card-title>
              <v-card-subtitle class="mt-1 ml-3">
                Ändern Sie hier Ihre Weiterleitung zum Datenschutz und zum
                Impressum.
              </v-card-subtitle>
              <v-card-text>
                <v-text-field
                  background-color="accent"
                  filled
                  dense
                  label="Link zum Datenschutz"
                  placeholder="example.com/datenschutz"
                  v-model="instance.dataProtectionUrl"
                ></v-text-field>

                <v-text-field
                  background-color="accent"
                  filled
                  dense
                  label="Link zum Impressum"
                  placeholder="example.com/impressum"
                  v-model="instance.legalNoticeUrl"
                ></v-text-field>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Mail-Konfiguration -->
        <v-row>
          <v-col>
            <h3 class="mb-5 mt-5">Mail-Konfiguration</h3>
          </v-col>
        </v-row>
        <v-row>
          <v-col>
            <p class="text-subtitle-1">E-Mail-Konfiguration zu Ihrer Instanz</p>
          </v-col>
        </v-row>

        <v-row>
          <v-col>
            <v-card outlined class="mx-auto pa-2">
              <v-card-title class="darkgrey--text ml-3">
                <h4 class="mb-5 mt-5">E-Mail</h4>
              </v-card-title>
              <v-card-subtitle class="mt-1 ml-3">
                Ändern Sie hier die E-Mail-Konfiguration zu Ihrer Instanz.
              </v-card-subtitle>
              <v-card-text>
                <v-row>
                  <v-col class="col-12 col-md-3">
                    <v-text-field
                      background-color="accent"
                      filled
                      label="E-Mail zum Empfangen von Sytem-E-Mails"
                      v-model="instance.mailAddress"
                    ></v-text-field>
                  </v-col>
                </v-row>
                <v-row>
                  <v-col class="col-12">
                    <v-switch
                      v-model="instance.mailEnabled"
                      color="primary"
                      hide-details
                      label="E-Mail-Versand aktivieren"
                      class="mt-2"
                    ></v-switch>
                  </v-col>
                </v-row>
                <MailKonfiguration
                  v-if="instance.mailEnabled"
                  :mail-config="instanceMailConfig"
                  @update="updateMailConfig"
                />
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Besitzer -->
        <v-row>
          <v-col>
            <h3 class="mb-5 mt-5">Besitzer</h3>
          </v-col>
        </v-row>
        <v-row>
          <v-col>
            <p class="text-subtitle-1">Besitzer Ihrer Instanz</p>
          </v-col>
        </v-row>

        <v-row>
          <v-col>
            <v-card outlined class="mx-auto pa-2">
              <v-autocomplete
                hide-details
                placeholder="Besitzer Hinzufügen"
                clearable
                v-model="selectedOwner"
                :items="filtersUsers(instance.ownerUserIds)"
                item-text="id"
                item-value="id"
                class="ma-5"
              >
                <template v-slot:append-outer>
                  <v-btn small color="primary" @click="addOwner">
                    <v-icon left> mdi-plus</v-icon>
                    Hinzufügen
                  </v-btn>
                </template>
              </v-autocomplete>
              <v-list dense>
                <v-list-item-group v-model="selectedUser" color="primary">
                  <v-list-item
                    v-for="(item, i) in instance.ownerUserIds"
                    :key="i"
                  >
                    <v-list-item-icon>
                      <v-icon> mdi-account</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                      <v-list-item-title>{{ item }}</v-list-item-title>
                    </v-list-item-content>
                    <v-list-item-icon>
                      <v-icon @click="removeOwner(item)"> mdi-delete</v-icon>
                    </v-list-item-icon>
                  </v-list-item>
                </v-list-item-group>
              </v-list>
            </v-card>
          </v-col>
        </v-row>

        <v-row>
          <v-col>
            <h3 class="mb-5 mt-5">Mandanten</h3>
          </v-col>
        </v-row>
        <v-row>
          <v-col>
            <p class="text-subtitle-1">Mandanten Einstellungen</p>
          </v-col>
        </v-row>

        <v-row>
          <v-col>
            <v-card outlined class="mx-auto pa-2">
              <v-card-title class="darkgrey--text ml-3">
                <h4 class="mb-5 mt-5">Mandanten erstellen</h4>
              </v-card-title>
              <v-card-subtitle class="mt-1 ml-3">
                Spezifizieren Sie hier wer Mandanten erstellen darf.
              </v-card-subtitle>
              <v-row class="mx-4">
                <v-col class="col-12">
                  <v-switch
                    v-model="instance.allowAllUsersToCreateTenant"
                    color="primary"
                    hide-details
                    label="Erlauben Sie allen Benutzern Mandanten zu erstellen"
                  ></v-switch>
                </v-col>
              </v-row>
              <v-card-title class="darkgrey--text">
                <h4 class="mt-14">Benutzer die Mandanten erstellen dürfen</h4>
              </v-card-title>
              <v-row>
                <v-col class="col-12">
                  <v-autocomplete
                    hide-details
                    placeholder="Benutzer Hinzufügen"
                    clearable
                    v-model="selectedUserToCreateTenant"
                    :items="filtersUsers(instance.allowedUsersToCreateTenant)"
                    item-text="id"
                    item-value="id"
                    class="ma-5"
                  >
                    <template v-slot:append-outer>
                      <v-btn small color="primary" @click="addUser">
                        <v-icon left> mdi-plus</v-icon>
                        Hinzufügen
                      </v-btn>
                    </template>
                  </v-autocomplete>
                  <v-list dense>
                    <v-list-item-group
                      v-model="selectedUserToCreateTenant"
                      color="primary"
                    >
                      <v-list-item
                        v-for="(item, i) in instance.allowedUsersToCreateTenant"
                        :key="i"
                      >
                        <v-list-item-icon>
                          <v-icon> mdi-account</v-icon>
                        </v-list-item-icon>
                        <v-list-item-content>
                          <v-list-item-title>{{ item }}</v-list-item-title>
                        </v-list-item-content>
                        <v-list-item-icon>
                          <v-icon @click="removeUser(item)"> mdi-delete</v-icon>
                        </v-list-item-icon>
                      </v-list-item>
                    </v-list-item-group>
                  </v-list>
                </v-col>
              </v-row>
            </v-card>
          </v-col>
        </v-row>

        <div class="d-flex mt-12">
          <v-btn text outlined @click="fetchInstance"> Zurücksetzen </v-btn>
          <v-btn class="ml-2" color="primary" @click="updateInstance">
            speichern
          </v-btn>
        </div>
      </v-col>
    </v-row>
  </AdminLayout>
</template>

<script>
import AdminLayout from "@/layouts/Admin.vue";
import ApiInstanceService from "@/services/api/ApiInstanceService";
import MailKonfiguration from "@/components/Tenant/MailKonfiguration.vue";
import ApiUsersService from "@/services/api/ApiUsersService";
import { mapActions } from "vuex";

export default {
  name: "Instances",
  components: { MailKonfiguration, AdminLayout },
  data() {
    return {
      instance: {},
      isLoading: false,
      addressPanel: false,
      urlPanel: false,
      dataProtectionPanel: false,
      legalNoticePanel: false,
      tempContactAddress: "",
      tempContactUrl: "",
      tempDataProtectionUrl: "",
      tempLegalNoticeUrl: "",
      selectedOwner: null,
      availableUserIds: null,
      selectedUser: null,
      selectedUserToCreateTenant: null,
    };
  },
  methods: {
    ...mapActions({
      addToast: "toasts/add",
    }),
    updateMailConfig(newConfig) {
      this.instance.noreplyDisplayName = newConfig.noreplyDisplayName;
      this.instance.noreplyMail = newConfig.noreplyMail;
      this.instance.noreplyDisplayName = newConfig.noreplyDisplayName;
      this.instance.noreplyHost = newConfig.noreplyHost;
      this.instance.noreplyPort = newConfig.noreplyPort;
      this.instance.noreplyUser = newConfig.noreplyUser;
      this.instance.noreplyPassword = newConfig.noreplyPassword;
      this.instance.noreplyUseGraphApi = newConfig.noreplyUseGraphApi;
      this.instance.noreplyStarttls = newConfig.noreplyStarttls;
      this.instance.noreplyGraphTenantId = newConfig.noreplyGraphTenantId;
      this.instance.noreplyGraphClientId = newConfig.noreplyGraphClientId;
      this.instance.noreplyGraphClientSecret =
        newConfig.noreplyGraphClientSecret;
    },
    addOwner() {
      this.instance.ownerUserIds.push(this.selectedOwner);
      this.selectedOwner = null;
    },
    removeOwner(userId) {
      this.instance.ownerUserIds.splice(
        this.instance.ownerUserIds.indexOf(userId),
        1
      );
    },
    addUser() {
      this.instance.allowedUsersToCreateTenant.push(
        this.selectedUserToCreateTenant
      );
      this.selectedUserToCreateTenant = null;
    },
    removeUser(userId) {
      this.instance.allowedUsersToCreateTenant.splice(
        this.instance.allowedUsersToCreateTenant.indexOf(userId),
        1
      );
    },
    async updateInstance() {
      try {
        this.instance = await ApiInstanceService.updateInstance(this.instance);
        await this.addToast({
          message: "Instanz erfolgreich aktualisiert",
          type: "success",
        });
      } catch (e) {
        await this.addToast({
          message: "Fehler beim Aktualisieren der Instanz",
          type: "error",
        });
      }
    },
    async fetchInstance() {
      this.instance = await ApiInstanceService.getInstance(false);
    },
    async fetchUsers() {
      this.availableUserIds = await ApiUsersService.getUsers();
    },
    filtersUsers(usersToExclude) {
      return this.availableUserIds?.filter(
        (user) => !usersToExclude.includes(user.id)
      );
    },
  },
  computed: {
    instanceMailConfig: {
      get() {
        return {
          genericMailTemplate: this.instance.mailTemplate,
          noreplyMail: this.instance.noreplyMail,
          noreplyDisplayName: this.instance.noreplyDisplayName,
          noreplyHost: this.instance.noreplyHost,
          noreplyPort: this.instance.noreplyPort,
          noreplyUser: this.instance.noreplyUser,
          noreplyPassword: this.instance.noreplyPassword,
          noreplyUseGraphApi: this.instance.noreplyUseGraphApi,
          noreplyStarttls: this.instance.noreplyStarttls,
          noreplyGraphTenantId: this.instance.noreplyGraphTenantId,
          noreplyGraphClientId: this.instance.noreplyGraphClientId,
          noreplyGraphClientSecret: this.instance.noreplyGraphClientSecret,
        };
      },
    },
  },
  async mounted() {
    await this.fetchInstance();
    await this.fetchUsers();
  },
};
</script>

<style scoped></style>
