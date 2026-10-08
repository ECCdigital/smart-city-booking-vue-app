<template>
  <div class="page-content" ref="contentCol">
    <!-- Not a gate: the save asks bookableValidation. The form only reveals
         every field's message after a refused save. -->
    <v-form ref="rootForm" class="page-content__form">
      <div class="page-content__top">
        <v-progress-linear :active="isLoading" indeterminate color="primary" />

        <!-- The guided flow's bar stands in for this row, the page title and
             the status band: the way back, the bookable and the switches,
             each over its column of the flow. -->
        <header
          v-if="flowMode"
          class="flow-bar"
          :class="{ 'flow-bar--steps': flowStepColumn }"
          data-test="flow-bar"
        >
          <div class="flow-bar__back">
            <v-btn
              v-if="bookableID && !flowOutcome"
              small
              text
              class="flow-bar__back-btn"
              data-test="flow-leave"
              @click="leaveFlow"
            >
              <v-icon left small>mdi-arrow-left</v-icon>
              {{ $t("bookable.flow.leave") }}
            </v-btn>
            <v-btn
              v-else-if="!bookableID"
              small
              text
              class="flow-bar__back-btn"
              :to="{ name: listRoute }"
              data-test="flow-to-list"
            >
              <v-icon left small>mdi-arrow-left</v-icon>
              {{ $t(`bookable.flow.bar.list.${type}`) }}
            </v-btn>
          </div>
          <div class="flow-bar__object">
            <h1 class="flow-bar__name" data-test="flow-bar-name">
              <template v-if="!bookableID && !bookable.title">
                {{ $t(`bookable.flow.bar.new.${bookable.type || type}`) }}
              </template>
              <template v-else>
                <span class="flow-bar__type">
                  {{ $t(`editBookables.types.${bookable.type || type}`) }}
                </span>
                <span class="flow-bar__title">
                  {{ bookable.title || $t("bookable.edit.untitled") }}
                </span>
              </template>
            </h1>
            <!-- The ID, to copy, as the editor's row shows it. -->
            <v-tooltip v-if="bookableID" bottom>
              <template v-slot:activator="{ on, attrs }">
                <span
                  class="bookable-id-copy flow-bar__id text--secondary"
                  v-bind="attrs"
                  v-on="on"
                  data-test="flow-bar-id"
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
          </div>
          <div class="flow-bar__actions">
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
        </header>

        <div v-else class="page-content__meta mb-2">
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
            <v-btn
              v-if="bookableID"
              small
              text
              color="primary"
              class="page-content__flow-switch"
              data-test="flow-enter"
              @click="enterFlow"
            >
              <v-icon left small>mdi-format-list-checks</v-icon>
              {{ $t("bookable.flow.enter") }}
            </v-btn>
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

        <BookableEditStatus
          v-if="!flowMode"
          :bookable="bookable"
          :level="supervisionLevel"
          @update:bookable="onUpdateBookable"
        />
      </div>

      <!-- The guided flow (ECCdigital/tickets#326) is a mode of this page:
           the same bookable, saved once at its end. A new bookable is
           always created in it. -->
      <BookableFlow
        v-if="flowMode && bookable.tenantId"
        ref="flow"
        :bookable="bookable"
        :is-new="!bookableID"
        :onboarding="$route.query.onboarding === '1'"
        :level="supervisionLevel"
        :in-progress="inProgress"
        :save-failed="flowSaveFailed"
        :outcome="flowOutcome"
        @update:bookable="onUpdateBookable"
        @save="saveFlow"
        @open-section="openSection"
        @open-area="openArea"
        @another="createAnother"
        @overview="toOverview"
        @skip="skipFlow"
      />

      <div v-else-if="!flowMode" class="page-content__main">
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
              :class="{
                'bookable-edit-nav__group--active': activeTabKey === t.key,
              }"
            >
              <button
                type="button"
                class="bookable-edit-nav__tab"
                :class="{
                  'bookable-edit-nav__tab--active': activeTabKey === t.key,
                }"
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
              v-bind="activeTabExtraProps"
              @update:bookable="onUpdateBookable"
              @navigate-tab="goToTab"
              @open-section="openSection"
            />
          </keep-alive>
        </div>

        <!-- The overview of the guided flow, the same here (ECCdigital/
             tickets#364): each row leads to its field. -->
        <div v-if="$vuetify.breakpoint.lgAndUp" class="page-content__overview">
          <BookableFlowSummary :bookable="bookable" @go="openField" />
        </div>
      </div>
    </v-form>

    <SaveBar
      v-if="!flowMode"
      :anchor-el="
        $refs.contentCol && ($refs.contentCol.$el || $refs.contentCol)
      "
      :scroll-root="scrollRoot"
      @submit="save"
      @cancel="onRestoreChanges"
      show-restore
      :active="hasUnsavedChanges"
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
import SaveBar from "@/components/commons/SaveBar.vue";
import UnsavedChangesDialog from "@/components/commons/UnsavedChangesDialog.vue";
import unsavedChangesGuard from "@/mixins/unsavedChangesGuard";
import Bookable from "@/entities/bookable";
import { normalizeBookable } from "@/utils/normalizeBookable";
import { mapActions, mapGetters } from "vuex";
import BookableEditStatus from "@/components/Bookable/Edit/BookableEditStatus.vue";
import BookableFlowSummary from "@/components/Bookable/Flow/BookableFlowSummary.vue";
import BookableEditTab from "@/components/Bookable/Edit/BookableEditTab.vue";
import { BOOKABLE_EDIT_TABS } from "@/components/Bookable/Edit/bookableEditTabs";
import ToastService from "@/services/ToastService";
import BookableFlow from "@/components/Bookable/Flow/BookableFlow.vue";
import {
  FLOW_MODE,
  FLOW_STEPS,
  editRouteOf,
  isFlowMode,
  listRouteOf,
} from "@/utils/bookableFlow";
import { publicationOutcome } from "@/utils/bookablePublication";
import {
  expertOptionShown,
  expertTabShown,
  getInitialBookableExpertMode,
  isBookableExpertModeConfigured,
  setBookableExpertModeSession,
} from "@/utils/bookableExpertMode";
import {
  bookableEditSectionElementId,
  getBookableEditSectionById,
  getVisibleBookableEditSections,
  shouldShowBookableEditSectionNav,
} from "@/utils/bookableEditSections";
import BookablePermissionService from "@/services/permissions/BookablePermissionService";
import { formatAccessPointErrorMessage } from "@/utilities/access-point-errors";
import { bookableIssues, firstIssue } from "@/utils/bookableValidation";
import { areaAt, areaShown } from "@/utils/bookableAreas";
import { revealField } from "@/utils/bookableFieldAnchor";

// What the unsaved-changes snapshot leaves out. The review (glossary
// "Prüfstatus") is the backend's alone and changes through its own actions,
// never through a save - a submission must not read as an unsaved edit.
const SNAPSHOT_IGNORED = ["customFields", "review"];

export default {
  name: "BookableEdit",
  components: {
    BookableEditStatus,
    BookableFlowSummary,
    SaveBar,
    UnsavedChangesDialog,
    BookableFlow,
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
      scrollRoot: null,
      isLoading: false,
      inProgress: false,
      // Set by a refused save: every field shows its message from then on,
      // also in a tab or step opened later, until the next save goes through.
      messagesRevealed: false,
      activeTabKey: "general",
      activeSectionId: null,
      sectionTarget: null,
      // What the components ask the expert-mode rule with: the mode and the
      // bookable as loaded or last saved (`takeSnapshot`).
      expertModeContext: {
        enabled: getInitialBookableExpertMode(),
        stored: null,
      },
      // The tabs and what they are made of; frozen, so not reactive.
      tabs: BOOKABLE_EDIT_TABS,
      originalSnapshot: {
        bookable: {},
      },
      bookable: {},
      // The guided flow's save: its outcome (`published`, `draft`, `kept`)
      // turns the flow into its confirmation.
      flowOutcome: null,
      flowSaveFailed: false,
    };
  },
  computed: {
    ...mapGetters({
      currentTenant: "tenants/currentTenant",
      adminSupervisionLevel: "tenants/currentSupervisionLevel",
      supervisionLevelOf: "user/supervisionLevelOf",
    }),
    bookableID() {
      return this.$route.query.id;
    },
    flowMode() {
      return isFlowMode({
        bookableId: this.bookableID,
        mode: this.$route.query.mode,
      });
    },
    // The sign-in's level, else the admin DTO's - as the pending banner
    // reads it. The publication reads it in both modes, the confirmation
    // words its outcome by it.
    supervisionLevel() {
      const tenantId = this.bookable.tenantId || this.currentTenant?.id;
      return this.supervisionLevelOf(tenantId) ?? this.adminSupervisionLevel;
    },
    expertMode() {
      return this.expertModeContext.enabled;
    },
    expertModeToggleVisible() {
      return isBookableExpertModeConfigured();
    },
    // The flow's bar follows the flow's step list (BookableFlow: from xl, not
    // on the confirmation), so the name starts over the step column.
    flowStepColumn() {
      return !this.flowOutcome && this.$vuetify.breakpoint.xl;
    },

    /** The list a new bookable came from, by the page's type. */
    listRoute() {
      return listRouteOf(this.type);
    },
    visibleTabs() {
      return this.tabs.filter(
        (tab) =>
          this.isTabVisible(tab) &&
          expertTabShown(tab.key, this.expertOptionShown)
      );
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
    activeTab() {
      return (
        this.visibleTabs.find((tab) => tab.key === this.activeTabKey) ||
        this.visibleTabs[0]
      );
    },
    // A tab of cards is framed by BookableEditTab, any other is its `comp`.
    activeTabComp() {
      if (!this.activeTab) return null;
      return this.activeTab.cards ? BookableEditTab : this.activeTab.comp;
    },
    sectionContext() {
      return {
        bookable: this.bookable,
        shown: this.expertOptionShown,
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
      if (!this.activeTab?.cards) return {};
      return { tab: this.activeTab, sectionTarget: this.sectionTarget };
    },
    hasUnsavedChanges() {
      if (
        this.isLoading ||
        !this.originalSnapshot ||
        typeof this.originalSnapshot !== "string"
      ) {
        return false;
      }
      const bookableClean = _.omit(this.bookable, SNAPSHOT_IGNORED);
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
        this.messagesRevealed = false;
        this.$refs.rootForm?.resetValidation();
      }
    },
    /** The expert-mode rule, as the components ask it. */
    expertOptionShown(option) {
      return expertOptionShown(option, {
        expertMode: this.expertMode,
        stored: this.expertModeContext.stored,
        current: this.bookable,
      });
    },
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
    /** „Speichern“ of the editing page. */
    async save() {
      if (this.refuseSave()) return;
      await this.createOrUpdate();
    },
    /**
     * Whether the bookable has issues the backend would refuse. If so,
     * nothing is saved: every message shows, and the first tab - or in the
     * guided flow the first step - with an issue opens.
     */
    refuseSave() {
      const issues = bookableIssues(this.bookable, {
        shown: this.expertOptionShown,
      });
      if (!issues.length) return false;

      this.revealMessages();
      const tabs = this.visibleTabs.map((tab) => tab.key);
      if (this.flowMode) {
        const issue = firstIssue(issues, FLOW_STEPS, "step");
        if (issue.step) {
          this.$refs.flow.openStep(issue.step, issue.area);
        } else {
          // No step of its own yet: the tab of the editing page.
          const { tab, section } = firstIssue(issues, tabs, "tab");
          this.openSection({ tabKey: tab, sectionId: section });
        }
      } else {
        const { tab, section } = firstIssue(issues, tabs, "tab");
        this.goToTab(tab, section || undefined);
      }
      return true;
    },
    /** Every field shows its message, now and in what opens later. */
    revealMessages() {
      this.messagesRevealed = true;
      this.$nextTick(() => this.$refs.rootForm?.validate());
    },
    /** Saves `payload` (the bookable as edited); `true` when it was stored. */
    async createOrUpdate(payload = this.bookable) {
      try {
        this.inProgress = true;
        const response = await ApiBookablesService.createOrUpdateBookable(
          payload
        );
        this.bookable = normalizeBookable(response.data);

        if (!this.bookableID) {
          const query = { ...this.$route.query, id: this.bookable.id };
          // A bookable created in the flow stays in it for the confirmation.
          if (this.flowMode) query.mode = FLOW_MODE;
          this.$router.replace({ query });
        }

        this.takeSnapshot();
        this.messagesRevealed = false;
        if (!this.bookableID) {
          await this.addToast(
            ToastService.createToast("bookable.create.success", "success")
          );
        } else {
          await this.addToast(
            ToastService.createToast("bookable.update.success", "success")
          );
        }
        return true;
      } catch (err) {
        if (err.response?.status === 400) {
          // A rejected save is a ValidationError whose details name the
          // offending field - among them an access point id the tenant does
          // not know.
          const message = formatAccessPointErrorMessage(err, {
            fallbackKey: "bookable.update.error.message",
          });
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
        return false;
      } finally {
        this.inProgress = false;
      }
    },
    /**
     * The flow's one „Speichern“: the bookable as edited, its publication as
     * the step „Veröffentlichung“ set it. The confirmation reads its outcome
     * from the saved fields against the ones stored before.
     */
    async saveFlow() {
      if (this.refuseSave()) return;
      const before = this.bookableID ? this.expertModeContext.stored : null;
      this.flowSaveFailed = false;
      const saved = await this.createOrUpdate();
      if (!saved) {
        this.flowSaveFailed = true;
        return;
      }
      this.flowOutcome = publicationOutcome(this.bookable, before);
    },
    enterFlow() {
      this.$router.replace({
        query: { ...this.$route.query, mode: FLOW_MODE },
      });
    },
    /** Back to the editor; what the flow changed stays unsaved, not lost. */
    leaveFlow() {
      const query = { ...this.$route.query };
      delete query.mode;
      this.flowOutcome = null;
      return this.$router.replace({ query });
    },
    /**
     * A link of the confirmation: back into the flow, at the area `key` of
     * „Weitere Einstellungen“. The flow starts over once the outcome is gone.
     */
    async openArea(key) {
      this.flowOutcome = null;
      await this.$nextTick();
      this.$refs.flow.openStep("more", key);
    },
    /**
     * A place of the editing page, `{ tabKey, sectionId }`. In the guided
     * flow a place inside a shown area stays in the flow, at that area of
     * „Weitere Einstellungen“ - the settings of ParkraumService that the
     * notes of external availability and prices jump to lie in
     * Schließsysteme. Any other place leaves the flow for its tab.
     */
    async openSection({ tabKey, sectionId }) {
      if (this.flowMode) {
        const area = areaAt({ tabKey, sectionId });
        if (area && areaShown(area, this.expertOptionShown)) {
          this.$refs.flow.openStep("more", area);
          return;
        }
        await this.leaveFlow();
      }
      this.$nextTick(() => this.goToTab(tabKey, sectionId || undefined));
    },
    /**
     * A row of the overview on the editing page: the tab and section of its
     * field, then the field itself (`{ tab, section, field }`). Without a
     * tab the field lies in the status band - the Veröffentlichung.
     */
    async openField({ tab, section, field }) {
      if (tab) this.goToTab(tab, section || undefined);
      // After the tab has drawn and its section has scrolled into view.
      await this.$nextTick();
      await this.$nextTick();
      revealField(this.$el, field);
    },
    /** „Zur Übersicht“: this bookable in the editor of its type. */
    toOverview() {
      const name = editRouteOf(this.bookable.type);
      if (name === this.$route.name) {
        this.leaveFlow();
        return;
      }
      this.flowOutcome = null;
      this.$router.push({ name, query: { id: this.bookable.id } });
    },
    /**
     * The onboarding's first bookable left for later: the start page, whose
     * „Erstes Buchungsobjekt anlegen“ opens the flow again.
     */
    skipFlow() {
      this.$router.push({ name: "dashboard" });
    },
    /** „Weiteres Buchungsobjekt anlegen“: a new one of the same type. */
    createAnother() {
      this.$router.push({ name: editRouteOf(this.bookable.type) });
    },
    async init() {
      if (this.bookableID) {
        await this.fetchBookable(this.bookableID);
      } else {
        const response = await ApiBookablesService.getBookableTemplate(
          this.currentTenant.id
        );
        this.bookable = normalizeBookable({
          ...new Bookable(response.data).toPlain(),
          type: this.type,
          isTimePeriodRelated: false,
          isBlockPeriodRelated: false,
          isLongRange: false,
          longRangeOptions: {},
          // Tickets default to time-independent; other bookables to free time selection
          isScheduleRelated: this.type !== "ticket",
          // Nothing is published unasked: both switches start off (#362).
          isBookable: false,
          isPublic: false,
        });
      }

      this.takeSnapshot();
      // Only now: whether a tab of expert options shows depends on the
      // bookable.
      this.resolveTabFromQuery();
    },
    /**
     * What „Ungespeicherte Änderungen“ compares against: the bookable as
     * normalized on load or after the save, so the normalization never reads
     * as an edit.
     */
    takeSnapshot() {
      const bookableClean = _.omit(this.bookable, SNAPSHOT_IGNORED);
      this.originalSnapshot = JSON.stringify({
        bookable: bookableClean,
      });
      this.expertModeContext.stored = _.cloneDeep(this.bookable);
    },
    async fetchBookable(bookableId) {
      try {
        this.isLoading = true;
        const response = await ApiBookablesService.getBookable(bookableId);
        this.bookable = normalizeBookable(response.data);
      } catch (err) {
        console.error("Error fetching bookable:", err);
      } finally {
        this.isLoading = false;
      }
    },
    /** A partial patch: only the changed top-level fields, merged flat. */
    onUpdateBookable(changes) {
      this.bookable = { ...this.bookable, ...changes };
    },
    goToTab(key, sectionId) {
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
        if (!this.bookableID) {
          this.flowOutcome = null;
          this.flowSaveFailed = false;
        }
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
    this.scrollRoot = this.$el.closest(".admin-page__body--scroll");
    // A tab or step that mounts after a refused save registers its fields
    // with the form: they show their messages at once, like the others.
    this.$watch(
      () => this.$refs.rootForm?.inputs.length,
      () => {
        if (this.messagesRevealed) this.revealMessages();
      }
    );
  },
};
</script>

<style scoped>
/* The page scrolls as one, as the booking editor does: the scrollbar sits at
   the right edge of the page body, and the navigation and the overview stick
   to the top while the sections pass by. */
.page-content {
  display: flex;
  flex-direction: column;
}

.page-content__form {
  display: flex;
  flex-direction: column;
}

.page-content__top {
  flex: 0 0 auto;
}

.page-content__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--scb-space-2) var(--scb-space-4);
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
  gap: var(--scb-space-2);
}

/* The guided flow's bar: one line across the page, closed by a rule, as wide
   as the editor's row - the actions end at the right edge. From xl the back
   cell is as wide as the step list, so the name starts over the step column;
   below that the line is plain. */
.flow-bar {
  display: flex;
  align-items: center;
  gap: var(--scb-gap-columns);
  min-height: 40px;
  margin-bottom: var(--scb-space-4);
  padding-bottom: var(--scb-space-2);
  border-bottom: 1px solid var(--scb-rule);
}

.flow-bar__back {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  min-width: 0;
}

.flow-bar--steps .flow-bar__back {
  min-width: var(--scb-nav-width-min);
  max-width: var(--scb-nav-width-max);
}

/* Flush with the step list below; the page body clips what reaches past
   its left edge, so no negative margin here. */
.flow-bar__back-btn {
  margin-left: 0;
  color: var(--scb-text-muted);
}

.flow-bar__object {
  display: flex;
  align-items: baseline;
  flex: 1 1 auto;
  min-width: 0;
  gap: var(--scb-space-4);
}

.flow-bar__name {
  flex: 0 1 auto;
  min-width: 0;
  margin: 0;
  font-size: 1.125rem;
  font-weight: var(--scb-font-weight-semibold);
  line-height: var(--scb-line-height-tight);
  color: var(--scb-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.flow-bar__id {
  flex: 0 1 auto;
  font-size: var(--scb-font-size-sm);
}

.flow-bar__type {
  margin-right: var(--scb-space-2);
  font-size: var(--scb-font-size-sm);
  font-weight: normal;
  color: var(--scb-text-muted);
}

.flow-bar__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex: 0 0 auto;
  gap: var(--scb-space-2);
  margin-left: auto;
}

@media (max-width: 599px) {
  .flow-bar {
    flex-wrap: wrap;
    gap: var(--scb-space-2) var(--scb-space-3);
  }

  .flow-bar__object {
    flex: 1 1 100%;
    flex-wrap: wrap;
    order: 3;
    gap: var(--scb-space-1) var(--scb-space-3);
  }

  .flow-bar__name {
    flex: 1 1 100%;
    white-space: normal;
  }
}

.bookable-id-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.page-content__main {
  display: flex;
  align-items: flex-start;
  gap: var(--scb-gap-columns);
}

.page-content__nav {
  flex: 0 0 auto;
  position: sticky;
  top: 0;
  max-height: calc(100vh - var(--scb-app-bar-height));
  overflow-x: hidden;
  overflow-y: auto;
}

.bookable-edit-nav {
  min-width: var(--scb-nav-width-min);
  max-width: var(--scb-nav-width-max);
  padding: 2px 0;
}

.bookable-edit-nav__group {
  margin-bottom: 2px;
}

.bookable-edit-nav__group--active {
  margin-bottom: var(--scb-space-2);
}

/* The active tab is a tinted pill, with no bar at its left edge - as the
   guided flow's step list. */
.bookable-edit-nav__tab {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: var(--scb-nav-item-height);
  margin: 0;
  padding: var(--scb-space-2) var(--scb-space-3);
  border: 0;
  border-radius: var(--scb-radius-control);
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color var(--scb-motion-fast),
    color var(--scb-motion-fast);
}

.bookable-edit-nav__tab:hover {
  background-color: var(--scb-hover-tint);
}

.bookable-edit-nav__tab--active {
  color: var(--v-primary-base);
  background-color: var(--scb-selected-tint);
  font-weight: var(--scb-font-weight-medium);
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
  font-size: var(--scb-font-size-md);
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bookable-edit-nav__sections {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin: 2px 0 0 24px;
  padding: 2px 0 2px var(--scb-space-3);
  border-left: 1px solid var(--scb-surface-border);
}

.bookable-edit-nav__section {
  display: block;
  width: 100%;
  margin: 0;
  padding: 5px var(--scb-space-2);
  border: 0;
  border-radius: var(--scb-radius-control);
  background: transparent;
  color: var(--scb-text-muted);
  font: inherit;
  font-size: var(--scb-font-size-sm);
  line-height: var(--scb-line-height-tight);
  text-align: left;
  cursor: pointer;
  transition: background-color var(--scb-motion-fast),
    color var(--scb-motion-fast);
}

.bookable-edit-nav__section:hover {
  color: var(--scb-text-hover);
  background-color: var(--scb-hover-tint);
}

.bookable-edit-nav__section--active {
  color: var(--v-primary-base);
  font-weight: var(--scb-font-weight-medium);
  background-color: var(--scb-selected-tint);
}

.theme--dark .bookable-edit-nav__section--active {
  color: var(--v-primary-base);
}

.bookable-edit-nav__subnav {
  display: flex;
  flex-wrap: nowrap;
  gap: var(--scb-space-1);
  margin: 0;
  padding: 6px var(--scb-space-1) var(--scb-space-2);
  overflow-x: auto;
  border-bottom: 1px solid var(--scb-rule-strong);
  scrollbar-width: thin;
}

.bookable-edit-nav__sublink {
  flex: 0 0 auto;
  margin: 0;
  padding: 6px 10px;
  border: 0;
  border-radius: var(--scb-radius-pill);
  background: transparent;
  color: var(--scb-text-muted);
  font: inherit;
  font-size: var(--scb-font-size-sm);
  line-height: 1.2;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color var(--scb-motion-fast),
    color var(--scb-motion-fast);
}

.bookable-edit-nav__sublink:hover {
  color: var(--scb-text-hover);
  background-color: var(--scb-hover-tint-strong);
}

.bookable-edit-nav__sublink--active {
  color: var(--v-primary-base);
  font-weight: var(--scb-font-weight-medium);
  background-color: var(--scb-selected-tint-strong);
}

.theme--dark .bookable-edit-nav__sublink--active {
  color: var(--v-primary-base);
}

/* As wide as the guided flow's step column, at most. */
.page-content__editor {
  flex: 1 1 auto;
  min-width: 0;
  max-width: var(--scb-editor-width-max);
  padding-bottom: var(--scb-save-bar-clearance);
}

.page-content__editor >>> [id^="be-section-"] {
  scroll-margin-top: var(--scb-space-4);
}

.page-content__overview {
  flex: 0 0 var(--scb-overview-width);
  max-width: var(--scb-overview-width-max);
  position: sticky;
  top: 0;
  max-height: calc(100vh - var(--scb-app-bar-height));
  overflow-x: hidden;
  overflow-y: auto;
}

/* $scb-bp-sm / $scb-bp-xs of tokens.scss; a scoped style cannot read them. */
@media (max-width: 959px) {
  .page-content__main {
    flex-direction: column;
    align-items: stretch;
  }

  .page-content__nav {
    flex: 0 0 auto;
    position: static;
    max-height: none;
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
    font-weight: var(--scb-font-weight-medium);
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
  border-radius: var(--scb-radius-control);
  padding: 2px 6px;
  margin: -2px -6px;
  transition: background-color var(--scb-motion-base),
    color var(--scb-motion-base);
}

.bookable-id-copy:hover {
  background-color: var(--scb-hover-tint-strong);
  color: var(--v-primary-base);
}
</style>
