<script>
import ApiAccessService from "@/services/api/ApiAccessService";
import BookingPermissionService from "@/services/permissions/BookingPermissionService";
import ToastService from "@/services/ToastService";
import { mapActions } from "vuex";
import {
  ACCESS_BLOCKING_REASON,
  formatBlockingReasonMessage,
  formatOpenRefusalMessage,
} from "@/utilities/access-blocking-reasons";
import {
  ACCESS_CAPABILITY,
  OPEN_PROGRESS,
  accessEntriesOf,
  accessState,
  accessStateChip,
  hasAccessWindow,
  hasCapability,
  isRemotelyOperable,
  isWithinAccessWindow,
  openBlockOf,
  openProgressOf,
} from "@/utilities/booking-access-points";
import { isLockerAccessPoint } from "@/utilities/access-points";
import { getIfbsErrorMessage } from "@/utils/ifbsErrors";

const WINDOW_TICK_MS = 30000;

/**
 * How often a started open is asked about before this screen stops asking,
 * and how long it waits in between. iFBS answers one poll only after waiting
 * up to 30 seconds for the box itself, so few attempts cover a long wait.
 */
const OPEN_CONFIRM_ATTEMPTS = 3;
const OPEN_CONFIRM_DELAY_MS = 1500;

/** How long the lock is asked to report itself closed after a close. */
const CLOSE_CONFIRM_ATTEMPTS = 8;
const CLOSE_CONFIRM_DELAY_MS = 1500;

/**
 * The readings of a 403 at an access route, which is why `resolveAccessError`
 * has no default. `open` and `unlatch` refuse with 403 only where the access
 * point does not belong to the booking at all (`AccessService._resolve`),
 * while `close`, `/status` and `/open-status` refuse whenever `canOperate`
 * says no - an expired window, a missing or withdrawn grant, an unpaid
 * booking. Reading every 403 as "outside the time window", as this screen
 * used to, is wrong for both.
 *
 * A third reading comes before either: the `authorize` middleware turns the
 * request away ahead of the route, and it does so with a `ForbiddenError`
 * body, where a route's own refusal is a bare `sendStatus(403)`. So the body
 * says which of the two answered.
 */
