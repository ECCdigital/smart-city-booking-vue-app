<script>
export default {
  name: "ContactInformation",
  data() {
    return {
      contactDetails: {
        address: process.env.VUE_APP_CONTACT_ADDRESS || "",
        url: process.env.VUE_APP_CONTACT_URL || "",
      }};
  },
};


</script>

<template>
  <p class="text-left mt-5">
    <small v-if="contactDetails.address" >Dieser Service wird bereitgestellt vom {{ contactDetails.address }}. Weitere
      Informationen und Kontaktmöglichkeiten finden Sie unter <a :href="contactDetails.url"
                                                                 target="_blank">{{ contactDetails.url }}</a>.</small>
  </p>
</template>

<style scoped>

</style>
