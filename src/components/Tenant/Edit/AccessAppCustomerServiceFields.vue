<script>
/**
 * The customer service of an access application: the contact the storefront
 * shows a booker who stands at a door or box that will not open. Shared by
 * the providers that carry one (iFBS, Nuki); the fields are all optional.
 *
 * `value` is the app's `customerService` object; every edit emits a fresh
 * copy through `input`, so the parent's `v-model` owns the state.
 */
export default {
  name: "AccessAppCustomerServiceFields",
  props: {
    value: { type: Object, required: true },
  },
  data() {
    return {
      rules: {
        mail: [
          (v) =>
            !v ||
            /.+@.+\..+/.test(v) ||
            this.$t("accessPoint.tenant.customerService.invalidEmail"),
        ],
        phone: [
          (v) =>
            !v ||
            /^[+\d][\d\s\-/()]{3,}$/.test(v) ||
            this.$t("accessPoint.tenant.customerService.invalidPhone"),
        ],
      },
    };
  },
  methods: {
    update(field, fieldValue) {
      this.$emit("input", { ...this.value, [field]: fieldValue });
    },
  },
};
</script>

<template>
  <div>
    <div class="section-title mt-6 mb-2">
      <v-icon small left>mdi-face-agent</v-icon>
      <span class="font-weight-medium">
        {{ $t("accessPoint.tenant.customerService.title") }}
      </span>
    </div>
    <v-alert type="info" text dense class="mb-3">
      {{ $t("accessPoint.tenant.customerService.hint") }}
    </v-alert>
    <v-row dense>
      <v-col cols="12" md="4">
        <v-text-field
          background-color="accent"
          filled
          dense
          :label="$t('accessPoint.tenant.customerService.name')"
          prepend-inner-icon="mdi-account"
          :value="value.name"
          @input="update('name', $event)"
        />
      </v-col>
      <v-col cols="12" md="4">
        <v-text-field
          background-color="accent"
          filled
          dense
          :label="$t('accessPoint.tenant.customerService.email')"
          prepend-inner-icon="mdi-email-outline"
          type="email"
          :rules="rules.mail"
          :value="value.email"
          @input="update('email', $event)"
        />
      </v-col>
      <v-col cols="12" md="4">
        <v-text-field
          background-color="accent"
          filled
          dense
          :label="$t('accessPoint.tenant.customerService.phone')"
          prepend-inner-icon="mdi-phone-outline"
          type="tel"
          :rules="rules.phone"
          :value="value.phone"
          @input="update('phone', $event)"
        />
      </v-col>
    </v-row>
  </div>
</template>

<style scoped>
.section-title {
  display: flex;
  align-items: center;
  font-size: 0.95rem;
  color: rgba(0, 0, 0, 0.7);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  padding-bottom: 4px;
}
.theme--dark .section-title {
  color: rgba(255, 255, 255, 0.8);
  border-bottom-color: rgba(255, 255, 255, 0.1);
}
</style>
