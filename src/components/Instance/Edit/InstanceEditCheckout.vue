<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import SubSection from "@/components/commons/SubSection.vue";

export default {
  name: "InstanceEditCheckout",
  components: { SubSection, BaseSection },
  props: {
    instance: { type: Object, required: true },
  },
  data() {
    return {
      local: { ...this.instance },
    };
  },
  watch: {
    instance: {
      handler(n) {
        this.local = { ...n };
      },
      deep: true,
    },
  },
  methods: {
    emitUpdate() {
      this.$emit("update:instance", { ...this.local });
    },
  },
};
</script>

<template>
  <BaseSection
    title="Checkout"
    icon="mdi-basket"
    hint="Hier können Sie die Checkout-Optionen für diese Instanz konfigurieren."
  >
    <v-switch
      v-model="local.checkout.useLegacyCheckout"
      color="primary"
      hide-details
      label="Verwenden Sie den alten Checkout"
      @change="emitUpdate"
    ></v-switch>

    <SubSection
      title="Checkout-URL"
      icon="mdi-link-variant"
      description="Wenn Sie nicht den alten Checkout nutzen geben Sie bitte eine gültige URL ein."
    >
      <v-text-field
        background-color="accent"
        filled
        dense
        v-model="local.checkout.checkoutUrl"
        placeholder="z.B. https://checkout.example.com"
        @input="emitUpdate"
      ></v-text-field>
    </SubSection>
  </BaseSection>
</template>

<style scoped></style>
