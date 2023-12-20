<template>
  <v-form ref="form" v-model="valid">
    <v-btn outlined small class="mb-5" @click="back">
      <v-icon left small>mdi-arrow-left</v-icon>
      Zurück
    </v-btn>

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
          v-model="parentBookingAttempt.name"
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
          v-model="parentBookingAttempt.company"
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
          v-model="parentBookingAttempt.mail"
        ></v-text-field>
      </v-col>
      <v-col>
        <v-text-field
          hide-details
          dense
          filled
          label="Telefon"
          v-model="parentBookingAttempt.phone"
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
          v-model="parentBookingAttempt.street"
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
          v-model="parentBookingAttempt.zipCode"
        ></v-text-field>
      </v-col>
      <v-col>
        <v-text-field
          hide-details
          dense
          filled
          label="Ort*"
          :rules="validationRules.required"
          v-model="parentBookingAttempt.location"
        ></v-text-field>
      </v-col>
    </v-row>

    <p class="mt-5 mb-0"><strong>DETAILS</strong></p>
    <v-divider class="mb-3 mt-2"></v-divider>

    <v-textarea
      filled
      label="Hinweise zur Buchung"
      hide-details
      dense
      v-model="parentBookingAttempt.comment"
    ></v-textarea>

    <section class="agreements mt-5" v-if="agreements.length > 0">
      <p>
        Um dieses Objekt zu buchen, bestätigen Sie bitte, dass Sie die
        nachfolgenden Vereinbarungen gelesen haben und diese akzeptieren.
      </p>
      <v-checkbox
        v-for="agreement in agreements"
        :key="agreement.id"
        :rules="validationRules.required"
        hide-details
      >
        <div slot="label">
          {{ agreement.title }} (<a :href="agreement.url" target="_blank" @click.stop>zur Vereinbarung</a>)
        </div>
      </v-checkbox>
    </section>
    <div class="mb-15"></div>

    <v-btn
      color="primary"
      large
      @click="submit"
      :loading="isSubmitting"
      block
      >
      <span v-if="bookable.autoCommitBooking">Buchung abschließen</span>
      <span v-if="!bookable.autoCommitBooking">Buchungsanfrage senden</span>
    </v-btn>
  </v-form>
</template>

<script>

export default {
  name: "CheckoutContactDetails",

  props: ["bookingAttempt", "bookable", "isSubmitting"],

  data() {
    return {
      valid: true,

      parentBookingAttempt: this.bookingAttempt,

      validationRules: {
        required: [
          v => !!v
        ],
        mail: [
          v => !! v,
          v => /.+@.+\..+/.test(v)
        ]
      }
    }
  },

  methods: {
    submit() {
      if (this.$refs.form.validate()) {
        this.$emit("submit");
      }
    },

    back() {
      this.$emit("back");
    },
  },

  computed: {
    agreements: function() {
      return this.bookable.attachments.filter(a => a.type == "agreement" || a.type == "privacy-agreement");
    },
  }
};
</script>

<style scoped></style>
