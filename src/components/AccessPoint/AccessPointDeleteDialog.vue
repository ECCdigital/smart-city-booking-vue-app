<script>
import FormatService from "@/services/FormatService";
import { accessPointLabel } from "@/utilities/access-points";
import { accessPointKind } from "@/utilities/access-point-fields";
import { createLockAndAccessAppDefaults } from "@/utilities/access-apps";

// The sentence names this many bookables and counts the rest.
const MAX_NAMED_BOOKABLES = 3;

/**
 * Deleting an access point is one operation for a door and for a locker
 * system - in the backend both are a row in `accesspoints`, and the delete
 * detaches it from the bookables and drops the row.
 *
 * What it does not do is revoke anything at the provider. So the dialog asks
 * in its title and says in one sentence per consequence what the deletion
 * does (ECCdigital/tickets#1112): the bookables that lose the access point,
 * and the running bookings that keep their access at the provider, folded
 * out under „Welche?“.
 */
export default {
  name: "AccessPointDeleteDialog",
  props: {
    open: { type: Boolean, default: false },
    accessPoint: { type: Object, default: null },
    // Bookables that reference this access point, named so the admin sees
    // what loses its door before confirming; `null` where they could not be
    // read.
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
  data() {
    return {
      // The running bookings fold out under „Welche?“.
      showRunning: false,
    };
  },
  computed: {
    label() {
      return accessPointLabel(this.accessPoint);
    },
    // „door“, „lockerSystem“ or „fixedCompartment“: what the bookables lose.
    kind() {
      return accessPointKind(this.accessPoint);
    },
    bookables() {
      return this.affectedBookables || [];
    },
    // „A“, „A und B“, „A, B und C“, „A, B, C und 2 weitere“.
    bookableNames() {
      const titles = this.bookables.map(
        (bookable) => bookable.title || bookable.id
      );
      const named = titles.slice(0, MAX_NAMED_BOOKABLES);
      const rest = titles.length - named.length;
      if (rest > 0) {
        return this.t("names.more", { names: named.join(", "), count: rest });
      }
      if (named.length < 2) return named.join("");
      return this.t("names.last", {
        names: named.slice(0, -1).join(", "),
        last: named[named.length - 1],
      });
    },
    // Only a check that answered may say that no booking is affected.
    nothingAffected() {
      return (
        !this.loadingBookings &&
        !this.bookingsUnreadable &&
        !!this.affectedBookables &&
        !this.affectedBookables.length &&
        !this.runningBookings.length
      );
    },
    // Where the grants of the running bookings stay.
    providerTitle() {
      const provider = this.accessPoint?.provider;
      return createLockAndAccessAppDefaults()[provider]?.title || provider;
    },
  },
  watch: {
    open(open) {
      if (open) this.showRunning = false;
    },
  },
  methods: {
    t(key, params) {
      return this.$t(`accessPoint.management.delete.${key}`, params);
    },
    // The sentences differ in the verb, so each number has its own key.
    number(count) {
      return count === 1 ? "one" : "other";
    },
    until(booking) {
      return this.t("until", { time: FormatService.dateTime(booking.timeEnd) });
    },
  },
};
</script>

<template>
  <v-dialog
    :value="open"
    max-width="480"
    persistent
    scrollable
    @input="!$event && $emit('close')"
  >
    <v-card>
      <v-card-title class="d-flex align-center py-4 px-6">
        <v-icon left color="error">mdi-alert</v-icon>
        <span class="text-h5">{{ t("title", { label }) }}</span>
        <v-spacer />
        <v-btn icon :disabled="deleting" @click="$emit('close')">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-6">
        <div
          v-if="nothingAffected"
          class="consequence"
          data-test="delete-consequence"
        >
          <v-icon small color="success" class="consequence-icon">
            mdi-check
          </v-icon>
          <span>{{ t("nothing") }}</span>
        </div>

        <div
          v-if="!affectedBookables"
          class="consequence text--secondary"
          data-test="delete-consequence"
        >
          <v-icon small class="consequence-icon">
            mdi-help-circle-outline
          </v-icon>
          <span>{{ t(`bookablesUnchecked.${kind}`) }}</span>
        </div>
        <div
          v-else-if="affectedBookables.length > 0"
          class="consequence"
          data-test="delete-consequence"
        >
          <v-icon small class="consequence-icon">mdi-link-variant-off</v-icon>
          <i18n
            :path="`accessPoint.management.delete.loses.${number(
              affectedBookables.length
            )}.${kind}`"
            tag="span"
          >
            <template #names>
              <strong>{{ bookableNames }}</strong>
            </template>
          </i18n>
        </div>

        <!-- Confirming waits for the check, see the button. -->
        <div
          v-if="loadingBookings"
          class="consequence text--secondary"
          data-test="delete-consequence"
        >
          <v-progress-circular
            indeterminate
            size="14"
            width="2"
            color="primary"
            class="consequence-icon"
          />
          <span>{{ t("checking") }}</span>
        </div>
        <div
          v-else-if="bookingsUnreadable"
          class="consequence text--secondary"
          data-test="delete-consequence"
        >
          <v-icon small class="consequence-icon">
            mdi-help-circle-outline
          </v-icon>
          <span>{{ t("unchecked") }}</span>
        </div>
        <template v-else-if="runningBookings.length > 0">
          <div class="consequence" data-test="delete-consequence">
            <v-icon small color="error" class="consequence-icon">
              mdi-key-alert
            </v-icon>
            <span>
              <i18n
                :path="`accessPoint.management.delete.running.${number(
                  runningBookings.length
                )}`"
                tag="span"
              >
                <template #bookings>
                  <strong>{{
                    $tc(
                      "accessPoint.management.delete.runningCount",
                      runningBookings.length
                    )
                  }}</strong>
                </template>
                <template #provider>{{ providerTitle }}</template>
              </i18n>
              {{ " " }}
              <a
                class="consequence-toggle"
                data-test="delete-running-toggle"
                @click="showRunning = !showRunning"
                >{{ t(showRunning ? "hide" : "which") }}</a
              >
            </span>
          </div>
          <ul v-if="showRunning" class="consequence-list">
            <li
              v-for="booking in runningBookings"
              :key="booking.id"
              data-test="delete-running-booking"
            >
              {{ booking.id }}
              <template v-if="booking.name"> · {{ booking.name }}</template>
              <span v-if="booking.timeEnd" class="text--secondary">
                · {{ until(booking) }}
              </span>
            </li>
          </ul>
        </template>

        <v-alert v-if="error" color="error" text dense class="mt-4 mb-0">
          <v-icon left>mdi-alert-circle</v-icon>
          {{ error }}
        </v-alert>
      </v-card-text>
      <v-divider />
      <v-card-actions class="justify-end px-6 py-4">
        <v-btn outlined :disabled="deleting" @click="$emit('close')">
          {{ $t("accessPoint.management.cancel") }}
        </v-btn>
        <!-- Confirming before the booking check has answered would be the
             unnoticed click this question exists to prevent. -->
        <v-btn
          class="confirm-delete"
          color="error"
          :loading="deleting"
          :disabled="loadingBookings"
          @click="$emit('confirm')"
        >
          <v-icon left small>mdi-delete</v-icon>
          {{ t("confirm") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.consequence {
  display: flex;
  align-items: flex-start;
  padding: 6px 0;
  line-height: 1.45;
}

.consequence-icon {
  flex: none;
  margin: 2px var(--scb-space-3) 0 0;
}

.consequence-toggle {
  white-space: nowrap;
}

/* A busy Schließfachanlage can have many; the list scrolls. */
.consequence-list {
  margin: 0 0 var(--scb-space-1) 28px;
  padding: 0;
  list-style: none;
  font-size: var(--scb-font-size-xs);
  max-height: 180px;
  overflow: auto;
}
</style>
