<template>
  <div class="page-content" ref="contentCol">
    <v-form ref="rootForm" v-model="validRoot">
      <v-progress-linear :active="isLoading" indeterminate color="primary" />

      <div class="d-flex align-center mb-2">
        <div>
          <div class="text--secondary">
            ID: {{ bookableID }} • {{ bookable.title || "Unbenannt" }}
          </div>
        </div>
        <v-spacer />
        <v-chip
          v-if="hasUnsavedChanges"
          color="warning"
          text-color="black"
          small
          class="mr-2"
          label
        >
          Ungespeicherte Änderungen
        </v-chip>
      </div>

      <BookableEditStatus :bookable="bookable" />

      <v-row>
        <v-col class="col-12 col-md-auto">
          <v-tabs
            v-model="activeTab"
            color="primary"
            show-arrows
            :vertical="$vuetify.breakpoint.mdAndUp"
          >
            <v-tab
              v-for="t in visibleTabs"
              :key="t.key"
              class="d-flex justify-start"
              style="text-transform: none"
            >
              <v-icon left small>{{ t.icon }}</v-icon>
              {{ t.label }}
            </v-tab>
          </v-tabs></v-col
        >
        <v-col class="col-12 col-md-9">
          <keep-alive>
            <component
              v-if="visibleTabs[activeTab].comp && bookable.tenantId"
              :is="visibleTabs[activeTab].comp"
              :bookable="bookable"
              :valid-root.sync="validRoot"
              @update:bookable="onUpdateBookable"
            />
          </keep-alive>
        </v-col>
      </v-row>
    </v-form>

    <SaveBar
      :anchor-el="
        $refs.contentCol && ($refs.contentCol.$el || $refs.contentCol)
      "
      @submit="createOrUpdate"
      @cancel="init"
      show-restore
      :disabled="inProgress || isLoading || !validRoot || hasUnsavedChanges"
      :in-progress="inProgress"
    />
  </div>
</template>

<script>
import ApiBookablesService from "@/services/api/ApiBookablesService";
import _ from "lodash";
import BookableEditGeneral from "@/components/Bookable/Edit/BookableEditGeneral.vue";
import BookableEditTags from "@/components/Bookable/Edit/BookableEditTags.vue";
import BookableEditPrice from "@/components/Bookable/Edit/BookableEditPrice.vue";
import BookableEditBookingType from "@/components/Bookable/Edit/BookableEditBookingType.vue";
import SaveBar from "@/components/commons/SaveBar.vue";
import Bookable from "@/entities/bookable";
import { mapActions, mapGetters } from "vuex";
import BookableEditOpeningHours from "@/components/Bookable/Edit/BookableEditOpeningHours.vue";
import BookableEditLockerSystems from "@/components/Bookable/Edit/BookableEditLockerSystems.vue";
import BookableEditAccessPoints from "@/components/Bookable/Edit/BookableEditAccessPoints.vue";
import BookableEditPermissions from "@/components/Bookable/Edit/BookableEditPermissions.vue";
import BookableEditRelatedBookables from "@/components/Bookable/Edit/BookableEditRelatedBookables.vue";
import BookableEditAttachments from "@/components/Bookable/Edit/BookableEditAttachments.vue";
import BookableEditAdditional from "@/components/Bookable/Edit/BookableEditAdditional.vue";
import BookableEditStatus from "@/components/Bookable/Edit/BookableEditStatus.vue";
import ToastService from "@/services/ToastService";
import BookableEditCustomFields from "@/components/Bookable/Edit/BookableEditCustomFields.vue";
import BookablePermissionService from "@/services/permissions/BookablePermissionService";

