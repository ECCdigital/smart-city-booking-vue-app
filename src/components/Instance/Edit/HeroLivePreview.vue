<template>
  <div class="hero-live-preview">
    <div class="hero-live-preview__toolbar d-flex align-center flex-wrap">
      <v-btn-toggle v-model="mode" mandatory dense class="mr-4">
        <v-btn small value="home">Startseite</v-btn>
        <v-btn small value="compact">Unterseite</v-btn>
      </v-btn-toggle>

      <v-btn-toggle v-model="colorMode" mandatory dense>
        <v-btn small value="light">Hell</v-btn>
        <v-btn small value="dark">Dunkel</v-btn>
      </v-btn-toggle>

      <v-spacer />

      <v-btn icon small title="Vorschau neu laden" @click="reload">
        <v-icon small>mdi-refresh</v-icon>
      </v-btn>
    </div>

    <!-- Without a Portal-URL there is no origin to post to, so there are no
         frames — the editor itself goes on editing and saving. -->
    <v-sheet
      v-if="!origin"
      color="accent"
      rounded
      class="hero-live-preview__notice text-body-2"
    >
      Portal-URL fehlt
    </v-sheet>

    <!-- The frames stay where they are: a frame that was merely slow still
         announces itself afterwards and clears this on its own. -->
    <v-alert
      v-else-if="unreachable"
      type="warning"
      text
      dense
      class="hero-live-preview__unreachable text-body-2"
    >
      <div class="d-flex align-center flex-wrap">
        <span class="flex-grow-1">
          Vorschau nicht erreichbar, Portal-URL und NUXT_ADMIN_BASE_URL prüfen
        </span>
        <v-btn small outlined @click="reload">
          <v-icon left small>mdi-refresh</v-icon>
          Erneut versuchen
        </v-btn>
      </div>
    </v-alert>

    <div
      v-if="origin"
      class="hero-live-preview__frames"
      :class="{ 'hero-live-preview__frames--stacked': stacked }"
    >
      <div
        v-for="frame in frames"
        :key="frame.viewport"
        class="hero-live-preview__frame"
        :data-viewport="frame.viewport"
      >
        <div class="hero-live-preview__bar d-flex align-center">
          <span class="text-caption text--secondary">{{ frame.label }}</span>
          <v-spacer />
          <!-- The warning summary of the Preview Report; ticket 10 fills it. -->
          <slot name="warnings" :viewport="frame.viewport" />
        </div>

        <div class="hero-live-preview__stage" :style="stageStyle(frame)">
          <iframe
            ref="frame"
            :key="frameKey"
            class="hero-live-preview__iframe"
            :src="frameSrc"
            :title="frame.title"
            :style="frameStyle(frame)"
          ></iframe>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import {
  HERO_PREVIEW_BLOCK_CLICK,
  HERO_PREVIEW_READY,
  HERO_PREVIEW_REPORT,
  HERO_PREVIEW_ZONE_CLICK,
  heroPreviewDraftMessage,
  heroPreviewFrameSrc,
  heroPreviewMessage,
  heroPreviewOrigin,
} from "@/utils/heroPreviewProtocol";

/**
 * The two frames, in the order they are shown. The desktop frame renders at a
 * fixed virtual width and is scaled down to what the panel offers; the mobile
 * frame is 375 px and is never scaled, so it is the width of a phone. The
 * Preview Report measures in the frame's own CSS px, which the scaling does
 * not touch (hero layout spec §3).
 */
const MOBILE_FRAME_WIDTH = 375;

const FRAMES = Object.freeze([
  {
    viewport: "desktop",
    label: "Desktop",
    title: "Vorschau des Kopfbereichs auf dem Desktop",
    width: 1280,
    height: 800,
    scalable: true,
  },
  {
    viewport: "mobile",
    label: "Mobilgeräte",
    title: "Vorschau des Kopfbereichs auf Mobilgeräten",
    width: MOBILE_FRAME_WIDTH,
    height: 720,
    scalable: false,
  },
]);

/**
 * What the editor hears when a frame reports something. `ready` is answered
 * here and is not one of them; the other three are the Preview Report and the
 * two clicks, which ticket 10 acts on.
 */
