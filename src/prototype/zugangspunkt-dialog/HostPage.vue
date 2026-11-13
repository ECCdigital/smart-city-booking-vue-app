<script>
/**
 * PROTOTYPE (tickets#1085) — host page: Variante C of tickets#1084, with the
 * dialog under review in place of the stubs for Anlegen and Bearbeiten.
 *
 * Was: PROTOTYPE (tickets#1084) — Variante C: Eine Seite, nach Schließsystem
 * gegliedert, mit dem Stand der Einrichtung oben.
 *
 * Keine Reiter. Jedes verbundene Schließsystem ist ein Abschnitt mit seinen
 * Zugangspunkten darunter. Was fehlt, steht dort, wo es fehlt. Oben zeigt
 * ein Streifen den Stand der drei Schritte, solange etwas offen ist. Ist
 * alles erledigt, schrumpft er auf eine Zeile. Zuordnen passiert hier in
 * der Zeile des Zugangspunkts.
 */
import {
  store,
  GROUPS,
  PROVIDERS,
  provider,
  activeProviders,
  inactiveProviders,
  accessPointsOf,
  iqMissing,
  activateIqs,
  bookableNames,
  stages,
  stub,
} from "../zugangspunkte-fuehrung/data";
import StubConnectDialog from "../zugangspunkte-fuehrung/StubConnectDialog.vue";
import AssignDialog from "../zugangspunkte-fuehrung/AssignDialog.vue";

export default {
  name: "HostPage",
  components: { StubConnectDialog, AssignDialog },
  props: {
    // The dialog variant: props value, providerId, accessPoint; emits created, saved.
    dialog: { type: Object, required: true },
  },
  data() {
    return {
      connectOpen: false,
      connectId: null,
      createOpen: false,
      createProvider: null,
      editAp: null,
      assignOpen: false,
      assignAp: null,
      fresh: null,
    };
  },
  computed: {
    active() {
      return activeProviders();
    },
    inactive() {
      return inactiveProviders();
    },
    groups() {
      return GROUPS.map((g) => ({
        ...g,
        providers: PROVIDERS.filter((p) => p.group === g.id),
      }));
    },
    stageList() {
      return stages();
    },
    allDone() {
      return this.stageList.every((s) => s.done);
    },
    items() {
      return store.accessPoints;
    },
  },
  methods: {
    provider,
    iqMissing,
    accessPointsOf,
    bookableNames,
    iqTotal(id) {
      return store.systems[id]?.iqTotal || 0;
    },
    openConnect(id) {
      this.connectId = id;
      this.connectOpen = true;
    },
    openCreate(providerId) {
      this.editAp = null;
      this.createProvider = providerId;
      this.createOpen = true;
    },
    onCreated(ap) {
      this.fresh = ap.id;
    },
    openAssign(ap) {
      this.assignAp = ap;
      this.assignOpen = true;
    },
    onAssigned(ap) {
      if (this.fresh === ap.id && ap.bookableIds.length) this.fresh = null;
    },
    activate(id) {
      activateIqs(id);
      stub("Stub: würde den Assistenten „IQ-Aktivierung“ je IQ öffnen.");
    },
    qr(ap) {
      stub(`Stub: QR-Code für „${ap.label}“ als PDF.`);
    },
    edit(ap) {
      this.editAp = ap;
      this.createProvider = ap.provider;
      this.createOpen = true;
    },
    onSaved(ap) {
      stub(`Gespeichert: „${ap.label}“ (nur im Speicher des Prototyps).`);
    },
  },
};
</script>

