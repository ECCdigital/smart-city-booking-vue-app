<template>
  <AdminLayout>
    <v-row no-gutters align="center" justify="center">
      <v-col class="mx-xs-auto" cols="12" sm="6">
        <p class="text-h4">Allgemein</p>
      </v-col>
    </v-row>
    <v-row no-gutters align="center" justify="center">
      <v-col class="mx-xs-auto" cols="12" sm="6">
        <p class="text-subtitle-1">Allgemeine Angaben zu Ihrem Account</p>
      </v-col>
    </v-row>
    <v-row no-gutters align="center" justify="center">
      <v-col class="mx-xs-auto" cols="12" sm="6">
        <v-card outlined class="mx-auto pa-2">
          <v-card-title class="text-h4 darkgrey--text ml-3">
            Öffentliche Daten
          </v-card-title>
          <v-card-subtitle class="mt-1 ml-3">
            Diese Daten sind öffentlich und können von anderen Benutzern
            eingesehen werden.
          </v-card-subtitle>
          <v-card-text>
            <v-row>
              <v-expansion-panels
                flat
                class="elevation-0"
                v-model="generalPanel"
                multiple
              >
                <v-expansion-panel>
                  <v-expansion-panel-header>
                    <v-row align="center" justify="space-between">
                      <v-col class="darkgrey--text col-5"
                        >Vor- und Nachname ändern</v-col
                      >
                      <v-col class="darkgrey--text col-4"
                        >{{ api.user.firstName }} {{ api.user.lastName }}</v-col
                      >
                      <v-col class="text-right"></v-col>
                    </v-row>
                    <template v-slot:actions>
                      <v-tooltip bottom>
                        <template v-slot:activator="{ on }">
                          <v-icon v-on="on" color="darkgrey"
                            >mdi-chevron-right</v-icon
                          >
                        </template>
                        <span>Name ändern</span>
                      </v-tooltip>
                    </template>
                  </v-expansion-panel-header>
                  <v-expansion-panel-content>
                    <v-row justify="center" align="center">
                      <v-col>
                        <v-text-field
                          outlined
                          hide-details
                          v-model="firstName"
                          label="Vorname"
                        ></v-text-field>
                      </v-col>
                      <v-col>
                        <v-text-field
                          outlined
                          hide-details
                          v-model="lastName"
                          label="Nachname"
                        ></v-text-field>
                      </v-col>
                      <v-col class="col-auto text-right">
                        <v-btn
                          x-large
                          color="primary"
                          @click="updateUser"
                          :loading="isLoading"
                        >
                          Änderungen speichern
                        </v-btn>
                      </v-col>
                    </v-row>
                  </v-expansion-panel-content>
                  <v-divider></v-divider>
                </v-expansion-panel>
                <v-expansion-panel disabled>
                  <v-expansion-panel-header>
                    <v-row no-gutters align="center" justify="space-between">
                      <v-col class="darkgrey--text col-5">Beigetreten</v-col>
                      <v-col class="darkgrey--text col-4">{{
                        api.user?.created | date
                      }}</v-col>
                      <v-col class="text-right"></v-col>
                    </v-row>
                  </v-expansion-panel-header>
                </v-expansion-panel>
              </v-expansion-panels>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-row no-gutters class="mt-8 mb-16" align="center" justify="center">
      <v-col class="mx-xs-auto" cols="12" sm="6">
        <v-card outlined class="mx-auto pa-2">
          <v-card-title class="text-h4 darkgrey--text ml-3">
            Kontaktdaten
          </v-card-title>
          <v-card-subtitle class="mt-1 ml-3">
            Ändern Sie Ihre Kontaktdaten.
          </v-card-subtitle>
          <v-card-text>
            <v-row>
              <v-expansion-panels
                flat
                class="elevation-0"
                v-model="contactPanel"
                multiple
              >
                <v-expansion-panel>
                  <v-expansion-panel-header>
                    <v-row align="center" justify="space-between">
                      <v-col class="darkgrey--text col-5">Firma ändern</v-col>
                      <v-col class="darkgrey--text col-4">{{
                        api.user.company
                      }}</v-col>
                      <v-col class="text-right"></v-col>
                    </v-row>
                    <template v-slot:actions>
                      <v-tooltip bottom>
                        <template v-slot:activator="{ on }">
                          <v-icon v-on="on" color="darkgrey"
                            >mdi-chevron-right</v-icon
                          >
                        </template>
                        <span>Firma ändern</span>
                      </v-tooltip>
                    </template>
                  </v-expansion-panel-header>
                  <v-expansion-panel-content>
                    <v-row justify="center" align="center">
                      <v-col>
                        <v-text-field
                          outlined
                          hide-details
                          v-model="company"
                          label="Firma"
                        ></v-text-field>
                      </v-col>
                      <v-col class="col-auto text-right">
                        <v-btn
                          x-large
                          color="primary"
                          @click="updateUser"
                          :loading="isLoading"
                        >
                          Änderungen speichern
                        </v-btn>
                      </v-col>
                    </v-row>
                  </v-expansion-panel-content>
                  <v-divider></v-divider>
                </v-expansion-panel>
                <v-expansion-panel>
                  <v-expansion-panel-header>
                    <v-row align="center" justify="space-between">
                      <v-col class="darkgrey--text col-5"
                        >Telefonnummer ändern</v-col
                      >
                      <v-col class="darkgrey--text col-4">{{
                        api.user.phone
                      }}</v-col>
                      <v-col class="text-right"></v-col>
                    </v-row>
                    <template v-slot:actions>
                      <v-tooltip bottom>
                        <template v-slot:activator="{ on }">
                          <v-icon v-on="on" color="darkgrey"
                            >mdi-chevron-right</v-icon
                          >
                        </template>
                        <span>Telefonnummer ändern</span>
                      </v-tooltip>
                    </template>
                  </v-expansion-panel-header>
                  <v-expansion-panel-content>
                    <v-row justify="center" align="center">
                      <v-col>
                        <v-text-field
                          outlined
                          hide-details
                          v-model="phone"
                          label="Telefonnummer"
                        ></v-text-field>
                      </v-col>
                      <v-col class="col-auto text-right">
                        <v-btn
                          x-large
                          color="primary"
                          @click="updateUser"
                          :loading="isLoading"
                        >
                          Änderungen speichern
                        </v-btn>
                      </v-col>
                    </v-row>
                  </v-expansion-panel-content>
                  <v-divider></v-divider>
                </v-expansion-panel>
                <v-expansion-panel>
                  <v-expansion-panel-header>
                    <v-row align="center" justify="space-between">
                      <v-col class="darkgrey--text col-5"
                        >Straße und Hausnummer ändern</v-col
                      >
                      <v-col class="darkgrey--text col-4">{{
                        api.user.address
                      }}</v-col>
                      <v-col class="text-right"></v-col>
                    </v-row>
                    <template v-slot:actions>
                      <v-tooltip bottom>
                        <template v-slot:activator="{ on }">
                          <v-icon v-on="on" color="darkgrey"
                            >mdi-chevron-right</v-icon
                          >
                        </template>
                        <span>Straße und Hausnummer ändern</span>
                      </v-tooltip>
                    </template>
                  </v-expansion-panel-header>
                  <v-expansion-panel-content>
                    <v-row justify="center" align="center">
                      <v-col>
                        <v-text-field
                          outlined
                          hide-details
                          v-model="address"
                          label="Straße und Hausnummer"
                        ></v-text-field>
                      </v-col>
                      <v-col class="col-auto text-right">
                        <v-btn
                          x-large
                          color="primary"
                          @click="updateUser"
                          :loading="isLoading"
                        >
                          Änderungen speichern
                        </v-btn>
                      </v-col>
                    </v-row>
                  </v-expansion-panel-content>
                  <v-divider></v-divider>
                </v-expansion-panel>
                <v-expansion-panel>
                  <v-expansion-panel-header>
                    <v-row align="center" justify="space-between">
                      <v-col class="darkgrey--text col-5"
                        >Postleitzahl ändern</v-col
                      >
                      <v-col class="darkgrey--text col-4">{{
                        api.user.zipCode
                      }}</v-col>
                      <v-col class="text-right"></v-col>
                    </v-row>
                    <template v-slot:actions>
                      <v-tooltip bottom>
                        <template v-slot:activator="{ on }">
                          <v-icon v-on="on" color="darkgrey"
                            >mdi-chevron-right</v-icon
                          >
                        </template>
                        <span>Postleitzahl ändern</span>
                      </v-tooltip>
                    </template>
                  </v-expansion-panel-header>
                  <v-expansion-panel-content>
                    <v-row justify="center" align="center">
                      <v-col>
                        <v-text-field
                          outlined
                          hide-details
                          v-model="zip"
                          label="Postleitzahl"
                        ></v-text-field>
                      </v-col>
                      <v-col class="col-auto text-right">
                        <v-btn
                          x-large
                          color="primary"
                          @click="updateUser"
                          :loading="isLoading"
                        >
                          Änderungen speichern
                        </v-btn>
                      </v-col>
                    </v-row>
                  </v-expansion-panel-content>
                  <v-divider></v-divider>
                </v-expansion-panel>
                <v-expansion-panel>
                  <v-expansion-panel-header>
                    <v-row align="center" justify="space-between">
                      <v-col class="darkgrey--text col-5">Wohnort ändern</v-col>
                      <v-col class="darkgrey--text col-4">{{
                        api.user.city
                      }}</v-col>
                      <v-col class="text-right"></v-col>
                    </v-row>
                    <template v-slot:actions>
                      <v-tooltip bottom>
                        <template v-slot:activator="{ on }">
                          <v-icon v-on="on" color="darkgrey"
                            >mdi-chevron-right</v-icon
                          >
                        </template>
                        <span>Wohnort ändern</span>
                      </v-tooltip>
                    </template>
                  </v-expansion-panel-header>
                  <v-expansion-panel-content>
                    <v-row justify="center" align="center">
                      <v-col>
                        <v-text-field
                          outlined
                          hide-details
                          v-model="city"
                          label="Wohnort"
                        ></v-text-field>
                      </v-col>
                      <v-col class="col-auto text-right">
                        <v-btn
                          x-large
                          color="primary"
                          @click="updateUser"
                          :loading="isLoading"
                        >
                          Änderungen speichern
                        </v-btn>
                      </v-col>
                    </v-row>
                  </v-expansion-panel-content>
                </v-expansion-panel>
              </v-expansion-panels>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-row no-gutters class="mt-16" align="center" justify="center">
      <v-col class="mx-xs-auto" cols="12" sm="6">
        <p class="text-h4">Sicherheit</p>
      </v-col>
    </v-row>
    <v-row no-gutters align="center" justify="center">
      <v-col class="mx-xs-auto" cols="12" sm="6">
        <p class="text-subtitle-1">
          Einstellungen zum Schützen Ihres Accounts
        </p>
      </v-col>
    </v-row>
    <v-row no-gutters align="center" justify="center">
      <v-col class="mx-xs-auto" cols="12" sm="6">
        <v-card outlined class="mx-auto pa-2">
          <v-card-title class="text-h4 darkgrey--text ml-3">
            Anmeldung
          </v-card-title>
          <v-card-subtitle class="mt-1 ml-3">
            Ändern Sie Ihre E-Mail-Adresse oder Ihr Passwort, damit Ihr Account
            aktuell bleibt.
          </v-card-subtitle>
          <v-card-text>
            <v-row>
              <v-expansion-panels
                flat
                class="elevation-0"
                v-model="securePanel"
                multiple
              >
                <v-expansion-panel disabled>
                  <v-expansion-panel-header>
                    <v-row no-gutters align="center" justify="space-between">
                      <v-col class="darkgrey--text col-5">E-Mail-Adresse</v-col>
                      <v-col class="darkgrey--text col-4">{{
                        api.user.id
                      }}</v-col>
                      <v-col class="text-right"
                        ><v-icon color="darkgrey">mdi-lock</v-icon></v-col
                      >
                    </v-row>
                    <template v-slot:actions>
                      <v-tooltip bottom>
                        <template v-slot:activator="{ on }">
                          <v-icon v-on="on" color="darkgrey"
                            >mdi-chevron-right</v-icon
                          >
                        </template>
                        <span>E-Mail-Adresse ändern</span>
                      </v-tooltip>
                    </template>
                  </v-expansion-panel-header>

                  <v-expansion-panel-content>
                    <!-- TODO: update text, tbd -->
                  </v-expansion-panel-content>
                  <v-divider></v-divider>
                </v-expansion-panel>
                <v-expansion-panel
                  :disabled="api.user?.authType === 'keycloak'"
                >
                  <v-expansion-panel-header>
                    <v-row no-gutters align="center" justify="space-between">
                      <v-col class="darkgrey--text">Passwort ändern</v-col>
                      <v-col class=""></v-col>
                      <v-col class="text-right">
                        <v-icon
                          v-if="api.user?.authType === 'keycloak'"
                          color="darkgrey"
                        >mdi-lock</v-icon
                        >
                      </v-col>
                    </v-row>
                    <template v-slot:actions>
                      <v-tooltip bottom>
                        <template v-slot:activator="{ on }">
                          <v-icon v-on="on" color="darkgrey"
                            >mdi-chevron-right</v-icon
                          >
                        </template>
                        <span>Passwort ändern</span>
                      </v-tooltip>
                    </template>
                  </v-expansion-panel-header>
                  <v-expansion-panel-content>
                    <v-form ref="form" v-model="valid" lazy-validation>
                      <v-row>
                        <v-col>
                          <v-text-field
                            outlined
                            label="Neues Passwort"
                            placeholder="********"
                            hide-details
                            :rules="passwordRules"
                            v-model="password"
                            :type="showPassword ? 'text' : 'password'"
                            :append-icon="
                              showPassword ? 'mdi-eye' : 'mdi-eye-off'
                            "
                            @click:append="showPassword = !showPassword"
                          >
                          </v-text-field>
                        </v-col>
                        <v-col>
                          <v-text-field
                            outlined
                            label="Passwort wiederholen"
                            placeholder="********"
                            hide-details
                            :rules="passwordRules"
                            :type="showPassword ? 'text' : 'password'"
                            v-model="passwordRepeat"
                          >
                          </v-text-field>
                        </v-col>
                        <v-col class="text-right">
                          <v-btn
                            x-large
                            color="primary"
                            @click="updateUserPassword"
                            :loading="isLoading"
                          >
                            Passwort ändern
                          </v-btn>
                        </v-col>
                      </v-row>
                    </v-form>
                  </v-expansion-panel-content>
                </v-expansion-panel>
              </v-expansion-panels>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </AdminLayout>
