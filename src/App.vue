<template>
  <v-app>
    <v-main>
      <router-view />
      <AppToaster />
    </v-main>
  </v-app>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import ApiInstanceService from "@/services/api/ApiInstanceService";
import AppToaster from "@/components/commons/AppToaster.vue";

export default {
  components: { AppToaster },
  methods: {
    ...mapActions({
      updateInstance: "instance/update",
    }),
  },
  computed: {
    ...mapGetters({
      user: "user/getUser",
      instance: "instance/instance",
    }),
  },
  async mounted() {
    await this.updateInstance(
      await ApiInstanceService.getPublicInstance()
    );
  },
};
</script>

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
