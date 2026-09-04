<script>
import ApiAccessService from "@/services/api/ApiAccessService";
import BookingPermissionService from "@/services/permissions/BookingPermissionService";
import ToastService from "@/services/ToastService";
import { mapActions } from "vuex";
import {
  EVIDENCE_MISSING_BLOCKING_REASON,
  formatBlockingReasonMessage,
} from "@/utilities/access-blocking-reasons";
import {
  accessEntriesOf,
  accessState,
  accessStateChip,
} from "@/utilities/booking-access-points";
import { isLockerAccessPoint } from "@/utilities/access-points";
import { getIfbsErrorMessage } from "@/utils/ifbsErrors";

const NO_REMOTE_ACCESS_BLOCKING_REASON = "no_remote_access";
const WINDOW_TICK_MS = 30000;

/**
 * The accesses of one booking: the doors it opens and the compartments a
 * locker system holds for it, in one list, compartments first.
 *
 * The only source is `GET /api/:tenant/access?bookingId=<id>`. It is tenant
 * scaled, so a tenant owner reaches the bookings of their tenant with it -
 * unlike the instance-wide `/api/access/bookings`, which would hand a tenant
 * owner their own bookings alone. `booking.lockerInfo` and `booking.accessInfo`
 * are deliberately not read: the fields that make an entry operable - the
 * opaque compartment id above all - live in the projection only.
 */
