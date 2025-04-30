<template>
  <v-app>
    <v-main>
      <v-snackbar
        :color="toast.type"
        v-for="toast in toasts"
        :key="toast.id"
        :timeout="toast.timeout"
        :value="true"
        top
        right
        elevation="24"
      >
        <strong v-if="toast.title">{{ toast.title }}</strong>
        <v-icon
          size="25"
          class="close-icon"
          @click="hideAndDeleteToast(toast.id)"
          >mdi-close-circle</v-icon
        >
        <br v-if="toast.title" />
        <span>{{ toast.message }}</span>
      </v-snackbar>
      <router-view />
    </v-main>
  </v-app>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import ApiInstanceService from "@/services/api/ApiInstanceService";

export default {
  data() {
    return {};
  },
  methods: {
    hideAndDeleteToast(id) {
      this.removeToast(id);
    },
    ...mapActions({
      removeToast: "toasts/remove",
      updateInstance: "instance/update",
    }),
  },
  computed: {
    ...mapGetters({
      toasts: "toasts/all",
      user: "user/getUser",
      instance: "instance/instance",
    }),
  },
  async mounted() {
    await this.updateInstance(await ApiInstanceService.getInstance(true));
  },
};
</script>

<style scoped lang="scss">
.close-icon {
  position: absolute !important;
  right: 0.5rem;
  top: 0.375rem;
  display: block;
}
</style>

<style lang="scss">
.theme--light.v-data-table thead th {
  background-color: #e5f5fc !important;
  &:first-child {
    border-radius: 25px 0 0 0;
  }
  &:last-child {
    border-radius: 0 25px 0 0;
  }
}
.theme--dark.v-data-table thead th {
  background-color: #282828 !important;
  &:first-child {
    border-radius: 25px 0 0 0;
  }
  &:last-child {
    border-radius: 0 25px 0 0;
  }
}

.theme--dark.v-data-table table {
  background-color: #282828 !important;
  border-radius: 25px !important;
}

.v-data-table tbody tr:not(:last-child) td {
  border-bottom: #5d5d5d solid 1px !important;
}

.v-data-table tbody tr:first-child td {
  border-top: #5d5d5d solid 1px !important;
}

.v-data-table {
  border-radius: 25px !important;
}

.v-data-table table tr:last-child:hover td:first-child {
  border-bottom-left-radius: 25px !important;
}

.v-data-table table tr:last-child:hover td:last-child {
  border-bottom-right-radius: 25px !important;
}

.v-data-table table tr:first-child:hover td:first-child {
  border-top-left-radius: 0 !important;
}

.v-data-table table tr:first-child:hover td:last-child {
  border-top-right-radius: 0 !important;
}
</style>
