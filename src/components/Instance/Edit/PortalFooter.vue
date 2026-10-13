<template>
  <SubSection
    class="mt-7"
    title="Fußbereich"
    icon="mdi-page-layout-footer"
    description="Logos in einer eigenen Zeile über dem Copyright, etwa Förderlogos. Klicken Sie ein Logo an, um es zu bearbeiten."
    no-margin
  >
    <v-btn-toggle v-model="mode" mandatory dense class="mb-2">
      <v-btn
        v-for="entry in modes"
        :key="entry.value"
        :value="entry.value"
        small
      >
        {{ entry.label }}
      </v-btn>
    </v-btn-toggle>
    <div
      class="portal-footer-mock"
      :class="`portal-footer-mock--${mode}`"
      :data-mode="mode"
    >
      <div class="portal-footer-mock__logos">
        <button
          v-for="(logo, index) in logos"
          :key="index"
          type="button"
          data-test="footer-logo"
          class="portal-footer-mock__logo"
          :class="{
            'portal-footer-mock__logo--plate': onPlate(logo),
            'portal-footer-mock__logo--selected': index === selected,
          }"
          :aria-pressed="String(index === selected)"
          :title="nameOf(logo.image)"
          @click="selected = index"
        >
          <MediaReferenceImage
            :reference="shownImage(logo)"
            :scope="mediaScope"
            size="sm"
            :lazy-size="null"
            :height="heightOf(logo)"
            :width="widthOf(logo)"
            contain
          />
        </button>
        <button
          type="button"
          data-test="footer-add"
          class="portal-footer-mock__add"
          :disabled="full"
          :title="full ? limitTitle : 'Logos aus der Mediathek hinzufügen'"
          @click="pickerOpen = true"
        >
          <v-icon small>mdi-plus</v-icon>
          Logo
        </button>
      </div>
      <div class="portal-footer-mock__bottom">
        <span>© {{ year }} {{ portalName || "Portal" }}</span>
        <span>Impressum · Datenschutz · Barrierefreiheit</span>
      </div>
    </div>
    <div class="text-caption text--secondary mt-1">
      Vorschau in 60 % der echten Größe. Dunkel steht ein Logo ohne Variante auf
      einer weißen Platte.
    </div>
    <div
      v-if="leftOut"
      data-test="footer-limit"
      class="text-caption warning--text mt-1"
    >
      {{ limitNotice }}
    </div>

    <v-card
      v-if="current"
      :key="selected"
      outlined
      class="pa-4 mt-3"
      data-test="footer-logo-fields"
    >
      <div class="d-flex align-center mb-3">
        <b class="text-body-2 text-truncate">{{ nameOf(current.image) }}</b>
        <v-spacer />
        <v-btn
          v-for="step in actions"
          :key="step.label"
          icon
          small
          :disabled="step.disabled"
          :title="step.label"
          :aria-label="step.label"
          @click="step.run"
        >
          <v-icon small>{{ step.icon }}</v-icon>
        </v-btn>
      </div>
      <div class="portal-footer-fields">
        <div>
          <div class="text-caption text--secondary mb-1">Größe</div>
          <v-btn-toggle
            :value="current.size"
            mandatory
            dense
            color="primary"
            @change="patchLogo({ size: $event })"
          >
            <v-btn
              v-for="step in sizes"
              :key="step.value"
              :value="step.value"
              :title="`${step.label} · ${step.px} px`"
              small
            >
              {{ step.label }}
            </v-btn>
          </v-btn-toggle>
        </div>
        <v-text-field
          ref="link"
          :value="current.link"
          label="Link (optional)"
          placeholder="https://…"
          hint="Öffnet in einem neuen Tab."
          background-color="accent"
          filled
          dense
          clearable
          :rules="[linkRule]"
          @input="patchLogo({ link: $event || '' })"
        />
        <MediaReferenceField
          :value="current.imageDark"
          :scope="mediaScope"
          label="Variante für den Dunkelmodus (optional)"
          public-only
          :public-only-reason="publicOnlyReason"
          :allow-external="false"
          empty-label="Ohne: weiße Platte im Dunkelmodus"
          @input="patchLogo({ imageDark: $event || null })"
        />
      </div>
    </v-card>

    <MediaPickerDialog
      v-model="pickerOpen"
      :scope="mediaScope"
      kind="image"
      multiple
      public-only
      :public-only-reason="publicOnlyReason"
      :allow-external="false"
      :exclude-ids="imageIds"
      title="Logos für den Fußbereich wählen"
      @select="addLogos"
    />
  </SubSection>
</template>

