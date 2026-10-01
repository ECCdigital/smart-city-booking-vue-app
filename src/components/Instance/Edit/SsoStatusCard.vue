<template>
  <v-card outlined class="sso-status mb-4" data-test="sso-status">
    <div class="sso-status__head">
      <v-icon color="primary">mdi-lock</v-icon>
      <div class="sso-status__text">
        <div class="sso-status__title">
          {{ $t("instance.edit.sso.status.title") }}
        </div>
        <div class="sso-status__facts">
          <span v-if="!guide.complete" class="sso-status__state">
            {{ $t("instance.edit.sso.status.notSetUp") }}
          </span>
          <span v-else class="sso-status__fact">
            <span class="sso-status__label">
              {{ $t("instance.edit.sso.status.issuer") }}
            </span>
            <RealmGuideValue :value="guide.values.issuer" />
          </span>
          <span class="sso-status__fact">
            <span class="sso-status__label">
              {{ $t("instance.edit.sso.status.mode") }}
            </span>
            {{ $t(`instance.edit.sso.status.modes.${guide.mode}`) }}
          </span>
        </div>
      </div>
      <!-- „Realm prüfen“ (ECCdigital/tickets#97) and the menu „Als Text“
           (ECCdigital/tickets#96) go here. -->
      <div class="sso-status__actions">
        <slot name="actions" />
      </div>
    </div>

    <!-- Why „Realm prüfen“ is locked, or the counts of the last check
         (ECCdigital/tickets#97). -->
    <slot />

    <v-alert
      v-if="saved"
      type="info"
      text
      dense
      class="mt-3 mb-0"
      data-test="sso-saved"
    >
      {{ $t("instance.edit.sso.status.saved") }}
    </v-alert>
  </v-card>
</template>

<script>
import RealmGuideValue from "@/components/Instance/Edit/RealmGuideValue.vue";

/**
 * The status card on top of the tab „Single Sign-On“: the Issuer and the mode
 * of the Admin UI, or „Noch nicht eingerichtet“ while values are missing.
 */
export default {
  name: "SsoStatusCard",
  components: { RealmGuideValue },
  props: {
    guide: { type: Object, required: true },
    /** Shows that sign-in runs on the old values for up to a minute. */
    saved: { type: Boolean, default: false },
  },
};
</script>

<style scoped>
.sso-status {
  border-radius: var(--scb-radius-surface) !important;
  padding: var(--scb-space-4);
}

.sso-status__head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--scb-space-3);
}

.sso-status__text {
  flex: 1 1 auto;
  min-width: 0;
}

.sso-status__title {
  font-size: var(--scb-font-size-header);
  font-weight: var(--scb-font-weight-semibold);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text);
}

.sso-status__facts {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--scb-space-1) var(--scb-space-4);
  margin-top: var(--scb-space-1);
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text);
}

.sso-status__fact {
  display: inline-flex;
  align-items: center;
  gap: var(--scb-space-2);
  min-width: 0;
}

.sso-status__label,
.sso-status__state {
  color: var(--scb-text-muted);
}

.sso-status__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--scb-space-2);
}

.sso-status__actions:empty {
  display: none;
}
</style>
