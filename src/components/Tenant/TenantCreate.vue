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
            <v-form ref="form" v-model="valid">
              <h3>Allgemeine Informationen</h3>
              <v-progress-linear
                :active="isLoading"
                indeterminate
                color="primary"
              ></v-progress-linear>
              <v-divider class="mb-5"></v-divider>
              <v-row>
                <v-col>
                  <v-text-field
                    background-color="accent"
                    filled
                    dense
                    label="Name"
                    :rules="validationRules.required"
                    v-model="tenant.name"
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
                    v-model="tenant.contactName"
                  ></v-text-field>
                </v-col>
                <v-col>
                  <v-text-field
                    background-color="accent"
                    filled
                    dense
                    label="Adresse"
                    :rules="validationRules.required"
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
                    :rules="validationRules.mail"
                    type="mail"
                    v-model="tenant.mail"
                  ></v-text-field>
                </v-col>
                <v-col>
                  <v-text-field
                    background-color="accent"
                    filled
                    dense
                    label="Telefonummer"
                    :rules="validationRules.required"
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
                    :rules="validationRules.required"
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
import { mapGetters } from "vuex";
import Tenant from "@/entities/tenant";

export default {
  name: "TenantCreate",
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
      tenant: {},
    };
  },
  computed: {
    ...mapGetters({
      tenantId: "tenants/currentTenantId",
    }),
    openDialog: {
      get() {
        return this.open;
      },
    },
  },
  watch: {
    open(val) {
      if (val) {
        this.tenant = new Tenant({});
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
    async submitChanges() {
      if (this.$refs.form.validate()) {
        this.inProgress = true;

        try {
          await ApiTenantService.createTenant(this.tenant);
          this.inProgress = false;
          this.closeDialog();
        } catch (e) {
          this.inProgress = false;
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
