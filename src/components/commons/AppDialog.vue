<template>
  <v-dialog
    :value="open"
    :max-width="maxWidth"
    :persistent="persistent"
    scrollable
    @input="(value) => !value && $emit('close')"
  >
    <v-card class="app-dialog" v-bind="$attrs">
      <v-card-title class="app-dialog__header">
        <v-avatar
          size="40"
          class="app-dialog__avatar"
          :class="`${color}--text`"
        >
          <v-icon :color="color">{{ icon }}</v-icon>
        </v-avatar>
        <div class="app-dialog__heading">
          <div class="app-dialog__title">
            <slot name="title">{{ title }}</slot>
          </div>
          <div v-if="subtitle" class="app-dialog__subtitle">
            {{ subtitle }}
          </div>
        </div>
        <v-btn
          icon
          class="app-dialog__close"
          :disabled="busy"
          :title="$t('dialog.close')"
          :aria-label="$t('dialog.close')"
          data-test="app-dialog-close"
          @click="$emit('close')"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-divider />

      <v-card-text class="app-dialog__body">
        <slot />
      </v-card-text>

      <v-divider />

      <v-card-actions class="app-dialog__actions">
        <slot name="actions-start" />
        <v-spacer />
        <slot name="actions" />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
/**
 * The frame of a dialog, drawn as the member details of „Mitglieder“ are:
 * a header with an icon in a tinted circle, the title, an optional line
 * below it and a close button; the body and the actions each under a
 * hairline. The body is the default slot, the buttons are `actions` (on the
 * right) and `actions-start` (on the left). Attributes such as `data-test`
 * go to the card. Emits `close` from the close button and, for a dialog
 * that is not `persistent`, from a click beside it.
 */
export default {
  name: "AppDialog",
  inheritAttrs: false,
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    title: {
      type: String,
      default: "",
    },
    /** A quiet line below the title, such as the address concerned. */
    subtitle: {
      type: String,
      default: "",
    },
    icon: {
      type: String,
      default: "mdi-information-outline",
    },
    /** A theme color: the icon and its tinted circle. */
    color: {
      type: String,
      default: "primary",
    },
    maxWidth: {
      type: [String, Number],
      default: 560,
    },
    persistent: {
      type: Boolean,
      default: true,
    },
    /** While the dialog works, it cannot be closed. */
    busy: {
      type: Boolean,
      default: false,
    },
  },
};
</script>

<style scoped>
.app-dialog__header {
  flex-wrap: nowrap;
  align-items: center;
  gap: var(--scb-space-4);
  padding: var(--scb-space-4) var(--scb-space-6) !important;
}

/* The icon's circle: its own color, faint, so it reads in both themes. */
.app-dialog__avatar {
  position: relative;
  flex: none;
}

.app-dialog__avatar::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.12;
}

.app-dialog__heading {
  flex: 1 1 auto;
  min-width: 0;
}

.app-dialog__title {
  font-size: 1.25rem;
  font-weight: 500;
  line-height: 1.4;
  word-break: normal;
  overflow-wrap: anywhere;
}

.app-dialog__subtitle {
  font-size: var(--scb-font-size-xs);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text-muted);
  overflow-wrap: anywhere;
}

.app-dialog__close {
  flex: none;
  align-self: flex-start;
  margin: -4px -8px 0 0;
}

.app-dialog__body {
  padding: var(--scb-space-5) var(--scb-space-6) !important;
  color: var(--scb-text) !important;
}

.app-dialog__actions {
  flex-wrap: wrap;
  gap: var(--scb-space-2);
  padding: var(--scb-space-4) var(--scb-space-6) !important;
}

.app-dialog__actions > .v-btn + .v-btn {
  margin-left: 0 !important;
}
</style>
