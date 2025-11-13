<template>
  <v-dialog v-model="openDialog" persistent max-width="1200px">
    <v-card>
      <v-card-title>
        <span class="text-h5">E-Mail Vorlage bearbeiten</span>
      </v-card-title>
      <v-card-subtitle>
        <div class="mt-6 text--info info--text">
          <v-icon color="info"> mdi-information-outline </v-icon>
          <span>
            Die Vorlage muss in einem validen HTML-Format geschrieben sein.
          </span>
        </div>
      </v-card-subtitle>
      <v-card-text>
        <HTMLTemplateEditor
          v-model="internalTemplate"
          :initial-template="mailTemplate"
          :default-template="defaultTemplate"
          :variables="mailVariables"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn outlined @click="closeDialog">abbrechen</v-btn>
        <v-btn color="primary" @click="onSave">Übernehmen</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import HTMLTemplateEditor from "@/components/HTMLTemplateEditor.vue";

export default {
  name: "MailTemplateDialog",
  components: { HTMLTemplateEditor },
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    mailTemplate: {
      type: String,
      default: "",
    },
  },
  data() {
    return {
      internalTemplate: "",
      mailVariables: [
        {
          name: "title",
          placeholder: "{{title}}",
          description: "Titel der Nachricht",
        },
        {
          name: "content",
          placeholder: "{{{content}}}",
          description: "Hauptinhalt der Nachricht",
        },
      ],
      defaultTemplate:
        '<!DOCTYPE html>\n<html lang="de">\n  <head>\n    <style>\n      .content {\n        text-align: left;\n        background-color: white;\n        border: 1px solid grey;\n        padding: 10px 40px;\n        border-radius: 2px;\n        margin: auto;\n        max-width: 750px;\n      }\n\n      body {\n        align-content: center;\n      }\n\n      .layer {\n        text-align: center;\n      }\n    </style>\n    <meta charset="UTF-8" />\n    <meta http-equiv="X-UA-Compatible" content="IE=edge" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>{{ title }}</title>\n  </head>\n\n  <body>\n    <div class="layer">\n      <div class="content">\n        <h1>{{ title }}</h1>\n        <p>{{{ content }}}</p>\n      </div>\n    </div>\n  </body>\n  <footer class="footer"></footer>\n</html>',
    };
  },
  computed: {
    openDialog: {
      get() {
        return this.open;
      },
    },
  },
  methods: {
    closeDialog() {
      this.$emit("close");
    },
    onSave() {
      this.$emit("submit", this.internalTemplate);
    },
  },
  watch: {
    open() {
      this.internalTemplate = this.mailTemplate;
    },
  },
};
</script>

<style scoped></style>
