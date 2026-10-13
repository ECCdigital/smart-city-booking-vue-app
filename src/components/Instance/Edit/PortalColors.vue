<template>
  <SubSection
    class="mt-7"
    title="Farben"
    icon="mdi-palette"
    description="Drei Farben mit festen Aufgaben. Neben jeder Farbe steht, was sie im Portal trägt, dazu eine Vorschau hell und dunkel."
    no-margin
  >
    <v-switch
      :input-value="branding.active"
      color="primary"
      label="Benutzerdefiniertes Theme"
      class="mt-0"
      hide-details
      @change="$emit('patch', { active: !!$event })"
    ></v-switch>

    <v-row
      v-for="row in rows"
      :key="row.key"
      class="portal-color-row mt-2"
      :data-color="row.key"
      align="center"
    >
      <v-col cols="12" md="4">
        <PortalColorField
          :ref="`field-${row.key}`"
          :value="colors[row.key]"
          :label="row.label"
          v-bind="row.field"
          @input="setColor(row.key, $event)"
        />
      </v-col>
      <v-col cols="12" md="3" class="text-body-2">
        <div class="font-weight-medium">{{ row.title }}</div>
        <div class="text-caption text--secondary">{{ row.text }}</div>
        <div
          v-if="row.key === 'accent' && !colors.accent"
          class="text-caption text--secondary font-italic"
        >
          {{ accentFallback }}
        </div>
      </v-col>
      <v-col cols="12" md="5" class="portal-color-row__previews">
        <PortalColorPreview
          v-for="mode in modes"
          :key="mode"
          :colors="colors"
          :mode="mode"
          :show="row.parts"
          class="flex-grow-1"
        />
      </v-col>
    </v-row>
  </SubSection>
</template>

<script>
import SubSection from "@/components/commons/SubSection.vue";
import PortalColorField from "@/components/Instance/Edit/PortalColorField.vue";
import PortalColorPreview from "@/components/Instance/Edit/PortalColorPreview.vue";

const ACCENT_FORMAT_MESSAGE =
  "Bitte eine Farbe im Format #rrggbb angeben oder das Feld leeren.";

// The backend takes an empty accent or `#rrggbb`, nothing else.
const ACCENT = /^#[0-9a-f]{6}$/i;

const ACCENT_FALLBACK =
  "Nicht gesetzt: Badges und Streifen in Primär, „Pauschal“ in Sekundär, wie heute.";

// The three colours and what each carries in the portal (map #510). The
// header bar is named with the colour it takes (`branding.header`).
const COLOR_ROWS = Object.freeze([
  {
    key: "primary",
    label: "Primärfarbe",
    title: "Interaktiv",
    text: "Knöpfe, Preise und Links.",
    withHeader: "Knöpfe, Preise, Links und die Kopfleiste (wie heute).",
    parts: ["card"],
    field: {},
  },
  {
    key: "secondary",
    label: "Sekundärfarbe",
    title: "Auswahl",
    text: "Gewählte Tage, Filter und aktive Reiter.",
    withHeader: "Gewählte Tage, Filter, aktive Reiter und die Kopfleiste.",
    parts: ["selection"],
    field: {},
  },
  {
    key: "accent",
    label: "Akzentfarbe (optional)",
    title: "Badges und Dekor",
    text: "Typ-Badges, Streifen an Ergebnissen, Kategorie-Kreise, Hintergrund-Muster. Nie Text auf dem Seitengrund.",
    parts: ["category", "card"],
    field: {
      placeholder: "Nicht gesetzt",
      clearable: true,
      opaque: true,
      rules: [(v) => !v || ACCENT.test(v) || ACCENT_FORMAT_MESSAGE],
    },
  },
]);

/**
 * The section „Farben“ of the Portal tab: the switch of the custom theme and
 * the three colours, each with a preview in light and dark. It changes the
 * branding only through `patch` events with the top-level fields it changes.
 */
export default {
  name: "PortalColors",
  components: { SubSection, PortalColorField, PortalColorPreview },
  props: {
    branding: { type: Object, required: true },
  },
  data() {
    return {
      modes: ["light", "dark"],
      accentFallback: ACCENT_FALLBACK,
    };
  },
  computed: {
    colors() {
      return this.branding.theme.colors;
    },
    /**
     * The colour the header bar takes: none while neutral, otherwise primary
     * or secondary; anything else reads as primary, as in `headerColors`.
     */
    headerColor() {
      const header = this.branding.header;
      if (header === "neutral") return null;
      return header === "secondary" ? "secondary" : "primary";
    },
    rows() {
      return COLOR_ROWS.map((row) =>
        row.key === this.headerColor ? { ...row, text: row.withHeader } : row
      );
    },
  },
  methods: {
    setColor(key, value) {
      const theme = this.branding.theme;
      this.$emit("patch", {
        theme: { ...theme, colors: { ...theme.colors, [key]: value } },
      });
    },
    fields() {
      return COLOR_ROWS.map((row) => this.$refs[`field-${row.key}`])
        .flat()
        .filter(Boolean);
    },
    validate() {
      return this.fields()
        .map((field) => field.validate(true))
        .every(Boolean);
    },
    resetValidation() {
      this.fields().forEach((field) => field.resetValidation());
    },
  },
};
</script>

<style scoped>
.portal-color-row__previews {
  display: flex;
  gap: var(--scb-space-2);
}
</style>
