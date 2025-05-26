<template>
  <v-card class="rounded-sm" elevation="0" v-if="editor">
    <v-sheet class="grey lighten-4 pa-2 d-flex">
      <v-btn
        small
        elevation="0"
        :class="{ primary: editor.isActive('bold') }"
        @click="editor.chain().focus().toggleBold().run()"
      >
        <v-icon>mdi-format-bold</v-icon>
      </v-btn>
      <v-btn
        small
        elevation="0"
        :class="{ primary: editor.isActive('italic') }"
        @click="editor.chain().focus().toggleItalic().run()"
      >
        <v-icon>mdi-format-italic</v-icon>
      </v-btn>
      <v-btn
        small
        elevation="0"
        :class="{ primary: editor.isActive('underline') }"
        @click="editor.chain().focus().toggleUnderline().run()"
      >
        <v-icon>mdi-format-underline</v-icon>
      </v-btn>
      <v-btn
        small
        elevation="0"
        :class="{ primary: editor.isActive('bulletList') }"
        @click="editor.chain().focus().toggleBulletList().run()"
      >
        <v-icon>mdi-format-list-bulleted</v-icon>
      </v-btn>
      <v-btn
        small
        elevation="0"
        :class="{ primary: editor.isActive('orderedList') }"
        @click="editor.chain().focus().toggleOrderedList().run()"
      >
        <v-icon>mdi-format-list-numbered</v-icon>
      </v-btn>
    </v-sheet>
    <editor-content
      :editor="editor"
      class="tiptap accent px-3 pb-1"
      ref="editor"
    />
  </v-card>
</template>

<script>
import Placeholder from "@tiptap/extension-placeholder";
import { Editor, EditorContent } from "@tiptap/vue-2";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import Underline from "@tiptap/extension-underline";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";

export default {
  components: {
    EditorContent,
  },

  props: {
    value: {
      type: String,
      default: null,
    },
    label: {
      type: String,
      default: "",
    },
  },

  data() {
    return {
      editor: null,
    };
  },

  watch: {
    value(value) {
      // HTML
      const isSame = this.editor.getHTML() === value;

      // JSON
      // const isSame = JSON.stringify(this.editor.getJSON()) === JSON.stringify(value)

      if (isSame) {
        return;
      }

      this.editor.commands.setContent(value, false);
    },
  },

  mounted() {
    this.editor = new Editor({
      content: this.value,
      extensions: [
        Document,
        Paragraph,
        Text,
        Bold,
        Italic,
        Underline,
        BulletList,
        OrderedList,
        ListItem,
        Placeholder.configure({
          placeholder: () => this.label,
        }),
      ],
      onUpdate: () => {
        // HTML
        this.$emit("input", this.editor.getHTML());

        // JSON
        // this.$emit('input', this.editor.getJSON())
      },
    });
  },

  beforeDestroy() {
    this.editor.destroy();
  },
};
</script>

<style>
.ProseMirror:focus {
  outline: none;
}

.label {
  font-size: smaller;
}

.tiptap p.is-editor-empty:first-child::before {
  color: #adb5bd;
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}

/* Auf jeder leeren Zeile */
.tiptap p.is-empty::before {
  color: #adb5bd;
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}
</style>
