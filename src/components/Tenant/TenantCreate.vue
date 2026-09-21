<template>
  <v-row justify="center">
    <v-dialog v-model="openDialog" persistent max-width="800px">
      <v-card>
        <v-card-title class="mx-3">
          <span class="text-h5">Neuen Mandanten erstellen</span>
        </v-card-title>
        <v-divider class="mx-9 mb-5" />
        <v-card-text>
          <v-container>
            <OnboardingSupervisionNotice :level="initialLevel" />
            <v-form ref="form" v-model="valid">
              <h3>Allgemeine Informationen</h3>
              <v-progress-linear
                :active="isLoading"
                indeterminate
                color="primary"
              ></v-progress-linear>
              <v-divider class="mb-5"></v-divider>
              <v-alert
                v-if="errorText"
                type="error"
                text
                dense
                data-test="tenant-create-error"
              >
                {{ errorText }}
              </v-alert>
              <v-row>
                <v-col>
                  <v-text-field
                    background-color="accent"
                    filled
                    dense
                    label="Name"
                    :rules="validationRules.required"
                    :error-messages="fieldError('name')"
                    v-model="tenant.name"
                    data-test="tenant-create-name"
                  ></v-text-field>
                </v-col>
              </v-row>
              <v-row>
                <v-col>
                  <v-text-field
                    background-color="accent"
                    filled
                    dense
                    label="Kontakt Person"
                    :rules="validationRules.required"
                    :error-messages="fieldError('contactName')"
                    v-model="tenant.contactName"
                    data-test="tenant-create-contact-name"
                  ></v-text-field>
                </v-col>
                <v-col>
                  <v-text-field
                    background-color="accent"
                    filled
                    dense
                    label="Adresse"
                    v-model="tenant.location"
                  ></v-text-field>
                </v-col>
              </v-row>
              <v-row>
                <v-col>
                  <v-text-field
                    background-color="accent"
                    filled
                    dense
                    label="E-Mail Adresse"
                    type="mail"
                    :rules="validationRules.mail"
                    :error-messages="fieldError('mail')"
                    v-model="tenant.mail"
                    data-test="tenant-create-mail"
                  ></v-text-field>
                </v-col>
                <v-col>
                  <v-text-field
                    background-color="accent"
                    filled
                    dense
                    label="Telefonummer"
                    v-model="tenant.phone"
                  ></v-text-field>
                </v-col>
              </v-row>
              <v-row>
                <v-col>
                  <v-text-field
                    background-color="accent"
                    filled
                    dense
                    label="Website"
                    type="text"
                    v-model="tenant.website"
                  ></v-text-field>
                </v-col>
              </v-row>
            </v-form>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            class="mb-5"
            color="primary"
            @click="submitChanges"
            :loading="inProgress"
            data-test="tenant-create-submit"
          >
            Speichern
          </v-btn>
          <v-btn class="mb-5 mr-5" outlined @click="closeDialog">
            Abbrechen
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-row>
</template>

<script>
import ApiTenantService from "@/services/api/ApiTenantService";
import ApiInstanceService from "@/services/api/ApiInstanceService";
import TenantPermissionService from "@/services/permissions/TenantPermissionService";
import OnboardingSupervisionNotice from "@/components/Tenant/Onboarding/OnboardingSupervisionNotice.vue";
import { mapGetters } from "vuex";
import Tenant from "@/entities/tenant";
import {
  contactPrefill,
  creationErrorMessage,
  creationFieldErrorKey,
  isFormallyValidMail,
  tenantCreationError,
} from "@/utils/tenantOnboarding";

export default {
  name: "TenantCreate",
  components: { OnboardingSupervisionNotice },
  props: {
    open: {
      type: Boolean,
      required: true,
    },
  },
  data() {
    return {
      isLoading: false,
      valid: false,
      originTenantId: null,
      inProgress: false,
      error: null,
      validationRules: {
        required: [(v) => !!(v && v.trim()) || "Pflichtfeld"],
        mail: [
          (v) => !!v || "Pflichtfeld",
          (v) =>
            isFormallyValidMail(v) ||
            this.$t("tenant.onboarding.errors.mail-invalid"),
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
      tenant: {},
      initialLevel: null,
    };
  },
  computed: {
    ...mapGetters({
      tenantId: "tenants/currentTenantId",
      user: "user/getUser",
    }),
    errorText() {
      const message = creationErrorMessage(this.error);
      return message ? this.$t(message.key, message.params) : "";
    },
    openDialog: {
      get() {
        return this.open;
      },
    },
  },
  watch: {
    open(val) {
      if (val) {
        // The contact starts as the account's and stays editable (spec §9).
        this.tenant = new Tenant(contactPrefill(this.user));
        this.error = null;
        this.loadInitialLevel();
        this.$nextTick(() => {
          this.$refs.form.resetValidation();
        });
      }
    },
  },
  methods: {
    closeDialog() {
      this.$emit("close");
    },
    /**
     * A self-created tenant starts at the instance's Startstufe, so the
     * dialog announces it before the creation. The instance owner's tenant
     * always starts free, and an unreadable level must not block the form.
     */
    async loadInitialLevel() {
      this.initialLevel = null;
      if (TenantPermissionService.isInstanceOwner()) return;
      try {
        const instance = await ApiInstanceService.getPublicInstance();
        this.initialLevel = instance?.tenantInitialSupervisionLevel || null;
      } catch (e) {
        this.initialLevel = null;
      }
    },
    fieldError(field) {
      const key = creationFieldErrorKey(this.error, field);
      return key ? [this.$t(key)] : [];
    },
    async submitChanges() {
      if (this.$refs.form.validate()) {
        this.inProgress = true;
        this.error = null;

        try {
          await ApiTenantService.createTenant(this.tenant);
          this.inProgress = false;
          this.closeDialog();
        } catch (e) {
          this.inProgress = false;
          // Limit, unproven account mail, tenant maximum or a named field.
          this.error = tenantCreationError(e);
        }
      } else {
        //reset validation after 4 seconds
        setTimeout(() => {
          this.$refs.form.resetValidation();
        }, 4000);
      }
    },
  },
};
</script>

<style scoped></style>
