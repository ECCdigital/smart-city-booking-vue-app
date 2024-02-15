<template>
  <v-row justify="center">
    <v-dialog v-model="openDialog" persistent max-width="800px">
      <v-card>
        <v-card-title class="mx-3">
          <span v-if="selectedTenant._id" class="text-h5"
            >Mandanten bearbeiten</span
          >
          <span v-else class="text-h5">Neuen Mandanten erstellen</span>
        </v-card-title>
        <v-divider class="mx-9 mb-5" />
        <v-card-text>
          <v-container>
            <v-form ref="form" v-model="valid">
              <h3 class="mb-5">Allgemeine Informationen</h3>
              <v-row>
                <v-col>
                  <v-text-field
                    v-if="selectedTenant._id"
                    background-color="accent"
                    filled
                    dense
                    label="ID"
                    readonly
                    disabled
                    v-model="selectedTenant.id"
                  ></v-text-field>
                  <v-text-field
                    v-else
                    background-color="accent"
                    filled
                    dense
                    label="ID"
                    :rules="validationRules.required"
                    v-model="selectedTenant.id"
                  ></v-text-field>
                </v-col>
                <v-col>
                  <v-text-field
                    background-color="accent"
                    filled
                    dense
                    label="Name"
                    :rules="validationRules.required"
                    v-model="selectedTenant.name"
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
                    v-model="selectedTenant.contactName"
                  ></v-text-field>
                </v-col>
                <v-col>
                  <v-text-field
                    background-color="accent"
                    filled
                    dense
                    label="Adresse"
                    :rules="validationRules.required"
                    v-model="selectedTenant.location"
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
                    v-model="selectedTenant.mail"
                  ></v-text-field>
                </v-col>
                <v-col>
                  <v-text-field
                    background-color="accent"
                    filled
                    dense
                    label="Telefonummer"
                    :rules="validationRules.required"
                    v-model="selectedTenant.phone"
                  ></v-text-field>
                </v-col>
              </v-row>
              <h3 class="mb-5 mt-5">Web-Schnittstelle</h3>
              <v-row>
                <v-col>
                  <v-text-field
                    background-color="accent"
                    filled
                    dense
                    label="Link zur Detailseite (Buchungsobjekt)"
                    placeholder="https://..."
                    :rules="validationRules.weblink"
                    v-model="selectedTenant.bookableDetailLink"
                    suffix="?bkid=[ID]"
                  >
                  </v-text-field>
                </v-col>
              </v-row>
              <v-row>
                <v-col>
                  <v-text-field
                    background-color="accent"
                    filled
                    dense
                    label="Link zur Detailseite (Event)"
                    placeholder="https://..."
                    :rules="validationRules.weblink"
                    v-model="selectedTenant.eventDetailLink"
                    suffix="?bkid=[ID]"
                  >
                  </v-text-field>
                </v-col>
              </v-row>
              <h3 class="mb-5 mt-5">E-Mail-Konfiguration</h3>
              <v-row>
                <v-col>
                  <v-text-field
                    background-color="accent"
                    filled
                    dense
                    label="E-Mail-Adresse"
                    :rules="validationRules.mail"
                    v-model="selectedTenant.noreplyMail"
                  ></v-text-field>
                </v-col>
                <v-col>
                  <v-text-field
                    background-color="accent"
                    filled
                    dense
                    label="Anzeigename"
                    v-model="selectedTenant.noreplyDisplayName"
                  ></v-text-field>
                </v-col>
              </v-row>
              <v-row>
                <v-col class="">
                  <v-text-field
                    background-color="accent"
                    filled
                    dense
                    label="SMTP-Server"
                    v-model="selectedTenant.noreplyHost"
                  ></v-text-field>
                </v-col>
                <v-col class="col-md-2">
                  <v-text-field
                    background-color="accent"
                    filled
                    dense
                    label="Port"
                    v-model="selectedTenant.noreplyPort"
                  ></v-text-field>
                </v-col>
              </v-row>
              <v-row>
                <v-col class="">
                  <v-text-field
                    background-color="accent"
                    filled
                    dense
                    label="Benutzername"
                    v-model="selectedTenant.noreplyUser"
                  ></v-text-field>
                </v-col>
                <v-col class="">
                  <v-text-field
                    background-color="accent"
                    filled
                    dense
                    label="Passwort"
                    type="password"
                    v-model="selectedTenant.noreplyPassword"
                  ></v-text-field>
                </v-col>
              </v-row>
              <v-row>
                <v-col>
                  <v-text-field
                    background-color="accent"
                    filled
                    dense
                    label="E-Mail-Vorlage"
                    type="text"
                    disabled
                    v-model="selectedTenant.genericMailTemplate"
                  ></v-text-field>
                </v-col>
              </v-row>

              <h3 class="mb-5 mt-5">Zahlungsbeleg</h3>
              <v-row>
                <v-col>
                  <v-text-field
                    background-color="accent"
                    filled
                    dense
                    label="Vorlage"
                    disabled
                    v-model="selectedTenant.receiptTemplate"
                  ></v-text-field>
                </v-col>
                <v-col>
                  <v-text-field
                    background-color="accent"
                    filled
                    dense
                    label="Belegnummer Präfix"
                    v-model="selectedTenant.receiptNumberPrefix"
                  ></v-text-field>
                </v-col>
              </v-row>
              <h3 class="mb-5 mt-5">Konfiguration des Zahlungsanbieters</h3>
              <v-row>
                <v-col>
                  <v-text-field
                    background-color="accent"
                    filled
                    dense
                    disabled
                    label="Zahlungsanbieter"
                    value="S-Public Services"
                  ></v-text-field>
                </v-col>
                <v-col>
                  <v-text-field
                    background-color="accent"
                    filled
                    dense
                    label="Kunde"
                    v-model="selectedTenant.paymentMerchantId"
                  ></v-text-field>
                </v-col>
              </v-row>
              <v-row>
                <v-col>
                  <v-text-field
                    background-color="accent"
                    filled
                    dense
                    label="Projekt"
                    v-model="selectedTenant.paymentProjectId"
                  ></v-text-field>
                </v-col>
                <v-col>
                  <v-text-field
                    background-color="accent"
                    filled
                    dense
                    label="Schlüssel"
                    type="password"
                    v-model="selectedTenant.paymentSecret"
                  ></v-text-field>
                </v-col>
              </v-row>
              <v-row>
                <v-col>
                  <v-text-field
                    background-color="accent"
                    filled
                    dense
                    label="Ergänzung zum Verwendungszweck"
                    prefix="[Buchungsnummer] - "
                    :rules="validationRules.paymentPurposeSuffix"
                    v-model="selectedTenant.paymentPurposeSuffix"
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

export default {
  name: "TenantEdit",
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    tenant: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
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
    };
  },
  computed: {
    openDialog: {
      get() {
        return this.open;
      },
    },
    selectedTenant: {
      get() {
        return this.tenant;
      },
    },
  },
  watch: {
    tenant(val) {
      this.originTenantId = val.id;
    },
  },
  methods: {
    closeDialog() {
      this.$emit("close");
    },
    async submitChanges() {
      if (this.$refs.form.validate()) {
        this.inProgress = true;
        delete this.selectedTenant._id;
        await ApiTenantService.submitTenant(this.selectedTenant);
        this.inProgress = false;
        this.closeDialog();
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
