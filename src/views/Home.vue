<template>
  <AdminLayout>
    <v-row no-gutters align="center" justify="center">
      <v-col class="mx-xs-auto" cols="12" md="6">
        <v-card elevation='2' class='mx-auto pa-2'>
          <v-card-title class='text-h5 primary--text'>
            Herzlich Willkommen
          </v-card-title>
          <v-card-text>Hier können Sie zu einem späteren Zeitpunkt alle Statistiken des Buchungssystems einsehen.</v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </AdminLayout>
</template>

<script>
import AdminLayout from "@/layouts/Admin";

export default {
  name: "HomeView",
  components: {
    AdminLayout,
  },
  data() {
    return {
      loading: true,
    };
  },
  mounted() {
    setTimeout(() => {
      this.loading = false
    }, 2000)
  }
};
</script>
