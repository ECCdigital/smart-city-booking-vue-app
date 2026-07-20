<template>
  <div class="page-content" ref="contentCol">
    <v-form ref="rootForm" v-model="validRoot" class="page-content__form">
      <div class="page-content__top">
        <v-progress-linear :active="isLoading" indeterminate color="primary" />

        <div class="page-content__meta mb-2">
          <div class="page-content__meta-info text--secondary">
            <v-tooltip bottom v-if="bookableID">
              <template v-slot:activator="{ on, attrs }">
                <span
                  class="bookable-id-copy"
                  v-bind="attrs"
                  v-on="on"
                  @click="copyBookableId"
                >
                  <span class="bookable-id-text">ID: {{ bookableID }}</span>
                  <v-icon x-small class="ml-1 flex-shrink-0">
                    mdi-content-copy
                  </v-icon>
                </span>
              </template>
              <span>ID kopieren</span>
            </v-tooltip>
            <span v-else class="bookable-id-text">ID: -</span>
            <span class="page-content__meta-sep mx-1">•</span>
            <span class="page-content__meta-title">
              {{ bookable.title || "Unbenannt" }}
            </span>
          </div>
          <div class="page-content__meta-actions">
            <v-switch
              v-if="expertModeToggleVisible"
              :input-value="expertMode"
              dense
              hide-details
              class="mt-0 pt-0 expert-mode-switch"
              :label="$t('bookable.edit.expertMode.label')"
              @change="setExpertMode"
            />
            <v-chip
              v-if="hasUnsavedChanges"
              color="warning"
              text-color="black"
              small
              label
            >
              Ungespeicherte Änderungen
            </v-chip>
          </div>
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
            :key="tabsRenderKey"
            :value="activeTabIndex"
            color="primary"
            show-arrows
            :vertical="$vuetify.breakpoint.mdAndUp"
            @change="onTabChange"
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
          </v-tabs>
        </div>

        <div class="page-content__editor" ref="editorScroll">
          <keep-alive>
            <component
              v-if="activeTabComp && bookable.tenantId"
              :is="activeTabComp"
              :key="activeTabKey"
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
import {
  getInitialBookableExpertMode,
  isBookableExpertModeConfigured,
  isBookableExpertOnlyTab,
  setBookableExpertModeSession,
} from "@/utils/bookableExpertMode";

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
  provide() {
    return {
      bookableExpertMode: this.expertModeContext,
    };
  },
  data() {
    return {
      isLoading: false,
      inProgress: false,
      validRoot: true,
      activeTabKey: "general",
      expertModeContext: {
        enabled: getInitialBookableExpertMode(),
      },
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
    expertMode() {
      return this.expertModeContext.enabled;
    },
    expertModeToggleVisible() {
      return isBookableExpertModeConfigured();
    },
    visibleTabs() {
      if (this.expertMode) {
        return this.tabs;
      }
      return this.tabs.filter((tab) => !isBookableExpertOnlyTab(tab.key));
    },
    tabsRenderKey() {
      return this.expertMode ? "expert" : "simple";
    },
    activeTabIndex() {
      const index = this.visibleTabs.findIndex(
        (tab) => tab.key === this.activeTabKey
      );
      return index >= 0 ? index : 0;
    },
    activeTabComp() {
      const current = this.visibleTabs.find(
        (tab) => tab.key === this.activeTabKey
      );
      return current?.comp || this.visibleTabs[0]?.comp;
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
        this.bookable.isTimePeriodRelated = false;
        this.bookable.isBlockPeriodRelated = false;
        this.bookable.isLongRange = false;
        this.bookable.longRangeOptions = {};
        // Tickets default to time-independent; other bookables to free time selection
        this.bookable.isScheduleRelated = this.type !== "ticket";
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
      if (!this.expertMode && isBookableExpertOnlyTab(key)) {
        return;
      }
      if (this.visibleTabs.some((tab) => tab.key === key)) {
        this.activeTabKey = key;
      }
    },
    onTabChange(index) {
      const tab = this.visibleTabs[index];
      if (tab) {
        this.activeTabKey = tab.key;
      }
    },
    ensureActiveTabVisible() {
      if (this.visibleTabs.some((tab) => tab.key === this.activeTabKey)) {
        return;
      }
      this.activeTabKey = this.visibleTabs[0]?.key || "general";
    },
    setExpertMode(enabled) {
      if (!this.expertModeToggleVisible) {
        return;
      }
      this.expertModeContext.enabled = !!enabled;
      setBookableExpertModeSession(this.expertModeContext.enabled);
      this.ensureActiveTabVisible();
    },
    resolveTabFromQuery() {
      let queryTabKey = this.$route.query.tab;
      // Legacy deep-link: tags tab was merged into general
      if (queryTabKey === "tags") {
        queryTabKey = "general";
      }
      if (this.visibleTabs.some((tab) => tab.key === queryTabKey)) {
        this.activeTabKey = queryTabKey;
        return;
      }
      this.activeTabKey = this.visibleTabs[0]?.key || "general";
      if (
        this.activeTabKey &&
        queryTabKey &&
        this.$route.query.tab !== this.activeTabKey
      ) {
        this.$router.replace({
          query: { ...this.$route.query, tab: this.activeTabKey },
        });
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
    activeTabKey(tabKey) {
      if (!tabKey || this.$route.query.tab === tabKey) return;
      this.$router.replace({
        query: { ...this.$route.query, tab: tabKey },
      });
    },
  },
  mounted() {
    this.resolveTabFromQuery();
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

.page-content__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  min-width: 0;
}

.page-content__meta-info {
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1 1 auto;
}

.page-content__meta-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.page-content__meta-actions {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 8px;
}

.bookable-id-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

  .page-content__meta {
    flex-direction: column;
    align-items: stretch;
  }

  .page-content__meta-actions {
    justify-content: flex-end;
  }
}

@media (max-width: 599px) {
  .page-content__meta-info {
    flex-wrap: wrap;
    row-gap: 2px;
  }

  .page-content__meta-sep {
    display: none;
  }

  .page-content__meta-title {
    flex: 1 1 100%;
    font-weight: 500;
  }

  .bookable-id-copy {
    max-width: 100%;
  }

  .page-content__meta-actions {
    justify-content: flex-end;
    width: 100%;
  }
}

.expert-mode-switch {
  flex: 0 0 auto;
}

.bookable-id-copy {
  display: inline-flex;
  align-items: center;
  max-width: min(100%, 280px);
  min-width: 0;
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
