<template>
  <v-alert
    v-if="showWarning"
    type="warning"
    border="left"
    colored-border
    elevation="2"
    class="mb-4"
    dismissible
    @input="dismissed = true"
  >
    <div class="d-flex align-center">
      <div>
        <strong>Zeitzone-Hinweis:</strong>
        Ihre Zeitzone ({{ userTimezone }}) weicht von der Systemzeitzone ({{
          systemTimezone
        }}) ab.
        <br />
        <small class="mt-1 d-block">
          Zeitunterschied: {{ timeDifference }}
        </small>
      </div>
    </div>
  </v-alert>
</template>

<script>
export default {
  name: "TimezoneWarning",
  props: {
    systemTimezone: {
      type: String,
      default: "Europe/Berlin",
    },
  },
  data() {
    return {
      dismissed: false,
    };
  },
  computed: {
    userTimezone() {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    },
    showWarning() {
      return !this.dismissed && this.userTimezone !== this.systemTimezone;
    },
    timeDifference() {
      const now = new Date();
      const userOffset = now.getTimezoneOffset();
      const systemDate = new Date(
        now.toLocaleString("en-US", {
          timeZone: this.systemTimezone,
        })
      );
      const systemOffset = (now.getTime() - systemDate.getTime()) / (1000 * 60);
      const diff = Math.round((systemOffset - userOffset) / 60);

      if (diff === 0) return "Keine Differenz";
      const sign = diff > 0 ? "+" : "";
      return `${sign}${diff} Stunde${Math.abs(diff) !== 1 ? "n" : ""}`;
    },
  },
};
</script>
