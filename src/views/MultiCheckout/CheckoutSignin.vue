<template>
  <div>
    <v-form>
      <v-btn outlined small class="mb-5" @click="back">
        <v-icon left small>mdi-arrow-left</v-icon>
        Zurück
      </v-btn>

      <v-card class="rounded-sm pa-5" outlined>
        <v-card-text>
          <h1 class="mb-8">Anmeldung</h1>

          <div v-if="me">
            <v-card outlined class="rounded-sm">
              <v-card-text
                >Angemeldet als: {{ me.firstName }} {{ me.lastName }}</v-card-text
              >
            </v-card>

            <div class="d-flex mt-4">
              <v-btn outlined elevation="0" @click="signOut(false)"
                >Anderer Benutzer</v-btn
              >
              <v-spacer></v-spacer>
              <v-btn color="primary" elevation="0" @click="submit"
                >Weiter</v-btn
              >
            </div>
          </div>
          <div v-else>
            <v-text-field
              outlined
              hide-details
              label="Benutzername"
              v-model="id"
            ></v-text-field>
            <v-text-field
              outlined
              hide-details
              label="Passwort"
              type="password"
              class="mt-4"
              v-model="password"
            ></v-text-field>
            <div class="d-flex mt-4">
              <v-spacer></v-spacer>
              <v-btn color="primary" elevation="0" @click="signIn(true)" :disabled="!id || !password"
                >Anmelden und weiter</v-btn
              >
            </div>
          </div>
        </v-card-text>
      </v-card>

      <v-btn block large outlined @click="signOut(true)" class="mt-10"
        >Als Gast fortfahren</v-btn
      >
    </v-form>
  </div>
</template>

<script>
import ApiTenantService from "@/services/api/ApiTenantService";
import ApiAuthService from "@/services/api/ApiAuthService";
import {mapActions} from "vuex";
import ToastService from "@/services/ToastService";

export default {
  name: "CheckoutSignin",

  props: ["bookable", "me"],

  data() {
    return {
      id: "",
      password: "",
      tenants: []
    };
  },

  mounted() {
    this.fetchTenants();
  },

  methods: {
    ...mapActions({
      addToast: "toasts/add",
    }),

    submit() {
      this.$emit("submit");
    },

    back() {
      this.$emit("back");
    },

    signIn(submit) {
      ApiAuthService.login(this.bookable.tenant, this.id, this.password)
        .then((response) => {
          if (response.status === 200) {
            this.$emit("updateMe");

            if (submit) {
              this.submit();
            }
          }
        }).catch((error) => {
          if (error.response.status === 401) {
            this.addToast(ToastService.createToast("login.error.wrong-email", "error"));
          } else if (error.response.status === 400) {
            this.addToast(ToastService.createToast("login.error.default", "error"));
          } else {
            this.addToast(ToastService.createToast("login.error.default", "error"));
          }
        });
    },

    signOut(submit) {
      if (this.me) {
        ApiAuthService.logout().then((response) => {
          if (response.status === 200) {
            this.$emit("updateMe");

            if (submit) {
              this.submit();
            }
          }
        });
      } else {
        if (submit) {
          this.submit();
        }
      }
    },

    fetchTenants() {
      ApiTenantService.getTenants().then((response) => {
        this.tenants = response.data;
      });
    },
  }
};
</script>

<style scoped></style>
