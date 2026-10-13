<template>
  <!-- PROTOTYPE (ECCdigital/tickets#519), Variante C „Vorschau daneben“:
       Links knappe Felder in aufklappbaren Gruppen, rechts eine kleine
       Storefront, die jede Änderung sofort zeigt, hell oder dunkel. Die offene
       Gruppe rahmt ihren Bereich in der Vorschau. -->
  <SubSection
    class="mt-7"
    title="Erscheinungsbild"
    icon="mdi-palette"
    description="Farben, Kopfleiste, Logo, Anmeldeseiten und Fußbereich. Die Vorschau rechts zeigt Ihre Änderungen schon vor dem Speichern."
    no-margin
  >
    <v-row>
      <v-col cols="12" md="7">
        <v-switch
          v-model="branding.active"
          color="primary"
          label="Benutzerdefiniertes Theme"
          class="mt-0 mb-3"
          hide-details
          @change="$emit('update')"
        />
        <v-expansion-panels v-model="panel" accordion>
          <v-expansion-panel>
            <v-expansion-panel-header>
              <span><v-icon small class="mr-2">mdi-palette</v-icon>Farben</span>
              <span class="proto-c-summary">
                <span
                  v-for="c in swatches"
                  :key="c.key"
                  class="proto-c-dot"
                  :class="{ 'proto-c-dot--empty': !c.value }"
                  :style="{ background: c.value || 'transparent' }"
                  :title="c.label"
                />
              </span>
            </v-expansion-panel-header>
            <v-expansion-panel-content>
              <ProtoColorInput
                v-model="branding.theme.colors.primary"
                label="Primärfarbe"
                hint="Knöpfe, Preise, alles Interaktive"
                class="mb-2"
                @input="$emit('update')"
              />
              <ProtoColorInput
                v-model="branding.theme.colors.secondary"
                label="Sekundärfarbe"
                hint="Auswahl und aktive Zustände"
                class="mb-2"
                @input="$emit('update')"
              />
              <ProtoColorInput
                v-model="draft.accent"
                label="Akzentfarbe (optional)"
                placeholder="Nicht gesetzt"
                hint="Badges und Dekor. Leer: alles wie heute."
                clearable
              />
            </v-expansion-panel-content>
          </v-expansion-panel>

          <v-expansion-panel>
            <v-expansion-panel-header>
              <span><v-icon small class="mr-2">mdi-page-layout-header</v-icon>Kopfleiste</span>
              <span class="proto-c-summary text-caption text--secondary">
                {{ headerLabel }}
              </span>
            </v-expansion-panel-header>
            <v-expansion-panel-content>
              <v-radio-group v-model="draft.header" class="mt-0" hide-details>
                <v-radio
                  v-for="o in headerOptions"
                  :key="o.value"
                  :value="o.value"
                  :label="o.text"
                />
              </v-radio-group>
              <div class="text-caption text--secondary mt-2">
                Die Schrift wird schwarz oder weiß, je nach Kontrast.
              </div>
            </v-expansion-panel-content>
          </v-expansion-panel>

          <v-expansion-panel>
            <v-expansion-panel-header>
              <span><v-icon small class="mr-2">mdi-image-area</v-icon>Logo &amp; Favicon</span>
              <span class="proto-c-summary text-caption text--secondary">
                {{ draft.logoDark ? "mit Variante für dunkel" : "dunkel invertiert" }}
              </span>
            </v-expansion-panel-header>
            <v-expansion-panel-content>
              <MediaReferenceField
                :value="logo"
                :scope="scope"
                label="App-Logo"
                public-only
                empty-label="Kein Logo ausgewählt"
                class="mb-3"
                @input="$emit('set-image', 'logo', $event)"
              />
              <v-checkbox
                v-model="ownDark"
                label="Eigene Variante für den Dunkelmodus"
                hint="Ohne wird das Logo im Dunkelmodus invertiert. Gilt überall, wo das App-Logo steht."
                persistent-hint
                class="mt-0 mb-2"
              />
              <MediaReferenceField
                v-if="ownDark"
                v-model="draft.logoDark"
                :scope="scope"
                label="Variante für den Dunkelmodus"
                public-only
                :allow-external="false"
                empty-label="Keine Variante gewählt"
                class="mb-3"
              />
              <MediaReferenceField
                :value="favicon"
                :scope="scope"
                label="Favicon"
                public-only
                empty-label="Kein Favicon ausgewählt"
                @input="$emit('set-image', 'favicon', $event)"
              />
            </v-expansion-panel-content>
          </v-expansion-panel>

          <v-expansion-panel>
            <v-expansion-panel-header>
              <span><v-icon small class="mr-2">mdi-login</v-icon>Anmeldeseiten</span>
              <span class="proto-c-summary text-caption text--secondary">
                Logo {{ draft.loginLogoSize }}
              </span>
            </v-expansion-panel-header>
            <v-expansion-panel-content>
              <div class="text-caption text--secondary mb-1">Größe des Logos</div>
              <v-btn-toggle v-model="draft.loginLogoSize" mandatory dense color="primary">
                <v-btn v-for="s in loginSizes" :key="s.value" :value="s.value" small>
                  {{ s.text }}
                </v-btn>
              </v-btn-toggle>
            </v-expansion-panel-content>
          </v-expansion-panel>

          <v-expansion-panel>
            <v-expansion-panel-header>
              <span><v-icon small class="mr-2">mdi-page-layout-footer</v-icon>Fußbereich</span>
              <span class="proto-c-summary text-caption text--secondary">
                {{ draft.footerLogos.length }} Logos
              </span>
            </v-expansion-panel-header>
            <v-expansion-panel-content>
              <draggable
                v-model="draft.footerLogos"
                handle=".proto-c-handle"
                item-key="key"
              >
                <div
                  v-for="(logo, index) in draft.footerLogos"
                  :key="logo.key"
                  class="proto-c-logo"
                >
                  <div class="d-flex align-center" @click="toggle(index)">
                    <v-icon small class="proto-c-handle mr-2" title="Ziehen zum Sortieren">
                      mdi-drag-vertical
                    </v-icon>
                    <ProtoLogoImg :reference="logo.image" :height="28" class="mr-3" />
                    <span class="text-body-2 text-truncate">{{ logo.title }}</span>
                    <v-spacer />
                    <v-chip x-small class="mr-1">{{ logo.size }}</v-chip>
                    <v-icon v-if="logo.link" x-small class="mr-1" title="mit Link">mdi-link</v-icon>
                    <v-icon v-if="logo.imageDark" x-small class="mr-1" title="mit Variante für dunkel">
                      mdi-weather-night
                    </v-icon>
                    <v-btn icon x-small title="Entfernen" @click.stop="remove(index)">
                      <v-icon small>mdi-close</v-icon>
                    </v-btn>
                  </div>
                  <ProtoFooterLogoFields
                    v-if="open === index"
                    :logo="logo"
                    class="mt-3"
                  />
                </div>
              </draggable>
              <ProtoAddLogos class="d-inline-block mt-2" @added="open = $event" />
            </v-expansion-panel-content>
          </v-expansion-panel>

          <v-expansion-panel disabled>
            <v-expansion-panel-header>
              <span class="proto-c-font">
                <v-icon small class="mr-2">mdi-format-font</v-icon>Schrift
                (#516, hier nur Platzhalter)
              </span>
            </v-expansion-panel-header>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-col>

      <v-col cols="12" md="5">
        <div class="proto-c-preview">
          <div class="d-flex align-center mb-2">
            <span class="text-caption text--secondary">Vorschau, ungespeichert</span>
            <v-spacer />
            <v-btn-toggle v-model="mode" mandatory dense>
              <v-btn x-small value="light">Hell</v-btn>
              <v-btn x-small value="dark">Dunkel</v-btn>
            </v-btn-toggle>
          </div>
          <div class="proto-c-page" :class="`proto-c-page--${mode}`">
            <ProtoHeaderMock
              :header="draft.header"
              :colors="colors"
              :mode="mode"
              :logo="logo"
              :logo-dark="draft.logoDark"
              :portal-name="portalName"
              :class="frame(1)"
            />
            <div class="proto-c-hero">Kopfbereich (Hero-Editor)</div>
            <ProtoStorefrontBits
              :colors="colors"
              :accent="draft.accent"
              :mode="mode"
              :class="frame(0)"
            />
            <ProtoFooterMock
              :logos="draft.footerLogos"
              :mode="mode"
              :portal-name="portalName"
              :scale="0.5"
              :class="frame(4)"
            />
          </div>
          <ProtoLoginMock
            v-if="panel === 2 || panel === 3"
            :size="draft.loginLogoSize"
            :logo="logo"
            :logo-dark="draft.logoDark"
            :mode="mode"
            :colors="colors"
            :portal-name="portalName"
            class="mt-2 proto-c-framed"
          />
        </div>
      </v-col>
    </v-row>
  </SubSection>
</template>

<script>
import draggable from "vuedraggable";
import SubSection from "@/components/commons/SubSection.vue";
import MediaReferenceField from "@/components/Media/MediaReferenceField.vue";
import { MEDIA_SCOPE } from "@/services/api/ApiMediaService";
import ProtoColorInput from "./ProtoColorInput.vue";
import ProtoLogoImg from "./ProtoLogoImg.vue";
import ProtoAddLogos from "./ProtoAddLogos.vue";
import ProtoFooterLogoFields from "./ProtoFooterLogoFields.vue";
import ProtoFooterMock from "./ProtoFooterMock.vue";
import ProtoHeaderMock from "./ProtoHeaderMock.vue";
import ProtoLoginMock from "./ProtoLoginMock.vue";
import ProtoStorefrontBits from "./ProtoStorefrontBits.vue";
import {
  HEADER_OPTIONS,
  LOGIN_LOGO_SIZES,
  removeFooterLogo,
  store,
} from "./appearancePrototype";

export default {
  name: "AppearanceVariantC",
  components: {
    draggable,
    SubSection,
    MediaReferenceField,
    ProtoColorInput,
    ProtoLogoImg,
    ProtoAddLogos,
    ProtoFooterLogoFields,
    ProtoFooterMock,
    ProtoHeaderMock,
    ProtoLoginMock,
    ProtoStorefrontBits,
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
      panel: 0,
      mode: "light",
      open: -1,
      ownDarkLocal: !!store.draft.logoDark,
    };
  },
  computed: {
    draft() {
      return store.draft;
    },
    colors() {
      return this.branding.theme.colors;
    },
    swatches() {
      return [
        { key: "p", label: "Primärfarbe", value: this.colors.primary },
        { key: "s", label: "Sekundärfarbe", value: this.colors.secondary },
        { key: "a", label: "Akzentfarbe", value: this.draft.accent },
      ];
    },
    headerLabel() {
      const o = HEADER_OPTIONS.find((h) => h.value === this.draft.header);
      return o ? o.text : "";
    },
    ownDark: {
      get() {
        return this.ownDarkLocal || !!this.draft.logoDark;
      },
      set(value) {
        this.ownDarkLocal = value;
        if (!value) this.draft.logoDark = null;
      },
    },
  },
  methods: {
    toggle(index) {
      this.open = this.open === index ? -1 : index;
    },
    remove(index) {
      removeFooterLogo(index);
      this.open = -1;
    },
    // Rahmt den Bereich der offenen Gruppe. Logo & Favicon (2) rahmt die
    // Kopfleiste mit, weil dort das Logo steht.
    frame(panelIndex) {
      const hit =
        this.panel === panelIndex || (panelIndex === 1 && this.panel === 2);
      return { "proto-c-framed": hit };
    },
  },
};
</script>

<style scoped>
.proto-c-summary {
  flex: 0 0 auto;
  margin-left: auto;
  margin-right: 8px;
  display: inline-flex;
  gap: 4px;
}

.proto-c-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid rgba(127, 127, 127, 0.5);
}

.proto-c-dot--empty {
  border-style: dashed;
}

.proto-c-logo {
  padding: 8px;
  border: 1px solid rgba(127, 127, 127, 0.3);
  border-radius: 6px;
  margin-bottom: 6px;
  cursor: pointer;
}

.proto-c-handle {
  cursor: grab;
}

.proto-c-preview {
  position: sticky;
  top: 80px;
}

.proto-c-page {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  border-radius: 8px;
}

.proto-c-page--light {
  background: #f3f4f6;
}

.proto-c-page--dark {
  background: #030712;
}

.proto-c-hero {
  height: 60px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #6b7280;
  border: 1px dashed rgba(127, 127, 127, 0.5);
}

.proto-c-framed {
  outline: 2px solid #ff00aa;
  outline-offset: 2px;
}

.proto-c-font {
  opacity: 0.7;
}
</style>
