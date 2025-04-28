<template>
  <div>
    <v-form ref="form" v-model="valid">
      <v-alert outlined v-if="isRestrictedBookable && !user" color="warning">
        Sie können dieses Angebot nur buchen, wenn Sie angemeldet sind. Bitte
        melden Sie sich an oder registrieren Sie sich, um die Buchung
        abzuschließen.
      </v-alert>

      <div class="d-flex mb-5">
        <v-btn outlined small @click="back">
          <v-icon left small>mdi-arrow-left</v-icon>
          Zurück
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn
          :disabled="isNextButtonDisabled"
          color="primary"
          small
          @click="submit"
        >
          Zur Zusammenfassung
          <v-icon right small>mdi-arrow-right</v-icon>
        </v-btn>
      </div>

      <h2 class="mb-8">Kontaktinformationen</h2>

      <v-toolbar flat color="primary" dark class="mb-8">
        <div
          v-if="user"
          class="text-subtitle-1 d-flex align-center justify-center"
        >
          <v-icon left>mdi-account</v-icon>
          <div>
            Hallo, <strong> {{ user.firstName }} {{ user.lastName }}</strong>
          </div>
          <v-btn text small class="ml-1" @click="signOut(true)">Ändern</v-btn>
        </div>
        <div v-if="!user">Buchung als <strong>Gast</strong></div>

        <v-spacer></v-spacer>
        <v-btn v-if="user && !isRestrictedBookable" text @click="signOut(false)"
          >Als Gast fortfahren</v-btn
        >
        <v-btn v-if="!user" text @click="goToLogin"
          >Anmelden oder Registrieren</v-btn
        >
      </v-toolbar>

      <v-row>
        <v-col cols="12">
          <v-text-field
            prepend-icon="mdi-account"
            hide-details
            dense
            filled
            label="Vor- und Nachname*"
            :rules="validationRules.required"
            v-model="contactDetails.name"
          ></v-text-field>
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12">
          <v-text-field
            prepend-icon="mdi-domain"
            hide-details
            dense
            filled
            :label="companyLabel"
            v-model="contactDetails.company"
            :rules="companyRequired ? validationRules.required : []"
          ></v-text-field>
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12" sm="6">
          <v-text-field
            prepend-icon="mdi-email"
            hide-details
            dense
            filled
            label="E-Mail*"
            :rules="validationRules.mail"
            v-model="contactDetails.mail"
          ></v-text-field>
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field
            prepend-icon="mdi-phone"
            hide-details
            dense
            filled
            label="Telefon"
            v-model="contactDetails.phone"
          ></v-text-field>
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12">
          <v-text-field
            prepend-icon="mdi-home"
            hide-details
            dense
            filled
            label="Straße, Hausnummer*"
            :rules="validationRules.required"
            v-model="contactDetails.street"
          ></v-text-field>
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12" sm="6">
          <v-text-field
            prepend-icon="mdi-map-marker"
            hide-details
            dense
            filled
            label="PLZ*"
            :rules="validationRules.required"
            v-model="contactDetails.zipCode"
          ></v-text-field>
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field
            prepend-icon="mdi-city"
            hide-details
            dense
            filled
            label="Ort*"
            :rules="validationRules.required"
            v-model="contactDetails.location"
          ></v-text-field>
        </v-col>
      </v-row>

      <v-row>
        <v-col>
          <v-textarea
            filled
            prepend-icon="mdi-comment"
            :label="commentLabel"
            :placeholder="
              commentRequired
                ? 'Bitte geben Sie den Zweck oder die geplante Nutzung dieser Ressource an. Dieses Feld ist erforderlich.'
                : ''
            "
            hide-details
            dense
            :rules="commentRequired ? validationRules.required : []"
            v-model="contactDetails.comment"
          ></v-textarea>
        </v-col>
      </v-row>

      <v-divider class="mt-5"></v-divider>
      <span class="caption">* Pflichtfelder</span>

      <checkout-agreements
        v-if="leadItem && leadItem.bookable.attachments.length > 0"
        :agreements="leadItem.bookable.attachments"
        ref="checkoutAgreements"
      ></checkout-agreements>
    </v-form>
    <v-dialog v-model="showLogin" width="520">
      <div
        class="d-flex align-center justify-center pa-5"
        style="width: 520px; max-width: 100vw; background-color: white"
      >
        <LoginCard
          :tenant="tenant"
          @success="onSuccess"
          :sso-active="ssoActive"
          style="width: 520px; max-width: 100vw"
        ></LoginCard>
      </div>
    </v-dialog>
  </div>
</template>

<script>
import CheckoutAgreements from "@/views/BundleCheckout/CheckoutAgreements.vue";
import LoginCard from "@/components/Auth/LoginCard.vue";
import { mapActions, mapGetters } from "vuex";
import ApiAuthService from "@/services/api/ApiAuthService";

export default {
  name: "CheckoutContactDetails",
  components: { LoginCard, CheckoutAgreements },

  props: {
    leadItem: {
      type: Object,
      required: true,
    },
    me: {
      type: Object,
    },
    contactDetails: {
      type: Object,
      required: true,
    },
  },

  data() {
    return {
      showLogin: false,
      valid: true,

      validationRules: {
        required: [(v) => !!v || "Dieses Feld ist erforderlich"],
        mail: [
          (v) => !!v || "E-Mail ist erforderlich",
          (v) => /.+@.+\..+/.test(v) || "E-Mail muss gültig sein",
        ],
      },
    };
  },

  methods: {
    ...mapActions({
      deleteUser: "user/delete",
    }),
    onSuccess() {
      this.showLogin = false;
    },
    submit() {
      if (
        this.$refs.form.validate() &&
        (!this.$refs.checkoutAgreements ||
          this.$refs.checkoutAgreements.validate())
      ) {
        this.$emit("submit");
      }
    },

    back() {
      this.$emit("back");
    },
    goToLogin() {
      this.showLogin = true;
    },
    async signOut(showLogin) {
      try {
        await ApiAuthService.logout();
        await this.deleteUser();
        if (showLogin) {
          this.showLogin = true;
        }
      } catch (e) {
        console.error(e);
      }
    },
  },

  computed: {
    ...mapGetters({
      tenant: "tenants/currentTenant",
      instance: "instance/instance",
      user: "user/getUser",
    }),
    ssoActive() {
      return !!this.instance?.applications.find(
        (app) => app?.id === "keycloak" && app.active
      );
    },
    isNextButtonDisabled() {
      return !this.valid || (this.isRestrictedBookable && !this.user);
    },
    commentRequired() {
      return this.leadItem.bookable.requiredFields?.includes("comment");
    },
    companyRequired() {
      return this.leadItem.bookable.requiredFields?.includes("company");
    },
    commentLabel() {
      return this.commentRequired
        ? "Hinweise zur Buchung*"
        : "Hinweise zur Buchung";
    },
    companyLabel() {
      return this.companyRequired ? "Firma*" : "Firma";
    },
    isRestrictedBookable() {
      return (
        (this.leadItem.bookable.permittedUsers &&
          this.leadItem.bookable.permittedUsers.length > 0) ||
        (this.leadItem.bookable.permittedRoles &&
          this.leadItem.bookable.permittedRoles.length > 0)
      );
    },
  },
};
</script>

<style scoped lang="scss"></style>
