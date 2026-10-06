import { mapActions, mapGetters } from "vuex";
import FormatService from "@/services/FormatService";
import ProcessingService from "@/services/ProcessingService";
import ToastService from "@/services/ToastService";
import ApiBookingService from "@/services/api/ApiBookingService";
import BookingPermissionService from "@/services/permissions/BookingPermissionService";
import {
  getApiErrorMessage,
  unpackBlobErrorBody,
} from "@/services/api/apiErrorMessage";
import { saveBlob } from "@/utils/fileDownload";
import { isTenantMember } from "@/utils/tenantMembership";

/** The booking routes a Dokumente group's PDFs come from, by group. */
const DOCUMENT_FETCHERS = {
  receipts: (bookingId, name) => ApiBookingService.getReceipt(bookingId, name),
  invoices: (bookingId, name) => ApiBookingService.getInvoice(bookingId, name),
  cancellations: (bookingId, name) =>
    ApiBookingService.getCancellationReceipt(bookingId, name),
};

/** How long "Link kopiert" stays on the button (the codebase's copy pattern). */
const LINK_COPIED_MS = 2000;

/**
 * The shell the Buchungsseite and the Serienbuchungsseite share (spec "The
 * pages"): the five page states, the load / reload rule, "Zurück", "Link
 * kopieren", the navbar tenant switch, and the pages' shared hands - the
 * PDF and iCal downloads with their toasts, the stale-screen reload after a
 * refused transition, the date and currency formats. A host provides
 * `pageI18nPrefix` (the page's keys under it: `title`, `non-member`,
 * `not-found`, `error`), `resetEntity()` and `fetch()` - the request that
 * fills the page and throws on failure - and records `cameFromList` in its
 * own `beforeRouteEnter`: vue-router reads the guard off the component's
 * options, and the page specs call it there without a router installed, so
 * a guard in the mixin would not reach them.
 */
export default {
  data() {
    return {
      state: "loading",
      error: null,
      cameFromList: false,
      linkCopied: false,
      linkCopiedTimer: null,
      tenantSwitchTimer: null,
    };
  },
  computed: {
    ...mapGetters({
      tenantId: "tenants/currentTenantId",
      currentTenant: "tenants/currentTenant",
    }),
    /** The tenant the Buchungslink names; absent, the current tenant stands in. */
    queryTenant() {
      const tenant = this.$route.query?.tenant;
      return typeof tenant === "string" && tenant !== "" ? tenant : null;
    },
    tenantName() {
      return this.currentTenant?.name || this.tenantId;
    },
    /**
     * The backend answers 404 alike for gone and out of reach; only a caller
     * whose Reichweite is *any* can be told the entity is gone.
     */
    notFoundSentence() {
      return BookingPermissionService.allowReadAny()
        ? this.$t(`${this.pageI18nPrefix}.not-found.sentence`)
        : this.$t("errors.not-found-or-forbidden.message");
    },
    errorSentence() {
      return getApiErrorMessage(
        this.error,
        this.$t("errors.something-wrong.message")
      );
    },
  },
  watch: {
    "$route.fullPath"() {
      this.load();
    },
    /**
     * A navbar switch leaves for the new tenant's list. A switch the
     * middleware made on the way to another Buchungslink is not a reason to
     * leave: then the URL names the new tenant. The middleware selects before
     * the router confirms the route, and the guards after it only await the
     * store, so the URL has settled by the next macrotask - the decision
     * waits for it.
     */
    tenantId(newTenantId) {
      clearTimeout(this.tenantSwitchTimer);
      this.tenantSwitchTimer = setTimeout(() => {
        if (newTenantId !== this.queryTenant) {
          this.toList();
        }
      }, 0);
    },
  },
  async mounted() {
    await this.load();
  },
  beforeDestroy() {
    clearTimeout(this.linkCopiedTimer);
    clearTimeout(this.tenantSwitchTimer);
  },
  methods: {
    ...mapActions({ addToast: "toasts/add" }),
    /**
     * Non-member is decided before any request (spec "The five page states"):
     * the backend would answer 404 alike, and the tenant id of the URL is the
     * one thing the page can say about it.
     */
    async load() {
      this.state = "loading";
      this.error = null;
      this.resetEntity();
      if (this.queryTenant && !isTenantMember(this.queryTenant)) {
        this.state = "non-member";
        return;
      }
      await this.reload();
    },
    /**
     * The same fetch as `load()` after an action, with the body kept in
     * place: the page refreshes rather than flickers through the skeleton.
     */
    async reload() {
      try {
        await this.fetch();
        this.state = "ready";
      } catch (error) {
        if (error?.response?.status === 404) {
          this.state = "not-found";
          return;
        }
        console.error(error);
        this.error = error;
        this.state = "error";
      }
    },
    /**
     * The Buchungslink is the address bar: the route with its `?tenant=`, as
     * the openers write it and the middleware reads it.
     */
    async copyLink() {
      try {
        await navigator.clipboard.writeText(window.location.href);
      } catch (error) {
        await this.addToast(
          ToastService.createToast("errors.something-wrong", "error")
        );
        return;
      }
      this.linkCopied = true;
      clearTimeout(this.linkCopiedTimer);
      this.linkCopiedTimer = setTimeout(() => {
        this.linkCopied = false;
      }, LINK_COPIED_MS);
    },
    /**
     * One PDF of a Dokumente group - receipt, invoice or cancellation
     * receipt - fetched as a Blob over the routes of the booking it hangs on
     * and saved under `name`, behind the snackbar; a failure toasts.
     */
    async downloadBookingDocument(bookingId, group, name) {
      const operationId = ProcessingService.showSnackbar(
        this.$t("booking.page.documents.download-progress")
      );
      try {
        const response = await DOCUMENT_FETCHERS[group](bookingId, name);
        saveBlob(new Blob([response.data], { type: "application/pdf" }), name);
      } catch (error) {
        // The request asked for a Blob, so the body is unpacked before it is read.
        const unpacked = await unpackBlobErrorBody(error);
        await this.addToast({
          title: this.$t("booking.page.documents.download-error.title"),
          message: getApiErrorMessage(
            unpacked,
            this.$t("booking.page.documents.download-error.message")
          ),
          type: "error",
        });
      } finally {
        ProcessingService.hide(operationId);
      }
    },
    /** Saves the iCal `request` answers under `filename`; a failure toasts as the list's does. */
    async downloadCalendar(request, filename) {
      try {
        const response = await request();
        saveBlob(
          new Blob([response.data], { type: "text/calendar;charset=utf-8" }),
          filename
        );
      } catch (error) {
        await this.addToast(
          ToastService.createToast("booking.ical.error", "error")
        );
      }
    },
    /** The module has toasted the message already; a stale screen reloads. */
    onTransitionFailed({ refetch }) {
      if (refetch) {
        this.reload();
      }
    },
    formatDateTime(value) {
      return FormatService.dateTime(value);
    },
    formatCurrency(value) {
      return FormatService.currency(value || 0);
    },
    toList() {
      this.$router.push({ name: "bookings" });
    },
    goBack() {
      if (this.cameFromList) {
        this.$router.back();
      } else {
        this.$router.push({ name: "bookings" });
      }
    },
  },
};
