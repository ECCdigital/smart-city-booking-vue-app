<script>
export default {
  name: "PasswordField",
  props: {
    value: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      default: "Passwort",
    },
    color: {
      type: String,
      default: "accent",
    },
  },
  data() {
    return {
      password: this.value,
      show: false,
    };
  },
  methods: {
    updateValue() {
      this.$emit("input", this.password);
    },
  },
}
</script>

<template>
  <v-text-field
    :background-color="color"
    filled
    dense
    :label="label"
    v-model="password"
    @input="updateValue"
    :append-icon="show ? 'mdi-eye' : 'mdi-eye-off'"
    @click:append="show = !show"
    :type="show ? 'text' : 'password'"
  ></v-text-field>
</template>

<style scoped>

</style>
