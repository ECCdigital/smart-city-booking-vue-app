<template>
  <AdminLayout class="pb-15">
    <v-row v-if="!bookableCountCheck">
      <v-col class="col-auto">
        <v-alert class="custom-alert" type="info" elevation="2">
          Sie haben die maximale Anzahl an öffentlichen Buchungsobjekten
          erreicht. Erweitern Sie Ihr Kontingent, oder löschen Sie nicht mehr
          benötigte Buchungsobjekte.
        </v-alert>
      </v-col>
    </v-row>
    <v-row v-if="bookablesForbidden">
      <v-col cols="12">
        <v-alert type="warning" elevation="2" class="custom-alert">
          {{ $t("bookable.list.forbidden") }}
        </v-alert>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12">
        <Search
          :items="api.resources"
          v-model="searchResults"
          placeholder="Objekt suchen…"
          :keys="searchKeys"
          filter-key="tags"
          :filter-options="api.tags"
          :sortable="true"
          :sort-options="[
            { text: 'Titel', value: 'title' },
            { text: 'Erstellt', value: 'timeCreated' },
            { text: 'Öffentlich', value: 'isPublic' },
            { text: 'Buchbar', value: 'isBookable' },
          ]"
        ></Search>
      </v-col>
    </v-row>
    <v-row gutters align="stretch">
      <v-col
        cols="12"
        sm="6"
        md="4"
        lg="3"
        xl="2"
        v-for="resource in displayedResources.slice().reverse()"
        :key="resource.id"
        class="mx-xs-auto d-flex flex-column"
        height="100%"
      >
        <v-skeleton-loader type="card" class="flex">
          <bookable-card
            :item="resource"
            editRoute="resource-edit"
            :from-route="$router.currentRoute.name"
            @delete="removeBookable(resource.id)"
            @duplicate="duplicateBookable(resource.id)"
          ></bookable-card>
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
        :to="{
          name: 'resource-edit',
          query: { fromRoute: $router.currentRoute.name },
        }"
        :disabled="createDisabled"
      >
        <v-icon>mdi-plus</v-icon>
        Objekt erstellen
      </v-btn>
    </v-fab-transition>
  </AdminLayout>
</template>

<script>
import AdminLayout from "@/layouts/Admin.vue";
import BookableCard from "@/components/Bookable/BookableCard.vue";
import { mapActions, mapGetters } from "vuex";
import ApiBookablesService from "@/services/api/ApiBookablesService";
import { isForbiddenError } from "@/services/api/apiErrorMessage";
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
        resources: [],
      },
      filters: [],
      bookableCountCheck: true,
      bookablesForbidden: false,
      searchResults: [],
      searchKeys: ["title", "id"],
    };
  },
  computed: {
    createDisabled() {
      return !this.BookablePermissionService.allowCreate();
    },
    ...mapGetters({
      loading: "loading/isLoading",
      tenantId: "tenants/currentTenantId",
      tenants: "tenants/tenants",
      currentTenant: "tenants/currentTenant",
    }),
    BookablePermissionService() {
      return BookablePermissionService;
    },
    displayedResources() {
      return this.searchResults;
    },
  },
  watch: {
    tenantId() {
      this.fetchResources();
      this.fetchFilterTags();
    },
  },
  methods: {
    ...mapActions({
      startLoading: "loading/start",
      stopLoading: "loading/stop",
      addToast: "toasts/add",
    }),
    remove(item) {
      this.filters.splice(this.filters.indexOf(item), 1);
    },
    async removeBookable(bookableId) {
      await this.startLoading("fetch-delete-bookable");
      ApiBookablesService.deleteBookable(bookableId)
        .then(() => {
          this.fetchResources();
        })
        .finally(() => {
          this.addToast(
            ToastService.createToast("bookable.delete.success", "success")
          );
          this.stopLoading("fetch-delete-bookable");
        })
        .catch((error) => {
          this.addToast(
            ToastService.createToast("errors.something-wrong", "error")
          );
          console.log(error);
        });
      await this.getBookableCount();
    },
    async duplicateBookable(bookableId) {
      await this.startLoading("fetch-duplicate-bookable");

      ApiBookablesService.duplicateBookable(bookableId)
        .then(() => {
          this.fetchResources();
        })
        .finally(() => {
          this.addToast(
            ToastService.createToast("bookable.duplicate.success", "success")
          );
          this.stopLoading("fetch-duplicate-bookable");
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
    fetchResources() {
      // get all resources from the server with axios and filter bei type resource
      this.startLoading("fetch-resources");
      this.bookablesForbidden = false;
      ApiBookablesService.getBookables()
        .then((response) => {
          this.api.resources = response.data.filter(
            (resource) => resource.type === "resource"
          );
        })
        .finally(() => {
          this.stopLoading("fetch-resources");
        })
        .catch((error) => {
          // A 403 means "no reach", not "nothing there" - an empty grid would
          // claim the second. Every other failure keeps the old silence.
          this.bookablesForbidden = isForbiddenError(error);
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
    this.fetchResources();
    this.fetchFilterTags();
  },
};
</script>
<style scoped>
.filter-field {
  border-radius: 15px;
}
.custom-alert {
  border-radius: 15px !important;
}
</style>
