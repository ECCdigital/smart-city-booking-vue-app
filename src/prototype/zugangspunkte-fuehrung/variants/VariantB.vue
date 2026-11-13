<script>
/**
 * PROTOTYPE (tickets#1084) — Variante B: Geführte Einrichtung in Schritten.
 *
 * Solange nichts eingerichtet ist, IST die Seite ein Assistent mit drei
 * Schritten: Schließsystem verbinden, Zugangspunkte anlegen, Buchungsobjekten
 * zuordnen. Zuordnen passiert im dritten Schritt hier auf der Seite.
 * Ist etwas eingerichtet, öffnet die Seite auf der Verwaltung. Der Assistent
 * kommt nur zurück, wenn man ihn ruft: „Einrichtung fortsetzen“ oder
 * „Schließsystem hinzufügen“.
 */
import {
  store,
  GROUPS,
  PROVIDERS,
  BOOKABLES,
  provider,
  activeProviders,
  accessPointsOf,
  iqMissing,
  activateIqs,
  bookableNames,
  openSteps,
  assign,
  stub,
} from "../data";
import StubConnectDialog from "../StubConnectDialog.vue";
import StubCreateDialog from "../StubCreateDialog.vue";

export default {
  name: "VariantB",
  components: { StubConnectDialog, StubCreateDialog },
  data() {
    const fresh = !activeProviders().length || !store.accessPoints.length;
    return {
      mode: fresh ? "wizard" : "manage",
      step: !activeProviders().length ? 1 : 2,
      connectOpen: false,
      connectId: null,
      createOpen: false,
      createProvider: null,
    };
  },
  computed: {
    groups() {
      return GROUPS.map((g) => ({
        ...g,
        providers: PROVIDERS.filter((p) => p.group === g.id),
      }));
    },
    active() {
      return activeProviders();
    },
    items() {
      return store.accessPoints;
    },
    steps() {
      return openSteps();
    },
    bookableItems() {
      return BOOKABLES.map((b) => ({
        text: `${b.name} (${b.place})`,
        value: b.id,
      }));
    },
    headers() {
      return [
        { text: "Bezeichnung", value: "label" },
        { text: "Schließsystem", value: "provider" },
        { text: "Buchungsobjekte", value: "bookables", sortable: false },
        { text: "", value: "actions", sortable: false, align: "end" },
      ];
    },
  },
  methods: {
    provider,
    iqMissing,
    accessPointsOf,
    bookableNames,
    isActive(id) {
      return store.systems[id]?.active;
    },
    openConnect(id) {
      this.connectId = id;
      this.connectOpen = true;
    },
    openCreate(providerId) {
      this.createProvider = providerId;
      this.createOpen = true;
    },
    activate(id) {
      activateIqs(id);
      stub("Stub: würde den Assistenten „IQ-Aktivierung“ je IQ öffnen.");
    },
    setBookables(ap, ids) {
      assign(ap.id, ids);
    },
    startWizard(step) {
      this.step = step;
      this.mode = "wizard";
    },
    resume() {
      const first = this.steps[0];
      if (!first) return this.startWizard(1);
      const at = { iq: 1, create: 2, assign: 3 }[first.kind];
      this.startWizard(at);
    },
    finish() {
      this.mode = "manage";
    },
    qr(ap) {
      stub(`Stub: QR-Code für „${ap.label}“ als PDF.`);
    },
  },
};
</script>

