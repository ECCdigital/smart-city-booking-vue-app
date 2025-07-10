<template>
  <AdminLayout class="pb-15">
    <v-row v-if="!bookableCountCheck">
      <v-col class="col-auto">
        <v-alert
          class="custom-alert"
          type="info"
          elevation="2"
        >
          Sie haben die maximale Anzahl an öffentlichen Buchungsobjekten
          erreicht. Erweitern Sie Ihr Kontingent, oder löschen Sie nicht mehr
          benötigte Buchungsobjekte.
        </v-alert>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12">
        <Search
          :items="api.locations"
          v-model="searchResults"
          placeholder="Veranstaltungsort suchen…"
          :keys="searchKeys"
          filter-key="tags"
          :filter-options="api.tags"
        ></Search>
      </v-col>
    </v-row>
    <v-row gutters align="stretch">
      <v-col
        cols="12"
        sm="6"
        md="4"
        lg="3"
        v-for="(location) in displayedLocations"
        :key="location.id"
        class="mx-xs-auto d-flex flex-column"
        height="100%"
      >
        <v-skeleton-loader type="card" class="flex" :loading="loading">
          <bookable-card
            :item="location"
            edit-route="location-edit"
            :from-route="$router.currentRoute.name"
            @delete="removeBookable(location.id)"
            @duplicate="duplicateBookable(location.id)"
          />
        </v-skeleton-loader>
      </v-col>
    </v-row>
    <v-fab-transition>
      <v-btn
        color="primary"
        fixed
        large
        bottom
        right
        rounded
        class="v-btn"
        :to="{
          name: 'location-edit',
          query: { fromRoute: $router.currentRoute.name },
        }"
        :disabled="createDisabled"
      >
        <v-icon>mdi-plus</v-icon>
        Veranstaltungsort erstellen
      </v-btn>
    </v-fab-transition>
  </AdminLayout>
</template>

<script>
import AdminLayout from "@/layouts/Admin.vue";
import { mapGetters, mapActions } from "vuex";
import BookableCard from "@/components/BookableCard.vue";
import ApiBookablesService from "@/services/api/ApiBookablesService";
import ApiTagsService from "@/services/api/ApiTagsService";
import ToastService from "@/services/ToastService";
import BookablePermissionService from "@/services/permissions/BookablePermissionService";
import Search from "@/components/commons/Search.vue";

export default {
  components: {
    Search,
    AdminLayout,
    BookableCard,
  },
  data() {
    return {
      api: {
        locations: [],
        tags: [],
      },
      filters: [],
      bookableCountCheck: true,
      searchResults: [],
      searchKeys: ["title", "id", "location"],
    };
  },
  computed: {
    ...mapGetters({
      loading: "loading/isLoading",
      tenantId: "tenants/currentTenantId",
    }),
    createDisabled() {
      return !this.BookablePermissionService.allowCreate();
    },
    BookablePermissionService() {
      return BookablePermissionService;
    },
    displayedLocations() {
      return this.searchResults;
    },
  },
  watch: {
    tenantId() {
      this.fetchLocations();
      this.fetchFilterTags();
    },
  },
  methods: {
    ...mapActions({
      startLoading: "loading/start",
      stopLoading: "loading/stop",
      addToast: "toasts/add",
    }),
    async removeBookable(bookableId) {
      await this.startLoading("fetch-delete-bookable");
      ApiBookablesService.deleteBookable(bookableId)
        .then(() => {
          this.fetchLocations();
        })
        .finally(() => {
          this.addToast(
            ToastService.createToast("bookable.delete.success", "success")
          );
          this.stopLoading("fetch-delete-bookable");
        })
        .catch((error) => {
          this.addToast(
            ToastService.createToast(
              "bookable.duplicate.errors.something-wrong",
              "error"
            )
          );
          console.log(error);
        });
      await this.getBookableCount();
    },
    async duplicateBookable(bookableId) {
      await this.startLoading("fetch-duplicate-bookable");

      ApiBookablesService.duplicateBookable(bookableId)
        .then(() => {
          this.fetchLocations();
        })
        .finally(() => {
          this.addToast(
            ToastService.createToast("bookable.duplicate.success", "success")
          );
          this.stopLoading("fetch-duplicate-bookable");
        })
        .catch((error) => {
          this.addToast(
            ToastService.createToast("errors.something-wrong", "error")
          );
          console.log(error);
        });
      await this.getBookableCount();
    },
    remove(item) {
      this.filters.splice(this.filters.indexOf(item), 1);
    },
    fetchFilterTags() {
      this.startLoading("fetch-filter-tags");
      ApiTagsService.getTags()
        .then((response) => {
          this.api.tags = response.data;
        })
        .finally(() => {
          this.stopLoading("fetch-filter-tags");
        })
        .catch((error) => {
          console.log(error);
        });
    },
    fetchLocations() {
      this.startLoading("fetch-locations");
      ApiBookablesService.getBookables()
        .then((response) => {
          this.api.locations = response.data.filter(
            (resource) => resource.type === "event-location"
          );
        })
        .finally(() => {
          this.stopLoading("fetch-locations");
        })
        .catch((error) => {
          console.log(error);
        });
    },
    async getBookableCount() {
      this.bookableCountCheck =
        await ApiBookablesService.publicBookableCountCheck();
    },
  },
  async mounted() {
    await this.getBookableCount();
  },
  created() {
    this.fetchLocations();
    this.fetchFilterTags();
  },
};
</script>

<style scoped>
.custom-alert {
  border-radius: 15px !important;
}
</style>
