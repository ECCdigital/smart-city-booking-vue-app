<template>
  <v-dialog :value="open" persistent scrollable max-width="800px">
    <v-card>
      <v-card-title class="d-flex align-center py-4 px-6">
        <v-icon left>mdi-restore</v-icon>
        <span class="text-h5">{{ $t("booking.reinstate.dialog.title") }}</span>
        <v-spacer />
        <v-btn icon @click="closeDialog"><v-icon>mdi-close</v-icon></v-btn>
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-6">
        <i18n
          v-if="!seriesOnly"
          path="group-booking.reinstate.dialog.member"
          tag="span"
        >
          <template #id>
            <strong>{{ toReinstate.id }}</strong>
          </template>
        </i18n>
        <GroupBookingStatusSummary
          class="mt-4"
          :members="groupBookings"
          :series-allowed="canReinstateGroup"
        />
        <v-radio-group
          v-model="scope"
          class="mt-4"
          :disabled="conflicts.length > 0"
        >
          <v-radio
            value="group"
            :disabled="!canReinstateGroup"
            :label="$t('group-booking.reinstate.dialog.group')"
            data-test="reinstate-scope-group"
          />
          <v-radio
            v-if="!seriesOnly"
            value="single"
            :label="$t('group-booking.reinstate.dialog.single')"
            data-test="reinstate-scope-single"
          />
        </v-radio-group>
        <p class="mb-0 text-body-2">{{ hint }}</p>
        <v-alert
          v-if="conflicts.length > 0"
          type="warning"
          border="left"
          text
          class="mt-4 mb-0 reinstate-conflicts"
          data-test="reinstate-conflicts"
        >
          <p class="mb-2">
            {{
              $tc("group-booking.reinstate.conflict.intro", conflicts.length, {
                n: conflicts.length,
              })
            }}
          </p>
          <div v-for="entry in conflicts" :key="entry.bookingId" class="mb-2">
            <span class="font-weight-medium">{{ memberLabel(entry) }}</span>
            <ul>
              <li
                v-for="{ conflict, other } in rowsOf(entry)"
                :key="`${conflict.bookableId}-${other.id}`"
              >
                <a
                  :href="bookingHref(other.id)"
                  target="_blank"
                  rel="noopener"
                  >{{ other.id }}</a
                >
                {{ $t("group-booking.reinstate.conflict.for") }} „<span
                  :class="{
                    'reinstate-conflicts__taken': !takenThrough(other),
                  }"
                  >{{ String(conflict.title || "").trim() }}</span
                >“<template v-if="other.parent">
                  {{ $t("group-booking.reinstate.conflict.via-parent") }} „<span
                    class="reinstate-conflicts__taken"
                    >{{ String(other.parent.title || "").trim() }}</span
                  >“</template
                ><template v-else-if="other.child">
                  {{ $t("group-booking.reinstate.conflict.via-child") }} „<span
                    class="reinstate-conflicts__taken"
                    >{{ String(other.child.title || "").trim() }}</span
                  >“</template
                >
                ({{ formatPeriod(other) }})
              </li>
            </ul>
          </div>
          <p class="mb-0">
            {{ $t("group-booking.reinstate.conflict.question") }}
          </p>
        </v-alert>
        <v-alert v-if="error" type="error" border="left" class="mt-4 mb-0">
          {{ error }}
        </v-alert>
      </v-card-text>
      <v-divider />
      <v-card-actions class="justify-end px-6 py-4">
        <v-btn outlined @click="closeDialog">Abbrechen</v-btn>
        <template v-if="conflicts.length > 0">
          <v-btn
            v-if="hasConflictFree"
            outlined
            color="primary"
            :loading="inProgress"
            data-test="reinstate-skip-conflicts"
            @click="$emit('reinstate-group-booking', { skipConflicts: true })"
          >
            {{ $t("group-booking.reinstate.conflict.skip") }}
          </v-btn>
          <v-btn
            color="primary"
            :loading="inProgress"
            data-test="reinstate-ignore-conflicts"
            @click="$emit('reinstate-group-booking', { ignoreConflicts: true })"
          >
            {{ $t("group-booking.reinstate.conflict.proceed") }}
          </v-btn>
        </template>
        <v-btn
          v-else
          color="primary"
          :loading="inProgress"
          :disabled="scope === 'group' && !canReinstateGroup"
          data-test="reinstate-submit"
          @click="onReinstate"
        >
          <v-icon left small>mdi-restore</v-icon>
          {{
            scope === "group"
              ? $t("group-booking.reinstate.dialog.group")
              : $t("group-booking.reinstate.dialog.single")
          }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import FormatService from "@/services/FormatService";
import GroupBookingStatusSummary from "@/components/Booking/GroupBookingStatusSummary.vue";
import { bookingPageRoute } from "@/utils/bookingPageRoutes";
import {
  BOOKING_ACTION,
  BOOKING_STATUS,
  groupAllowsAction,
  reinstatableMembers,
} from "@/utils/bookingStatus";

/**
 * Wiederherstellen of a member of a series, built like the cancellation of
 * a series: the members with their state, "Alle stornierten Buchungen der
 * Serie wiederherstellen" or "Nur diese Buchung wiederherstellen". The
 * series takes only its cancelled and rejected members. Where periods were
 * taken meanwhile, the host hands back the route's `conflicts` per member
 * and the dialog offers to reinstate all, only the conflict-free ones, or
 * to cancel.
 */
export default {
  name: "GroupBookingReinstateDialog",
  components: { GroupBookingStatusSummary },
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    /** The member the action was triggered from. */
    toReinstate: {
      type: Object,
      required: true,
    },
    /** The members of the series. */
    groupBookings: {
      type: Array,
      default: () => [],
    },
    /** The host acts on the series as a whole: no "Nur diese Buchung". */
    seriesOnly: {
      type: Boolean,
      default: false,
    },
    /** The route's `{ bookingId, conflicts }` per member, once it named them. */
    conflicts: {
      type: Array,
      default: () => [],
    },
    inProgress: {
      type: Boolean,
      default: false,
    },
    error: {
      type: String,
      default: null,
    },
  },
  data() {
    return {
      scope: "group",
    };
  },
  computed: {
    canReinstateGroup() {
      return groupAllowsAction(this.groupBookings, BOOKING_ACTION.REINSTATE);
    },
    defaultScope() {
      return this.canReinstateGroup ? "group" : "single";
    },
    candidates() {
      return reinstatableMembers(this.groupBookings);
    },
    /** Whether "Nur konfliktfreie" would reinstate anything. */
    hasConflictFree() {
      const taken = new Set(this.conflicts.map((entry) => entry.bookingId));
      return this.candidates.some((member) => !taken.has(member.id));
    },
    hint() {
      if (this.scope === "group") {
        return this.$tc(
          "group-booking.reinstate.dialog.hint",
          this.candidates.length,
          { count: this.candidates.length }
        );
      }
      const key =
        this.toReinstate?.status === BOOKING_STATUS.CANCELLED
          ? "booking.reinstate.dialog.hint-cancelled"
          : "booking.reinstate.dialog.hint-rejected";
      return this.$t(key, { id: this.toReinstate?.id });
    },
  },
  watch: {
    open(value) {
      if (value) {
        this.scope = this.defaultScope;
      }
    },
  },
  created() {
    this.scope = this.defaultScope;
  },
  methods: {
    closeDialog() {
      this.$emit("close");
    },
    onReinstate() {
      if (this.scope === "group") {
        this.$emit("reinstate-group-booking", {});
        return;
      }
      this.$emit("reinstate-single-booking");
    },
    memberLabel(entry) {
      const member = this.groupBookings.find(
        (booking) => booking.id === entry.bookingId
      );
      return member
        ? this.$t("group-booking.reinstate.conflict.member", {
            id: member.id,
            period: this.formatPeriod(member),
          })
        : entry.bookingId;
    },
    /** One row per booking in the way, with the position it collides on. */
    rowsOf(entry) {
      return (entry.conflicts || []).flatMap((conflict) =>
        (conflict.bookings || []).map((other) => ({ conflict, other }))
      );
    },
    /** The parent or dependent a booking holds the position through, if any. */
    takenThrough(other) {
      return other.parent || other.child || null;
    },
    bookingHref(bookingId) {
      return this.$router?.resolve(
        bookingPageRoute(bookingId, this.toReinstate?.tenantId)
      ).href;
    },
    formatPeriod({ timeBegin, timeEnd }) {
      return `${FormatService.dateTime(timeBegin)} – ${FormatService.dateTime(
        timeEnd
      )}`;
    },
  },
};
</script>

<style scoped>
/* The object booked twice, as the warning names it. */
.reinstate-conflicts__taken {
  font-weight: 600;
}
</style>
