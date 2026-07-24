/**
 * Leave/restore confirmation when a host exposes `hasUnsavedChanges`.
 * Pair with UnsavedChangesDialog bound to `leaveDialogOpen`.
 */
export default {
  data() {
    return {
      leaveDialogOpen: false,
      leaveConfirmResolve: null,
      allowNavigation: false,
      removeRouterGuard: null,
    };
  },
  created() {
    this.registerNavigationGuards();
  },
  beforeDestroy() {
    this.unregisterNavigationGuards();
  },
  methods: {
    confirmDiscardChanges() {
      if (!this.hasUnsavedChanges) {
        return Promise.resolve(true);
      }
      if (this.leaveConfirmResolve) {
        return Promise.resolve(false);
      }
      this.leaveDialogOpen = true;
      return new Promise((resolve) => {
        this.leaveConfirmResolve = resolve;
      });
    },
    resolveLeaveConfirm(discard) {
      this.leaveDialogOpen = false;
      const resolve = this.leaveConfirmResolve;
      this.leaveConfirmResolve = null;
      if (resolve) {
        resolve(!!discard);
      }
    },
    onBeforeUnload(event) {
      if (!this.hasUnsavedChanges) {
        return;
      }
      event.preventDefault();
      event.returnValue = "";
    },
    registerNavigationGuards() {
      if (this.removeRouterGuard) {
        return;
      }
      this.removeRouterGuard = this.$router.beforeEach((to, from, next) => {
        if (this.allowNavigation || !this.hasUnsavedChanges) {
          next();
          return;
        }
        // Stay on the same page when only query changes (tab/section/id).
        if (to.path === from.path) {
          next();
          return;
        }
        this.confirmDiscardChanges().then((discard) => {
          if (discard) {
            this.allowNavigation = true;
            next();
            this.$nextTick(() => {
              this.allowNavigation = false;
            });
          } else {
            next(false);
          }
        });
      });
      window.addEventListener("beforeunload", this.onBeforeUnload);
    },
    unregisterNavigationGuards() {
      if (this.removeRouterGuard) {
        this.removeRouterGuard();
        this.removeRouterGuard = null;
      }
      window.removeEventListener("beforeunload", this.onBeforeUnload);
      if (this.leaveConfirmResolve) {
        this.resolveLeaveConfirm(false);
      }
    },
  },
};
