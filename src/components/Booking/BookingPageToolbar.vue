<template>
  <div class="booking-page__toolbar mt-1">
    <div class="booking-page__toolbar-meta">
      <v-btn text small class="booking-page__back px-0" @click="$emit('back')">
        <v-icon left small>mdi-arrow-left</v-icon>
        {{ $t("booking.page.back") }}
      </v-btn>
      <span class="booking-page__toolbar-dot grey--text">·</span>
      <span class="booking-page__tenant text-body-2 grey--text text--darken-2">
        {{ $t("booking.page.tenant", { name: tenantName }) }}
      </span>
      <slot />
    </div>
    <div v-if="state !== 'loading'" class="booking-page__toolbar-actions">
      <slot name="actions" />
      <v-btn
        text
        small
        class="booking-page__copy"
        :color="linkCopied ? 'success' : 'primary'"
        @click="$emit('copy-link')"
      >
        <v-icon left small>
          {{ linkCopied ? "mdi-check" : "mdi-link-variant" }}
        </v-icon>
        {{
          linkCopied
            ? $t("booking.page.link-copied")
            : $t("booking.page.copy-link")
        }}
      </v-btn>
    </div>
  </div>
</template>

<script>
/**
 * The toolbar of a Buchungsseite or Serienbuchungsseite (spec "Toolbar"):
 * "Zurück zu Buchungen", "Mandant: <Name>", the default slot after it (the
 * series chip), and right-aligned the `actions` slot ("Bearbeiten") before
 * "Link kopieren". While loading only "Zurück" is offered; the copy button
 * reads "Link kopiert" while `linkCopied` is set.
 */
export default {
  name: "BookingPageToolbar",
  props: {
    state: { type: String, required: true },
    tenantName: { type: String, default: "" },
    linkCopied: { type: Boolean, default: false },
  },
};
</script>

<style scoped>
/* Two groups: what the page is about on the left, what can be done on the
   right. On a phone the groups stack, the middle dots go, and the actions
   form a row of their own under the meta. */
.booking-page__toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 12px;
}

.booking-page__toolbar-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 8px;
  min-width: 0;
  flex: 1 1 auto;
}

.booking-page__toolbar-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  margin-left: auto;
}

@media (max-width: 599px) {
  .booking-page__toolbar :deep(.booking-page__toolbar-dot) {
    display: none;
  }

  .booking-page__toolbar-actions {
    width: 100%;
    margin-left: 0;
    margin-top: 2px;
  }
}
</style>
