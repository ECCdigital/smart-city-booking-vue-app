<script>
export default {
  name: "CheckoutPaymentProvider",
  props: {
    activePaymentApps: {
      type: Array,
      required: true,
    },
  },
  data() {
    return {
      selectedPaymentApp: null,
    };
  },
  methods: {
    submit() {
      if (this.selectedPaymentApp) {
        this.$emit("submit", this.selectedPaymentApp);
      }
    },
    back() {
      this.$emit("back");
    },
  },
};
</script>

<template>
  <div>
    <div class="d-flex mb-5">
      <v-btn outlined small @click="back">
        <v-icon left small>mdi-arrow-left</v-icon>
        Zurück
      </v-btn>
      <v-spacer></v-spacer>
      <v-btn color="primary" class="px-10" small @click="submit">
        Weiter
      </v-btn>
    </div>

    <div class="d-flex">
      <div class="mb-0 flex-fill"><strong>ZAHLUNGSMETHODE</strong></div>
    </div>
    <v-divider class="mb-3 mt-2"></v-divider>

    <v-list-item-group>
      <v-list-item
        v-for="(method, index) in activePaymentApps"
        :key="index"
        @click="selectedPaymentApp = method.id"
      >
        <v-list-item-action>
          <v-checkbox
            v-model="selectedPaymentApp"
            :value="method.id"
          ></v-checkbox>
        </v-list-item-action>

        <v-list-item-content>
          <v-list-item-title>{{ method.title }}</v-list-item-title>
        </v-list-item-content>

      </v-list-item>
    </v-list-item-group>
  </div>
</template>

<style scoped></style>
