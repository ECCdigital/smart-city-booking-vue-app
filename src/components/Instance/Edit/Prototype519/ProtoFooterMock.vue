<template>
  <!-- PROTOTYPE (ECCdigital/tickets#519): eine Attrappe des Footers
       (`AppFooter.vue`) mit der Zeile der Logos über dem Copyright (#514).
       Dunkel ohne Variante steht ein Logo auf einer weißen Platte. -->
  <div class="proto-footer" :class="`proto-footer--${mode}`">
    <div v-if="logos.length" class="proto-footer__logos">
      <component
        :is="logo.link ? 'a' : 'span'"
        v-for="(logo, index) in logos"
        :key="logo.key"
        :href="logo.link || undefined"
        target="_blank"
        class="proto-footer__logo"
        :class="{
          'proto-footer__logo--plate': mode === 'dark' && !logo.imageDark,
          'proto-footer__logo--selected': selectable && index === selected,
        }"
        @click.prevent="selectable && $emit('select', index)"
      >
        <ProtoLogoImg
          :reference="mode === 'dark' && logo.imageDark ? logo.imageDark : logo.image"
          :height="Math.round(px(logo.size) * scale)"
        />
      </component>
      <slot name="after-logos" />
    </div>
    <div v-else-if="$slots['after-logos']" class="proto-footer__logos">
      <slot name="after-logos" />
    </div>
    <div class="proto-footer__bottom">
      <span>© 2026 {{ portalName || "Portal" }}</span>
      <span>Impressum · Datenschutz · Barrierefreiheit</span>
    </div>
  </div>
</template>

<script>
import ProtoLogoImg from "./ProtoLogoImg.vue";
import { FOOTER_LOGO_SIZES } from "./appearancePrototype";

export default {
  name: "ProtoFooterMock",
  components: { ProtoLogoImg },
  props: {
    logos: { type: Array, default: () => [] },
    mode: { type: String, default: "light" },
    portalName: { type: String, default: "" },
    // Die Attrappe ist kleiner als die Storefront; 1 heißt echte Pixel.
    scale: { type: Number, default: 1 },
    selectable: { type: Boolean, default: false },
    selected: { type: Number, default: -1 },
  },
  methods: {
    px(size) {
      const step = FOOTER_LOGO_SIZES.find((s) => s.value === size);
      return step ? step.px : 80;
    },
  },
};
</script>

<style scoped>
.proto-footer {
  border-radius: 6px;
  padding: 12px 14px 8px;
  font-size: 11px;
}

.proto-footer--light {
  background: #ffffff;
  color: #4b5563;
  border: 1px solid rgba(0, 0, 0, 0.12);
}

.proto-footer--dark {
  background: #111827;
  color: #d1d5db;
}

.proto-footer__logos {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  padding-bottom: 10px;
  margin-bottom: 8px;
  border-bottom: 1px solid rgba(127, 127, 127, 0.25);
}

.proto-footer__logo {
  display: inline-flex;
  border-radius: 4px;
  outline-offset: 3px;
}

.proto-footer__logo--plate {
  background: #ffffff;
  padding: 6px;
}

.proto-footer__logo--selected {
  outline: 2px solid #ff00aa;
}

.proto-footer__bottom {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
