<template>
  <div class="pdf-layout-picker">
    <div class="pdf-layout-picker__intro text--secondary body-2 mb-4">
      Darstellung der Buchungsinformationen in Belegen, Rechnungen und
      Stornorechnungen. Die Miniaturvorschau zeigt den typischen Aufbau —
      abhängig von Layout und den markierten Feldern darunter.
    </div>

    <v-radio-group
      :value="value"
      class="pdf-layout-picker__group ma-0 pa-0"
      hide-details
      @change="$emit('input', $event)"
    >
      <v-row dense>
        <v-col
          v-for="option in options"
          :key="option.value"
          cols="12"
          md="4"
        >
          <v-card
            class="pdf-layout-picker__card"
            :class="{
              'pdf-layout-picker__card--active': value === option.value,
            }"
            outlined
            elevation="2"
            @click="$emit('input', option.value)"
          >
            <v-card-text class="pb-2">
              <div class="d-flex align-start">
                <v-radio
                  :value="option.value"
                  class="pdf-layout-picker__radio mt-0 pt-0"
                  hide-details
                  @click.stop
                />
                <div class="flex-grow-1 ml-1">
                  <div class="subtitle-2 font-weight-medium">
                    {{ option.title }}
                  </div>
                  <div class="caption text--secondary mt-1">
                    {{ option.description }}
                  </div>
                </div>
              </div>

              <LayoutSkeleton
                class="mt-4"
                :layout="option.value"
                :table-meta="normalizedTableMeta"
              />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-radio-group>

    <div class="pdf-layout-picker__meta-panel mt-4">
      <div class="pdf-layout-picker__meta-title body-2 font-weight-medium mb-1">
        Buchungs-Metadaten in der Positionstabelle
      </div>
      <p class="pdf-layout-picker__meta-text caption text--secondary mb-0">
        In Belegen, Rechnungen und Stornorechnungen werden neben den
        Positionen automatisch <strong>Buchungs-Metadaten</strong> angezeigt
        — z.&nbsp;B. Nummer, Zeitraum oder Zahlungsart. Mit den Schaltern
        legen Sie fest, welche dieser Infos <em>in der eingebauten Tabelle</em>
        erscheinen. Deaktivieren Sie Felder, wenn Sie sie stattdessen im
        Fließtext der Vorlage platzieren möchten, damit nichts doppelt
        steht.
      </p>
      <p class="pdf-layout-picker__meta-vars caption text--secondary mt-2 mb-0">
        Ausgeblendete Felder bleiben als Template-Variablen verfügbar.
      </p>
      <div class="pdf-layout-picker__meta-chips mt-3">
        <v-tooltip
          v-for="option in metaOptions"
          :key="option.key"
          bottom
          max-width="300"
        >
          <template #activator="{ on, attrs }">
            <v-chip
              v-bind="attrs"
              v-on="on"
              small
              label
              class="pdf-layout-picker__meta-chip"
              :color="normalizedTableMeta[option.key] ? 'primary' : undefined"
              :outlined="!normalizedTableMeta[option.key]"
              @click="toggleMeta(option.key)"
            >
              <v-icon
                v-if="normalizedTableMeta[option.key]"
                left
                small
              >
                mdi-check
              </v-icon>
              {{ option.shortLabel }}
            </v-chip>
          </template>
          <span>{{ option.tooltip }}</span>
        </v-tooltip>
      </div>
    </div>
  </div>
</template>

<script>
import { normalizePdfBookingTableMeta } from "@/components/PDF/pdfBookingTableMeta.js";
import {
  PDF_BOOKING_LAYOUTS,
  DEFAULT_PDF_BOOKING_LAYOUT,
} from "@/components/PDF/pdfBookingLayoutConstants.js";
import LayoutSkeleton from "@/components/PDF/PdfBookingLayoutSkeleton.vue";

export default {
  name: "PdfBookingLayoutPicker",
  components: { LayoutSkeleton },
  props: {
    value: {
      type: String,
      default: DEFAULT_PDF_BOOKING_LAYOUT,
      validator: (v) => PDF_BOOKING_LAYOUTS.includes(v),
    },
    tableMeta: {
      type: Object,
      default: null,
    },
  },
  data() {
    return {
      bookingIdExample: "{{booking.id}}",
      bookingPeriodExample: "{{booking.period}}",
      bookingPaymentDateExample: "{{booking.paymentDate}}",
      bookingPaymentMethodExample: "{{booking.paymentMethod}}",
      options: [
        {
          value: "summary",
          title: "Zusammenfassung",
          description:
            "Kompakte Übersicht ohne Einzelpreise — ideal bei wenigen Buchungsobjekten.",
        },
        {
          value: "compact",
          title: "Kompakt",
          description:
            "Einzeilige Buchungsinfo mit Positionstabelle — platzsparend bei vielen Posten.",
        },
        {
          value: "detailed",
          title: "Ausführlich",
          description:
            "Alle Buchungsfelder einzeln plus klassische 4-Spalten-Tabelle.",
        },
      ],
      metaOptions: [
        {
          key: "showBookingId",
          shortLabel: "Buchungsnummer",
          tooltip:
            "Zeigt die Buchungsnummer in der Tabelle an (z. B. als Kopfzeile oder eigene Zeile). Variable: {{booking.id}}",
        },
        {
          key: "showBookingPeriod",
          shortLabel: "Zeitraum",
          tooltip:
            "Zeigt den Buchungszeitraum in der Tabelle an. Variable: {{booking.period}}",
        },
        {
          key: "showPaymentDate",
          shortLabel: "Zahlungsdatum",
          tooltip:
            "Zeigt das Datum des Zahlungseingangs in der Tabelle an (vor allem bei Belegen). Variable: {{booking.paymentDate}}",
        },
        {
          key: "showPaymentMethod",
          shortLabel: "Zahlungsmethode",
          tooltip:
            "Zeigt die Zahlungsart in der Tabelle an (z. B. Überweisung). Variable: {{booking.paymentMethod}}",
        },
      ],
    };
  },
  computed: {
    normalizedTableMeta() {
      return normalizePdfBookingTableMeta(this.tableMeta);
    },
  },
  methods: {
    toggleMeta(key) {
      this.$emit("update:tableMeta", {
        ...this.normalizedTableMeta,
        [key]: !this.normalizedTableMeta[key],
      });
    },
  },
};
</script>

<style scoped>
.pdf-layout-picker__intro {
  line-height: 1.5;
  max-width: 820px;
}

.pdf-layout-picker__card {
  border-radius: 8px !important;
  cursor: pointer;
  height: 100%;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.pdf-layout-picker__card--active {
  border-color: var(--v-primary-base) !important;
}

.pdf-layout-picker__radio {
  flex: 0 0 auto;
}

.pdf-layout-picker__meta-panel {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fafafa;
  padding: 12px 16px;
}

.pdf-layout-picker__meta-text {
  line-height: 1.55;
  max-width: 820px;
}

.pdf-layout-picker__meta-vars {
  line-height: 1.55;
}

.pdf-layout-picker__meta-vars code {
  background: rgba(0, 0, 0, 0.06);
  border-radius: 3px;
  font-size: 0.75rem;
  padding: 1px 4px;
  white-space: nowrap;
}

.pdf-layout-picker__meta-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pdf-layout-picker__meta-chip {
  cursor: pointer;
  user-select: none;
}
</style>
