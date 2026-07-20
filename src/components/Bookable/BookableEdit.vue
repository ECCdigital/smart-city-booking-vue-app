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
              <span>{{ $t("bookable.edit.copyId.tooltip") }}</span>
            </v-tooltip>
            <span v-else class="bookable-id-text">ID: -</span>
            <span class="page-content__meta-sep mx-1">•</span>
            <span class="page-content__meta-title">
              {{ bookable.title || $t("bookable.edit.untitled") }}
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
              {{ $t("bookable.edit.unsavedChanges") }}
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
          <nav
            v-if="$vuetify.breakpoint.mdAndUp"
            :key="tabsRenderKey"
            class="bookable-edit-nav"
            aria-label="Buchungsobjekt-Bereiche"
          >
            <div
              v-for="t in visibleTabs"
              :key="t.key"
              class="bookable-edit-nav__group"
              :class="{ 'bookable-edit-nav__group--active': activeTabKey === t.key }"
            >
              <button
                type="button"
                class="bookable-edit-nav__tab"
                :class="{ 'bookable-edit-nav__tab--active': activeTabKey === t.key }"
                @click="goToTab(t.key)"
              >
                <v-icon small class="bookable-edit-nav__tab-icon">
                  {{ t.icon }}
                </v-icon>
                <span class="bookable-edit-nav__tab-label">{{ t.label }}</span>
              </button>

              <div
                v-if="activeTabKey === t.key && showSectionNav"
                class="bookable-edit-nav__sections"
              >
                <button
                  v-for="section in activeTabSections"
                  :key="section.id"
                  type="button"
                  class="bookable-edit-nav__section"
                  :class="{
                    'bookable-edit-nav__section--active':
                      activeSectionId === section.id,
                  }"
                  @click="goToTab(t.key, section.id)"
                >
                  {{ $t(section.labelKey) }}
                </button>
              </div>
            </div>
          </nav>

          <template v-else>
            <v-tabs
              :key="tabsRenderKey"
              :value="activeTabIndex"
              color="primary"
              show-arrows
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
            <div
              v-if="showSectionNav"
              class="bookable-edit-nav__subnav"
              role="navigation"
              aria-label="Unterbereiche"
            >
              <button
                v-for="section in activeTabSections"
                :key="section.id"
                type="button"
                class="bookable-edit-nav__sublink"
                :class="{
                  'bookable-edit-nav__sublink--active':
                    activeSectionId === section.id,
                }"
                @click="goToTab(activeTabKey, section.id)"
              >
                {{ $t(section.labelKey) }}
              </button>
            </div>
          </template>
        </div>

        <div class="page-content__editor" ref="editorScroll">
          <keep-alive>
            <component
              v-if="activeTabComp && bookable.tenantId"
              :is="activeTabComp"
              :key="activeTabKey"
              :bookable="bookable"
              :valid-root.sync="validRoot"
              v-bind="activeTabExtraProps"
              @update:bookable="onUpdateBookable"
              @navigate-tab="goToTab"
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
      @cancel="onRestoreChanges"
      show-restore
      :disabled="inProgress || isLoading || !validRoot || hasUnsavedChanges"
      :in-progress="inProgress"
    />

    <UnsavedChangesDialog
      v-model="leaveDialogOpen"
      @stay="resolveLeaveConfirm(false)"
      @discard="resolveLeaveConfirm(true)"
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
import UnsavedChangesDialog from "@/components/commons/UnsavedChangesDialog.vue";
import unsavedChangesGuard from "@/mixins/unsavedChangesGuard";
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
import {
  bookableEditSectionElementId,
  getBookableEditSectionById,
  getVisibleBookableEditSections,
  shouldShowBookableEditSectionNav,
} from "@/utils/bookableEditSections";