<template>
  <div>
    <!-- ======================== Assistent ======================== -->
    <div v-if="mode === 'wizard'">
      <div class="d-flex align-center mb-4">
        <div>
          <div class="text-h6">Zutritt einrichten</div>
          <div class="text-body-2 text--secondary">
            Drei Schritte, bis Buchende mit ihrer Buchung die Tür öffnen.
          </div>
        </div>
        <v-spacer />
        <v-btn v-if="items.length" text small @click="finish">
          Zur Übersicht
        </v-btn>
      </div>

      <v-stepper v-model="step" vertical flat class="wizard">
        <!-- Schritt 1 -->
        <v-stepper-step
          :complete="active.length > 0 && step > 1"
          step="1"
          editable
        >
          Schließsystem verbinden
          <small v-if="active.length">
            {{ active.map((p) => p.name).join(", ") }} verbunden
          </small>
        </v-stepper-step>
        <v-stepper-content step="1">
          <p class="text-body-2 mb-4">
            Welche Schlösser nutzt der Mandant? Verbinden Sie jedes, das
            Buchende öffnen sollen. Mehrere gehen.
          </p>
          <div v-for="g in groups" :key="g.id" class="mb-4">
            <div class="group-title">{{ g.label }}</div>
            <div class="tiles">
              <button
                v-for="p in g.providers"
                :key="p.id"
                type="button"
                class="tile"
                :class="{ 'tile--on': isActive(p.id) }"
                @click="!isActive(p.id) && openConnect(p.id)"
              >
                <v-icon :color="isActive(p.id) ? 'success' : 'primary'">
                  {{ isActive(p.id) ? "mdi-check-circle" : p.icon }}
                </v-icon>
                <div class="tile__name">{{ p.name }}</div>
                <div class="tile__hint">
                  {{ isActive(p.id) ? "Verbunden" : p.hint }}
                </div>
                <div v-if="iqMissing(p.id)" class="tile__warn">
                  {{ iqMissing(p.id) }} IQs nicht aktiviert.
                  <a @click.stop="activate(p.id)">aktivieren</a>
                </div>
              </button>
            </div>
          </div>
          <v-btn
            color="primary"
            depressed
            :disabled="!active.length"
            @click="step = 2"
          >
            Weiter
          </v-btn>
        </v-stepper-content>

        <!-- Schritt 2 -->
        <v-stepper-step
          :complete="items.length > 0 && step > 2"
          step="2"
          :editable="active.length > 0"
        >
          Zugangspunkte anlegen
          <small v-if="items.length">{{ items.length }} angelegt</small>
        </v-stepper-step>
        <v-stepper-content step="2">
          <p class="text-body-2 mb-4">
            Ein Zugangspunkt ist eine Tür oder eine Anlage, die Biletado öffnet.
            Legen Sie für jedes verbundene Schließsystem an, was buchbar sein
            soll.
          </p>
          <div v-for="p in active" :key="p.id" class="ap-block mb-3">
            <div class="d-flex align-center">
              <v-icon small class="mr-2">{{ p.icon }}</v-icon>
              <span class="font-weight-medium">{{ p.name }}</span>
              <v-spacer />
              <v-btn small text color="primary" @click="openCreate(p.id)">
                <v-icon left small>mdi-plus</v-icon>
                {{
                  p.fromProvider
                    ? "Aus der Liste übernehmen"
                    : `${p.noun} anlegen`
                }}
              </v-btn>
            </div>
            <div
              v-if="!accessPointsOf(p.id).length"
              class="text-caption text--secondary mt-1"
            >
              Noch keine {{ p.noun }} angelegt.
            </div>
            <div
              v-for="ap in accessPointsOf(p.id)"
              :key="ap.id"
              class="ap-line"
            >
              <v-icon x-small color="success" class="mr-2">mdi-check</v-icon>
              {{ ap.label }}
            </div>
          </div>
          <v-btn
            color="primary"
            depressed
            :disabled="!items.length"
            @click="step = 3"
          >
            Weiter
          </v-btn>
          <v-btn text @click="step = 1">Zurück</v-btn>
        </v-stepper-content>

        <!-- Schritt 3 -->
        <v-stepper-step step="3" :editable="items.length > 0">
          Buchungsobjekten zuordnen
          <small>Wer bucht, bekommt Zutritt</small>
        </v-stepper-step>
        <v-stepper-content step="3">
          <p class="text-body-2 mb-4">
            Wählen Sie je Zugangspunkt die Buchungsobjekte, deren Buchung ihn
            öffnet. Das geht später auch am Buchungsobjekt.
          </p>
          <div v-for="ap in items" :key="ap.id" class="assign-row">
            <div class="assign-row__label">
              <div class="font-weight-medium">{{ ap.label }}</div>
              <div class="text-caption text--secondary">
                {{ provider(ap.provider).name }}
              </div>
            </div>
            <v-autocomplete
              :value="ap.bookableIds"
              :items="bookableItems"
              multiple
              small-chips
              deletable-chips
              dense
              outlined
              hide-details
              placeholder="Buchungsobjekt wählen"
              class="assign-row__field"
              @change="setBookables(ap, $event)"
            />
          </div>
          <div class="mt-4">
            <v-btn color="primary" depressed @click="finish">Fertig</v-btn>
            <v-btn text @click="step = 2">Zurück</v-btn>
          </div>
        </v-stepper-content>
      </v-stepper>
    </div>

    <!-- ======================== Verwaltung ======================== -->
    <div v-else>
      <v-alert
        v-if="steps.length"
        type="warning"
        text
        border="left"
        class="mb-4"
      >
        <div class="d-flex align-center">
          <div>
            <div class="font-weight-medium">
              Einrichtung unvollständig: {{ steps.length }}
              {{ steps.length === 1 ? "Schritt" : "Schritte" }} offen
            </div>
            <div class="text-body-2">
              {{ steps.map((s) => s.text).join(" · ") }}
            </div>
          </div>
          <v-spacer />
          <v-btn color="warning" depressed small @click="resume">
            Einrichtung fortsetzen
          </v-btn>
        </div>
      </v-alert>

      <div class="systems-strip mb-4">
        <span class="text--secondary mr-3">Schließsysteme</span>
        <v-chip
          v-for="p in active"
          :key="p.id"
          small
          class="mr-2"
          :color="iqMissing(p.id) ? 'warning' : ''"
          outlined
          @click="startWizard(1)"
        >
          <v-icon left x-small :color="iqMissing(p.id) ? 'warning' : 'success'">
            {{ iqMissing(p.id) ? "mdi-alert-circle" : "mdi-check-circle" }}
          </v-icon>
          {{ p.name }}
        </v-chip>
        <v-spacer />
        <v-btn small text color="primary" @click="startWizard(1)">
          <v-icon left small>mdi-plus</v-icon>
          Schließsystem hinzufügen
        </v-btn>
      </div>

      <div class="d-flex align-center mb-2">
        <span class="text-body-2 text--secondary">
          {{ items.length }} Zugangspunkte
        </span>
        <v-spacer />
        <v-btn color="primary" depressed small @click="openCreate(null)">
          <v-icon left small>mdi-plus</v-icon>
          Zugangspunkt anlegen
        </v-btn>
      </div>
      <v-data-table
        :headers="headers"
        :items="items"
        hide-default-footer
        disable-pagination
        class="outlined"
      >
        <template #[`item.provider`]="{ item }">
          {{ provider(item.provider).name }}
        </template>
        <template #[`item.bookables`]="{ item }">
          <span v-if="item.bookableIds.length">
            {{ bookableNames(item).join(", ") }}
          </span>
          <a v-else class="warning--text" @click="startWizard(3)">
            <v-icon small color="warning">mdi-alert-circle-outline</v-icon>
            Zuordnen
          </a>
        </template>
        <template #[`item.actions`]="{ item }">
          <v-menu offset-y left>
            <template #activator="{ on }">
              <v-btn icon small v-on="on">
                <v-icon>mdi-dots-horizontal</v-icon>
              </v-btn>
            </template>
            <v-list dense>
              <v-list-item>Bearbeiten</v-list-item>
              <v-list-item v-if="item.qrRequired" @click="qr(item)">
                QR-Code drucken
              </v-list-item>
              <v-list-item>Löschen</v-list-item>
            </v-list>
          </v-menu>
        </template>
      </v-data-table>
    </div>

    <StubConnectDialog v-model="connectOpen" :provider-id="connectId" />
    <StubCreateDialog v-model="createOpen" :provider-id="createProvider" />
  </div>
