<template>
  <v-chip
    v-if="status"
    :color="meta.color"
    :text-color="meta.textColor"
    small
    label
  >
    <v-icon left x-small>{{ meta.icon }}</v-icon>
    {{ meta.label }}
  </v-chip>
  <span v-else class="grey--text text-caption">—</span>
</template>

<script>
const STATUS_META = {
  success: {
    color: "green",
    textColor: "white",
    icon: "mdi-check-circle",
    label: "Erfolg",
  },
  partial: {
    color: "amber",
    textColor: "black",
    icon: "mdi-alert",
    label: "Teilweise",
  },
  error: {
    color: "red",
    textColor: "white",
    icon: "mdi-close-circle",
    label: "Fehler",
  },
  skipped: {
    color: "blue-grey",
    textColor: "white",
    icon: "mdi-debug-step-over",
    label: "Dry-Run",
  },
};

export default {
  name: "RuleStatusBadge",
  props: {
    status: {
      type: String,
      default: null,
    },
  },
  computed: {
    meta() {
      return (
        STATUS_META[this.status] || {
          color: "grey",
          textColor: "white",
          icon: "mdi-help-circle",
          label: this.status,
        }
      );
    },
  },
};
</script>
