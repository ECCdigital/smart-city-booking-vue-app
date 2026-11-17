<template>
  <AdminLayout :title="pageTitle" :hide-page-title="flowMode" scroll-body>
    <div class="event-edit" ref="contentCol">
      <v-progress-linear :active="isLoading" indeterminate color="primary" />

      <!-- The guided flow's bar stands in for the page title, the meta row
           and the publication band, as in the bookable editor. -->
      <FlowBar
        v-if="flowMode"
        :type-label="$t('event.flow.type')"
        :name="form.information.name || ''"
        :new-label="$t('event.flow.new')"
        :id="eventId"
        :steps-column="$vuetify.breakpoint.xl"
        @leave="leaveFlow"
        @copy-id="copyId"
      >
        <template #actions>
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

      <template v-else>
        <div class="event-edit__meta mb-2">
          <div class="event-edit__meta-info text--secondary">
            <v-tooltip v-if="eventId" bottom>
              <template v-slot:activator="{ on, attrs }">
                <span
                  class="event-edit__id"
                  v-bind="attrs"
                  v-on="on"
                  data-test="event-id"
                  @click="copyId"
                >
                  {{ $t("event.edit.id", { id: eventId }) }}
                  <v-icon x-small class="ml-1">mdi-content-copy</v-icon>
                </span>
              </template>
              <span>{{ $t("bookable.edit.copyId.tooltip") }}</span>
            </v-tooltip>
            <span v-else>{{ $t("event.edit.id", { id: "-" }) }}</span>
            <span class="mx-1">•</span>
            <span class="event-edit__meta-title">
              {{ form.information.name || $t("event.edit.untitled") }}
            </span>
          </div>
          <div class="event-edit__meta-actions">
            <v-btn
              small
              text
              color="primary"
              data-test="flow-enter"
              @click="enterFlow"
            >
              <v-icon left small>mdi-format-list-checks</v-icon>
              {{ $t("bookable.flow.enter") }}
            </v-btn>
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

        <v-sheet class="mb-4 px-4 py-3 event-edit__band" rounded>
          <EventEditPublication
            :allow-public="allowPublic"
            :review="review"
            :supervision-level="supervisionLevel"
            :tenant-id="form.tenantId || tenantId"
            @update:review="setReview"
          />
        </v-sheet>

        <!-- Details to edit, or where the event stands: only for a saved
             event, as only that has tickets and bookings. -->
        <v-tabs
          v-if="eventId && !isLoading"
          :value="viewIndex"
          class="mb-4 event-edit__views"
          :grow="$vuetify.breakpoint.xsOnly"
          data-test="event-views"
          @change="setView"
        >
          <v-tab
            v-for="view in views"
            :key="view.key"
            :data-test="`event-view-${view.key}`"
          >
            <v-icon v-if="$vuetify.breakpoint.smAndUp" left small>
              {{ view.icon }}
            </v-icon>
            {{ $t(view.labelKey) }}
          </v-tab>
        </v-tabs>
      </template>

      <!-- The overview stays beside the management, as beside the editor. -->
      <div v-if="managementShown" class="event-edit__main">
        <EventManagement
          class="event-edit__manage"
          :event-id="eventId"
          @go="goTo"
        />
        <div v-if="$vuetify.breakpoint.lgAndUp" class="event-edit__overview">
          <EventEditOverview :issues="issues" :tabs="tabs" @go="goTo" />
        </div>
      </div>

      <EventFlow
        v-else-if="flowMode && !isLoading"
        ref="flow"
        :is-new="!eventId"
        :issues="issues"
        :in-progress="inProgress"
        :save-failed="flowSaveFailed"
        :allow-public="allowPublic"
        :review="review"
        :supervision-level="supervisionLevel"
        :tenant-id="form.tenantId || tenantId"
        @update:review="setReview"
        @save="save"
      />

      <div v-else-if="!isLoading" class="event-edit__main">
        <div class="event-edit__nav">
          <EditorNav
            :tabs="navTabs"
            :active-key="activeTab"
            :sections="navSections"
            :alert-keys="tabsWithIssues"
            :alert-label="$t('event.edit.overview.missing')"
            :aria-label="$t('event.edit.nav.tabs')"
            :sections-aria-label="$t('event.edit.nav.sections')"
            @go="(tab, section) => goTo({ tab, section })"
          />
        </div>

        <div class="event-edit__editor" ref="editor">
          <BaseSection
            :title="$t(activeTabConfig.labelKey)"
            :icon="activeTabConfig.icon"
          />
          <keep-alive>
            <component :is="activeTabConfig.comp" :key="activeTab" />
          </keep-alive>
        </div>

        <div v-if="$vuetify.breakpoint.lgAndUp" class="event-edit__overview">
          <EventEditOverview :issues="issues" :tabs="tabs" @go="goTo" />
        </div>
      </div>

      <!-- On „Veranstaltungsmanagement“ only while something is unsaved. -->
      <SaveBar
        v-if="!flowMode && (!managementShown || hasUnsavedChanges)"
        :anchor-el="$refs.contentCol"
        :scroll-root="scrollRoot"
        :active="hasUnsavedChanges"
        :in-progress="inProgress"
        show-restore
        @submit="save"
        @cancel="onRestoreChanges"
      />

      <UnsavedChangesDialog
        v-model="leaveDialogOpen"
        @stay="resolveLeaveConfirm(false)"
        @discard="resolveLeaveConfirm(true)"
      />
    </div>
  </AdminLayout>
