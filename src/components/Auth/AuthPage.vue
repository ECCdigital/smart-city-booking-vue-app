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

export default {
  name: "AuthPage",

  props: {
    active: {
      type: String,
      default: null,
      validator: (value) =>
        value === null || ["login", "register"].includes(value),
    },
    title: {
      type: String,
      default: "",
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
    tabs() {
      return [
        {
          key: "login",
          route: "login",
          icon: "mdi-login-variant",
          label: "Anmelden",
        },
        {
          key: "register",
          route: "register",
          icon: "mdi-account-plus-outline",
          label: "Registrieren",
        },
      ];
    },
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
      <div v-if="title" class="v-card__title section-header auth-page__title">
        <v-icon v-if="icon">{{ icon }}</v-icon>
        <span>{{ title }}</span>
      </div>
      <nav
        v-else
        class="v-card__title section-header auth-page__nav"
        aria-label="Anmelden oder Registrieren"
      >
        <router-link
          v-for="tab in tabs"
          :key="tab.key"
          :to="{ name: tab.route }"
          class="auth-page__pill"
          :class="{ 'auth-page__pill--active': tab.key === active }"
          :aria-current="tab.key === active ? 'page' : null"
        >
          <v-icon small class="auth-page__pill-icon">{{ tab.icon }}</v-icon>
          {{ tab.label }}
        </router-link>
      </nav>
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
  max-width: 520px;
}

.auth-page__nav {
  padding: 10px var(--scb-space-3) !important;
  gap: var(--scb-space-1);
}

.auth-page__pill {
  display: inline-flex;
  align-items: center;
  gap: var(--scb-space-2);
  padding: 7px 14px;
  border-radius: var(--scb-radius-pill);
  color: var(--scb-text-muted);
  font-size: var(--scb-font-size-md);
  font-weight: var(--scb-font-weight-medium);
  line-height: 1.2;
  text-decoration: none;
  white-space: nowrap;
  transition: background-color var(--scb-motion-fast),
    color var(--scb-motion-fast);
}

.auth-page__pill:hover,
.auth-page__pill:focus-visible {
  color: var(--scb-text-hover);
  background-color: var(--scb-hover-tint-strong);
}

.auth-page__pill--active,
.auth-page__pill--active:hover,
.auth-page__pill--active:focus-visible {
  color: var(--v-primary-base);
  background-color: var(--scb-selected-tint-strong);
}

.auth-page__pill-icon {
  color: inherit !important;
}

.auth-page__footer {
  max-width: 520px;
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
