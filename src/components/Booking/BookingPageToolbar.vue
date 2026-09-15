<template>
  <div class="booking-page__toolbar d-flex align-center flex-wrap mt-1">
    <v-btn text small class="booking-page__back px-0" @click="$emit('back')">
      <v-icon left small>mdi-arrow-left</v-icon>
      {{ $t("booking.page.back") }}
    </v-btn>
    <span class="mx-2 grey--text">·</span>
    <span class="booking-page__tenant text-body-2 grey--text text--darken-2">
      {{ $t("booking.page.tenant", { name: tenantName }) }}
    </span>
    <slot />
    <v-spacer />
    <template v-if="state !== 'loading'">
      <slot name="actions" />
      <v-btn
        outlined
        small
        class="booking-page__copy"
        :color="linkCopied ? 'success' : undefined"
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
    </template>
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
