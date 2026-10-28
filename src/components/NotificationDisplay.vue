<template>
  <div class="notification-container">
    <v-dialog v-model="sequentialDialog" max-width="750" scrollable>
      <v-card v-if="filteredNotifications.length > 0">
        <v-card-title class="d-flex align-center py-4 px-6">
          <v-icon left>mdi-bell-outline</v-icon>
          <span class="text-h5">
            Benachrichtigung
            <template v-if="filteredNotifications.length > 1">
              {{ currentNotificationIndex + 1 }} von
              {{ filteredNotifications.length }}
            </template>
          </span>
          <v-spacer />
          <v-btn icon @click="sequentialDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-6">
          <div
            v-if="filteredNotifications[currentNotificationIndex]"
            v-html="filteredNotifications[currentNotificationIndex].message"
          ></div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="justify-end px-6 py-4">
          <template v-if="filteredNotifications.length > 1">
            <v-btn
              outlined
              :disabled="currentNotificationIndex === 0"
              @click="previousNotification"
            >
              <v-icon left small>mdi-chevron-left</v-icon>
              Zurück
            </v-btn>
            <v-btn
              outlined
              :disabled="
                currentNotificationIndex >= filteredNotifications.length - 1
              "
              @click="nextNotification"
            >
              Weiter
              <v-icon right small>mdi-chevron-right</v-icon>
            </v-btn>
          </template>
          <v-btn outlined @click="sequentialDialog = false">Schließen</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { mapGetters, mapActions } from "vuex";

export default {
  name: "NotificationDisplay",
  data() {
    return {
      dialog: false,
      currentNotificationIndex: 0,
      sequentialDialog: false,
    };
  },
  mounted() {
    this.$nextTick(() => {
      if (this.unviewedNotifications.length > 0) {
        this.currentNotificationIndex = 0;
        this.showSequentialNotification();
      }
    });
  },
  methods: {
    ...mapActions({
      markAsViewed: "viewedNotifications/markAsViewed",
    }),
    markNotificationsAsViewed() {
      this.filteredNotifications.forEach((notification) => {
        if (notification.id) {
          this.markAsViewed(notification.id);
        }
      });
    },
    markCurrentNotificationAsViewed() {
      const notification =
        this.filteredNotifications[this.currentNotificationIndex];
      if (notification && notification.id) {
        this.markAsViewed(notification.id);
      }
    },
    showSequentialNotification() {
      this.sequentialDialog = true;
      this.markCurrentNotificationAsViewed();
    },
    nextNotification() {
      if (
        this.currentNotificationIndex <
        this.filteredNotifications.length - 1
      ) {
        this.currentNotificationIndex++;
        this.markCurrentNotificationAsViewed();
      } else {
        this.sequentialDialog = false;
      }
    },
    previousNotification() {
      if (this.currentNotificationIndex > 0) {
        this.currentNotificationIndex--;
        this.markCurrentNotificationAsViewed();
      }
    },
  },
  computed: {
    ...mapGetters({
      instance: "instance/instance",
      currentTenantId: "tenants/currentTenantId",
      isNotificationViewed: "viewedNotifications/isViewed",
    }),

    userNotifications() {
      return this.instance?.userNotifications || [];
    },

    filteredNotifications() {
      return this.userNotifications.filter((notification) => {
        if (notification.tenants && notification.tenants.length > 0) {
          if (
            !this.currentTenantId ||
            !notification.tenants.includes(this.currentTenantId)
          ) {
            return false;
          }
        }

        if (notification.path && notification.path.length > 0) {
          const currentPath = this.$route.name;
          if (!notification.path.includes(currentPath)) {
            return false;
          }
        }

        return true;
      });
    },

    unviewedNotifications() {
      return this.filteredNotifications.filter(
        (notification) =>
          !notification.id || !this.isNotificationViewed(notification.id)
      );
    },
  },
};
</script>

<style scoped>
.notification-container {
  margin-bottom: 16px;
}
</style>
