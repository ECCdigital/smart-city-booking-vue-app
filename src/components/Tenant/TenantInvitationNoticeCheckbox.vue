<template>
  <v-checkbox
    :input-value="value"
    hide-details
    dense
    class="mt-4"
    @change="$emit('change', !!$event)"
  >
    <template v-slot:label>
      <div>
        <div class="font-weight-medium">
          Besitzer benachrichtigen, wenn eine Einladung angenommen wird
        </div>
        <div class="text-caption text--secondary">
          Gilt für alle Einladungen dieses Mandanten, per E-Mail und per Link.
        </div>
      </div>
    </template>
  </v-checkbox>
</template>

<script>
/**
 * The tenant's one setting for every invitation, by mail and by link: shown
 * at the end of each way of inviting in `TenantInviteUserDialog`.
 */
export default {
  name: "TenantInvitationNoticeCheckbox",
  props: {
    value: { type: Boolean, default: true },
  },
};
</script>
