<template>
  <div class='content'>
    <v-container fluid>
      <h1 class="title mb-2">{{ this.$route.meta.title }}</h1>
      <slot/>
    </v-container>
  </div>
</template>

<script>
export default {}
</script>

<style scoped>
</style>
