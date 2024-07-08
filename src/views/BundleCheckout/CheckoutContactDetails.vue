<template>
  <v-form ref="form" v-model="valid">
    <div class="d-flex mb-5">
      <v-btn outlined small @click="back">
        <v-icon left small>mdi-arrow-left</v-icon>
        Zurück
      </v-btn>
      <v-spacer></v-spacer>
      <v-btn
        :disabled="isNextButtonDisabled"
        color="primary"
        class="px-10"
        small
        @click="submit"
      >
        Zur Zusammenfassung
      </v-btn>
    </div>

    <div class="d-flex">
      <div class="mb-0 flex-fill"><strong>NUTZERDATEN</strong></div>
    </div>
    <v-divider class="mb-3 mt-2"></v-divider>

    <v-row>
      <v-col class="col-12">
        <v-text-field
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
      <v-col>
        <v-text-field
          hide-details
          dense
          filled
          label="Firma"
          v-model="contactDetails.company"
        ></v-text-field>
      </v-col>
    </v-row>

    <v-row>
      <v-col>
        <v-text-field
          hide-details
          dense
          filled
          label="E-Mail*"
          :rules="validationRules.mail"
          v-model="contactDetails.mail"
        ></v-text-field>
      </v-col>
      <v-col>
        <v-text-field
          hide-details
          dense
          filled
          label="Telefon"
          v-model="contactDetails.phone"
        ></v-text-field>
      </v-col>
    </v-row>

    <v-row>
      <v-col>
        <v-text-field
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
      <v-col>
        <v-text-field
          hide-details
          dense
          filled
          label="PLZ*"
          :rules="validationRules.required"
          v-model="contactDetails.zipCode"
        ></v-text-field>
      </v-col>
      <v-col>
        <v-text-field
          hide-details
          dense
          filled
          label="Ort*"
          :rules="validationRules.required"
          v-model="contactDetails.location"
        ></v-text-field>
      </v-col>
    </v-row>

    <p class="mt-5 mb-0"><strong>DETAILS</strong></p>
    <v-divider class="mb-3 mt-2"></v-divider>

    <v-textarea
      filled
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

    <v-divider class="mt-5"></v-divider>
    <span class="caption">* Pflichtfelder</span>
    <checkout-agreements v-if="leadItem && leadItem.bookable.attachments.length > 0" :agreements="leadItem.bookable.attachments" ref="checkoutAgreements"></checkout-agreements>
  </v-form>
</template>

<script>
import CheckoutAgreements from "@/views/BundleCheckout/CheckoutAgreements.vue";

export default {
  name: "CheckoutContactDetails",
  components: { CheckoutAgreements },

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
      valid: true,

      validationRules: {
        required: [(v) => !!v],
        mail: [(v) => !!v, (v) => /.+@.+\..+/.test(v)],
      },
    };
  },

  methods: {
    submit() {
      if (
        this.$refs.form.validate() &&
        this.$refs.checkoutAgreements.validate()
      ) {
        this.$emit("submit");
      }
    },

    back() {
      this.$emit("back");
    },
  },

  computed: {
    isNextButtonDisabled() {
      return !this.valid;
    },
    agreements: function () {
      return this.leadItem.bookable.attachments.filter(
        (a) => a.type === "agreement" || a.type === "privacy-agreement"
      );
    },
    commentRequired() {
      return this.leadItem.bookable.requiredFields?.includes("comment");
    },
    commentLabel() {
      return this.commentRequired
        ? "Hinweise zur Buchung*"
        : "Hinweise zur Buchung";
    },
  },
};
</script>

<style scoped></style>