const INBOUND_EMITS = Object.freeze({
  [HERO_PREVIEW_REPORT]: (message) => ["report", message],
  [HERO_PREVIEW_ZONE_CLICK]: (message) => ["zone-click", message.zone],
  [HERO_PREVIEW_BLOCK_CLICK]: (message) => ["block-click", message.blockId],
});

/** Below this the panel is too narrow for two frames beside each other. */
const STACK_BELOW = 1100;

/** The gap between the two frames while they stand beside each other. */
const FRAME_GAP = 16;

/** How long a frame has to announce itself before the panel gives up. */
const READY_TIMEOUT = 10000;

/**
 * The Live Preview: the toolbar and the two storefront frames.
 *
 * The component owns the conversation with the frames and nothing else. The
 * Draft it posts is already resolved — the editor sends every change through
 * the backend's preview route and hands the answer down as `preview`, so a
 * frame never sees an unresolved Draft (hero layout spec §3).
 *
 * The origin of the Portal-URL is the only origin posted to and the only one
 * listened to, never `*`. Without a Portal-URL there are no frames at all and
 * the editor carries on without a preview.
 */
export default {
  name: "HeroLivePreview",
  props: {
    /** `instance.portalUrl`. Its origin is the frames' and the filter's. */
    portalUrl: { type: String, default: "" },
    /** The header's language toggle; it picks the localised preview route. */
    locale: { type: String, default: "de" },
    /**
     * The resolved Draft: `{ draftId, heroLayout, background, name }`, the
     * answer of the preview route. `null` while nothing has been resolved.
     */
    preview: { type: Object, default: null },
    /** The Block the form shows; the frames mark it and show its Zone. */
    selectedBlockId: { type: String, default: null },
  },
  data() {
    return {
      mode: "home",
      colorMode: "light",
      // Bumped by the reload button; part of the frames' key, so a click
      // recreates both elements and the storefront loads afresh.
      reloadToken: 0,
      unreachable: false,
      readyTimer: null,
      panelWidth: 0,
    };
  },
  computed: {
    frames() {
      return FRAMES;
    },
    origin() {
      return heroPreviewOrigin(this.portalUrl);
    },
    frameSrc() {
      return heroPreviewFrameSrc(this.portalUrl, {
        locale: this.locale,
        mode: this.mode,
      });
    },
    /**
     * Changing it replaces both `iframe` elements instead of navigating them,
     * so neither the view nor the locale nor a reload leaves an entry in the
     * admin's own history.
     */
    frameKey() {
      return `${this.frameSrc}#${this.reloadToken}`;
    },
    stacked() {
      return this.panelWidth > 0 && this.panelWidth < STACK_BELOW;
    },
  },
  watch: {
    // A new address is a fresh load, and with it a fresh wait for `ready`.
    frameKey() {
      this.armReadyTimer();
    },
    origin(origin) {
      if (origin) {
        this.armReadyTimer();
      } else {
        this.clearReadyTimer();
      }
    },
    // Every one of the three is part of the snapshot the frames are painted
    // from, and a snapshot is always complete.
    preview() {
      this.postDraft();
    },
    selectedBlockId() {
      this.postDraft();
    },
    colorMode() {
      this.postDraft();
    },
  },
  mounted() {
    window.addEventListener("message", this.onMessage);
    // The panel's width only changes with the window: the form column beside
    // it is a fixed 420 px and the dialog is full screen.
    window.addEventListener("resize", this.measure);
    this.measure();
    this.$nextTick(this.measure);
    if (this.origin) {
      this.armReadyTimer();
    }
  },
  beforeDestroy() {
    window.removeEventListener("message", this.onMessage);
    window.removeEventListener("resize", this.measure);
    this.clearReadyTimer();
  },
  methods: {
    /** Loads both frames again — after a failure, or on the author's word. */
    reload() {
      this.unreachable = false;
      this.reloadToken += 1;
      this.armReadyTimer();
    },
    measure() {
      this.panelWidth = this.$el ? this.$el.clientWidth : 0;
    },
    /**
     * What the desktop frame may take up. Beside the mobile frame that is the
     * panel minus its 375 px and the gap; stacked it is the whole panel.
     */
    availableFor(frame) {
      if (!frame.scalable) {
        return frame.width;
      }
      if (this.stacked || this.panelWidth === 0) {
        return this.panelWidth;
      }
      return this.panelWidth - MOBILE_FRAME_WIDTH - FRAME_GAP;
    },
    /** Never scaled up: 1280 px on a wider panel stay 1280 px. */
    scaleOf(frame) {
      const available = this.availableFor(frame);
      if (!frame.scalable || available <= 0) {
        return 1;
      }
      return Math.min(1, available / frame.width);
    },
    /**
     * The box the scaled frame occupies in the layout. A CSS transform leaves
     * the element's own size alone, so the stage carries the scaled size.
     */
    stageStyle(frame) {
      const scale = this.scaleOf(frame);
      return {
        width: `${Math.round(frame.width * scale)}px`,
        height: `${Math.round(frame.height * scale)}px`,
      };
    },
    frameStyle(frame) {
      return {
        width: `${frame.width}px`,
        height: `${frame.height}px`,
        transform: `scale(${this.scaleOf(frame)})`,
      };
    },
    armReadyTimer() {
      this.clearReadyTimer();
      this.readyTimer = setTimeout(() => {
        this.readyTimer = null;
        this.unreachable = true;
      }, READY_TIMEOUT);
    },
    clearReadyTimer() {
      if (this.readyTimer !== null) {
        clearTimeout(this.readyTimer);
        this.readyTimer = null;
      }
    },
    /**
     * The origin is the first filter and the protocol the second: a page
     * sharing the origin cannot drive the editor with a message of another
     * version or a type the storefront does not send.
     */
    onMessage(event) {
      if (!this.origin || event.origin !== this.origin) {
        return;
      }
      const message = heroPreviewMessage(event.data);
      if (!message) {
        return;
      }

      if (message.type === HERO_PREVIEW_READY) {
        this.onReady(event.source);
        return;
      }

      const [emitName, argument] = INBOUND_EMITS[message.type](message);
      this.$emit(emitName, argument);
    },
    /**
     * A frame that has just mounted gets the current Draft, so a reload —
     * the author's, or the one a view or locale switch causes — recovers on
     * its own without the editor keeping track of who has seen what.
     */
    onReady(source) {
      this.clearReadyTimer();
      this.unreachable = false;
      this.postDraftTo(source);
    },
    /** The current snapshot, to both frames. */
    postDraft() {
      this.frameWindows().forEach((frame) => this.postDraftTo(frame));
    },
    postDraftTo(target) {
      if (!target || !this.origin || !this.preview) {
        return;
      }
      target.postMessage(
        heroPreviewDraftMessage({
          preview: this.preview,
          selectedBlockId: this.selectedBlockId,
          colorMode: this.colorMode,
        }),
        this.origin
      );
    },
    frameWindows() {
      const frames = [].concat(this.$refs.frame || []);
      return frames.map((el) => el.contentWindow).filter(Boolean);
    },
  },
};
</script>

<style scoped>
.hero-live-preview__toolbar {
  gap: 8px;
  margin-bottom: 16px;
}

.hero-live-preview__notice {
  padding: 24px;
  text-align: center;
}

.hero-live-preview__frames {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.hero-live-preview__frames--stacked {
  flex-direction: column;
}

.hero-live-preview__bar {
  margin-bottom: 4px;
  min-height: 24px;
}

/*
 * The stage carries the size the scaled frame takes up in the layout: a CSS
 * transform paints smaller but leaves the element's own box alone, so without
 * it the desktop frame would reserve its full 1280 px.
 */
.hero-live-preview__stage {
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 4px;
  background-color: #fff;
}

/* The frame's edge is ink on a light sheet; on a dark one it has to be light,
   or the two frames run into the page. What the frame itself paints is the
   portal's, so the sheet behind it stays white either way. */
.theme--dark .hero-live-preview__stage {
  border-color: rgba(255, 255, 255, 0.2);
}

.hero-live-preview__iframe {
  display: block;
  border: 0;
  transform-origin: top left;
}
</style>
