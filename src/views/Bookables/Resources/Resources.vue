<template>
  <AdminLayout class="pb-15">
    <v-row>
      <v-col class="col-auto">
        <v-alert
          class="custom-alert"
          v-if="!bookableCountCheck"
          type="info"
          elevation="2"
        >
          Sie haben die maximale Anzahl an öffentlichen Buchungsobjekten erreicht. Erweitern Sie Ihr Kontingent, oder löschen Sie nicht mehr benötigte Buchungsobjekte.
        </v-alert>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12">
        <v-select
          class="filter-field"
          v-model="filters"
          :items="api.tags"
          prepend-inner-icon="mdi-filter-variant"
          label="Filtern"
          hide-selected
          no-data-text="Keine Filtermöglichkeiten gefunden"
          multiple
          clearable
          chips
          solo
        >
          <template v-slot:selection="{ attrs, item, select, selected }">
            <v-chip
              v-bind="attrs"
              :input-value="selected"
              close
              color="secondary"
              @click="select"
              @click:close="remove(item)"
            >
              <strong>{{ item }}</strong>
            </v-chip>
          </template>
        </v-select>
      </v-col>
    </v-row>
    <v-row gutters align="stretch">
      <v-col
        cols="12"
        sm="6"
        md="4"
        lg="3"
        v-for="(resource, index) in filteredResources.slice().reverse()"
        :key="index"
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
        Ressource erstellen
      </v-btn>
    </v-fab-transition>
  </AdminLayout>
</template>

<script>
import AdminLayout from "@/layouts/Admin.vue";
import BookableCard from "@/components/BookableCard.vue";
import { mapActions, mapGetters } from "vuex";
import ApiBookablesService from "@/services/api/ApiBookablesService";
import ApiTagsService from "@/services/api/ApiTagsService";
import ToastService from "@/services/ToastService";
import BookablePermissionService from "@/services/permissions/BookablePermissionService";

export default {
  components: {
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
    filteredResources() {
      // Check if filter is set
      if (this.filters.length > 0) {
        return this.api.resources.filter((resource) => {
          // Check if element has tags
          if (_.isNil(resource.tags) || resource.tags.length === 0) {
            return false;
          }

          // Check if the element includes every selected chip/service
          return this.filters.every((chip) => resource.tags.includes(chip));
        });
      }

      return this.api.resources;
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
            ToastService.createToast("bookable.duplicate.errors.something-wrong", "error")
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
          console.log(error);
        });
    },
    async getBookableCount() {
      this.bookableCountCheck = await ApiBookablesService.publicBookableCountCheck();
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
