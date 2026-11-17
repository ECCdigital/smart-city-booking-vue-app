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
        <FlowBar
          v-if="flowMode"
          :type-label="$t(`editBookables.types.${bookable.type || type}`)"
          :name="bookable.title || ''"
          :new-label="$t(`bookable.flow.bar.new.${bookable.type || type}`)"
          :id="bookableID || null"
          :show-back="!flowOutcome"
          :steps-column="flowStepColumn"
          @leave="leaveFlow"
          @copy-id="copyBookableId"
        >
          <template #actions>
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
          </template>
        </FlowBar>

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
                  <span class="bookable-id-text">{{
                    $t("bookable.edit.id", { id: bookableID })
                  }}</span>
                  <v-icon x-small class="ml-1 flex-shrink-0">
                    mdi-content-copy
                  </v-icon>
                </span>
              </template>
              <span>{{ $t("bookable.edit.copyId.tooltip") }}</span>
            </v-tooltip>
            <span v-else class="bookable-id-text">{{
              $t("bookable.edit.id", { id: "-" })
            }}</span>
            <span class="page-content__meta-sep mx-1">•</span>
            <span class="page-content__meta-title">
              {{ bookable.title || $t("bookable.edit.untitled") }}
            </span>
          </div>
          <div class="page-content__meta-actions">
            <v-btn
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

        <!-- The status band: the Veröffentlichung, the same component as
             the flow's last step. -->
        <v-sheet
          v-if="!flowMode"
          class="mb-4 px-4 py-3 status-band"
          rounded
          data-test="status-band"
        >
          <BookableEditPublication
            :bookable="bookable"
            :level="supervisionLevel"
            @update:bookable="onUpdateBookable"
          />
        </v-sheet>
      </div>

      <!-- The guided flow (ECCdigital/tickets#326) is a mode of this page:
           the same bookable, saved once at its end. A new bookable
           starts in it. -->
      <BookableFlow
        v-if="flowMode && bookable.tenantId"
        ref="flow"
        :bookable="bookable"
        :is-new="!bookableID"
        :level="supervisionLevel"
        :in-progress="inProgress"
        :save-failed="flowSaveFailed"
        :outcome="flowOutcome"
        @update:bookable="onUpdateBookable"
        @save="saveFlow"
        @open-section="openSection"
        @open-area="openArea"
        @another="createAnother"
        @leave="toEditingPage"
      />

      <div v-else-if="!flowMode" class="page-content__main">
        <div class="page-content__nav">
          <EditorNav
            :key="tabsRenderKey"
            :tabs="navTabs"
            :active-key="activeTabKey"
            :sections="showSectionNav ? navSections : []"
            :active-section-id="activeSectionId"
            :aria-label="$t('bookable.edit.nav.tabs')"
            :sections-aria-label="$t('bookable.edit.nav.sections')"
            @go="goToTab"
          />
        </div>

        <div class="page-content__editor" ref="editorScroll">
          <keep-alive>
            <BookableEditTab
              v-if="activeTab && bookable.tenantId"
              :key="activeTabKey"
              :tab="activeTab"
              :bookable="bookable"
              :section-target="sectionTarget"
              @update:bookable="onUpdateBookable"
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
import BookableEditPublication from "@/components/Bookable/Edit/BookableEditPublication.vue";
import BookableFlowSummary from "@/components/Bookable/Flow/BookableFlowSummary.vue";
import BookableEditTab from "@/components/Bookable/Edit/BookableEditTab.vue";
import EditorNav from "@/components/commons/EditorNav.vue";
import FlowBar from "@/components/commons/FlowBar.vue";
import { BOOKABLE_EDIT_TABS } from "@/components/Bookable/Edit/bookableEditTabs";
import ToastService from "@/services/ToastService";
import { createTenantAccessPoints } from "@/services/TenantAccessPoints";
import BookableFlow from "@/components/Bookable/Flow/BookableFlow.vue";
import {
  FLOW_STEPS,
  editRouteOf,
  isFlowMode,
  withMode,
} from "@/utils/bookableFlow";
import { publicationOutcome } from "@/utils/bookablePublication";
import {
  expertOptionShownIn,
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
    BookableEditPublication,
    BookableFlowSummary,
    SaveBar,
    UnsavedChangesDialog,
    BookableFlow,
    BookableEditTab,
    EditorNav,
    FlowBar,
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
      // Read once per page: Schließsysteme assigns from it, and what
      // ParkraumService takes over depends on its assigned locker system.
      bookableAccessPoints: this.accessPoints,
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
      accessPoints: createTenantAccessPoints(),
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
    visibleTabs() {
      return this.tabs.filter((tab) =>
        expertTabShown(tab.key, this.expertOptionShown)
      );
    },
    tabsRenderKey() {
      return this.expertMode ? "expert" : "simple";
    },
    activeTab() {
      return (
        this.visibleTabs.find((tab) => tab.key === this.activeTabKey) ||
        this.visibleTabs[0]
      );
    },
    sectionContext() {
      return {
        bookable: this.bookable,
        shown: this.expertOptionShown,
        accessPoints: this.accessPoints.list,
      };
    },
    activeTabSections() {
      return getVisibleBookableEditSections(
        this.activeTabKey,
        this.sectionContext
      );
    },
    /** The tabs as the navigation shows them. */
    navTabs() {
      return this.visibleTabs.map((tab) => ({
        key: tab.key,
        icon: tab.icon,
        label: this.$t(tab.labelKey),
      }));
    },
    navSections() {
      return this.activeTabSections.map((section) => ({
        id: section.id,
        label: this.$t(section.labelKey),
      }));
    },
    showSectionNav() {
      return shouldShowBookableEditSectionNav(
        this.activeTabKey,
        this.sectionContext
      );
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
      return expertOptionShownIn(this.expertModeContext, this.bookable)(option);
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
        accessPoints: this.accessPoints.list,
        // An unchanged location passes whatever it holds; a new bookable
        // has none stored yet.
        stored: this.bookableID ? this.expertModeContext.stored : null,
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
      // Read before the save: a created bookable puts its id in the route.
      const created = !this.bookableID;
      try {
        this.inProgress = true;
        const response = await ApiBookablesService.createOrUpdateBookable(
          payload
        );
        this.bookable = normalizeBookable(response.data);

        if (created) {
          // A bookable created in the flow stays in it for the confirmation,
          // one created on the editing page stays there.
          const query = withMode(
            { ...this.$route.query, id: this.bookable.id },
            this.flowMode
          );
          this.$router.replace({ query });
        }

        this.takeSnapshot();
        this.messagesRevealed = false;
        if (created) {
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
        } else if (created) {
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
      this.flowOutcome = publicationOutcome(
        this.bookable,
        before,
        this.supervisionLevel
      );
    },
    enterFlow() {
      this.$router.replace({ query: withMode(this.$route.query, true) });
    },
    /** Back to the editor; what the flow changed stays unsaved, not lost. */
    leaveFlow() {
      this.flowOutcome = null;
      return this.$router.replace({
        query: withMode(this.$route.query, false),
      });
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
    /**
     * The confirmation's „Zur Bearbeitungsseite“: this bookable on the
     * editing page of its type.
     */
    toEditingPage() {
      const name = editRouteOf(this.bookable.type);
      if (name === this.$route.name) {
        this.leaveFlow();
        return;
      }
      this.flowOutcome = null;
      this.$router.push({ name, query: { id: this.bookable.id } });
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
      await this.accessPoints.load(
        this.bookable.tenantId || this.currentTenant?.id
      );

      this.takeSnapshot();
      // Only now: whether a tab of expert options shows depends on the
      // bookable, and a section of ParkraumService on its access points.
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
      if (nextSectionId && !this.sectionShownIn(key, nextSectionId)) {
        return;
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
    /** Whether the section `sectionId` lies in the tab `tabKey` and shows. */
    sectionShownIn(tabKey, sectionId) {
      const section = getBookableEditSectionById(sectionId);
      return (
        !!section &&
        section.tabKey === tabKey &&
        getVisibleBookableEditSections(tabKey, this.sectionContext).some(
          (item) => item.id === sectionId
        )
      );
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
      const nextSectionId =
        querySection && this.sectionShownIn(nextTabKey, querySection)
          ? querySection
          : null;

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
.status-band {
  transition: transform var(--scb-motion-base),
    box-shadow var(--scb-motion-base);
  background-color: var(--scb-surface-raised) !important;
}

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
