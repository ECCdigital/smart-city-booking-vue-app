<template>
  <div class='content'>
    <Navbar/>
    <v-container fluid>
      <h1 class="text-h5 mb-2">{{ this.$route.meta.title }}</h1>
      <slot/>
    </v-container>
  </div>
</template>

<script>
import Navbar from "@/components/Navbar";

export default {
  props: {
    data: Object,
  },
  components: {
    Navbar,
  },
}
</script>

<style scoped>
</style>
