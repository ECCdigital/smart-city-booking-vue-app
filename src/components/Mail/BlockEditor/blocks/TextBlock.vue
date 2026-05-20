<template>
  <div class="text-block" :class="{ selected }">
    <div v-if="editor" class="text-toolbar">
      <v-btn-toggle dense multiple background-color="transparent" class="mr-1">
        <v-btn
          x-small
          :class="{ 'primary white--text': editor.isActive('bold') }"
          @click.stop="editor.chain().focus().toggleBold().run()"
        >
          <v-icon x-small>mdi-format-bold</v-icon>
        </v-btn>
        <v-btn
          x-small
          :class="{ 'primary white--text': editor.isActive('italic') }"
          @click.stop="editor.chain().focus().toggleItalic().run()"
        >
          <v-icon x-small>mdi-format-italic</v-icon>
        </v-btn>
        <v-btn
          x-small
          :class="{ 'primary white--text': editor.isActive('underline') }"
          @click.stop="editor.chain().focus().toggleUnderline().run()"
        >
          <v-icon x-small>mdi-format-underline</v-icon>
        </v-btn>
        <v-btn
          x-small
          :class="{ 'primary white--text': editor.isActive('bulletList') }"
          @click.stop="editor.chain().focus().toggleBulletList().run()"
        >
          <v-icon x-small>mdi-format-list-bulleted</v-icon>
        </v-btn>
        <v-btn
          x-small
          :class="{ 'primary white--text': editor.isActive('orderedList') }"
          @click.stop="editor.chain().focus().toggleOrderedList().run()"
        >
          <v-icon x-small>mdi-format-list-numbered</v-icon>
        </v-btn>
      </v-btn-toggle>
      <v-btn x-small @click.stop="onPromptLink">
        <v-icon x-small>mdi-link</v-icon>
      </v-btn>
      <v-menu
        offset-y
        v-if="variables.length"
        content-class="variable-menu-content"
      >
        <template v-slot:activator="{ on, attrs }">
          <v-btn x-small v-bind="attrs" v-on="on" title="Variable einfügen">
            <v-icon x-small>mdi-code-tags</v-icon>
          </v-btn>
        </template>
        <v-list
          dense
          class="variable-menu"
          style="max-height: 320px; overflow-y: auto; background: #fff;"
        >
          <v-list-item
            v-for="v in variables"
            :key="v.name"
            @click="insertVariable(v)"
          >
            <v-list-item-content>
              <v-list-item-title>
                {{ v.label || v.name }}
              </v-list-item-title>
              <v-list-item-subtitle>
                <code class="variable-placeholder">{{ v.placeholder }}</code>
                <span v-if="v.description" class="ml-1 grey--text">
                  – {{ v.description }}
                </span>
              </v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-list>
      </v-menu>
    </div>
    <editor-content :editor="editor" class="text-block-content" />
  </div>
</template>

<script>
import { Editor, EditorContent } from "@tiptap/vue-2";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import Placeholder from "@tiptap/extension-placeholder";
import VariableMark from "@/components/Mail/BlockEditor/extensions/VariableMark.js";

export default {
  name: "TextBlock",
  components: { EditorContent },
  props: {
    block: { type: Object, required: true },
    variables: { type: Array, default: () => [] },
    selected: { type: Boolean, default: false },
  },
  data: () => ({ editor: null }),
  mounted() {
    this.editor = new Editor({
      content: this.block.html || "<p></p>",
      extensions: [
        Document,
        Paragraph,
        Text,
        Bold,
        Italic,
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            target: "_blank",
            rel: "noopener",
          },
        }),
        Underline,
        BulletList,
        OrderedList,
        ListItem,
        VariableMark,
        Placeholder.configure({ placeholder: "Text eingeben…" }),
      ],
      onUpdate: () => {
        this.$emit("update", { ...this.block, html: this.editor.getHTML() });
      },
    });
  },
  beforeDestroy() {
    if (this.editor) this.editor.destroy();
  },
  watch: {
    "block.html"(newVal) {
      if (!this.editor) return;
      if (this.editor.getHTML() === newVal) return;
      this.editor.commands.setContent(newVal || "<p></p>", false);
    },
  },
  methods: {
    insertVariable(v) {
      const placeholder = v.placeholder || "";
      // Einfache Variable: {{name}} oder {{{name}}} → als Chip einfügen.
      const simpleMatch = placeholder.match(/^\{\{\{?\s*([\w.]+)\s*\}?\}\}$/);
      if (simpleMatch) {
        const triple = placeholder.startsWith("{{{");
        this.editor.commands.insertMailVariable(v.name, {
          triple,
          label: v.label || v.name,
        });
        return;
      }
      // Komplexer Handlebars-Ausdruck (z. B. {{#if x}} … {{else}} … {{/if}})
      // → als reiner Text einfügen, damit der Inhalt innerhalb der Branches
      // editierbar bleibt. Explizit als text-Node, damit Tiptap nicht
      // versucht, den String als HTML zu parsen.
      this.editor
        .chain()
        .focus()
        .insertContent([
          { type: "text", text: placeholder },
          { type: "text", text: " " },
        ])
        .run();
    },
    onPromptLink() {
      const url = window.prompt("Link-URL eingeben (https://...)", "https://");
      if (!url) return;
      this.editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setMark("link", { href: url })
        .run();
    },
  },
};
</script>

<style scoped>
.text-block {
  padding: 6px;
  border-radius: 4px;
  background: white;
  min-width: 0;
  max-width: 100%;
  overflow-x: hidden;
}
.text-block.selected {
  outline: 2px solid var(--v-primary-base);
}
.text-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
  padding: 4px;
  background: #f5f5f5;
  border-radius: 4px;
  max-width: 100%;
}
.text-toolbar >>> .v-btn-toggle {
  flex-wrap: wrap;
}
.text-block-content {
  min-height: 24px;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
  overflow-wrap: anywhere;
}
.text-block-content >>> .ProseMirror {
  outline: none;
  padding: 4px;
  min-height: 24px;
}
.text-block-content >>> .ProseMirror p {
  margin: 0 0 6px;
}
.text-block-content >>> .mail-variable-chip {
  display: inline-flex;
  align-items: center;
  background: var(--v-primary-lighten4);
  color: var(--v-primary-darken2);
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-family: inherit;
  white-space: nowrap;
  vertical-align: baseline;
}
.text-block-content >>> .mail-variable-chip::after {
  content: "";
}
/* Wenn ein Label vorhanden ist, technischen {{name}}-Text ausblenden
   und stattdessen das menschenlesbare Label anzeigen. */
.text-block-content >>> .mail-variable-chip[data-label]:not([data-label=""]) {
  font-size: 0;
  letter-spacing: 0;
}
.text-block-content >>> .mail-variable-chip[data-label]:not([data-label=""])::before {
  content: attr(data-label);
  font-size: 12px;
  font-family: inherit;
  font-weight: 500;
}
.text-block-content >>> .ProseMirror p.is-editor-empty:first-child::before {
  color: #bbb;
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}
.variable-menu .variable-placeholder {
  font-family: "Courier New", monospace;
  font-size: 11px;
  background: #f5f5f5;
  padding: 1px 6px;
  border-radius: 3px;
  color: #c2185b;
}
.variable-menu {
  background: #fff !important;
  border-radius: 4px;
}
.variable-menu >>> .v-list-item {
  background: #fff;
}
</style>