</template>

<script>
import AdminLayout from "@/layouts/Admin";
import { mapActions, mapGetters } from "vuex";
import { RolePermission } from "@/entities/role";
import ApiAuthService from "@/services/api/ApiAuthService";
import ToastService from "@/services/ToastService";
import ApiUsersService from "@/services/api/ApiUsersService";

export default {
  data() {
    return {
      valid: true,
      isLoading: false,
      generalPanel: [],
      contactPanel: [],
      securePanel: [],
      password: "",
      passwordRepeat: "",
      showPassword: false,
      passwordRules: [(v) => !!v || "Passwort ist erforderlich"],
      api: {
        user: [],
      },
      tempFirstName: "",
      tempLastName: "",
      tempPhone: "",
      tempCompany: "",
      tempAddress: "",
      tempZip: "",
      tempCity: "",
    };
  },
  components: {
    AdminLayout,
  },
  computed: {
    ...mapGetters({
      loading: "loading/isLoading",
      hasPermission: "user/isAuthorized",
      user: "user/getUser",
    }),
    firstName: {
      get() {
        return this.api.user.firstName;
      },
      set(value) {
        this.tempFirstName = value;
      },
    },
    lastName: {
      get() {
        return this.api.user.lastName;
      },
      set(value) {
        this.tempLastName = value;
      },
    },
    phone: {
      get() {
        return this.api.user.phone;
      },
      set(value) {
        this.tempPhone = value;
      },
    },
    company: {
      get() {
        return this.api.user.company;
      },
      set(value) {
        this.tempCompany = value;
      },
    },
    address: {
      get() {
        return this.api.user.address;
      },
      set(value) {
        this.tempAddress = value;
      },
    },
    zip: {
      get() {
        return this.api.user.zipCode;
      },
      set(value) {
        this.tempZip = value;
      },
    },
    city: {
      get() {
        return this.api.user.city;
      },
      set(value) {
        this.tempCity = value;
      },
    },
    permissions() {
      const permissions = [];

      if (this.hasPermission(RolePermission.FREE_BOOKINGS)) {
        permissions.push("Freie Buchungen");
      }
      if (this.hasPermission(RolePermission.MANAGE_ROLES)) {
        permissions.push("Rollen verwalten");
      }
      if (this.hasPermission(RolePermission.MANAGE_USERS)) {
        permissions.push("Benutzer verwalten");
      }
      if (this.hasPermission(RolePermission.MANAGE_TENANTS)) {
        permissions.push("Mandanten verwalten");
      }
      if (this.hasPermission(RolePermission.MANAGE_BOOKINGS)) {
        permissions.push("Buchungen verwalten");
      }
      if (this.hasPermission(RolePermission.MANAGE_RESOURCES)) {
        permissions.push("Ressourcen verwalten");
      }
      return permissions;
    },
  },
  methods: {
    ...mapActions({
      startLoading: "loading/start",
      stopLoading: "loading/stop",
      updateMe: "user/update",
      addToast: "toasts/add",
    }),
    // get user from store
    updateUser() {
      this.isLoading = true;
      this.startLoading("update-user");
      this.api.user.firstName = this.tempFirstName;
      this.api.user.lastName = this.tempLastName;
      this.api.user.phone = this.tempPhone;
      this.api.user.company = this.tempCompany;
      this.api.user.address = this.tempAddress;
      this.api.user.zipCode = this.tempZip;
      this.api.user.city = this.tempCity;
      ApiUsersService.updateMe(this.api.user)
        .then((user) => {
          this.updateMe(user.data);
          this.isLoading = false;
          this.addToast(
            ToastService.createToast("user.edit-profile.success", "success")
          );
          // set last item of array to true to open the panel
          this.generalPanel = -1;
        })
        .finally(() => {
          this.stopLoading("update-user");
        })
        .catch((error) => {
          this.isLoading = false;
          console.log(error);
          this.addToast(
            ToastService.createToast("user.edit-profile.error", "error")
          );
        });
    },
    updateUserPassword() {
      if (this.$refs.form.validate()) {
        this.isLoading = true;
        this.startLoading("update-user");
        if (this.password === this.passwordRepeat) {
          // call api
          ApiAuthService.resetPassword(this.api.user.id, this.password)
            .then(() => {
              this.addToast(
                ToastService.createToast("password.reset.success", "success")
              );
              this.isLoading = false;
              this.securePanel = -1;
            })
            .catch((err) => {
              if (err.response.status === 404) {
                this.addToast(
                  ToastService.createToast(
                    "password.reset.wrong-email",
                    "error"
                  )
                );
                this.isLoading = false;
              } else {
                this.addToast(
                  ToastService.createToast("password.reset.error", "error")
                );
                this.isLoading = false;
              }
            });
        } else {
          this.isLoading = false;
          this.addToast(
            ToastService.createToast(
              "password.reset.password-mismatch",
              "error"
            )
          );
        }
      }
    },
  },
  mounted() {
    this.tempFirstName = this.user.firstName;
    this.tempLastName = this.user.lastName;
    this.tempPhone = this.user.phone;
    this.tempAddress = this.user.address;
    this.tempZip = this.user.zipCode;
    this.tempCity = this.user.city;
    this.tempCompany = this.user.company;
  },
  created() {
    this.api.user = this.user;
  },
};
</script>

<style scoped></style>