export default {
  name: "BookingAccessPoints",
  props: {
    booking: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      entries: [],
      loading: false,
      statuses: {},
      actionLoading: {},
      errors: {},
      loadFailed: false,
      now: Date.now(),
      windowTimer: null,
    };
  },
  computed: {
    canControl() {
      return BookingPermissionService.allowUpdate(this.booking);
    },
  },
  watch: {
    "booking.id": {
      immediate: true,
      handler() {
        this.fetchEntries();
      },
    },
  },
  mounted() {
    this.windowTimer = setInterval(() => {
      this.now = Date.now();
    }, WINDOW_TICK_MS);
  },
  beforeDestroy() {
    if (this.windowTimer) {
      clearInterval(this.windowTimer);
    }
  },
  methods: {
    ...mapActions({ addToast: "toasts/add" }),
    isLockerAccessPoint,
    entryTitle(entry) {
      const label = entry.label || entry.id;
      if (isLockerAccessPoint(entry) && entry.compartment) {
        return this.$t("accessPoint.booking.compartment", {
          label,
          compartment: entry.compartment,
        });
      }
      return label;
    },
    entryIcon(entry) {
      return isLockerAccessPoint(entry) ? "mdi-locker" : "mdi-door";
    },
    stateChip(entry) {
      return accessStateChip(accessState(entry));
    },
    openLabel(entry) {
      return isLockerAccessPoint(entry)
        ? this.$t("accessPoint.booking.openCompartment")
        : this.$t("accessPoint.booking.open");
    },
    isRemoteCapable(entry) {
      const mode = entry?.mode || "both";
      return mode === "remote" || mode === "both";
    },
    /**
     * Whether closing and unlatching are offered at all. Both are Nuki door
     * business: a compartment has neither - it is shut by hand and has no
     * latch to pull - and Salto KS locks by itself and supports neither.
     */
    canOperateLatch(entry) {
      return (
        !isLockerAccessPoint(entry) &&
        this.isRemoteCapable(entry) &&
        entry?.provider !== "salto-ks"
      );
    },
    requiresOnSiteEvidence(entry) {
      // Open is called without a body - from here no evidence can be given, so
      // the click would run into a refusal. The server leaves
      // `validationRuleTypes` empty where its rules do not bite.
      return (entry?.validationRuleTypes || []).length > 0;
    },
    /**
     * Why the open button is dead, or null while it is not. The button stays
     * where it is either way: a button that vanished says nothing, and one
     * that stays live lets the admin click into nothing.
     */
    openBlockReason(entry) {
      if (!this.canControl) {
        return this.$t("accessPoint.booking.blocked.forbidden");
      }
      if (!this.isRemoteCapable(entry)) {
        return this.formatBlockingReasons([NO_REMOTE_ACCESS_BLOCKING_REASON]);
      }
      if (!this.isWithinAccessWindow(entry)) {
        return this.$t("accessPoint.booking.window.outside", {
          hint: this.accessWindowHint(entry),
        });
      }
      if (this.requiresOnSiteEvidence(entry)) {
        return this.formatBlockingReasons([EVIDENCE_MISSING_BLOCKING_REASON]);
      }
      return null;
    },
    isBusy(entry) {
      const id = entry.id;
      return Boolean(
        this.actionLoading[id + "_waitOpen"] ||
          this.actionLoading[id + "_waitClose"]
      );
    },
    tone(entry) {
      const status = this.displayStatus(entry);
      const color = (status && status.color) || this.stateChip(entry).color;
      if (color.startsWith("success")) return "success";
      if (color.startsWith("error")) return "error";
      if (color.startsWith("warning") || color.startsWith("orange")) {
        return "warning";
      }
      if (color.startsWith("info")) return "info";
      return "grey";
    },
    /**
     * What went wrong at the access point, as specific as the provider lets
     * this UI be: iFBS names its numeric codes, every other provider's code
     * is shown bare rather than given a meaning it may not have.
     */
    providerErrorMessage(entry, code) {
      const detail =
        entry?.provider === "ifbs" ? getIfbsErrorMessage(code) : null;
      return detail
        ? this.$t("accessPoint.status.pointError.detailedMessage", {
            code,
            detail,
          })
        : this.$t("accessPoint.status.pointError.message", { code });
    },
    formatBlockingReasons(blockingReasons) {
      return formatBlockingReasonMessage(blockingReasons, (key) =>
        this.$t(key)
      );
    },
    resolveAccessError(error, entry, fallbackKey, options = {}) {
      const { treat403AsWindow = true } = options;
      if (error?.response?.status === 403 && treat403AsWindow) {
        return this.$t("accessPoint.booking.window.outside", {
          hint: this.accessWindowHint(entry),
        });
      }
      return this.$t(fallbackKey);
    },
    /**
     * Whether the entry declares a window at all. The projection carries
     * `accessFrom`/`accessTo` as `null` where it knows none, and a null read
     * as a number would put every such entry outside its window for good.
     */
    hasAccessWindow(entry) {
      return entry?.accessFrom != null && entry?.accessTo != null;
    },
    isWithinAccessWindow(entry) {
      if (!this.hasAccessWindow(entry)) return true;
      return entry.accessFrom <= this.now && entry.accessTo >= this.now;
    },
    accessWindowHint(entry) {
      if (!this.hasAccessWindow(entry)) return "";
      if (this.now < entry.accessFrom) {
        return this.$t("accessPoint.booking.window.before", {
          time: this.formatDateTime(entry.accessFrom),
        });
      }
      if (this.now > entry.accessTo) {
        return this.$t("accessPoint.booking.window.after", {
          time: this.formatDateTime(entry.accessTo),
        });
      }
      return this.$t("accessPoint.booking.window.until", {
        time: this.formatDateTime(entry.accessTo),
      });
    },
    formatDateTime(value) {
      if (!value) return "";
      return new Intl.DateTimeFormat("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value));
    },
    /**
     * What the last command reported, or null while nothing was commanded.
     * The state of the access itself is the chip beside the title; this one
     * speaks about the door or box in front of the person.
     */
    displayStatus(entry) {
      const id = entry.id;
      const isWaitingOpen = this.actionLoading[id + "_waitOpen"];
      const isWaitingClose = this.actionLoading[id + "_waitClose"];
      const status = this.statuses[id];

      if (isWaitingOpen || isWaitingClose) {
        return {
          color: "orange",
          icon: null,
          text: isWaitingClose
            ? this.$t("accessPoint.booking.status.waitingClose")
            : this.$t("accessPoint.booking.status.waitingOpen"),
          loading: true,
        };
      }

      if (status?.confirmed) {
        const time = status.confirmedAt
          ? new Date(status.confirmedAt).toLocaleTimeString("de-DE", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          : null;
        return {
          color: "success",
          icon: "mdi-lock-open-variant",
          text: time
            ? this.$t("accessPoint.booking.status.openedAt", { time })
            : this.$t("accessPoint.booking.status.opened"),
          loading: false,
        };
      }

      if (status?.errorCode || status?.error) {
        return {
          color: "error",
          icon: "mdi-alert-circle",
          text: status.errorCode
            ? this.$t("accessPoint.booking.status.errorCode", {
                code: status.errorCode,
              })
            : this.$t("accessPoint.booking.status.error"),
          loading: false,
        };
      }

      if (
        typeof status?.open === "boolean" ||
        typeof status?.locked === "boolean"
      ) {
        if (status.open) {
          return {
            color: "success",
            icon: "mdi-door-open",
            text: this.$t("accessPoint.booking.status.opened"),
            loading: false,
          };
        }
        if (status.locked) {
          return {
            color: "info",
            icon: "mdi-lock",
            text: this.$t("accessPoint.booking.status.locked"),
            loading: false,
          };
        }
        return {
          color: "warning",
          icon: "mdi-lock-open-variant-outline",
          text: this.$t("accessPoint.booking.status.unlocked"),
          loading: false,
        };
      }

      return null;
    },
    getAccessResponseData(response) {
      const responseData = response.data || {};
      return responseData.data || responseData.status || responseData;
    },
    isOpened(status) {
      if (!status) return false;
      if (status.confirmed) return true;
      return status.open === true;
    },
    isClosed(status) {
      if (!status) return false;
      if (
        typeof status.locked === "boolean" ||
        typeof status.open === "boolean"
      ) {
        return status.locked === true && status.open !== true;
      }
      return false;
    },
    async queryStatus(entry) {
      const id = entry.id;
      const response = await ApiAccessService.getStatus(
        this.booking.id,
        id,
        this.booking.tenantId
      );
      const status = this.getAccessResponseData(response);
      this.$set(this.statuses, id, status);
      return status;
    },
    async fetchEntries() {
      if (!this.booking?.id) return;

      this.loading = true;
      this.loadFailed = false;
      try {
        const response = await ApiAccessService.getAccessPoints(
          this.booking.id,
          this.booking.tenantId
        );
        this.entries = accessEntriesOf(response.data);
      } catch (error) {
        console.error(error);
        this.entries = [];
        this.loadFailed = true;
      } finally {
        this.loading = false;
      }
    },
    async open(entry) {
      if (this.openBlockReason(entry)) return;
      const id = entry.id;
      this.$set(this.actionLoading, id + "_open", true);
      this.$set(this.errors, id, null);
      this.$set(this.statuses, id, null);

      try {
        const response = await ApiAccessService.open(
          this.booking.id,
          id,
          this.booking.tenantId
        );
        const responseData = response.data || {};

        if (responseData.success === false) {
          this.$set(
            this.errors,
            id,
            this.formatBlockingReasons(responseData.data?.blockingReasons)
          );
          return;
        }

        await this.waitForStatusChange(entry, "open");
      } catch (error) {
        this.$set(
          this.errors,
          id,
          this.resolveAccessError(
            error,
            entry,
            "accessPoint.open.sendError.message",
            { treat403AsWindow: false }
          )
        );
      } finally {
        this.$set(this.actionLoading, id + "_open", false);
      }
    },
    async unlatch(entry) {
      if (!this.canControl) return;
      const id = entry.id;
      this.$set(this.actionLoading, id + "_unlatch", true);
      this.$set(this.errors, id, null);
      this.$set(this.statuses, id, null);

      try {
        const response = await ApiAccessService.unlatch(
          this.booking.id,
          id,
          this.booking.tenantId
        );
        const responseData = response.data || {};

        if (responseData.success === false) {
          this.$set(
            this.errors,
            id,
            responseData.errors?.[0]?.message ||
              this.$t("accessPoint.unlatch.error.message")
          );
          return;
        }

        await this.waitForStatusChange(entry, "unlatch");
      } catch (error) {
        this.$set(
          this.errors,
          id,
          this.resolveAccessError(
            error,
            entry,
            "accessPoint.unlatch.sendError.message"
          )
        );
      } finally {
        this.$set(this.actionLoading, id + "_unlatch", false);
      }
    },
    async close(entry) {
      if (!this.canControl) return;
      const id = entry.id;
      this.$set(this.actionLoading, id + "_close", true);
      this.$set(this.errors, id, null);
      this.$set(this.statuses, id, null);

      try {
        const response = await ApiAccessService.close(
          this.booking.id,
          id,
          this.booking.tenantId
        );
        const responseData = response.data || {};

        if (responseData.success === false) {
          this.$set(
            this.errors,
            id,
            responseData.errors?.[0]?.message ||
              this.$t("accessPoint.close.error.message")
          );
          return;
        }

        await this.waitForStatusChange(entry, "close");
      } catch (error) {
        this.$set(
          this.errors,
          id,
          this.resolveAccessError(
            error,
            entry,
            "accessPoint.close.sendError.message"
          )
        );
      } finally {
        this.$set(this.actionLoading, id + "_close", false);
      }
    },
    async waitForStatusChange(entry, action) {
      const id = entry.id;
      const isOpenAction = action === "open" || action === "unlatch";
      const loadingKey = isOpenAction ? "_waitOpen" : "_waitClose";
      const isDone = (status) =>
        isOpenAction ? this.isOpened(status) : this.isClosed(status);
      const successKey = `accessPoint.${action}.success`;
      const errorKey = `accessPoint.${action}.error.message`;
      const timeoutKey = `accessPoint.${action}.timeout.message`;

      this.$set(this.actionLoading, id + loadingKey, true);

      try {
        for (let attempt = 0; attempt < 8; attempt += 1) {
          if (attempt > 0) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }

          const status = await this.queryStatus(entry);

          if (isDone(status)) {
            await this.addToast(
              ToastService.createToast(successKey, "success")
            );
            return;
          }

          if (status?.errorCode || status?.error) {
            this.$set(
              this.errors,
              id,
              status.errorCode
                ? this.providerErrorMessage(entry, status.errorCode)
                : this.$t(errorKey)
            );
            return;
          }
        }

        this.$set(this.errors, id, this.$t(timeoutKey));
      } catch (error) {
        this.$set(
          this.errors,
          id,
          this.$t("accessPoint.status.waitTimeout.message")
        );
      } finally {
        this.$set(this.actionLoading, id + loadingKey, false);
      }
    },
    async fetchStatus(entry) {
      if (!this.canControl) return;
      const id = entry.id;
      this.$set(this.actionLoading, id + "_status", true);
      this.$set(this.errors, id, null);

      try {
        await this.queryStatus(entry);
      } catch (error) {
        this.$set(
          this.errors,
          id,
          this.resolveAccessError(
            error,
            entry,
            "accessPoint.status.error.message"
          )
        );
      } finally {
        this.$set(this.actionLoading, id + "_status", false);
      }
    },
  },
};
</script>

