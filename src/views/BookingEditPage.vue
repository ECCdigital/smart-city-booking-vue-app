<template>
  <AdminLayout scroll-body>

    <v-skeleton-loader v-if="loading" type="article" />

    <BookingEdit
      v-else-if="ready"
      :booking="booking"
      :bookables="bookables"
      :workflow="workflow"
      :group-booking="groupBooking"
      @saved="onSaved"
      @cancel="goBack"
    />
  </AdminLayout>
</template>

<script>
import AdminLayout from "@/layouts/Admin.vue";
import BookingEdit from "@/components/Booking/BookingEdit.vue";
import ApiBookingService from "@/services/api/ApiBookingService";
import ApiBookablesService from "@/services/api/ApiBookablesService";
import ApiGroupBookingService from "@/services/api/ApiGroupBookingService";
import ApiWorkflowService from "@/services/api/ApiWorkflowService";
import BookingPermissionService from "@/services/permissions/BookingPermissionService";
import { createEmptyBooking } from "@/utils/bookingForm";
import { mapGetters } from "vuex";

export default {
  name: "BookingEditPage",
  components: { AdminLayout, BookingEdit },
  data() {
    return {
      loading: true,
      ready: false,
      booking: null,
      groupBooking: null,
      bookables: [],
      workflow: {},
    };
  },
  computed: {
    ...mapGetters({
      tenantId: "tenants/currentTenantId",
    }),
    isCreate() {
      return this.$route.name === "booking-create";
    },
    bookingId() {
      return this.$route.params.bookingId;
    },
    pageTitle() {
      return this.isCreate ? "Neue Buchung anlegen" : "Buchung bearbeiten";
    },
  },
  watch: {
    "$route.fullPath"() {
      this.load();
    },
    tenantId() {
      this.load();
    },
  },
  async mounted() {
    if (this.isCreate && !BookingPermissionService.allowCreate()) {
      this.goBack();
      return;
    }
    await this.load();
  },
  methods: {
    goBack() {
      this.$router.push({ name: "bookings" });
    },
    onSaved() {
      this.goBack();
    },
    async load() {
      if (!this.tenantId) return;

      this.loading = true;
      this.ready = false;
      this.groupBooking = null;

      try {
        const [bookablesRes, workflow] = await Promise.all([
          ApiBookablesService.getBookables(this.tenantId, true),
          ApiWorkflowService.getWorkflowStates(),
        ]);
        this.bookables = bookablesRes.data;
        this.workflow = workflow;

        if (this.isCreate) {
          this.booking = createEmptyBooking(this.tenantId);
        } else {
          const response = await ApiBookingService.getBooking(
            this.bookingId,
            undefined,
            true
          );
          this.booking = response.data;
          await this.loadGroupBooking();
        }

        this.ready = true;
      } catch (error) {
        console.error(error);
        this.goBack();
      } finally {
        this.loading = false;
      }
    },
    async loadGroupBooking() {
      try {
        const response = await ApiGroupBookingService.getGroupBookings(
          this.tenantId,
          true
        );
        const match = (response.data || []).find((group) =>
          group.bookingIds?.includes(this.bookingId)
        );
        this.groupBooking = match || null;
      } catch (error) {
        console.error(error);
        this.groupBooking = null;
      }
    },
  },
  metaInfo() {
    return { title: this.pageTitle };
  },
};
</script>

<style scoped>
.booking-edit-back {
  min-width: 0 !important;
  height: auto !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
  letter-spacing: normal;
  text-transform: none;
}
</style>
