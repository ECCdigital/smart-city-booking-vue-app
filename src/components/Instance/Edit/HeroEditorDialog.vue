<template>
  <v-dialog
    :value="value"
    fullscreen
    hide-overlay
    persistent
    no-click-animation
    transition="dialog-bottom-transition"
    @input="$emit('input', $event)"
  >
    <v-card tile>
      <v-toolbar flat>
        <v-toolbar-title>Kopfbereich</v-toolbar-title>
        <v-chip
          v-if="draft"
          class="ml-4"
          small
          label
          :color="draft.isDefault ? 'accent' : 'primary'"
          :text-color="draft.isDefault ? undefined : 'white'"
        >
          {{ statusLabel }}
        </v-chip>
        <v-spacer />
        <v-btn-toggle v-model="locale" mandatory dense class="mr-2">
          <v-btn small value="de">Deutsch</v-btn>
          <v-btn small value="en">English</v-btn>
        </v-btn-toggle>
        <v-chip
          v-if="untranslatedBlockIds.length > 0"
          class="mr-4 hero-editor__untranslated"
          small
          label
          outlined
          color="warning"
          title="Diese Blöcke werden auf der englischen Seite auf Deutsch angezeigt."
        >
          {{ untranslatedLabel }}
        </v-chip>
        <v-btn text :disabled="!draft || inProgress" @click="askForReset">
          Auf Standard zurücksetzen
        </v-btn>
        <v-btn text :disabled="inProgress" @click="requestClose">
          {{ cancelLabel }}
        </v-btn>
        <v-btn
          color="primary"
          class="ml-2"
          :disabled="!canSave"
          :loading="saving"
          @click="save"
        >
          Speichern
        </v-btn>
      </v-toolbar>

      <v-card-text class="hero-editor-body">
        <v-skeleton-loader
          v-if="loading"
          type="heading, list-item-three-line, image"
        />

        <div v-else-if="draft" class="hero-editor-columns">
          <div class="hero-editor-form">
            <!-- A path this editor has no place for still reaches the author:
                 dropping it would leave a refused save unexplained. There is
                 nothing to act on here, so it names the path — that is what a
                 support request needs. -->
            <v-alert
              v-if="unplacedErrorTexts.length > 0"
              type="error"
              text
              dense
              class="hero-editor__errors mb-4"
            >
              <div class="mb-1">
                Der Server hat Angaben abgelehnt, die dieser Editor keinem Feld
                zuordnen kann:
              </div>
              <div v-for="(message, index) in unplacedErrorTexts" :key="index">
                {{ message }}
              </div>
            </v-alert>

            <SubSection title="Höhe" icon="mdi-arrow-expand-vertical" no-margin>
              <v-select
                v-for="field in heightFields"
                :key="field.key"
                :value="height(field.key)"
                :items="heightSteps"
                :label="field.label"
                background-color="accent"
                filled
                dense
                @change="setHeight(field.key, $event)"
              />
              <div
                v-for="(message, index) in layoutErrorTexts"
                :key="index"
                class="error--text text-caption hero-editor__height-error"
              >
                {{ message }}
              </div>
            </SubSection>

            <SubSection class="mt-6" title="Blöcke" icon="mdi-view-dashboard">
              <HeroBlockList
                :blocks="blocks"
                :selected-block-id="selectedBlockId"
                @input="setBlocks"
                @update:selectedBlockId="selectedBlockId = $event"
              >
                <!-- A Block the backend would refuse says so and nothing
                     else: its warnings describe a render that is one Draft
                     behind, because an invalid Draft is never sent. -->
                <template #badge="{ block }">
                  <v-icon
                    v-if="refusalsOf(block).length > 0"
                    small
                    color="error"
                    class="hero-block-row__error"
                    :title="refusalsOf(block).join(' ')"
                  >
                    mdi-alert-circle
                  </v-icon>
                  <v-icon
                    v-else-if="warningsOf(block).length > 0"
                    small
                    color="warning"
                    class="hero-block-row__warning"
                    :title="warningsOf(block).join(' ')"
                  >
                    mdi-alert
                  </v-icon>
                </template>
              </HeroBlockList>
              <div
                v-for="(message, index) in blockSectionErrorTexts"
                :key="index"
                class="error--text text-caption hero-editor__block-error"
              >
                {{ message }}
              </div>
            </SubSection>

            <HeroBlockForm
              v-if="selectedBlock"
              class="mt-6"
              :block="selectedBlock"
              :blocks="blocks"
              :locale="locale"
              :theme-colors="themeColors"
              :errors="selectedBlockErrors"
              @input="patchSelectedBlock"
              @update:zone="moveSelectedBlock"
            />

            <!-- „Hintergrund“ brings its own SubSection, and with it the
                 spacing the sections above set by hand. -->
            <HeroBackgroundForm
              :value="draft.background"
              :errors="backgroundErrorTexts"
              @input="setBackground"
            />
          </div>

          <div class="hero-editor-preview-column">
            <SubSection title="Live-Vorschau" icon="mdi-monitor-eye" no-margin>
              <HeroLivePreview
                :portal-url="portalUrl"
                :locale="locale"
                :preview="preview"
                :selected-block-id="selectedBlockId"
                @report="onPreviewReport"
                @block-click="onPreviewBlockClick"
                @zone-click="onPreviewZoneClick"
              >
                <template #warnings="{ viewport }">
                  <span
                    v-if="warningSummaryOf(viewport)"
                    class="hero-preview-summary text-caption"
                    :class="
                      hasWarnings(viewport)
                        ? 'warning--text'
                        : 'text--secondary'
                    "
                    :data-viewport="viewport"
                  >
                    {{ warningSummaryOf(viewport) }}
                  </span>
                </template>
              </HeroLivePreview>
            </SubSection>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <UnsavedChangesDialog
      v-model="leaveDialogOpen"
      @stay="resolveLeave(false)"
      @discard="resolveLeave(true)"
    />

    <HeroResetConformationDialog
      v-model="resetDialogOpen"
      :in-progress="resetting"
      @cancel="resetDialogOpen = false"
      @confirm="resetToDefault"
    />
  </v-dialog>
