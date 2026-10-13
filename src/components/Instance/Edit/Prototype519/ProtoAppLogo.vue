<template>
  <!-- PROTOTYPE (ECCdigital/tickets#519): das App-Logo nach der Regel aus
       #518. Dunkel mit Variante die Variante, ohne Variante invertiert. -->
  <ProtoLogoImg
    :reference="mode === 'dark' && logoDark ? logoDark : logo"
    :invert="mode === 'dark' && !logoDark"
    :height="height"
  />
</template>

<script>
import ProtoLogoImg from "./ProtoLogoImg.vue";

export default {
  name: "ProtoAppLogo",
  components: { ProtoLogoImg },
  props: {
    logo: { type: Object, default: null },
    logoDark: { type: Object, default: null },
    mode: { type: String, default: "light" },
    height: { type: Number, default: 32 },
  },
};
</script>
