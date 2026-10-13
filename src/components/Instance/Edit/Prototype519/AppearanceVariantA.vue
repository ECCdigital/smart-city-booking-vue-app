<template>
  <!-- PROTOTYPE (ECCdigital/tickets#519), Variante A „Wie heute, ergänzt“:
       Die Abschnitte bleiben, die neuen Felder stehen dort, wo ihre Verwandten
       schon stehen. Vorschau nur in den zwei Kacheln von heute; was Akzent und
       Header bewirken, zeigt erst die Live-Vorschau des Hero-Editors. -->
  <div>
    <SubSection
      class="mt-7"
      title="Theme"
      icon="mdi-palette"
      description="Passen Sie das Erscheinungsbild Ihres Portals an: Primär-, Sekundär- und Akzentfarbe sowie die Farbe der Kopfleiste."
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

      <v-row class="mt-3">
        <v-col cols="12" md="4">
          <ProtoColorInput
            v-model="branding.theme.colors.primary"
            label="Primärfarbe"
            @input="$emit('update')"
          />
        </v-col>
        <v-col cols="12" md="4">
          <ProtoColorInput
            v-model="branding.theme.colors.secondary"
            label="Sekundärfarbe"
            @input="$emit('update')"
          />
        </v-col>
        <v-col cols="12" md="4">
          <ProtoColorInput
            v-model="draft.accent"
            label="Akzentfarbe (optional)"
            placeholder="Nicht gesetzt"
            clearable
          />
        </v-col>
      </v-row>

      <v-row class="mt-0">
        <v-col v-for="mode in modes" :key="mode.key" cols="12" md="6">
          <div class="proto-a-tile" :class="`proto-a-tile--${mode.key}`">
            <span class="text-caption">{{ mode.label }}</span>
            <span class="d-flex align-center" style="gap: 10px">
              <v-icon :color="colors.primary || undefined" title="Primärfarbe">
                mdi-calendar-check
              </v-icon>
              <v-icon :color="colors.secondary || undefined" title="Sekundärfarbe">
                mdi-map-marker
              </v-icon>
              <span
                class="proto-a-badge"
                title="Akzentfarbe"
                :style="badgeStyle"
              >
                Raum
              </span>
            </span>
          </div>
        </v-col>
      </v-row>
      <div class="text-caption text--secondary mt-1">
        Die Akzentfarbe trägt Badges und Dekor, nie Text auf dem Seitengrund.
        Ohne Akzentfarbe bleibt jedes Element wie heute.
      </div>

      <div class="mt-5">
        <div class="text-caption text--secondary mb-1">Kopfleiste</div>
        <v-btn-toggle
          v-model="draft.header"
          mandatory
          dense
          color="primary"
        >
          <v-btn v-for="o in headerOptions" :key="o.value" :value="o.value" small>
            {{ o.text }}
          </v-btn>
        </v-btn-toggle>
        <div class="text-caption text--secondary mt-1">
          Die Schrift der Kopfleiste wird schwarz oder weiß, je nach Kontrast.
          Neutral ist hell weiß und dunkel wie der Fußbereich.
        </div>
      </div>
    </SubSection>

    <ProtoFontPlaceholder />

    <SubSection
      class="mt-7"
      title="Logo & Favicon"
      icon="mdi-image-area"
      description="Wählen Sie Logo und Favicon aus der Mediathek der Instanz. Beide werden allen Besuchern des Portals ausgeliefert, daher sind nur öffentliche Medien wählbar."
      no-margin
    >
      <v-row>
        <v-col cols="12" md="6">
          <MediaReferenceField
            :value="logo"
            :scope="scope"
            label="Logo"
            public-only
            empty-label="Kein Logo ausgewählt"
            hint="Wird im Kopfbereich und auf den Anmeldeseiten angezeigt, idealerweise 200 × 50 Pixel."
            @input="$emit('set-image', 'logo', $event)"
          />
          <div class="proto-a-logo proto-a-logo--light mt-2">
            <ProtoAppLogo :logo="logo" mode="light" :height="48" />
          </div>
        </v-col>
        <v-col cols="12" md="6">
          <MediaReferenceField
            v-model="draft.logoDark"
            :scope="scope"
            label="Logo für den Dunkelmodus (optional)"
            public-only
            :allow-external="false"
            empty-label="Keine Variante: Logo wird invertiert"
            hint="Gilt überall, wo das Logo steht: Anmeldeseiten, Standard-Kopfbereich und Bildblöcke mit der Quelle „App-Logo“."
          />
          <div class="proto-a-logo proto-a-logo--dark mt-2">
            <ProtoAppLogo
              :logo="logo"
              :logo-dark="draft.logoDark"
              mode="dark"
              :height="48"
            />
            <span v-if="!draft.logoDark" class="proto-a-logo__note">
              invertiert
            </span>
          </div>
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="12" md="6">
          <div class="text-caption text--secondary mb-1">
            Größe des Logos auf den Anmeldeseiten
          </div>
          <v-btn-toggle
            v-model="draft.loginLogoSize"
            mandatory
            dense
            color="primary"
          >
            <v-btn v-for="s in loginSizes" :key="s.value" :value="s.value" small>
              {{ s.text }}
            </v-btn>
          </v-btn-toggle>
          <div class="text-caption text--secondary mt-1">
            Auf dem Telefon höchstens M.
          </div>
        </v-col>
        <v-col cols="12" md="6">
          <MediaReferenceField
            :value="favicon"
            :scope="scope"
            label="Favicon"
            public-only
            empty-label="Kein Favicon ausgewählt"
            hint="Erscheint im Browser-Tab und sollte quadratisch sein, z. B. 32 × 32 oder 64 × 64 Pixel."
            @input="$emit('set-image', 'favicon', $event)"
          />
        </v-col>
      </v-row>
    </SubSection>

    <SubSection
      class="mt-7"
      title="Fußbereich"
      icon="mdi-page-layout-footer"
      description="Logos in einer eigenen Zeile über dem Copyright, etwa Förderlogos. Die Reihenfolge hier ist die Reihenfolge im Portal."
      no-margin
    >
      <div v-if="!draft.footerLogos.length" class="text--secondary text-body-2 mb-3">
        Noch keine Logos im Fußbereich.
      </div>
      <v-card
        v-for="(logo, index) in draft.footerLogos"
        :key="logo.key"
        outlined
        class="proto-a-row pa-3 mb-2"
      >
        <div class="proto-a-row__order">
          <v-btn icon x-small :disabled="index === 0" title="Nach vorn" @click="move(index, -1)">
            <v-icon small>mdi-chevron-up</v-icon>
          </v-btn>
          <span class="text-caption">{{ index + 1 }}</span>
          <v-btn
            icon
            x-small
            :disabled="index === draft.footerLogos.length - 1"
            title="Nach hinten"
            @click="move(index, 1)"
          >
            <v-icon small>mdi-chevron-down</v-icon>
          </v-btn>
        </div>
        <div class="proto-a-row__thumb">
          <ProtoLogoImg :reference="logo.image" :height="40" />
          <div class="text-caption text-truncate mt-1">{{ logo.title }}</div>
        </div>
        <ProtoFooterLogoFields :logo="logo" layout="row" class="flex-grow-1" />
        <v-btn icon small title="Entfernen" @click="remove(index)">
          <v-icon small>mdi-delete-outline</v-icon>
        </v-btn>
      </v-card>
      <ProtoAddLogos />
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
import ProtoFontPlaceholder from "./ProtoFontPlaceholder.vue";
import {
  HEADER_OPTIONS,
  LOGIN_LOGO_SIZES,
  contrastOf,
  moveFooterLogo,
  removeFooterLogo,
  store,
} from "./appearancePrototype";

export default {
  name: "AppearanceVariantA",
  components: {
    SubSection,
    MediaReferenceField,
    ProtoColorInput,
    ProtoAppLogo,
    ProtoLogoImg,
    ProtoAddLogos,
    ProtoFooterLogoFields,
    ProtoFontPlaceholder,
  },
  props: {
    branding: { type: Object, required: true },
    logo: { type: Object, default: null },
    favicon: { type: Object, default: null },
  },
  data() {
    return {
      store,
      scope: MEDIA_SCOPE.INSTANCE,
      headerOptions: HEADER_OPTIONS,
      loginSizes: LOGIN_LOGO_SIZES,
      modes: [
        { key: "light", label: "Helle Fläche (Light-Mode)" },
        { key: "dark", label: "Dunkle Fläche (Dark-Mode)" },
      ],
    };
  },
  computed: {
    draft() {
      return store.draft;
    },
    colors() {
      return this.branding.theme.colors;
    },
    badgeStyle() {
      const bg = this.draft.accent || this.colors.primary || "#1976d2";
      return { background: bg, color: contrastOf(bg) };
    },
  },
  methods: {
    move: moveFooterLogo,
    remove: removeFooterLogo,
  },
};
</script>

<style scoped>
.proto-a-tile {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 6px;
  border: 1px solid rgba(127, 127, 127, 0.3);
}

.proto-a-tile--light {
  background: #fff;
  color: rgba(0, 0, 0, 0.6);
}

.proto-a-tile--dark {
  background: #1e1e1e;
  color: rgba(255, 255, 255, 0.7);
}

.proto-a-badge {
  padding: 0 8px;
  border-radius: 999px;
  font-size: 11px;
}

.proto-a-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 6px;
  min-height: 70px;
}

.proto-a-logo--light {
  background: #fff;
  border: 1px solid rgba(127, 127, 127, 0.3);
}

.proto-a-logo--dark {
  background: #111827;
  color: #d1d5db;
}

.proto-a-logo__note {
  font-size: 11px;
  opacity: 0.7;
}

.proto-a-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.proto-a-row__order {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.proto-a-row__thumb {
  width: 120px;
  flex-shrink: 0;
}
</style>
