<template>
  <div class="page-content" ref="contentCol">
    <v-form ref="rootForm" v-model="validRoot" class="page-content__form">
      <div class="page-content__top">
        <v-progress-linear :active="isLoading" indeterminate color="primary" />

        <div class="d-flex align-center mb-2">
          <div>
            <div class="text--secondary d-flex align-center">
              <v-tooltip bottom v-if="bookableID">
                <template v-slot:activator="{ on, attrs }">
                  <span
                    class="bookable-id-copy"
                    v-bind="attrs"
                    v-on="on"
                    @click="copyBookableId"
                  >
                    ID: {{ bookableID }}
                    <v-icon x-small class="ml-1">mdi-content-copy</v-icon>
                  </span>
                </template>
                <span>ID kopieren</span>
              </v-tooltip>
              <span v-else>ID: -</span>
              <span class="mx-1">•</span>
              <span>{{ bookable.title || "Unbenannt" }}</span>
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

        <BookableEditOverview
          v-if="!$vuetify.breakpoint.lgAndUp"
          variant="band"
          :bookable="bookable"
          @navigate-tab="goToTab"
        />
      </div>

      <div class="page-content__main">
        <div class="page-content__nav">
          <v-tabs
            v-model="activeTab"
            color="primary"
            show-arrows
            :vertical="$vuetify.breakpoint.mdAndUp"
          >
            <v-tab
              v-for="t in tabs"
              :key="t.key"
              class="d-flex justify-start"
              style="text-transform: none"
            >
              <v-icon left small>{{ t.icon }}</v-icon>
              {{ t.label }}
            </v-tab>
          </v-tabs>
        </div>

        <div class="page-content__editor" ref="editorScroll">
          <keep-alive>
            <component
              v-if="tabs[activeTab].comp && bookable.tenantId"
              :is="tabs[activeTab].comp"
              :bookable="bookable"
              :valid-root.sync="validRoot"
              @update:bookable="onUpdateBookable"
            />
          </keep-alive>
        </div>

        <div v-if="$vuetify.breakpoint.lgAndUp" class="page-content__overview">
          <BookableEditOverview
            variant="sidebar"
            :bookable="bookable"
            @navigate-tab="goToTab"
          />
        </div>
      </div>
    </v-form>

    <SaveBar
      :anchor-el="
        $refs.contentCol && ($refs.contentCol.$el || $refs.contentCol)
      "
      :scroll-root="
        $refs.editorScroll && ($refs.editorScroll.$el || $refs.editorScroll)
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
import BookableEditPrice from "@/components/Bookable/Edit/BookableEditPrice.vue";
import BookableEditBookingType from "@/components/Bookable/Edit/BookableEditBookingType.vue";
import SaveBar from "@/components/commons/SaveBar.vue";
import Bookable from "@/entities/bookable";
import { normalizeLeadTimeFields } from "@/utils/bookingLeadTime";
import { normalizeBookingDiscounts } from "@/utils/bookingDiscounts";
import { mapActions, mapGetters } from "vuex";
import BookableEditOpeningHours from "@/components/Bookable/Edit/BookableEditOpeningHours.vue";
import BookableEditLockerSystems from "@/components/Bookable/Edit/BookableEditLockerSystems.vue";
import BookableEditPermissions from "@/components/Bookable/Edit/BookableEditPermissions.vue";
import BookableEditRelatedBookables from "@/components/Bookable/Edit/BookableEditRelatedBookables.vue";
import BookableEditAttachments from "@/components/Bookable/Edit/BookableEditAttachments.vue";
import BookableEditAdditional from "@/components/Bookable/Edit/BookableEditAdditional.vue";
import BookableEditStatus from "@/components/Bookable/Edit/BookableEditStatus.vue";
import BookableEditOverview from "@/components/Bookable/Edit/BookableEditOverview.vue";
import ToastService from "@/services/ToastService";
import BookableEditCustomFields from "@/components/Bookable/Edit/BookableEditCustomFields.vue";