</template>

<script>
import { mapActions } from "vuex";
import ApiCatalogService from "@/services/api/ApiCatalogService";
import { getApiErrorMessage } from "@/services/api/apiErrorMessage";
import SubSection from "@/components/commons/SubSection.vue";
import HeroBackgroundForm from "@/components/Instance/Edit/HeroBackgroundForm.vue";
import HeroBlockForm from "@/components/Instance/Edit/HeroBlockForm.vue";
import HeroBlockList from "@/components/Instance/Edit/HeroBlockList.vue";
import HeroLivePreview from "@/components/Instance/Edit/HeroLivePreview.vue";
import HeroResetConformationDialog from "@/components/Instance/Edit/HeroResetConformationDialog.vue";
import UnsavedChangesDialog from "@/components/commons/UnsavedChangesDialog.vue";
import { heroBackgroundIssues } from "@/utils/heroBackground";
import {
  HERO_ZONES,
  heroBlockLabel,
  heroUntranslatedBlockIds,
  setHeroBlockZone,
  updateHeroBlock,
} from "@/utils/heroBlocks";
import {
  HERO_ERROR_SECTIONS,
  heroErrorEntries,
  heroSectionErrorText,
  heroValidationDetails,
  isHeroErrorInLocale,
  isHeroInlineBlockError,
} from "@/utils/heroErrors";
import {
  heroBlockIssues,
  invalidHeroBlockIds,
} from "@/utils/heroBlockValidation";
import {
  heroDefaultPreviewPayload,
  heroDraftFromResponse,
  heroDraftSnapshot,
  heroLayoutSavePayload,
  heroPreviewPayload,
  normalizeHeroLayout,
} from "@/utils/heroLayout";
import {
  heroPreviewWarningCount,
  heroPreviewWarningSummary,
  heroPreviewWarningTexts,
  isCurrentHeroPreviewReport,
  noHeroPreviewReports,
} from "@/utils/heroPreviewReport";
import { createHeroPreviewResolver } from "@/utils/heroPreviewResolver";

// The four height steps of the Shared contract, in the wording of the spec.
const HEIGHT_STEPS = Object.freeze([
  { value: "sm", text: "Niedrig" },
  { value: "md", text: "Mittel" },
  { value: "lg", text: "Hoch" },
  { value: "xl", text: "Sehr hoch" },
]);