</template>

<style scoped>
.wizard {
  background: transparent !important;
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-surface);
}

.group-title {
  font-size: var(--scb-font-size-sm);
  font-weight: var(--scb-font-weight-semibold);
  color: var(--scb-text-muted);
  margin-bottom: 6px;
}

.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 8px;
}

.tile {
  text-align: left;
  padding: 12px;
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-surface);
  background: var(--scb-surface);
  cursor: pointer;
}

.tile:hover {
  background: var(--scb-hover-tint);
}

.tile:focus-visible {
  outline: 2px solid var(--v-primary-base);
  outline-offset: 2px;
}

.tile--on {
  border-color: var(--v-success-base);
  cursor: default;
}

.tile__name {
  font-weight: var(--scb-font-weight-semibold);
  margin-top: 6px;
}

.tile__hint {
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}

.tile__warn {
  font-size: var(--scb-font-size-xs);
  color: var(--v-warning-base);
  margin-top: 4px;
}

.ap-block {
  padding: 10px 12px;
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-surface);
}

.ap-line {
  font-size: var(--scb-font-size-sm);
  padding: 2px 0 2px 24px;
}

.assign-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 0;
  border-bottom: 1px solid var(--scb-rule);
}

.assign-row__label {
  width: 240px;
  flex-shrink: 0;
}

.assign-row__field {
  flex: 1;
}

.systems-strip {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  font-size: var(--scb-font-size-sm);
}

.outlined {
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-surface);
}
</style>
