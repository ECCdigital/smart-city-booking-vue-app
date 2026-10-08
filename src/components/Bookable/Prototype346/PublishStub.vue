<!-- PROTOTYPE (ECCdigital/tickets#346), throwaway: never merge.
     Stand-in for the step „Veröffentlichung“ decided in #345, so the place of
     the extra areas before it can be judged. Not the real component. -->
<template>
  <div class="flow-note">
    <div class="flow-note__title">Platzhalter: Veröffentlichung (#345)</div>
    Schalter „Buchbar“ und „Im Katalog listen“, darunter die Zeile zur Wirkung
    und der Prüfstatus. Danach nur noch „Speichern“.
  </div>
</template>

<script>
export default {
  name: "PublishStub",
  props: {
    bookable: { type: Object, required: true },
    isNew: { type: Boolean, default: false },
  },
};
</script>
