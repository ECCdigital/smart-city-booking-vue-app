<template>
  <AdminLayout class="pb-15">
    <v-row  v-if="!bookableCountCheck">
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
          :items="api.rooms"
          v-model="searchResults"
          placeholder="Raum suchen…"
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
        v-for="room in displayedRooms"
        :key="room.id"
        class="mx-xs-auto d-flex flex-column"
        height="100%"
      >
        <v-skeleton-loader type="card" class="flex">
          <bookable-card
            :item="room"
            editRoute="room-edit"
            :from-route="$router.currentRoute.name"
            @delete="removeBookable(room.id)"
            @duplicate="duplicateBookable(room.id)"
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
          name: 'room-edit',
          query: { fromRoute: $router.currentRoute.name },
        }"
        :disabled="createDisabled"
      >
        <v-icon>mdi-plus</v-icon> Raum erstellen
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
        rooms: [],
        tags: [],
      },
      filters: [],
      bookableCountCheck: true,
      searchResults: [],
      searchKeys: ["title", "id"],
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
    displayedRooms() {
      return this.searchResults;
    },
  },
  watch: {
    tenantId() {
      this.fetchRooms();
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
          this.fetchRooms();
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
          this.fetchRooms();
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
    fetchRooms() {
      this.startLoading("fetch-rooms");
      ApiBookablesService.getBookables()
        .then((response) => {
          this.api.rooms = response.data.filter(
            (resource) => resource.type === "room"
          );
          this.searchResults = [...this.api.rooms];
        })
        .finally(() => {
          this.stopLoading("fetch-rooms");
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
    this.fetchRooms();
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
