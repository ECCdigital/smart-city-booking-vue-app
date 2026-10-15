<script>
/** The plain result of a connection test: success or the failure's message. */
export default {
  name: "ConnectionTestAlert",
  props: {
    /** `{ success, message }` as `runConnectionTest` reads it. */
    result: { type: Object, required: true },
  },
};
</script>

<template>
  <v-alert :color="result.success ? 'success' : 'error'" dense text>
    <div v-if="result.success">
      <v-icon left>mdi-check-circle</v-icon>
      {{ result.message || $t("accessPoint.tenant.connectionSuccess") }}
    </div>
    <div v-else>
      <v-icon left>mdi-alert-circle</v-icon>
      {{ result.message }}
    </div>
  </v-alert>
</template>
