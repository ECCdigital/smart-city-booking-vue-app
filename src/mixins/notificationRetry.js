import { mapActions } from "vuex";
import ApiSupervisionNotificationService from "@/services/api/ApiSupervisionNotificationService";
import { getApiErrorMessage } from "@/services/api/apiErrorMessage";
import {
  isRetryableNotification,
  notificationStatusLabelKey,
  notificationTypeLabelKey,
} from "@/utils/supervisionNotifications";
import FormatService from "@/services/FormatService";

/**
 * Sending a supervision notice (glossary "Aufsichtsmitteilung") again, as the
 * outbox panel and the full outbox list both offer it. A retry sends the
 * mail only - the decision behind it and its history stay as they are - and
 * one row retries once at a time.
 *
 * The component brings a `load()` that reads its rows anew: after every
 * retry, a refused one included, the row is no longer what the list shows.
 */
export default {
  data() {
    return { retrying: {} };
  },
  methods: {
    ...mapActions({ addToast: "toasts/add" }),
    isRetryable: isRetryableNotification,
    isRetrying(item) {
      return this.retrying[item.id] === true;
    },
    async retryNotification(item) {
      // One retry per row at a time: a second click must not send twice.
      if (this.isRetrying(item)) return;
      this.$set(this.retrying, item.id, true);
      try {
        const row = await ApiSupervisionNotificationService.retry(item.id);
        await this.addToast(this.retryResultToast(row));
      } catch (error) {
        await this.addToast({
          message: getApiErrorMessage(
            error,
            this.$t("supervision.notifications.retry.request-failed")
          ),
          type: "error",
        });
      } finally {
        this.$delete(this.retrying, item.id);
      }
      await this.load();
    },
    retryResultToast(row) {
      if (row?.status === "sent") {
        return {
          message: this.$t("supervision.notifications.retry.sent"),
          type: "success",
        };
      }
      return {
        message: this.$t("supervision.notifications.retry.failed-again", {
          error: row?.lastError || "—",
        }),
        type: "error",
      };
    },
    typeLabel(type) {
      const key = notificationTypeLabelKey(type);
      return key ? this.$t(key) : type;
    },
    statusLabel(status) {
      const key = notificationStatusLabelKey(status);
      return key ? this.$t(key) : status;
    },
    formatDate: (value) => FormatService.dateTime(value) || "—",
  },
};
