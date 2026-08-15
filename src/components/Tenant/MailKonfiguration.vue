<template>
  <div>
    <v-row v-if="showTemplate">
      <v-col>
        <MailTemplateStatus
          :mail-template="selectedMailConfig[templateField]"
          @submit="onSubmitTemplate"
        />
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
          :disabled="disabled"
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
          :disabled="disabled"
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
            :disabled="disabled"
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
            :disabled="disabled"
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
            :disabled="disabled"
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
            :disabled="disabled"
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
            :disabled="disabled"
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
            :disabled="disabled"
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
            :disabled="disabled"
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
            :disabled="disabled"
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
            :disabled="disabled"
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
            :disabled="disabled"
            v-model="selectedMailConfig.noreplyGraphClientSecret"
            @input="changeData"
            :append-icon="showClientSecret ? 'mdi-eye' : 'mdi-eye-off'"
            @click:append="showClientSecret = !showClientSecret"
            :type="showClientSecret ? 'text' : 'password'"
          ></v-text-field>
        </v-col>
      </v-row>
    </AppPanel>
  </div>
</template>

<script>
import MailTemplateStatus from "@/components/Tenant/MailTemplateStatus.vue";
import AppPanel from "@/components/AppPanel.vue";

export default {
  name: "MailKonfiguration",
  components: { MailTemplateStatus, AppPanel },
  props: {
    mailConfig: {
      type: Object,
      required: true,
    },
    showValidation: {
      type: Boolean,
      default: true,
    },
    showTemplate: {
      type: Boolean,
      default: true,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    templateField: {
      type: String,
      default: "genericMailTemplate",
      validator: (v) => ["genericMailTemplate", "mailTemplate"].includes(v),
    },
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
      this.$set(this.selectedMailConfig, this.templateField, newTemplate);
      this.changeData();
    },
  },
};
</script>

<style scoped></style>
