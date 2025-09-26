<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import AppPanel from "@/components/AppPanel.vue";

export default {
  name: "TenantEditLocks",
  components: { AppPanel, BaseSection },
  props: {
    tenant: { type: Object, required: true },
    apps: { type: Object, required: true },
  },
  data() {
    return {
      valid: false,
      localTenant: { ...this.tenant },
      localApps: JSON.parse(JSON.stringify(this.apps)),
      showParevaPassword: false,
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
  watch: {
    tenant: {
      deep: true,
      handler(v) {
        this.localTenant = { ...v };
      },
    },
    apps: {
      deep: true,
      handler(v) {
        this.localApps = JSON.parse(JSON.stringify(v));
      },
    },
  },
  methods: {
    emitTenant() {
      this.$emit("update:tenant", this.localTenant);
    },
    emitApps() {
      this.$emit("update:apps", this.localApps);
    },
    async validate() {
      return this.$refs.form ? this.$refs.form.validate() : true;
    },
    resetValidation() {
      if (this.$refs.form) this.$refs.form.resetValidation();
    },
  },
};
</script>

<template>
  <BaseSection title="Schließsysteme" icon="mdi-lock">
    <v-row>
      <v-col>
        <AppPanel
          v-if="localApps.pareva"
          :title="'Pareva'"
          :logo="require('@/assets/pareva-logo.png')"
          :active="localApps.pareva.active"
        >
          <v-row>
            <v-col class="col-12">
              <v-switch
                v-model="localApps.pareva.active"
                color="primary"
                hide-details
                label="Parava aktivieren"
                class="mt-2"
                @change="emitApps()"
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
                v-model="localApps.pareva.serverUrl"
                @input="emitApps()"
              ></v-text-field>
            </v-col>
            <v-col>
              <v-text-field
                background-color="accent"
                filled
                dense
                label="Locker-ID"
                v-model="localApps.pareva.lockerId"
                @input="emitApps()"
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
                v-model="localApps.pareva.user"
                @input="emitApps()"
              ></v-text-field>
            </v-col>
            <v-col>
              <v-text-field
                background-color="accent"
                filled
                dense
                label="Passwort"
                v-model="localApps.pareva.password"
                @input="emitApps()"
                :append-icon="showParevaPassword ? 'mdi-eye' : 'mdi-eye-off'"
                @click:append="showParevaPassword = !showParevaPassword"
                :type="showParevaPassword ? 'text' : 'password'"
              ></v-text-field>
            </v-col>
          </v-row>
        </AppPanel>
      </v-col>
    </v-row>
  </BaseSection>
</template>

<style scoped></style>
