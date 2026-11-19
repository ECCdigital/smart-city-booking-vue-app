<template>
  <AppDialog
    :open="open"
    :icon="byAddress ? 'mdi-email-alert-outline' : 'mdi-flag-outline'"
    color="warning"
    max-width="520"
    :title="
      byAddress
        ? $t('user.report.title-addresses')
        : $t('user.report.title', { name })
    "
    :busy="inProgress"
    @close="$emit('close')"
  >
    <v-alert
      v-if="accountGone"
      type="info"
      text
      dense
      class="text-body-2"
      data-test="user-report-account-gone"
    >
      {{ $t("user.report.account-gone", { name }) }}
    </v-alert>
    <!-- A user's account may be suspended, an address put on the
             Sperrliste: the text says which of the two the report asks for. -->
    <p class="text-body-2" data-test="user-report-text">
      {{
        byAddress
          ? $t("user.report.text-addresses")
          : $t("user.report.text", { name })
      }}
    </p>
    <p v-if="!byAddress" class="text-body-2" data-test="user-report-unaware">
      <template v-if="bookingId">{{ $t("user.report.booking") }}</template>
      {{ $t("user.report.text-unaware", { name }) }}
    </p>
    <p v-else-if="bookingId" class="text-body-2">
      {{ $t("user.report.booking") }}
    </p>
    <div v-if="byAddress" class="mb-3" data-test="user-report-addresses">
      <div class="text-subtitle-2">
        {{ $tc("user.report.addresses", reportedAddresses.length) }}
      </div>
      <v-checkbox
        v-for="address in reportedAddresses"
        :key="address"
        v-model="picked"
        :value="address"
        :label="address"
        dense
        hide-details
        data-test="user-report-address"
      />
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
    <template v-if="offersAddress">
      <v-checkbox
        v-model="alsoAddress"
        :label="$t('user.report.report-address', { address: reportAddress })"
        hide-details
        class="mt-2"
        data-test="user-report-also-address"
      />
      <div
        class="text-caption grey--text ml-8"
        data-test="user-report-also-address-hint"
      >
        {{ $t("user.report.report-address-hint") }}
      </div>
    </template>
    <v-alert v-if="error" type="error" dense text class="mt-3 mb-0">
      {{ error }}
    </v-alert>
    <template #actions>
      <v-btn outlined :disabled="inProgress" @click="$emit('close')">
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
    </template>
  </AppDialog>
</template>

<script>
import AppDialog from "@/components/commons/AppDialog.vue";
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
 * which a second toast names. With `reportAddress`, the booker's address,
 * the report of the account offers „Adresse … zusätzlich melden“: the
 * address is then reported too, by hand, as the backend takes no address
 * of an account from a booking. Where the backend answers that the booker
 * has no account (anymore), the dialog turns to reporting `reportAddress`
 * with the reason entered, from the booking where it is of its `mail`
 * (`reportAddressOfBooking`). Emits `reported` with `{ membershipEnded }`
 * after a report, and `close`.
 */
export default {
  name: "UserReportDialog",
  components: { AppDialog },
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
    /**
     * The address of the reported account, to offer reporting it too: the
     * booker's, from a booking.
     */
    reportAddress: {
      type: String,
      default: null,
    },
    /** Whether `reportAddress` is of the booking's `mail`. */
    reportAddressOfBooking: {
      type: Boolean,
      default: false,
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
      alsoAddress: false,
      /** The backend said the reported user has no account. */
      accountGone: false,
      error: null,
      inProgress: false,
    };
  },
  computed: {
    byAddress() {
      return this.addresses.length > 0 || this.accountGone;
    },
    reportedAddresses() {
      return this.accountGone ? [this.reportAddress] : this.addresses;
    },
    offersAddress() {
      return !this.byAddress && !!this.reportAddress;
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
        this.alsoAddress = false;
        this.accountGone = false;
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
        if (this.offersAddress && this.alsoAddress) await this.reportAlso();
        this.$emit("reported", { membershipEnded: endMembership });
        this.$emit("close");
      } catch (error) {
        console.error(error);
        if (this.isAccountGone(error)) {
          this.accountGone = true;
          this.picked = [this.reportAddress];
        } else {
          this.error = getApiErrorMessage(error, this.$t("user.report.error"));
        }
      } finally {
        this.inProgress = false;
      }
    },
    isAccountGone(error) {
      return (
        !!this.reportAddress &&
        error?.response?.data?.code === "report_target_without_account"
      );
    },
    /**
     * The account's address after its report. The account is reported by
     * then, so a refusal of the address - already on the Sperrliste, say -
     * is a toast and the dialog closes all the same.
     */
    async reportAlso() {
      try {
        await ApiReportService.report(this.tenantId, {
          addresses: [this.reportAddress],
          reason: this.reason.trim(),
        });
      } catch (error) {
        console.error(error);
        this.addToast(
          ToastService.createToast(
            "user.report.address-failed",
            "warning",
            8000,
            {
              message: getApiErrorMessage(error, this.$t("user.report.error")),
            }
          )
        );
      }
    },
    async confirmAddresses() {
      this.inProgress = true;
      this.error = null;
      try {
        // The address of a gone account is the booking's only where it is
        // of its `mail`; otherwise it is reported by hand.
        const ofBooking = !this.accountGone || this.reportAddressOfBooking;
        const response = await ApiReportService.report(this.tenantId, {
          bookingId: ofBooking ? this.bookingId : undefined,
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
