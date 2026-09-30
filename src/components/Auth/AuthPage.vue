<script>
import { mapGetters } from "vuex";
import Utils from "@/utils/Utils";
import { legalDocumentHref } from "@/utils/instanceLegalDocuments";

// The instance's legal documents in the order the footer lists them.
const LEGAL_DOCUMENTS = Object.freeze([
  { key: "dataProtection", label: "Datenschutz" },
  { key: "legalNotice", label: "Impressum" },
  { key: "termsAndConditions", label: "AGB" },
]);

/**
 * The shell of the login, registration and password reset pages and of the
 * other pages a visitor meets before the app: the logo over one form card
 * headed by the page's title, the page's `scb-form` in the default slot
 * (form-card.scss), and the provider with the legal documents under the card.
 * The way to the other pages is a sentence with a link under the form's own
 * button, never a second button beside it; the pages hand the return target
 * (`?next=`) on through that link themselves.
 */
export default {
  name: "AuthPage",

  props: {
    title: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
      default: "",
    },
  },

  computed: {
    ...mapGetters({
      instance: "instance/instance",
    }),
    appLogo() {
      return process.env.BASE_URL && process.env.BASE_URL.trim()
        ? `${process.env.BASE_URL.replace(/\/$/, "")}/app-logo.png`
        : "/app-logo.png";
    },
    contactAddress() {
      return this.instance?.contactAddress || "";
    },
    contactUrl() {
      return Utils.sanitizeUrl(this.instance?.contactUrl) || "";
    },
    contactHref() {
      return this.contactUrl ? `https://${this.contactUrl}` : "";
    },
    legalLinks() {
      return LEGAL_DOCUMENTS.map((doc) => ({
        ...doc,
        url: legalDocumentHref(this.instance?.[doc.key]?.url),
      })).filter((doc) => doc.url);
    },
  },
};
</script>

<template>
  <v-container class="auth-page">
    <img :src="appLogo" alt="" class="auth-page__logo" />

    <v-card outlined class="section-card auth-page__card mx-auto">
      <h1 class="v-card__title section-header auth-page__title">
        <v-icon v-if="icon">{{ icon }}</v-icon>
        <span>{{ title }}</span>
      </h1>
      <v-divider />
      <slot />
    </v-card>

    <footer
      v-if="contactAddress || legalLinks.length"
      class="auth-page__footer mx-auto"
    >
      <p v-if="contactAddress" class="auth-page__provider mb-1">
        Bereitgestellt von {{ contactAddress
        }}<template v-if="contactUrl">
          ·
          <a :href="contactHref" target="_blank" rel="noopener noreferrer">{{
            contactUrl
          }}</a></template
        >
      </p>
      <p v-if="legalLinks.length" class="auth-page__legal mb-0">
        <template v-for="(doc, i) in legalLinks">
          <a
            :key="doc.key"
            :href="doc.url"
            target="_blank"
            rel="noopener noreferrer"
            >{{ doc.label }}</a
          >
          <span
            v-if="i < legalLinks.length - 1"
            :key="`${doc.key}-sep`"
            class="auth-page__sep"
            aria-hidden="true"
          ></span>
        </template>
      </p>
    </footer>
  </v-container>
</template>

<style scoped>
.auth-page {
  padding-top: 56px;
  padding-bottom: var(--scb-space-6);
}

.auth-page__logo {
  display: block;
  height: 48px;
  width: auto;
  max-width: 240px;
  margin: 0 auto 56px;
  object-fit: contain;
}

.auth-page__card {
  max-width: var(--scb-form-width);
}

/* The strip is the page's heading; it keeps the strip's scale, not h1's. */
.auth-page__title {
  margin: 0;
}

.auth-page__footer {
  max-width: var(--scb-form-width);
  margin-top: var(--scb-space-5);
  text-align: center;
  font-size: var(--scb-font-size-xs);
  line-height: var(--scb-line-height-base);
}

.auth-page__provider {
  color: var(--scb-text-muted);
}

.auth-page__legal {
  margin-top: var(--scb-space-5);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--scb-space-3);
}

.auth-page__sep {
  width: 1px;
  height: 14px;
  background-color: var(--scb-surface-border);
}

/* $scb-bp-xs of tokens.scss; a scoped style cannot read it. */
@media (max-width: 599px) {
  .auth-page {
    padding-top: var(--scb-space-6);
  }
}
</style>
