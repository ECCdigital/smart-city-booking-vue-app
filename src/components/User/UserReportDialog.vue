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
          :label="$t('user.report.end-membership')"
          :hint="$t('user.report.end-membership-hint', { name })"
          persistent-hint
          dense
          class="mt-3"
          data-test="user-report-end-membership"
        />
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
          :disabled="!reason.trim()"
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
 * „Melden“ (glossary „Meldung“, ECCdigital/tickets#630): reports a member
 * (`userId`) or the booker of a booking (`bookingId`) of the tenant to the
 * instance, with a required reason. The backend says whether the report is
 * new or added to the open one, and refuses a user already suspended; the
 * dialog stays open with the backend's word for a refusal. For a member it
 * offers to end the membership with the report, open invitations included
 * (ECCdigital/tickets#631). Emits `reported` with `{ membershipEnded }`
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
    /** Whether to offer „Mitgliedschaft beenden“: for a member only. */
    offerEndMembership: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      reason: "",
      endMembership: false,
      error: null,
      inProgress: false,
    };
  },
  watch: {
    open(isOpen) {
      if (isOpen) {
        this.reason = "";
        this.endMembership = false;
        this.error = null;
      }
    },
  },
  methods: {
    ...mapActions({ addToast: "toasts/add" }),
    async confirm() {
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
  },
};
</script>
