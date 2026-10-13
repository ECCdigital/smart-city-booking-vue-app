<template>
  <!-- PROTOTYPE (ECCdigital/tickets#519): Platzhalter. Der Abschnitt „Schrift“
       ist in #516 entschieden und steht zwischen „Theme“ und „Logo & Favicon“. -->
  <div class="proto-font-placeholder mt-7">
    <v-icon small class="mr-2">mdi-format-font</v-icon>
    Abschnitt „Schrift“, entschieden in #516 (Kacheln), hier nur Platzhalter
  </div>
</template>

<script>
export default { name: "ProtoFontPlaceholder" };
</script>

<style scoped>
.proto-font-placeholder {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  border: 1px dashed #ff00aa;
  border-radius: 6px;
  color: #a0006c;
  font-size: 12px;
}
</style>
