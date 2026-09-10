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
        <v-btn-toggle v-model="locale" mandatory dense class="mr-4">
          <v-btn small value="de">Deutsch</v-btn>
          <v-btn small value="en">English</v-btn>
        </v-btn-toggle>
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
            </SubSection>

            <!-- „Blöcke“ arrives with the block list, „Hintergrund“ with the
                 Background section. -->
            <SubSection class="mt-6" title="Blöcke" icon="mdi-view-dashboard" />
            <SubSection
              class="mt-6"
              title="Hintergrund"
              icon="mdi-image-filter-hdr"
              description="Gilt auch für die Anmeldeseiten."
            />
          </div>

          <div class="hero-editor-preview-column">
            <SubSection title="Live-Vorschau" icon="mdi-monitor-eye" no-margin>
              <!-- The two preview frames arrive with the Live Preview. -->
              <v-sheet
                color="accent"
                rounded
                class="hero-editor-preview d-flex align-center justify-center text--secondary text-body-2"
              >
                Die Vorschau folgt.
              </v-sheet>
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
import HeroResetConformationDialog from "@/components/Instance/Edit/HeroResetConformationDialog.vue";
import UnsavedChangesDialog from "@/components/commons/UnsavedChangesDialog.vue";
import {
  heroDefaultPreviewPayload,
  heroDraftFromResponse,
  heroDraftSnapshot,
  heroLayoutSavePayload,
} from "@/utils/heroLayout";

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

const DEFAULT_STATUS = "Standard-Layout (folgt Portalname und Logo)";
const CUSTOM_STATUS = "Angepasst";

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
  components: { HeroResetConformationDialog, SubSection, UnsavedChangesDialog },
  props: {
    value: { type: Boolean, default: false },
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
    canSave() {
      return this.isDirty && !this.inProgress;
    },
    cancelLabel() {
      return this.isDirty ? "Abbrechen" : "Schließen";
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
  },
  beforeDestroy() {
    window.removeEventListener("beforeunload", this.onBeforeUnload);
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
      this.saving = true;
      try {
        const response = await ApiCatalogService.updateHeroLayout(
          heroLayoutSavePayload(this.draft)
        );
        // The save route answers without `isDefault`: what the layout is now
        // is what this save just sent.
        this.setDraft(
          heroDraftFromResponse(response.data, {
            isDefault: this.draft.isDefault,
          })
        );
        await this.addToast({
          message: "Kopfbereich gespeichert",
          type: "success",
        });
      } catch (e) {
        await this.toastError(e, "Kopfbereich konnte nicht gespeichert werden");
      } finally {
        this.saving = false;
      }
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
          heroLayout: (response.data || {}).heroLayout || null,
          isDefault: true,
        };
        this.resetDialogOpen = false;
      } catch (e) {
        await this.toastError(e, "Standard-Layout konnte nicht geladen werden");
      } finally {
        this.resetting = false;
      }
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

.hero-editor-preview {
  min-height: 320px;
}
</style>
