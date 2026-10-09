<script>
import BookableEdit from "@/components/Bookable/BookableEdit.vue";
import AdminLayout from "@/layouts/Admin.vue";
import { isFlowMode } from "@/utils/bookableFlow";

export default {
  name: "RoomEdit",
  components: { AdminLayout, BookableEdit },
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
      return this.bookableID ? "Raum bearbeiten" : "Raum erstellen";
    },
  },
};
</script>

<template>
  <AdminLayout :title="pageTitle" :hide-page-title="flowMode" scroll-body>
    <BookableEdit type="room"> </BookableEdit>
  </AdminLayout>
</template>

<style scoped></style>
