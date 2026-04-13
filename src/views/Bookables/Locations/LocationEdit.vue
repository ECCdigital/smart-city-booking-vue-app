<script>
import AdminLayout from "@/layouts/Admin.vue";
import BookableEdit from "@/components/Bookable/BookableEdit.vue";

export default {
  name: "LocationEdit",
  components: { BookableEdit, AdminLayout },
  computed: {
    bookableID() {
      return this.$route.query.id;
    },
    pageTitle() {
      return this.bookableID
        ? "Veranstaltungsort bearbeiten"
        : "Veranstaltungsort erstellen";
    },
  }
};
</script>

<template>
  <AdminLayout :title="pageTitle">
    <BookableEdit type="event-location"> </BookableEdit>
  </AdminLayout>
</template>

<style scoped></style>
