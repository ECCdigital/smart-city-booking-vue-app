<template>
  <div class="content">
    <Navbar />
    <v-container fluid>
      <h1 class="text-h5 mb-2">{{ pageTitle }}</h1>
      <slot />
    </v-container>
  </div>
</template>

<script>
import Navbar from "@/components/Navbar";
import ApiTenantService from "@/services/api/ApiTenantService";
import { mapActions } from "vuex";

export default {
  props: {
    data: Object,
    title: String,
  },
  components: {
    Navbar,
  },
  computed: {
    pageTitle() {
      return this.title || this.$route.meta.title;
    },
  },

  methods: {
    ...mapActions({
      setTenants: "tenants/setTenants",
    }),
    async fetchTenants() {
      try {
        const response = await ApiTenantService.getTenants(true);
        await this.setTenants(response.data);
      } catch (error) {
        console.error(error);
      }
    },
  },

  async mounted() {
    await this.fetchTenants();
  },
};
</script>

<style scoped></style>
