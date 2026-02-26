<template>
  <v-app>
    <v-main>
      <router-view />
      <AppToaster />
    </v-main>
  </v-app>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import ApiInstanceService from "@/services/api/ApiInstanceService";
import AppToaster from "@/components/commons/AppToaster.vue";

export default {
  components: { AppToaster },
  methods: {
    ...mapActions({
      updateInstance: "instance/update",
    }),
  },
  computed: {
    ...mapGetters({
      user: "user/getUser",
      instance: "instance/instance",
    }),
  },
  async mounted() {
    await this.updateInstance(
      await ApiInstanceService.getPublicInstance()
    );
  },
};
</script>

<style lang="scss">
/* ============================================
   Global Data Table Styling
   ============================================ */

/* Light Theme - Header */
.theme--light.v-data-table thead th {
  background-color: #e5f5fc !important;
  font-weight: 600 !important;
  font-size: 0.875rem !important;

  &:first-child {
    border-radius: 25px 0 0 0;
  }

  &:last-child {
    border-radius: 0 25px 0 0;
  }
}

/* Dark Theme - Header */
.theme--dark.v-data-table thead th {
  background-color: #282828 !important;
  font-weight: 600 !important;
  font-size: 0.875rem !important;

  &:first-child {
    border-radius: 25px 0 0 0;
  }

  &:last-child {
    border-radius: 0 25px 0 0;
  }
}

/* Table Background & Border Radius */
.v-data-table {
  border-radius: 25px !important;
  overflow: visible !important; /* GEÄNDERT: visible statt hidden */
}

.theme--light.v-data-table {
  border-radius: 25px !important;
}

.theme--dark.v-data-table {
  border-radius: 25px !important;

  & > .v-data-table__wrapper {
    border-radius: 25px 25px 0 0 !important;
  }
}

.theme--dark.v-data-table table {
  background-color: #282828 !important;
}

/* Table Wrapper - WICHTIG: Hier erlauben wir horizontales Scrollen */
.v-data-table > .v-data-table__wrapper {
  border-radius: 25px 25px 0 0 !important;
  overflow-x: auto !important; /* GEÄNDERT: auto statt hidden */
  overflow-y: visible !important;

  /* Custom Scrollbar */
  &::-webkit-scrollbar {
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.05);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;

    &:hover {
      background: rgba(0, 0, 0, 0.3);
    }
  }
}

.theme--dark .v-data-table > .v-data-table__wrapper {
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);

    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }
}

/* Row Borders */
.v-data-table tbody tr:not(:last-child) td {
  border-bottom: #5d5d5d solid 1px !important;
}

.v-data-table tbody tr:first-child td {
  border-top: #5d5d5d solid 1px !important;
}

/* Row Hover Effects */
.v-data-table tbody tr {
  transition: background-color 0.2s ease, transform 0.1s ease;
}

.theme--light.v-data-table tbody tr:hover {
  background-color: rgba(25, 118, 210, 0.08) !important;
}

.theme--dark.v-data-table tbody tr:hover {
  background-color: rgba(255, 255, 255, 0.05) !important;
}

/* First Row Hover - Keep Top Corners Sharp */
.v-data-table table tr:first-child:hover td:first-child {
  border-top-left-radius: 0 !important;
}

.v-data-table table tr:first-child:hover td:last-child {
  border-top-right-radius: 0 !important;
}

/* Last Row - Bottom Radius (Only when no footer) */
.v-data-table:not(.v-data-table--has-bottom) table tbody tr:last-child td:first-child {
  border-bottom-left-radius: 25px !important;
}

.v-data-table:not(.v-data-table--has-bottom) table tbody tr:last-child td:last-child {
  border-bottom-right-radius: 25px !important;
}

/* Table Cell Padding */
.v-data-table tbody td {
  padding: 12px 16px !important;
  white-space: nowrap; /* HINZUGEFÜGT: Verhindert Zeilenumbruch */
}

.v-data-table thead th {
  padding: 12px 16px !important;
  white-space: nowrap; /* HINZUGEFÜGT: Verhindert Zeilenumbruch */
}

/* Striped Rows (Optional) */
.v-data-table.striped tbody tr:nth-of-type(odd) {
  background-color: rgba(0, 0, 0, 0.02);
}

.theme--dark .v-data-table.striped tbody tr:nth-of-type(odd) {
  background-color: rgba(255, 255, 255, 0.02);
}

/* Footer Styling */
.v-data-table .v-data-footer {
  border-radius: 0 0 25px 25px !important;
  padding: 8px 16px !important;
  margin: 0 !important;
  width: 100% !important;
}

.theme--dark.v-data-table .v-data-footer {
  background-color: #282828 !important;
}

/* Footer Wrapper - Ensure Full Width */
.v-data-table__wrapper + .v-data-footer {
  display: flex !important;
  width: 100% !important;
}

/* Footer Items */
.v-data-footer__select,
.v-data-footer__pagination,
.v-data-footer__icons-before,
.v-data-footer__icons-after {
  margin: 0 8px;
}

/* Sortable Headers */
.v-data-table thead th.sortable:hover {
  opacity: 0.8;
}

.v-data-table thead th.sortable .v-data-table-header__icon {
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.v-data-table thead th.sortable:hover .v-data-table-header__icon {
  opacity: 1;
}

/* Empty State */
.v-data-table .v-data-table__empty-wrapper td {
  padding: 48px 16px !important;
}

/* Mobile Responsive */
@media (max-width: 960px) {
  .v-data-table thead th {
    font-size: 0.75rem !important;
    padding: 8px 12px !important;
  }

  .v-data-table tbody td {
    font-size: 0.875rem !important;
    padding: 8px 12px !important;
  }

  .v-data-table .v-data-footer {
    padding: 8px 8px !important;
  }

  .v-data-footer__select,
  .v-data-footer__pagination {
    font-size: 0.75rem !important;
  }
}

.cursor-pointer {
  cursor: pointer;
}
</style>
