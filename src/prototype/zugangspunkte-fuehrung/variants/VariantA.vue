<script>
/**
 * PROTOTYPE (tickets#1084) — Variante A: Zwei Reiter wie heute, mit Wegweisern.
 *
 * Kleinster Eingriff. Die Seite öffnet auf dem Reiter, in dem der nächste
 * Schritt liegt. Leere Zustände sagen, was fehlt, und führen hin. Nach dem
 * Anlegen steht der nächste Schritt über der Liste. Zuordnen passiert
 * weiter am Buchungsobjekt: Die Seite verweist dorthin.
 */
import {
  store,
  GROUPS,
  PROVIDERS,
  BOOKABLES,
  provider,
  activeProviders,
  iqMissing,
  activateIqs,
  bookableNames,
  stub,
} from "../data";
import StubConnectDialog from "../StubConnectDialog.vue";
import StubCreateDialog from "../StubCreateDialog.vue";

export default {
  name: "VariantA",
  components: { StubConnectDialog, StubCreateDialog },
  data() {
    return {
      tab: activeProviders().length ? 0 : 1,
      connectOpen: false,
      connectId: null,
      createOpen: false,
      createProvider: null,
      justConnected: null,
      justCreated: null,
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
    unassigned() {
      return this.items.filter((ap) => ap.bookableIds.length === 0).length;
    },
    iqTotalMissing() {
      return this.active.reduce((n, p) => n + iqMissing(p.id), 0);
    },
    headers() {
      return [
        { text: "Bezeichnung", value: "label" },
        { text: "Schließsystem", value: "provider" },
        { text: "Buchungsobjekte", value: "bookables", sortable: false },
        { text: "", value: "actions", sortable: false, align: "end" },
      ];
    },
    firstActive() {
      return this.active[0];
    },
    bookables() {
      return BOOKABLES;
    },
  },
  methods: {
    provider,
    iqMissing,
    bookableNames,
    isActive(id) {
      return store.systems[id]?.active;
    },
    openConnect(id) {
      this.connectId = id;
      this.connectOpen = true;
    },
    onConnected(id) {
      this.justConnected = id;
    },
    openCreate(providerId = null) {
      this.createProvider = providerId;
      this.createOpen = true;
    },
    onCreated(ap) {
      this.justCreated = ap;
    },
    activate(id) {
      activateIqs(id);
      stub("Stub: würde den Assistenten „IQ-Aktivierung“ je IQ öffnen.");
    },
    gotoBookable(b) {
      stub(
        `Stub: öffnet „${b.name}“ im Reiter „Schließsysteme“ des Buchungsobjekts, auch ohne Expertenoption.`
      );
    },
    qr(ap) {
      stub(`Stub: QR-Code für „${ap.label}“ als PDF.`);
    },
  },
};
</script>

<template>
  <div>
    <v-tabs v-model="tab" class="mb-4">
      <v-tab style="text-transform: none">
        <v-icon left small>mdi-door-closed-lock</v-icon>
        Zugangspunkte
        <v-chip v-if="unassigned" x-small color="warning" class="ml-2">
          {{ unassigned }} ohne Buchungsobjekt
        </v-chip>
      </v-tab>
      <v-tab style="text-transform: none">
        <v-icon left small>mdi-lock</v-icon>
        Schließsysteme
        <v-chip v-if="!active.length" x-small color="primary" class="ml-2">
          Hier beginnen
        </v-chip>
        <v-chip v-else-if="iqTotalMissing" x-small color="warning" class="ml-2">
          {{ iqTotalMissing }} IQs offen
        </v-chip>
      </v-tab>
    </v-tabs>

    <v-tabs-items v-model="tab" class="transparent">
      <!-- Reiter Zugangspunkte -->
      <v-tab-item>
        <div v-if="!active.length" class="empty">
          <v-icon size="48" color="grey lighten-1">mdi-lock-off-outline</v-icon>
          <div class="text-h6 mt-3">Noch kein Schließsystem verbunden</div>
          <p class="text-body-2 text--secondary mt-1">
            Jeder Zugangspunkt gehört zu einem Schließsystem, etwa Nuki oder
            Open Locker. Verbinden Sie zuerst eins.
          </p>
          <v-btn color="primary" depressed @click="tab = 1">
            Schließsystem verbinden
          </v-btn>
        </div>

        <div v-else-if="!items.length" class="empty">
          <v-icon size="48" color="grey lighten-1">{{
            firstActive.icon
          }}</v-icon>
          <div class="text-h6 mt-3">
            {{ active.map((p) => p.name).join(" und ") }}
            {{ active.length > 1 ? "sind" : "ist" }} verbunden
          </div>
          <p class="text-body-2 text--secondary mt-1">
            Legen Sie jetzt die erste {{ firstActive.noun }} an. Danach ordnen
            Sie sie einem Buchungsobjekt zu.
          </p>
          <v-btn color="primary" depressed @click="openCreate()">
            {{ firstActive.noun }} anlegen
          </v-btn>
        </div>

        <template v-else>
          <v-alert
            v-if="justCreated"
            type="success"
            text
            dismissible
            class="mb-4"
            @input="justCreated = null"
          >
            <div class="font-weight-medium">
              „{{ justCreated.label }}“ ist angelegt.
            </div>
            <div class="mt-1">
              Als Nächstes:
              <a
                v-if="justCreated.qrRequired"
                class="primary--text"
                @click="qr(justCreated)"
              >
                QR-Code drucken
              </a>
              <span v-if="justCreated.qrRequired"> und </span>
              am Buchungsobjekt zuordnen, siehe Spalte „Buchungsobjekte“.
            </div>
          </v-alert>

          <div class="d-flex align-center mb-2">
            <span class="text-body-2 text--secondary">
              {{ items.length }} Zugangspunkte
            </span>
            <v-spacer />
            <v-btn color="primary" depressed small @click="openCreate()">
              <v-icon left small>mdi-plus</v-icon>
              Zugangspunkt anlegen
            </v-btn>
          </div>

          <v-data-table
            :headers="headers"
            :items="items"
            hide-default-footer
            disable-pagination
            class="outlined-table"
          >
            <template #[`item.provider`]="{ item }">
              {{ provider(item.provider).name }}
              <div
                v-if="item.iqActive === false"
                class="text-caption warning--text"
              >
                IQ nicht aktiviert
              </div>
            </template>
            <template #[`item.bookables`]="{ item }">
              <span v-if="item.bookableIds.length">
                {{ bookableNames(item).join(", ") }}
              </span>
              <span v-else class="d-inline-flex align-center">
                <v-icon small color="warning" class="mr-1">
                  mdi-alert-circle-outline
                </v-icon>
                <span class="warning--text mr-2">Keinem zugeordnet</span>
                <v-menu offset-y>
                  <template #activator="{ on }">
                    <a class="primary--text" v-on="on"
                      >Am Buchungsobjekt zuordnen</a
                    >
                  </template>
                  <v-list dense>
                    <v-subheader>Buchungsobjekt öffnen</v-subheader>
                    <v-list-item
                      v-for="b in bookables"
                      :key="b.id"
                      @click="gotoBookable(b)"
                    >
                      <v-list-item-title>
                        {{ b.name }}
                        <span class="text--secondary">{{ b.place }}</span>
                      </v-list-item-title>
                      <v-icon small>mdi-open-in-new</v-icon>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </span>
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
        </template>
      </v-tab-item>

      <!-- Reiter Schließsysteme -->
      <v-tab-item>
        <v-alert v-if="!active.length" type="info" text class="mb-4">
          Verbinden Sie zuerst ein Schließsystem. Danach legen Sie im Reiter
          „Zugangspunkte“ seine Türen und Anlagen an.
        </v-alert>
        <v-alert
          v-else-if="justConnected"
          type="success"
          text
          dismissible
          class="mb-4"
          @input="justConnected = null"
        >
          {{ provider(justConnected).name }} ist verbunden.
          <a class="primary--text" @click="(tab = 0), (justConnected = null)">
            Weiter zu den Zugangspunkten
          </a>
        </v-alert>

        <div v-for="g in groups" :key="g.id" class="mb-6">
          <div class="group-title">{{ g.label }}</div>
          <div class="provider-list">
            <div v-for="p in g.providers" :key="p.id" class="provider-row">
              <v-icon class="mr-3" :color="isActive(p.id) ? 'primary' : ''">
                {{ p.icon }}
              </v-icon>
              <div class="flex-grow-1">
                <div class="font-weight-medium">{{ p.name }}</div>
                <div class="text-caption text--secondary">{{ p.hint }}</div>
                <div
                  v-if="iqMissing(p.id)"
                  class="text-caption warning--text mt-1"
                >
                  {{ iqMissing(p.id) }} IQs nicht aktiviert.
                  <a @click="activate(p.id)">Jetzt aktivieren</a>
                </div>
              </div>
              <v-chip
                small
                :color="isActive(p.id) ? 'success' : ''"
                :outlined="!isActive(p.id)"
                class="mr-3"
              >
                {{ isActive(p.id) ? "Verbunden" : "Nicht verbunden" }}
              </v-chip>
              <v-btn
                v-if="isActive(p.id)"
                small
                text
                @click="openConnect(p.id)"
              >
                Einstellungen
              </v-btn>
              <v-btn
                v-else
                small
                outlined
                color="primary"
                @click="openConnect(p.id)"
              >
                Verbinden
              </v-btn>
            </div>
          </div>
        </div>
      </v-tab-item>
    </v-tabs-items>

    <StubConnectDialog
      v-model="connectOpen"
      :provider-id="connectId"
      @connected="onConnected"
    />
    <StubCreateDialog
      v-model="createOpen"
      :provider-id="createProvider"
      @created="onCreated"
    />
  </div>
</template>

<style scoped>
.empty {
  text-align: center;
  padding: 48px 16px;
  border: 1px dashed var(--scb-surface-border);
  border-radius: var(--scb-radius-surface);
}

.empty p {
  max-width: 44ch;
  margin-left: auto;
  margin-right: auto;
}

.group-title {
  font-size: var(--scb-font-size-sm);
  font-weight: var(--scb-font-weight-semibold);
  color: var(--scb-text-muted);
  margin-bottom: 6px;
}

.provider-list,
.outlined-table {
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-surface);
}

.provider-row {
  display: flex;
  align-items: center;
  padding: 12px 16px;
}

.provider-row + .provider-row {
  border-top: 1px solid var(--scb-rule);
}
</style>
