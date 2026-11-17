<template>
  <AdminLayout :title="pageTitle" scroll-body>
    <div class="event-edit" ref="contentCol">
      <v-progress-linear :active="isLoading" indeterminate color="primary" />

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

      <v-sheet class="mb-4 px-4 py-3 event-edit__band" rounded>
        <EventEditPublication
          :allow-public="allowPublic"
          :review="review"
          :supervision-level="supervisionLevel"
          :tenant-id="form.tenantId || tenantId"
          @update:review="setReview"
        />
      </v-sheet>

      <div v-if="!isLoading" class="event-edit__main">
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

      <SaveBar
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
import { EVENT_EDIT_TABS } from "@/components/Events/Edit/eventEditTabs";

/**
 * The editing page of an event, laid out as the bookable editor: tabs left, cards in the
 * middle, the overview right, the publication band above and the save bar
 * below. A new event (no `?id=`) starts empty on the same page.
 */
export default {
  name: "EventEdit",
  components: {
    AdminLayout,
    BaseSection,
    EditorNav,
    SaveBar,
    UnsavedChangesDialog,
    EventEditPublication,
    EventEditOverview,
  },
  mixins: [unsavedChangesGuard],
  provide() {
    return { eventEditIssues: this.issueState };
  },
  data() {
    return {
      tabs: EVENT_EDIT_TABS,
      isLoading: false,
      inProgress: false,
      originalSnapshot: null,
      allowPublic: true,
      scrollRoot: null,
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
    eventId() {
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
    /** Opens a tab, and in it the field or section asked for. */
    goTo({ tab, field = null, section = null }) {
      if (tab && tab !== this.activeTab) {
        this.$router
          .replace({ query: { ...this.$route.query, tab } })
          .catch(() => {});
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
    async save() {
      if (this.issues.length) {
        const [first] = this.issues;
        this.goTo({ tab: first.tab, field: first.field });
        this.addToast(ToastService.createToast("event.edit.refused", "error"));
        return;
      }
      this.inProgress = true;
      const isNew = !this.form.id;
      const location = this.form.location;
      try {
        this.updateForm({
          field: "schedules",
          value: normalizedSchedules(this.form),
        });
        await ApiEventService.addEvent();
        if (isNew) {
          this.addToast(
            ToastService.createToast("event.create.success", "success")
          );
          this.allowNavigation = true;
          this.clearForm();
          await this.$router.push({ name: "events" });
          return;
        }
        this.locationSaved(location);
        await this.refreshReview();
        this.originalSnapshot = this.snapshot();
        this.addToast(
          ToastService.createToast("event.update.success", "success")
        );
      } catch (error) {
        this.addToast(
          ToastService.createToast("errors.something-wrong", "error")
        );
        console.error(error);
      } finally {
        this.inProgress = false;
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
