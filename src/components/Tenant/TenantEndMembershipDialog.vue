<template>
  <v-dialog :value="open" max-width="500" @input="$emit('cancel')">
    <v-card data-test="end-membership-dialog">
      <v-card-title class="red--text">
        <v-icon color="red" left>mdi-alert</v-icon>
        {{ $t("tenant.users.end-membership.confirm-title") }}
      </v-card-title>
      <v-card-text>
        <i18n path="tenant.users.end-membership.confirm-question" tag="p">
          <template #address>
            <strong>{{ address }}</strong>
          </template>
        </i18n>
        <p>
          {{
            $t("tenant.users.end-membership.confirm-consequences", { address })
          }}
        </p>
        <p class="mb-0">
          {{ $t("tenant.users.end-membership.confirm-report", { address }) }}
        </p>
      </v-card-text>
      <v-card-actions>
        <v-btn
          v-if="allowReport"
          color="warning"
          outlined
          data-test="end-membership-report"
          @click="$emit('report')"
        >
          {{ $t("tenant.users.end-membership.report") }}
        </v-btn>
        <v-spacer />
        <v-btn text data-test="end-membership-cancel" @click="$emit('cancel')">
          {{ $t("tenant.users.end-membership.cancel") }}
        </v-btn>
        <v-btn
          color="red"
          dark
          data-test="end-membership-confirm"
          @click="$emit('confirm')"
        >
          {{ $t("tenant.users.end-membership.action") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
/**
 * The question before „Mitgliedschaft beenden“,
 * shared by the list of members and the member dialog.
 */
export default {
  name: "TenantEndMembershipDialog",
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