export default {
  name: "BookableEdit",
  components: {
    BookableEditStatus,
    SaveBar,
    BookableEditGeneral,
    BookableEditTags,
    BookableEditPrice,
    BookableEditBookingType,
    BookableEditOpeningHours,
    BookableEditLockerSystems,
    BookableEditAccessPoints,
    BookableEditPermissions,
    BookableEditRelatedBookables,
    BookableEditAttachments,
    BookableEditAdditional,
    BookableEditCustomFields,
  },
  props: {
    type: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      isLoading: false,
      inProgress: false,
      validRoot: true,
      activeTab: 0,
      tabs: [
        {
          key: "general",
          label: "Allgemein",
          icon: "mdi-information-outline",
          comp: "BookableEditGeneral",
        },
        {
          key: "tags",
          label: "Tags & Flags",
          icon: "mdi-tag-multiple-outline",
          comp: "BookableEditTags",
        },
        {
          key: "pricing",
          label: "Preise",
          icon: "mdi-cash",
          comp: "BookableEditPrice",
        },
        {
          key: "bookingType",
          label: "Buchungstyp",
          icon: "mdi-calendar-clock",
          comp: "BookableEditBookingType",
        },
        {
          key: "openingHours",
          label: "Öffnungszeiten",
          icon: "mdi-clock-outline",
          comp: "BookableEditOpeningHours",
        },
        {
          key: "lockerSystems",
          label: "Schließsysteme",
          icon: "mdi-lock-outline",
          comp: "BookableEditLockerSystems",
        },
        {
          key: "accessPoints",
          label: "Türen / Zugang",
          icon: "mdi-door-open",
          comp: "BookableEditAccessPoints",
          permission: "manageBookables",
        },
        {
          key: "relatedBookables",
          label: "Abhängigkeiten",
          icon: "mdi-link-variant",
          comp: "BookableEditRelatedBookables",
        },
        {
          key: "permissions",
          label: "Berechtigungen",
          icon: "mdi-account-lock-outline",
          comp: "BookableEditPermissions",
        },
        {
          key: "attachments",
          label: "Anhänge",
          icon: "mdi-paperclip",
          comp: "BookableEditAttachments",
        },
        {
          key: "customFields",
          label: "Eigene Felder",
          icon: "mdi-form-textbox",
          comp: "BookableEditCustomFields",
        },
        {
          key: "additional",
          label: "Sonstiges",
          icon: "mdi-dots-horizontal",
          comp: "BookableEditAdditional",
        },
        {
          key: "settings",
          label: "Einstellungen",
          icon: "mdi-cog-outline",
          comp: () => import("@/components/Bookable/Edit/BookableEditSettings.vue"),
        }
      ],
      originalSnapshot: {
        bookable: {},
      },
      bookable: {},
    };
  },
  computed: {
    ...mapGetters({
      currentTenant: "tenants/currentTenant",
    }),
    bookableID() {
      return this.$route.query.id;
    },
    hasUnsavedChanges() {
      const bookableClean = { ...this.bookable };
      delete bookableClean.customFields;
      return (
        JSON.stringify({
          bookable: bookableClean,
        }) !== this.originalSnapshot
      );
    },
    visibleTabs() {
      return this.tabs.filter((tab) => this.isTabVisible(tab));
    },
  },
  methods: {
    ...mapActions({
      addToast: "toasts/add",
    }),
    isTabVisible(tab) {
      if (!tab.permission) return true;
      if (tab.permission === "manageBookables") {
        if (!this.bookable?.id) {
          return BookablePermissionService.allowCreate();
        }
        return BookablePermissionService.allowUpdate(this.bookable);
      }
      return true;
    },
    async createOrUpdate() {
      try {
        this.inProgress = true;
        const response = await ApiBookablesService.createOrUpdateBookable(
          this.bookable
        );
        this.bookable = _.cloneDeep(response.data);

        if (!this.bookableID) {
          this.$router.replace({
            query: { ...this.$route.query, id: this.bookable.id },
          });
        }

        const bookableClean = { ...response.data };
        delete bookableClean.customFields;

        this.originalSnapshot = JSON.stringify({
          bookable: bookableClean,
        });
        if (!this.bookableID) {
          await this.addToast(
            ToastService.createToast("bookable.create.success", "success")
          );
        } else {
          await this.addToast(
            ToastService.createToast("bookable.update.success", "success")
          );
        }
      } catch (err) {
        if (err.response?.status === 400) {
          const data = err.response.data;
          const message =
            typeof data === "string" && data
              ? data
              : data?.message || this.$t("accessPoint.bookable.modeUnavailable");
          await this.addToast({
            title: this.$t("accessPoint.bookable.saveError.title"),
            message,
            type: "error",
            timeout: 8000,
          });
        } else if (!this.bookableID) {
          await this.addToast(
            ToastService.createToast("bookable.create.error", "error")
          );
        } else {
          await this.addToast(
            ToastService.createToast("bookable.update.error", "error")
          );
        }
      } finally {
        this.inProgress = false;
      }
    },
    async init() {
      if (this.bookableID) {
        await this.fetchBookable(this.bookableID);
      } else {
        const response = await ApiBookablesService.getBookableTemplate(
          this.currentTenant.id,
        );
        this.bookable = new Bookable(response.data).toPlain();
        this.bookable.type = this.type;
      }

      this.$nextTick(() => {
        const bookableClean = { ...this.bookable };
        delete bookableClean.customFields;
        this.originalSnapshot = JSON.stringify({
          bookable: bookableClean,
        });
      });
    },
    async fetchBookable(bookableId) {
      try {
        this.isLoading = true;
        const response = await ApiBookablesService.getBookable(bookableId);
        this.bookable = _.cloneDeep(response.data);
      } catch (err) {
        console.error("Error fetching bookable:", err);
      } finally {
        this.isLoading = false;
      }
    },
    onUpdateBookable(updatedBookable) {
      this.bookable = { ...this.bookable, ...updatedBookable };
    },
  },
  watch: {
    bookableID: {
      immediate: true,
      handler() {
        this.init();
      },
    },
    activeTab(newIndex) {
      const tabKey = this.visibleTabs[newIndex]?.key;
      if (!tabKey) return;
      if (this.$route.query.tab === tabKey) return;
      this.$router.replace({
        query: { ...this.$route.query, tab: tabKey },
      });
    },
  },
  mounted() {
    const queryTabKey = this.$route.query.tab;
    const foundIndex = this.visibleTabs.findIndex((t) => t.key === queryTabKey);
    this.activeTab = foundIndex !== -1 ? foundIndex : 0;
  },
};
</script>

<style scoped>
.page-content {
  padding-bottom: calc(
    56px + /* SaveBar height */ 12px + /* bottom margin */ 12px + /* gap */ 16px
      /* extra spacing */
  );
}
</style>
