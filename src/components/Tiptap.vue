<template>
  <v-card class="rounded-sm" elevation="0" v-if="editor">
    <!--
      The leiste of the Hero Editor lives in a 420 px column and reads as one
      grammar: a caption in a narrow first column, the control beside it, one
      property per row. A control that does not fit its row drops a line
      rather than running out of the editor.
    -->
    <v-sheet v-if="splitToolbar" class="grey lighten-4 pa-2 tiptap-toolbar">
      <div class="tiptap-toolbar__row">
        <span class="tiptap-toolbar__caption text-caption text--secondary">
          {{ $t("richtext.group.character") }}
        </span>
        <div class="tiptap-toolbar__controls">
          <div class="tiptap-toolbar__group">
            <v-btn
              v-for="button in characterButtons"
              :key="button.icon"
              small
              elevation="0"
              class="tiptap-toolbar__icon-btn"
              :class="{ primary: editor.isActive(button.mark) }"
              :title="button.title"
              :aria-label="button.title"
              :aria-pressed="String(editor.isActive(button.mark))"
              @click="button.run()"
            >
              <v-icon>{{ button.icon }}</v-icon>
            </v-btn>
          </div>
        </div>
      </div>
      <div v-if="sizes" class="tiptap-toolbar__row">
        <span class="tiptap-toolbar__caption text-caption text--secondary">
          {{ $t("richtext.size.label") }}
        </span>
        <div class="tiptap-toolbar__controls">
          <v-btn-toggle
            class="tiptap-size-scale"
            :value="activeSize"
            dense
            color="primary"
            @change="applySize"
          >
            <v-btn
              v-for="step in sizeSteps"
              :key="step.value"
              :value="step.value"
              small
              :title="step.title"
              :aria-label="step.title"
              :aria-pressed="String(activeSize === step.value)"
            >
              {{ step.label }}
            </v-btn>
          </v-btn-toggle>
        </div>
      </div>
      <div v-if="colors" class="tiptap-toolbar__row">
        <span class="tiptap-toolbar__caption text-caption text--secondary">
          {{ $t("richtext.color.label") }}
        </span>
        <div class="tiptap-toolbar__controls tiptap-color-dots">
          <v-btn
            v-for="dot in colorDots"
            :key="dot.value"
            icon
            small
            :title="dot.title"
            :aria-label="dot.title"
            :aria-pressed="String(dot.active)"
            @click="applyColor(dot.value)"
          >
            <span
              class="tiptap-color-dot"
              :class="{ 'tiptap-color-dot--active': dot.active }"
              :style="{ backgroundColor: dot.swatch }"
            >
              <v-icon v-if="!dot.swatch" x-small>
                mdi-format-color-text
              </v-icon>
            </span>
          </v-btn>
          <v-menu offset-y :close-on-content-click="false">
            <template #activator="{ on, attrs }">
              <v-btn
                icon
                small
                :title="$t('richtext.color.custom')"
                :aria-label="$t('richtext.color.custom')"
                v-bind="attrs"
                v-on="on"
              >
                <v-icon small>mdi-eyedropper-variant</v-icon>
              </v-btn>
            </template>
            <v-color-picker
              class="tiptap-color-picker"
              :value="pickerValue"
              mode="hexa"
              hide-mode-switch
              show-swatches
              swatches-max-height="200px"
              @input="pickColor"
            />
          </v-menu>
          <v-btn
            icon
            small
            :title="$t('richtext.color.inherit')"
            :aria-label="$t('richtext.color.inherit')"
            @click="applyColor(null)"
          >
            <v-icon small>mdi-format-color-marker-cancel</v-icon>
          </v-btn>
        </div>
      </div>
      <div class="tiptap-toolbar__row">
        <span class="tiptap-toolbar__caption text-caption text--secondary">
          {{ $t("richtext.group.paragraph") }}
        </span>
        <div class="tiptap-toolbar__controls">
          <v-btn-toggle
            v-if="paragraphAlign"
            class="tiptap-align-segment"
            :value="activeAlign"
            dense
            color="primary"
            @change="applyAlign"
          >
            <v-btn
              v-for="step in alignSteps"
              :key="step.value"
              :value="step.value"
              small
              :title="step.title"
              :aria-label="step.title"
              :aria-pressed="String(activeAlign === step.value)"
            >
              <v-icon small>{{ step.icon }}</v-icon>
            </v-btn>
          </v-btn-toggle>
          <div class="tiptap-toolbar__group">
            <v-btn
              v-for="button in listButtons"
              :key="button.icon"
              small
              elevation="0"
              class="tiptap-toolbar__icon-btn"
              :class="{ primary: editor.isActive(button.mark) }"
              :title="button.title"
              :aria-label="button.title"
              :aria-pressed="String(editor.isActive(button.mark))"
              @click="button.run()"
            >
              <v-icon>{{ button.icon }}</v-icon>
            </v-btn>
          </div>
        </div>
      </div>
    </v-sheet>
    <v-sheet v-else class="grey lighten-4 pa-2 d-flex">
      <v-btn
        v-for="button in legacyButtons"
        :key="button.icon"
        small
        elevation="0"
        :class="{ primary: editor.isActive(button.mark) }"
        :title="button.title"
        @click="button.run()"
      >
        <v-icon>{{ button.icon }}</v-icon>
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
import TextStyle from "@tiptap/extension-text-style";

