<template>
  <AdminLayout scroll-body :title="pageTitle" class="booking-edit-page">
    <template #page-header>
      <div class="booking-page__toolbar d-flex align-center flex-wrap mt-1">
        <v-btn text small class="booking-edit-page__back px-0" @click="goBack">
          <v-icon left small>mdi-arrow-left</v-icon>
          {{ backLabel }}
        </v-btn>
        <span class="mx-2 grey--text">·</span>
        <span class="text-body-2 grey--text text--darken-2">
          {{ $t("booking.page.tenant", { name: tenantName }) }}
        </span>
      </div>
    </template>

    <v-skeleton-loader v-if="loading" type="article" />

    <template v-else-if="ready">
      <v-alert v-if="bookablesForbidden" type="warning" text class="mb-4">
        {{ $t("booking.edit.hints.bookablesForbidden") }}
      </v-alert>

      <BookingEdit
        :booking="booking"
        :bookables="bookables"
        :workflow="workflow"
        :group-booking="groupBooking"
        @saved="onSaved"
        @reload="reloadBooking"
        @cancel="leave"
      />
    </template>
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
import { isForbiddenError } from "@/services/api/apiErrorMessage";
import { createEmptyBooking } from "@/utils/bookingForm";
import { bookingPageRoute } from "@/utils/bookingPageRoutes";
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
      bookablesForbidden: false,
      workflow: {},
    };
  },
  computed: {
    ...mapGetters({
      tenantId: "tenants/currentTenantId",
      currentTenant: "tenants/currentTenant",
    }),
    tenantName() {
      return this.currentTenant?.name || this.tenantId;
    },
    /** Editing leads back to the booking's page; creating, to the list. */
    backLabel() {
      return this.isCreate
        ? this.$t("booking.page.back")
        : this.$t("booking.edit.back-to-booking");
    },
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
    /**
     * Leaving on purpose - "Zurück", "Abbrechen", a save - returns to the
     * booking's page; a booking that failed to load still leaves for the
     * list through `goBack`.
     */
    leave() {
      if (this.isCreate) {
        this.goBack();
        return;
      }
      this.$router.push(bookingPageRoute(this.bookingId, this.tenantId));
    },
    onSaved() {
      this.leave();
    },
    /**
     * Refetch the booking after a transition the backend refused with 409 or
     * 404 (spec E5), without leaving the screen: the editor keeps its inline
     * message and takes the fresh state through its `booking` prop. A
     * booking that cannot be read any more leaves the screen the way `load`
     * does.
     */
    async reloadBooking() {
      if (this.isCreate) return;

      try {
        await this.fetchBooking();
      } catch (error) {
        console.error(error);
        this.goBack();
      }
    },
    async fetchBooking() {
      const response = await ApiBookingService.getBooking(
        this.bookingId,
        undefined,
        true
      );
      this.booking = response.data;
      await this.loadGroupBooking();
    },
    async load() {
      if (!this.tenantId) return;

      this.loading = true;
      this.ready = false;
      this.groupBooking = null;
      this.bookablesForbidden = false;

      try {
        const [bookables, workflow] = await Promise.all([
          this.loadBookables(),
          ApiWorkflowService.getWorkflowStates(),
        ]);
        this.bookables = bookables;
        this.workflow = workflow;

        if (this.isCreate) {
          this.booking = createEmptyBooking(this.tenantId);
        } else {
          await this.fetchBooking();
        }

        this.ready = true;
      } catch (error) {
        console.error(error);
        this.goBack();
      } finally {
        this.loading = false;
      }
    },
    /**
     * A denied bookable list is not a reason to throw the user out of the
     * editor - it only empties the object picker, and the screen says so. Every
     * other failure (network, 5xx) still rejects and `load` leaves as before.
     */
    async loadBookables() {
      try {
        const response = await ApiBookablesService.getBookables(
          this.tenantId,
          true
        );
        return response.data;
      } catch (error) {
        if (!isForbiddenError(error)) throw error;
        this.bookablesForbidden = true;
        return [];
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
.booking-edit-page__back {
  letter-spacing: normal;
  text-transform: none;
}
</style>