</template>

<script>
import _ from "lodash";
import { mapActions, mapGetters } from "vuex";
import AdminLayout from "@/layouts/Admin.vue";
import BaseSection from "@/components/commons/BaseSection.vue";
import EditorNav from "@/components/commons/EditorNav.vue";
import FlowBar from "@/components/commons/FlowBar.vue";
import SaveBar from "@/components/commons/SaveBar.vue";
import UnsavedChangesDialog from "@/components/commons/UnsavedChangesDialog.vue";
import unsavedChangesGuard from "@/mixins/unsavedChangesGuard";
import ApiEventService from "@/services/api/ApiEventService";
import ApiReviewService from "@/services/api/ApiReviewService";
import ToastService from "@/services/ToastService";
import { OFFER_TYPES } from "@/utils/supervision";
import { eventIssues, normalizedSchedules } from "@/utils/eventEditing";
import EventEditPublication from "@/components/Events/Edit/EventEditPublication.vue";
import EventEditOverview from "@/components/Events/Edit/EventEditOverview.vue";
import EventFlow from "@/components/Events/Edit/EventFlow.vue";
import EventManagement from "@/components/Events/Manage/EventManagement.vue";
import { isFlowMode, withMode } from "@/utils/bookableFlow";
import { EVENT_EDIT_TABS } from "@/components/Events/Edit/eventEditTabs";

// The two views of a saved event, as the tabs above the editor offer them.
const EVENT_VIEWS = Object.freeze([
  {
    key: "details",
    icon: "mdi-pencil-outline",
    labelKey: "event.edit.views.details",
  },
  {
    key: "management",
    icon: "mdi-account-multiple-check-outline",
    labelKey: "event.edit.views.management",
  },
]);

/**
 * The editing page of an event, laid out as the bookable editor: tabs left,
 * cards in the middle, the overview right, the publication band above and
 * the save bar below. Its guided flow (`EventFlow`) is a mode of the same
 * page, as the bookable editor's: a new event (no `?id=`) starts in it,
 * `?mode=flow` opens an existing one there (`isFlowMode`).
 */
