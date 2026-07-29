<template>
  <div class="mail-theme-html-editor">
    <div v-if="label" class="text-caption grey--text text--darken-1 mb-1">
      {{ label }}
    </div>
    <v-card outlined class="rounded-sm" elevation="0" v-if="editor">
      <v-sheet class="toolbar grey lighten-4 pa-1 d-flex flex-wrap align-center">
        <v-menu offset-y bottom :close-on-content-click="true">
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              x-small
              elevation="0"
              class="toolbar-chip"
              title="Schriftgröße"
              v-bind="attrs"
              v-on="on"
            >
              {{ currentFontSizeLabel }}
              <v-icon x-small class="ml-1">mdi-menu-down</v-icon>
            </v-btn>
          </template>
          <v-list dense class="toolbar-menu">
            <v-list-item
              v-for="opt in fontSizeOptions"
              :key="'fs-' + opt.value"
              :class="{ 'primary--text': currentFontSize === opt.value }"
              @click="onFontSizeChange(opt.value)"
            >
              <v-list-item-title>{{ opt.text }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>

        <v-menu offset-y bottom :close-on-content-click="true">
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              x-small
              elevation="0"
              class="toolbar-chip"
              title="Zeilenhöhe"
              v-bind="attrs"
              v-on="on"
            >
              {{ currentLineHeightLabel }}
              <v-icon x-small class="ml-1">mdi-menu-down</v-icon>
            </v-btn>
          </template>
          <v-list dense class="toolbar-menu">
            <v-list-item
              v-for="opt in lineHeightOptions"
              :key="'lh-' + opt.value"
              :class="{ 'primary--text': currentLineHeight === opt.value }"
              @click="onLineHeightChange(opt.value)"
            >
              <v-list-item-title>{{ opt.text }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>

        <v-divider vertical class="toolbar-divider mx-1" />

        <v-btn
          x-small
          elevation="0"
          :class="{ 'primary white--text': editor.isActive('bold') }"
          @click="editor.chain().focus().toggleBold().run()"
        >
          <v-icon x-small>mdi-format-bold</v-icon>
        </v-btn>
        <v-btn
          x-small
          elevation="0"
          :class="{ 'primary white--text': editor.isActive('italic') }"
          @click="editor.chain().focus().toggleItalic().run()"
        >
          <v-icon x-small>mdi-format-italic</v-icon>
        </v-btn>
        <v-btn
          x-small
          elevation="0"
          :class="{ 'primary white--text': editor.isActive('underline') }"
          @click="editor.chain().focus().toggleUnderline().run()"
        >
          <v-icon x-small>mdi-format-underline</v-icon>
        </v-btn>
        <v-btn
          x-small
          elevation="0"
          :class="{ 'primary white--text': editor.isActive('bulletList') }"
          @click="editor.chain().focus().toggleBulletList().run()"
        >
          <v-icon x-small>mdi-format-list-bulleted</v-icon>
        </v-btn>
        <v-btn
          x-small
          elevation="0"
          :class="{ 'primary white--text': editor.isActive('orderedList') }"
          @click="editor.chain().focus().toggleOrderedList().run()"
        >
          <v-icon x-small>mdi-format-list-numbered</v-icon>
        </v-btn>
        <v-btn
          x-small
          elevation="0"
          :class="{ 'primary white--text': editor.isActive('link') }"
          title="Link einfügen"
          @click="onPromptLink"
        >
          <v-icon x-small>mdi-link</v-icon>
        </v-btn>
        <v-btn
          x-small
          elevation="0"
          title="Trennlinie einfügen"
          @click="editor.chain().focus().setHorizontalRule().run()"
        >
          <v-icon x-small>mdi-minus</v-icon>
        </v-btn>
        <v-btn
          x-small
          elevation="0"
          title="Bild per URL einfügen"
          @click="onPromptImage"
        >
          <v-icon x-small>mdi-image</v-icon>
        </v-btn>

        <template v-if="isImageSelected">
          <v-divider vertical class="toolbar-divider mx-1" />
          <v-menu offset-y bottom :close-on-content-click="true">
            <template v-slot:activator="{ on, attrs }">
              <v-btn
                x-small
                elevation="0"
                class="toolbar-chip"
                title="Bildbreite"
                v-bind="attrs"
                v-on="on"
              >
                {{ currentImageWidthLabel }}
                <v-icon x-small class="ml-1">mdi-menu-down</v-icon>
              </v-btn>
            </template>
            <v-list dense class="toolbar-menu">
              <v-list-item
                v-for="opt in imageWidthOptions"
                :key="'iw-' + opt.value"
                :class="{ 'primary--text': currentImageWidth === opt.value }"
                @click="onImageWidthChange(opt.value)"
              >
                <v-list-item-title>{{ opt.text }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
          <v-btn
            x-small
            elevation="0"
            class="toolbar-chip"
            title="Alternativtext (sichtbar wenn Bilder blockiert sind)"
            @click="onEditImageAlt"
          >
            Alt
          </v-btn>
        </template>
      </v-sheet>
      <editor-content
        :editor="editor"
        class="mail-theme-html-editor__content px-2 pb-1"
        :style="editorStyle"
      />
    </v-card>
  </div>
</template>

<script>
import Placeholder from "@tiptap/extension-placeholder";
import { Editor, EditorContent } from "@tiptap/vue-2";
import Document from "@tiptap/extension-document";
import Text from "@tiptap/extension-text";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import Underline from "@tiptap/extension-underline";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import Link from "@tiptap/extension-link";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import TextStyle from "@tiptap/extension-text-style";
import {
  FontSize,
  ParagraphWithLineHeight,
  ResizableImage,
} from "./mailThemeEditorExtensions.js";

function normalizeHtml(value) {
  if (value == null || value === "") return "";
  const trimmed = String(value).trim();
  if (!trimmed) return "";
  // Plain text from older themes: wrap so TipTap can edit it as a paragraph.
  if (!/<[a-z][\s\S]*>/i.test(trimmed)) {
    return `<p>${trimmed}</p>`;
  }
  return trimmed;
}

/**
 * TipTap serializes blank lines as empty <p></p>, which collapse in email
 * clients and the live preview. Keep a <br> so the line takes space.
 */
function ensureVisibleEmptyParagraphs(html) {
  if (!html) return html;
  return String(html).replace(
    /<p(\s[^>]*)?>\s*(?:<br\s*\/?>\s*)*<\/p>/gi,
    (match, attrs = "") => `<p${attrs}><br></p>`,
  );
}

const FONT_SIZE_OPTIONS = [
  { text: "Standard", value: "" },
  { text: "8 px", value: "8px" },
  { text: "9 px", value: "9px" },
  { text: "10 px", value: "10px" },
  { text: "11 px", value: "11px" },
  { text: "12 px", value: "12px" },
  { text: "13 px", value: "13px" },
  { text: "14 px", value: "14px" },
  { text: "15 px", value: "15px" },
  { text: "16 px", value: "16px" },
  { text: "18 px", value: "18px" },
  { text: "20 px", value: "20px" },
];

const LINE_HEIGHT_OPTIONS = [
  { text: "Standard", value: "" },
  { text: "0.8", value: "0.8" },
  { text: "0.85", value: "0.85" },
  { text: "0.9", value: "0.9" },
  { text: "0.95", value: "0.95" },
  { text: "1.0", value: "1" },
  { text: "1.1", value: "1.1" },
  { text: "1.2", value: "1.2" },
  { text: "1.25", value: "1.25" },
  { text: "1.3", value: "1.3" },
  { text: "1.35", value: "1.35" },
  { text: "1.4", value: "1.4" },
  { text: "1.45", value: "1.45" },
  { text: "1.5", value: "1.5" },
  { text: "1.6", value: "1.6" },
  { text: "1.7", value: "1.7" },
  { text: "1.8", value: "1.8" },
  { text: "2.0", value: "2" },
];

const IMAGE_WIDTH_OPTIONS = [
  { text: "Automatisch", value: "" },
  { text: "80 px", value: "80" },
  { text: "100 px", value: "100" },
  { text: "120 px", value: "120" },
  { text: "150 px", value: "150" },
  { text: "180 px", value: "180" },
  { text: "200 px", value: "200" },
  { text: "250 px", value: "250" },
  { text: "300 px", value: "300" },
  { text: "350 px", value: "350" },
  { text: "400 px", value: "400" },
  { text: "450 px", value: "450" },
  { text: "500 px", value: "500" },
  { text: "550 px", value: "550" },
  { text: "600 px", value: "600" },
];

export default {
  name: "MailThemeHtmlEditor",
  components: { EditorContent },
  props: {
    value: {
      type: String,
      default: "",
    },
    label: {
      type: String,
      default: "",
    },
    minHeight: {
      type: [String, Number],
      default: 88,
    },
  },
  data() {
    return {
      editor: null,
      selectionTick: 0,
      fontSizeOptions: FONT_SIZE_OPTIONS,
      lineHeightOptions: LINE_HEIGHT_OPTIONS,
      imageWidthOptions: IMAGE_WIDTH_OPTIONS,
    };
  },
  computed: {
    editorStyle() {
      if (this.minHeight == null || this.minHeight === "") return undefined;
      const value =
        typeof this.minHeight === "number"
          ? `${this.minHeight}px`
          : this.minHeight;
      return { minHeight: value };
    },
    currentFontSize() {
      // Depend on selectionTick so toolbar updates on caret moves.
      void this.selectionTick;
      if (!this.editor) return "";
      return this.editor.getAttributes("textStyle").fontSize || "";
    },
    currentLineHeight() {
      void this.selectionTick;
      if (!this.editor) return "";
      return this.editor.getAttributes("paragraph").lineHeight || "";
    },
    isImageSelected() {
      void this.selectionTick;
      return Boolean(this.editor && this.editor.isActive("image"));
    },
    currentImageWidth() {
      void this.selectionTick;
      if (!this.editor) return "";
      return this.editor.getAttributes("image").width || "";
    },
    currentFontSizeLabel() {
      const opt = this.fontSizeOptions.find(
        (item) => item.value === this.currentFontSize,
      );
      if (!opt || !opt.value) return "Aa";
      return opt.value.replace("px", "");
    },
    currentLineHeightLabel() {
      const opt = this.lineHeightOptions.find(
        (item) => item.value === this.currentLineHeight,
      );
      if (!opt || !opt.value) return "LH";
      return opt.value;
    },
    currentImageWidthLabel() {
      const opt = this.imageWidthOptions.find(
        (item) => item.value === this.currentImageWidth,
      );
      if (!opt || !opt.value) return "Auto";
      return `${opt.value}px`;
    },
  },
  watch: {
    value(value) {
      if (!this.editor) return;
      const next = normalizeHtml(value);
      const current = ensureVisibleEmptyParagraphs(this.editor.getHTML());
      const nextNormalized = ensureVisibleEmptyParagraphs(next || "");
      if (current === nextNormalized) return;
      if (
        !nextNormalized &&
        (current === "<p><br></p>" || current === "<p></p>" || current === "")
      ) {
        return;
      }
      this.editor.commands.setContent(next || "<p></p>", false);
    },
  },
  mounted() {
    this.editor = new Editor({
      content: normalizeHtml(this.value) || "<p></p>",
      extensions: [
        Document,
        ParagraphWithLineHeight,
        Text,
        TextStyle,
        FontSize,
        Bold,
        Italic,
        Underline,
        BulletList,
        OrderedList,
        ListItem,
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            target: "_blank",
            rel: "noopener",
          },
        }),
        ResizableImage.configure({
          inline: false,
          allowBase64: false,
        }),
        HorizontalRule,
        Placeholder.configure({
          placeholder: () => this.label || "Text eingeben…",
        }),
      ],
      onUpdate: () => {
        const html = ensureVisibleEmptyParagraphs(this.editor.getHTML());
        const empty = html === "<p><br></p>" || html === "<p></p>" || html === "";
        this.$emit("input", empty ? "" : html);
        this.selectionTick += 1;
      },
      onSelectionUpdate: () => {
        this.selectionTick += 1;
      },
    });
  },
  beforeDestroy() {
    if (this.editor) this.editor.destroy();
  },
  methods: {
    onFontSizeChange(value) {
      if (!this.editor) return;
      this.editor.chain().focus().setFontSize(value || null).run();
      this.selectionTick += 1;
    },
    onLineHeightChange(value) {
      if (!this.editor) return;
      this.editor
        .chain()
        .focus()
        .updateAttributes("paragraph", {
          lineHeight: value || null,
        })
        .run();
      this.selectionTick += 1;
    },
    onImageWidthChange(value) {
      if (!this.editor || !this.editor.isActive("image")) return;
      const width = value ? String(value) : null;
      this.editor.chain().focus().updateAttributes("image", { width }).run();
      this.selectionTick += 1;
    },
    onEditImageAlt() {
      if (!this.editor || !this.editor.isActive("image")) return;
      const previous = this.editor.getAttributes("image").alt || "Bild";
      const alt = window.prompt(
        "Alternativtext (wird angezeigt, wenn der Empfänger Bilder blockiert)",
        previous,
      );
      if (alt === null) return;
      const nextAlt = alt.trim() || "Bild";
      this.editor
        .chain()
        .focus()
        .updateAttributes("image", { alt: nextAlt, title: nextAlt })
        .run();
      this.selectionTick += 1;
    },
    onPromptLink() {
      const previous = this.editor.getAttributes("link").href || "https://";
      const url = window.prompt("Link-URL eingeben (https://…)", previous);
      if (url === null) return;
      if (url === "") {
        this.editor.chain().focus().extendMarkRange("link").unsetLink().run();
        return;
      }
      this.editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
    },
    onPromptImage() {
      const url = window.prompt("Bild-URL eingeben (https://…)", "https://");
      if (!url) return;
      if (!/^https:\/\//i.test(url.trim())) {
        window.alert("Bitte eine https://-URL angeben.");
        return;
      }
      const altRaw = window.prompt(
        "Alternativtext (sichtbar wenn Bilder blockiert sind)",
        "",
      );
      if (altRaw === null) return;
      const alt = altRaw.trim() || "Bild";
      const widthRaw = window.prompt(
        "Bildbreite in px (leer = automatisch)",
        "200",
      );
      if (widthRaw === null) return;
      const width = widthRaw.trim() ? widthRaw.trim().replace(/px$/i, "") : null;
      this.editor
        .chain()
        .focus()
        .setImage({
          src: url,
          alt,
          title: alt,
          width,
        })
        .run();
      this.selectionTick += 1;
    },
  },
};
</script>