import {
  HERO_COLOR_TOKENS,
  HERO_FIXED_TOKEN_COLORS,
  heroHexWithoutAlpha,
  isHeroHexColor,
} from "@/utils/heroBlockValidation";
import {
  HERO_ALIGN_TOKENS,
  HERO_SIZE_TOKENS,
  heroAlignClass,
  heroAlignOf,
  heroColorAttributes,
  heroColorOf,
  heroSizeClass,
  heroSizeOf,
} from "@/utils/heroRichtextClasses";

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

/**
 * The scale is visible, so every step shows its symbol; the German word of the
 * Block's own „Schriftgröße“ scale is the tooltip (hero layout spec §7).
 *
 * The inherited state - no class, the word follows the Block - has no button
 * of its own: it is the scale with nothing pressed, and a pressed step is
 * lifted by clicking it again.
 */
const SIZE_LABELS = Object.freeze({
  xs: "XS",
  sm: "S",
  md: "M",
  lg: "L",
  xl: "XL",
  "2xl": "2XL",
});

/** „Ausrichtung“ as the three icons every editor draws it with (spec §7). */
const ALIGN_ICONS = Object.freeze({
  left: "mdi-format-align-left",
  center: "mdi-format-align-center",
  right: "mdi-format-align-right",
});

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
    /** Enables the size scale and the `hero-size-*` class it writes. */
    sizes: {
      type: Boolean,
      default: false,
    },
    /** Enables the colour dots and the `hero-color-*` class they write. */
    colors: {
      type: Boolean,
      default: false,
    },
    /** Enables the alignment segment and `hero-align-*` on a paragraph. */
    paragraphAlign: {
      type: Boolean,
      default: false,
    },
    /** `branding.theme.colors`, so the two token dots show the real colours. */
    themeColors: {
      type: Object,
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
    /**
     * Size and colour are one mark, so it loads as soon as either control is
     * asked for: an editor offering sizes alone still has to keep a stored
     * colour instead of dropping it on load.
     */
    inlineFormats() {
      return this.sizes || this.colors;
    },
    /**
     * With any of the three new controls the leiste becomes the captioned
     * rows „Zeichen“, „Schriftgröße“, „Farbe“ and „Absatz“, each present when
     * its prop is; without them it is the one row the four existing users
     * have always had (hero layout spec §7).
     */
    splitToolbar() {
      return this.sizes || this.colors || this.paragraphAlign;
    },
    /** The mark buttons, by name, so each row can pick the ones it carries. */
    toolbarButtons() {
      const chain = () => this.editor.chain().focus();

      return {
        bold: {
          icon: "mdi-format-bold",
          mark: "bold",
          run: () => chain().toggleBold().run(),
        },
        italic: {
          icon: "mdi-format-italic",
          mark: "italic",
          run: () => chain().toggleItalic().run(),
        },
        underline: {
          icon: "mdi-format-underline",
          mark: "underline",
          run: () => chain().toggleUnderline().run(),
        },
        bulletList: {
          icon: "mdi-format-list-bulleted",
          mark: "bulletList",
          run: () => chain().toggleBulletList().run(),
        },
        orderedList: {
          icon: "mdi-format-list-numbered",
          mark: "orderedList",
          run: () => chain().toggleOrderedList().run(),
        },
        link: {
          icon: "mdi-link",
          mark: "link",
          title: this.$t("richtext.link.button"),
          run: () => this.openLinkDialog(),
        },
      };
    },
    /** Today's single row: the five marks, then the link button. */
    legacyButtons() {
      const buttons = this.toolbarButtons;

      return [
        buttons.bold,
        buttons.italic,
        buttons.underline,
        buttons.bulletList,
        buttons.orderedList,
        ...(this.links ? [buttons.link] : []),
      ];
    },
    characterButtons() {
      const buttons = this.toolbarButtons;

      return [
        buttons.bold,
        buttons.italic,
        buttons.underline,
        ...(this.links ? [buttons.link] : []),
      ];
    },
    listButtons() {
      const buttons = this.toolbarButtons;

      return [buttons.bulletList, buttons.orderedList];
    },
    sizeSteps() {
      return HERO_SIZE_TOKENS.map((token) => ({
        value: token,
        label: SIZE_LABELS[token],
        title: this.$t(`richtext.size.${token}`),
      }));
    },
    /** The step under the caret, or `null` while the words follow the Block. */
    activeSize() {
      return this.editor.getAttributes("textStyle").heroSize || null;
    },
    alignSteps() {
      return HERO_ALIGN_TOKENS.map((token) => ({
        value: token,
        icon: ALIGN_ICONS[token],
        title: this.$t(`richtext.align.${token}`),
      }));
    },
    /** The paragraph's alignment, or `null` while it follows the Block. */
    activeAlign() {
      return this.editor.getAttributes("paragraph").heroAlign || null;
    },
    activeColor() {
      return this.editor.getAttributes("textStyle").heroColor || null;
    },
    colorDots() {
      return HERO_COLOR_TOKENS.map((token) => ({
        value: token,
        title: this.$t(`richtext.color.${token}`),
        active: this.activeColor === token,
        swatch: this.swatchOf(token),
      }));
    },
    /** What „Eigene Farbe…“ opens on: the current custom colour, or black. */
    pickerValue() {
      return isHeroHexColor(this.activeColor) ? this.activeColor : "#000000";
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
        this.paragraphAlign ? this.alignedParagraph() : Paragraph,
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
        ...(this.inlineFormats ? [this.inlineFormatExtension()] : []),
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
    /**
     * „Ausrichtung“ as an attribute of the paragraph itself, written as a
     * class rather than as the `style` the stock text-align extension emits -
     * the allowlist has no `style` (hero layout spec §7).
     */
    alignedParagraph() {
      return Paragraph.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            heroAlign: {
              default: null,
              parseHTML: (element) => heroAlignOf(element),
              renderHTML: (attributes) =>
                attributes.heroAlign
                  ? { class: heroAlignClass(attributes.heroAlign) }
                  : {},
            },
          };
        },
      });
    },
    /**
     * Size and colour in one mark, so a marked run of words is a single
     * `<span>` (hero layout spec §7). The stock `TextStyle` parse rule takes
     * spans with a `style` only, which the contract has none of; this one
     * takes the vocabulary instead, and a `<span>` carrying nothing of it is
     * no mark at all - it is unwrapped and its text stays.
     *
     * This is a normaliser for what an author sees after loading, not a
     * boundary: the boundary is the sanitiser on save and on render.
     */
    inlineFormatExtension() {
      return TextStyle.extend({
        addAttributes() {
          return {
            heroSize: {
              default: null,
              parseHTML: (element) => heroSizeOf(element),
              renderHTML: (attributes) =>
                attributes.heroSize
                  ? { class: heroSizeClass(attributes.heroSize) }
                  : {},
            },
            heroColor: {
              default: null,
              parseHTML: (element) => heroColorOf(element),
              renderHTML: (attributes) =>
                attributes.heroColor
                  ? heroColorAttributes(attributes.heroColor)
                  : {},
            },
          };
        },
        parseHTML() {
          return [
            {
              tag: "span",
              getAttrs: (element) =>
                heroSizeOf(element) || heroColorOf(element) ? {} : false,
            },
          ];
        },
      });
    },
    /**
     * Size and colour share one mark, so a step is written with `setMark`,
     * which merges the attributes instead of replacing them - picking a size
     * leaves the colour of the same words alone. A mark left with nothing in
     * it is no mark: `removeEmptyTextStyle` takes the `<span>` away rather
     * than leaving an empty one behind.
     */
    setInlineFormat(attributes) {
      this.editor
        .chain()
        .focus()
        .setMark("textStyle", attributes)
        .removeEmptyTextStyle()
        .run();
    },
    /**
     * The toggle hands over `undefined` when the pressed step is clicked
     * again - the author lifting the class, so the words follow the Block.
     */
    applySize(value) {
      this.setInlineFormat({ heroSize: value || null });
    },
    applyAlign(value) {
      this.editor
        .chain()
        .focus()
        .updateAttributes("paragraph", { heroAlign: value || null })
        .run();
    },
    applyColor(value) {
      this.setInlineFormat({ heroColor: value });
    },
    /**
     * Opening the picker writes nothing - a menu the author closes again must
     * leave the text as it was; the first pick is the change.
     */
    pickColor(picked) {
      this.applyColor(heroHexWithoutAlpha(picked).toLowerCase());
    },
    /**
     * „Standard“ has no colour of its own to show - it is whatever the Block
     * says - so its dot carries the letter icon instead of a swatch. The two
     * branded tokens come out of the instance's own colours; the fixed ones are
     * the same pair the Block's colour field paints.
     */
    swatchOf(token) {
      return (
        HERO_FIXED_TOKEN_COLORS[token] ||
        (this.themeColors || {})[token] ||
        null
      );
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

/* The captioned leiste: one caption column, wide enough for „Schriftgröße“,
   and a wrapping controls column, so the six-step scale and the colour dots
   fit a 420 px form column by dropping a line instead of running out of the
   editor. `HeroBlockForm.vue` draws its text Block's rows on the same grid. */
.tiptap-toolbar__row {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  column-gap: 8px;
  align-items: start;
}

.tiptap-toolbar__row + .tiptap-toolbar__row {
  margin-top: 8px;
}

.tiptap-toolbar__caption {
  padding-top: 6px;
  line-height: 1.2;
}

.tiptap-toolbar__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  min-width: 0;
}

.tiptap-toolbar__group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
}

/* Every button of the leiste is a small square or a short word: Vuetify's
   50 px minimum is a text button's, not a leiste's. */
.tiptap-toolbar .v-btn.v-btn.v-size--small {
  min-width: 32px;
  height: 28px;
  padding: 0 8px;
  letter-spacing: 0;
}

.tiptap-toolbar .tiptap-toolbar__icon-btn.v-btn.v-size--small {
  width: 32px;
  padding: 0;
}

.tiptap-toolbar .v-btn-toggle {
  flex-wrap: wrap;
}

.tiptap-toolbar .v-btn-toggle .v-btn.v-btn.v-size--small {
  padding: 0 7px;
  font-size: 12px;
}

.tiptap-color-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.25);
}

/* „Weiß“ on a light leiste is a white dot on white - the ring is what makes
   it visible, and on a dark one it has to be the light ring. */
.theme--dark .tiptap-color-dot {
  border-color: rgba(255, 255, 255, 0.35);
}

.tiptap-color-dot--active {
  box-shadow: 0 0 0 2px var(--v-primary-base);
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
