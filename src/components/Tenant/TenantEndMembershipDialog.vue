<template>
  <AppDialog
    :open="open"
    icon="mdi-account-remove-outline"
    color="error"
    max-width="500"
    :persistent="false"
    :title="$t('tenant.users.end-membership.confirm-title')"
    :subtitle="address"
    data-test="end-membership-dialog"
    @close="$emit('cancel')"
  >
    <i18n
      path="tenant.users.end-membership.confirm-question"
      tag="p"
      class="text-body-2"
    >
      <template #address>
        <strong>{{ address }}</strong>
      </template>
    </i18n>
    <p class="text-body-2">
      {{ $t("tenant.users.end-membership.confirm-consequences", { address }) }}
    </p>
    <p class="text-body-2 mb-0">
      {{ $t("tenant.users.end-membership.confirm-report", { address }) }}
    </p>

    <template #actions-start>
      <v-btn
        v-if="allowReport"
        color="warning"
        outlined
        data-test="end-membership-report"
        @click="$emit('report')"
      >
        {{ $t("tenant.users.end-membership.report") }}
      </v-btn>
    </template>
    <template #actions>
      <v-btn
        outlined
        data-test="end-membership-cancel"
        @click="$emit('cancel')"
      >
        {{ $t("tenant.users.end-membership.cancel") }}
      </v-btn>
      <v-btn
        color="error"
        depressed
        data-test="end-membership-confirm"
        @click="$emit('confirm')"
      >
        {{ $t("tenant.users.end-membership.action") }}
      </v-btn>
    </template>
  </AppDialog>
</template>

<script>
import AppDialog from "@/components/commons/AppDialog.vue";
/**
 * The question before „Mitgliedschaft beenden“,
 * shared by the list of members and the member dialog.
 */
export default {
  name: "TenantEndMembershipDialog",
  components: { AppDialog },
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    /** The mail address of the member, its user id. */
    address: {
      type: String,
      default: "",
    },
    /** Whether to offer „An Instanz melden“. */
    allowReport: {
      type: Boolean,
      default: false,
    },
  },
};
</script>
