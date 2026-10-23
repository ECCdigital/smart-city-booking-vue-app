<template>
  <v-dialog :value="open" max-width="560" persistent>
    <v-card v-if="draft">
      <v-card-title class="text-h6 text-break flex-nowrap align-start">
        <v-icon color="error" class="mr-2">mdi-email-off-outline</v-icon>
        <span>
          {{ $t("supervision.reports.blacklist.title", { value }) }}
        </span>
      </v-card-title>
      <v-card-text>
        <p class="text-body-2">
          {{ $t("supervision.reports.blacklist.text") }}
        </p>
        <v-radio-group
          v-model="useDomain"
          hide-details
          class="mt-0"
          data-test="report-blacklist-kind"
        >
          <v-radio
            :value="false"
            :label="
              $t('supervision.reports.blacklist.address', {
                address: draft.address,
              })
            "
          />
          <v-radio
            :value="true"
            :label="
              $t('supervision.reports.blacklist.domain', {
                domain: draft.domain,
              })
            "
          />
        </v-radio-group>

        <v-progress-linear v-if="previewLoading" indeterminate class="mt-3" />
        <div
          v-else-if="preview"
          class="text-body-2 mt-3"
          data-test="report-blacklist-preview"
        >
          <template v-if="preview.accounts.suspend.length">
            <div class="error--text">
              {{
                $tc(
                  "supervision.reports.blacklist.suspends",
                  preview.accounts.suspend.length,
                  { count: preview.accounts.suspend.length }
                )
              }}
            </div>
            <ul>
              <li v-for="account in preview.accounts.suspend" :key="account.id">
                {{ account.id }}
              </li>
            </ul>
          </template>
          <div v-else>
            {{ $t("supervision.reports.blacklist.suspends-none") }}
          </div>
        </div>

        <v-textarea
          v-model="reason"
          :label="$t('supervision.reports.blacklist.reason')"
          outlined
          rows="2"
          auto-grow
          hide-details="auto"
          class="mt-3"
          data-test="report-blacklist-reason"
        />
        <v-alert v-if="shownError" type="error" dense text class="mt-3 mb-0">
          {{ shownError }}
        </v-alert>
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn text :disabled="inProgress" @click="$emit('cancel')">
          {{ $t("supervision.reports.cancel") }}
        </v-btn>
        <v-btn
          color="error"
          depressed
          :disabled="!reason.trim()"
          :loading="inProgress"
          data-test="report-blacklist-confirm"
          @click="
            $emit('confirm', { reason: reason.trim(), domain: useDomain })
          "
        >
          {{ $t("supervision.reports.blacklist.confirm") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import ApiBlacklistService from "@/services/api/ApiBlacklistService";
import { getApiErrorMessage } from "@/services/api/apiErrorMessage";

/**
 * „Auf Blacklist setzen“ for the open reports about an address:
 * the entry is the exact address or, if chosen,
 * its domain, with the reasons of the reports as its reason, which the
 * instance owner may change. Shows the accounts the entry suspends at
 * once, as the blacklist's own preview does. Emits `confirm` with
 * `{ reason, domain }`, or `cancel`; the parent settles.
 */
export default {
  name: "ReportBlacklistConformationDialog",
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    /** `blacklistDraftOf` the group: address, domain and reason. */
    draft: {
      type: Object,
      default: null,
    },
    inProgress: {
      type: Boolean,
      default: false,
    },
    /** The error of the settlement, from the parent. */
    error: {
      type: String,
      default: null,
    },
  },
  data() {
    return {
      useDomain: false,
      reason: "",
      preview: null,
      previewLoading: false,
      previewError: null,
    };
  },
  computed: {
    value() {
      if (!this.draft) return "";
      return this.useDomain ? this.draft.domain : this.draft.address;
    },
    shownError() {
      return this.error || this.previewError;
    },
  },
  watch: {
    open: {
      immediate: true,
      handler(isOpen) {
        if (!isOpen || !this.draft) return;
        this.useDomain = false;
        this.reason = this.draft.reason;
        this.loadPreview();
      },
    },
    useDomain() {
      this.loadPreview();
    },
  },
  methods: {
    async loadPreview() {
      const value = this.value;
      this.preview = null;
      this.previewError = null;
      this.previewLoading = true;
      try {
        const response = await ApiBlacklistService.getPreview(value);
        // A later choice may have asked meanwhile.
        if (value === this.value) this.preview = response.data;
      } catch (error) {
        console.error(error);
        this.previewError = getApiErrorMessage(
          error,
          this.$t("instance.blacklist.create.preview-error")
        );
      } finally {
        this.previewLoading = false;
      }
    },
  },
};
</script>
