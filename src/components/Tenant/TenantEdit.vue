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
              <v-row>
                <v-col>
                  <v-text-field
                    background-color="accent"
                    filled
                    dense
                    label="Website"
                    :rules="validationRules.required"
                    type="text"
                    v-model="selectedTenant.website"
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
                <v-col class="">
                  <v-card
                    v-if="!!selectedTenant.genericMailTemplate"
                    flat
                    height="100"
                  >
                    <v-snackbar
                      :timeout="-1"
                      :value="true"
                      absolute
                      color="success"
                      text
                    >
                      <v-icon left> mdi-check </v-icon>
                      Es ist eine E-Mail-Vorlage hinterlegt. Um diese zu ändern,
                      wenden Sie sich bitte an den Administrator.
                    </v-snackbar>
                  </v-card>
                  <v-card v-else flat height="100">
                    <v-snackbar
                      :timeout="-1"
                      :value="true"
                      absolute
                      color="error"
                      text
                    >
                      <v-icon left> mdi-close </v-icon>
                      Es ist keine E-Mail-Vorlage hinterlegt. Um eine
                      E-Mail-Vorlage zu hinterlegen, wenden Sie sich bitte an
                      den Administrator.
                    </v-snackbar>
                  </v-card>
                </v-col>
              </v-row>
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
                  <password-field
                    v-model="selectedTenant.noreplyPassword"
                    label="Passwort"
                  ></password-field>
                </v-col>
              </v-row>

              <h3 class="mb-5 mt-5">Zahlungsbeleg</h3>
              <v-row>
                <v-col>
                  <v-card
                    v-if="!!selectedTenant.receiptTemplate"
                    flat
                    height="100"
                  >
                    <v-snackbar
                      :timeout="-1"
                      :value="true"
                      absolute
                      color="success"
                      text
                    >
                      <v-icon left> mdi-check </v-icon>
                      Es ist eine Zahlungsbeleg-Vorlage hinterlegt. Um diese zu
                      ändern, wenden Sie sich bitte an den Administrator.
                    </v-snackbar>
                  </v-card>
                  <v-card flat height="120" v-else>
                    <v-snackbar
                      :timeout="-1"
                      :value="true"
                      absolute
                      color="error"
                      text
                    >
                      <v-icon left> mdi-close </v-icon>
                      Es ist keine Zahlungsbelegvorlage hinterlegt. Um eine
                      Zahlungsbelegvorlage zu hinterlegen, wenden Sie sich bitte
                      an den Administrator.
                    </v-snackbar>
                  </v-card>
                </v-col>
              </v-row>
              <v-row>
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
                  <password-field
                    v-model="selectedTenant.paymentSecret"
                    label="Schlüssel"
                  ></password-field>
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
              <h3 class="mb-5 mt-5" v-if="parevaSystem?.active">
                Schließsysteme
              </h3>
              <v-row>
                <v-col>
                  <v-expansion-panels flat multiple>
                    <v-expansion-panel>
                      <v-expansion-panel-header
                        color="accent"
                        expand-icon="mdi-menu-down"
                        class="penal-header"
                      >
                        <template v-slot:default="{ open }">
                          <v-row no-gutters align="center">
                            <v-col cols="4">
                              <span class="text-subtitle-1"> Pareva </span>
                            </v-col>
                            <v-col class="col-2">
                              <v-fade-transition leave-absolute>
                                <div v-if="!open">
                                  <v-icon
                                    v-if="parevaSystem?.active"
                                    color="success"
                                    >mdi-check</v-icon
                                  >
                                  <span v-if="parevaSystem?.active" class="ml-2"
                                    >Aktiv</span
                                  >

                                  <v-icon
                                    v-if="parevaSystem?.active === false"
                                    color="error"
                                    >mdi-close</v-icon
                                  >
                                  <span
                                    v-if="parevaSystem?.active === false"
                                    class="ml-2"
                                    >Inaktiv</span
                                  >
                                </div>
                              </v-fade-transition>
                            </v-col>
                          </v-row>
                        </template>
                      </v-expansion-panel-header>
                      <v-expansion-panel-content class="mt-3">
                        <v-row>
                          <v-col class="col-12">
                            <v-switch
                              v-model="parevaSystem.active"
                              color="primary"
                              hide-details
                              label="Parava aktivieren"
                              class="mt-2"
                            ></v-switch>
                          </v-col>
                        </v-row>
                        <v-row>
                          <v-col>
                            <v-text-field
                              background-color="accent"
                              filled
                              dense
                              label="Server-URL"
                              v-model="parevaSystem.serverUrl"
                            ></v-text-field>
                          </v-col>
                          <v-col>
                            <v-text-field
                              background-color="accent"
                              filled
                              dense
                              label="Locker-ID"
                              v-model="parevaSystem.lockerId"
                            ></v-text-field>
                          </v-col>
                        </v-row>
                        <v-row>
                          <v-col>
                            <v-text-field
                              background-color="accent"
                              filled
                              dense
                              label="Benutzername"
                              v-model="parevaSystem.user"
                            ></v-text-field>
                          </v-col>
                          <v-col>
                            <password-field
                              v-model="parevaSystem.password"
                            ></password-field>
                          </v-col>
                        </v-row>
                      </v-expansion-panel-content>
                    </v-expansion-panel>
                  </v-expansion-panels>
                </v-col>
              </v-row>

              <h3 class="mb-5 mt-5">Buchungskonfiguration</h3>
              <v-row>
                <v-col class="col-12 col-md-6">
                  <v-text-field
                    background-color="accent"
                    filled
                    dense
                    label="Vorausbuchungen möglich bis"
                    type="number"
                    suffix="Monate"
                    v-model="selectedTenant.maxBookingMonths"
                  >
                  </v-text-field>
                </v-col>
              </v-row>
              <h3 class="mb-5 mt-5">Events</h3>
              <v-row>
                <v-col>
                  <v-card flat height="120">
                    <v-snackbar
                      :timeout="-1"
                      :value="true"
                      absolute
                      color="info"
                      text
                    >
                      <v-icon color="info" left>
                        mdi-information-outline
                      </v-icon>
                      <span>
                        Mit dieser Option können Sie das Erstellen einer
                        Veranstaltung standardmäßig auf den einfachen Modus
                        umstellen. Dieser Modus ist für die meisten
                        Anwendungsfälle ausreichend. Das Erstellen einer
                        detaillierte Veranstaltung lässt sich weiterhin über den
                        "Veranstaltung Erstellen" Knopf auswählen.
                      </span>
                    </v-snackbar>
                  </v-card>
                </v-col>
              </v-row>
              <v-row>
                <v-col class="col-12 col-md-6">
                  <v-switch
                    v-model="eventCreationMode"
                    color="primary"
                    hide-details
                    label="Einfacher Event-Modus"
                    class="mt-2"
                  >
                  </v-switch>
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
import PasswordField from "@/components/CommonComponents/PasswordField.vue";

export default {
  name: "TenantEdit",
  components: { PasswordField },
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
      test: "",
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
    parevaSystem: {
      get() {
        return (
          this.selectedTenant.applications?.find(
            (app) => app.id === "pareva"
          ) || {}
        );
      },
    },
    eventCreationMode: {
      get() {
        const mode = this.selectedTenant.defaultEventCreationMode;
        return mode === "simple";
      },
      set(value) {
        this.$set(
          this.selectedTenant,
          "defaultEventCreationMode",
          value ? "simple" : "detailed"
        );
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
        try {
          await ApiTenantService.submitTenant(this.selectedTenant);
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
