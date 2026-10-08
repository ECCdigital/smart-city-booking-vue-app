<!-- PROTOTYPE (ECCdigital/tickets#341), throwaway: never merge.
     The editor's note on the legacy cover, now in both modes. -->
<template>
  <v-alert dense text type="info" class="text-caption">
    Das bisherige Titelbild liegt noch in der alten Dateiablage:
    <span class="font-weight-medium">{{ url }}</span
    >. Es bleibt aktiv, bis hier Bilder aus der Mediathek zugeordnet werden.
    <div class="mt-2">
      <v-btn x-small outlined color="info" @click="$emit('adopt')">
        <v-icon x-small left>mdi-image-move</v-icon>
        Als Bild übernehmen
      </v-btn>
    </div>
  </v-alert>
</template>

<script>
export default {
  name: "LegacyCoverNote",
  props: { url: { type: String, required: true } },
};
</script>