export default {
  name: "EventEdit",
  components: {
    AdminLayout,
    BaseSection,
    EditorNav,
    FlowBar,
    SaveBar,
    UnsavedChangesDialog,
    EventEditPublication,
    EventEditOverview,
    EventFlow,
    EventManagement,
  },
  mixins: [unsavedChangesGuard],
  provide() {
    return {
      eventEditIssues: this.issueState,
      // What a card may ask of the page: whether there is something unsaved,
      // and a save that stays on the page (the tab „Tickets“).
      eventEditPage: {
        isDirty: () => this.hasUnsavedChanges,
        saveAndStay: () => this.save({ stay: true }),
        // A value of the event as last loaded or saved, by its path.
        stored: (path) =>
          _.get(JSON.parse(this.originalSnapshot || "{}"), path),
      },
    };
  },
  data() {
    return {
      tabs: EVENT_EDIT_TABS,
      views: EVENT_VIEWS,
      isLoading: false,
      inProgress: false,
      originalSnapshot: null,
      allowPublic: true,
      scrollRoot: null,
      // A save of the guided flow that failed: its message above the footer.
      flowSaveFailed: false,
      // What the cards read (`eventEditing`): the issues, each shown at its
      // field.
      issueState: { list: [] },
    };
  },
  computed: {
    ...mapGetters({
      form: "events/form",
      review: "events/review",
      registrationMode: "events/registrationMode",
      locationRefusal: "events/locationRefusal",
      tenantId: "tenants/currentTenantId",
      supervisionLevel: "tenants/currentSupervisionLevel",
    }),
    eventId() {
      return this.$route.query.id || null;
    },
    flowMode() {
      return isFlowMode({
        bookableId: this.eventId,
        mode: this.$route.query.mode,
      });
    },
    /**
     * The view of a saved event: „Veranstaltungsdetails“ (the editor) or
     * „Veranstaltungsmanagement“, as `?view=management`.
     */
    activeView() {
      return this.eventId && this.$route.query.view === "management"
        ? "management"
        : "details";
    },
    viewIndex() {
      return this.views.findIndex((view) => view.key === this.activeView);
    },
    managementShown() {
      return (
        !this.flowMode && !this.isLoading && this.activeView === "management"
      );
    },
    pageTitle() {
      return this.$t(`event.edit.title.${this.eventId ? "edit" : "new"}`);
    },
    activeTab() {
      const tab = this.$route.query.tab;
      return this.tabs.some((t) => t.key === tab) ? tab : this.tabs[0].key;
    },
    activeIndex() {
      return this.tabs.findIndex((t) => t.key === this.activeTab);
    },
    /** The tabs and the sections of the open one, as the navigation shows them. */
    navTabs() {
      return this.tabs.map((t) => ({
        key: t.key,
        icon: t.icon,
        label: this.$t(t.labelKey),
      }));
    },
    navSections() {
      return this.activeTabConfig.sections.map((id) => ({
        id,
        label: this.$t(`event.edit.cards.${id}`),
      }));
    },
    activeTabConfig() {
      return this.tabs[this.activeIndex];
    },
    issues() {
      return eventIssues(this.form, {
        registration: this.registrationMode,
        locationRefusal: this.locationRefusal,
      });
    },
    tabsWithIssues() {
      return _.uniq(this.issues.map((issue) => issue.tab));
    },
    hasUnsavedChanges() {
      if (this.isLoading || !this.originalSnapshot) return false;
      return this.snapshot() !== this.originalSnapshot;
    },
  },
  watch: {
    issues: {
      immediate: true,
      handler(list) {
        this.issueState.list = list;
      },
    },
    eventId(id) {
      // A new event saved in place already holds its id: nothing to load.
      if (id && id === this.form.id) return;
      this.init();
    },
  },
  methods: {
    ...mapActions({
      clearForm: "events/clearForm",
      restoreFromApi: "events/restoreFromApi",
      updateForm: "events/updateForm",
      setReview: "events/setReview",
      locationSaved: "events/locationSaved",
      addToast: "toasts/add",
    }),
    snapshot() {
      return JSON.stringify(_.omit(this.form, ["review"]));
    },
    async init() {
      this.isLoading = true;
      try {
        if (this.eventId) {
          const response = await ApiEventService.getEvent(this.eventId);
          const payload = response.data;
          delete payload._id;
          this.restoreFromApi(payload);
        } else {
          this.clearForm();
          // The contact person is optional here: a new event starts without
          // one and adds it with „Kontaktperson hinzufügen“.
          this.updateForm({
            parent: "eventOrganizer",
            field: "addContactPerson",
            value: false,
          });
        }
      } finally {
        this.isLoading = false;
      }
      this.originalSnapshot = this.snapshot();
    },
    async checkPublicLimit() {
      try {
        this.allowPublic = Boolean(
          await ApiEventService.publicEventCountCheck()
        );
      } catch (error) {
        this.allowPublic = true;
      }
    },
    setView(index) {
      const view = this.views[index]?.key;
      if (!view || view === this.activeView) return;
      const query = { ...this.$route.query, view };
      if (view === "details") delete query.view;
      this.$router.replace({ query }).catch(() => {});
    },
    /**
     * Opens a tab of the details, and in it the field or section asked for.
     */
    goTo({ tab, field = null, section = null }) {
      if ((tab && tab !== this.activeTab) || this.activeView !== "details") {
        const query = { ...this.$route.query, tab: tab || this.activeTab };
        delete query.view;
        this.$router.replace({ query }).catch(() => {});
      }
      this.$nextTick(() => {
        if (field) this.revealField(field);
        else if (section) this.scrollToSection(section);
        else this.$refs.editor?.scrollIntoView({ block: "start" });
      });
    },
    scrollToSection(section) {
      document
        .getElementById(`event-section-${section}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    revealField(field) {
      const el = this.$refs.editor?.querySelector(`[data-field="${field}"]`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const input = el.matches("input, textarea")
        ? el
        : el.querySelector("input, textarea");
      input?.focus({ preventScroll: true });
    },
    /**
     * Saves the event; `true` once it is saved. A new event leaves for the
     * event list - with `stay`, as the tab „Tickets“ asks before a ticket, it
     * stays on the page with the id it got (`savedNewEventId`).
     */
    async save({ stay = false } = {}) {
      if (this.issues.length) {
        const [first] = this.issues;
        if (this.flowMode) this.$refs.flow?.openIssue(first);
        else this.goTo({ tab: first.tab, field: first.field });
        this.addToast(ToastService.createToast("event.edit.refused", "error"));
        return false;
      }
      this.inProgress = true;
      this.flowSaveFailed = false;
      const isNew = !this.form.id;
      const location = this.form.location;
      try {
        this.updateForm({
          field: "schedules",
          value: normalizedSchedules(this.form),
        });
        const before = isNew && stay ? await this.eventIds() : null;
        await ApiEventService.addEvent();
        if (isNew && stay) {
          const id = await this.savedNewEventId(before);
          if (id) {
            this.updateForm({ field: "id", value: id });
            this.locationSaved(location);
            await this.refreshReview();
            this.originalSnapshot = this.snapshot();
            this.addToast(
              ToastService.createToast("event.create.success", "success")
            );
            await this.$router
              .replace({
                query: withMode({ ...this.$route.query, id }, this.flowMode),
              })
              .catch(() => {});
            return true;
          }
        }
        if (isNew) {
          this.addToast(
            ToastService.createToast("event.create.success", "success")
          );
          this.allowNavigation = true;
          this.clearForm();
          await this.$router.push({ name: "events" });
          return false;
        }
        this.locationSaved(location);
        await this.refreshReview();
        this.originalSnapshot = this.snapshot();
        this.addToast(
          ToastService.createToast("event.update.success", "success")
        );
        // The flow of an existing event ends on its editing page, unless a
        // ticket waits for the save.
        if (this.flowMode && !stay) await this.leaveFlow();
        return true;
      } catch (error) {
        if (this.flowMode) this.flowSaveFailed = true;
        this.addToast(
          ToastService.createToast("errors.something-wrong", "error")
        );
        console.error(error);
        return false;
      } finally {
        this.inProgress = false;
      }
    },
    async eventIds() {
      const response = await ApiEventService.getEvents();
      return new Set((response.data || []).map((event) => event.id));
    },
    /**
     * The id of the event just created: the backend answers a creation
     * without a body, so it is the one with this name that was not there
     * before (`before`, the ids from just before the save).
     */
    async savedNewEventId(before) {
      try {
        const response = await ApiEventService.getEvents();
        const created = (response.data || []).filter(
          (event) =>
            !before.has(event.id) &&
            event.information?.name === this.form.information.name
        );
        return created.length === 1 ? created[0].id : null;
      } catch (error) {
        return null;
      }
    },
    /**
     * A save can move the review (the first publication wish submits the
     * event) but answers no body, so the status is read again. A failed read
     * leaves the save a success and the old status in place.
     */
    async refreshReview() {
      if (!this.form.id) return;
      try {
        this.setReview(
          await ApiReviewService.getReview(
            this.form.tenantId || this.tenantId,
            OFFER_TYPES.EVENT,
            this.form.id
          )
        );
      } catch (error) {
        // The status stays as shown until the event is loaded again.
      }
    },
    enterFlow() {
      this.$router.replace({ query: withMode(this.$route.query, true) });
    },
    /** Back to the editing page; what the flow changed stays unsaved. */
    leaveFlow() {
      return this.$router
        .replace({ query: withMode(this.$route.query, false) })
        .catch(() => {});
    },
    async onRestoreChanges() {
      if (await this.confirmDiscardChanges()) await this.init();
    },
    async copyId() {
      try {
        await navigator.clipboard.writeText(this.eventId);
        this.addToast(
          ToastService.createToast("bookable.copyId.success", "success")
        );
      } catch (error) {
        this.addToast(
          ToastService.createToast(
            "bookable.copyId.errors.something-wrong",
            "error"
          )
        );
      }
    },
  },
  created() {
    this.init();
    this.checkPublicLimit();
  },
  mounted() {
    this.scrollRoot = this.$el.closest(".admin-page__body--scroll");
  },
};
</script>

<style>
/* The fields of the cards (`components/Events/Edit`), as the bookable
   editor's Grunddaten lay them out. Unscoped, under the page's class. */
.event-edit .event-edit__field {
  margin-bottom: var(--scb-space-5);
}

.event-edit .event-edit__field:last-child {
  margin-bottom: 0;
}

.event-edit .event-edit__label {
  display: flex;
  align-items: baseline;
  gap: var(--scb-space-2);
  margin-bottom: var(--scb-space-2);
  font-size: var(--scb-font-size-sm);
  font-weight: var(--scb-font-weight-semibold);
  color: var(--scb-text);
}

.event-edit .event-edit__required {
  font-size: var(--scb-font-size-xs);
  font-weight: normal;
  color: var(--scb-text-muted);
}

.event-edit .event-edit__hint {
  margin-top: var(--scb-space-1);
  padding: 0 var(--scb-space-3);
  font-size: var(--scb-font-size-xs);
  line-height: var(--scb-line-height-base);
  color: var(--scb-text-muted);
}

.event-edit .event-edit__hint--top {
  margin: calc(-1 * var(--scb-space-1)) 0 var(--scb-space-2);
  padding: 0;
}

.event-edit .event-edit__error {
  margin-top: var(--scb-space-1);
  font-size: var(--scb-font-size-xs);
  color: var(--v-error-base);
}

.event-edit .event-edit__summary,
.event-edit .event-edit__note {
  display: flex;
  align-items: center;
  gap: var(--scb-space-2);
  margin: 0;
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text-muted);
}

.event-edit .event-edit__summary .v-icon,
.event-edit .event-edit__note .v-icon {
  color: inherit;
}

.event-edit .event-edit__choice {
  align-items: flex-start;
  margin-bottom: var(--scb-space-3) !important;
}
</style>

<style scoped>
.event-edit {
  display: flex;
  flex-direction: column;
}

.event-edit__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--scb-space-2) var(--scb-space-4);
  min-width: 0;
}

.event-edit__meta-info {
  display: flex;
  align-items: center;
  min-width: 0;
}

.event-edit__meta-actions {
  display: flex;
  align-items: center;
  gap: var(--scb-space-2);
}

.event-edit__meta-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-edit__id {
  display: inline-flex;
  align-items: center;
  padding: 2px var(--scb-space-1);
  border-radius: var(--scb-radius-control);
  cursor: pointer;
}

.event-edit__id:hover {
  background-color: var(--scb-hover-tint-strong);
}

.event-edit__views >>> .v-tab {
  text-transform: none;
  letter-spacing: normal;
  white-space: normal;
}

/* On a phone both tabs share the width, their words broken at the soft
   hyphen, instead of scrolling. */
@media (max-width: 599px) {
  .event-edit__views >>> .v-slide-group__prev,
  .event-edit__views >>> .v-slide-group__next {
    display: none;
  }

  .event-edit__views >>> .v-slide-group__content {
    flex: 1 1 auto;
    min-width: 0;
  }

  .event-edit__views >>> .v-tab {
    flex: 1 1 0;
    min-width: 0;
    padding: 0 var(--scb-space-2);
    line-height: var(--scb-line-height-tight);
  }
}

.event-edit__band {
  background-color: var(--scb-surface-raised) !important;
}

.event-edit__main {
  display: flex;
  align-items: flex-start;
  gap: var(--scb-gap-columns);
}

.event-edit__nav {
  flex: 0 0 auto;
  position: sticky;
  top: 0;
  max-height: calc(100vh - var(--scb-app-bar-height));
  overflow-x: hidden;
  overflow-y: auto;
}

.event-edit__editor {
  flex: 1 1 auto;
  min-width: 0;
  max-width: var(--scb-editor-width-max);
  padding-bottom: var(--scb-save-bar-clearance);
  scroll-margin-top: var(--scb-space-4);
}

.event-edit__manage {
  flex: 1 1 auto;
  min-width: 0;
  padding-bottom: var(--scb-save-bar-clearance);
}

.event-edit__overview {
  flex: 0 0 var(--scb-overview-width);
  max-width: var(--scb-overview-width-max);
  position: sticky;
  top: 0;
  max-height: calc(100vh - var(--scb-app-bar-height));
  overflow-x: hidden;
  overflow-y: auto;
}

@media (max-width: 959px) {
  .event-edit__main {
    flex-direction: column;
    align-items: stretch;
  }

  .event-edit__nav {
    position: static;
    max-height: none;
    overflow-y: hidden;
  }
}
</style>
