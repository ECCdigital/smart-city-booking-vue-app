<script>
import BookableEdit from "@/components/Bookable/BookableEdit.vue";
import AdminLayout from "@/layouts/Admin.vue";

export default {
  name: "ResourceEdit",
  components: { AdminLayout, BookableEdit },
  computed: {
    bookableID() {
      return this.$route.query.id;
    },
    pageTitle() {
      return this.bookableID ? "Objekt bearbeiten" : "Objekt erstellen";
    },
  },
};
</script>

<template>
  <AdminLayout :title="pageTitle">
    <BookableEdit type="resource"> </BookableEdit>
  </AdminLayout>
</template>

<style scoped></style>
