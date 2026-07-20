<script>
import BookableEdit from "@/components/Bookable/BookableEdit.vue";
import AdminLayout from "@/layouts/Admin.vue";

export default {
  name: "TicketEdit",
  components: { AdminLayout, BookableEdit },
  computed: {
    bookableID() {
      return this.$route.query.id;
    },
    pageTitle() {
      return this.bookableID ? "Ticket bearbeiten" : "Ticket erstellen";
    },
  },
};
</script>

<template>
  <AdminLayout :title="pageTitle" scroll-body>
    <BookableEdit type="ticket"> </BookableEdit>
  </AdminLayout>
</template>

<style scoped></style>
