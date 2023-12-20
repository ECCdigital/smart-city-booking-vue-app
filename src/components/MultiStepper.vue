<template>
  <div class="multi-stepper mt-14">
    <ul class="multi-stepper__list">
      <li v-for="(item, index) in items" :key="item.routeName" class="multi-stepper__item">
        <router-link :to="{name: item.routeName}"
                     class="multi-stepper__link body--text"
                     :class="{'font-weight-bold darkgrey--text': $route.name === item.routeName || isActiveParent(item),
                     'font-weight-bold': index < currentRouteIndex(),
                     'disable-events': index > currentRouteIndex() && !updateEvent}">
          <v-chip outlined color="primary"
                  class="multi-stepper__circle primary--text font-weight-bold"
                  :class="{'success d-inline-flex pa-0 justify-center': index < currentRouteIndex() && !updateEvent}">
            <v-icon size="18" v-if="index < currentRouteIndex() && !updateEvent" class="success--text">mdi-check-bold</v-icon>
            <span v-else>{{ index + 1 }}</span>
          </v-chip>

          <span class="multi-stepper__link-title">{{ item.title }}</span>
        </router-link>
        <ul v-if="isActiveParent(item)" class="multi-stepper__sub-list">
          <li v-for="child in item.childRoutes" :key="child.routeName" class="multi-stepper__sub-item">
            <router-link :to="{name: child.routeName}"
                         class="multi-stepper__link body--text"
                         :class="{'font-weight-bold darkgrey--text': $route.name === child.routeName,
                           'font-weight-bold': index < currentRouteIndex()}">
              <span class="multi-stepper__sub-link-title">{{ child.title }}</span>
            </router-link>
          </li>
        </ul>
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  props: {
    structure: Array,
    updateEvent: Boolean,
  },
  data() {
    return {
      items: []
    }
  },
  methods: {
    currentRouteIndex() {
      let parentIndex = this.items.findIndex(item => item.routeName === this.$router.currentRoute.name);

      if (parentIndex === -1) {
        const routesWithChildren = this.items.filter(item => !_.isNil(item.childRoutes));
        const currentLocation = this.$router.currentRoute.name;
        const parentRoute = routesWithChildren.find(route => {
          if (_.find(route.childRoutes, { routeName: currentLocation })) {
            return route;
          }

          return false;
        });

        parentIndex = this.items.findIndex(item => item.routeName === parentRoute.routeName);
      }
      return parentIndex;
    },
    isActiveParent(route) {
      // Check if route has child routes
      if (_.isNil(route.childRoutes)) {
        return false;
      }

      // Check if the user is on parent or one of it's childs
      const currentLocation = this.$router.currentRoute.name;
      const childRoutes = route.childRoutes.map(child => child.routeName);
      const parentAndChildRoutes = [...childRoutes, route.routeName];
      return parentAndChildRoutes.includes(currentLocation);
    },
    setRouteNames() {
      // Get all router routes
      const routes = this.$router.getRoutes();

      // Add title from route meta information to parent route
      this.items = this.structure.map((item) => {
        item.title = routes.find(route => route.name === item.routeName).meta.title;

        // Check if route has childs
        if (!_.isNil(item.childRoutes)) {
          // Add title from route meta information to child routes
          item.childRoutes.map((children) => {
            children.title = routes.find(route => route.name === children.routeName).meta.title;
            return children;
          })
        }

        return item;
      })
    }
  },
  created() {
    this.setRouteNames();
  }
}
</script>

<style lang="scss" scoped>
.multi-stepper__list {
  padding: 0;
  list-style: none;
}

.multi-stepper__item {
  margin-bottom: 0.5rem;
}

.multi-stepper__sub-list {
  list-style: none;
  margin-top: 0.25rem;
  position: relative;

  &::before {
    background: black;
    content: '';
    display: block;
    height: calc(100% - 0.75rem);
    left: 1rem;
    position: absolute;
    top: 0;
    transform: translateX(calc(-100% - 1px));
    width: 1px;
  }
}

.multi-stepper__sub-item {
  position: relative;
  padding-left: 0.6875rem;

  &::before {
    background: black;
    content: '';
    display: block;
    height: 1px;
    left: 20px;
    position: absolute;
    top: 50%;
    transform: translateX(-100%);
    width: 30px;
  }
}

.multi-stepper__circle {
  width: 32px;
  height: 32px;
}

.multi-stepper__link {
  text-decoration: none;
  color: black;
}

.theme--dark .multi-stepper__link {
  color: white !important;
}

.multi-stepper__link-title {
  margin-left: 0.75rem;
}

.multi-stepper__sub-link-title {
  margin-left: 1.25rem;
}

.disable-events {
  pointer-events: none
}
</style>