<template>
  <v-card
    v-if="entries.length > 0 || loadFailed"
    class="mb-6 section-card"
    elevation="2"
    outlined
  >
    <v-card-title
      class="section-header pa-4 d-flex justify-space-between align-center"
    >
      <div>
        <v-icon class="mr-2">mdi-key-chain-variant</v-icon>
        <span class="text-h6 font-weight-bold">
          {{ $t("accessPoint.booking.title") }}
        </span>
      </div>
      <v-btn
        small
        text
        color="primary"
        :loading="loading"
        :disabled="!canControl"
        @click="fetchEntries"
      >
        <v-icon left small>mdi-refresh</v-icon>
        {{ $t("accessPoint.booking.reload") }}
      </v-btn>
    </v-card-title>
    <v-divider></v-divider>
    <v-card-text class="pa-4">
      <v-alert
        v-if="loadFailed"
        type="error"
        text
        dense
        border="left"
        class="mb-4"
        data-test="access-load-error"
      >
        {{ $t("accessPoint.management.errors.loadFailed") }}
      </v-alert>

      <v-alert
        v-else
        type="info"
        text
        dense
        border="left"
        class="mb-4 access-point-pin-hint"
      >
        {{ $t("accessPoint.booking.pinInfo") }}
      </v-alert>

      <div class="access-point-grid">
        <div
          v-for="entry in entries"
          :key="entry.id"
          class="access-point-tile"
          :class="`access-point-tile--${tone(entry)}`"
        >
          <div class="access-point-tile__body">
            <div
              class="access-point-tile__icon"
              :class="`access-point-tile__icon--${tone(entry)}`"
            >
              <v-icon>{{ entryIcon(entry) }}</v-icon>
            </div>

            <div class="access-point-tile__info">
              <div class="access-point-tile__title-row">
                <span class="access-point-tile__title">
                  {{ entryTitle(entry) }}
                </span>
                <div class="access-point-tile__chips">
                  <v-chip
                    small
                    label
                    data-test="access-state"
                    :color="stateChip(entry).color"
                    text-color="white"
                    class="access-point-tile__status"
                  >
                    <v-icon left x-small>{{ stateChip(entry).icon }}</v-icon>
                    {{ $t(stateChip(entry).key) }}
                  </v-chip>
                  <v-chip
                    v-if="displayStatus(entry)"
                    small
                    label
                    :color="displayStatus(entry).color"
                    text-color="white"
                    class="access-point-tile__status"
                  >
                    <v-progress-circular
                      v-if="displayStatus(entry).loading"
                      indeterminate
                      size="12"
                      width="2"
                      color="white"
                      class="mr-1"
                    />
                    <v-icon v-else left x-small>
                      {{ displayStatus(entry).icon }}
                    </v-icon>
                    {{ displayStatus(entry).text }}
                  </v-chip>
                </div>
              </div>

              <div class="access-point-tile__meta">
                <span class="meta-pill">
                  <v-icon x-small>mdi-cloud-outline</v-icon>
                  {{ entry.provider }}
                </span>
                <span v-if="entry.externalBookingId" class="meta-pill">
                  <v-icon x-small>mdi-tag-outline</v-icon>
                  {{ $t("accessPoint.booking.process") }}
                  {{ entry.externalBookingId }}
                </span>
              </div>

              <div
                v-if="accessWindowHint(entry)"
                class="access-point-tile__window"
              >
                <v-icon
                  x-small
                  :color="isWithinAccessWindow(entry) ? 'success' : 'warning'"
                  class="mr-1"
                >
                  {{
                    isWithinAccessWindow(entry)
                      ? "mdi-clock-check-outline"
                      : "mdi-clock-alert-outline"
                  }}
                </v-icon>
                <span>{{ accessWindowHint(entry) }}</span>
              </div>
            </div>
          </div>

          <v-expand-transition>
            <div v-if="errors[entry.id]" class="access-point-tile__error">
              <v-alert
                type="error"
                dense
                text
                border="left"
                class="mb-0"
                dismissible
                @input="$set(errors, entry.id, null)"
              >
                {{ errors[entry.id] }}
              </v-alert>
            </div>
          </v-expand-transition>

          <div class="access-point-tile__actions">
            <v-btn
              small
              text
              color="info"
              :loading="actionLoading[entry.id + '_status']"
              :disabled="!canControl"
              @click="fetchStatus(entry)"
            >
              <v-icon left small>mdi-refresh</v-icon>
              {{ $t("accessPoint.booking.checkStatus") }}
            </v-btn>

            <v-spacer />

            <div class="access-point-tile__action-group">
              <v-btn
                v-if="canOperateLatch(entry)"
                small
                outlined
                color="warning"
                :loading="actionLoading[entry.id + '_close']"
                :disabled="
                  !canControl || !isWithinAccessWindow(entry) || isBusy(entry)
                "
                @click="close(entry)"
              >
                <v-icon left small>mdi-lock</v-icon>
                {{ $t("accessPoint.booking.close") }}
              </v-btn>
              <v-btn
                v-if="canOperateLatch(entry)"
                small
                outlined
                color="primary"
                :loading="actionLoading[entry.id + '_unlatch']"
                :disabled="
                  !canControl ||
                  !isWithinAccessWindow(entry) ||
                  isBusy(entry) ||
                  requiresOnSiteEvidence(entry)
                "
                @click="unlatch(entry)"
              >
                <v-icon left small>mdi-door-open</v-icon>
                {{ $t("accessPoint.booking.unlatch") }}
              </v-btn>
              <v-btn
                small
                depressed
                color="success"
                data-test="access-open"
                :title="openBlockReason(entry) || ''"
                :loading="actionLoading[entry.id + '_open']"
                :disabled="Boolean(openBlockReason(entry)) || isBusy(entry)"
                @click="open(entry)"
              >
                <v-icon left small>mdi-lock-open-variant</v-icon>
                {{ openLabel(entry) }}
              </v-btn>
            </div>
          </div>

          <div
            v-if="openBlockReason(entry)"
            class="access-point-tile__blocked"
            data-test="access-blocked"
          >
            <v-icon x-small color="warning" class="mr-1">
              mdi-information-outline
            </v-icon>
            <span>{{ openBlockReason(entry) }}</span>
          </div>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped lang="scss">
