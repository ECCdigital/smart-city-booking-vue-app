<script>
import BaseSection from "@/components/commons/BaseSection.vue";

export default {
  name: "TenantEditBooking",
  components: { BaseSection },
  props: {
    tenant: { type: Object, required: true },
  },
  data() {
    return {
      valid: false,
      localTenant: { ...this.tenant },
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
  },
  methods: {
    emitTenant() {
      this.$emit("update:tenant", this.localTenant);
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
  <BaseSection title="Buchungskonfiguration" icon="mdi-calendar">
    <v-row>
      <v-col class="col-12 col-md-6">
        <v-text-field
          background-color="accent"
          filled
          dense
          label="Vorausbuchungen möglich bis"
          type="number"
          suffix="Monate"
          v-model="localTenant.maxBookingAdvanceInMonths"
          @input="emitTenant()"
        >
        </v-text-field>
      </v-col>
    </v-row>
    <v-switch
      v-model="localTenant.notifyOnNewBooking"
      color="primary"
      hint="Sofern aktiviert, erhält der Mandant eine E-Mail bei jeder neuen Buchung."
      persistent-hint
      label="Benachrichtigung bei neuer Buchung"
      class="mt-2"
      @change="emitTenant()"
    ></v-switch>
    <v-switch
      v-model="localTenant.notifySupervisorsOnBooking"
      color="primary"
      hint="Sofern aktiviert, werden bei Buchungen die an den Mitgliedern hinterlegten Benachrichtigungsempfänger (z. B. Vorgesetzte) automatisch per E-Mail informiert."
      persistent-hint
      label="Vorgesetzte bei Buchung informieren"
      class="mt-2"
      @change="emitTenant()"
    ></v-switch>
    <v-switch
      v-model="localTenant.enablePublicStatusView"
      color="primary"
      hint="Sofern aktiviert, kann der Status einer Buchung öffentlich abgefragt werden."
      persistent-hint
      label="Öffentlicher Buchungsstatus"
      class="mt-2"
      @change="emitTenant()"
    >
    </v-switch>
  </BaseSection>
</template>

<style scoped></style>
