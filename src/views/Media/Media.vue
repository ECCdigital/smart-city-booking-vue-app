<template>
  <AdminLayout scroll-body>
    <template v-if="isInstanceOwner" v-slot:page-header>
      <v-tabs v-model="tab" class="mt-1">
        <v-tab>Mandant</v-tab>
        <v-tab>Instanz</v-tab>
      </v-tabs>
    </template>
    <MediaLibrary :key="currentScope" :scope="currentScope" />
  </AdminLayout>
</template>

<script>
import AdminLayout from "@/layouts/Admin.vue";
import MediaLibrary from "@/components/Media/MediaLibrary.vue";
import MediaPermissionService from "@/services/permissions/MediaPermissionService";

export default {
  name: "MediaView",
  components: { AdminLayout, MediaLibrary },
  data() {
    return {
      tab: 0,
    };
  },
  computed: {
    // The instance tab belongs to the instance owner alone (§4.9 of the media
    // spec); everyone else sees only the library of their tenant.
    isInstanceOwner() {
      return MediaPermissionService.isInstanceOwner();
    },
    currentScope() {
      return this.isInstanceOwner && this.tab === 1 ? "instance" : "tenant";
    },
  },
};
</script>
