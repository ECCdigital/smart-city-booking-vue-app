<template>
  <v-btn
    text
    small
    color="primary"
    class="tenant-bookings-link"
    data-test="tenant-bookings-link"
    @click="open"
  >
    <v-icon left small>mdi-calendar-search</v-icon>
    <slot />
  </v-btn>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import ToastService from "@/services/ToastService";

/**
 * The admin booking list of another tenant, for the instance owner: the
 * list works in the current tenant, so the tenant becomes the current one
 * first - with a word when that is a switch, as the review queue's "Zum
 * Angebot" does. No endpoint of its own. The label is the caller's.
 */
export default {
  name: "TenantBookingsLink",
  props: {
    /** At least `{ id, name }`. */
    tenant: { type: Object, required: true },
  },
  computed: {
    ...mapGetters({ currentTenantId: "tenants/currentTenantId" }),
  },
  methods: {
    ...mapActions({ selectTenant: "tenants/select", addToast: "toasts/add" }),
    async open() {
      const previousTenantId = this.currentTenantId;
      await this.selectTenant(this.tenant.id);
      if (previousTenantId && previousTenantId !== this.tenant.id) {
        this.addToast(
          ToastService.createToast(
            "booking.page.tenant-switched",
            "info",
            5000,
            { name: this.tenant.name || this.tenant.id }
          )
        );
      }
      this.$router.push({ name: "bookings" });
    },
  },
};
</script>

<style scoped>
/* The app's buttons capitalise every word (!important, variables.scss);
   the label is a phrase, so the override needs the same weight. */
.tenant-bookings-link {
  text-transform: none !important;
  letter-spacing: normal;
}
</style>