export default {
  name: "BookableEdit",
  components: {
    BookableEditStatus,
    BookableEditOverview,
    SaveBar,
    UnsavedChangesDialog,
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
  mixins: [unsavedChangesGuard],
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
      activeSectionId: null,
      sectionTarget: null,
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
    sectionContext() {
      return {
        bookable: this.bookable,
        expertMode: this.expertMode,
      };
    },
    activeTabSections() {
      return getVisibleBookableEditSections(
        this.activeTabKey,
        this.sectionContext
      );
    },
    showSectionNav() {
      return shouldShowBookableEditSectionNav(
        this.activeTabKey,
        this.sectionContext
      );
    },
    activeTabExtraProps() {
      if (this.activeTabKey === "customFields") {
        return { sectionTarget: this.sectionTarget };
      }
      return {};
    },
    hasUnsavedChanges() {
      if (
        this.isLoading ||
        !this.originalSnapshot ||
        typeof this.originalSnapshot !== "string"
      ) {
        return false;
      }
      const bookableClean = _.omit(this.bookable, ["customFields"]);
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
    async onRestoreChanges() {
      const discard = await this.confirmDiscardChanges();
      if (discard) {
        await this.init();
      }
    },
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

        const bookableClean = _.omit(response.data, ["customFields"]);

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
        const bookableClean = _.omit(this.bookable, ["customFields"]);
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
    goToTab(key, sectionId) {
      if (!this.expertMode && isBookableExpertOnlyTab(key)) {
        return;
      }
      if (!this.visibleTabs.some((tab) => tab.key === key)) {
        return;
      }

      const nextSectionId = sectionId || null;
      if (nextSectionId) {
        const section = getBookableEditSectionById(nextSectionId);
        if (!section || section.tabKey !== key) {
          return;
        }
        const visible = getVisibleBookableEditSections(
          key,
          this.sectionContext
        );
        if (!visible.some((item) => item.id === nextSectionId)) {
          return;
        }
      }

      this.activeTabKey = key;
      this.activeSectionId = nextSectionId;
      if (!nextSectionId) {
        this.sectionTarget = null;
      }
      this.syncRouteQuery();

      if (nextSectionId) {
        this.$nextTick(() => {
          this.applySectionNavigation(nextSectionId);
        });
      }
    },
    onTabChange(index) {
      const tab = this.visibleTabs[index];
      if (tab) {
        this.goToTab(tab.key);
      }
    },
    applySectionNavigation(sectionId) {
      const section = getBookableEditSectionById(sectionId);
      if (!section) {
        return;
      }

      if (section.type === "subTab") {
        this.sectionTarget = sectionId;
        return;
      }

      this.sectionTarget = null;
      const elementId = bookableEditSectionElementId(sectionId);
      const root = this.$refs.editorScroll;
      const el =
        (root && root.querySelector && root.querySelector(`#${elementId}`)) ||
        document.getElementById(elementId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    syncRouteQuery() {
      const query = { ...this.$route.query, tab: this.activeTabKey };
      if (this.activeSectionId) {
        query.section = this.activeSectionId;
      } else {
        delete query.section;
      }

      const sameTab = this.$route.query.tab === query.tab;
      const sameSection =
        (this.$route.query.section || null) === (query.section || null);
      if (sameTab && sameSection) {
        return;
      }

      this.$router.replace({ query });
    },
    ensureActiveTabVisible() {
      if (this.visibleTabs.some((tab) => tab.key === this.activeTabKey)) {
        return;
      }
      this.goToTab(this.visibleTabs[0]?.key || "general");
    },
    setExpertMode(enabled) {
      if (!this.expertModeToggleVisible) {
        return;
      }
      this.expertModeContext.enabled = !!enabled;
      setBookableExpertModeSession(this.expertModeContext.enabled);
      this.ensureActiveTabVisible();
      if (
        this.activeSectionId &&
        !this.activeTabSections.some(
          (section) => section.id === this.activeSectionId
        )
      ) {
        this.activeSectionId = null;
        this.sectionTarget = null;
        this.syncRouteQuery();
      }
    },
    resolveTabFromQuery() {
      let queryTabKey = this.$route.query.tab;
      // Legacy deep-link: tags tab was merged into general
      if (queryTabKey === "tags") {
        queryTabKey = "general";
      }

      let nextTabKey = this.visibleTabs[0]?.key || "general";
      if (this.visibleTabs.some((tab) => tab.key === queryTabKey)) {
        nextTabKey = queryTabKey;
      }

      const querySection = this.$route.query.section || null;
      const section = querySection
        ? getBookableEditSectionById(querySection)
        : null;
      let nextSectionId = null;
      if (section && section.tabKey === nextTabKey) {
        const visible = getVisibleBookableEditSections(
          nextTabKey,
          this.sectionContext
        );
        if (visible.some((item) => item.id === querySection)) {
          nextSectionId = querySection;
        }
      }

      this.activeTabKey = nextTabKey;
      this.activeSectionId = nextSectionId;
      this.syncRouteQuery();

      if (nextSectionId) {
        this.$nextTick(() => {
          this.applySectionNavigation(nextSectionId);
        });
      } else {
        this.sectionTarget = null;
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
    "bookable.tenantId"(tenantId) {
      if (!tenantId || !this.activeSectionId) {
        return;
      }
      this.$nextTick(() => {
        this.applySectionNavigation(this.activeSectionId);
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

.bookable-edit-nav {
  min-width: 196px;
  max-width: 228px;
  padding: 2px 0;
}

.bookable-edit-nav__group {
  margin-bottom: 2px;
}

.bookable-edit-nav__group--active {
  margin-bottom: 8px;
}

.bookable-edit-nav__tab {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 40px;
  margin: 0;
  padding: 8px 12px 8px 10px;
  border: 0;
  border-left: 3px solid transparent;
  border-radius: 0 4px 4px 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease,
    border-color 0.15s ease;
}

.bookable-edit-nav__tab:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.theme--dark .bookable-edit-nav__tab:hover {
  background-color: rgba(255, 255, 255, 0.06);
}

.bookable-edit-nav__tab--active {
  color: var(--v-primary-base);
  border-left-color: var(--v-primary-base);
  background-color: rgba(var(--v-primary-base), 0.08);
  font-weight: 500;
}

.bookable-edit-nav__tab--active .bookable-edit-nav__tab-icon {
  color: var(--v-primary-base);
}

.bookable-edit-nav__tab-icon {
  flex: 0 0 auto;
  margin-right: 10px;
  opacity: 0.85;
}

.bookable-edit-nav__tab-label {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 0.875rem;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bookable-edit-nav__sections {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin: 2px 0 0 22px;
  padding: 2px 0 2px 12px;
  border-left: 1px solid rgba(0, 0, 0, 0.12);
}

.theme--dark .bookable-edit-nav__sections {
  border-left-color: rgba(255, 255, 255, 0.16);
}

.bookable-edit-nav__section {
  display: block;
  width: 100%;
  margin: 0;
  padding: 5px 8px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: rgba(0, 0, 0, 0.6);
  font: inherit;
  font-size: 0.8125rem;
  line-height: 1.3;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.theme--dark .bookable-edit-nav__section {
  color: rgba(255, 255, 255, 0.7);
}

.bookable-edit-nav__section:hover {
  color: rgba(0, 0, 0, 0.87);
  background-color: rgba(0, 0, 0, 0.04);
}

.theme--dark .bookable-edit-nav__section:hover {
  color: rgba(255, 255, 255, 0.92);
  background-color: rgba(255, 255, 255, 0.06);
}

.bookable-edit-nav__section--active {
  color: var(--v-primary-base);
  font-weight: 500;
  background-color: rgba(var(--v-primary-base), 0.08);
}

.theme--dark .bookable-edit-nav__section--active {
  color: var(--v-primary-base);
}

.bookable-edit-nav__subnav {
  display: flex;
  flex-wrap: nowrap;
  gap: 4px;
  margin: 0;
  padding: 6px 4px 8px;
  overflow-x: auto;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  scrollbar-width: thin;
}

.theme--dark .bookable-edit-nav__subnav {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.bookable-edit-nav__sublink {
  flex: 0 0 auto;
  margin: 0;
  padding: 6px 10px;
  border: 0;
  border-radius: 16px;
  background: transparent;
  color: rgba(0, 0, 0, 0.6);
  font: inherit;
  font-size: 0.8125rem;
  line-height: 1.2;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.theme--dark .bookable-edit-nav__sublink {
  color: rgba(255, 255, 255, 0.7);
}

.bookable-edit-nav__sublink:hover {
  color: rgba(0, 0, 0, 0.87);
  background-color: rgba(0, 0, 0, 0.05);
}

.theme--dark .bookable-edit-nav__sublink:hover {
  color: rgba(255, 255, 255, 0.92);
  background-color: rgba(255, 255, 255, 0.08);
}

.bookable-edit-nav__sublink--active {
  color: var(--v-primary-base);
  font-weight: 500;
  background-color: rgba(var(--v-primary-base), 0.12);
}

.theme--dark .bookable-edit-nav__sublink--active {
  color: var(--v-primary-base);
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

.page-content__editor >>> [id^="be-section-"] {
  scroll-margin-top: 16px;
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
