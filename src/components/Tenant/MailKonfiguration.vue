<template>
  <div>
    <v-row>
      <v-col class="">
        <v-card
          v-if="!!selectedMailConfig.genericMailTemplate"
          color="success lighten-5"
          class="rounded"
        >
          <v-card-text
            class="success--text text--darken-1 d-flex justify-space-between align-center"
          >
            <div>
              <v-icon left> mdi-check </v-icon>
              Es ist eine E-Mail-Vorlage hinterlegt.
            </div>

            <v-btn small outlined @click="showEditTemplateDialog = true"
              >bearbeiten</v-btn
            >
          </v-card-text>
        </v-card>
        <v-card v-else color="error lighten-5" class="rounded">
          <v-card-text
            class="error--text text--darken-1 d-flex justify-space-between align-center"
          >
            <div>
              <v-icon left> mdi-check </v-icon>
              Es ist keine E-Mail-Vorlage hinterlegt.
            </div>

            <v-btn small outlined @click="showEditTemplateDialog = true"
              >bearbeiten</v-btn
            >
          </v-card-text>
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
          :rules="showValidation ? validationRules.mail : []"
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
        <h4 class="mb-2">E-Mail-Versandmethoden</h4>
      </v-col>
    </v-row>

    <AppPanel
      :title="'SMTP'"
      icon=""
      :active="!selectedMailConfig.noreplyUseGraphApi"
      class="mb-2"
    >
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
            :append-icon="showNoreplyPassword ? 'mdi-eye' : 'mdi-eye-off'"
            @click:append="showNoreplyPassword = !showNoreplyPassword"
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
    </AppPanel>

    <AppPanel
      title="Graph Api (Office365)"
      icon=""
      :active="selectedMailConfig.noreplyUseGraphApi"
    >
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
            :append-icon="showClientSecret ? 'mdi-eye' : 'mdi-eye-off'"
            @click:append="showClientSecret = !showClientSecret"
            :type="showClientSecret ? 'text' : 'password'"
          ></v-text-field>
        </v-col>
      </v-row>
    </AppPanel>
    <MailTemplateDialog
      :open="showEditTemplateDialog"
      :mail-template="selectedMailConfig.genericMailTemplate"
      @submit="onSubmitTemplate"
      @close="showEditTemplateDialog = false"
    ></MailTemplateDialog>
  </div>
</template>

<script>
import MailTemplateDialog from "@/components/Tenant/MailTemplateDialog.vue";
import AppPanel from "@/components/AppPanel.vue";

export default {
  name: "MailKonfiguration",
  components: { MailTemplateDialog, AppPanel },
  props: {
    mailConfig: {
      type: Object,
      required: true,
    },
    showValidation: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      showNoreplyPassword: false,
      showClientSecret: false,
      showEditTemplateDialog: false,
      validationRules: {
        mail: [
          (v) => !!v || "Pflichtfeld",
          (v) => /.+@.+\..+/.test(v) || "Muss gültige Email-Adresse sein.",
        ],
      },
    };
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
      this.$emit("update", this.selectedMailConfig);
    },
    onSubmitTemplate(newTemplate) {
      this.selectedMailConfig.genericMailTemplate = newTemplate;
      this.showEditTemplateDialog = false;
      this.changeData();
    },
  },
};
</script>

<style scoped></style>