<template>
  <div>
    <!-- ================= Leer: noch nichts verbunden ================= -->
    <div v-if="!active.length" class="start">
      <div class="text-h6">Welche Schlösser nutzt der Mandant?</div>
      <p class="text-body-2 text--secondary mt-1 mb-5">
        Verbinden Sie zuerst ein Schließsystem. Danach legen Sie seine Türen und
        Anlagen an und ordnen sie Buchungsobjekten zu. Wer bucht, öffnet dann
        mit seiner Buchung.
      </p>
      <div class="start__groups">
        <div v-for="g in groups" :key="g.id">
          <div class="group-title">{{ g.label }}</div>
          <div class="pick-list">
            <div v-for="p in g.providers" :key="p.id" class="pick-row">
              <v-icon class="mr-3" color="primary">{{ p.icon }}</v-icon>
              <div class="flex-grow-1">
                <div class="font-weight-medium">{{ p.name }}</div>
                <div class="text-caption text--secondary">{{ p.hint }}</div>
              </div>
              <v-btn small outlined color="primary" @click="openConnect(p.id)">
                Verbinden
              </v-btn>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template v-else>
      <!-- ================= Stand der Einrichtung ================= -->
      <div v-if="!allDone" class="stages mb-6">
        <div
          v-for="(s, i) in stageList"
          :key="s.key"
          class="stage"
          :class="{ 'stage--done': s.done, 'stage--open': !s.done }"
        >
          <div class="stage__num">
            <v-icon v-if="s.done" small color="white">mdi-check</v-icon>
            <span v-else>{{ i + 1 }}</span>
          </div>
          <div>
            <div class="stage__title">{{ s.title }}</div>
            <div class="stage__summary">{{ s.summary }}</div>
          </div>
        </div>
      </div>
      <div v-else class="done-line mb-6">
        <v-icon small color="success" class="mr-2">mdi-check-circle</v-icon>
        Eingerichtet: {{ active.length }} Schließsysteme,
        {{ items.length }} Zugangspunkte, alle einem Buchungsobjekt zugeordnet.
      </div>

      <!-- ================= Je Schließsystem ================= -->
      <section v-for="p in active" :key="p.id" class="system mb-5">
        <header class="system__head">
          <v-icon class="mr-2" color="primary">{{ p.icon }}</v-icon>
          <span class="system__name">{{ p.name }}</span>
          <v-chip x-small color="success" text-color="white" class="ml-3">
            Verbunden
          </v-chip>
          <v-spacer />
          <v-btn small text @click="openConnect(p.id)">
            <v-icon left small>mdi-cog-outline</v-icon>
            Einstellungen
          </v-btn>
          <v-btn small depressed color="primary" @click="openCreate(p.id)">
            <v-icon left small>mdi-plus</v-icon>
            {{
              p.fromProvider ? "Aus der Liste übernehmen" : `${p.noun} anlegen`
            }}
          </v-btn>
        </header>

        <div v-if="iqMissing(p.id)" class="system__issue">
          <v-icon small color="warning" class="mr-2">mdi-alert-circle</v-icon>
          <span>
            {{ iqMissing(p.id) }} von {{ iqTotal(p.id) }} IQs nicht aktiviert.
            Türen an diesen IQs öffnen noch nicht.
          </span>
          <v-spacer />
          <v-btn x-small outlined color="warning" @click="activate(p.id)">
            IQs aktivieren
          </v-btn>
        </div>

        <div v-if="!accessPointsOf(p.id).length" class="system__empty">
          Noch keine {{ p.noun }}.
          {{
            p.fromProvider
              ? "Übernehmen Sie die Anlagen aus der Liste von " + p.name + "."
              : "Legen Sie die erste an."
          }}
        </div>

        <div
          v-for="ap in accessPointsOf(p.id)"
          :key="ap.id"
          class="ap"
          :class="{ 'ap--fresh': fresh === ap.id }"
        >
          <div class="ap__main">
            <div class="ap__label">
              {{ ap.label }}
              <span v-if="ap.compartments" class="text--secondary">
                · {{ ap.compartments }} Fächer
              </span>
            </div>
            <div v-if="fresh === ap.id" class="ap__next">
              Angelegt. Als Nächstes:
              {{ ap.qrRequired ? "QR-Code drucken und " : "" }}einem
              Buchungsobjekt zuordnen.
            </div>
          </div>
          <div class="ap__bookables">
            <template v-if="ap.bookableIds.length">
              <v-chip
                v-for="name in bookableNames(ap)"
                :key="name"
                x-small
                class="mr-1"
                @click="openAssign(ap)"
              >
                {{ name }}
              </v-chip>
            </template>
            <v-btn
              v-else
              x-small
              outlined
              color="warning"
              @click="openAssign(ap)"
            >
              <v-icon left x-small>mdi-link-variant</v-icon>
              Buchungsobjekt zuordnen
            </v-btn>
          </div>
          <div class="ap__actions">
            <v-btn
              v-if="ap.qrRequired"
              icon
              small
              title="QR-Code drucken"
              @click="qr(ap)"
            >
              <v-icon small>mdi-qrcode</v-icon>
            </v-btn>
            <v-btn icon small title="Bearbeiten" @click="edit(ap)">
              <v-icon small>mdi-pencil-outline</v-icon>
            </v-btn>
            <v-btn icon small title="Weitere Aktionen">
              <v-icon small>mdi-dots-horizontal</v-icon>
            </v-btn>
          </div>
        </div>
      </section>

      <!-- ================= Weitere Schließsysteme ================= -->
      <div v-if="inactive.length" class="more">
        <span class="text--secondary mr-3"
          >Weiteres Schließsystem verbinden:</span
        >
        <v-chip
          v-for="p in inactive"
          :key="p.id"
          small
          outlined
          class="mr-2 mb-1"
          @click="openConnect(p.id)"
        >
          <v-icon left x-small>mdi-plus</v-icon>
          {{ p.name }}
        </v-chip>
      </div>
    </template>

    <StubConnectDialog v-model="connectOpen" :provider-id="connectId" />
    <component
      :is="dialog"
      v-model="createOpen"
      :provider-id="createProvider"
      :access-point="editAp"
      @created="onCreated"
      @saved="onSaved"
    />
    <AssignDialog
      v-model="assignOpen"
      :access-point="assignAp"
      @assigned="onAssigned"
    />
  </div>
