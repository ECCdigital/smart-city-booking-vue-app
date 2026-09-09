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
      <v-btn
        v-if="links"
        small
        elevation="0"
        :class="{ primary: editor.isActive('link') }"
        :title="$t('richtext.link.button')"
        @click="openLinkDialog"
      >
        <v-icon>mdi-link</v-icon>
      </v-btn>
    </v-sheet>
    <editor-content
      :editor="editor"
      class="tiptap accent px-3 pb-1"
      :style="editorStyle"
      ref="editor"
    />
    <div
      v-if="hasMaxLength"
      class="tiptap-counter text-caption text-right px-3 pb-1"
      :class="{ 'error--text': overMaxLength }"
    >
      {{ htmlLength }} / {{ maxLength }}
    </div>
    <v-dialog v-if="links" v-model="linkDialog" max-width="480">
      <v-card class="tiptap-link-dialog">
        <v-card-title>{{ $t("richtext.link.title") }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="linkAddress"
            :label="$t('richtext.link.address')"
            :hint="$t('richtext.link.hint')"
            :error-messages="linkError ? [linkError] : []"
            filled
            dense
            autofocus
            background-color="accent"
            placeholder="https://"
            @input="linkError = null"
            @keydown.enter.prevent="applyLink"
          />
        </v-card-text>
        <v-card-actions>
          <v-btn v-if="linkActive" text @click="removeLink">
            {{ $t("richtext.link.remove") }}
          </v-btn>
          <v-spacer />
          <v-btn text @click="linkDialog = false">
            {{ $t("richtext.link.cancel") }}
          </v-btn>
          <v-btn color="primary" elevation="0" @click="applyLink">
            {{ $t("richtext.link.apply") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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
import Link from "@tiptap/extension-link";

/**
 * Mirrors the rich-text allowlist the backend and storefront sanitise with
 * (`ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i`). Relative addresses are
 * refused on purpose; whitespace an author may paste around the address is
 * ignored the way DOMPurify ignores it.
 */
const ALLOWED_LINK_SCHEME = /^(?:https?|mailto):/i;
const ATTR_WHITESPACE =
  /[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g; // eslint-disable-line no-control-regex

function isAllowedLinkAddress(address) {
  if (typeof address !== "string") return false;
  return ALLOWED_LINK_SCHEME.test(address.replace(ATTR_WHITESPACE, ""));
}

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
    minHeight: {
      type: [String, Number],
      default: null,
    },
    /** Enables the link toolbar button, the URL dialog and autolinking. */
    links: {
      type: Boolean,
      default: false,
    },
    /** Shows a counter of the HTML length; the value is never truncated. */
    maxLength: {
      type: Number,
      default: null,
    },
  },

  data() {
    return {
      editor: null,
      htmlLength: 0,
      linkDialog: false,
      linkAddress: "",
      linkError: null,
      linkActive: false,
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
    hasMaxLength() {
      return typeof this.maxLength === "number" && this.maxLength > 0;
    },
    overMaxLength() {
      return this.hasMaxLength && this.htmlLength > this.maxLength;
    },
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
      this.syncHtmlLength();
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
        ...(this.links ? [this.linkExtension()] : []),
      ],
      onUpdate: () => {
        // HTML
        this.$emit("input", this.editor.getHTML());
        this.syncHtmlLength();

        // JSON
        // this.$emit('input', this.editor.getJSON())
      },
    });
    this.syncHtmlLength();
  },

  beforeDestroy() {
    this.editor.destroy();
  },

  methods: {
    syncHtmlLength() {
      this.htmlLength = this.editor.getHTML().length;
    },
    /**
     * Every link, whether set here or stored, leaves the portal in a new tab
     * with `rel="noopener noreferrer"`. A mail address gets no target - in a
     * new tab it would only leave a blank page behind.
     */
    linkExtension() {
      return Link.extend({
        addAttributes() {
          return {
            ...this.parent(),
            target: {
              default: "_blank",
              renderHTML: (attributes) => ({
                target: /^mailto:/i.test(attributes.href || "")
                  ? null
                  : attributes.target,
              }),
            },
          };
        },
      }).configure({
        openOnClick: false,
        autolink: true,
        isAllowedUri: (address) => isAllowedLinkAddress(address),
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
        },
      });
    },
    openLinkDialog() {
      this.linkActive = this.editor.isActive("link");
      this.linkAddress = this.editor.getAttributes("link").href || "";
      this.linkError = null;
      this.linkDialog = true;
    },
    applyLink() {
      const address = this.linkAddress.trim();
      if (!isAllowedLinkAddress(address)) {
        this.linkError = this.$t("richtext.link.invalid");
        return;
      }
      const attributes = { href: address };
      const { empty } = this.editor.state.selection;
      if (empty && !this.linkActive) {
        // Nothing selected: the address itself becomes the linked text.
        this.editor
          .chain()
          .focus()
          .insertContent({
            type: "text",
            text: address,
            marks: [{ type: "link", attrs: attributes }],
          })
          .run();
      } else {
        this.editor
          .chain()
          .focus()
          .extendMarkRange("link")
          .setLink(attributes)
          .run();
      }
      this.linkDialog = false;
    },
    removeLink() {
      this.editor.chain().focus().extendMarkRange("link").unsetLink().run();
      this.linkDialog = false;
    },
  },
};
</script>

<style>
.ProseMirror:focus {
  outline: none;
}

.tiptap .ProseMirror {
  min-height: inherit;
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