<script>
import SubSection from "@/components/commons/SubSection.vue";
import MediaPickerDialog from "@/components/Media/MediaPickerDialog.vue";
import MediaReferenceField from "@/components/Media/MediaReferenceField.vue";
import MediaReferenceImage from "@/components/Media/MediaReferenceImage.vue";
import { MEDIA_SCOPE } from "@/services/api/ApiMediaService";
import MediaResolveService from "@/services/MediaResolveService";
import { mediaReferenceOf, referencedMediaId } from "@/utils/mediaReference";

// The backend stores no more footer logos than this.
const MAX_FOOTER_LOGOS = 12;
const LIMIT_TITLE = `Höchstens ${MAX_FOOTER_LOGOS} Logos`;

// The footer logos are served to every visitor of the portal, so they may only
// ever point at public media — the backend refuses anything else on save.
const PUBLIC_ONLY_REASON =
  "Die Logos im Fußbereich werden öffentlich ausgeliefert — interne Medien sind hier nicht wählbar.";

// The heights of a footer logo in the storefront (map #510).
const FOOTER_LOGO_SIZES = Object.freeze([
  { value: "sm", label: "S", px: 48 },
  { value: "md", label: "M", px: 80 },
  { value: "lg", label: "L", px: 120 },
]);

// The mock shows the footer at this share of its real size.
const MOCK_SCALE = 0.6;

// A logo is as wide as its proportions say, up to this many times its height.
const MAX_LOGO_RATIO = 3.5;
// The proportions of a logo whose medium is not known (yet).
const FALLBACK_RATIO = 2;

const MODES = Object.freeze([
  { value: "light", label: "Hell" },
  { value: "dark", label: "Dunkel" },
]);

const LINK_MESSAGE =
  "Bitte eine vollständige Adresse mit http:// oder https:// angeben oder das Feld leeren.";

/**
 * Whether a footer link may be stored: empty, or an absolute http(s) address.
 * The backend refuses anything else, `javascript:` first of all.
 */
function isFooterLink(value) {
  if (!value) {
    return true;
  }
  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") && !!url.hostname
    );
  } catch {
    return false;
  }
}

/**
 * The section „Fußbereich“ of the Portal tab: the footer logos, put together
 * in a mock of the storefront's footer. It changes the branding only through
 * `patch` events with the top-level fields it changes.
 */