export default {
  name: "BookableEdit",
  components: {
    BookableEditStatus,
    BookableEditOverview,
    SaveBar,
    BookableEditGeneral,
    BookableEditPrice,
    BookableEditBookingType,
    BookableEditOpeningHours,
    BookableEditLockerSystems,
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
      const { customFields: _cf, ...bookableClean } = this.bookable;
      return (
        JSON.stringify({
          bookable: bookableClean,
        }) !== this.originalSnapshot
      );
    },
  },
  methods: {
    ...mapActions({
      addToast: "toasts/add",
    }),
    async createOrUpdate() {
      try {
        this.inProgress = true;
        const response = await ApiBookablesService.createOrUpdateBookable(
          this.bookable
        );
        this.bookable = normalizeBookingDiscounts(
          normalizeLeadTimeFields(_.cloneDeep(response.data))
        );

        if (!this.bookableID) {
          this.$router.replace({
            query: { ...this.$route.query, id: this.bookable.id },
          });
        }

        const { customFields: _cf, ...bookableClean } = response.data;

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
        if (!this.bookableID) {
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
          this.currentTenant.id
        );
        this.bookable = normalizeLeadTimeFields(
          new Bookable(response.data).toPlain()
        );
        normalizeBookingDiscounts(this.bookable);
        this.bookable.type = this.type;
        // Default booking type for new bookables: free time selection
        this.bookable.isScheduleRelated = true;
        this.bookable.isTimePeriodRelated = false;
        this.bookable.isBlockPeriodRelated = false;
        this.bookable.isLongRange = false;
        this.bookable.longRangeOptions = {};
      }

      this.$nextTick(() => {
        const { customFields: _cf, ...bookableClean } = this.bookable;
        this.originalSnapshot = JSON.stringify({
          bookable: bookableClean,
        });
      });
    },
    async fetchBookable(bookableId) {
      try {
        this.isLoading = true;
        const response = await ApiBookablesService.getBookable(bookableId);
        this.bookable = normalizeBookingDiscounts(
          normalizeLeadTimeFields(_.cloneDeep(response.data))
        );
      } catch (err) {
        console.error("Error fetching bookable:", err);
      } finally {
        this.isLoading = false;
      }
    },
    onUpdateBookable(updatedBookable) {
      this.bookable = { ...this.bookable, ...updatedBookable };
    },
    goToTab(key) {
      const index = this.tabs.findIndex((t) => t.key === key);
      if (index >= 0) {
        this.activeTab = index;
      }
    },
    async copyBookableId() {
      if (!this.bookableID) return;
      try {
        await navigator.clipboard.writeText(this.bookableID);
        this.addToast(
          ToastService.createToast("bookable.copyId.success", "success")
        );
      } catch (error) {
        console.error("Failed to copy bookable id:", error);
        this.addToast(
          ToastService.createToast(
            "bookable.copyId.errors.something-wrong",
            "error"
          )
        );
      }
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
      const tabKey = this.tabs[newIndex].key;
      if (this.$route.query.tab === tabKey) return;
      this.$router.replace({
        query: { ...this.$route.query, tab: tabKey },
      });
    },
  },
  mounted() {
    let queryTabKey = this.$route.query.tab;
    // Legacy deep-link: tags tab was merged into general
    if (queryTabKey === "tags") {
      queryTabKey = "general";
    }
    const foundIndex = this.tabs.findIndex((t) => t.key === queryTabKey);
    this.activeTab = foundIndex !== -1 ? foundIndex : 0;
  },
};
</script>

<style scoped>
.page-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.page-content__form {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.page-content__top {
  flex: 0 0 auto;
}

.page-content__main {
  display: flex;
  flex: 1;
  min-height: 0;
  gap: 16px;
  overflow: hidden;
}

.page-content__nav {
  flex: 0 0 auto;
  min-height: 0;
  overflow-x: auto;
  overflow-y: auto;
}

.page-content__editor {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-gutter: stable;
  padding-right: 4px;
  padding-bottom: calc(
    56px + /* SaveBar height */ 12px + /* bottom margin */ 12px + /* gap */ 16px
      /* extra spacing */
  );
}

.page-content__overview {
  flex: 0 0 280px;
  max-width: 320px;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
}

@media (max-width: 959px) {
  .page-content__main {
    flex-direction: column;
  }

  .page-content__nav {
    flex: 0 0 auto;
    overflow-y: hidden;
  }

  .page-content__editor {
    flex: 1 1 auto;
  }
}

.bookable-id-copy {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  border-radius: 4px;
  padding: 2px 6px;
  margin: -2px -6px;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.bookable-id-copy:hover {
  background-color: rgba(0, 0, 0, 0.06);
  color: var(--v-primary-base);
}

.theme--dark .bookable-id-copy:hover {
  background-color: rgba(255, 255, 255, 0.08);
}
</style>
