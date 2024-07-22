<script>
export default {
  name: "CheckoutAgreements",
  props: {
    agreements: {
      type: Array,
      required: true,
    },
  },
  data() {
    return {
      valid: true,
      validationRules: {
        required: [(v) => !!v],
      },
    };
  },
  computed: {
    filteredAgreements() {
      return this.agreements.filter((agreement) => agreement.show);
    },
  },
  methods: {
    validate() {
      return this.$refs.form.validate();
    },
  },
  created() {
    this.agreements.forEach((agreement) => {
      if (agreement.accepted === undefined) {
        this.$set(agreement, "accepted", false);
      }
    });
  },
};
</script>

<template>
  <v-form ref="form" v-model="valid">
    <section class="agreements mt-5" v-if="filteredAgreements.length > 0">
      <p>
        Um dieses Objekt zu buchen, bestätigen Sie bitte, dass Sie die
        nachfolgenden Vereinbarungen gelesen haben und diese akzeptieren.
      </p>
      <v-checkbox
        v-for="agreement in filteredAgreements"
        :key="agreement.url"
        v-model="agreement.accepted"
        :rules="agreement.required ? validationRules.required : []"
        hide-details
        :color="agreement.required ? 'error' : 'primary'"
      >
        <div slot="label">
          {{ agreement.caption }}
          <span v-if="agreement.required">*</span> (<a
            :href="agreement.url"
            target="_blank"
            @click.stop
            >{{ agreement.title }}</a
          >)
        </div>
      </v-checkbox>
    </section>
  </v-form>
</template>

<style scoped></style>