</template>

<style scoped>
.start p {
  max-width: 62ch;
}

.start__groups {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

.group-title {
  font-size: var(--scb-font-size-sm);
  font-weight: var(--scb-font-weight-semibold);
  color: var(--scb-text-muted);
  margin-bottom: 6px;
}

.pick-list {
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-surface);
}

.pick-row {
  display: flex;
  align-items: center;
  padding: 12px 16px;
}

.pick-row + .pick-row {
  border-top: 1px solid var(--scb-rule);
}

/* Stand der Einrichtung: a real sequence, so the numbers carry meaning. */
.stages {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-surface);
  overflow: hidden;
}

.stage {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
}

.stage + .stage {
  border-left: 1px solid var(--scb-rule-strong);
}

.stage__num {
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--scb-font-size-sm);
  font-weight: var(--scb-font-weight-semibold);
  border: 2px solid var(--v-primary-base);
  color: var(--v-primary-base);
}

.stage--done .stage__num {
  background: var(--v-success-base);
  border-color: var(--v-success-base);
}

.stage--open {
  background: var(--scb-surface-tint);
}

.stage__title {
  font-weight: var(--scb-font-weight-semibold);
  font-size: var(--scb-font-size-sm);
}

.stage__summary {
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}

.done-line {
  display: flex;
  align-items: center;
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text-muted);
}

.system {
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-surface);
}

.system__head {
  display: flex;
  align-items: center;
  padding: 10px 12px 10px 16px;
  background: var(--scb-surface-tint);
  border-bottom: 1px solid var(--scb-rule-strong);
}

.system__name {
  font-size: var(--scb-font-size-header);
  font-weight: var(--scb-font-weight-semibold);
}

.system__issue {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  font-size: var(--scb-font-size-sm);
  background: var(--scb-warning-tint);
}

.system__empty {
  padding: 16px;
  font-size: var(--scb-font-size-sm);
  color: var(--scb-text-muted);
}

.ap {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 12px 10px 16px;
}

.ap + .ap {
  border-top: 1px solid var(--scb-rule);
}

.ap--fresh {
  background: var(--scb-selected-tint-faint);
  box-shadow: inset 3px 0 0 var(--v-primary-base);
}

.ap__main {
  flex: 1;
  min-width: 0;
}

.ap__label {
  font-size: var(--scb-font-size-sm);
  font-weight: var(--scb-font-weight-medium);
}

.ap__next {
  font-size: var(--scb-font-size-xs);
  color: var(--v-primary-base);
  margin-top: 2px;
}

.ap__bookables {
  flex: 1;
  min-width: 0;
}

.ap__actions {
  flex-shrink: 0;
}

.more {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  font-size: var(--scb-font-size-sm);
}

@media (max-width: 760px) {
  .stages {
    grid-template-columns: 1fr;
  }

  .stage + .stage {
    border-left: 0;
    border-top: 1px solid var(--scb-rule-strong);
  }

  .ap {
    flex-wrap: wrap;
  }
}
</style>
