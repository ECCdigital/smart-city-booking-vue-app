<script>
import AdminLayout from "@/layouts/Admin.vue";
import BookableEdit from "@/components/Bookable/BookableEdit.vue";

export default {
  name: "LocationEdit",
  components: { BookableEdit, AdminLayout },
};
</script>

<template>
  <AdminLayout>
    <BookableEdit> </BookableEdit>
  </AdminLayout>
</template>

<style scoped></style>
