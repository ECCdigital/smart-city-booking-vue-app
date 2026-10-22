<template>
  <v-dialog :value="open" max-width="560" persistent>
    <v-card>
      <v-card-title class="text-h6 text-break flex-nowrap align-start">
        <v-icon color="error" class="mr-2">mdi-email-off-outline</v-icon>
        <span>{{ $t("instance.blacklist.create.title") }}</span>
      </v-card-title>
      <v-card-text>
        <div class="d-flex align-start">
          <v-text-field
            v-model="value"
            :label="$t('instance.blacklist.create.value')"
            :hint="$t('instance.blacklist.create.value-hint')"
            :error-messages="valueError"
            persistent-hint
            outlined
            dense
            autofocus
            @keydown.enter="loadPreview"
          />
          <v-btn
            class="ml-2 mt-1"
            outlined
            :disabled="!parsed || inProgress"
            :loading="previewLoading"
            @click="loadPreview"
          >
            {{ $t("instance.blacklist.create.preview") }}
          </v-btn>
        </div>

        <div v-if="preview" class="mt-4">
          <v-alert v-if="preview.exists" type="warning" text dense>
            {{
              $t("instance.blacklist.create.exists", { value: preview.value })
            }}
          </v-alert>
          <div v-if="!accountCount" class="text-body-2 mb-3">
            {{ $t("instance.blacklist.create.none") }}
          </div>
          <div
            v-for="group in accountGroups"
            :key="group.key"
            class="mb-3"
            :data-test="`blacklist-preview-${group.key}`"
          >
            <div class="text-subtitle-2" :class="group.color">
              {{
                $t(`instance.blacklist.create.${group.key}`, {
                  count: group.accounts.length,
                })
              }}
            </div>
            <ul class="text-body-2">
              <li v-for="account in group.accounts" :key="account.id">
                {{ accountText(account) }}
              </li>
            </ul>
          </div>
        </div>

        <v-textarea
          v-model="reason"
          :label="$t('instance.blacklist.create.reason')"
          outlined
          rows="2"
          auto-grow
          hide-details="auto"
          class="mt-3"
        />
        <v-alert v-if="error" type="error" dense text class="mt-3 mb-0">
          {{ error }}
        </v-alert>
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn text :disabled="inProgress" @click="$emit('cancel')">
          {{ $t("instance.blacklist.create.cancel") }}
        </v-btn>
        <v-btn
          color="error"
          :disabled="!canConfirm"
          :loading="inProgress"
          @click="
            $emit('confirm', { value: preview.value, reason: reason.trim() })
          "
        >
          {{ $t("instance.blacklist.create.confirm") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import ApiBlacklistService from "@/services/api/ApiBlacklistService";
import { getApiErrorMessage } from "@/services/api/apiErrorMessage";
import { parseBlacklistValue } from "@/utils/blacklist";

/**
 * „Eintrag anlegen“ on the blacklist (ECCdigital/tickets#625): an address
 * or a domain, the preview of the accounts it hits and a required reason.
 * Saving waits for the preview of the value as it stands. Emits `confirm`
 * with the value and the trimmed reason, or `cancel`; the parent adds.
 */
export default {
  name: "BlacklistCreateDialog",
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    inProgress: {
      type: Boolean,
      default: false,
    },
    /** The error of the save, from the parent. */
    saveError: {
      type: String,
      default: null,
    },
  },
  data() {
    return {
      value: "",
      reason: "",
      preview: null,
      previewLoading: false,
      previewError: null,
    };
  },
  computed: {
    parsed() {
      return parseBlacklistValue(this.value);
    },
    valueError() {
      return this.value.trim() && !this.parsed
        ? this.$t("instance.blacklist.create.value-invalid")
        : [];
    },
    error() {
      return this.saveError || this.previewError;
    },
    accountGroups() {
      if (!this.preview) return [];
      const { suspend, instanceOwners, alreadySuspended } =
        this.preview.accounts;
      return [
        { key: "suspend", accounts: suspend, color: "error--text" },
        { key: "instance-owners", accounts: instanceOwners, color: "" },
        { key: "already-suspended", accounts: alreadySuspended, color: "" },
      ].filter((group) => group.accounts.length);
    },
    accountCount() {
      return this.accountGroups.reduce(
        (sum, group) => sum + group.accounts.length,
        0
      );
    },
    canConfirm() {
      return (
        !!this.preview &&
        !this.preview.exists &&
        this.preview.value === this.parsed?.value &&
        !!this.reason.trim()
      );
    },
  },
  watch: {
    open(isOpen) {
      if (isOpen) {
        this.value = "";
        this.reason = "";
        this.preview = null;
        this.previewError = null;
      }
    },
    value() {
      if (this.preview && this.preview.value !== this.parsed?.value) {
        this.preview = null;
      }
    },
  },
  methods: {
    accountText(account) {
      const name = `${account.firstName} ${account.lastName}`.trim();
      return name ? `${name} (${account.id})` : account.id;
    },
    async loadPreview() {
      if (!this.parsed) return;
      this.previewLoading = true;
      this.previewError = null;
      try {
        const response = await ApiBlacklistService.getPreview(
          this.parsed.value
        );
        this.preview = response.data;
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
