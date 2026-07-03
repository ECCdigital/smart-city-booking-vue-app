<template>
  <div class="pdf-layout-picker">
    <div class="pdf-layout-picker__intro text--secondary body-2 mb-4">
      Darstellung der Buchungsinformationen in Belegen, Rechnungen und
      Stornorechnungen. Die Vorschau zeigt den typischen Aufbau — die echten
      Inhalte kommen aus Ihrer Vorlage.
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

              <div
                class="layout-skeleton mt-4"
                :class="`layout-skeleton--${option.value}`"
                aria-hidden="true"
              >
                <template v-if="option.value === 'summary'">
                  <div class="layout-skeleton__kv-table">
                    <div
                      v-for="row in 5"
                      :key="`summary-${row}`"
                      class="layout-skeleton__kv-row"
                    >
                      <span class="layout-skeleton__bar layout-skeleton__bar--label" />
                      <span class="layout-skeleton__bar layout-skeleton__bar--value" />
                    </div>
                  </div>
                </template>

                <template v-else-if="option.value === 'compact'">
                  <div class="layout-skeleton__meta layout-skeleton__meta--single">
                    <span class="layout-skeleton__bar layout-skeleton__bar--meta-line" />
                  </div>
                  <div class="layout-skeleton__table layout-skeleton__table--3col">
                    <div class="layout-skeleton__table-head">
                      <span /><span /><span />
                    </div>
                    <div
                      v-for="row in 3"
                      :key="`compact-${row}`"
                      class="layout-skeleton__table-row"
                    >
                      <span class="layout-skeleton__bar layout-skeleton__bar--wide" />
                      <span class="layout-skeleton__bar layout-skeleton__bar--short" />
                      <span class="layout-skeleton__bar layout-skeleton__bar--short" />
                    </div>
                  </div>
                </template>

                <template v-else>
                  <div class="layout-skeleton__meta layout-skeleton__meta--multi">
                    <div
                      v-for="row in 4"
                      :key="`detailed-meta-${row}`"
                      class="layout-skeleton__meta-line"
                    >
                      <span class="layout-skeleton__bar layout-skeleton__bar--meta-label" />
                      <span class="layout-skeleton__bar layout-skeleton__bar--meta-value" />
                    </div>
                  </div>
                  <div class="layout-skeleton__table layout-skeleton__table--4col">
                    <div class="layout-skeleton__table-head">
                      <span /><span /><span /><span />
                    </div>
                    <div
                      v-for="row in 2"
                      :key="`detailed-${row}`"
                      class="layout-skeleton__table-row"
                    >
                      <span class="layout-skeleton__bar layout-skeleton__bar--wide" />
                      <span class="layout-skeleton__bar layout-skeleton__bar--tiny" />
                      <span class="layout-skeleton__bar layout-skeleton__bar--short" />
                      <span class="layout-skeleton__bar layout-skeleton__bar--short" />
                    </div>
                    <div class="layout-skeleton__table-total">
                      <span class="layout-skeleton__bar layout-skeleton__bar--total" />
                    </div>
                  </div>
                </template>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-radio-group>
  </div>
</template>

<script>
export default {
  name: "PdfBookingLayoutPicker",
  props: {
    value: {
      type: String,
      default: "detailed",
    },
  },
  data() {
    return {
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
    };
  },
};
</script>

<style scoped>
.pdf-layout-picker__intro {
  line-height: 1.5;
  max-width: 720px;
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

.layout-skeleton {
  background: #fafafa;
  border: 1px solid #ececec;
  border-radius: 6px;
  padding: 12px;
  min-height: 148px;
}

.layout-skeleton__bar {
  display: block;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(90deg, #e4e4e4 0%, #ededed 50%, #e4e4e4 100%);
}

.layout-skeleton__kv-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.layout-skeleton__kv-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e8e8e8;
}

.layout-skeleton__kv-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.layout-skeleton__bar--label {
  width: 42%;
  max-width: 96px;
}

.layout-skeleton__bar--value {
  width: 28%;
  max-width: 64px;
  margin-left: auto;
}

.layout-skeleton__meta {
  margin-bottom: 10px;
}

.layout-skeleton__meta--single .layout-skeleton__bar--meta-line {
  width: 92%;
  height: 7px;
}

.layout-skeleton__meta--multi {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.layout-skeleton__meta-line {
  display: flex;
  align-items: center;
  gap: 6px;
}

.layout-skeleton__bar--meta-label {
  width: 34%;
  max-width: 72px;
  height: 5px;
  opacity: 0.85;
}

.layout-skeleton__bar--meta-value {
  width: 52%;
  height: 5px;
}

.layout-skeleton__table {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  background: #fff;
}

.layout-skeleton__table-head {
  display: grid;
  gap: 6px;
  padding: 6px 8px;
  background: #eeeeee;
  border-bottom: 1px solid #e0e0e0;
}

.layout-skeleton__table--3col .layout-skeleton__table-head {
  grid-template-columns: 1.4fr 1fr 1fr;
}

.layout-skeleton__table--4col .layout-skeleton__table-head {
  grid-template-columns: 1.5fr 0.6fr 0.8fr 0.8fr;
}

.layout-skeleton__table-head span {
  display: block;
  height: 5px;
  border-radius: 2px;
  background: #d5d5d5;
}

.layout-skeleton__table-row {
  display: grid;
  gap: 6px;
  padding: 7px 8px;
  border-bottom: 1px solid #f0f0f0;
}

.layout-skeleton__table--3col .layout-skeleton__table-row {
  grid-template-columns: 1.4fr 1fr 1fr;
}

.layout-skeleton__table--4col .layout-skeleton__table-row {
  grid-template-columns: 1.5fr 0.6fr 0.8fr 0.8fr;
}

.layout-skeleton__table-row:nth-child(even) {
  background: #f7f7f7;
}

.layout-skeleton__bar--wide {
  width: 88%;
}

.layout-skeleton__bar--short {
  width: 72%;
  margin-left: auto;
}

.layout-skeleton__bar--tiny {
  width: 55%;
  margin-left: auto;
}

.layout-skeleton__table-total {
  padding: 8px;
  border-top: 2px solid #333;
}

.layout-skeleton__bar--total {
  width: 36%;
  height: 7px;
  margin-left: auto;
}
</style>
