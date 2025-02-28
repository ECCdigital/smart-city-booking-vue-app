<template>
  <div>
    <v-row v-if="showValidation">
      <v-col class="">
        <v-card
          v-if="!!selectedMailConfig.genericMailTemplate"
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
          :rules="showValidation? validationRules.mail : []"
          v-model="selectedMailConfig.noreplyMail"
          @input="changeData"
        ></v-text-field>
      </v-col>
      <v-col>
        <v-text-field
          background-color="accent"
          filled
          dense
          label="Anzeigename"
          v-model="selectedMailConfig.noreplyDisplayName"
          @input="changeData"
        ></v-text-field>
      </v-col>
    </v-row>

    <v-row>
      <v-col>
        <h4 class="mb-2">E-Mail-Versandmethoden </h4>
      </v-col>
    </v-row>
    <v-expansion-panels>
      <v-expansion-panel>
        <v-expansion-panel-header
          color="accent"
          expand-icon="mdi-menu-down"
          class="panel-header"
        >
          <template v-slot:default="{ open }">
            <v-row no-gutters align="center">
              <v-col cols="4">
                          <span class="text-subtitle-1">
                            SMTP
                          </span>
              </v-col>
              <v-col class="col-2">
                <v-fade-transition leave-absolute>
                  <div v-if="!open">
                    <v-icon
                      v-if="!selectedMailConfig.noreplyUseGraphApi"
                      color="success"
                    >mdi-check</v-icon
                    >
                    <span
                      v-if="!selectedMailConfig.noreplyUseGraphApi"
                      class="ml-2"
                    >Aktiv</span
                    >

                    <v-icon
                      v-if="selectedMailConfig.noreplyUseGraphApi"
                      color="error"
                    >mdi-close</v-icon
                    >
                    <span v-if="selectedMailConfig.noreplyUseGraphApi" class="ml-2"
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
                v-model="selectedMailConfig.noreplyUseGraphApi"
                color="primary"
                hide-details
                :true-value="false"
                :false-value="true"
                label="SMTP als E-Mail-Versandmethode aktivieren"
                class="mt-2"
                @change="changeData"
              ></v-switch>
            </v-col>
          </v-row>
          <v-row>
            <v-col class="">
              <v-text-field
                background-color="accent"
                filled
                dense
                label="SMTP-Server"
                v-model="selectedMailConfig.noreplyHost"
                @input="changeData"
              ></v-text-field>
            </v-col>
            <v-col class="col-md-2">
              <v-text-field
                background-color="accent"
                filled
                dense
                label="Port"
                v-model="selectedMailConfig.noreplyPort"
                @input="changeData"
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col class="">
              <v-text-field
                background-color="accent"
                filled
                dense
                hide-details
                label="Benutzername"
                v-model="selectedMailConfig.noreplyUser"
                @input="changeData"
              ></v-text-field>
            </v-col>
            <v-col class="">
              <v-text-field
                background-color="accent"
                filled
                dense
                hide-details
                label="Passwort"
                v-model="selectedMailConfig.noreplyPassword"
                @input="changeData"
                :append-icon="
                            showNoreplyPassword ? 'mdi-eye' : 'mdi-eye-off'
                          "
                @click:append="
                            showNoreplyPassword = !showNoreplyPassword
                          "
                :type="showNoreplyPassword ? 'text' : 'password'"
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col>
              <v-switch
                v-model="selectedMailConfig.noreplyStarttls"
                @change="changeData"
                color="primary"
                label="StartTLS aktivieren"
                hide-details
              ></v-switch>
            </v-col>
          </v-row>
        </v-expansion-panel-content>
      </v-expansion-panel>
      <v-expansion-panel>
        <v-expansion-panel-header
          color="accent"
          expand-icon="mdi-menu-down"
          class="panel-header"
        >
          <template v-slot:default="{ open }">
            <v-row no-gutters align="center">
              <v-col cols="4">
                <span class="text-subtitle-1"> Graph Api (Office365) </span>
              </v-col>
              <v-col class="col-2">
                <v-fade-transition leave-absolute>
                  <div v-if="!open">
                    <v-icon
                      v-if="selectedMailConfig.noreplyUseGraphApi"
                      color="success"
                    >mdi-check</v-icon
                    >
                    <span v-if="selectedMailConfig.noreplyUseGraphApi" class="ml-2"
                    >Aktiv</span
                    >

                    <v-icon
                      v-if="!selectedMailConfig.noreplyUseGraphApi"
                      color="error"
                    >mdi-close</v-icon
                    >
                    <span
                      v-if="!selectedMailConfig.noreplyUseGraphApi"
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
                v-model="selectedMailConfig.noreplyUseGraphApi"
                color="primary"
                hide-details
                label="Graph Api als E-Mail-Versandmethode aktivieren"
                class="mt-2"
                @change="changeData"
              ></v-switch>
            </v-col>
          </v-row>
          <v-row>
            <v-col class="">
              <v-text-field
                background-color="accent"
                filled
                dense
                label="Tenant ID"
                v-model="selectedMailConfig.noreplyGraphTenantId"
                @input="changeData"
              ></v-text-field>
            </v-col>
            <v-col class="">
              <v-text-field
                background-color="accent"
                filled
                dense
                label="Client ID"
                v-model="selectedMailConfig.noreplyGraphClientId"
                @input="changeData"
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col class="">
              <v-text-field
                background-color="accent"
                filled
                dense
                label="Client Secret"
                v-model="selectedMailConfig.noreplyGraphClientSecret"
                @input="changeData"
                :append-icon="
                            showClientSecret ? 'mdi-eye' : 'mdi-eye-off'
                          "
                @click:append="
                            showClientSecret = !showClientSecret
                          "
                :type="showClientSecret ? 'text' : 'password'"
              ></v-text-field>
            </v-col>
          </v-row>
        </v-expansion-panel-content>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>

<script>
export default {
  name: "MailKonfiguration",
  props: {
    mailConfig: {
      type: Object,
      required: true,
    },
    showValidation: {
      type: Boolean,
      default: true,
    }
  },
  data() {
    return {
      showNoreplyPassword: false,
      showClientSecret: false,
      validationRules: {
        mail: [
          (v) => !!v || "Pflichtfeld",
          (v) => /.+@.+\..+/.test(v) || "Muss gültige Email-Adresse sein.",
        ],
      },
    }
  },
  computed: {
    selectedMailConfig: {
      get() {
        return this.mailConfig;
      },
    },
  },
  methods: {
    changeData() {
      this.$emit("update", this.selectedMailConfig)
    }
  }
}
</script>

<style scoped></style>
