<template>
  <AdminLayout class="pb-15">
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
        v-for="(location, index) in filteredLocations"
        :key="index"
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
        :disabled="!BookablePermissionService.allowCreate()"
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

export default {
  components: {
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
    };
  },
  computed: {
    ...mapGetters({
      loading: "loading/isLoading",
    }),
    BookablePermissionService() {
      return BookablePermissionService;
    },
    filteredLocations() {
      // Check if filter is set
      if (this.filters.length > 0) {
        return this.api.locations.filter((location) => {
          // Check if element has tags
          if (_.isNil(location.tags) || location.tags.length === 0) {
            return false;
          }

          // Check if the element includes every selected chip/service
          return this.filters.every((chip) => location.tags.includes(chip));
        });
      }

      return this.api.locations;
    },
  },
  methods: {
    ...mapActions({
      startLoading: "loading/start",
      stopLoading: "loading/stop",
      addToast: "toasts/add",
    }),
    removeBookable(bookableId) {
      this.startLoading("fetch-delete-bookable");
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
            ToastService.createToast("errors.something-wrong", "error")
          );
          console.log(error);
        });
    },
    duplicateBookable(bookableId) {
      this.startLoading("fetch-duplicate-bookable");

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
  },
  created() {
    this.fetchLocations();
    this.fetchFilterTags();
  },
};
</script>

<style scoped>
.filter-field {
  border-radius: 15px;
}
</style>
