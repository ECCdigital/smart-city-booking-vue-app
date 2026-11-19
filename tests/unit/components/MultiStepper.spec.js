import { afterAll, beforeAll, describe, expect, it } from "vitest";
import lodash from "lodash";
import MultiStepper from "@/components/MultiStepper.vue";
import { mountComponent } from "@tests/unit/support/mount";

const ROUTES = [
  { name: "step-one", meta: { title: "Allgemein" } },
  { name: "step-two", meta: { title: "Ort" } },
];

function mountStepper(currentRoute = "step-one") {
  return mountComponent(MultiStepper, {
    propsData: {
      structure: [{ routeName: "step-one" }, { routeName: "step-two" }],
    },
    mocks: {
      $route: { name: currentRoute },
      $router: {
        currentRoute: { name: currentRoute },
        getRoutes: () => ROUTES,
      },
    },
    stubs: {
      "router-link": {
        render(h) {
          return h("a", this.$slots.default);
        },
      },
    },
  });
}

// main.js puts lodash on window; the stepper reads it from there.
const previousLodash = window._;
beforeAll(() => {
  window._ = lodash;
});
afterAll(() => {
  window._ = previousLodash;
});

describe("MultiStepper", () => {
  // A dark primary colour (VUE_APP_PRIMARY_COLOR_DARK) all but vanished on
  // the dark page (ECCdigital/tickets#307). The link token lightens it under
  // .theme--dark; the bare Vuetify class `primary--text` cannot.
  it("draws the step numbers in the link colour, not the bare primary colour", () => {
    const wrapper = mountStepper();
    const circles = wrapper.findAll(".multi-stepper__circle");

    expect(circles).toHaveLength(2);
    expect(circles.at(1).text()).toBe("2");
    circles.wrappers.forEach((circle) =>
      expect(circle.classes()).not.toContain("primary--text")
    );
  });
});
