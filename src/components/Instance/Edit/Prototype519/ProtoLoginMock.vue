<template>
  <!-- PROTOTYPE (ECCdigital/tickets#519): die Login-Karte nach #513, Logo und
       Portalname oben in der Karte. Maße halbiert, damit sie in die Spalte passt. -->
  <div class="proto-login" :class="`proto-login--${mode}`" :style="bgStyle">
    <div class="proto-login__card">
      <ProtoAppLogo
        :logo="logo"
        :logo-dark="logoDark"
        :mode="mode"
        :height="Math.round(px * scale)"
      />
      <div class="proto-login__name">{{ portalName || "Portal" }}</div>
      <div class="proto-login__title">Anmelden</div>
      <div class="proto-login__field" />
      <div class="proto-login__field" />
      <div class="proto-login__button" :style="buttonStyle">Anmelden</div>
    </div>
  </div>
</template>

<script>
import ProtoAppLogo from "./ProtoAppLogo.vue";
import { LOGIN_LOGO_SIZES, contrastOf } from "./appearancePrototype";

export default {
  name: "ProtoLoginMock",
  components: { ProtoAppLogo },
  props: {
    size: { type: String, default: "S" },
    logo: { type: Object, default: null },
    logoDark: { type: Object, default: null },
    mode: { type: String, default: "light" },
    portalName: { type: String, default: "" },
    colors: { type: Object, default: () => ({}) },
    scale: { type: Number, default: 0.5 },
  },
  computed: {
    px() {
      const step = LOGIN_LOGO_SIZES.find((s) => s.value === this.size);
      return step ? step.px : 56;
    },
    bgStyle() {
      const a = (this.colors && this.colors.primary) || "#1976d2";
      const b = (this.colors && this.colors.secondary) || "#26a69a";
      return { background: `linear-gradient(135deg, ${a}, ${b})` };
    },
    buttonStyle() {
      const bg = (this.colors && this.colors.primary) || "#1976d2";
      return { background: bg, color: contrastOf(bg) };
    },
  },
};
</script>

<style scoped>
.proto-login {
  border-radius: 6px;
  padding: 14px;
  display: flex;
  justify-content: center;
}

.proto-login__card {
  width: 170px;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  backdrop-filter: blur(6px);
}

.proto-login--light .proto-login__card {
  background: rgba(255, 255, 255, 0.92);
  color: #111827;
}

.proto-login--dark .proto-login__card {
  background: rgba(17, 24, 39, 0.92);
  color: #ffffff;
}

.proto-login__name {
  font-weight: 700;
  font-size: 12px;
}

.proto-login__title {
  font-size: 10px;
  opacity: 0.7;
}

.proto-login__field {
  width: 100%;
  height: 12px;
  border-radius: 3px;
  background: rgba(127, 127, 127, 0.25);
}

.proto-login__button {
  width: 100%;
  text-align: center;
  font-size: 10px;
  border-radius: 3px;
  padding: 2px 0;
}
</style>