// The three heights, in the order the form asks for them.
const HEIGHT_FIELDS = Object.freeze([
  { key: "height", label: "Höhe auf der Startseite" },
  { key: "mobileHeight", label: "Höhe auf Mobilgeräten" },
  { key: "compactHeight", label: "Höhe auf Unterseiten" },
]);

/**
 * The id of the Block at one index of a sent body, or none — a detail about a
 * layout that was sent as `null` names no Block at all.
 *
 * @param {Array} blocks - The Blocks as the body carried them.
 * @param {?number} index - The index the detail's path named.
 * @returns {?string} The Block's id.
 */
function blockIdAt(blocks, index) {
  const block = index === null ? null : blocks[index];

  return block ? block.id : null;
}

const DEFAULT_STATUS = "Standard-Layout (folgt Portalname und Logo)";
const CUSTOM_STATUS = "Angepasst";

// What a refused save says. The body of a `ValidationError` carries
// `validation_failed` as its message, which is no sentence for an author — the
// fields themselves say what is wrong, and the toast points at them.
const SAVE_REFUSED_TOAST =
  "Kopfbereich nicht gespeichert — bitte die markierten Felder prüfen";

/**
 * The full-screen dialog the Portal tab opens for the Hero Editor.
 *
 * It has its own load/save cycle over the three hero-layout routes and never
 * touches the tab's global SaveBar; the tab refetches instance and catalog on
 * `closed`, so its status line is current afterwards. Concurrent editing is
 * last write wins — there is no locking.
 */
