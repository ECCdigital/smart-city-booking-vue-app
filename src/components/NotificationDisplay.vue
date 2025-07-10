<template>
  <div class="notification-container">
    <v-dialog v-model="sequentialDialog" max-width="750">
      <v-card v-if="filteredNotifications.length > 0">
        <v-card-title class="headline">
          <span  v-if="filteredNotifications.length > 1" class="ml-4"> Benachrichtigung {{ currentNotificationIndex + 1 }} von {{ filteredNotifications.length }}</span>
          <v-spacer></v-spacer>
          <v-btn icon @click="sequentialDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text>
          <div v-if="filteredNotifications[currentNotificationIndex]" v-html="filteredNotifications[currentNotificationIndex].message"></div>
        </v-card-text>
        <v-card-actions v-if="filteredNotifications.length > 1">
          <v-btn text :disabled="currentNotificationIndex === 0" @click="previousNotification">
            <v-icon>mdi-chevron-left</v-icon> Previous
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn text :disabled="currentNotificationIndex >= filteredNotifications.length - 1" @click="nextNotification">
            Next <v-icon>mdi-chevron-right</v-icon>
          </v-btn>
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
      this.filteredNotifications.forEach(notification => {
        if (notification.id) {
          this.markAsViewed(notification.id);
        }
      });
    },
    markCurrentNotificationAsViewed() {
      const notification = this.filteredNotifications[this.currentNotificationIndex];
      if (notification && notification.id) {
        this.markAsViewed(notification.id);
      }
    },
    showSequentialNotification() {
      this.sequentialDialog = true;
      this.markCurrentNotificationAsViewed();
    },
    nextNotification() {
      if (this.currentNotificationIndex < this.filteredNotifications.length - 1) {
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
      return this.filteredNotifications.filter(notification =>
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
