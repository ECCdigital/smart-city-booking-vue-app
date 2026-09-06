<script>
import FormatService from "@/services/FormatService";
import { accessPointLabel } from "@/utilities/access-points";

const MAX_LISTED_BOOKINGS = 10;

/**
 * Deleting an access point is one operation for a door and for a locker
 * system - in the backend both are a row in `accesspoints`, and the delete
 * detaches it from the bookables and drops the row.
 *
 * What it does not do is revoke anything at the provider, so the dialog names
 * two things: the bookables that lose the access point, and the bookings that
 * hold a granted, unrevoked access at it right now.
 */
export default {
  name: "AccessPointDeleteDialog",
  props: {
    open: { type: Boolean, default: false },
    accessPoint: { type: Object, default: null },
    // Bookables that reference this access point, named so the admin sees
    // what loses its door before confirming.
    affectedBookables: { type: Array, default: () => [] },
    // Bookings with a live access at this access point (`access-grants.js`).
    runningBookings: { type: Array, default: () => [] },
    // Whether the bookings could be read at all - "no booking holds access"
    // is a claim that may only be made when they were.
    bookingsUnreadable: { type: Boolean, default: false },
    loadingBookings: { type: Boolean, default: false },
    deleting: { type: Boolean, default: false },
    error: { type: String, default: "" },
  },
  computed: {
    label() {
      return accessPointLabel(this.accessPoint);
    },
    // At a busy locker system the list can grow long; the dialog names the
    // first few and counts the rest, so it stays a warning rather than a
    // report.
    bookingRows() {
      return this.runningBookings
        .slice(0, MAX_LISTED_BOOKINGS)
        .map((booking) => ({
          id: booking.id,
          subtitle: [booking.name, booking.mail, this.periodOf(booking)]
            .filter(Boolean)
            .join(" • "),
        }));
    },
    unlistedBookingCount() {
      return Math.max(this.runningBookings.length - MAX_LISTED_BOOKINGS, 0);
    },
  },
  methods: {
    periodOf(booking) {
      if (!booking.timeBegin || !booking.timeEnd) return "";
      return `${this.dateTime(booking.timeBegin)} – ${this.dateTime(
        booking.timeEnd
      )}`;
    },
    dateTime(value) {
      return `${FormatService.date(value)} ${FormatService.time(value)}`;
    },
  },
};
</script>

<template>
  <v-dialog
    :value="open"
    max-width="560"
    persistent
    @input="!$event && $emit('close')"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon left color="error">mdi-delete</v-icon>
        {{ $t("accessPoint.management.delete.title") }}
      </v-card-title>
      <v-divider />
      <v-card-text class="pt-4">
        <p>{{ $t("accessPoint.management.delete.question", { label }) }}</p>

        <v-alert
          v-if="affectedBookables.length > 0"
          color="warning"
          text
          dense
          class="mb-0"
        >
          <div class="font-weight-medium mb-1">
            {{ $t("accessPoint.management.delete.affectedTitle") }}
          </div>
          <ul class="affected-list">
            <li v-for="bookable in affectedBookables" :key="bookable.id">
              {{ bookable.title || bookable.id }}
            </li>
          </ul>
          <div class="text-caption mt-2">
            {{ $t("accessPoint.management.delete.affectedHint") }}
          </div>
        </v-alert>
        <div v-else class="text-caption text--secondary">
          {{ $t("accessPoint.management.delete.noneAffected") }}
        </div>

        <!-- Bookings whose access this deletion tears apart -->
        <div
          v-if="loadingBookings"
          class="text-caption text--secondary mt-4 d-flex align-center"
        >
          <v-progress-circular
            indeterminate
            size="14"
            width="2"
            class="mr-2"
            color="primary"
          />
          {{ $t("accessPoint.management.delete.bookingsLoading") }}
        </div>
        <v-alert
          v-else-if="bookingRows.length > 0"
          color="error"
          text
          dense
          class="mt-4 mb-0"
        >
          <div class="font-weight-medium mb-1">
            {{ $t("accessPoint.management.delete.bookingsTitle") }}
          </div>
          <ul class="affected-list">
            <li v-for="booking in bookingRows" :key="booking.id">
              {{ booking.id }}
              <span v-if="booking.subtitle" class="text-caption">
                – {{ booking.subtitle }}
              </span>
            </li>
          </ul>
          <div v-if="unlistedBookingCount > 0" class="text-caption mt-1">
            {{
              $t("accessPoint.management.delete.bookingsMore", {
                count: unlistedBookingCount,
              })
            }}
          </div>
          <div class="text-caption mt-2">
            {{ $t("accessPoint.management.delete.bookingsHint") }}
          </div>
        </v-alert>
        <div
          v-else-if="bookingsUnreadable"
          class="text-caption text--secondary mt-4"
        >
          {{ $t("accessPoint.management.delete.bookingsUnreadable") }}
        </div>
        <div v-else class="text-caption text--secondary mt-4">
          {{ $t("accessPoint.management.delete.bookingsNone") }}
        </div>

        <v-alert v-if="error" color="error" text dense class="mt-4 mb-0">
          <v-icon left>mdi-alert-circle</v-icon>
          {{ error }}
        </v-alert>
      </v-card-text>
      <v-divider />
      <v-card-actions>
        <v-spacer />
        <v-btn text :disabled="deleting" @click="$emit('close')">
          {{ $t("accessPoint.management.cancel") }}
        </v-btn>
        <!-- Confirming before the booking check has answered would be the
             unnoticed click this warning exists to prevent. -->
        <v-btn
          class="confirm-delete"
          color="error"
          :loading="deleting"
          :disabled="loadingBookings"
          @click="$emit('confirm')"
        >
          {{ $t("accessPoint.management.delete.confirm") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.affected-list {
  margin: 0;
  padding-left: 18px;
}
</style>
