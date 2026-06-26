<script>
import BookableEdit from "@/components/Bookable/BookableEdit.vue";
import AdminLayout from "@/layouts/Admin.vue";

export default {
  name: "RoomEdit",
  components: { AdminLayout, BookableEdit },
  computed: {
    bookableID() {
      return this.$route.query.id;
    },
    pageTitle() {
      return this.bookableID ? "Raum bearbeiten" : "Raum erstellen";
    },
  },
};
</script>

<template>
  <AdminLayout :title="pageTitle">
    <BookableEdit type="room"> </BookableEdit>
  </AdminLayout>
</template>

<style scoped></style>
