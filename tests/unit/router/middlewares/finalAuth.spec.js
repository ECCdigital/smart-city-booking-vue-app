import { beforeEach, describe, expect, it, vi } from "vitest";

const storeDouble = vi.hoisted(() => ({
  loggedIn: true,
  dispatch: vi.fn(),
}));

vi.mock("@/store", () => ({
  default: {
    dispatch: (...args) => storeDouble.dispatch(...args),
    getters: {
      get "user/isLoggedIn"() {
        return storeDouble.loggedIn;
      },
    },
  },
}));

const { finalAuthRedirect } = await import("@/router/middlewares/finalAuth");

/** A pasted Buchungslink, as the router hands it to the middleware. */
const BOOKING_LINK = {
  name: "booking-details",
  fullPath: "/bookings/abc?tenant=t",
  meta: { requiresAuth: true },
};

beforeEach(() => {
  storeDouble.loggedIn = true;
  storeDouble.dispatch = vi.fn();
});

describe("finalAuthRedirect", () => {
  it("lets a signed-in user through", async () => {
    const next = vi.fn();

    await finalAuthRedirect({ to: BOOKING_LINK, next });

    expect(next).toHaveBeenCalledWith();
  });

  it("sends an anonymous visitor to login with the full path to return to", async () => {
    storeDouble.loggedIn = false;
    const next = vi.fn();

    await finalAuthRedirect({ to: BOOKING_LINK, next });

    expect(next).toHaveBeenCalledWith({
      name: "login",
      query: { next: "/bookings/abc?tenant=t" },
    });
    expect(storeDouble.dispatch).toHaveBeenCalledWith(
      "toasts/add",
      expect.objectContaining({ type: "error" })
    );
  });
});
