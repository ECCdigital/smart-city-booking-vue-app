<template>
  <v-dialog v-model="openDialog" persistent max-width="1400px" scrollable>
    <v-card>
      <v-card-title class="d-flex align-center">
        <span class="text-h5">E-Mail Vorlage bearbeiten</span>
        <v-chip
          x-small
          :color="mode === 'expert' ? 'warning' : 'success'"
          class="ml-3"
          text-color="white"
        >
          {{ mode === "expert" ? "Experten-Modus" : "Wizard" }}
        </v-chip>
        <v-spacer />
        <v-btn icon @click="closeDialog">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-subtitle>
        <div class="mt-2 info--text">
          <v-icon color="info" small>mdi-information-outline</v-icon>
          Das Layout-Template umschließt jede E-Mail mit Logo, Kopf- und Fußzeile.
        </div>
      </v-card-subtitle>
      <v-card-text>
        <v-tabs v-model="activeTab" background-color="transparent" class="mb-3">
          <v-tab :disabled="mode === 'expert' && !wizardConfirmed">
            <v-icon left small>mdi-palette-outline</v-icon>
            Wizard
          </v-tab>
          <v-tab>
            <v-icon left small>mdi-code-tags</v-icon>
            Experten (HTML)
          </v-tab>
        </v-tabs>

        <v-tabs-items v-model="activeTab">
          <v-tab-item :transition="false">
            <div v-if="mode === 'expert' && !wizardConfirmed">
              <v-alert type="warning" text>
                Dieses Template wurde im Experten-Modus bearbeitet. Du kannst
                jederzeit mit einer Wizard-Vorlage neu beginnen, dabei wird das
                vorhandene HTML ersetzt.
                <div class="mt-2">
                  <v-btn small color="primary" @click="startWithWizard">
                    <v-icon left small>mdi-restart</v-icon>
                    Mit Wizard-Vorlage neu starten
                  </v-btn>
                </div>
              </v-alert>
            </div>
            <ThemeWizardForm
              v-else
              :theme="theme"
              template-type="genericMailTemplate"
              @update="onThemeUpdate"
            />
          </v-tab-item>

          <v-tab-item :transition="false">
            <v-alert v-if="mode !== 'expert'" type="warning" text dense class="mb-2">
              Im Experten-Modus wird das Wizard-Modell überschrieben.
            </v-alert>
            <HTMLTemplateEditor
              v-model="expertHtml"
              :default-template="defaultTemplate"
              :variables="mailVariables"
              @input="onExpertEdit"
            />
          </v-tab-item>
        </v-tabs-items>
      </v-card-text>
      <v-card-actions class="border-top">
        <v-spacer />
        <v-btn outlined @click="closeDialog">abbrechen</v-btn>
        <v-btn color="primary" @click="onSave">Übernehmen</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import HTMLTemplateEditor from "@/components/HTMLTemplateEditor.vue";
import ThemeWizardForm from "@/components/Mail/ThemeWizard/ThemeWizardForm.vue";
import {
  renderThemeToHtml,
} from "@/components/Mail/ThemeWizard/render/renderThemeToHtml.js";
import {
  extractThemeMetadata,
  embedThemeMetadata,
} from "@/components/Mail/BlockEditor/render/parseMetadata.js";
import { getDefaultTheme } from "@/components/Mail/ThemeWizard/themeDefaults.js";
import { GENERIC_MAIL_VARIABLES } from "@/components/Mail/templateVariables.js";

export default {
  name: "MailTemplateDialog",
  components: { HTMLTemplateEditor, ThemeWizardForm },
  props: {
    open: { type: Boolean, required: true },
    mailTemplate: { type: String, default: "" },
  },
  data() {
    return {
      activeTab: 0,
      expertHtml: "",
      theme: getDefaultTheme("genericMailTemplate"),
      mode: "wizard",
      wizardConfirmed: false,
      mailVariables: GENERIC_MAIL_VARIABLES,
      defaultTemplate:
        "<!DOCTYPE html>\n<html lang=\"de\">\n  <head>\n    <style>\n      .content {\n        text-align: left;\n        background-color: white;\n        border: 1px solid grey;\n        padding: 10px 40px;\n        border-radius: 2px;\n        margin: auto;\n        max-width: 750px;\n      }\n\n      body {\n        align-content: center;\n      }\n\n      .layer {\n        text-align: center;\n      }\n    </style>\n    <meta charset=\"UTF-8\" />\n    <meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\" />\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n    <title>{{ title }}</title>\n  </head>\n\n  <body>\n    <div class=\"layer\">\n      <div class=\"content\">\n        <h1>{{ title }}</h1>\n        <p>{{{ content }}}</p>\n      </div>\n    </div>\n  </body>\n  <footer class=\"footer\"></footer>\n</html>",
    };
  },
  computed: {
    openDialog: {
      get() {
        return this.open;
      },
      set(v) {
        if (!v) this.$emit("close");
      },
    },
  },
  watch: {
    open(val) {
      if (val) this.loadFromTemplate();
    },
  },
  methods: {
    loadFromTemplate() {
      this.wizardConfirmed = false;
      const incoming = this.mailTemplate || "";
      if (!incoming) {
        this.theme = getDefaultTheme("genericMailTemplate");
        this.expertHtml = "";
        this.mode = "wizard";
        this.activeTab = 0;
        return;
      }
      const { theme, body } = extractThemeMetadata(incoming);
      if (theme) {
        this.theme = { ...getDefaultTheme("genericMailTemplate"), ...theme };
        this.expertHtml = body;
        this.mode = "wizard";
        this.activeTab = 0;
      } else {
        this.theme = getDefaultTheme("genericMailTemplate");
        this.expertHtml = incoming;
        this.mode = "expert";
        this.activeTab = 1;
      }
    },
    onThemeUpdate(theme) {
      this.theme = theme;
      this.mode = "wizard";
      this.expertHtml = renderThemeToHtml(theme, "genericMailTemplate");
    },
    onExpertEdit() {
      this.mode = "expert";
    },
    startWithWizard() {
      this.wizardConfirmed = true;
      this.mode = "wizard";
      this.theme = getDefaultTheme("genericMailTemplate");
      this.expertHtml = renderThemeToHtml(this.theme, "genericMailTemplate");
    },
    composeOutput() {
      if (this.mode === "wizard") {
        const html = renderThemeToHtml(this.theme, "genericMailTemplate");
        return embedThemeMetadata(this.theme, html);
      }
      return this.expertHtml;
    },
    closeDialog() {
      this.$emit("close");
    },
    onSave() {
      this.$emit("submit", this.composeOutput());
    },
  },
};
</script>

<style scoped>
.border-top {
  border-top: 1px solid #eee;
}
</style>