<style scoped>
.mail-theme-html-editor {
  margin-top: 8px;
}
.toolbar {
  gap: 2px;
}
.mail-theme-html-editor >>> .v-btn {
  margin: 0;
  min-width: 28px;
  height: 28px;
}
.toolbar-chip {
  min-width: auto !important;
  padding: 0 6px !important;
  font-size: 11px !important;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
}
.toolbar-chip >>> .v-icon {
  margin-left: 0 !important;
}
.toolbar-divider {
  align-self: stretch;
  max-height: 22px;
  margin-top: 3px;
  margin-bottom: 3px;
}
.toolbar-menu {
  max-height: 280px;
  overflow-y: auto;
}
.mail-theme-html-editor__content {
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
}
.mail-theme-html-editor__content >>> .ProseMirror {
  outline: none;
  min-height: inherit;
}
.mail-theme-html-editor__content >>> .ProseMirror p {
  margin: 0 0 6px;
  min-height: 1.2em;
}
.mail-theme-html-editor__content >>> .ProseMirror img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 8px 0;
}
.mail-theme-html-editor__content >>> .ProseMirror img.ProseMirror-selectednode {
  outline: 2px solid var(--v-primary-base);
  outline-offset: 2px;
}
.mail-theme-html-editor__content >>> .ProseMirror hr {
  border: none;
  border-top: 1px solid #ccc;
  margin: 12px 0;
}
.mail-theme-html-editor__content
  >>> .ProseMirror
  p.is-editor-empty:first-child::before {
  color: #adb5bd;
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}
</style>
