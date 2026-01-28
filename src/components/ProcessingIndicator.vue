<template>
  <div>
    <v-overlay
      :value="visible && displayOptions.critical"
      :z-index="9999"
      opacity="0.7"
    >
      <v-card
        class="processing-card processing-card--overlay elevation-12"
        :color="isDark ? '#1E1E1E' : '#FFFFFF'"
        :loading="displayOptions.progress !== undefined"
        width="400"
      >
        <v-card-text class="text-center pa-6">
          <div class="mb-4">
            <v-avatar
              size="64"
              :color="isDark ? 'primary darken-1' : 'primary'"
              class="processing-avatar elevation-4"
            >
              <v-icon size="32" color="white" class="rotating">
                mdi-loading
              </v-icon>
            </v-avatar>
          </div>

          <h3
            class="text-h6 font-weight-bold mb-2"
            :class="isDark ? 'white--text' : 'grey--text text--darken-4'"
          >
            {{ displayOptions.message || "Verarbeitung läuft..." }}
          </h3>

          <p
            v-if="displayOptions.subtitle"
            class="text-body-2 mb-4"
            :class="
              isDark
                ? 'grey--text text--lighten-1'
                : 'grey--text text--darken-1'
            "
          >
            {{ displayOptions.subtitle }}
          </p>

          <v-progress-linear
            v-if="displayOptions.progress !== undefined"
            :value="displayOptions.progress"
            :indeterminate="displayOptions.progress === -1"
            color="primary"
            height="8"
            rounded
            class="mb-2"
          ></v-progress-linear>

          <span
            v-if="
              displayOptions.progress !== undefined &&
              displayOptions.progress !== -1
            "
            class="text-caption"
            :class="
              isDark
                ? 'grey--text text--lighten-1'
                : 'grey--text text--darken-1'
            "
          >
            {{ displayOptions.progress }}%
          </span>
        </v-card-text>
      </v-card>
    </v-overlay>

    <v-snackbar
      v-model="snackbarVisible"
      :timeout="-1"
      bottom
      right
      class="processing-snackbar"
      color="transparent"
      elevation="0"
    >
      <v-card
        class="processing-card processing-card--snackbar elevation-8"
        :color="isDark ? '#1E1E1E' : '#FFFFFF'"
        :loading="displayOptions.progress !== undefined"
        width="360"
      >
        <v-card-text class="pa-4">
          <div class="d-flex align-center">
            <v-avatar
              size="40"
              :color="isDark ? 'primary darken-1' : 'primary'"
              class="mr-3 elevation-2"
            >
              <v-icon size="20" color="white" class="rotating">
                mdi-loading
              </v-icon>
            </v-avatar>

            <div class="flex-grow-1">
              <div
                class="text-body-1 font-weight-bold mb-1"
                :class="isDark ? 'white--text' : 'grey--text text--darken-4'"
              >
                {{ displayOptions.message || "Verarbeitung läuft..." }}
              </div>

              <div
                v-if="displayOptions.subtitle"
                class="text-caption"
                :class="
                  isDark
                    ? 'grey--text text--lighten-1'
                    : 'grey--text text--darken-1'
                "
              >
                {{ displayOptions.subtitle }}
              </div>
            </div>
          </div>

          <v-progress-linear
            v-if="displayOptions.progress !== undefined"
            :value="displayOptions.progress"
            :indeterminate="displayOptions.progress === -1"
            color="primary"
            height="4"
            rounded
            class="mt-3"
          ></v-progress-linear>
        </v-card-text>
      </v-card>
    </v-snackbar>
  </div>
</template>

<script>
import ProcessingService from "@/services/ProcessingService";

export default {
  name: "ProcessingIndicator",
  data() {
    return {
      visible: false,
      displayOptions: {},
    };
  },
  computed: {
    snackbarVisible: {
      get() {
        return this.visible && !this.displayOptions.critical;
      },
      set(value) {
        if (!value) this.visible = false;
      },
    },
    isDark() {
      return this.$vuetify?.theme?.dark || false;
    },
  },
  methods: {
    show(options) {
      this.displayOptions = options;
      this.visible = true;
    },
    hide() {
      this.visible = false;
      this.displayOptions = {};
    },
  },
  mounted() {
    ProcessingService.setComponent(this);
  },
  beforeDestroy() {
    ProcessingService.setComponent(null);
  },
};
</script>

<style scoped lang="scss">
.processing-card {
  border-radius: 12px !important;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
  overflow: hidden;
}

.processing-avatar {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.rotating {
  animation: rotating 1s linear infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.9;
    transform: scale(1.05);
  }
}

.v-progress-linear {
  border-radius: 8px;
  overflow: hidden;
}

::v-deep .v-snack__wrapper {
  background: transparent !important;
  box-shadow: none !important;
  margin: 0 !important;
  padding: 0 !important;
}

::v-deep .v-snack__content {
  padding: 0 !important;
}

.processing-card--snackbar {
  animation: slideInRight 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>
