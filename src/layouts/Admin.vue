<template>
  <div class="content">
    <Navbar />
    <v-container
      fluid
      class="admin-page"
      :class="{ 'admin-page--scroll-body': scrollBody }"
    >
      <div v-if="scrollBody" class="admin-page__header">
        <h1 v-if="!hidePageTitle" class="text-h5 mb-0">{{ pageTitle }}</h1>
        <slot name="page-header" />
      </div>
      <template v-else-if="!hidePageTitle">
        <h1 class="text-h5 mb-2">{{ pageTitle }}</h1>
      </template>
      <div
        class="admin-page__body"
        :class="{ 'admin-page__body--scroll': scrollBody }"
      >
        <slot />
      </div>
    </v-container>
  </div>
</template>

<script>
import Navbar from "@/components/Navbar";
import ApiTenantService from "@/services/api/ApiTenantService";
import { mapActions } from "vuex";
import { routeRequiresTenant } from "@/router/middlewares/requireTenant";

export default {
  props: {
    data: Object,
    title: String,
    hidePageTitle: { type: Boolean, default: false },
    scrollBody: { type: Boolean, default: false },
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
        const tenants = response.data;
        await this.setTenants(tenants);

        const currentTenantId = this.$store.getters["tenants/currentTenantId"];
        if (
          currentTenantId &&
          !tenants.some((tenant) => tenant.id === currentTenantId)
        ) {
          await this.$store.dispatch("tenants/select", null);
          if (routeRequiresTenant(this.$route)) {
            await this.$router.replace({ name: "dashboard" });
          }
        }
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

<style scoped>
.admin-page--scroll-body {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 64px);
  padding-top: 12px;
  padding-bottom: 0;
  overflow: hidden;
}

.admin-page__header {
  flex-shrink: 0;
  padding-bottom: 12px;
}

.admin-page__body--scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-gutter: stable;
  padding-right: 12px;
}
</style>
