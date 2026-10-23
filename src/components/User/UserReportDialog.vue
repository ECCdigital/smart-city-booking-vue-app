<template>
  <v-dialog :value="open" max-width="520" persistent>
    <v-card>
      <v-card-title class="text-h6 text-break flex-nowrap align-start">
        <v-icon color="warning" class="mr-2">mdi-flag-outline</v-icon>
        <span>{{ $t("user.report.title", { name }) }}</span>
      </v-card-title>
      <v-card-text>
        <p class="text-body-2">{{ $t("user.report.text", { name }) }}</p>
        <p v-if="bookingId" class="text-body-2">
          {{ $t("user.report.booking") }}
        </p>
        <div v-if="byAddress" class="mb-3" data-test="user-report-addresses">
          <div class="text-subtitle-2">
            {{ $tc("user.report.addresses", addresses.length) }}
          </div>
          <v-checkbox
            v-for="address in addresses"
            :key="address"
            v-model="picked"
            :value="address"
            :label="address"
            dense
            hide-details
            data-test="user-report-address"
          />
          <p class="text-caption mt-2 mb-0">
            {{ $t("user.report.addresses-hint") }}
          </p>
        </div>
        <v-textarea
          v-model="reason"
          :label="$t('user.report.reason')"
          outlined
          rows="3"
          auto-grow
          hide-details="auto"
          data-test="user-report-reason"
        />
        <v-checkbox
          v-if="offerEndMembership"
          v-model="endMembership"
          hide-details
          dense
          class="mt-3"
          data-test="user-report-end-membership"
        >
          <template #label>
            <div>
              <div>{{ $t("user.report.end-membership") }}</div>
              <div class="text-caption grey--text text--darken-1">
                {{ $t("user.report.end-membership-hint", { name }) }}
              </div>
            </div>
          </template>
        </v-checkbox>
        <v-alert v-if="error" type="error" dense text class="mt-3 mb-0">
          {{ error }}
        </v-alert>
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn text :disabled="inProgress" @click="$emit('close')">
          {{ $t("user.report.cancel") }}
        </v-btn>
        <v-btn
          color="warning"
          depressed
          :disabled="!canConfirm"
          :loading="inProgress"
          data-test="user-report-confirm"
          @click="confirm"
        >
          {{ $t("user.report.confirm") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { mapActions } from "vuex";
import ApiReportService from "@/services/api/ApiReportService";
import { getApiErrorMessage } from "@/services/api/apiErrorMessage";
import ToastService from "@/services/ToastService";

/**
 * „Melden“ (glossary „Meldung“): reports a member
 * (`userId`) or the booker of a booking (`bookingId`) of the tenant to the
 * instance, with a required reason. The backend says whether the report is
 * new or added to the open one, and refuses a user already suspended; the
 * dialog stays open with the backend's word for a refusal. For a member it
 * offers to end the membership with the report, open invitations included.
 * With `addresses`, those of `mail` of the
 * booking, it reports the addresses ticked instead, each a report of its
 * own; one already on the blacklist gets none,
 * which a second toast names. Emits `reported` with `{ membershipEnded }`
 * after a report, and `close`.
 */
export default {
  name: "UserReportDialog",
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    /** The name the title gives the reported user. */
    name: {
      type: String,
      required: true,
    },
    tenantId: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      default: null,
    },
    bookingId: {
      type: String,
      default: null,
    },
    /**
     * The addresses of the booking's `mail` to report instead of a user,
     * one ticked where there is only one.
     */
    addresses: {
      type: Array,
      default: () => [],
    },
    /** Whether to offer „Mitgliedschaft beenden“: for a member only. */
    offerEndMembership: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      reason: "",
      picked: this.initialPick(),
      endMembership: false,
      error: null,
      inProgress: false,
    };
  },
  computed: {
    byAddress() {
      return this.addresses.length > 0;
    },
    canConfirm() {
      return (
        !!this.reason.trim() && (!this.byAddress || this.picked.length > 0)
      );
    },
  },
  watch: {
    addresses() {
      this.picked = this.initialPick();
    },
    open(isOpen) {
      if (isOpen) {
        this.reason = "";
        this.picked = this.initialPick();
        this.endMembership = false;
        this.error = null;
      }
    },
  },
  methods: {
    ...mapActions({ addToast: "toasts/add" }),
    initialPick() {
      return this.addresses.length === 1 ? [...this.addresses] : [];
    },
    async confirm() {
      if (this.byAddress) return this.confirmAddresses();
      this.inProgress = true;
      this.error = null;
      const endMembership = this.offerEndMembership && this.endMembership;
      try {
        const response = await ApiReportService.report(this.tenantId, {
          userId: this.bookingId ? undefined : this.userId,
          bookingId: this.bookingId || undefined,
          reason: this.reason.trim(),
          endMembership,
        });
        this.addToast(
          ToastService.createToast(
            response.status === 201
              ? "user.report.created"
              : "user.report.supplemented",
            "success"
          )
        );
        this.$emit("reported", { membershipEnded: endMembership });
        this.$emit("close");
      } catch (error) {
        console.error(error);
        this.error = getApiErrorMessage(error, this.$t("user.report.error"));
      } finally {
        this.inProgress = false;
      }
    },
    async confirmAddresses() {
      this.inProgress = true;
      this.error = null;
      try {
        const response = await ApiReportService.report(this.tenantId, {
          bookingId: this.bookingId,
          addresses: this.picked,
          reason: this.reason.trim(),
        });
        this.addToast(
          ToastService.createToast(
            response.status === 201
              ? "user.report.created"
              : "user.report.supplemented-addresses",
            "success"
          )
        );
        const blacklisted = response.data?.blacklisted ?? [];
        if (blacklisted.length > 0) {
          this.addToast(
            ToastService.createToast(
              "user.report.already-blacklisted",
              "info",
              8000,
              { addresses: blacklisted.join(", ") }
            )
          );
        }
        this.$emit("reported", { membershipEnded: false });
        this.$emit("close");
      } catch (error) {
        console.error(error);
        this.error = getApiErrorMessage(error, this.$t("user.report.error"));
      } finally {
        this.inProgress = false;
      }
    },
  },
};
</script>