const DENIED_NO_PERMISSION = "accessPoint.booking.denied.noPermission";
const DENIED_NOT_IN_BOOKING = "accessPoint.booking.denied.notInBooking";
const DENIED_NOT_OPERABLE = "accessPoint.booking.denied.notOperable";

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
    /**
     * Whether closing is offered. A lock that cannot be closed remotely is
     * not asked to: Nuki declares `close`, Salto KS locks by itself, and a
     * compartment is shut by hand.
     */
    canClose(entry) {
      return (
        isRemotelyOperable(entry) &&
        hasCapability(entry, ACCESS_CAPABILITY.CLOSE)
      );
    },
    /**
     * Whether pulling the latch is offered. `unlatch` is deliberately not
     * among the projected capabilities - the lock decides behind `open`
     * whether it pulls its latch - so `close` stands in for it as the nearest
     * declared signal of a lock that takes mechanical commands at all. A
     * compartment has no latch to pull whatever its system declares.
     */
    canUnlatch(entry) {
      return !isLockerAccessPoint(entry) && this.canClose(entry);
    },
    /**
     * Whether the lock can be asked how it stands. iFBS knows nothing about a
     * box at rest and Pareva nothing at all; asking them yields a status that
     * is unknown on every count, which is a button that never answers.
     */
    canQueryStatus(entry) {
      return hasCapability(entry, ACCESS_CAPABILITY.GET_STATUS);
    },
    /**
     * Why the status button is dead, or null while it is not. Blocked with
     * its reason rather than hidden, for the reason the open button is.
     */
    statusBlockReason(entry) {
      if (!this.canControl) {
        return this.$t("accessPoint.booking.blocked.forbidden");
      }
      if (!this.canQueryStatus(entry)) {
        return this.$t("accessPoint.booking.blocked.noStatus");
      }
      return null;
    },
    /**
     * Why the open button is dead, or null while it is not. The button stays
     * where it is either way: a button that vanished says nothing, and one
     * that stays live lets the admin click into nothing.
     *
     * The permission to operate the booking is this screen's own question;
     * everything else is read off the entry (`openBlockOf`). A closed window
     * keeps its own wording, which names the times.
     */
    openBlockReason(entry) {
      if (!this.canControl) {
        return this.$t("accessPoint.booking.blocked.forbidden");
      }

      const reason = openBlockOf(entry, { now: this.now });

      if (!reason) {
        return null;
      }

      if (reason === ACCESS_BLOCKING_REASON.OUTSIDE_ACCESS_WINDOW) {
        return this.$t("accessPoint.booking.window.outside", {
          hint: this.accessWindowHint(entry),
        });
      }

      return this.formatBlockingReasons([reason]);
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
    /**
     * What a refused open says: the reasons of the access decision, or the
     * failure class the provider's own error was reduced to. Both arrive on
     * HTTP 200 as a soft failure.
     */
    formatOpenRefusal(refusal) {
      return formatOpenRefusalMessage(refusal, (key) => this.$t(key));
    },
    /**
     * What a failed call says. A 403 means something different at each route,
     * so the caller names which reading applies - there is no default to fall
     * into. A 403 the middleware sent carries a `ForbiddenError` body and is
     * a denial whatever the route is, so it is answered before the reading.
     *
     * @param {Error} error The rejected call
     * @param {Object} reading
     * @param {string} reading.forbiddenKey What the route's own 403 means
     * @param {string} reading.fallbackKey What everything else means
     * @returns {string} The message to show at the access point
     */
    resolveAccessError(error, { forbiddenKey, fallbackKey }) {
      const response = error?.response;

      if (response?.status !== 403) {
        return this.$t(fallbackKey);
      }

      return this.$t(
        response.data?.error ? DENIED_NO_PERMISSION : forbiddenKey
      );
    },
    isWithinAccessWindow(entry) {
      return isWithinAccessWindow(entry, this.now);
    },
    accessWindowHint(entry) {
      if (!hasAccessWindow(entry)) return "";
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
          this.$set(this.errors, id, this.formatOpenRefusal(responseData.data));
          return;
        }

        await this.confirmOpen(entry, "open", responseData.data?.openProcessId);
      } catch (error) {
        this.$set(
          this.errors,
          id,
          this.resolveAccessError(error, {
            forbiddenKey: DENIED_NOT_IN_BOOKING,
            fallbackKey: "accessPoint.open.sendError.message",
          })
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
          this.$set(this.errors, id, this.formatOpenRefusal(responseData.data));
          return;
        }

        await this.confirmOpen(
          entry,
          "unlatch",
          responseData.data?.openProcessId
        );
      } catch (error) {
        this.$set(
          this.errors,
          id,
          this.resolveAccessError(error, {
            forbiddenKey: DENIED_NOT_IN_BOOKING,
            fallbackKey: "accessPoint.unlatch.sendError.message",
          })
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

        await this.waitForClose(entry);
      } catch (error) {
        this.$set(
          this.errors,
          id,
          this.resolveAccessError(error, {
            forbiddenKey: DENIED_NOT_OPERABLE,
            fallbackKey: "accessPoint.close.sendError.message",
          })
        );
      } finally {
        this.$set(this.actionLoading, id + "_close", false);
      }
    },
    /**
     * Follows a started open until the provider confirms it - through
     * `/open-status`, which is the route that knows about open processes.
     * `/status` is not: it reports the lock at rest, and a locker system that
     * declares no `getStatus` answers it unknown on every count, which used
     * to leave every compartment open ending in a timeout.
     *
     * The provider's answer says by itself whether there is anything to
     * follow: an open that names no process was already carried out
     * (`OpenOutcome`), so there is nothing to ask about.
     *
     * A poll that could not tell (`confirmed: null`) is not an open that has
     * not happened yet (`confirmed: false`). The first says the provider
     * could not answer and names its own reason where it has one; the second
     * says the box has not confirmed. They end in different messages.
     *
     * @param {Object} entry The entry that was opened
     * @param {"open"|"unlatch"} action Which command was sent
     * @param {string|null} openProcessId The process the answer named
     */
    async confirmOpen(entry, action, openProcessId) {
      const id = entry.id;
      const successKey = `accessPoint.${action}.success`;

      if (!openProcessId) {
        // Made here, not received: the answer only said that it opened, and
        // the chip beside the title reads its verdict in this shape.
        this.$set(this.statuses, id, {
          confirmed: true,
          confirmedAt: Date.now(),
        });
        await this.addToast(ToastService.createToast(successKey, "success"));
        return;
      }

      this.$set(this.actionLoading, id + "_waitOpen", true);
      let unanswered = null;

      try {
        for (let attempt = 0; attempt < OPEN_CONFIRM_ATTEMPTS; attempt += 1) {
          if (attempt > 0) {
            await new Promise((resolve) =>
              setTimeout(resolve, OPEN_CONFIRM_DELAY_MS)
            );
          }

          const response = await ApiAccessService.getOpenStatus(
            this.booking.id,
            id,
            this.booking.tenantId,
            openProcessId
          );
          const status = this.getAccessResponseData(response);
          const progress = openProgressOf(status);

          if (progress === OPEN_PROGRESS.CONFIRMED) {
            this.$set(this.statuses, id, status);
            await this.addToast(
              ToastService.createToast(successKey, "success")
            );
            return;
          }

          // The last poll has the last word: one that could not tell is only
          // the final answer while no later one told us anything.
          unanswered =
            progress === OPEN_PROGRESS.UNKNOWN
              ? { errorCode: status?.errorCode ?? null }
              : null;
        }

        this.$set(
          this.errors,
          id,
          this.unconfirmedMessage(entry, action, unanswered)
        );
      } catch (error) {
        this.$set(
          this.errors,
          id,
          this.resolveAccessError(error, {
            forbiddenKey: DENIED_NOT_OPERABLE,
            fallbackKey: "accessPoint.status.error.message",
          })
        );
      } finally {
        this.$set(this.actionLoading, id + "_waitOpen", false);
      }
    },
    /**
     * What an open that never confirmed says: the provider's own reason where
     * a poll failed with one, that nothing came back where a poll failed
     * without one, and the plain timeout where every poll answered "not yet".
     *
     * @param {Object} entry The entry that was opened
     * @param {"open"|"unlatch"} action Which command was sent
     * @param {{errorCode: string|number|null}|null} unanswered The last poll,
     *   where it could not tell - null where it answered "not yet"
     * @returns {string} The message to show at the access point
     */
    unconfirmedMessage(entry, action, unanswered) {
      if (!unanswered) {
        return this.$t(`accessPoint.${action}.timeout.message`);
      }
      return unanswered.errorCode
        ? this.providerErrorMessage(entry, unanswered.errorCode)
        : this.$t("accessPoint.status.unconfirmed.message");
    },
    /**
     * Waits for the lock to report itself closed. Unlike an open, a close is
     * not a process anybody polls - it is read off the lock, and it is only
     * offered where the provider reports one.
     *
     * @param {Object} entry The entry that was closed
     */
    async waitForClose(entry) {
      const id = entry.id;
      this.$set(this.actionLoading, id + "_waitClose", true);

      try {
        for (let attempt = 0; attempt < CLOSE_CONFIRM_ATTEMPTS; attempt += 1) {
          if (attempt > 0) {
            await new Promise((resolve) =>
              setTimeout(resolve, CLOSE_CONFIRM_DELAY_MS)
            );
          }

          const status = await this.queryStatus(entry);

          if (this.isClosed(status)) {
            await this.addToast(
              ToastService.createToast("accessPoint.close.success", "success")
            );
            return;
          }

          if (status?.errorCode || status?.error) {
            this.$set(
              this.errors,
              id,
              status.errorCode
                ? this.providerErrorMessage(entry, status.errorCode)
                : this.$t("accessPoint.close.error.message")
            );
            return;
          }
        }

        this.$set(
          this.errors,
          id,
          this.$t("accessPoint.close.timeout.message")
        );
      } catch (error) {
        this.$set(
          this.errors,
          id,
          this.resolveAccessError(error, {
            forbiddenKey: DENIED_NOT_OPERABLE,
            fallbackKey: "accessPoint.status.waitTimeout.message",
          })
        );
      } finally {
        this.$set(this.actionLoading, id + "_waitClose", false);
      }
    },
    async fetchStatus(entry) {
      if (this.statusBlockReason(entry)) return;
      const id = entry.id;
      this.$set(this.actionLoading, id + "_status", true);
      this.$set(this.errors, id, null);

      try {
        await this.queryStatus(entry);
      } catch (error) {
        this.$set(
          this.errors,
          id,
          this.resolveAccessError(error, {
            forbiddenKey: DENIED_NOT_OPERABLE,
            fallbackKey: "accessPoint.status.error.message",
          })
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
              data-test="access-status"
              :title="statusBlockReason(entry) || ''"
              :loading="actionLoading[entry.id + '_status']"
              :disabled="Boolean(statusBlockReason(entry))"
              @click="fetchStatus(entry)"
            >
              <v-icon left small>mdi-refresh</v-icon>
              {{ $t("accessPoint.booking.checkStatus") }}
            </v-btn>

            <v-spacer />

            <div class="access-point-tile__action-group">
              <v-btn
                v-if="canClose(entry)"
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
                v-if="canUnlatch(entry)"
                small
                outlined
                color="primary"
                :loading="actionLoading[entry.id + '_unlatch']"
                :disabled="Boolean(openBlockReason(entry)) || isBusy(entry)"
                :title="openBlockReason(entry) || ''"
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
