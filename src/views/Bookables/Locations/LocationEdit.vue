<script>
import AdminLayout from "@/layouts/Admin.vue";
import { isFlowMode } from "@/utils/bookableFlow";
import BookableEdit from "@/components/Bookable/BookableEdit.vue";

export default {
  name: "LocationEdit",
  components: { BookableEdit, AdminLayout },
  computed: {
    bookableID() {
      return this.$route.query.id;
    },
    /** The guided flow stands without the page title. */
    flowMode() {
      return isFlowMode({
        bookableId: this.bookableID,
        mode: this.$route.query.mode,
      });
    },
    pageTitle() {
      return this.bookableID
        ? "Veranstaltungsort bearbeiten"
        : "Veranstaltungsort erstellen";
    },
  },
};
</script>

<template>
  <AdminLayout :title="pageTitle" :hide-page-title="flowMode" scroll-body>
    <BookableEdit type="event-location"> </BookableEdit>
  </AdminLayout>
</template>

<style scoped></style>