.section-card {
  border-radius: 8px !important;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
}

.section-header {
  background: linear-gradient(
    135deg,
    rgba(0, 0, 0, 0.02) 0%,
    rgba(0, 0, 0, 0.01) 100%
  );
}

.theme--dark .section-header {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.02) 100%
  );
}

.access-point-pin-hint {
  border-radius: 4px;
}

.access-point-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.access-point-tile {
  position: relative;
  padding: 16px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-left: 4px solid var(--ap-accent, rgba(0, 0, 0, 0.12));
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.015);
  transition: box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
}

.access-point-tile--success {
  --ap-accent: var(--v-success-base, #4caf50);
}
.access-point-tile--warning {
  --ap-accent: var(--v-warning-base, #fb8c00);
}
.access-point-tile--error {
  --ap-accent: var(--v-error-base, #ff5252);
}
.access-point-tile--info {
  --ap-accent: var(--v-info-base, #2196f3);
}
.access-point-tile--grey {
  --ap-accent: rgba(0, 0, 0, 0.18);
}

.theme--dark .access-point-tile {
  border-color: rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
}

.access-point-tile__body {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.access-point-tile__icon {
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.6);
}

.access-point-tile__icon .v-icon {
  color: inherit;
}

.access-point-tile__icon--success {
  background: rgba(76, 175, 80, 0.14);
  color: var(--v-success-base, #4caf50);
}
.access-point-tile__icon--warning {
  background: rgba(251, 140, 0, 0.16);
  color: var(--v-warning-base, #fb8c00);
}
.access-point-tile__icon--error {
  background: rgba(255, 82, 82, 0.16);
  color: var(--v-error-base, #ff5252);
}
.access-point-tile__icon--info {
  background: rgba(33, 150, 243, 0.16);
  color: var(--v-info-base, #2196f3);
}

.access-point-tile__info {
  flex: 1 1 auto;
  min-width: 0;
}

.access-point-tile__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.access-point-tile__title {
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.3;
  color: rgba(0, 0, 0, 0.87);
  word-break: break-word;
}

.theme--dark .access-point-tile__title {
  color: rgba(255, 255, 255, 0.92);
}

.access-point-tile__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.access-point-tile__status {
  flex: 0 0 auto;
  font-weight: 600;
}

.access-point-tile__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.meta-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.62);
  background: rgba(0, 0, 0, 0.06);
}

.meta-pill .v-icon {
  color: inherit;
}

.theme--dark .meta-pill {
  color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.08);
}

.access-point-tile__window,
.access-point-tile__blocked {
  display: flex;
  align-items: center;
  margin-top: 8px;
  font-size: 0.8rem;
  color: rgba(0, 0, 0, 0.6);
}

.theme--dark .access-point-tile__window,
.theme--dark .access-point-tile__blocked {
  color: rgba(255, 255, 255, 0.65);
}

.access-point-tile__error {
  margin-top: 12px;
}

.access-point-tile__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.theme--dark .access-point-tile__actions {
  border-top-color: rgba(255, 255, 255, 0.08);
}

.access-point-tile__action-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
