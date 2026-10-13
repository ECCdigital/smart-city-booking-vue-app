<template>
  <!-- PROTOTYPE (ECCdigital/tickets#519), Variante B „Nach Bereichen der
       Seite“: Farben, Kopfleiste, Anmeldeseiten, Fußbereich. Jeder Abschnitt
       zeigt seine eigene kleine Vorschau, hell und dunkel, schon vor dem
       Speichern. Die Footer-Logos bearbeitet man direkt in der Attrappe. -->
  <div>
    <SubSection
      class="mt-7"
      title="Farben"
      icon="mdi-palette"
      description="Drei Farben mit festen Aufgaben. Rechts steht, was jede Farbe im Portal trägt."
      no-margin
    >
      <v-switch
        v-model="branding.active"
        color="primary"
        label="Benutzerdefiniertes Theme"
        class="mt-0"
        hide-details
        @change="$emit('update')"
      />

      <v-row v-for="row in colorRows" :key="row.key" class="mt-2" align="center">
        <v-col cols="12" md="4">
          <ProtoColorInput
            v-if="row.key === 'accent'"
            v-model="draft.accent"
            label="Akzentfarbe (optional)"
            placeholder="Nicht gesetzt"
            clearable
          />
          <ProtoColorInput
            v-else
            v-model="branding.theme.colors[row.key]"
            :label="row.label"
            @input="$emit('update')"
          />
        </v-col>
        <v-col cols="12" md="3" class="text-body-2">
          <b>{{ row.title }}</b>
          <div class="text-caption text--secondary">{{ row.text }}</div>
          <div
            v-if="row.key === 'accent' && !draft.accent"
            class="text-caption text--secondary font-italic"
          >
            Nicht gesetzt: Badges und Streifen in Primär, „Pauschal“ in
            Sekundär, wie heute.
          </div>
        </v-col>
        <v-col cols="12" md="5" class="d-flex" style="gap: 6px">
          <ProtoStorefrontBits
            v-for="mode in ['light', 'dark']"
            :key="mode"
            :colors="colors"
            :accent="draft.accent"
            :mode="mode"
            :show="row.bits"
            class="flex-grow-1"
          />
        </v-col>
      </v-row>
    </SubSection>

    <SubSection
      class="mt-7"
      title="Kopfleiste"
      icon="mdi-page-layout-header"
      description="Die Leiste oben auf jeder Seite, mit Logo, Portalname und Navigation. Die Schrift wird schwarz oder weiß, je nach Kontrast."
      no-margin
    >
      <div class="proto-b-headers">
        <div
          v-for="o in headerOptions"
          :key="o.value"
          class="proto-b-header-card"
          :class="{ 'proto-b-header-card--active': draft.header === o.value }"
          role="radio"
          :aria-checked="String(draft.header === o.value)"
          @click="draft.header = o.value"
        >
          <div class="d-flex align-center mb-2">
            <v-icon small :color="draft.header === o.value ? 'primary' : undefined" class="mr-1">
              {{ draft.header === o.value ? "mdi-radiobox-marked" : "mdi-radiobox-blank" }}
            </v-icon>
            <b class="text-body-2">{{ o.text }}</b>
            <span v-if="o.value === 'primary'" class="text-caption text--secondary ml-2">
              (wie heute)
            </span>
          </div>
          <ProtoHeaderMock
            v-for="mode in ['light', 'dark']"
            :key="mode"
            :header="o.value"
            :colors="colors"
            :mode="mode"
            :logo="logo"
            :logo-dark="draft.logoDark"
            compact
            class="mb-1"
          />
        </div>
      </div>

      <v-row class="mt-4">
        <v-col cols="12" md="6">
          <MediaReferenceField
            :value="logo"
            :scope="scope"
            label="App-Logo"
            public-only
            empty-label="Kein Logo ausgewählt"
            hint="Kopfleiste, Anmeldeseiten, Standard-Kopfbereich und Bildblöcke mit der Quelle „App-Logo“."
            @input="$emit('set-image', 'logo', $event)"
          />
        </v-col>
        <v-col cols="12" md="6">
          <MediaReferenceField
            v-model="draft.logoDark"
            :scope="scope"
            label="Variante für den Dunkelmodus (optional)"
            public-only
            :allow-external="false"
            empty-label="Keine Variante: Logo wird invertiert"
            hint="Für Logos, die invertiert falsche Farben bekommen, etwa Wappen. Passt das Logo ohne Änderung auf dunklen Grund, wählen Sie dasselbe Bild."
          />
        </v-col>
      </v-row>
      <div class="proto-b-logo-pair">
        <div class="proto-b-logo proto-b-logo--light">
          <span class="text-caption">Hell</span>
          <ProtoAppLogo :logo="logo" mode="light" :height="44" />
        </div>
        <div class="proto-b-logo proto-b-logo--dark">
          <span class="text-caption">
            Dunkel{{ draft.logoDark ? "" : " · invertiert" }}
          </span>
          <ProtoAppLogo
            :logo="logo"
            :logo-dark="draft.logoDark"
            mode="dark"
            :height="44"
          />
        </div>
      </div>

      <v-row class="mt-2">
        <v-col cols="12" md="6">
          <MediaReferenceField
            :value="favicon"
            :scope="scope"
            label="Favicon"
            public-only
            empty-label="Kein Favicon ausgewählt"
            hint="Erscheint im Browser-Tab, quadratisch."
            @input="$emit('set-image', 'favicon', $event)"
          />
        </v-col>
      </v-row>
    </SubSection>

    <ProtoFontPlaceholder />

    <SubSection
      class="mt-7"
      title="Anmeldeseiten"
      icon="mdi-login"
      description="Login, Registrieren, Passwort vergessen und E-Mail bestätigen. Logo und Portalname stehen oben in der Karte."
      no-margin
    >
      <v-row align="center">
        <v-col cols="12" md="4">
          <div class="text-caption text--secondary mb-1">Größe des Logos</div>
          <v-radio-group v-model="draft.loginLogoSize" class="mt-0" hide-details>
            <v-radio
              v-for="s in loginSizes"
              :key="s.value"
              :value="s.value"
              :label="s.text"
            />
          </v-radio-group>
          <div class="text-caption text--secondary mt-2">
            Auf dem Telefon höchstens M.
          </div>
        </v-col>
        <v-col cols="12" md="8" class="d-flex" style="gap: 8px">
          <ProtoLoginMock
            v-for="mode in ['light', 'dark']"
            :key="mode"
            :size="draft.loginLogoSize"
            :logo="logo"
            :logo-dark="draft.logoDark"
            :mode="mode"
            :colors="colors"
            :portal-name="portalName"
            class="flex-grow-1"
          />
        </v-col>
      </v-row>
    </SubSection>

    <SubSection
      class="mt-7"
      title="Fußbereich"
      icon="mdi-page-layout-footer"
      description="Logos in einer eigenen Zeile über dem Copyright, etwa Förderlogos. Klicken Sie ein Logo an, um es zu bearbeiten."
      no-margin
    >
      <v-btn-toggle v-model="footerMode" mandatory dense class="mb-2">
        <v-btn small value="light">Hell</v-btn>
        <v-btn small value="dark">Dunkel</v-btn>
      </v-btn-toggle>
      <ProtoFooterMock
        :logos="draft.footerLogos"
        :mode="footerMode"
        :portal-name="portalName"
        :scale="0.6"
        selectable
        :selected="selected"
        @select="selected = $event"
      >
        <template #after-logos>
          <ProtoAddLogos @added="selected = $event">
            <template #default="{ open }">
              <button type="button" class="proto-b-add" title="Logos hinzufügen" @click="open">
                <v-icon small>mdi-plus</v-icon>
                Logo
              </button>
            </template>
          </ProtoAddLogos>
        </template>
      </ProtoFooterMock>
      <div class="text-caption text--secondary mt-1">
        Vorschau in 60 % der echten Größe. Dunkel steht ein Logo ohne Variante
        auf einer weißen Platte.
      </div>

      <v-card v-if="current" outlined class="pa-4 mt-3">
        <div class="d-flex align-center mb-3">
          <ProtoLogoImg :reference="current.image" :height="32" class="mr-3" />
          <b class="text-body-2 text-truncate">{{ current.title }}</b>
          <v-spacer />
          <v-btn icon small :disabled="selected === 0" title="Nach links" @click="move(-1)">
            <v-icon small>mdi-arrow-left</v-icon>
          </v-btn>
          <v-btn
            icon
            small
            :disabled="selected === draft.footerLogos.length - 1"
            title="Nach rechts"
            @click="move(1)"
          >
            <v-icon small>mdi-arrow-right</v-icon>
          </v-btn>
          <v-btn icon small title="Entfernen" @click="remove">
            <v-icon small>mdi-delete-outline</v-icon>
          </v-btn>
        </div>
        <ProtoFooterLogoFields :logo="current" layout="row" />
      </v-card>
    </SubSection>
  </div>
</template>

<script>
import SubSection from "@/components/commons/SubSection.vue";
import MediaReferenceField from "@/components/Media/MediaReferenceField.vue";
import { MEDIA_SCOPE } from "@/services/api/ApiMediaService";
import ProtoColorInput from "./ProtoColorInput.vue";
import ProtoAppLogo from "./ProtoAppLogo.vue";
import ProtoLogoImg from "./ProtoLogoImg.vue";
import ProtoAddLogos from "./ProtoAddLogos.vue";
import ProtoFooterLogoFields from "./ProtoFooterLogoFields.vue";
import ProtoFooterMock from "./ProtoFooterMock.vue";
import ProtoHeaderMock from "./ProtoHeaderMock.vue";
import ProtoLoginMock from "./ProtoLoginMock.vue";
import ProtoStorefrontBits from "./ProtoStorefrontBits.vue";
import ProtoFontPlaceholder from "./ProtoFontPlaceholder.vue";
import {
  HEADER_OPTIONS,
  LOGIN_LOGO_SIZES,
  moveFooterLogo,
  removeFooterLogo,
  store,
} from "./appearancePrototype";

const COLOR_ROWS = [
  {
    key: "primary",
    label: "Primärfarbe",
    title: "Interaktiv",
    text: "Knöpfe, Preise, Links und die Kopfleiste (wie heute).",
    bits: ["card"],
  },
  {
    key: "secondary",
    label: "Sekundärfarbe",
    title: "Auswahl",
    text: "Gewählte Tage, Filter und aktive Reiter.",
    bits: ["selection"],
  },
  {
    key: "accent",
    label: "Akzentfarbe",
    title: "Badges und Dekor",
    text: "Typ-Badges, Streifen an Ergebnissen, Kategorie-Kreise, Hintergrund-Muster. Nie Text auf dem Seitengrund.",
    bits: ["category", "card"],
  },
];

export default {
  name: "AppearanceVariantB",
  components: {
    SubSection,
    MediaReferenceField,
    ProtoColorInput,
    ProtoAppLogo,
    ProtoLogoImg,
    ProtoAddLogos,
    ProtoFooterLogoFields,
    ProtoFooterMock,
    ProtoHeaderMock,
    ProtoLoginMock,
    ProtoStorefrontBits,
    ProtoFontPlaceholder,
  },
  props: {
    branding: { type: Object, required: true },
    logo: { type: Object, default: null },
    favicon: { type: Object, default: null },
    portalName: { type: String, default: "" },
  },
  data() {
    return {
      scope: MEDIA_SCOPE.INSTANCE,
      headerOptions: HEADER_OPTIONS,
      loginSizes: LOGIN_LOGO_SIZES,
      colorRows: COLOR_ROWS,
      footerMode: "light",
      selected: -1,
    };
  },
  computed: {
    draft() {
      return store.draft;
    },
    colors() {
      return this.branding.theme.colors;
    },
    current() {
      return this.draft.footerLogos[this.selected] || null;
    },
  },
  methods: {
    move(delta) {
      moveFooterLogo(this.selected, delta);
      this.selected += delta;
    },
    remove() {
      removeFooterLogo(this.selected);
      this.selected = -1;
    },
  },
};
</script>

<style scoped>
.proto-b-headers {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}

.proto-b-header-card {
  padding: 10px;
  border-radius: 8px;
  border: 1px solid rgba(127, 127, 127, 0.35);
  cursor: pointer;
}

.proto-b-header-card--active {
  border: 2px solid var(--v-primary-base);
  padding: 9px;
}

.proto-b-logo-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 6px;
}

.proto-b-logo {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 6px;
  min-height: 64px;
}

.proto-b-logo--light {
  background: #fff;
  color: #4b5563;
  border: 1px solid rgba(127, 127, 127, 0.3);
}

.proto-b-logo--dark {
  background: #111827;
  color: #d1d5db;
}

.proto-b-add {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 48px;
  padding: 0 12px;
  border: 1px dashed currentColor;
  border-radius: 4px;
  color: inherit;
  opacity: 0.7;
  font-size: 11px;
}
</style>
