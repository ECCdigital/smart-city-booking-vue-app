<script>
/**
 * PROTOTYPE (tickets#1087) — die Seite aus tickets#1084 (Variante C): ein
 * Abschnitt je Schließsystem, oben der Stand der Einrichtung. Hier mit dem
 * Zustand der Verbindung im Kopf jedes Abschnitts (Verbunden, Nicht geprüft,
 * Gestört, Ausgeschaltet).
 *
 * Die Varianten hängen sich über Events (connect, settings, iqs, resume) und
 * Slots (head-actions, below-head, iq-row, draft) ein.
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
  bookableNames,
  stages,
  stub,
} from "../zugangspunkte-fuehrung/data";
import StubCreateDialog from "../zugangspunkte-fuehrung/StubCreateDialog.vue";
import AssignDialog from "../zugangspunkte-fuehrung/AssignDialog.vue";
import { connection, STATUS_CHIP } from "./connections";

export default {
  name: "SystemsPage",
  components: { StubCreateDialog, AssignDialog },
  props: {
    drafts: { type: Array, default: () => [] },
    fresh: { type: String, default: null },
    settingsLabel: { type: String, default: "Einstellungen" },
  },
  data() {
    return {
      createOpen: false,
      createProvider: null,
      assignOpen: false,
      assignAp: null,
      freshAp: null,
    };
  },
  computed: {
    active() {
      return activeProviders();
    },
    draftProviders() {
      return this.drafts
        .filter((id) => !store.systems[id]?.active)
        .map((id) => provider(id));
    },
    inactive() {
      return inactiveProviders().filter((p) => !this.drafts.includes(p.id));
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
    state(id) {
      const c = connection(id);
      if (!c) return "ok";
      if (c.paused) return "paused";
      return c.status;
    },
    chip(id) {
      return STATUS_CHIP[this.state(id)];
    },
    lastError(id) {
      return connection(id)?.lastError;
    },
    openCreate(providerId) {
      this.createProvider = providerId;
      this.createOpen = true;
    },
    onCreated(ap) {
      this.freshAp = ap.id;
    },
    openAssign(ap) {
      this.assignAp = ap;
      this.assignOpen = true;
    },
    onAssigned(ap) {
      if (this.freshAp === ap.id && ap.bookableIds.length) this.freshAp = null;
    },
    qr(ap) {
      stub(`Stub: QR-Code für „${ap.label}“ als PDF.`);
    },
    edit(ap) {
      stub(`Stub: Dialog „${ap.label}“ bearbeiten (tickets#1085).`);
    },
  },
};
</script>

<template>
  <div>
    <!-- ================= Leer: noch nichts verbunden ================= -->
    <div v-if="!active.length && !draftProviders.length" class="start">
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
              <v-btn
                small
                outlined
                color="primary"
                @click="$emit('connect', p.id)"
              >
                Verbinden
              </v-btn>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template v-else>
      <!-- ================= Stand der Einrichtung ================= -->
      <template v-if="active.length">
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
          {{ items.length }} Zugangspunkte, alle einem Buchungsobjekt
          zugeordnet.
        </div>
      </template>

      <!-- ================= Entwürfe (Variante B) ================= -->
      <section
        v-for="p in draftProviders"
        :key="`draft-${p.id}`"
        class="system system--draft mb-5"
      >
        <header class="system__head">
          <v-icon class="mr-2" color="primary">{{ p.icon }}</v-icon>
          <span class="system__name">{{ p.name }}</span>
          <v-chip x-small outlined class="ml-3">Nicht verbunden</v-chip>
          <v-spacer />
          <slot name="draft-actions" :p="p" />
        </header>
        <slot name="draft" :p="p" />
      </section>

      <!-- ================= Je Schließsystem ================= -->
      <section
        v-for="p in active"
        :key="p.id"
        class="system mb-5"
        :class="{
          'system--paused': state(p.id) === 'paused',
          'system--fresh': fresh === p.id,
        }"
      >
        <header class="system__head">
          <v-icon class="mr-2" color="primary">{{ p.icon }}</v-icon>
          <span class="system__name">{{ p.name }}</span>
          <v-chip
            x-small
            :color="chip(p.id).color"
            :text-color="chip(p.id).dark ? 'white' : undefined"
            class="ml-3"
          >
            {{ chip(p.id).text }}
          </v-chip>
          <v-spacer />
          <slot name="head-actions" :p="p" :state="state(p.id)">
            <v-btn small text @click="$emit('settings', p.id)">
              <v-icon left small>mdi-cog-outline</v-icon>
              {{ settingsLabel }}
            </v-btn>
          </slot>
          <v-btn
            small
            depressed
            color="primary"
            :disabled="state(p.id) === 'paused'"
            @click="openCreate(p.id)"
          >
            <v-icon left small>mdi-plus</v-icon>
            {{
              p.fromProvider ? "Aus der Liste übernehmen" : `${p.noun} anlegen`
            }}
          </v-btn>
        </header>

        <div v-if="fresh === p.id" class="system__note system__note--fresh">
          <v-icon small color="primary" class="mr-2">mdi-check-circle</v-icon>
          <span>
            {{ p.name }} ist verbunden. Als Nächstes:
            <template v-if="iqMissing(p.id)">IQs aktivieren, dann </template>
            {{
              p.fromProvider
                ? "die Anlagen aus der Liste übernehmen."
                : `die erste ${p.noun} anlegen.`
            }}
          </span>
        </div>

        <div
          v-if="state(p.id) === 'paused'"
          class="system__note system__note--paused"
        >
          <v-icon small class="mr-2">mdi-power-plug-off-outline</v-icon>
          <span>
            Ausgeschaltet. Seine {{ p.nounPlural }} öffnen nicht, bis Sie es
            wieder einschalten. Zugangsdaten und Zuordnungen bleiben.
          </span>
          <v-spacer />
          <v-btn x-small outlined @click="$emit('resume', p.id)"
            >Einschalten</v-btn
          >
        </div>

        <div
          v-else-if="state(p.id) === 'error'"
          class="system__note system__note--error"
        >
          <v-icon small color="error" class="mr-2">mdi-alert-octagon</v-icon>
          <span>
            Letzte Prüfung gescheitert: {{ lastError(p.id) }}
            {{ p.nounPlural }} öffnen vermutlich nicht.
          </span>
          <v-spacer />
          <v-btn
            x-small
            outlined
            color="error"
            @click="$emit('settings', p.id)"
          >
            Zugangsdaten prüfen
          </v-btn>
        </div>

        <slot name="below-head" :p="p" />

        <slot name="iq-row" :p="p">
          <div v-if="iqMissing(p.id)" class="system__note system__note--warn">
            <v-icon small color="warning" class="mr-2">mdi-alert-circle</v-icon>
            <span>
              {{ iqMissing(p.id) }} von {{ iqTotal(p.id) }} IQs nicht aktiviert.
              Türen an diesen IQs öffnen noch nicht.
            </span>
            <v-spacer />
            <v-btn x-small outlined color="warning" @click="$emit('iqs', p.id)">
              IQs aktivieren
            </v-btn>
          </div>
        </slot>

        <div v-if="!accessPointsOf(p.id).length" class="system__empty">
          Noch keine {{ p.nounPlural }}.
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
          :class="{ 'ap--fresh': freshAp === ap.id }"
        >
          <div class="ap__main">
            <div class="ap__label">
              {{ ap.label }}
              <span v-if="ap.compartments" class="text--secondary">
                · {{ ap.compartments }} Fächer
              </span>
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
          @click="$emit('connect', p.id)"
        >
          <v-icon left x-small>mdi-plus</v-icon>
          {{ p.name }}
        </v-chip>
      </div>
    </template>

    <StubCreateDialog
      v-model="createOpen"
      :provider-id="createProvider"
      @created="onCreated"
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
  overflow: hidden;
}

.system--draft {
  border-style: dashed;
  border-color: var(--v-primary-base);
}

.system--fresh {
  border-color: var(--v-primary-base);
}

.system--paused .ap,
.system--paused .system__empty {
  opacity: 0.55;
}

.system__head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 0;
  padding: 10px 12px 10px 16px;
  background: var(--scb-surface-tint);
  border-bottom: 1px solid var(--scb-rule-strong);
}

.system__name {
  font-size: var(--scb-font-size-header);
  font-weight: var(--scb-font-weight-semibold);
}

.system__note {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  font-size: var(--scb-font-size-sm);
}

.system__note--warn {
  background: var(--scb-warning-tint);
}

.system__note--error {
  background: var(--scb-error-tint, rgba(244, 67, 54, 0.08));
}

.system__note--paused {
  background: var(--scb-surface-tint);
  color: var(--scb-text-muted);
}

.system__note--fresh {
  background: var(--scb-selected-tint-faint);
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

.ap + .ap,
.system__note + .ap {
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
