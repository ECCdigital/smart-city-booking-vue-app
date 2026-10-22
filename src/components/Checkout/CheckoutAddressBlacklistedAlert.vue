<template>
  <v-alert
    type="error"
    outlined
    text
    class="rounded-sm"
    data-test="address-blacklisted"
  >
    <div class="font-weight-bold">
      {{ $t(`checkout.address_blacklisted.${keys.title}`) }}
    </div>
    <i18n
      :path="`checkout.address_blacklisted.${keys.notice}`"
      tag="p"
      class="mb-0"
    >
      <template #contact>
        <span v-if="mailAddress">
          <!-- Wraps as a whole first, breaks only when longer than a line. -->
          <a
            :href="`mailto:${mailAddress}`"
            class="font-weight-bold mail-address"
            >{{ mailAddress }}</a
          ><v-btn
            icon
            x-small
            class="ml-1"
            :aria-label="$t('checkout.address_blacklisted.copy')"
            :title="$t('checkout.address_blacklisted.copy')"
            @click="copyMailAddress"
          >
            <v-icon x-small>mdi-content-copy</v-icon>
          </v-btn>
        </span>
        <template v-else>{{
          $t("checkout.address_blacklisted.operator")
        }}</template>
      </template>
    </i18n>
  </v-alert>
</template>

<script>
import { mapActions } from "vuex";

/**
 * The refusal of an address on the blacklist (ECCdigital/tickets#627) in the
 * legacy checkout: it stays where the booking is sent, and the instance's
 * mail address in it opens a mail or is copied. Without one it names the
 * operator of the offer. The registration (ECCdigital/tickets#628) shows
 * it with a title and a notice of its own.
 */
export default {
  name: "CheckoutAddressBlacklistedAlert",

  props: {
    /** The instance's mail address from the refusal, trimmed; empty without one. */
    mailAddress: { type: String, default: "" },
    /** The refusal of a registration instead of a booking. */
    registration: { type: Boolean, default: false },
  },

  computed: {
    keys() {
      return this.registration
        ? { title: "registrationTitle", notice: "registrationNotice" }
        : { title: "title", notice: "notice" };
    },
  },

  methods: {
    ...mapActions({ addToast: "toasts/add" }),

    async copyMailAddress() {
      try {
        await navigator.clipboard.writeText(this.mailAddress);
        this.addToast({
          message: this.$t("checkout.address_blacklisted.copied"),
          type: "success",
        });
      } catch {
        this.addToast({
          message: this.$t("checkout.address_blacklisted.copyFailed"),
          type: "error",
        });
      }
    },
  },
};
</script>

<style scoped>
.mail-address {
  overflow-wrap: anywhere;
  user-select: all;
}
</style>
