<template>
  <!-- PROTOTYPE (ECCdigital/tickets#519): eine Attrappe der Kopfleiste der
       Storefront (`NavigationBar.vue`), Farben nach #517. -->
  <div
    class="proto-header"
    :style="{ background: c.bg, color: c.fg }"
    :class="{ 'proto-header--neutral-light': header === 'neutral' && mode === 'light' }"
  >
    <ProtoAppLogo
      :logo="logo"
      :logo-dark="logoDark"
      :mode="mode"
      :height="compact ? 18 : 24"
    />
    <span v-if="!compact" class="proto-header__name">{{ portalName || "Portal" }}</span>
    <span class="proto-header__nav">
      <span class="proto-header__tab proto-header__tab--active" :style="activeStyle">
        Angebote
      </span>
      <span class="proto-header__tab">Veranstaltungen</span>
      <span v-if="!compact" class="proto-header__tab">Mein Bereich</span>
    </span>
  </div>
</template>

<script>
import ProtoAppLogo from "./ProtoAppLogo.vue";
import { contrastOf, headerColors } from "./appearancePrototype";

export default {
  name: "ProtoHeaderMock",
  components: { ProtoAppLogo },
  props: {
    header: { type: String, default: "primary" },
    colors: { type: Object, default: () => ({}) },
    mode: { type: String, default: "light" },
    logo: { type: Object, default: null },
    logoDark: { type: Object, default: null },
    portalName: { type: String, default: "" },
    compact: { type: Boolean, default: false },
  },
  computed: {
    c() {
      return headerColors(this.header, this.colors, this.mode);
    },
    // Aktiver Reiter (#517): im Header in Sekundär auf Primär, sonst Sekundär.
    activeStyle() {
      const colors = this.colors || {};
      const bg =
        this.header === "secondary"
          ? colors.primary || "#1976d2"
          : colors.secondary || "#26a69a";
      return { background: bg, color: contrastOf(bg) };
    },
  },
};
</script>

<style scoped>
.proto-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  min-height: 36px;
}

.proto-header--neutral-light {
  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.12);
}

.proto-header__name {
  font-weight: 600;
  white-space: nowrap;
}

.proto-header__nav {
  margin-left: auto;
  display: flex;
  gap: 4px;
}

.proto-header__tab {
  padding: 2px 8px;
  border-radius: 999px;
  white-space: nowrap;
}
</style>
