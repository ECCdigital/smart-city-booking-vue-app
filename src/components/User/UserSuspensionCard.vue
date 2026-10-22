<template>
  <div>
    <v-card outlined :class="{ 'suspension-card': user.isSuspended }">
      <v-card-text class="pa-5">
        <div class="d-flex flex-column flex-sm-row align-center">
          <div class="flex-grow-1 mb-3 mb-sm-0">
            <div class="text-body-1 font-weight-medium mb-1">
              <v-icon :color="user.isSuspended ? 'error' : 'grey'" class="mr-1">
                {{
                  user.isSuspended ? "mdi-cancel" : "mdi-check-circle-outline"
                }}
              </v-icon>
              {{ $t("user.suspension.title") }}
            </div>
            <div
              class="text-body-2"
              :class="{ 'grey--text': !user.isSuspended }"
            >
              {{ statusText }}
            </div>
            <div v-if="reasonText" class="text-body-2">
              {{ reasonText }}
            </div>
            <div
              class="text-body-2 mt-1 d-flex align-center"
              :class="{ 'grey--text': !user.blacklistMatch }"
            >
              <v-icon
                small
                :color="user.blacklistMatch ? 'error' : 'grey'"
                class="mr-1"
              >
                {{
                  user.blacklistMatch
                    ? "mdi-email-off-outline"
                    : "mdi-email-check-outline"
                }}
              </v-icon>
              {{ blacklistText }}
            </div>
          </div>
          <v-btn v-if="!user.isSuspended" color="error" @click="openSuspend">
            <v-icon left small>mdi-cancel</v-icon>
            {{ $t("user.suspension.suspend.open") }}
          </v-btn>
          <v-btn v-else outlined @click="openUnsuspend">
            {{ $t("user.suspension.unsuspend.open") }}
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <UserSuspendConformationDialog
      :open="suspendDialog"
      :name="name"
      :address="user.id"
      :preview="preview"
      :in-progress="inProgress"
      :error="error"
      @confirm="suspend"
      @cancel="suspendDialog = false"
    />
    <UserUnsuspendConformationDialog
      :open="unsuspendDialog"
      :name="name"
      :entry="unsuspendEntry"
      :in-progress="inProgress"
      :error="error"
      @confirm="unsuspend"
      @cancel="unsuspendDialog = false"
    />
  </div>
</template>

<script>
import ApiUsersService from "@/services/api/ApiUsersService";
import { getApiErrorMessage } from "@/services/api/apiErrorMessage";
import UserSuspendConformationDialog from "@/components/User/UserSuspendConformationDialog.vue";
import UserUnsuspendConformationDialog from "@/components/User/UserUnsuspendConformationDialog.vue";
import {
  blacklistMatchText,
  suspensionReasonText,
  suspensionStatusText,
} from "@/utils/userSuspension";

/**
 * The card „Sperre“ in the user editing (ECCdigital/tickets#624): suspends
 * and lifts the suspension at once over its own dialogs, never with
 * „Speichern“ of the user dialog, both with the blacklist as their
 * counterpart (ECCdigital/tickets#626). Emits `changed` with the user as
 * the API answers it.
 */
export default {
  name: "UserSuspensionCard",
  components: {
    UserSuspendConformationDialog,
    UserUnsuspendConformationDialog,
  },
  props: {
    user: {
      type: Object,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      suspendDialog: false,
      unsuspendDialog: false,
      preview: null,
      // The blacklist entry that hits the address; `undefined` while it loads.
      unsuspendEntry: undefined,
      error: null,
      inProgress: false,
    };
  },
  computed: {
    statusText() {
      return suspensionStatusText(this.user);
    },
    reasonText() {
      return suspensionReasonText(this.user);
    },
    blacklistText() {
      return blacklistMatchText(this.user);
    },
  },
  methods: {
    async openSuspend() {
      this.preview = null;
      this.error = null;
      this.suspendDialog = true;
      try {
        const response = await ApiUsersService.getSuspensionPreview(
          this.user.id
        );
        this.preview = response.data;
      } catch (error) {
        console.error(error);
        this.error = getApiErrorMessage(
          error,
          this.$t("user.suspension.suspend.preview-error")
        );
      }
    },
    /** Asks the preview for the blacklist entry that hits the address. */
    async openUnsuspend() {
      this.unsuspendEntry = undefined;
      this.error = null;
      this.unsuspendDialog = true;
      try {
        const response = await ApiUsersService.getSuspensionPreview(
          this.user.id
        );
        this.unsuspendEntry = response.data.blacklistEntry ?? null;
      } catch (error) {
        console.error(error);
        // Lifting the suspension still works, only without the entry.
        this.unsuspendEntry = null;
        this.error = getApiErrorMessage(
          error,
          this.$t("user.suspension.unsuspend.preview-error")
        );
      }
    },
    async suspend({ reason, blacklist }) {
      this.inProgress = true;
      this.error = null;
      try {
        const response = await ApiUsersService.suspendUser(
          this.user.id,
          reason,
          blacklist
        );
        this.$emit("changed", response.data);
        this.suspendDialog = false;
      } catch (error) {
        console.error(error);
        this.error = getApiErrorMessage(
          error,
          this.$t("user.suspension.suspend.error")
        );
      } finally {
        this.inProgress = false;
      }
    },
    async unsuspend(removeBlacklistEntry) {
      this.inProgress = true;
      this.error = null;
      try {
        const response = await ApiUsersService.unsuspendUser(
          this.user.id,
          removeBlacklistEntry
        );
        this.$emit("changed", response.data);
        this.unsuspendDialog = false;
      } catch (error) {
        console.error(error);
        this.error = getApiErrorMessage(
          error,
          this.$t("user.suspension.unsuspend.error")
        );
      } finally {
        this.inProgress = false;
      }
    },
  },
};
</script>

<style scoped>
.suspension-card {
  border-color: #ef5350 !important;
  background: linear-gradient(
    to right,
    rgba(244, 67, 54, 0.02),
    rgba(244, 67, 54, 0.05)
  );
}
</style>