export default {
  name: "PortalFooter",
  components: {
    SubSection,
    MediaPickerDialog,
    MediaReferenceField,
    MediaReferenceImage,
  },
  props: {
    branding: { type: Object, required: true },
    // For the copyright line of the mock.
    portalName: { type: String, default: "" },
  },
  data() {
    return {
      mediaScope: MEDIA_SCOPE.INSTANCE,
      publicOnlyReason: PUBLIC_ONLY_REASON,
      mode: "light",
      modes: MODES,
      year: new Date().getFullYear(),
      pickerOpen: false,
      selected: -1,
      limitTitle: LIMIT_TITLE,
      // How many logos of the last pick did not fit under the limit.
      leftOut: 0,
      sizes: FOOTER_LOGO_SIZES,
      // The media behind the logos, for their names and proportions.
      mediaById: {},
      linkRule: (value) => isFooterLink(value) || LINK_MESSAGE,
    };
  },
  computed: {
    logos() {
      return this.branding.footerLogos || [];
    },
    current() {
      return this.logos[this.selected] || null;
    },
    // The media already in the footer, so the picker can badge them.
    imageIds() {
      return this.logos.map((logo) => referencedMediaId(logo.image));
    },
    mediaIds() {
      return [
        ...new Set(
          this.logos
            .flatMap((logo) => [logo.image, logo.imageDark])
            .map(referencedMediaId)
            .filter(Boolean)
        ),
      ];
    },
    // What the open logo can do besides its fields.
    actions() {
      return [
        {
          label: "Nach links",
          icon: "mdi-arrow-left",
          disabled: this.selected === 0,
          run: () => this.move(-1),
        },
        {
          label: "Nach rechts",
          icon: "mdi-arrow-right",
          disabled: this.selected === this.logos.length - 1,
          run: () => this.move(1),
        },
        {
          label: "Entfernen",
          icon: "mdi-delete-outline",
          disabled: false,
          run: () => this.remove(),
        },
      ];
    },
    full() {
      return this.logos.length >= MAX_FOOTER_LOGOS;
    },
    limitNotice() {
      const logos = this.leftOut === 1 ? "1 Logo" : `${this.leftOut} Logos`;
      return `${LIMIT_TITLE}: ${logos} nicht hinzugefügt.`;
    },
  },
  watch: {
    mediaIds: {
      immediate: true,
      handler(ids) {
        ids.forEach((id) => this.resolve(id));
      },
    },
  },
  methods: {
    async resolve(mediaId) {
      if (mediaId in this.mediaById) {
        return;
      }
      this.$set(this.mediaById, mediaId, null);
      const media = await MediaResolveService.resolve(this.mediaScope, mediaId);
      this.$set(this.mediaById, mediaId, media);
    },
    nameOf(reference) {
      const media = this.mediaById[referencedMediaId(reference)];
      return (media && (media.title || media.originalFileName)) || "Logo";
    },
    /** In dark mode a logo shows its variant, if it has one. */
    shownImage(logo) {
      return this.mode === "dark" && logo.imageDark
        ? logo.imageDark
        : logo.image;
    },
    // Without a variant, a logo stands on a white plate in dark mode; it is
    // never inverted, a funding logo has to stay as it is.
    onPlate(logo) {
      return this.mode === "dark" && !logo.imageDark;
    },
    heightOf(logo) {
      const size =
        FOOTER_LOGO_SIZES.find((step) => step.value === logo.size) ||
        FOOTER_LOGO_SIZES[1];
      return Math.round(size.px * MOCK_SCALE);
    },
    widthOf(logo) {
      const media = this.mediaById[referencedMediaId(this.shownImage(logo))];
      const ratio =
        media && media.width && media.height
          ? media.width / media.height
          : FALLBACK_RATIO;
      return Math.round(this.heightOf(logo) * Math.min(ratio, MAX_LOGO_RATIO));
    },
    /** Changes fields of the selected logo. */
    patchLogo(changes) {
      const footerLogos = this.logos.map((logo, index) =>
        index === this.selected ? { ...logo, ...changes } : logo
      );
      this.$emit("patch", { footerLogos });
    },
    /** Moves the open logo one place; its fields stay open. */
    move(delta) {
      const footerLogos = [...this.logos];
      const target = this.selected + delta;
      const [logo] = footerLogos.splice(this.selected, 1);
      footerLogos.splice(target, 0, logo);
      this.selected = target;
      this.$emit("patch", { footerLogos });
    },
    remove() {
      const footerLogos = this.logos.filter(
        (_, index) => index !== this.selected
      );
      this.selected = -1;
      this.leftOut = 0;
      this.$emit("patch", { footerLogos });
    },
    /**
     * Checks the links of all logos, not only of the open one: a faulty link
     * opens its logo, so the field can say what is wrong.
     */
    validate() {
      const faulty = this.logos.findIndex((logo) => !isFooterLink(logo.link));
      if (faulty === -1) {
        return true;
      }
      this.selected = faulty;
      this.$nextTick(() => this.$refs.link && this.$refs.link.validate(true));
      return false;
    },
    resetValidation() {
      if (this.$refs.link) {
        this.$refs.link.resetValidation();
      }
    },
    addLogos(selection) {
      const picked = selection || [];
      const room = Math.max(0, MAX_FOOTER_LOGOS - this.logos.length);
      const added = picked.slice(0, room).map((media) => ({
        image: mediaReferenceOf(media.id),
        size: "md",
        link: "",
        imageDark: null,
      }));
      this.leftOut = picked.length - added.length;
      this.$emit("patch", { footerLogos: [...this.logos, ...added] });
    },
  },
};
</script>

<style scoped>
/* Literal colours on purpose: the mock paints the storefront's footer, which
   does not follow the admin's design tokens. */
.portal-footer-mock {
  border-radius: 6px;
  padding: 12px 14px 8px;
  font-size: 11px;
}

.portal-footer-mock--light {
  background: #ffffff;
  color: #4b5563;
  border: 1px solid rgba(0, 0, 0, 0.12);
}

.portal-footer-mock--dark {
  background: #111827;
  color: #d1d5db;
}

.portal-footer-mock__logos {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  padding-bottom: 10px;
  margin-bottom: 8px;
  border-bottom: 1px solid rgba(127, 127, 127, 0.25);
}

.portal-footer-mock__logo {
  display: inline-flex;
  border-radius: 4px;
  outline-offset: 3px;
}

.portal-footer-mock__logo--plate {
  background: #ffffff;
  padding: 6px;
}

.portal-footer-mock__logo--selected {
  outline: 2px solid var(--v-primary-base);
}

.portal-footer-mock__add {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 6px 10px;
  border: 1px dashed currentColor;
  border-radius: 4px;
  color: inherit;
  font-size: 12px;
}

.portal-footer-mock__add:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.portal-footer-mock__bottom {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.portal-footer-fields {
  display: grid;
  grid-template-columns: auto minmax(160px, 1fr) minmax(220px, 1.4fr);
  gap: var(--scb-space-3);
  align-items: start;
}

@media (max-width: 959px) {
  .portal-footer-fields {
    grid-template-columns: 1fr;
  }
}
</style>