export default {
  name: "HeroEditorDialog",
  components: {
    HeroBackgroundForm,
    HeroBlockForm,
    HeroBlockList,
    HeroLivePreview,
    HeroResetConformationDialog,
    SubSection,
    UnsavedChangesDialog,
  },
  props: {
    value: { type: Boolean, default: false },
    /**
     * `instance.portalUrl`. The Live Preview builds the frames' address and
     * the origin it posts to from it; empty, the panel says so and the editor
     * goes on editing and saving (hero layout spec, acceptance 6).
     */
    portalUrl: { type: String, default: "" },
    /**
     * The instance's `branding.theme.colors`. The colour chips of a text Block
     * are painted with them, so „Primärfarbe“ shows what the portal shows.
     */
    themeColors: { type: Object, default: null },
  },
  data() {
    return {
      // The Draft, and what it looked like after the last load or save.
      draft: null,
      savedSnapshot: null,
      loading: false,
      saving: false,
      resetting: false,
      locale: "de",
      // Which Block the form and, from the Live Preview on, the frames show.
      // It is editor state: it travels with a Draft but is never saved.
      selectedBlockId: null,
      // The last Draft the preview route answered with a 200, in Theme Bundle
      // export form and carrying its `draftId`, plus whether the last
      // round-trip was refused.
      preview: null,
      previewRejected: false,
      // The fields the last round-trip refused, resolved to where the form
      // shows them and carrying the Block id they were about at the time. A
      // `400` of the preview route and one of the save land here alike; the
      // next accepted Draft clears them (hero layout spec §9).
      backendErrors: [],
      // The last Preview Report of each frame. Warnings are advice, so they
      // sit beside the Draft rather than in it and never reach a save.
      reports: noHeroPreviewReports(),
      leaveDialogOpen: false,
      leaveResolve: null,
      resetDialogOpen: false,
      heightSteps: HEIGHT_STEPS,
      heightFields: HEIGHT_FIELDS,
    };
  },
  computed: {
    /**
     * Whether saving would write anything. Both sides are read as the payload
     * they would send, so a Draft reset back to the stored default is clean
     * again.
     */
    isDirty() {
      if (!this.draft || this.savedSnapshot === null) {
        return false;
      }
      return heroDraftSnapshot(this.draft) !== this.savedSnapshot;
    },
    inProgress() {
      return this.loading || this.saving || this.resetting;
    },
    /**
     * A save is refused while a Block or the Background carries something the
     * backend would reject — the round-trip would only bring the same answer
     * back as a toast (hero layout spec §9).
     */
    canSave() {
      return (
        this.isDirty &&
        !this.inProgress &&
        this.invalidBlockIds.length === 0 &&
        this.backgroundIssues.length === 0 &&
        !this.previewRejected
      );
    },
    invalidBlockIds() {
      return invalidHeroBlockIds(this.blocks);
    },
    /** What the frames warned about, per Block id — the yellow badges. */
    previewWarnings() {
      return heroPreviewWarningTexts(this.reports, this.blocks);
    },
    /** Why the backend would refuse the Background; the section shows them. */
    backgroundIssues() {
      return heroBackgroundIssues(this.draft ? this.draft.background : null);
    },
    /** The Blocks the storefront would show in German on the English page. */
    untranslatedBlockIds() {
      return heroUntranslatedBlockIds(this.blocks);
    },
    untranslatedLabel() {
      return `${this.untranslatedBlockIds.length} ohne Übersetzung`;
    },
    /** What the backend refused, per Block id — the red badges. */
    blockErrors() {
      return this.backendErrors
        .filter((entry) => entry.blockId)
        .reduce((byId, entry) => {
          byId[entry.blockId] = [...(byId[entry.blockId] || []), entry];
          return byId;
        }, {});
    },
    /**
     * The messages the detail form puts under its own controls: the selected
     * Block's, narrowed to the locale on screen. A fault of the other locale
     * keeps its red badge on the row and appears when the toggle moves — the
     * field it belongs to is not the one being edited.
     */
    selectedBlockErrors() {
      return (this.blockErrors[this.selectedBlockId] || [])
        .filter(
          (entry) =>
            isHeroInlineBlockError(entry) &&
            isHeroErrorInLocale(entry, this.locale)
        )
        .reduce((byField, entry) => {
          byField[entry.field] = entry.message;
          return byField;
        }, {});
    },
    /** What „Höhe“ shows: the layout's own fields. */
    layoutErrorTexts() {
      return this.sectionErrorTexts(HERO_ERROR_SECTIONS.LAYOUT);
    },
    /** What „Hintergrund“ shows. */
    backgroundErrorTexts() {
      return this.sectionErrorTexts(HERO_ERROR_SECTIONS.BACKGROUND);
    },
    /**
     * What „Blöcke“ shows: the faults of the array itself, and the ones of a
     * Block that no control of the detail form can carry — an id, a type, a
     * key the schema does not know. They name their Block, because the row's
     * badge alone would not say what to fix.
     */
    blockSectionErrorTexts() {
      return this.backendErrors
        .filter(
          (entry) =>
            entry.section === HERO_ERROR_SECTIONS.BLOCKS &&
            !isHeroInlineBlockError(entry)
        )
        .map((entry) => this.namedBlockError(entry));
    },
    /** What no section claims — shown above the form rather than dropped. */
    unplacedErrorTexts() {
      return this.backendErrors
        .filter((entry) => entry.section === null)
        .map((entry) => this.unplacedErrorText(entry));
    },
    cancelLabel() {
      return this.isDirty ? "Abbrechen" : "Schließen";
    },
    blocks() {
      return this.draft && this.draft.heroLayout
        ? this.draft.heroLayout.blocks || []
        : [];
    },
    selectedBlock() {
      return (
        this.blocks.find((block) => block.id === this.selectedBlockId) || null
      );
    },
    statusLabel() {
      return this.draft && this.draft.isDefault
        ? DEFAULT_STATUS
        : CUSTOM_STATUS;
    },
  },
  watch: {
    value: {
      immediate: true,
      handler(open) {
        if (open) {
          this.load();
        }
      },
    },
    // The unload guard stands only while there is something to lose.
    isDirty(dirty) {
      if (dirty) {
        window.addEventListener("beforeunload", this.onBeforeUnload);
      } else {
        window.removeEventListener("beforeunload", this.onBeforeUnload);
      }
    },
    // Every change to the Draft, wherever it came from, goes to the frames the
    // same way: through the preview route.
    draft: {
      deep: true,
      handler() {
        this.queuePreview();
      },
    },
  },
  created() {
    this.previewResolver = createHeroPreviewResolver({
      resolve: ApiCatalogService.previewHeroLayout,
      onResolved: this.onPreviewResolved,
      onRejected: this.onPreviewRejected,
    });
  },
  beforeDestroy() {
    window.removeEventListener("beforeunload", this.onBeforeUnload);
    this.previewResolver.cancel();
    this.resolveLeave(false);
  },
  methods: {
    ...mapActions({ addToast: "toasts/add" }),
    /**
     * Reads the stored layout behind a skeleton. Without it there is nothing
     * to edit, so a failure closes the dialog again.
     */
    async load() {
      this.draft = null;
      this.savedSnapshot = null;
      this.locale = "de";
      this.selectedBlockId = null;
      this.forgetPreview();
      this.loading = true;
      try {
        const response = await ApiCatalogService.getHeroLayout();
        this.setDraft(heroDraftFromResponse(response.data));
      } catch (e) {
        await this.toastError(e, "Kopfbereich konnte nicht geladen werden");
        // Nothing was read, so nothing changed: the tab has no reason to
        // refetch and hears the dialog close without a `closed`.
        this.$emit("input", false);
      } finally {
        this.loading = false;
      }
    },
    async save() {
      // The body is held onto: a refusal names fields of what was sent, and
      // the Draft is still editable while the save is in flight.
      const payload = heroLayoutSavePayload(this.draft);

      this.saving = true;
      try {
        const response = await ApiCatalogService.updateHeroLayout(payload);
        // The save route answers without `isDefault`: what the layout is now
        // is what this save just sent.
        this.setDraft(
          heroDraftFromResponse(response.data, {
            isDefault: this.draft.isDefault,
          })
        );
        this.backendErrors = [];
        await this.addToast({
          message: "Kopfbereich gespeichert",
          type: "success",
        });
      } catch (e) {
        // A refused save keeps the dialog open with its fields marked, and the
        // toast only says that nothing was written: the body of a
        // `ValidationError` carries `validation_failed` as its message, which
        // is no sentence to put in front of an author (hero layout spec §9).
        if (this.takeBackendErrors(e, payload)) {
          await this.addToast({ message: SAVE_REFUSED_TOAST, type: "error" });
        } else {
          await this.toastError(
            e,
            "Kopfbereich konnte nicht gespeichert werden"
          );
        }
      } finally {
        this.saving = false;
      }
    },
    /**
     * Queues the Draft for the frames. A Draft the editor itself would refuse
     * is not sent: the round-trip would bring the same refusal back, so the
     * last valid preview stays standing while the author fixes the field
     * (hero layout spec §9).
     */
    queuePreview() {
      if (!this.draft) {
        return;
      }
      if (this.invalidBlockIds.length > 0 || this.backgroundIssues.length > 0) {
        this.previewResolver.cancel();
        return;
      }
      this.previewResolver.send(heroPreviewPayload(this.draft));
    },
    onPreviewResolved(data, draftId) {
      // The answer travels as it came; the message builder is the one place
      // that reads a resolved Draft into the protocol's shape.
      this.preview = { draftId, ...(data || {}) };
      this.previewRejected = false;
      this.backendErrors = [];
    },
    /**
     * A refusal leaves the last valid preview in the frames. Only a `400` is
     * the Draft's own fault and holds „Speichern“ back until a later `200` —
     * a route that is briefly unreachable is not a reason to stop the author
     * from saving. The fields the `400` names are the error mapping's.
     *
     * Anything else is unexpected and goes to the console rather than to a
     * toast: the round-trip runs on every keystroke, so a portal that is down
     * would otherwise bury the author in toasts it cannot act on.
     */
    onPreviewRejected(error, draftId, payload) {
      if (error && error.response && error.response.status === 400) {
        this.previewRejected = true;
        this.takeBackendErrors(error, payload);
        return;
      }
      console.error("Hero preview could not be resolved:", error);
    },
    /**
     * Reads a refusal into the form. A detail names a Block by its **index in
     * the body that was sent**, which is not the index it has now: the array
     * is rewritten in canonical order after every move, and the author goes on
     * editing while a round-trip is in flight. So the index is read against
     * that body and kept as a Block id, which survives both.
     *
     * @param {*} error - What a route rejected with.
     * @param {Object} payload - The body the answer is about.
     * @returns {boolean} Whether it was a `400` with fields to mark.
     */
    takeBackendErrors(error, payload) {
      const details = heroValidationDetails(error);

      if (!details) {
        return false;
      }

      const sent = ((payload || {}).heroLayout || {}).blocks || [];

      this.backendErrors = heroErrorEntries(details).map((entry) => ({
        ...entry,
        blockId: blockIdAt(sent, entry.blockIndex),
      }));

      return true;
    },
    /** The lines one section of the form shows. */
    sectionErrorTexts(section) {
      return this.backendErrors
        .filter((entry) => entry.section === section)
        .map((entry) => heroSectionErrorText(entry));
    },
    /**
     * A fault no section claims. Its path is all there is to say about it, and
     * a path is what makes it reportable.
     */
    unplacedErrorText(entry) {
      return `${entry.path}: ${entry.message}`;
    },
    /**
     * A Block's fault said away from its row: „Titel: Dieses Feld wird nicht
     * unterstützt.“ A fault of the Blocks array itself belongs to no Block and
     * stands on its own.
     */
    namedBlockError(entry) {
      const block = this.blocks.find(
        (candidate) => candidate.id === entry.blockId
      );
      const text = heroSectionErrorText(entry);

      return block ? `${heroBlockLabel(block)}: ${text}` : text;
    },
    forgetPreview() {
      this.previewResolver.cancel();
      this.preview = null;
      this.previewRejected = false;
      this.backendErrors = [];
      this.reports = noHeroPreviewReports();
    },
    /**
     * What the red badge on a row says: what the editor itself refuses, and
     * what the last round-trip refused. Both are reasons the save will not go
     * through, so they share one badge.
     */
    refusalsOf(block) {
      return [
        ...this.issuesOf(block),
        ...(this.blockErrors[block.id] || []).map((entry) =>
          heroSectionErrorText(entry)
        ),
      ];
    },
    /** What the yellow badge on a row says. */
    warningsOf(block) {
      return this.previewWarnings[block.id] || [];
    },
    /** The count beside a frame, empty until that frame has reported. */
    warningSummaryOf(viewport) {
      return heroPreviewWarningSummary(this.reports[viewport]);
    },
    /** Whether that count is something to look at, or a clean frame. */
    hasWarnings(viewport) {
      return heroPreviewWarningCount(this.reports[viewport]) > 0;
    },
    /**
     * A Preview Report. A frame renders on its own clock, so a report about a
     * Draft that has since been replaced is dropped — that frame is about to
     * send another one, and until it does the badges keep describing what is
     * actually on screen.
     *
     * A frame that could not read the Draft at all answers with an error
     * instead of warnings. The two sides disagree about the protocol then,
     * which is nothing the author can act on: it goes to the console, the
     * frame keeps its last valid render and the badges keep matching it.
     */
    onPreviewReport(message) {
      const draftId = this.preview ? this.preview.draftId : null;
      if (!isCurrentHeroPreviewReport(message, draftId)) {
        return;
      }
      if (message.error) {
        console.error("Hero preview rejected the Draft:", message.error);
        return;
      }

      this.reports[message.viewport] = message;
    },
    /**
     * A Block click in a frame. Selecting is all it does: the Draft travels
     * back down with the new selection on its own, which is what makes the
     * frame draw the highlight and that Block's Zone overlay.
     */
    onPreviewBlockClick(blockId) {
      if (this.blocks.some((block) => block.id === blockId)) {
        this.selectedBlockId = blockId;
      }
    },
    /**
     * A Zone click. The storefront reports the Zone and moves nothing itself;
     * the editor puts the selected Block at the end of that Zone’s stack, the
     * same move the Position grid and a drop into another group make. Its own
     * Zone is a no-op, so a stray click leaves both the array and the
     * „Angepasst“ chip untouched.
     */
    onPreviewZoneClick(zone) {
      const block = this.selectedBlock;
      if (!block || !HERO_ZONES.includes(zone) || block.zone === zone) {
        return;
      }

      this.moveSelectedBlock(zone);
    },
    askForReset() {
      this.resetDialogOpen = true;
    },
    /**
     * Shows the derived Default Hero Layout and marks the layout default
     * again, so the save that follows sends `heroLayout: null`. The preview
     * route writes nothing, so the reset is visible before it is saved. The
     * Background has its own reset and stays as it is.
     */
    async resetToDefault() {
      this.resetting = true;
      try {
        const response = await ApiCatalogService.previewHeroLayout(
          heroDefaultPreviewPayload(this.draft)
        );
        this.draft = {
          ...this.draft,
          heroLayout: normalizeHeroLayout((response.data || {}).heroLayout),
          isDefault: true,
        };
        // The derived default carries its own Blocks, so whatever was selected
        // is gone.
        this.selectedBlockId = null;
        this.resetDialogOpen = false;
      } catch (e) {
        await this.toastError(e, "Standard-Layout konnte nicht geladen werden");
      } finally {
        this.resetting = false;
      }
    },
    /**
     * The list answers with the array in canonical order — the editor stores
     * it as it comes and does not reorder it again.
     */
    setBlocks(blocks) {
      if (!this.draft || !this.draft.heroLayout) {
        return;
      }
      this.$set(this.draft.heroLayout, "blocks", blocks);
      this.markAsCustom();
    },
    /** What the badge on a row says, and why „Speichern“ is disabled. */
    issuesOf(block) {
      return heroBlockIssues(block);
    },
    /** The fields the detail form changed, on the selected Block. */
    patchSelectedBlock(patch) {
      this.setBlocks(updateHeroBlock(this.blocks, this.selectedBlockId, patch));
    },
    /**
     * The Position grid. A Block moves to the **end** of the target Zone's
     * stack, the same effect a Zone click in the Live Preview has.
     */
    moveSelectedBlock(zone) {
      this.setBlocks(setHeroBlockZone(this.blocks, this.selectedBlockId, zone));
    },
    /**
     * The Background travels with the layout but is not part of it: it is
     * instance-wide, the auth pages use the same object, and it never takes
     * the layout out of the default — the chip is about the layout alone
     * (hero layout spec §10).
     */
    setBackground(background) {
      this.draft = { ...this.draft, background };
    },
    height(field) {
      return this.draft && this.draft.heroLayout
        ? this.draft.heroLayout[field]
        : null;
    },
    setHeight(field, value) {
      if (!this.draft || !this.draft.heroLayout) {
        return;
      }
      this.$set(this.draft.heroLayout, field, value);
      this.markAsCustom();
    },
    /**
     * The first change to the layout takes it out of the default: from here on
     * it is stored as it stands and no longer follows Portalname and logo.
     */
    markAsCustom() {
      if (this.draft.isDefault) {
        this.draft = { ...this.draft, isDefault: false };
      }
    },
    /**
     * What went wrong, in the backend's words where it has any — a denial and
     * a conflict read better than „konnte nicht gespeichert werden“. A 400
     * from the save reaches the fields inline with the error mapping ticket.
     */
    toastError(error, fallback) {
      return this.addToast({
        message: getApiErrorMessage(error, fallback),
        type: "error",
      });
    },
    setDraft(draft) {
      this.draft = draft;
      this.savedSnapshot = heroDraftSnapshot(draft);
    },
    async requestClose() {
      if (this.isDirty && !(await this.confirmDiscard())) {
        return;
      }
      this.close();
    },
    confirmDiscard() {
      this.leaveDialogOpen = true;
      return new Promise((resolve) => {
        this.leaveResolve = resolve;
      });
    },
    resolveLeave(discard) {
      this.leaveDialogOpen = false;
      const resolve = this.leaveResolve;
      this.leaveResolve = null;
      if (resolve) {
        resolve(!!discard);
      }
    },
    onBeforeUnload(event) {
      if (!this.isDirty) {
        return;
      }
      event.preventDefault();
      event.returnValue = "";
    },
    close() {
      this.draft = null;
      this.savedSnapshot = null;
      this.selectedBlockId = null;
      this.forgetPreview();
      this.$emit("input", false);
      this.$emit("closed");
    },
  },
};
</script>

<style scoped>
/*
 * The form is a column of ~420 px beside the preview, each scrolling on its
 * own, so that a long block list never pushes the preview off screen
 * (hero layout spec, section 2). Below the md breakpoint the two stack and the
 * dialog scrolls as one.
 */
.hero-editor-body {
  padding-top: 16px;
}

.hero-editor-columns {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

@media (min-width: 960px) {
  .hero-editor-body {
    height: calc(100vh - 64px);
    overflow: hidden;
  }

  .hero-editor-columns {
    flex-direction: row;
    height: 100%;
  }

  .hero-editor-form {
    flex: 0 0 420px;
    overflow-y: auto;
  }

  .hero-editor-preview-column {
    flex: 1 1 auto;
    min-width: 0;
    overflow-y: auto;
  }
}
</style>
